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
function asignarRutina(alumnoPin, rutinaId, fechaInicio) {
  const data    = _readAsignaciones();
  const pin     = alumnoPin.toUpperCase();
  const hoy     = new Date().toISOString().slice(0, 10);
  const entrada = {
    rutinaId,
    fecha_asignacion: fechaInicio || hoy,
    vista_por_alumno: false,
  };
  data[pin] = [entrada, ...(data[pin] || [])];
  localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(data));
}

/** Retorna TODAS las asignaciones activas como [{ rutinaId, fecha_asignacion, ... }] */
function getTodasRutinasAsignadas(alumnoPin) {
  const historial = _readAsignaciones()[alumnoPin.toUpperCase()] || [];
  const activas   = [];
  const seenIds   = new Set();
  for (const h of historial) {
    if (h.rutinaId === null || h.rutinaId === undefined) break; // null = señal histórica de "quitar todo"
    if (h._quitada) continue;
    if (!seenIds.has(h.rutinaId)) {
      activas.push(h);
      seenIds.add(h.rutinaId);
    }
  }
  return activas;
}

/** Retorna el rutinaId más reciente activo, o null — backward compat */
function getCurrentAsignacion(alumnoPin) {
  const activas = getTodasRutinasAsignadas(alumnoPin);
  return activas.length ? activas[0].rutinaId : null;
}

/** Alias para compatibilidad */
function getRutinaAsignada(alumnoPin) {
  return getCurrentAsignacion(alumnoPin);
}

/** Quita una rutina específica de las asignaciones activas */
function quitarRutina(alumnoPin, rutinaId) {
  const data = _readAsignaciones();
  const pin  = alumnoPin.toUpperCase();
  if (!data[pin]) return;
  data[pin] = data[pin].map(h =>
    h.rutinaId === rutinaId ? Object.assign({}, h, { _quitada: true }) : h
  );
  localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(data));
}

/** Retorna true si esta rutina está actualmente asignada */
function checkRutinaAsignada(alumnoPin, rutinaId) {
  return getTodasRutinasAsignadas(alumnoPin).some(h => h.rutinaId === rutinaId);
}

/** Marca todas las asignaciones activas como vistas por el alumno */
function marcarRutinaVista(alumnoPin) {
  const data = _readAsignaciones();
  const pin  = alumnoPin.toUpperCase();
  if (!data[pin]) return;
  let changed = false;
  data[pin].forEach(h => {
    if (!h._quitada && h.rutinaId !== null && !h.vista_por_alumno) {
      h.vista_por_alumno = true;
      changed = true;
    }
  });
  if (changed) localStorage.setItem(ASIGNACIONES_KEY, JSON.stringify(data));
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

/* ── _diasDeRutina ───────────────────────────────────────────
   Convierte una rutina (custom o demo) al array [{ dia, secs[] }].
   ─────────────────────────────────────────────────────────── */
function _diasDeRutina(rutina) {
  if (!rutina) return [];
  if (rutina._custom) {
    return (rutina.dias || []).map(d => {
      const secs = d.bloques
        ? d.bloques.map(b => ({
            tipo:  b.tipo  || 'metcon',
            label: b.label || '',
            items: b.contenido ? b.contenido.split('\n').filter(i => i.trim()) : [],
            cap:   null,
          }))
        : d.contenido
          ? [{ tipo: 'structure', label: d.label || 'Contenido',
               items: d.contenido.split('\n').filter(l => l.trim()), cap: null }]
          : [];
      return { dia: d.label || 'DÍA', secs };
    }).filter(d => d.secs.length);
  }
  return _formatRutinaDemo(rutina);
}

/* ── getRutinasFinal ─────────────────────────────────────────
   Devuelve TODAS las rutinas activas asignadas al alumno,
   cada día etiquetado con _rutinaId y _rutinaNombre para que
   renderRutinas pueda agruparlas en secciones separadas.
   Fallback: rutina demo del alumno si no hay asignaciones.
   ─────────────────────────────────────────────────────────── */
function getRutinasFinal(pin) {
  const activas    = getTodasRutinasAsignadas(pin);
  if (!activas.length) return getRutinasDemo(pin);

  const allRutinas = getAllRutinas();
  const dias       = [];

  activas.forEach(asig => {
    const rutina = allRutinas[asig.rutinaId];
    if (!rutina) return;  // asignación huérfana
    _diasDeRutina(rutina).forEach(d => {
      dias.push(Object.assign({}, d, {
        _rutinaId:     asig.rutinaId,
        _rutinaNombre: rutina.nombre || 'Rutina',
        _fechaInicio:  asig.fecha_asignacion || null,
        _disciplinaId: rutina.disciplinaId || '',
      }));
    });
  });

  return dias.length ? dias : getRutinasDemo(pin);
}
