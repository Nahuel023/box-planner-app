/* ════════════════════════════════════════════════════════════
   BOX PLANNER — MODELO DE DATOS Y DATOS DE DEMO
   ════════════════════════════════════════════════════════════

   Este archivo define el esquema del MVP y los datos de demo.

   Cuando se integre un backend real (Firebase / Supabase), este
   archivo se reemplaza por llamadas a la API conservando las
   mismas firmas de las funciones adaptadoras (al final del
   archivo), sin tocar nada del código de renderizado.

   ESQUEMA RÁPIDO
   ──────────────
   Alumno      → id (PIN), nombre, rol, disciplinas[], rutinaId …
   Disciplina  → id, nombre, color
   Ejercicio   → id, nombre, categoria, disciplinaIds[], tipoMetrica
   Rutina      → id, nombre, disciplinaId, nivel, dias[]
   RM_HISTORIAL → { [alumnoId]: [ { ejercicioId, meses[12], … } ] }
   ════════════════════════════════════════════════════════════ */

/* ── Disciplinas ─────────────────────────────────────────────
   Cada gimnasio activa las que ofrece.
   ─────────────────────────────────────────────────────────── */
const DISCIPLINAS = [
  { id: "crossfit",    nombre: "CrossFit",              color: "#ff6b35" },
  { id: "oly",         nombre: "Levantamiento Olímpico", color: "#e8ff47" },
  { id: "musculacion", nombre: "Musculación",            color: "#a78bfa" },
  { id: "funcional",   nombre: "Funcional",              color: "#38bdf8" },
];

/* ── Catálogo de ejercicios ──────────────────────────────────
   tipoMetrica: "peso_kg" | "tiempo_seg" | "repeticiones"
   ─────────────────────────────────────────────────────────── */
const EJERCICIOS = [
  { id: "snatch",        nombre: "Snatch",        categoria: "Olímpico", disciplinaIds: ["crossfit","oly"],         tipoMetrica: "peso_kg" },
  { id: "clean_jerk",    nombre: "Clean & Jerk",  categoria: "Olímpico", disciplinaIds: ["crossfit","oly"],         tipoMetrica: "peso_kg" },
  { id: "sentadilla",    nombre: "Sentadilla",    categoria: "Pierna",   disciplinaIds: ["crossfit","musculacion"], tipoMetrica: "peso_kg" },
  { id: "press_militar", nombre: "Press Militar", categoria: "Hombros",  disciplinaIds: ["crossfit","musculacion"], tipoMetrica: "peso_kg" },
  { id: "press_banca",   nombre: "Press Banca",   categoria: "Pecho",    disciplinaIds: ["musculacion"],            tipoMetrica: "peso_kg" },
  { id: "peso_muerto",   nombre: "Peso Muerto",   categoria: "Espalda",  disciplinaIds: ["crossfit","musculacion"], tipoMetrica: "peso_kg" },
];

/* ── Alumnos ──────────────────────────────────────────────────
   rol:    "alumno" | "docente"
   estado: "activo" | "inactivo"
   email:  vacío por ahora; se usa cuando haya auth por email
   ─────────────────────────────────────────────────────────── */
const ALUMNOS = [
  {
    id:            "MAR001",
    nombre:        "Martín Rodríguez",
    email:         "",
    edad:          28,
    rol:           "alumno",
    disciplinas:   ["crossfit", "oly"],
    objetivo:      "Mejorar Snatch y C&J",
    diasPorSemana: 4,
    rutinaId:      "CF_INTERM_A",
    estado:        "activo",
  },
  {
    id:            "LUC002",
    nombre:        "Lucía González",
    email:         "",
    edad:          25,
    rol:           "alumno",
    disciplinas:   ["crossfit"],
    objetivo:      "Competir nivel regional",
    diasPorSemana: 3,
    rutinaId:      "CF_PRINC_B",
    estado:        "activo",
  },
  {
    id:            "DIE003",
    nombre:        "Diego Martínez",
    email:         "",
    edad:          32,
    rol:           "alumno",
    disciplinas:   ["musculacion"],
    objetivo:      "Aumentar masa muscular",
    diasPorSemana: 5,
    rutinaId:      "MUSC_SPLIT",
    estado:        "activo",
  },
  {
    id:            "PROF01",
    nombre:        "Prof. García",
    email:         "",
    edad:          35,
    rol:           "admin",
    disciplinas:   ["crossfit", "oly", "musculacion"],
    objetivo:      "",
    diasPorSemana: 0,
    rutinaId:      null,
    estado:        "activo",
  },
];

/* ── Historial de RMs ─────────────────────────────────────────
   Índice por alumnoId. Cada entrada representa un ejercicio
   durante el año en curso.
   meses: 12 valores (número o null si no hay registro ese mes).
   ─────────────────────────────────────────────────────────── */
const RM_HISTORIAL = {
  "MAR001": [
    { ejercicioId:"snatch",        categoria:"Olímpico", meses:[68,70,72,75,78,80,83,85,null,null,null,null], mejor:85,  progresoPct:25.0 },
    { ejercicioId:"clean_jerk",    categoria:"Olímpico", meses:[95,98,100,103,105,107,109,112,null,null,null,null], mejor:112, progresoPct:17.9 },
    { ejercicioId:"sentadilla",    categoria:"Pierna",   meses:[120,125,128,130,133,135,138,140,null,null,null,null], mejor:140, progresoPct:16.7 },
    { ejercicioId:"press_militar", categoria:"Hombros",  meses:[65,65,68,70,72,72,73,75,null,null,null,null],   mejor:75,  progresoPct:15.4 },
  ],
  "LUC002": [
    { ejercicioId:"snatch",      categoria:"Olímpico", meses:[35,36,38,40,42,43,45,48,null,null,null,null], mejor:48, progresoPct:37.1 },
    { ejercicioId:"clean_jerk",  categoria:"Olímpico", meses:[48,50,52,55,57,58,60,62,null,null,null,null], mejor:62, progresoPct:29.2 },
    { ejercicioId:"sentadilla",  categoria:"Pierna",   meses:[60,62,65,68,70,72,75,80,null,null,null,null], mejor:80, progresoPct:33.3 },
    { ejercicioId:"peso_muerto", categoria:"Espalda",  meses:[75,78,80,82,85,87,88,90,null,null,null,null], mejor:90, progresoPct:20.0 },
  ],
  "DIE003": [
    { ejercicioId:"press_banca",   categoria:"Pecho",   meses:[88,90,92,95,98,100,104,110,null,null,null,null],  mejor:110, progresoPct:25.0 },
    { ejercicioId:"sentadilla",    categoria:"Pierna",  meses:[120,125,128,132,135,138,142,150,null,null,null,null], mejor:150, progresoPct:25.0 },
    { ejercicioId:"peso_muerto",   categoria:"Espalda", meses:[145,150,155,158,162,165,170,180,null,null,null,null], mejor:180, progresoPct:24.1 },
    { ejercicioId:"press_militar", categoria:"Hombros", meses:[60,62,65,68,70,72,75,80,null,null,null,null],    mejor:80,  progresoPct:33.3 },
  ],
};

/* ── Definiciones de rutinas ──────────────────────────────────
   dias[].diaSemana: "lunes"|"martes"|"miercoles"|"jueves"|"viernes"
   dias[].label:     etiqueta display opcional (ej: "LUNES — Empuje")
   bloques[].tipo:   "structure"|"strength"|"wl"|"metcon"|"core"|"tabata"
   bloques[].cap:    tiempo límite opcional (string, ej: "17'")
   ─────────────────────────────────────────────────────────── */
const RUTINAS = {

  "CF_INTERM_A": {
    nombre:       "CF Intermedio A",
    disciplinaId: "crossfit",
    nivel:        "intermedio",
    dias: [
      { diaSemana:"martes", bloques:[
        { tipo:"structure", label:"STRUCTURE-SUP: 3 Sets",
          items:["10 Strict pull ups / Push ups","10 Doble DB Remo acostado (Pesado)","10 Vuelos laterales (Moderado)","(Rest 2' entre sets)"] },
        { tipo:"wl", label:"A.1) WEIGHTLIFTING: High power Snatch + Ohs + Low hang squat snatch (% Sn)  —  Emom 11'",
          items:["1-2) 50% / 1+1+1  x2","3-4) 60% / 1+1+1  x2","5) Rest","6) 70% / 1+1+1","7-8) 75% / 1+1+1  x2","9-10) 80% / 1+1+1  x2","11) Rest"] },
        { tipo:"wl", label:"A.2) Emom 3' — Snatch pull + High snatch pull + Low hang Sn pull",
          items:["12-13-14) 90-100% / 1+1+1  x3"] },
        { tipo:"metcon", label:"B) METCON: For time  (Intensidad: 90%)  —  2-4-6-8-10", cap:"22'",
          items:["Hang power snatch  (50/35kg)  (35/20kg)","Bmu / T2b  (x2)","── Followed by 10-8-6-4-2 ──","Ohs  (50/35kg)  (35/20kg)","Wall climb"] },
      ]},
      { diaSemana:"miercoles", bloques:[
        { tipo:"structure", label:"STRUCTURE-INF: 3 Sets",
          items:["8 Hip thrust (50% Deadlift)","5/5 Bulgarian squats (Pesado)","{Rest 2' entre sets}"] },
        { tipo:"strength", label:"A) STRENGTH: Strict press (% Strict press)  —  Cada 1:30' x 6' (4 Sets)",
          items:["1) 60% / 3","2) 70% / 3","3) 80% / 3","4) 85% / 3"] },
        { tipo:"wl", label:"B) WEIGHTLIFTING: Push press + Push jerk (% Jerk)  —  Emom 10'",
          items:["1-2) 50% / 2+1  x2","3) 60% / 2+1","4) Rest","5) 70% / 1+2","6) 75% / 1+2","7) Rest","8-9-10) 80% / 0+2  x3"] },
        { tipo:"metcon", label:"C) METCON: For time  (Intensidad: 85%)", cap:"16'",
          items:["200 Du / 300 Ss","50 Burpee box jump over / 60 Burpees to target","40 C2b / Pull ups","30 Thrusters  (45/25kg)"] },
      ]},
      { diaSemana:"jueves", bloques:[
        { tipo:"core", label:"A) CORE: 20-15-10", cap:"7'",
          items:["Bolitas","Crunches laterales (Izq)","Crunches laterales (Der)","Superman","Hollow rocks"] },
        { tipo:"structure", label:"STRUCTURE-SUP: 3 Sets",
          items:["15 Fondos en cajón traseros","10 DB tricep ext Oh (Moderado)","{Rest 2' entre sets}"] },
        { tipo:"metcon", label:"B) METCON: Emom 28'  (Intensidad: 70%)",
          items:["1) 12/7 — 15/10 T2b","2) 12/10 Hspu","3) 10/8 Single DB Devil press alt  (22/15kg)","4) 100 mts run"] },
      ]},
      { diaSemana:"viernes", bloques:[
        { tipo:"tabata", label:"Tabata: Squat jump + Lunges", items:[] },
        { tipo:"strength", label:"A) STRENGTH: Front squat (% Front)  —  Cada 1:30' x 6' (4 sets)",
          items:["1) 60% / 5","2) 70% / 4","3) 80% / 3","4) 85% / 2"] },
        { tipo:"wl", label:"B) WEIGHTLIFTING: En una ventana de 10' — Buscar RM de complex:",
          items:["Clean & Jerk  ← Registrar en planilla"] },
        { tipo:"metcon", label:"C) METCON: 10 Rounds for time  (Intensidad: 85%)", cap:"17'",
          items:["5 C2b","10 Push ups","15 Air squats","1 CyJ  (80/50kg  o  70%)"] },
      ]},
    ],
  },

  "CF_PRINC_B": {
    nombre:       "CF Principiante B",
    disciplinaId: "crossfit",
    nivel:        "principiante",
    dias: [
      { diaSemana:"martes", bloques:[
        { tipo:"structure", label:"STRUCTURE-SUP: 3 Sets",
          items:["10 Ring rows","10 DB remo acostado","12 Vuelos laterales"] },
        { tipo:"wl", label:"WEIGHTLIFTING: Clean  —  Emom 10'",
          items:["1-2) 50% / 2  x2","3) 60% / 2","4) Rest","5-6) 70% / 1+1","7) Rest","8-9-10) 75% / 1+1  x3"] },
        { tipo:"metcon", label:"METCON: AMRAP 15'  (Intensidad: 85%)",
          items:["10 KB swings  (16kg)","8 Box jumps","12 Sit ups","6 Pull ups"] },
      ]},
    ],
  },

  "MUSC_SPLIT": {
    nombre:       "Musculación Split",
    disciplinaId: "musculacion",
    nivel:        "intermedio",
    dias: [
      { diaSemana:"lunes", label:"LUNES — Empuje", bloques:[
        { tipo:"strength", label:"A) STRENGTH: Press banca (% 1RM)  —  5 Sets  |  Cada 2'",
          items:["1) 60% / 5","2) 70% / 4","3) 80% / 3","4) 85% / 2","5) 90% / 1"] },
        { tipo:"structure", label:"B) STRUCTURE-SUP: 3 Sets  (Rest 90'')",
          items:["10 Press inclinado DB (Moderado)","12 Vuelos laterales","10 Fondos en paralelas (Lastrado)"] },
      ]},
      { diaSemana:"martes", label:"MARTES — Tirón", bloques:[
        { tipo:"strength", label:"A) STRENGTH: Peso muerto (% 1RM)  —  4 Sets",
          items:["1) 60% / 5","2) 70% / 4","3) 80% / 3","4) 85% / 2"] },
        { tipo:"structure", label:"B) STRUCTURE-SUP: 3 Sets",
          items:["10 Remo con barra (Pesado)","8 Dominadas","12 Curl bíceps DB"] },
      ]},
      { diaSemana:"jueves", label:"JUEVES — Pierna", bloques:[
        { tipo:"strength", label:"A) STRENGTH: Sentadilla trasera (% 1RM)  —  5 Sets",
          items:["1) 60% / 5","2) 70% / 4","3) 80% / 3","4) 85% / 2","5) 90% / 1"] },
        { tipo:"structure", label:"B) STRUCTURE-INF: 3 Sets  (Rest 2')",
          items:["10 Hip thrust (Pesado)","12 Bulgarian squats c/lado","10 Extensión de cuádriceps"] },
        { tipo:"core", label:"C) CORE: 3 Sets",
          items:["15 Ab wheel","20 Elevaciones de piernas","30'' Plancha lateral c/lado"] },
      ]},
    ],
  },

};

/* ════════════════════════════════════════════════════════════
   FUNCIONES ADAPTADORAS
   ────────────────────────────────────────────────────────────
   Devuelven datos en el formato que espera la UI actual.
   Cuando haya un backend, sólo se reemplaza el interior de
   estas funciones (las firmas no cambian).
   ════════════════════════════════════════════════════════════ */

/**
 * Busca un alumno por PIN. Devuelve el objeto en formato UI o null.
 * @param {string} pin
 * @returns {{ pin, nombre, edad, disciplina, objetivo, dias, rutina, estado }|null}
 */
function getAlumnoDemo(pin) {
  const a = ALUMNOS.find(a => a.id.toUpperCase() === pin.toUpperCase());
  if (!a) return null;

  /* Aplicar overrides guardados por el docente o el alumno (disciplinas / dias / objetivo) */
  const ov          = _getDemoOverride(a.id);
  const disciplinas = (ov && ov.disciplinas) ? ov.disciplinas : (a.disciplinas || []);
  const dias        = (ov && ov.dias !== undefined) ? ov.dias : a.diasPorSemana;
  const objetivo    = (ov && ov.objetivo)    ? ov.objetivo    : a.objetivo;

  const disciplinaNombre = disciplinas
    .map(id => { const d = DISCIPLINAS.find(d => d.id === id); return d ? d.nombre : id; })
    .join(' / ');

  /* Leer roles desde localStorage (seteado por actualizarRolesLocal) */
  let roles = a.roles || null;
  try {
    const lsVal = localStorage.getItem('bp_roles_' + a.id.toUpperCase());
    if (lsVal) roles = JSON.parse(lsVal);
  } catch(e) { /* ignore */ }
  if (!roles) roles = [a.rol || 'alumno'];

  return {
    pin:         a.id,
    nombre:      a.nombre,
    edad:        a.edad,
    rol:         roles[0],
    roles,
    disciplinas,
    disciplina:  disciplinaNombre,
    objetivo,
    dias,
    rutina:      a.rutinaId ? (RUTINAS[a.rutinaId]?.nombre || a.rutinaId) : '',
    estado:      a.estado === "activo" ? "Activo" : "Inactivo",
  };
}

/**
 * Devuelve todos los alumnos (rol=alumno) con sus RMs,
 * en el formato que necesita el panel docente.
 * @returns {Array<{ alumno, rms }>}
 */
function getTodosAlumnosDemo() {
  return ALUMNOS
    .filter(a => a.rol === 'alumno')
    .map(a => ({
      alumno: getAlumnoDemo(a.id),
      rms:    getRMsDemo(a.id),
    }));
}

/**
 * Devuelve los RMs de un alumno en el formato que usan
 * renderStats / renderRMTable / renderSparks.
 * @param {string} pin
 * @returns {Array<{ ejercicio, cat, meses, mejor, prog }>}
 */
function getRMsDemo(pin) {
  const historial = RM_HISTORIAL[pin.toUpperCase()] || [];
  return historial.map(h => {
    const ej = EJERCICIOS.find(e => e.id === h.ejercicioId);
    return {
      ejercicio: ej ? ej.nombre : h.ejercicioId,
      cat:       h.categoria,
      meses:     h.meses,
      mejor:     h.mejor,
      prog:      h.progresoPct,
    };
  });
}

/**
 * Devuelve las rutinas de un alumno en el formato que usa renderDayCard.
 * @param {string} pin
 * @returns {Array<{ dia, secs }>}
 */
function getRutinasDemo(pin) {
  const alumno = ALUMNOS.find(a => a.id.toUpperCase() === pin.toUpperCase());
  if (!alumno) return [];

  const rutina = RUTINAS[alumno.rutinaId];
  if (!rutina) return [];

  const DIAS_LABEL = {
    lunes:"LUNES", martes:"MARTES", miercoles:"MIÉRCOLES",
    jueves:"JUEVES", viernes:"VIERNES", sabado:"SÁBADO", domingo:"DOMINGO",
  };

  return rutina.dias.map(d => ({
    dia:          d.label || DIAS_LABEL[d.diaSemana] || d.diaSemana.toUpperCase(),
    _disciplinaId: rutina.disciplinaId || '',
    secs: d.bloques.map(b => ({
      tipo:  b.tipo,
      label: b.label,
      items: b.items || [],
      cap:   b.cap || null,
    })),
  }));
}

/* ── Registro de nuevos alumnos ───────────────────────────────
   Persistencia: localStorage → 'bp_nuevos_usuarios' → { [PIN]: { ... } }
   El docente aprueba la cuenta para activarla ('pendiente' → 'activo').
   ─────────────────────────────────────────────────────────── */
const NUEVOS_USUARIOS_KEY = 'bp_nuevos_usuarios';

/**
 * Retorna true si el PIN ya está en uso:
 *   - en los alumnos demo (ALUMNOS)
 *   - en bp_nuevos_usuarios (cualquier estado)
 */
function pinEnUso(pin) {
  const upper = pin.toUpperCase();
  if (ALUMNOS.some(a => a.id.toUpperCase() === upper)) return true;
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  return !!data[upper];
}

/**
 * Guarda un nuevo alumno con estado 'pendiente'.
 * Pre-condición: el PIN ya fue validado con pinEnUso().
 */
function registrarAlumnoLocal({ pin, nombre, email, fechaNacimiento, objetivo }) {
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  data[pin.toUpperCase()] = {
    pin:             pin.toUpperCase(),
    nombre,
    email,
    fechaNacimiento,
    objetivo:        objetivo || '',
    estado:          'pendiente',
    fechaRegistro:   new Date().toISOString().slice(0, 10),
  };
  localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
}

/** Retorna true si el PIN existe en bp_nuevos_usuarios con estado 'pendiente' */
function checkAlumnoPendiente(pin) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  const entry = data[pin.toUpperCase()];
  return !!(entry && entry.estado === 'pendiente');
}

/**
 * Retorna un usuario aprobado de bp_nuevos_usuarios como objeto alumno,
 * o null si no existe o no está activo.
 */
function getAlumnoLocal(pin) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  const upper = pin.toUpperCase();
  const u     = data[upper];
  if (!u || u.estado !== 'activo') return null;

  const disciplinaNombre = (u.disciplinas || [])
    .map(id => { const d = DISCIPLINAS.find(d => d.id === id); return d ? d.nombre : id; })
    .join(' / ') || '—';

  /* Leer roles desde localStorage (seteado por actualizarRolesLocal) */
  let roles = Array.isArray(u.roles) && u.roles.length ? u.roles : null;
  try {
    const lsVal = localStorage.getItem('bp_roles_' + upper);
    if (lsVal) roles = JSON.parse(lsVal);
  } catch(e) { /* ignore */ }
  if (!roles) roles = [u.rol || 'alumno'];

  return {
    pin:        u.pin,
    nombre:     u.nombre,
    edad:       u.fechaNacimiento || '—',
    rol:        roles[0],
    roles,
    disciplinas: u.disciplinas || [],
    disciplina: disciplinaNombre,
    objetivo:   u.objetivo || '—',
    dias:       u.dias !== undefined ? u.dias : 0,
    rutina:     '',
    estado:     'Activo',
  };
}

/** Aprueba un usuario pendiente asignándole el rol indicado */
function aprobarUsuarioLocal(pin, nuevoRol) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  const upper = pin.toUpperCase();
  if (!data[upper]) return;
  data[upper].estado     = 'activo';
  data[upper].rol        = nuevoRol;
  /* Valores de perfil deportivo que el docente asignará después */
  if (!data[upper].disciplinas) data[upper].disciplinas = [];
  if (data[upper].dias === undefined) data[upper].dias  = 3;
  localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
}

/** Elimina un registro pendiente (rechazo) */
function rechazarUsuarioLocal(pin) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  delete data[pin.toUpperCase()];
  localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
}

/** Cambia el rol de un usuario ya activo en bp_nuevos_usuarios */
function cambiarRolLocal(pin, nuevoRol) {
  const data  = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  const upper = pin.toUpperCase();
  if (!data[upper] || data[upper].estado !== 'activo') return;
  data[upper].rol = nuevoRol;
  localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
}

/**
 * Actualiza las disciplinas y días/semana de un alumno local.
 * Para alumnos demo (hardcodeados) los cambios se persisten también en
 * localStorage con la misma clave bp_nuevos_usuarios, insertando una
 * entrada "espejo" si no existe ya.
 * @param {string}   pin
 * @param {string[]} disciplinas  array de disciplina ids
 * @param {number}   dias
 */
function actualizarPerfilAlumnoLocal(pin, disciplinas, dias, objetivo) {
  const upper = pin.toUpperCase();

  /* Usuario en bp_nuevos_usuarios */
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  if (data[upper]) {
    data[upper].disciplinas = disciplinas;
    data[upper].dias        = dias;
    if (objetivo !== undefined) data[upper].objetivo = objetivo;
    localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
    return;
  }

  /* Usuario demo hardcodeado — guardar overrides en localStorage */
  const DEMO_OVERRIDES_KEY = 'bp_demo_overrides';
  const overrides = JSON.parse(localStorage.getItem(DEMO_OVERRIDES_KEY) || '{}');
  if (!overrides[upper]) overrides[upper] = {};
  overrides[upper].disciplinas = disciplinas;
  overrides[upper].dias        = dias;
  if (objetivo !== undefined) overrides[upper].objetivo = objetivo;
  localStorage.setItem(DEMO_OVERRIDES_KEY, JSON.stringify(overrides));
}

/** @returns {{ disciplinas, dias } | null} override persisted for a demo alumno */
function _getDemoOverride(pin) {
  const overrides = JSON.parse(localStorage.getItem('bp_demo_overrides') || '{}');
  return overrides[pin.toUpperCase()] || null;
}

/** Devuelve todos los registros de bp_nuevos_usuarios como array */
function getUsuariosLocales() {
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  return Object.values(data);
}

/** Persiste roles en localStorage (demo mode — no hay Supabase) */
function actualizarRolesLocal(pin, rolesArr) {
  const upper = pin.toUpperCase();
  localStorage.setItem('bp_roles_' + upper, JSON.stringify(rolesArr));
  /* También actualizar en bp_nuevos_usuarios si el usuario está ahí */
  const data = JSON.parse(localStorage.getItem(NUEVOS_USUARIOS_KEY) || '{}');
  if (data[upper]) {
    data[upper].roles = rolesArr;
    data[upper].rol   = rolesArr[0];
    localStorage.setItem(NUEVOS_USUARIOS_KEY, JSON.stringify(data));
  }
}
