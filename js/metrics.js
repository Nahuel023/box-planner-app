/* ════════════════════════════════════════════════════════════
   BOX PLANNER — CAPA DE ESCRITURA DE MÉTRICAS
   ────────────────────────────────────────────────────────────
   Responsabilidades:
     - Guardar métricas registradas por el alumno
     - Leer métricas del alumno actual
     - Mergear métricas en state.rms (para que render.js las muestre)

   Modo demo / offline → localStorage
   Modo real (Supabase) → reemplazar solo las 3 funciones públicas;
     las firmas y el contrato no cambian.

   ── ESTRUCTURA DE UNA MÉTRICA ────────────────────────────────

   {
     id:          string,   // timestamp único: "MAR001_snatch_1711619200000"
     alumnoId:    string,   // "MAR001"
     ejercicioId: string,   // "snatch"  (ref a EJERCICIOS en db.demo.js)
     valor:       number,   // 80
     tipo:        string,   // "peso_kg" | "tiempo_seg" | "repeticiones"
     fecha:       string,   // "2026-03-28"  (ISO, solo fecha)
     notas:       string,   // opcional
   }

   ── RELACIÓN CON RM_HISTORIAL ────────────────────────────────

   RM_HISTORIAL (db.demo.js / Google Sheet) contiene el historial
   oficial importado desde el exterior.

   Las métricas nuevas se guardan aquí (localStorage / Supabase) y
   se MERGEAN en state.rms por updateRMHistorial():

     - Si ya hay un valor para ese ejercicio + mes → se toma el MAX
     - Si no hay entrada → se crea una nueva fila en state.rms

   De esta forma render.js sigue funcionando sin cambios.
   ════════════════════════════════════════════════════════════ */

const METRICS_KEY_PREFIX = 'bp_metrics_';  // + alumnoId

/* ── Helpers internos ────────────────────────────────────────*/

function metricsKey(alumnoId) {
  return METRICS_KEY_PREFIX + alumnoId.toUpperCase();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);  // "2026-03-28"
}

/* ════════════════════════════════════════════════════════════
   saveMetric
   ────────────────────────────────────────────────────────────
   Guarda UNA métrica del alumno.

   Parámetros:
     alumnoId    — "MAR001"
     ejercicioId — "snatch"
     valor       — número (kg, segundos o reps)
     tipo        — "peso_kg" | "tiempo_seg" | "repeticiones"
     fecha       — string ISO "YYYY-MM-DD" (default: hoy)
     notas       — string libre (default: "")

   Retorna el objeto métrica guardado.

   ── Reemplazar para Supabase ──────────────────────────────

   async function saveMetric(alumnoId, ejercicioId, valor, tipo,
                              fecha = todayISO(), notas = '') {
     const { data, error } = await supabase
       .from('metrics')
       .insert({ alumno_id: alumnoId, ejercicio_id: ejercicioId,
                 valor, tipo, fecha, notas });
     if (error) throw error;
     return data[0];
   }
   ════════════════════════════════════════════════════════════ */
function saveMetric(alumnoId, ejercicioId, valor, tipo,
                    fecha = todayISO(), notas = '', estado = '') {

  const metrica = {
    id:          `${alumnoId}_${ejercicioId}_${Date.now()}`,
    alumnoId:    alumnoId.toUpperCase(),
    ejercicioId,
    valor:       Number(valor),
    tipo,
    fecha,
    notas,
    estado,
  };

  const key      = metricsKey(alumnoId);
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push(metrica);
  localStorage.setItem(key, JSON.stringify(existing));

  return metrica;
}

/* ════════════════════════════════════════════════════════════
   getMetricsByAlumno
   ────────────────────────────────────────────────────────────
   Retorna todas las métricas guardadas para un alumno,
   ordenadas por fecha ascendente.

   ── Reemplazar para Supabase ──────────────────────────────

   async function getMetricsByAlumno(alumnoId) {
     const { data, error } = await supabase
       .from('metrics')
       .select('*')
       .eq('alumno_id', alumnoId)
       .order('fecha', { ascending: true });
     if (error) throw error;
     return data;
   }
   ════════════════════════════════════════════════════════════ */
function getMetricsByAlumno(alumnoId) {
  const raw = localStorage.getItem(metricsKey(alumnoId));
  if (!raw) return [];
  const metricas = JSON.parse(raw);
  return metricas.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* ════════════════════════════════════════════════════════════
   updateRMHistorial
   ────────────────────────────────────────────────────────────
   Toma state.metricas (ya cargado) y lo MERGEA en state.rms.

   Reglas:
     1. Agrupa métricas por (ejercicioId, mes).
     2. Para cada grupo toma el valor MÁXIMO del mes.
     3. Si el ejercicio ya está en state.rms → actualiza meses[].
     4. Si no está → agrega una nueva entrada a state.rms.
     5. Recalcula `mejor` y `prog` de cada ejercicio afectado.

   Esta función es el ÚNICO puente entre la capa de escritura
   y render.js — render.js no necesita saber nada de métricas.
   ════════════════════════════════════════════════════════════ */
function updateRMHistorial() {
  const metricas = state.metricas;
  if (!metricas.length) return;

  /* Paso 1: agrupar → máximo por (ejercicioId, mes) */
  const porEjercicio = {};  // { snatch: { 0: 80, 1: 83, … } }

  metricas.forEach(m => {
    const mes = new Date(m.fecha + 'T12:00:00').getMonth();  // 0-11
    if (!porEjercicio[m.ejercicioId]) porEjercicio[m.ejercicioId] = {};
    const actual = porEjercicio[m.ejercicioId][mes];
    if (actual === undefined || m.valor > actual) {
      porEjercicio[m.ejercicioId][mes] = m.valor;
    }
  });

  /* Paso 2: mergear en state.rms */
  Object.entries(porEjercicio).forEach(([ejId, mesesMap]) => {
    /* Buscar definición del ejercicio en el catálogo */
    const ejDef    = (typeof EJERCICIOS !== 'undefined')
      ? EJERCICIOS.find(e => e.id === ejId)
      : null;
    const ejNombre = ejDef ? ejDef.nombre : ejId;

    /* Buscar o crear entrada en state.rms */
    let rmEntry = state.rms.find(r =>
      r._ejercicioId === ejId || r.ejercicio === ejNombre
    );

    if (!rmEntry) {
      rmEntry = {
        _ejercicioId: ejId,
        ejercicio:    ejNombre,
        cat:          ejDef ? ejDef.categoria : '',
        meses:        Array(12).fill(null),
        mejor:        null,
        prog:         null,
      };
      state.rms.push(rmEntry);
    }

    /* Mergear: tomar el MAX entre lo que ya había y lo nuevo */
    Object.entries(mesesMap).forEach(([mes, valor]) => {
      const m = parseInt(mes);
      if (rmEntry.meses[m] === null || valor > rmEntry.meses[m]) {
        rmEntry.meses[m] = valor;
      }
    });

    /* Recalcular mejor y progreso % */
    const vals = rmEntry.meses.filter(v => v !== null);
    if (vals.length) {
      rmEntry.mejor = Math.max(...vals);
      const first   = vals[0];
      const last    = vals[vals.length - 1];
      rmEntry.prog  = parseFloat(((last - first) / first * 100).toFixed(1));
    }
  });
}

/* ════════════════════════════════════════════════════════════
   loadMetrics
   ────────────────────────────────────────────────────────────
   Lee las métricas del alumno actual, las guarda en
   state.metricas y llama a updateRMHistorial().

   Llamar desde app.js después de loadData().
   ════════════════════════════════════════════════════════════ */
function loadMetrics(alumnoId) {
  state.metricas = getMetricsByAlumno(alumnoId);
  updateRMHistorial();
}
