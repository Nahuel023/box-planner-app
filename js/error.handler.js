/* ════════════════════════════════════════════════════════════
   BOX PLANNER — ERROR HANDLER CENTRALIZADO
   ────────────────────────────────────────────────────────────
   API pública:
     handleError(error, context)   → loguea + muestra toast rojo
     validateFields(rules)         → valida form, toast amarillo
     tryCatch(fn, context)         → wrapper async con catch auto
     AppError(msg, type, original) → error tipado
   ════════════════════════════════════════════════════════════ */

const ERR_TYPE = {
  SUPABASE:   'supabase',
  NETWORK:    'network',
  VALIDATION: 'validation',
  GENERATOR:  'generator',
  AUTH:       'auth',
  UNKNOWN:    'unknown',
};

/* Mapa código/fragmento → mensaje amigable */
const _ERR_MAP = {
  /* PostgreSQL / Supabase */
  '23505':    'Ya existe un registro con esos datos.',
  '23503':    'Referencia inválida en los datos.',
  '42501':    'Sin permisos para esta acción.',
  'PGRST116': 'No se encontraron datos.',
  'PGRST301': 'Sesión expirada. Volvé a ingresar.',
  /* Red */
  'Failed to fetch':     'Sin conexión. Verificá tu internet.',
  'NetworkError':        'Sin conexión. Verificá tu internet.',
  'Load failed':         'Sin conexión. Verificá tu internet.',
  /* Generador */
  'Sin ejercicios':      'No hay ejercicios para los parámetros elegidos.',
  'No hay ejercicios':   'No hay ejercicios para los parámetros elegidos.',
};

const _DEFAULT_MSG = 'Ocurrió un error inesperado. Intentá de nuevo.';

/* ── AppError ────────────────────────────────────────────── */
class AppError extends Error {
  constructor(message, type = ERR_TYPE.UNKNOWN, original = null) {
    super(message);
    this.name     = 'AppError';
    this.type     = type;
    this.original = original;
  }
}

/* ── Resolución de mensaje amigable ──────────────────────── */
function _resolveMsg(error) {
  if (!error) return _DEFAULT_MSG;
  if (error instanceof AppError) return error.message;

  const code = String(error.code || error.error_code || error.status || '');
  if (code && _ERR_MAP[code]) return _ERR_MAP[code];

  const text = (error.message || '') + ' ' + (error.error || '');
  for (const [key, val] of Object.entries(_ERR_MAP)) {
    if (text.includes(key)) return val;
  }
  return _DEFAULT_MSG;
}

/* ── Handler central ─────────────────────────────────────── */
function handleError(error, context = '') {
  console.error(`[${context || 'app'}]`, error);
  const msg = _resolveMsg(error);
  if (typeof showToast === 'function') showToast(msg, 'error');
  return msg;
}

/* ── Validación de formularios ───────────────────────────── */
/* rules: [{ value, label, required?, minLen?, maxLen? }]     */
function validateFields(rules) {
  for (const r of rules) {
    const val = String(r.value ?? '').trim();
    if (r.required && !val) {
      const msg = `${r.label} es obligatorio.`;
      if (typeof showToast === 'function') showToast(msg, 'warn');
      return { ok: false, msg };
    }
    if (r.minLen && val.length < r.minLen) {
      const msg = `${r.label} debe tener al menos ${r.minLen} caracteres.`;
      if (typeof showToast === 'function') showToast(msg, 'warn');
      return { ok: false, msg };
    }
    if (r.maxLen && val.length > r.maxLen) {
      const msg = `${r.label} no puede superar ${r.maxLen} caracteres.`;
      if (typeof showToast === 'function') showToast(msg, 'warn');
      return { ok: false, msg };
    }
  }
  return { ok: true };
}

/* ── Wrapper async con catch automático ──────────────────── */
function tryCatch(fn, context) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (e) { handleError(e, context); return null; }
  };
}
