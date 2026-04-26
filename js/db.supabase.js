/* ════════════════════════════════════════════════════════════
   BOX PLANNER — ADAPTADOR SUPABASE
   ────────────────────────────────────────────────────────────
   Patrón cache-first:
     1. initSupabaseCache(pin, rol) carga todo en _sbCache al login
     2. Las funciones sync leen _sbCache (mismo contrato que localStorage)
     3. Las escrituras actualizan _sbCache + disparan async upserts
        (fire-and-forget — la UI no espera la respuesta de red)

   Solo se activa cuando isSupabaseMode() === true.
   El modo demo (localStorage) queda completamente intacto.
   ════════════════════════════════════════════════════════════ */

/* ── Cliente Supabase ────────────────────────────────────────
   El SDK se carga desde CDN (window.supabase) antes de este script.
   ─────────────────────────────────────────────────────────── */
let _sb = null;

function _getSb() {
  if (_sb) return _sb;
  _sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return _sb;
}

/* ── Cache en memoria ────────────────────────────────────────
   Estructura plana para acceso O(1) desde funciones sync.
   ─────────────────────────────────────────────────────────── */
const _sbCache = {
  usuarios:       {},   // { [PIN]: rowDeBaseDatos }
  rutinas:        {},   // { [id]: rutinaCustom }   ← mismo formato que getCustomRutinas()
  asignaciones:   {},   // { [PIN]: [{ rutinaId, fecha_asignacion, vista_por_alumno, _dbId }] }
  metricas:       {},   // { [alumnoId]: [metrica] }
  docenteAlumnos: {},   // { [docentePin]: [{ alumnoPin, disciplinaId }] }
  alumnoDocentes: {},   // { [alumnoPin]: [{ docentePin, disciplinaId }] }
};

/* ── Converters (DB → formato interno de la app) ────────────*/
function _rutinaFromDb(row) {
  return {
    id:           row.id,
    nombre:       row.nombre,
    disciplinaId: row.disciplina_id || '',
    nivel:        row.nivel || '',
    dias:         typeof row.dias === 'string' ? JSON.parse(row.dias) : (row.dias || []),
    _custom:      true,
  };
}

function _metricaFromDb(row) {
  return {
    id:          `${row.alumno_id}_${row.ejercicio_id}_${row.id}`,
    alumnoId:    row.alumno_id,
    ejercicioId: row.ejercicio_id,
    valor:       Number(row.valor),
    tipo:        row.tipo,
    fecha:       row.fecha,
    notas:       row.notas || '',
    estado:      row.estado || '',
  };
}

function _alumnoFromDb(u) {
  if (!u || u.estado !== 'activo') return null;
  const disciplinaNombre = (u.disciplinas || [])
    .map(id => { const d = DISCIPLINAS.find(d => d.id === id); return d ? d.nombre : id; })
    .join(' / ') || '—';

  /* roles[]: columna text[] en Supabase. Si no existe o es NULL,
     fallback a localStorage (guardado por actualizarRolesLocal) */
  let roles = Array.isArray(u.roles) && u.roles.length ? u.roles : null;
  if (!roles) {
    try {
      const lsVal = localStorage.getItem('bp_roles_' + u.pin.toUpperCase());
      if (lsVal) roles = JSON.parse(lsVal);
    } catch(e) { /* ignore */ }
  }
  if (!roles) roles = [u.rol || 'alumno'];

  return {
    pin:             u.pin,
    nombre:          u.nombre,
    edad:            u.fecha_nacimiento || '—',
    rol:             u.rol || 'alumno',
    roles,
    disciplinas:     u.disciplinas || [],
    disciplina:      disciplinaNombre,
    objetivo:        u.objetivo || '—',
    dias:            u.dias !== undefined ? u.dias : 3,
    rutina:          '',
    estado:          'Activo',
    aptoMedico:      u.apto_medico  !== undefined ? u.apto_medico : false,
    fechaAltaMedica: u.fecha_alta_medica || null,
    docMedicoUrl:    u.doc_medico_url    || null,
    avatarUrl:       u.avatar_url        || null,
  };
}

/* ══════════════════════════════════════════════════════════
   initSupabaseCache
   Carga todos los datos relevantes en _sbCache.
   Llamar desde loadData() / loadDocenteData() al inicio.
   ══════════════════════════════════════════════════════════ */
async function initSupabaseCache(pin, rol) {
  if (!isSupabaseMode()) return;
  /* Limpiar antes de recargar para evitar duplicados en re-login */
  Object.keys(_sbCache.usuarios).forEach(k => delete _sbCache.usuarios[k]);
  Object.keys(_sbCache.rutinas).forEach(k => delete _sbCache.rutinas[k]);
  Object.keys(_sbCache.asignaciones).forEach(k => delete _sbCache.asignaciones[k]);
  Object.keys(_sbCache.metricas).forEach(k => delete _sbCache.metricas[k]);
  Object.keys(_sbCache.docenteAlumnos).forEach(k => delete _sbCache.docenteAlumnos[k]);
  Object.keys(_sbCache.alumnoDocentes).forEach(k => delete _sbCache.alumnoDocentes[k]);
  const sb  = _getSb();
  const PIN = pin.toUpperCase();

  /* ── Usuarios ── */
  let usuariosQ = sb.from('bp_usuarios').select('*');
  if (rol === 'alumno') usuariosQ = usuariosQ.eq('pin', PIN);
  const { data: usuarios, error: errU } = await usuariosQ;
  if (!errU && usuarios) usuarios.forEach(u => { _sbCache.usuarios[u.pin] = u; });

  /* ── Rutinas custom ── */
  const { data: rutinas, error: errR } = await sb.from('bp_rutinas').select('*');
  if (!errR && rutinas) rutinas.forEach(r => { _sbCache.rutinas[r.id] = _rutinaFromDb(r); });

  /* ── Asignaciones (descendente: [0] = más reciente) ── */
  let asignQ = sb.from('bp_asignaciones').select('*').order('created_at', { ascending: false });
  if (rol === 'alumno') asignQ = asignQ.eq('pin', PIN);
  const { data: asigns, error: errA } = await asignQ;
  if (!errA && asigns) {
    asigns.forEach(a => {
      if (!a.rutina_id) return;  // ignorar filas de "quitar todo" del modelo anterior
      const p = a.pin.toUpperCase();
      if (!_sbCache.asignaciones[p]) _sbCache.asignaciones[p] = [];
      _sbCache.asignaciones[p].push({
        rutinaId:         a.rutina_id,
        fecha_asignacion: typeof a.fecha_asignacion === 'string'
          ? a.fecha_asignacion.slice(0, 10)
          : new Date(a.fecha_asignacion).toISOString().slice(0, 10),
        vista_por_alumno: a.vista_por_alumno,
        _dbId:            a.id,
      });
    });
  }

  /* ── Métricas ── */
  let metricasQ = sb.from('bp_metricas').select('*').order('fecha', { ascending: true });
  if (rol === 'alumno') metricasQ = metricasQ.eq('alumno_id', PIN);
  const { data: metricas, error: errM } = await metricasQ;
  if (!errM && metricas) {
    metricas.forEach(m => {
      const aid = m.alumno_id.toUpperCase();
      if (!_sbCache.metricas[aid]) _sbCache.metricas[aid] = [];
      _sbCache.metricas[aid].push(_metricaFromDb(m));
    });
  }

  /* ── Relaciones docente↔alumno ── */
  let daQ = sb.from('bp_docente_alumno').select('*');
  if (rol === 'alumno')  daQ = daQ.eq('alumno_pin', PIN);
  else if (rol === 'docente') daQ = daQ.eq('docente_pin', PIN);
  /* admin carga todas */
  const { data: daRows, error: errDA } = await daQ;
  if (!errDA && daRows) {
    daRows.forEach(r => {
      const dp = r.docente_pin.toUpperCase();
      const ap = r.alumno_pin.toUpperCase();
      if (!_sbCache.docenteAlumnos[dp]) _sbCache.docenteAlumnos[dp] = [];
      if (!_sbCache.alumnoDocentes[ap]) _sbCache.alumnoDocentes[ap] = [];
      _sbCache.docenteAlumnos[dp].push({ alumnoPin: ap, disciplinaId: r.disciplina_id || '' });
      _sbCache.alumnoDocentes[ap].push({ docentePin: dp, disciplinaId: r.disciplina_id || '' });
    });
  }
}

/* ══════════════════════════════════════════════════════════
   getTodosAlumnosSupabase
   Devuelve [{ alumno, rms }] de los usuarios Supabase activos
   con rol alumno (para el panel docente).
   ══════════════════════════════════════════════════════════ */
function getTodosAlumnosSupabase() {
  return Object.values(_sbCache.usuarios)
    .filter(u => u.estado === 'activo' && u.rol === 'alumno')
    .map(u => ({ alumno: _alumnoFromDb(u), rms: [] }));
}

/* ════════════════════════════════════════════════════════════
   OVERRIDES — solo se activan en modo Supabase
   Redefinen las funciones de localStorage para usar _sbCache.
   ════════════════════════════════════════════════════════════ */
if (isSupabaseMode()) {

  /* ── pinEnUso (async: consulta directa antes de que haya cache) ── */
  window.pinEnUso = async function(pin) {
    const upper = pin.toUpperCase();
    if (ALUMNOS.some(a => a.id.toUpperCase() === upper)) return true;
    if (_sbCache.usuarios[upper]) return true;
    /* Consulta directa a Supabase (usada solo en el modal de registro) */
    const { data } = await _getSb().from('bp_usuarios').select('pin').eq('pin', upper).maybeSingle();
    return !!data;
  };

  /* ── registrarAlumnoLocal ── */
  window.registrarAlumnoLocal = async function({ pin, nombre, email, fechaNacimiento, objetivo }) {
    const upper = pin.toUpperCase();
    const row   = {
      pin:             upper,
      nombre,
      email:           email || '',
      fecha_nacimiento: fechaNacimiento || '',
      objetivo:        objetivo || '',
      rol:             'alumno',
      disciplinas:     [],
      dias:            3,
      estado:          'pendiente',
      fecha_registro:  new Date().toISOString().slice(0, 10),
    };
    _sbCache.usuarios[upper] = row;
    const { error } = await _getSb().from('bp_usuarios').insert(row);
    if (error) console.error('Supabase registrarAlumnoLocal:', error);
  };

  /* ── checkAlumnoPendiente (async: consulta directa) ── */
  window.checkAlumnoPendiente = async function(pin) {
    const upper = pin.toUpperCase();
    /* Intentar desde cache primero */
    if (_sbCache.usuarios[upper]) return _sbCache.usuarios[upper].estado === 'pendiente';
    const { data } = await _getSb().from('bp_usuarios').select('estado').eq('pin', upper).maybeSingle();
    return !!(data && data.estado === 'pendiente');
  };

  /* ── getAlumnoLocal (async: consulta directa) ── */
  window.getAlumnoLocal = async function(pin) {
    const upper = pin.toUpperCase();
    let u = _sbCache.usuarios[upper];
    if (!u) {
      const { data } = await _getSb().from('bp_usuarios').select('*').eq('pin', upper).maybeSingle();
      if (data) { _sbCache.usuarios[upper] = data; u = data; }
    }
    return _alumnoFromDb(u);
  };

  /* ── aprobarUsuarioLocal ── */
  window.aprobarUsuarioLocal = function(pin, nuevoRol) {
    const upper = pin.toUpperCase();
    if (!_sbCache.usuarios[upper]) return;
    _sbCache.usuarios[upper].estado     = 'activo';
    _sbCache.usuarios[upper].rol        = nuevoRol;
    if (!_sbCache.usuarios[upper].disciplinas) _sbCache.usuarios[upper].disciplinas = [];
    if (_sbCache.usuarios[upper].dias === undefined) _sbCache.usuarios[upper].dias = 3;
    _getSb().from('bp_usuarios')
      .update({ estado: 'activo', rol: nuevoRol, disciplinas: [], dias: 3 })
      .eq('pin', upper)
      .then(({ error }) => { if (error) console.error('Supabase aprobarUsuarioLocal:', error); });
  };

  /* ── rechazarUsuarioLocal ── */
  window.rechazarUsuarioLocal = function(pin) {
    const upper = pin.toUpperCase();
    delete _sbCache.usuarios[upper];
    _getSb().from('bp_usuarios').delete().eq('pin', upper)
      .then(({ error }) => { if (error) console.error('Supabase rechazarUsuarioLocal:', error); });
  };

  /* ── cambiarRolLocal ── */
  window.cambiarRolLocal = function(pin, nuevoRol) {
    const upper = pin.toUpperCase();
    if (!_sbCache.usuarios[upper] || _sbCache.usuarios[upper].estado !== 'activo') return;
    _sbCache.usuarios[upper].rol = nuevoRol;
    _getSb().from('bp_usuarios').update({ rol: nuevoRol }).eq('pin', upper)
      .then(({ error }) => { if (error) console.error('Supabase cambiarRolLocal:', error); });
  };

  /* ── actualizarRolesLocal — actualiza el array roles[] de un usuario ── */
  window.actualizarRolesLocal = function(pin, rolesArr) {
    const upper = pin.toUpperCase();
    if (_sbCache.usuarios[upper]) {
      _sbCache.usuarios[upper].roles = rolesArr;
      _sbCache.usuarios[upper].rol   = rolesArr[0];
    }
    /* Siempre guardar en localStorage como backup (persiste sin migración) */
    localStorage.setItem('bp_roles_' + upper, JSON.stringify(rolesArr));

    /* Intentar persistir en Supabase:
       1. Actualizar rol (columna segura que siempre existe)
       2. Intentar actualizar roles[] por separado — falla silenciosamente
          si la columna todavía no fue creada con ALTER TABLE */
    const sb = _getSb();
    sb.from('bp_usuarios').update({ rol: rolesArr[0] }).eq('pin', upper)
      .then(({ error }) => { if (error) console.error('Supabase rol update:', error); });
    sb.from('bp_usuarios').update({ roles: rolesArr }).eq('pin', upper)
      .then(({ error }) => {
        if (error) console.warn('roles[] column missing? Run: ALTER TABLE bp_usuarios ADD COLUMN IF NOT EXISTS roles text[];');
      });
  };

  /* ── actualizarPerfilAlumnoLocal ── */
  window.actualizarPerfilAlumnoLocal = function(pin, disciplinas, dias, objetivo) {
    const upper = pin.toUpperCase();
    if (_sbCache.usuarios[upper]) {
      /* Usuario Supabase */
      _sbCache.usuarios[upper].disciplinas = disciplinas;
      _sbCache.usuarios[upper].dias        = dias;
      if (objetivo !== undefined) _sbCache.usuarios[upper].objetivo = objetivo;
      const payload = { disciplinas, dias };
      if (objetivo !== undefined) payload.objetivo = objetivo;
      _getSb().from('bp_usuarios').update(payload).eq('pin', upper)
        .then(({ error }) => { if (error) console.error('Supabase actualizarPerfilAlumnoLocal:', error); });
    } else {
      /* Usuario demo hardcodeado → persiste override en localStorage */
      const DEMO_OVERRIDES_KEY = 'bp_demo_overrides';
      const overrides = JSON.parse(localStorage.getItem(DEMO_OVERRIDES_KEY) || '{}');
      if (!overrides[upper]) overrides[upper] = {};
      overrides[upper].disciplinas = disciplinas;
      overrides[upper].dias        = dias;
      if (objetivo !== undefined) overrides[upper].objetivo = objetivo;
      localStorage.setItem(DEMO_OVERRIDES_KEY, JSON.stringify(overrides));
    }
  };

  /* ── getUsuariosLocales ── */
  window.getUsuariosLocales = function() {
    return Object.values(_sbCache.usuarios);
  };

  /* ── saveCustomRutina ── */
  window.saveCustomRutina = function(rutina) {
    _sbCache.rutinas[rutina.id] = rutina;
    const row = {
      id:           rutina.id,
      nombre:       rutina.nombre,
      disciplina_id: rutina.disciplinaId || '',
      nivel:        rutina.nivel || '',
      dias:         rutina.dias || [],
      creado_por:   (typeof state !== 'undefined' && state.alumno) ? state.alumno.pin : '',
    };
    _getSb().from('bp_rutinas').upsert(row)
      .then(({ error }) => { if (error) console.error('Supabase saveCustomRutina:', error); });
  };

  /* ── getCustomRutinas ── */
  window.getCustomRutinas = function() {
    return Object.assign({}, _sbCache.rutinas);
  };

  /* ── deleteCustomRutinaById ── */
  window.deleteCustomRutinaById = function(id) {
    delete _sbCache.rutinas[id];
    _getSb().from('bp_rutinas').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('Supabase deleteCustomRutinaById:', error); });
  };

  /* ── asignarRutina ── */
  window.asignarRutina = function(alumnoPin, rutinaId, fechaInicio) {
    const PIN   = alumnoPin.toUpperCase();
    const hoy   = new Date().toISOString().slice(0, 10);
    const entry = {
      rutinaId:         rutinaId,
      fecha_asignacion: fechaInicio || hoy,
      vista_por_alumno: false,
    };
    if (!_sbCache.asignaciones[PIN]) _sbCache.asignaciones[PIN] = [];
    _sbCache.asignaciones[PIN].unshift(entry);
    _getSb().from('bp_asignaciones').insert({
      pin:              PIN,
      rutina_id:        rutinaId,
      fecha_asignacion: entry.fecha_asignacion,
      vista_por_alumno: false,
    }).select().then(({ data, error }) => {
      if (error) { console.error('Supabase asignarRutina:', error); return; }
      if (data && data[0]) _sbCache.asignaciones[PIN][0]._dbId = data[0].id;
    });
  };

  /* ── getTodasRutinasAsignadas ── */
  window.getTodasRutinasAsignadas = function(alumnoPin) {
    const PIN  = alumnoPin.toUpperCase();
    const arr  = (_sbCache.asignaciones[PIN] || []).filter(a => a.rutinaId);
    const seen = new Set();
    return arr.filter(a => {
      if (seen.has(a.rutinaId)) return false;
      seen.add(a.rutinaId);
      return true;
    });
  };

  /* ── getRutinaAsignada ── */
  window.getRutinaAsignada = function(alumnoPin) {
    const activas = window.getTodasRutinasAsignadas(alumnoPin);
    return activas.length ? activas[0].rutinaId : null;
  };

  /* ── quitarRutina ── */
  window.quitarRutina = function(alumnoPin, rutinaId) {
    const PIN = alumnoPin.toUpperCase();
    if (!_sbCache.asignaciones[PIN]) return;
    _sbCache.asignaciones[PIN] = _sbCache.asignaciones[PIN].filter(a => a.rutinaId !== rutinaId);
    _getSb().from('bp_asignaciones').delete().eq('pin', PIN).eq('rutina_id', rutinaId)
      .then(({ error }) => { if (error) console.error('Supabase quitarRutina:', error); });
  };

  /* ── marcarRutinaVista — marca TODAS las activas como vistas ── */
  window.marcarRutinaVista = function(alumnoPin) {
    const PIN = alumnoPin.toUpperCase();
    const arr = _sbCache.asignaciones[PIN];
    if (!arr || !arr.length) return;
    arr.forEach(entry => {
      if (entry.vista_por_alumno || !entry._dbId) return;
      entry.vista_por_alumno = true;
      _getSb().from('bp_asignaciones').update({ vista_por_alumno: true }).eq('id', entry._dbId)
        .then(({ error }) => { if (error) console.error('Supabase marcarRutinaVista:', error); });
    });
  };

  /* ── getHistorialRutinas ── */
  window.getHistorialRutinas = function(alumnoPin) {
    return (_sbCache.asignaciones[alumnoPin.toUpperCase()] || []).slice();
  };

  /* ── refreshAsignacionesCache — consulta ligera solo para A.3 ── */
  window.refreshAsignacionesCache = async function(pin) {
    const PIN = pin.toUpperCase();
    const { data, error } = await _getSb()
      .from('bp_asignaciones')
      .select('*')
      .eq('pin', PIN)
      .order('created_at', { ascending: false });
    if (error || !data) return false;
    _sbCache.asignaciones[PIN] = [];
    data.forEach(a => {
      if (!a.rutina_id) return;
      _sbCache.asignaciones[PIN].push({
        rutinaId:         a.rutina_id,
        fecha_asignacion: typeof a.fecha_asignacion === 'string'
          ? a.fecha_asignacion.slice(0, 10)
          : new Date(a.created_at).toISOString().slice(0, 10),
        vista_por_alumno: a.vista_por_alumno,
        _dbId:            a.id,
      });
    });
    return true;
  };

  /* ── saveMetric ── */
  window.saveMetric = function(alumnoId, ejercicioId, valor, tipo,
                               fecha, notas, estado) {
    if (!fecha)  fecha  = new Date().toISOString().slice(0, 10);
    if (!notas)  notas  = '';
    if (!estado) estado = '';
    const AID = alumnoId.toUpperCase();
    const metrica = {
      id:          `${AID}_${ejercicioId}_${Date.now()}`,
      alumnoId:    AID,
      ejercicioId,
      valor:       Number(valor),
      tipo,
      fecha,
      notas,
      estado,
    };
    if (!_sbCache.metricas[AID]) _sbCache.metricas[AID] = [];
    _sbCache.metricas[AID].push(metrica);
    _getSb().from('bp_metricas').insert({
      alumno_id:    AID,
      ejercicio_id: ejercicioId,
      valor:        Number(valor),
      tipo,
      fecha,
      notas,
      estado,
    }).then(({ error }) => { if (error) console.error('Supabase saveMetric:', error); });
    return metrica;
  };

  /* ── getMetricsByAlumno ── */
  window.getMetricsByAlumno = function(alumnoId) {
    const arr = _sbCache.metricas[alumnoId.toUpperCase()] || [];
    return arr.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  };

  /* ── migrateLocalMetrics ─────────────────────────────────────
     Sube a Supabase las métricas que quedaron en localStorage
     (guardadas antes de conectar el backend real) y limpia la clave
     local para que no se repitan en futuros logins.
     ─────────────────────────────────────────────────────────── */
  window.migrateLocalMetrics = async function(alumnoId) {
    const AID = alumnoId.toUpperCase();
    const key = 'bp_metrics_' + AID;
    let local;
    try { local = JSON.parse(localStorage.getItem(key) || 'null'); } catch { local = null; }
    if (!local || !local.length) return;

    const sb = _getSb();
    const rows = local.map(m => ({
      alumno_id:    AID,
      ejercicio_id: m.ejercicioId,
      valor:        Number(m.valor),
      tipo:         m.tipo,
      fecha:        m.fecha || new Date().toISOString().slice(0, 10),
      notas:        m.notas  || '',
      estado:       m.estado || '',
    }));

    const { error } = await sb.from('bp_metricas').insert(rows);
    if (error) {
      console.error('migrateLocalMetrics:', error);
      return;
    }

    /* Éxito: recargar cache desde Supabase y borrar localStorage */
    const { data: metricas } = await sb.from('bp_metricas')
      .select('*').eq('alumno_id', AID).order('fecha', { ascending: true });
    if (metricas) {
      _sbCache.metricas[AID] = metricas.map(_metricaFromDb);
    }
    localStorage.removeItem(key);
    console.log(`[migrate] ${rows.length} métricas migradas a Supabase para ${AID}`);
  };

  /* ════════════════════════════════════════════════════════
     GROUP C — Relaciones docente↔alumno
     ════════════════════════════════════════════════════════ */

  window.getAlumnosDeDocente = function(docentePin) {
    const dp = (docentePin || '').toUpperCase();
    return (_sbCache.docenteAlumnos[dp] || []).slice();
  };

  window.getDocentesDeAlumno = function(alumnoPin) {
    const ap = (alumnoPin || '').toUpperCase();
    return (_sbCache.alumnoDocentes[ap] || []).slice();
  };

  window.asignarDocenteAlumno = function(docentePin, alumnoPin, disciplinaId, asignadoPor) {
    const dp = (docentePin || '').toUpperCase();
    const ap = (alumnoPin  || '').toUpperCase();
    if (!_sbCache.docenteAlumnos[dp]) _sbCache.docenteAlumnos[dp] = [];
    if (!_sbCache.alumnoDocentes[ap]) _sbCache.alumnoDocentes[ap] = [];
    if (_sbCache.docenteAlumnos[dp].some(r => r.alumnoPin === ap)) return; // idempotente
    _sbCache.docenteAlumnos[dp].push({ alumnoPin: ap, disciplinaId: disciplinaId || '' });
    _sbCache.alumnoDocentes[ap].push({ docentePin: dp, disciplinaId: disciplinaId || '' });
    _getSb().from('bp_docente_alumno').insert({
      docente_pin:   dp,
      alumno_pin:    ap,
      disciplina_id: disciplinaId || null,
      asignado_por:  asignadoPor || 'docente',
    }).then(({ error }) => { if (error) console.error('Supabase asignarDocenteAlumno:', error); });
  };

  window.quitarDocenteAlumno = function(docentePin, alumnoPin) {
    const dp = (docentePin || '').toUpperCase();
    const ap = (alumnoPin  || '').toUpperCase();
    if (_sbCache.docenteAlumnos[dp]) {
      _sbCache.docenteAlumnos[dp] = _sbCache.docenteAlumnos[dp].filter(r => r.alumnoPin !== ap);
    }
    if (_sbCache.alumnoDocentes[ap]) {
      _sbCache.alumnoDocentes[ap] = _sbCache.alumnoDocentes[ap].filter(r => r.docentePin !== dp);
    }
    _getSb().from('bp_docente_alumno').delete()
      .eq('docente_pin', dp).eq('alumno_pin', ap)
      .then(({ error }) => { if (error) console.error('Supabase quitarDocenteAlumno:', error); });
  };

  /* ════════════════════════════════════════════════════════
     GROUP D — Alta médica
     ════════════════════════════════════════════════════════ */

  window.actualizarAptoMedico = function(pin, aptoMedico, fecha) {
    const upper = pin.toUpperCase();
    if (_sbCache.usuarios[upper]) {
      _sbCache.usuarios[upper].apto_medico       = aptoMedico;
      _sbCache.usuarios[upper].fecha_alta_medica = fecha || null;
    }
    _getSb().from('bp_usuarios')
      .update({ apto_medico: aptoMedico, fecha_alta_medica: fecha || null })
      .eq('pin', upper)
      .then(({ error }) => { if (error) console.error('Supabase actualizarAptoMedico:', error); });
  };

  window.uploadDocMedico = async function(pin, file) {
    const upper = pin.toUpperCase();
    const ext   = (file.name.split('.').pop() || 'pdf').toLowerCase();
    const path  = `${upper}/alta_medica_${Date.now()}.${ext}`;
    const sb    = _getSb();

    const { error: upErr } = await sb.storage
      .from('medical-docs')
      .upload(path, file, { upsert: true });
    if (upErr) { console.error('uploadDocMedico:', upErr); throw upErr; }

    const { data: urlData } = sb.storage.from('medical-docs').getPublicUrl(path);
    const url = urlData?.publicUrl || '';

    if (_sbCache.usuarios[upper]) _sbCache.usuarios[upper].doc_medico_url = url;
    await sb.from('bp_usuarios').update({ doc_medico_url: url }).eq('pin', upper);
    return url;
  };

  /* ── Fotos de progreso ── */
  window.getFotosProgreso = async function(pin) {
    const upper = pin.toUpperCase();
    const { data, error } = await _getSb()
      .from('bp_fotos_progreso')
      .select('*')
      .eq('pin', upper)
      .order('fecha', { ascending: false });
    if (error) { console.error('getFotosProgreso:', error); return []; }
    return (data || []).map(r => ({
      id:    r.id,
      pin:   r.pin,
      url:   r.url,
      fecha: r.fecha,
      notas: r.notas || '',
    }));
  };

  window.uploadFotoProgreso = async function(pin, file, fecha, notas) {
    const upper = pin.toUpperCase();
    const ext   = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path  = `${upper}/${fecha || new Date().toISOString().slice(0,10)}_${Date.now()}.${ext}`;
    const sb    = _getSb();

    const { error: upErr } = await sb.storage
      .from('progress-photos')
      .upload(path, file, { upsert: false });
    if (upErr) { console.error('uploadFotoProgreso storage:', upErr); throw upErr; }

    const { data: urlData } = sb.storage.from('progress-photos').getPublicUrl(path);
    const url = urlData?.publicUrl || '';

    const { data: row, error: dbErr } = await sb.from('bp_fotos_progreso').insert({
      pin:   upper,
      url,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      notas: notas || '',
    }).select().single();
    if (dbErr) { console.error('uploadFotoProgreso db:', dbErr); throw dbErr; }
    return { id: row.id, pin: row.pin, url: row.url, fecha: row.fecha, notas: row.notas || '' };
  };

  window.deleteFotoProgreso = async function(id, pin, url) {
    const sb = _getSb();
    await sb.from('bp_fotos_progreso').delete().eq('id', id);
    /* Borrar del storage si la URL es del bucket */
    if (url && url.includes('progress-photos')) {
      const parts = url.split('/progress-photos/');
      if (parts[1]) {
        await sb.storage.from('progress-photos').remove([decodeURIComponent(parts[1])]);
      }
    }
  };

  /* ── Refresh parcial de cache ── */
  window.refreshPendingUsers = async function() {
    const { data } = await _getSb().from('bp_usuarios').select('*').eq('estado', 'pendiente');
    if (data) data.forEach(u => { _sbCache.usuarios[u.pin] = u; });
  };

  window.refreshAlumnoData = async function(pin) {
    const upper = pin.toUpperCase();
    const { data } = await _getSb().from('bp_usuarios').select('*').eq('pin', upper).maybeSingle();
    if (data) _sbCache.usuarios[upper] = data;
    return data || null;
  };

  /* ── Eliminar usuario con cascade ── */
  window.eliminarUsuario = async function(pin) {
    const upper = pin.toUpperCase();
    const sb    = _getSb();
    const u     = _sbCache.usuarios[upper];

    /* Si es docente/admin, huerfanar sus rutinas */
    if (u && (u.rol === 'docente' || u.rol === 'admin')) {
      await sb.from('bp_rutinas').update({ creado_por: 'GENERAL' }).eq('creado_por', upper);
    }

    /* Cascade delete */
    await sb.from('bp_metricas').delete().eq('alumno_id', upper);
    await sb.from('bp_asignaciones').delete().eq('pin', upper);
    await sb.from('bp_docente_alumno').delete().eq('alumno_pin', upper);
    await sb.from('bp_docente_alumno').delete().eq('docente_pin', upper);
    await sb.from('bp_fotos_progreso').delete().eq('pin', upper);
    const { error } = await sb.from('bp_usuarios').delete().eq('pin', upper);
    if (error) { console.error('eliminarUsuario:', error); throw error; }

    /* Limpiar cache */
    delete _sbCache.usuarios[upper];
    delete _sbCache.metricas[upper];
    delete _sbCache.asignaciones[upper];
    Object.keys(_sbCache.docenteAlumnos).forEach(dp => {
      _sbCache.docenteAlumnos[dp] = (_sbCache.docenteAlumnos[dp] || []).filter(r => r.alumnoPin !== upper);
    });
    delete _sbCache.docenteAlumnos[upper];
    Object.keys(_sbCache.alumnoDocentes).forEach(ap => {
      _sbCache.alumnoDocentes[ap] = (_sbCache.alumnoDocentes[ap] || []).filter(r => r.docentePin !== upper);
    });
    delete _sbCache.alumnoDocentes[upper];
  };

  window.uploadAvatar = async function(pin, file) {
    const upper = pin.toUpperCase();
    const ext   = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path  = `${upper}/avatar.${ext}`;
    const sb    = _getSb();

    const { error: upErr } = await sb.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (upErr) { console.error('uploadAvatar:', upErr); throw upErr; }

    const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
    const url = urlData?.publicUrl || '';

    if (_sbCache.usuarios[upper]) _sbCache.usuarios[upper].avatar_url = url;
    await sb.from('bp_usuarios').update({ avatar_url: url }).eq('pin', upper);
    return url;
  };

} /* end if (isSupabaseMode()) */
