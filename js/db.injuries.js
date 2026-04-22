/* ════════════════════════════════════════════════════════════
   BOX PLANNER — CAPA DE LESIONES
   ────────────────────────────────────────────────────────────
   - CRUD de lesiones (docente asigna al alumno)
   - Seguimiento diario (carga el alumno)
   - Restricciones se usan en el generador para filtrar ejercicios
   ════════════════════════════════════════════════════════════ */

/* Cache { [pin]: [lesion] } */
const _lesionesCache    = {};
const _seguimientoCache = {};

/* ── Cargar lesiones (al iniciar sesión) ─────────────────── */
async function loadLesionesCache(pin, rol) {
  if (!isSupabaseMode()) return;

  /* Limpiar antes de recargar para evitar duplicados en re-login */
  Object.keys(_lesionesCache).forEach(k => delete _lesionesCache[k]);
  Object.keys(_seguimientoCache).forEach(k => delete _seguimientoCache[k]);

  let q = _getSb().from('bp_lesiones').select('*').order('created_at', { ascending: false });
  if (rol === 'alumno') q = q.eq('pin', pin.toUpperCase());
  const { data, error } = await q;
  if (error) { console.error('loadLesionesCache:', error); return; }
  if (data) data.forEach(l => {
    const p = l.pin.toUpperCase();
    if (!_lesionesCache[p]) _lesionesCache[p] = [];
    _lesionesCache[p].push(l);
  });

  /* Seguimiento del alumno actual */
  let sq = _getSb().from('bp_lesion_seguimiento').select('*').order('fecha', { ascending: true });
  if (rol === 'alumno') sq = sq.eq('pin', pin.toUpperCase());
  const { data: seg, error: segErr } = await sq;
  if (!segErr && seg) seg.forEach(s => {
    if (!_seguimientoCache[s.lesion_id]) _seguimientoCache[s.lesion_id] = [];
    _seguimientoCache[s.lesion_id].push(s);
  });
}

/* ── Obtener lesiones activas de un alumno ───────────────── */
function getLesionesActivas(pin) {
  const all = _lesionesCache[pin.toUpperCase()] || [];
  return all.filter(l => l.estado !== 'resuelta');
}

/* ── Obtener todas las lesiones de un alumno ─────────────── */
function getLesionesByPin(pin) {
  return (_lesionesCache[pin.toUpperCase()] || []).slice();
}

/* ── Obtener restricciones consolidadas de un alumno ──────── */
/* Devuelve array de zonas/musculos a evitar para filtrar ejercicios */
function getRestriccionesAlumno(pin) {
  return getLesionesActivas(pin)
    .flatMap(l => l.restricciones || []);
}

/* ── Crear lesión (docente) ──────────────────────────────── */
async function crearLesion({ pin, zona_corporal, tipo_lesion, estado, gravedad,
                              restricciones, fecha_inicio, apto_entrenar, notas_docente }) {
  const PIN = pin.toUpperCase();
  const row = {
    pin:           PIN,
    zona_corporal,
    tipo_lesion:   tipo_lesion || '',
    estado:        estado || 'activa',
    gravedad:      gravedad || 'leve',
    restricciones: restricciones || [],
    fecha_inicio:  fecha_inicio || new Date().toISOString().slice(0, 10),
    apto_entrenar: apto_entrenar !== false,
    notas_docente: notas_docente || '',
  };

  if (!_lesionesCache[PIN]) _lesionesCache[PIN] = [];

  if (isSupabaseMode()) {
    const { data, error } = await _getSb().from('bp_lesiones').insert(row).select().single();
    if (error) { console.error('crearLesion:', error); throw error; }
    _lesionesCache[PIN].unshift(data);
    return data;
  } else {
    const local = { ...row, id: Date.now() };
    _lesionesCache[PIN].unshift(local);
    return local;
  }
}

/* ── Actualizar estado/notas de lesión ───────────────────── */
async function actualizarLesion(lesionId, campos) {
  /* Actualizar en cache */
  for (const arr of Object.values(_lesionesCache)) {
    const l = arr.find(x => x.id === lesionId);
    if (l) { Object.assign(l, campos); break; }
  }
  if (isSupabaseMode()) {
    const { error } = await _getSb().from('bp_lesiones').update(campos).eq('id', lesionId);
    if (error) console.error('actualizarLesion:', error);
  }
}

/* ── Resolver lesión ─────────────────────────────────────── */
async function resolverLesion(lesionId) {
  await actualizarLesion(lesionId, {
    estado:    'resuelta',
    fecha_fin: new Date().toISOString().slice(0, 10),
  });
}

/* ── Guardar seguimiento diario (alumno) ─────────────────── */
async function guardarSeguimientoLesion({ lesion_id, pin, dolor, rigidez,
                                          inflamacion, sensacion_gral, observaciones }) {
  const fecha = new Date().toISOString().slice(0, 10);
  const row   = {
    lesion_id,
    pin:          pin.toUpperCase(),
    fecha,
    dolor:        Number(dolor) || 0,
    rigidez:      Number(rigidez) || 0,
    inflamacion:  Number(inflamacion) || 0,
    sensacion_gral: Number(sensacion_gral) || 0,
    observaciones: observaciones || '',
  };

  if (!_seguimientoCache[lesion_id]) _seguimientoCache[lesion_id] = [];

  /* Reemplazar entrada del día si ya existe */
  const idx = _seguimientoCache[lesion_id].findIndex(s => s.fecha === fecha);
  if (idx >= 0) _seguimientoCache[lesion_id][idx] = { ..._seguimientoCache[lesion_id][idx], ...row };
  else          _seguimientoCache[lesion_id].push(row);

  if (isSupabaseMode()) {
    const { error } = await _getSb()
      .from('bp_lesion_seguimiento')
      .upsert(row, { onConflict: 'lesion_id,fecha' });
    if (error) console.error('guardarSeguimientoLesion:', error);
  }
}

/* ── Obtener historial de seguimiento ────────────────────── */
function getSeguimientoLesion(lesionId) {
  return (_seguimientoCache[lesionId] || [])
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
