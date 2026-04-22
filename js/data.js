/* ════════════════════════════════════════════════════════════
   BOX PLANNER — CAPA DE DATOS
   ────────────────────────────────────────────────────────────
   Responsabilidades:
     - Configuración de la fuente de datos (Google Sheet)
     - Parsing de CSV
     - Fetch de hojas
     - Detección de modo demo vs sheet real
     - Utilidades de fecha
   ════════════════════════════════════════════════════════════ */

/* ── Configuración ───────────────────────────────────────────
   1. Publicá tu Google Sheet:
      Archivo → Compartir → Publicar en la web → CSV → Publicar

   2. Pegá el ID de tu sheet en SHEET_ID.
      El ID está en la URL: spreadsheets/d/ <<ID>> /edit
   ─────────────────────────────────────────────────────────── */
const CONFIG = {
  SHEET_ID: "<<ID_DE_TU_GOOGLE_SHEET>>",

  /* ── Supabase (reemplaza localStorage en producción) ─────
     1. Copiá la URL y la anon key desde Supabase → Settings → API
     2. Pegalas aquí y el modo Supabase se activa automáticamente
     ──────────────────────────────────────────────────────── */
  SUPABASE_URL:      "https://lxzdsrqehwchycwicvwr.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4emRzcnFlaHdjaHljd2ljdndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDU2MTcsImV4cCI6MjA5MDM4MTYxN30.6mHmwezGchXTnUa2q9T6qbRgW18yGdt1TRdgR5Fg8lc",

  /* Nombres EXACTOS de las hojas en Google Sheets */
  HOJA_ALUMNOS: "👥 Alumnos",
  HOJA_RMS:     "📊 RMs Maestro",
  HOJA_RUTINAS: "📅 Rutinas Anuales",

  /* Columnas de la hoja ALUMNOS (índice desde 0, A=0, B=1 …) */
  COL_ALU: {
    ID:         0,   // A — PIN del alumno
    NOMBRE:     1,   // B
    EDAD:       2,   // C
    DISCIPLINA: 10,  // K
    OBJETIVO:   7,   // H
    DIAS:       11,  // L
    RUTINA:     12,  // M
    ESTADO:     5,   // F
  },

  /* Columnas de la hoja RMs */
  COL_RM: {
    ALUMNO:    0,   // A
    EJERCICIO: 1,   // B
    CATEGORIA: 2,   // C
    MES_1:     3,   // D (Enero) … hasta columna 14 (Diciembre)
    MEJOR:     15,  // P
    PROGRESO:  16,  // Q
  },

  /* Columnas de la hoja Rutinas Anuales */
  COL_RUT: {
    SEMANA:     0,  // A
    FECHAS:     1,  // B
    DIA:        2,  // C
    BLOQUE:     3,  // D
    DISCIPLINA: 4,  // E
    OBJETIVO:   5,  // F
    CONTENIDO:  6,  // G
    CARGA:      7,  // H
    COMPLETADA: 11, // L
  },
};

/* ── Detección de modo ───────────────────────────────────────
   Si el SHEET_ID no fue configurado → modo demo con datos locales.
   ─────────────────────────────────────────────────────────── */
function isDemoMode() {
  return CONFIG.SHEET_ID === "<<ID_DE_TU_GOOGLE_SHEET>>"
      && CONFIG.SUPABASE_URL === "<<TU_SUPABASE_URL>>";
}

function isSupabaseMode() {
  return CONFIG.SUPABASE_URL !== "<<TU_SUPABASE_URL>>";
}

/* ── Utilidades CSV ──────────────────────────────────────────*/
function sheetURL(hoja) {
  return `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(hoja)}`;
}

function parseCSV(text) {
  const rows = [];
  const re = /("(?:[^"]|"")*"|[^,\n\r]*)/g;
  let row = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    let val = match[1];
    if (val.startsWith('"')) val = val.slice(1, -1).replace(/""/g, '"');
    row.push(val.trim());
    const next = text[re.lastIndex];
    if (next === '\n' || next === '\r' || next === undefined) {
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      if (next === '\r' && text[re.lastIndex + 1] === '\n') re.lastIndex++;
    }
  }
  return rows;
}

async function fetchSheet(hoja) {
  const res = await fetch(sheetURL(hoja));
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return parseCSV(await res.text());
}

/* ── Utilidad de fecha ───────────────────────────────────────*/
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
