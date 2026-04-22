/* ════════════════════════════════════════════════════════════
   BOX PLANNER — GENERADOR DE RUTINAS
   ────────────────────────────────────────────────────────────
   Input:  perfil del alumno + configuración
   Output: rutina estructurada lista para guardar

   Flujo:
   1. Filtrar ejercicios por disciplina + restricciones de lesión
   2. Construir distribución de días según objetivo + frecuencia
   3. Asignar ejercicios por patrón de movimiento + balance muscular
   4. Calcular volumen, series y progresión
   ════════════════════════════════════════════════════════════ */

/* ── Reglas de volumen por objetivo ──────────────────────── */
const VOLUMEN_RULES = {
  hipertrofia: { series: [3, 4], repsMin: 8,  repsMax: 12, descanso: 90  },
  fuerza:      { series: [4, 5], repsMin: 3,  repsMax: 6,  descanso: 180 },
  cardio:      { series: [2, 3], repsMin: 12, repsMax: 20, descanso: 45  },
  resistencia: { series: [3, 4], repsMin: 15, repsMax: 20, descanso: 60  },
};

/* ── Distribuciones por frecuencia semanal ───────────────── */
const DIVISIONES = {
  musculacion: {
    3: ['push',        'pull',        'legs'              ],
    4: ['upper_push',  'lower',       'upper_pull', 'legs'],
    5: ['chest_tri',   'back_bi',     'legs', 'shoulders', 'fullbody'],
    6: ['push',        'pull',        'legs', 'push',      'pull', 'legs'],
  },
  crossfit: {
    3: ['strength',  'metcon',    'skill'   ],
    4: ['strength',  'metcon',    'skill',   'conditioning'],
    5: ['strength',  'metcon',    'skill',   'conditioning', 'recovery'],
  },
  oly: {
    3: ['snatch',    'clean_jerk', 'strength'],
    4: ['snatch',    'clean_jerk', 'strength', 'technique'],
    5: ['snatch',    'clean_jerk', 'strength', 'technique', 'accessory'],
  },
  funcional: {
    3: ['upper',     'lower',      'fullbody'],
    4: ['upper',     'lower',      'core',   'fullbody'],
  },
};

/* ── Patrones de movimiento por bloque ───────────────────── */
const PATRONES_BLOQUE = {
  push:        ['empuje_horizontal', 'empuje_vertical', 'triceps'],
  pull:        ['jale_horizontal',   'jale_vertical',   'biceps'],
  legs:        ['sentadilla', 'empuje_piernas', 'bisagra', 'gemelos'],
  upper_push:  ['empuje_horizontal', 'empuje_vertical'],
  upper_pull:  ['jale_horizontal',   'jale_vertical'],
  lower:       ['sentadilla', 'bisagra', 'gemelos'],
  chest_tri:   ['empuje_horizontal', 'triceps'],
  back_bi:     ['jale_horizontal',   'jale_vertical', 'biceps'],
  shoulders:   ['empuje_vertical',   'deltoides'],
  fullbody:    ['sentadilla', 'empuje_horizontal', 'jale_horizontal', 'bisagra'],
  strength:    ['sentadilla', 'empuje', 'jale'],
  metcon:      ['cardio', 'funcional'],
  skill:       ['olimpico', 'skill'],
  conditioning:['cardio'],
  recovery:    ['movilidad'],
  snatch:      ['olimpico'],
  clean_jerk:  ['olimpico'],
  technique:   ['olimpico'],
  accessory:   ['fuerza'],
  upper:       ['empuje_horizontal', 'jale_horizontal', 'empuje_vertical'],
  core:        ['core', 'abdomen'],
};

/* ── Ejercicios por bloque (máximo) ──────────────────────── */
const EJERCICIOS_POR_BLOQUE = {
  3: 5,   // 3 días/sem → 5-6 ejercicios/día
  4: 5,
  5: 4,   // más frecuencia → menos por día
  6: 4,
};

/* ═══════════════════════════════════════════════════════════
   generarRutina — función principal
   ═══════════════════════════════════════════════════════════ */
/**
 * @param {object} config
 * @param {string}   config.disciplina       - musculacion | crossfit | oly | funcional
 * @param {string}   config.sexo             - hombre | mujer
 * @param {string}   config.objetivo         - hipertrofia | fuerza | cardio | resistencia
 * @param {string}   config.nivel            - principiante | intermedio | avanzado
 * @param {number}   config.frecuencia       - 3 | 4 | 5 | 6
 * @param {string[]} config.restricciones    - zonas a evitar (de lesiones)
 * @param {string}   config.alumnoPin        - para ID de rutina
 * @returns {object} rutina en formato bp_rutinas
 */
function generarRutina({ disciplina, sexo, objetivo, nivel, frecuencia, restricciones = [], alumnoPin }) {
  /* 1. Obtener ejercicios disponibles filtrados */
  const ejerciciosDisp = _filtrarEjercicios(disciplina, restricciones, nivel);

  if (ejerciciosDisp.length < 5) {
    throw new Error(`No hay suficientes ejercicios de ${disciplina} en la base de datos. ` +
                    `Agregá ejercicios desde el panel docente.`);
  }

  /* 2. Obtener distribución de días */
  const disc = DIVISIONES[disciplina] || DIVISIONES.musculacion;
  const freq = Math.min(Math.max(frecuencia, 3), 6);
  const bloques = disc[freq] || disc[3];

  /* 3. Construir días */
  const volRules = VOLUMEN_RULES[objetivo] || VOLUMEN_RULES.hipertrofia;
  const maxEjByDay = EJERCICIOS_POR_BLOQUE[freq] || 5;

  const dias = bloques.map((bloque, idx) => {
    const patrones    = PATRONES_BLOQUE[bloque] || [];
    const seleccionados = _seleccionarEjercicios(ejerciciosDisp, patrones, maxEjByDay, restricciones);

    const ejercicios = seleccionados.map((ej, orden) => ({
      ejercicioId: ej.id,
      nombre:      ej.nombre,
      series:      _pick(volRules.series),
      reps:        _buildReps(volRules, ej.tipo, nivel),
      descanso:    volRules.descanso,
      notas:       '',
      orden,
    }));

    return {
      dia:    idx + 1,
      titulo: _tituloBloque(bloque, disciplina),
      bloque,
      ejercicios,
    };
  });

  /* 4. Armar objeto rutina */
  const id     = `gen_${alumnoPin || 'doc'}_${Date.now().toString(36)}`;
  const nombre = `${_capitalize(disciplina)} — ${_capitalize(objetivo)} ${frecuencia}x/sem`;

  return {
    id,
    nombre,
    disciplinaId:  disciplina,
    nivel,
    objetivo,
    frecuencia,
    generada:      true,
    fecha_generada: new Date().toISOString().slice(0, 10),
    dias,
    _custom: true,
  };
}

/* ── Helpers internos ────────────────────────────────────── */

function _filtrarEjercicios(disciplina, restricciones, nivel) {
  const niveles = { principiante: 1, intermedio: 2, avanzado: 3 };
  const maxNivel = niveles[nivel] || 2;

  return Object.values(_ejerciciosCache || {}).filter(e => {
    if (!e.activo) return false;
    if (e.disciplina !== disciplina) return false;

    /* Excluir si está contraindicado para alguna restricción del alumno */
    if (restricciones.length && e.contraindicado_en) {
      const choque = e.contraindicado_en.some(z => restricciones.includes(z));
      if (choque) return false;
    }

    /* Excluir si el nivel del ejercicio supera el del alumno */
    const ejNivel = niveles[e.nivel] || 1;
    if (ejNivel > maxNivel) return false;

    return true;
  });
}

function _seleccionarEjercicios(ejercicios, patrones, max, restricciones) {
  const resultado = [];
  const usados    = new Set();
  const musculos  = new Set();

  /* Primera pasada: coincidir patrones del bloque */
  for (const patron of patrones) {
    const matches = ejercicios.filter(e =>
      e.patron_movimiento === patron && !usados.has(e.id)
    );
    if (matches.length) {
      const ej = matches[Math.floor(Math.random() * matches.length)];
      resultado.push(ej);
      usados.add(ej.id);
      if (ej.musculo_principal) musculos.add(ej.musculo_principal);
    }
    if (resultado.length >= max) break;
  }

  /* Segunda pasada: completar sin repetir músculo principal */
  if (resultado.length < max) {
    const restantes = ejercicios.filter(e =>
      !usados.has(e.id) && !musculos.has(e.musculo_principal)
    );
    const faltantes = max - resultado.length;
    const extra     = _shuffle(restantes).slice(0, faltantes);
    resultado.push(...extra);
  }

  return resultado;
}

function _buildReps(rules, tipo, nivel) {
  const { repsMin, repsMax } = rules;
  if (tipo === 'cardio') return '45seg';
  if (tipo === 'movilidad') return '30seg';

  const reps = nivel === 'principiante' ? repsMax : repsMin;
  return String(reps);
}

function _tituloBloque(bloque, disciplina) {
  const titulos = {
    push:        'Empuje',
    pull:        'Jale',
    legs:        'Piernas',
    upper_push:  'Tren Superior — Empuje',
    upper_pull:  'Tren Superior — Jale',
    lower:       'Tren Inferior',
    chest_tri:   'Pecho y Tríceps',
    back_bi:     'Espalda y Bíceps',
    shoulders:   'Hombros',
    fullbody:    'Full Body',
    strength:    'Fuerza',
    metcon:      'MetCon',
    skill:       'Habilidades',
    conditioning:'Acondicionamiento',
    recovery:    'Recuperación activa',
    snatch:      'Arranque',
    clean_jerk:  'Envión',
    technique:   'Técnica',
    accessory:   'Accesorios',
    upper:       'Tren Superior',
    core:        'Core',
  };
  return titulos[bloque] || bloque;
}

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _shuffle(arr) { return arr.slice().sort(() => Math.random() - 0.5); }
function _capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
