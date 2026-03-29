/* ════════════════════════════════════════════════════════════
   BOX PLANNER — GESTIÓN DE RUTINAS PERSONALIZADAS
   ────────────────────────────────────────────────────────────
   Responsabilidades:
     - CRUD de rutinas custom (localStorage)
     - Asignación de rutinas a alumnos
     - getRutinasFinal(pin) → prioriza asignación custom

   Formato de una rutina custom:
   {
     id:          "custom_<timestamp>",
     nombre:      "CF Avanzado Sem 14",
     disciplinaId:"crossfit",
     nivel:       "avanzado",
     _custom:     true,
     dias: [
       { label: "LUNES", contenido: "3x10 Sentadillas\n5x5 Press Banca" }
     ]
   }

   Cuando haya backend, solo cambian los cuerpos de
   saveCustomRutina / getCustomRutinas / asignarRutina /
   getRutinaAsignada — las firmas no cambian.
   ════════════════════════════════════════════════════════════ */

const CUSTOM_RUTINAS_KEY = 'bp_rutinas_custom';
const ASIGNACIONES_KEY   = 'bp_asignaciones';

/* ── CRUD rutinas custom ─────────────────────────────────────*/

function saveCustomRutina(rutina) {
  const data = JSON.parse(localStorage.getItem(CUSTOM_RUTINAS_KEY) || '{}');
  data[rutina.id] = rutina;
  localStorage.setItem(CUSTOM_RUTINAS_KEY, JSON.stringify(data));
}

function getCustomRutinas() {
  return JSON.parse(localStorage.getItem(CUSTOM_RUTINAS_KEY) || '{}');
}

function deleteCustomRutinaById(id) {
  const data = JSON.parse(localStorage.getItem(CUSTOM_RUTINAS_KEY) || '{}');
  delete data[id];
  localStorage.setItem(CUSTOM_RUTINAS_KEY, JSON.stringify(data));
}

/** Fusiona rutinas demo (RUTINAS de db.demo.js) + custom */
function getAllRutinas() {
  return Object.assign({}, RUTINAS, getCustomRutinas());
}

/* ── Asignaciones ────────────────────────────────────────────
   Schema: { PIN: [{ rutinaId, fecha_asignacion, vista_por_alumno }] }
   Índice 0 = asignación más reciente (orden descendente).
   Migraciones on-the-fly:
     · string  → array nuevo formato (con vista_por_alumno: true)
     · { rutinaId, fecha } → { rutinaId, fecha_asignacion, vista_por_alumno: true }
       + reversión del array (antiguo era ascendente)
   ─────────────────────────────────────────────────────────── */

function _readAsignaciones() {
  const raw      = JSON.parse(localStorage.getItem(ASIGNACIONES_KEY) || '{}');
  let migrated   = false;

  Object.keys(raw).forEach(pin => {
    /* Formato muy antiguo: string → array */
    if (typeof raw[pin] === 'string') {
      raw[pin] = [{ rutinaId: raw[pin], fecha_asignacion: '2000-01-01', vista_por_alumno: true }];
      migrated = true;
      return;
    }
    if (!Array.isArray(raw[pin])) return;

    /* Formato anterior: { rutinaId, fecha } → nuevo + inversión del array */
    const needsMigration = raw[pin].some(e => e.fecha !== undefined && e.fecha_asignacion === undefined);
    if (needsMigration) {
      raw[pin] = raw[pin]
        .map(e => ({
          rutinaId:          e.rutinaId,
          fecha_asignacion:  e.fecha_asignacion || e.fecha || '2000-01-01',
          vista_por_alumno:  e.vista_por_alumno !== undefined ? e.vista_por_alumno : true,
        }))
        .reverse();   // antiguo era ascendente; nuevo es descendente ([0] = más reciente)
      migrated = true;
    }
  });

  if (migrated) localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(raw));
  return raw;
}

/** Guarda una asignación (inserta al inicio → [0] siempre es la más reciente) */
function asignarRutina(alumnoPin, rutinaId) {
  const data    = _readAsignaciones();
  const pin     = alumnoPin.toUpperCase();
  const entrada = {
    rutinaId,
    fecha_asignacion: new Date().toISOString().slice(0, 10),
    vista_por_alumno: false,
  };
  data[pin] = [entrada, ...(data[pin] || [])];
  localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(data));
}

/** Retorna el rutinaId vigente ([0]) o null */
function getCurrentAsignacion(alumnoPin) {
  const historial = _readAsignaciones()[alumnoPin.toUpperCase()] || [];
  if (!historial.length) return null;
  return historial[0].rutinaId;
}

/** Alias para compatibilidad (getRutinasFinal, ui.routines.js) */
function getRutinaAsignada(alumnoPin) {
  return getCurrentAsignacion(alumnoPin);
}

/** Retorna true si esta rutina YA fue asignada alguna vez */
function checkRutinaAsignada(alumnoPin, rutinaId) {
  const historial = _readAsignaciones()[alumnoPin.toUpperCase()] || [];
  return historial.some(h => h.rutinaId === rutinaId);
}

/** Marca la asignación vigente ([0]) como vista por el alumno */
function marcarRutinaVista(alumnoPin) {
  const data = _readAsignaciones();
  const pin  = alumnoPin.toUpperCase();
  if (!data[pin] || !data[pin].length) return;
  if (data[pin][0].vista_por_alumno) return;  // ya marcada, evitar write innecesario
  data[pin][0].vista_por_alumno = true;
  localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(data));
}

/** Retorna el historial completo [{ rutinaId, fecha_asignacion, vista_por_alumno }] */
function getHistorialRutinas(alumnoPin) {
  return (_readAsignaciones()[alumnoPin.toUpperCase()] || []).slice();
}

/** @deprecated — usar getHistorialRutinas */
function getHistorialAsignaciones(alumnoPin) {
  return getHistorialRutinas(alumnoPin);
}

/* ── _formatRutinaDemo ───────────────────────────────────────
   Convierte un objeto del formato RUTINAS de db.demo.js al
   formato [{ dia, secs[] }] que espera renderDayCard.
   ─────────────────────────────────────────────────────────── */
function _formatRutinaDemo(rutina) {
  const DIAS_LABEL = {
    lunes: 'LUNES', martes: 'MARTES', miercoles: 'MIÉRCOLES',
    jueves: 'JUEVES', viernes: 'VIERNES', sabado: 'SÁBADO', domingo: 'DOMINGO',
  };
  return (rutina.dias || []).map(d => ({
    dia:  d.label || DIAS_LABEL[d.diaSemana] || (d.diaSemana || '').toUpperCase(),
    secs: (d.bloques || []).map(b => ({
      tipo:  b.tipo,
      label: b.label,
      items: b.items || [],
      cap:   b.cap || null,
    })),
  }));
}

/* ── getRutinasFinal ─────────────────────────────────────────
   Prioridad:
     1. Asignación manual por docente (localStorage)
     2. Rutina default del alumno en db.demo.js / Supabase
   Devuelve el formato [{ dia, secs[] }] para renderDayCard.
   ─────────────────────────────────────────────────────────── */
function getRutinasFinal(pin) {
  const customId = getRutinaAsignada(pin);
  if (!customId) return getRutinasDemo(pin);

  const allRutinas = getAllRutinas();
  const rutina     = allRutinas[customId];
  if (!rutina) return getRutinasDemo(pin);   // asignación huérfana

  /* Rutina custom (creada por docente) */
  if (rutina._custom) {
    return (rutina.dias || []).map(d => {
      /* Compatibilidad: formato antiguo tenía contenido plano en lugar de bloques[] */
      const secs = d.bloques
        ? d.bloques.map(b => ({
            tipo:  b.tipo  || 'metcon',
            label: b.label || '',
            items: b.contenido ? b.contenido.split('\n').filter(i => i.trim()) : [],
            cap:   null,
          }))
        : d.contenido
          ? [{ tipo: 'structure', label: d.label || 'Contenido', items: d.contenido.split('\n').filter(l => l.trim()), cap: null }]
          : [];
      return { dia: d.label || 'DÍA', secs };
    }).filter(d => d.secs.length);
  }

  /* Rutina demo asignada manualmente por docente */
  return _formatRutinaDemo(rutina);
}
