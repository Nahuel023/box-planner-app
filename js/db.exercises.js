/* ════════════════════════════════════════════════════════════
   BOX PLANNER — CAPA DE EJERCICIOS
   ────────────────────────────────────────────────────────────
   - Cache en memoria de bp_ejercicios
   - Búsqueda filtrada por disciplina
   - CRUD (alta desde panel docente)
   - Se carga una sola vez al iniciar sesión como docente
   ════════════════════════════════════════════════════════════ */

/* Cache local de ejercicios { [id]: ejercicio } */
const _ejerciciosCache = {};
let   _ejerciciosCargados = false;

/* ── Cargar todos los ejercicios desde Supabase ──────────── */
async function loadEjerciciosCache() {
  if (!isSupabaseMode()) return;
  if (_ejerciciosCargados) return;

  const { data, error } = await _getSb()
    .from('bp_ejercicios')
    .select('*')
    .eq('activo', true)
    .order('nombre');

  if (error) { console.error('loadEjerciciosCache:', error); return; }
  if (data)  data.forEach(e => { _ejerciciosCache[e.id] = e; });
  _ejerciciosCargados = true;
}

/* ── Buscar ejercicios por texto y disciplina ────────────── */
/* disciplinas: string o array. query: texto parcial */
function buscarEjercicios(query, disciplinas) {
  const q    = (query || '').toLowerCase().trim();
  const disc = Array.isArray(disciplinas) ? disciplinas : [disciplinas];

  return Object.values(_ejerciciosCache)
    .filter(e => {
      if (!e.activo) return false;
      if (disc.length && !disc.includes(e.disciplina)) return false;
      if (q && !e.nombre.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      /* Coincidencia al inicio del nombre primero */
      const aStart = a.nombre.toLowerCase().startsWith(q);
      const bStart = b.nombre.toLowerCase().startsWith(q);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;
      return a.nombre.localeCompare(b.nombre);
    })
    .slice(0, 15); /* máximo 15 sugerencias */
}

/* ── Obtener ejercicio por ID ─────────────────────────────── */
function getEjercicioById(id) {
  return _ejerciciosCache[id] || null;
}

/* ── Listar disciplinas disponibles ──────────────────────── */
function getEjerciciosDisciplinas() {
  const set = new Set(Object.values(_ejerciciosCache).map(e => e.disciplina));
  return Array.from(set).sort();
}

/* ── Crear nuevo ejercicio ───────────────────────────────── */
async function crearEjercicio({ nombre, disciplina, patron_movimiento, tipo,
                                 musculo_principal, musculo_secundario,
                                 equipamiento, nivel }) {
  /* Generar ID único */
  const ts  = Date.now().toString(36);
  const id  = `ex_${ts}`;
  const row = {
    id,
    nombre:             nombre.trim(),
    disciplina,
    patron_movimiento:  patron_movimiento || '',
    tipo:               tipo || '',
    musculo_principal:  musculo_principal || '',
    musculo_secundario: musculo_secundario || [],
    equipamiento:       Array.isArray(equipamiento) ? equipamiento : [equipamiento].filter(Boolean),
    nivel:              nivel || 'principiante',
    es_bilateral:       true,
    dificultad_tecnica: 1,
    contraindicado_en:  [],
    activo:             true,
    created_by:         (typeof state !== 'undefined' && state.alumno) ? state.alumno.pin : 'docente',
  };

  /* Guardar en cache inmediatamente (UI reactiva) */
  _ejerciciosCache[id] = row;

  if (isSupabaseMode()) {
    const { error } = await _getSb().from('bp_ejercicios').insert(row);
    if (error) {
      console.error('crearEjercicio:', error);
      delete _ejerciciosCache[id];
      throw error;
    }
  }

  return row;
}

/* ── Actualizar ejercicio existente ──────────────────────── */
async function actualizarEjercicio(id, campos) {
  if (!_ejerciciosCache[id]) throw new Error('Ejercicio no encontrado: ' + id);
  Object.assign(_ejerciciosCache[id], campos);

  if (isSupabaseMode()) {
    const { error } = await _getSb().from('bp_ejercicios').update(campos).eq('id', id);
    if (error) console.error('actualizarEjercicio:', error);
  }
}

/* ── Buscar ejercicio por nombre exacto ──────────────────── */
function getEjercicioByNombre(nombre) {
  const q = (nombre || '').toLowerCase().trim();
  if (!q) return null;
  return Object.values(_ejerciciosCache).find(e => e.nombre.toLowerCase() === q) || null;
}

/* ── Desactivar ejercicio (soft delete) ──────────────────── */
async function desactivarEjercicio(id) {
  await actualizarEjercicio(id, { activo: false });
  delete _ejerciciosCache[id];
}
