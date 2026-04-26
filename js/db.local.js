/* ════════════════════════════════════════════════════════════
   BOX PLANNER — CAPA LOCAL (localStorage)
   ════════════════════════════════════════════════════════════
   Operaciones CRUD sobre localStorage para modo demo y fallback.
   Carga después de db.demo.js (usa ALUMNOS, DISCIPLINAS).
   db.supabase.js sobreescribe estas funciones con versiones async.
   ════════════════════════════════════════════════════════════ */

/* ── Usuarios locales ────────────────────────────────────────*/
const NUEVOS_USUARIOS_KEY = 'bp_nuevos_usuarios';

function pinEnUso(pin) {
  const upper = pin.toUpperCase();
  if (ALUMNOS.some(a => a.id.toUpperCase() === upper)) return true;
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  return !!data[upper];
}

function registrarAlumnoLocal({ pin, nombre, email, fechaNacimiento, objetivo }) {
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  data[pin.toUpperCase()] = {
    pin:           pin.toUpperCase(),
    nombre,
    email,
    fechaNacimiento,
    objetivo:      objetivo || '',
    estado:        'pendiente',
    fechaRegistro: new Date().toISOString().slice(0, 10),
  };
  localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
}

function checkAlumnoPendiente(pin) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  const entry = data[pin.toUpperCase()];
  return !!(entry && entry.estado === 'pendiente');
}

function getAlumnoLocal(pin) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  const upper = pin.toUpperCase();
  const u     = data[upper];
  if (!u || u.estado !== 'activo') return null;

  const disciplinaNombre = (u.disciplinas || [])
    .map(id => { const d = DISCIPLINAS.find(d => d.id === id); return d ? d.nombre : id; })
    .join(' / ') || '—';

  let roles = Array.isArray(u.roles) && u.roles.length ? u.roles : null;
  try {
    const lsVal = localStorage.getItem('bp_roles_' + upper);
    if (lsVal) roles = JSON.parse(lsVal);
  } catch(e) { /* ignore */ }
  if (!roles) roles = [u.rol || 'alumno'];

  return {
    pin:             u.pin,
    nombre:          u.nombre,
    edad:            u.fechaNacimiento || '—',
    rol:             roles[0],
    roles,
    disciplinas:     u.disciplinas || [],
    disciplina:      disciplinaNombre,
    objetivo:        u.objetivo || '—',
    dias:            u.dias !== undefined ? u.dias : 0,
    rutina:          '',
    estado:          'Activo',
    aptoMedico:      true,
    fechaAltaMedica: null,
    docMedicoUrl:    null,
    avatarUrl:       null,
  };
}

function aprobarUsuarioLocal(pin, nuevoRol) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  const upper = pin.toUpperCase();
  if (!data[upper]) return;
  data[upper].estado = 'activo';
  data[upper].rol    = nuevoRol;
  if (!data[upper].disciplinas) data[upper].disciplinas = [];
  if (data[upper].dias === undefined) data[upper].dias  = 3;
  localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
}

function rechazarUsuarioLocal(pin) {
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  delete data[pin.toUpperCase()];
  localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
}

function cambiarRolLocal(pin, nuevoRol) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  const upper = pin.toUpperCase();
  if (!data[upper] || data[upper].estado !== 'activo') return;
  data[upper].rol = nuevoRol;
  localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
}

function actualizarPerfilAlumnoLocal(pin, disciplinas, dias, objetivo) {
  const upper = pin.toUpperCase();
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  if (data[upper]) {
    data[upper].disciplinas = disciplinas;
    data[upper].dias        = dias;
    if (objetivo !== undefined) data[upper].objetivo = objetivo;
    localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
    return;
  }
  /* Usuario demo hardcodeado — guardar overrides */
  const DEMO_OVERRIDES_KEY = 'bp_demo_overrides';
  const overrides = JSON.parse(localStorage.getItem(DEMO_OVERRIDES_KEY) || '{}');
  if (!overrides[upper]) overrides[upper] = {};
  overrides[upper].disciplinas = disciplinas;
  overrides[upper].dias        = dias;
  if (objetivo !== undefined) overrides[upper].objetivo = objetivo;
  localStorage.setItem(DEMO_OVERRIDES_KEY, JSON.stringify(overrides));
}

function _getDemoOverride(pin) {
  const overrides = JSON.parse(localStorage.getItem('bp_demo_overrides') || '{}');
  return overrides[pin.toUpperCase()] || null;
}

function getUsuariosLocales() {
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  return Object.values(data);
}

/* ── Relación docente↔alumno ─────────────────────────────────*/
const _DA_KEY = 'bp_docente_alumno';

function _readDA() {
  try { return JSON.parse(localStorage.getItem(_DA_KEY) || '[]'); } catch { return []; }
}
function _saveDA(rows) { localStorage.setItem(_DA_KEY, JSON.stringify(rows)); }

function getAlumnosDeDocente(docentePin) {
  const dp = (docentePin || '').toUpperCase();
  return _readDA()
    .filter(r => r.docentePin === dp)
    .map(r => ({ alumnoPin: r.alumnoPin, disciplinaId: r.disciplinaId || '' }));
}

function getDocentesDeAlumno(alumnoPin) {
  const ap = (alumnoPin || '').toUpperCase();
  return _readDA()
    .filter(r => r.alumnoPin === ap)
    .map(r => ({ docentePin: r.docentePin, disciplinaId: r.disciplinaId || '' }));
}

function asignarDocenteAlumno(docentePin, alumnoPin, disciplinaId, asignadoPor) {
  const dp   = (docentePin || '').toUpperCase();
  const ap   = (alumnoPin  || '').toUpperCase();
  const rows = _readDA();
  if (rows.some(r => r.docentePin === dp && r.alumnoPin === ap)) return;
  rows.push({ docentePin: dp, alumnoPin: ap, disciplinaId: disciplinaId || '', asignadoPor: asignadoPor || 'docente' });
  _saveDA(rows);
}

function quitarDocenteAlumno(docentePin, alumnoPin) {
  const dp = (docentePin || '').toUpperCase();
  const ap = (alumnoPin  || '').toUpperCase();
  _saveDA(_readDA().filter(r => !(r.docentePin === dp && r.alumnoPin === ap)));
}

function actualizarRolesLocal(pin, rolesArr) {
  const upper = pin.toUpperCase();
  localStorage.setItem('bp_roles_' + upper, JSON.stringify(rolesArr));
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  if (data[upper]) {
    data[upper].roles = rolesArr;
    data[upper].rol   = rolesArr[0];
    localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
  }
}

/* ── Fotos de progreso (demo / localStorage) ─────────────────*/
const _FOTOS_LS_KEY = pin => `bp_fotos_progreso_${pin.toUpperCase()}`;

function getFotosProgreso(pin) {
  try { return JSON.parse(localStorage.getItem(_FOTOS_LS_KEY(pin)) || '[]'); } catch { return []; }
}

function saveFotoProgresoLocal(pin, foto) {
  const fotos = getFotosProgreso(pin);
  fotos.unshift(foto);
  localStorage.setItem(_FOTOS_LS_KEY(pin), JSON.stringify(fotos));
}

function deleteFotoProgresoLocal(pin, id) {
  const fotos = getFotosProgreso(pin).filter(f => f.id !== id);
  localStorage.setItem(_FOTOS_LS_KEY(pin), JSON.stringify(fotos));
}
