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
  usuarios:     {},   // { [PIN]: rowDeBaseDatos }
  rutinas:      {},   // { [id]: rutinaCustom }   ← mismo formato que getCustomRutinas()
  asignaciones: {},   // { [PIN]: [{ rutinaId, fecha_asignacion, vista_por_alumno, _dbId }] }
  metricas:     {},   // { [alumnoId]: [metrica] }
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
  return {
    pin:         u.pin,
    nombre:      u.nombre,
    edad:        u.fecha_nacimiento || '—',
    rol:         u.rol || 'alumno',
    roles:       Array.isArray(u.roles) && u.roles.length ? u.roles : [u.rol || 'alumno'],
    disciplinas: u.disciplinas || [],        // array de IDs para filtrado
    disciplina:  disciplinaNombre,           // string formateado para display
    objetivo:    u.objetivo || '—',
    dias:        u.dias !== undefined ? u.dias : 3,
    rutina:      '',
    estado:      'Activo',
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
    if (!_sbCache.usuarios[upper]) return;
    _sbCache.usuarios[upper].roles = rolesArr;
    /* Sincronizar rol principal al primer elemento del array */
    _sbCache.usuarios[upper].rol   = rolesArr[0];
    _getSb().from('bp_usuarios').update({ roles: rolesArr, rol: rolesArr[0] }).eq('pin', upper)
      .then(({ error }) => { if (error) console.error('Supabase actualizarRolesLocal:', error); });
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
  window.asignarRutina = function(alumnoPin, rutinaId) {
    const PIN   = alumnoPin.toUpperCase();
    const entry = {
      rutinaId:         rutinaId,
      fecha_asignacion: new Date().toISOString().slice(0, 10),
      vista_por_alumno: false,
    };
    if (!_sbCache.asignaciones[PIN]) _sbCache.asignaciones[PIN] = [];
    _sbCache.asignaciones[PIN].unshift(entry);  // [0] = más reciente
    _getSb().from('bp_asignaciones').insert({
      pin:              PIN,
      rutina_id:        rutinaId,
      fecha_asignacion: entry.fecha_asignacion,
      vista_por_alumno: false,
    }).then(({ data, error }) => {
      if (error) { console.error('Supabase asignarRutina:', error); return; }
      /* Guardar el id de DB para poder actualizar vista_por_alumno después */
      if (data && data[0]) _sbCache.asignaciones[PIN][0]._dbId = data[0].id;
    });
  };

  /* ── marcarRutinaVista ── */
  window.marcarRutinaVista = function(alumnoPin) {
    const PIN = alumnoPin.toUpperCase();
    const arr = _sbCache.asignaciones[PIN];
    if (!arr || !arr.length || arr[0].vista_por_alumno) return;
    arr[0].vista_por_alumno = true;
    const dbId = arr[0]._dbId;
    if (dbId) {
      _getSb().from('bp_asignaciones').update({ vista_por_alumno: true }).eq('id', dbId)
        .then(({ error }) => { if (error) console.error('Supabase marcarRutinaVista:', error); });
    }
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

} /* end if (isSupabaseMode()) */
