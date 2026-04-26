/* ════════════════════════════════════════════════════════════
   BOX PLANNER — UI DE CARGA DE MÉTRICAS
   ────────────────────────────────────────────────────────────
   Responsabilidades:
     - renderCargar()   → lista de ejercicios para el tab "Cargar"
     - openMetricModal() → abre el modal de carga
     - submitMetric()   → guarda (vía metrics.js) y actualiza la UI
     - showToast()      → feedback visual post-guardado

   Lee state (no lo modifica directamente).
   Escribe vía saveMetric() + updateRMHistorial() de metrics.js.
   ════════════════════════════════════════════════════════════ */

/* ── Configuración de tipos de métrica ───────────────────────
   Determina label, placeholder y unidad según el tipo del ejercicio.
   ─────────────────────────────────────────────────────────── */
const TIPO_CONFIG = {
  peso_kg:      { label: 'Peso',         unidad: 'kg',   placeholder: 'ej: 80',  inputmode: 'decimal' },
  tiempo_seg:   { label: 'Tiempo',       unidad: 'seg',  placeholder: 'ej: 145', inputmode: 'numeric' },
  repeticiones: { label: 'Repeticiones', unidad: 'reps', placeholder: 'ej: 12',  inputmode: 'numeric' },
};

/* ── Estado local del modal ──────────────────────────────────
   Aislado del state global para no contaminar la capa de datos.
   ─────────────────────────────────────────────────────────── */
let _modal = {
  ejercicioId: null,
  tipo:        'peso_kg',
  estado:      '',
};

/* Opciones de estado subjetivo */
const ESTADOS = [
  { id: 'bien',     label: 'Bien',     color: 'var(--green)' },
  { id: 'regular',  label: 'Regular',  color: 'var(--accent)' },
  { id: 'fatiga',   label: 'Fatiga',   color: '#f59e0b' },
  { id: 'dolor',    label: 'Dolor',    color: 'var(--red)' },
];

/* ════════════════════════════════════════════════════════════
   renderCargar
   ────────────────────────────────────────────────────────────
   Muestra la lista de ejercicios disponibles para cargar.
   Cada tarjeta muestra el último valor registrado y al
   tocarla abre el modal pre-cargado con ese ejercicio.
   ════════════════════════════════════════════════════════════ */
function renderCargar() {
  const wrap = document.getElementById('cargarWrap');
  if (!wrap) return;

  const rms = state.rms;
  const hoy = new Date().toISOString().slice(0, 10);

  /* Métricas cargadas hoy por el alumno */
  const hoy_metricas = (state.metricas || []).filter(m => m.fecha === hoy);
  const ejsCargadosHoy = new Set(hoy_metricas.map(m => m.ejercicioId));

  if (!rms.length) {
    wrap.innerHTML = `
      <div class="carga-empty">
        <div class="carga-empty-icon">🏋️</div>
        <div>No hay ejercicios configurados.</div>
        <div style="font-size:.8rem;margin-top:.3rem;color:var(--muted)">
          Cargá tu primera sesión cuando el docente configure tu rutina.
        </div>
      </div>`;
    return;
  }

  const mesActual = new Date().getMonth();

  const cards = rms.map(rm => {
    const ejId     = rm._ejercicioId || rm.ejercicio;
    const tipo     = _getTipoEjercicio(ejId);
    const cfg      = TIPO_CONFIG[tipo] || TIPO_CONFIG.peso_kg;
    const ultimoVal = rm.meses[mesActual] || rm.mejor;
    const cargadoHoy = ejsCargadosHoy.has(ejId);

    return `
      <div class="carga-card ${cargadoHoy ? 'carga-card--done' : ''}"
           onclick="openMetricModal('${ejId}')">
        <div class="carga-card-body">
          <div class="carga-card-name">${rm.ejercicio}</div>
          <div class="carga-card-meta">
            <span class="carga-card-cat">${rm.cat}</span>
            ${ultimoVal ? `<span class="carga-card-last">último: ${ultimoVal}${cfg.unidad}</span>` : ''}
          </div>
        </div>
        <div class="carga-card-action">
          ${cargadoHoy
            ? '<span class="carga-done-badge">✓ cargado</span>'
            : `<span class="carga-unit">${cfg.unidad}</span><span class="carga-plus">+</span>`
          }
        </div>
      </div>`;
  }).join('');

  /* Resumen de lo cargado hoy */
  const resumenHoy = hoy_metricas.length
    ? `<div class="carga-resumen">
        <span class="carga-resumen-dot"></span>
        ${hoy_metricas.length} registro${hoy_metricas.length > 1 ? 's' : ''} hoy
       </div>`
    : '';

  wrap.innerHTML = resumenHoy + `<div class="carga-list">${cards}</div>`;
}

/* ════════════════════════════════════════════════════════════
   openMetricModal
   ────────────────────────────────────────────────────────────
   Abre el modal para cargar una métrica.
   Si se pasa ejercicioId, pre-selecciona el ejercicio.
   ════════════════════════════════════════════════════════════ */
function openMetricModal(ejercicioId) {
  const overlay = document.getElementById('metricModal');
  const body    = document.getElementById('metricModalBody');
  if (!overlay || !body) return;

  /* Encontrar el RM entry para tener nombre y tipo */
  const rmEntry  = state.rms.find(r =>
    r._ejercicioId === ejercicioId || r.ejercicio === ejercicioId
  );
  const tipo     = _getTipoEjercicio(ejercicioId);
  const cfg      = TIPO_CONFIG[tipo] || TIPO_CONFIG.peso_kg;
  const nombre   = rmEntry ? rmEntry.ejercicio : ejercicioId;
  const ultimoVal = rmEntry
    ? (rmEntry.meses[new Date().getMonth()] || rmEntry.mejor || '')
    : '';

  _modal.ejercicioId = ejercicioId;
  _modal.tipo        = tipo;
  _modal.estado      = '';

  const hoy = new Date().toLocaleDateString('es-AR', {
    weekday:'long', day:'numeric', month:'long',
  });

  body.innerHTML = `
    <div class="mmodal-header">
      <div class="mmodal-title">${nombre}</div>
      <div class="mmodal-date">${hoy}</div>
    </div>

    <div class="mmodal-field">
      <label class="mmodal-label">${cfg.label}</label>
      <div class="mmodal-input-wrap">
        <input
          id="metricValorInput"
          class="mmodal-input"
          type="number"
          inputmode="${cfg.inputmode}"
          min="0"
          step="${tipo === 'peso_kg' ? '0.5' : '1'}"
          placeholder="${cfg.placeholder}"
          ${ultimoVal ? `value="${ultimoVal}"` : ''}
          autocomplete="off"
        />
        <span class="mmodal-unidad">${cfg.unidad}</span>
      </div>
    </div>

    <div class="mmodal-field">
      <label class="mmodal-label">Notas <span style="color:var(--muted);font-weight:400">(opcional)</span></label>
      <input
        id="metricNotasInput"
        class="mmodal-input mmodal-input--notes"
        type="text"
        placeholder="ej: técnica mejorada, buena velocidad..."
        autocomplete="off"
      />
    </div>

    <div class="mmodal-field">
      <label class="mmodal-label">Estado <span style="color:var(--muted);font-weight:400">(opcional)</span></label>
      <div class="mmodal-estado-pills">
        ${ESTADOS.map(e => `
          <button class="estado-pill" data-estado="${e.id}"
                  style="--estado-color:${e.color}"
                  onclick="selectEstado('${e.id}', this)">
            ${e.label}
          </button>`).join('')}
      </div>
    </div>

    <button class="mmodal-submit" onclick="submitMetric()">
      GUARDAR RESULTADO
    </button>`;

  overlay.classList.add('modal-open');

  /* Auto-focus y select para edición rápida */
  requestAnimationFrame(() => {
    const inp = document.getElementById('metricValorInput');
    if (inp) { inp.focus(); inp.select(); }
  });
}

/* ── Cerrar modal ────────────────────────────────────────────
   Se llama al tocar el overlay o el botón cancelar.
   ─────────────────────────────────────────────────────────── */
/* ── Selección de estado ─────────────────────────────────────*/
function selectEstado(id, btn) {
  const ya = _modal.estado === id;
  /* Toggle: si toco el mismo, lo deselecciono */
  _modal.estado = ya ? '' : id;
  document.querySelectorAll('.estado-pill').forEach(p => {
    p.classList.toggle('estado-pill--active', p.dataset.estado === _modal.estado);
  });
}

function closeMetricModal(e) {
  if (e && e.target !== document.getElementById('metricModal')) return;
  document.getElementById('metricModal').classList.remove('modal-open');
  _modal.ejercicioId = null;
  _modal.estado      = '';
}

function closeMetricModalDirect() {
  document.getElementById('metricModal').classList.remove('modal-open');
  _modal.ejercicioId = null;
  _modal.estado      = '';
}

/* ════════════════════════════════════════════════════════════
   submitMetric
   ────────────────────────════════════════════════════════════
   Lee el formulario, valida, guarda y actualiza solo los
   componentes necesarios (sin renderAll completo).
   ════════════════════════════════════════════════════════════ */
function submitMetric() {
  const valorInput = document.getElementById('metricValorInput');
  const notasInput = document.getElementById('metricNotasInput');

  const valor = parseFloat(valorInput.value);

  if (!valor || valor <= 0) {
    valorInput.classList.add('mmodal-input--error');
    valorInput.focus();
    setTimeout(() => valorInput.classList.remove('mmodal-input--error'), 1500);
    return;
  }

  const hoy   = new Date().toISOString().slice(0, 10);
  const notas = notasInput ? notasInput.value.trim() : '';

  /* Capturar mejor marca previa para detectar PR después */
  const rmPrev = state.rms.find(r =>
    r._ejercicioId === _modal.ejercicioId || r.ejercicio === _modal.ejercicioId
  );
  const mejorPrev = rmPrev ? (rmPrev.mejor || 0) : 0;

  /* Guardar en localStorage (o Supabase en el futuro) */
  const metrica = saveMetric(
    state.alumno.pin,
    _modal.ejercicioId,
    valor,
    _modal.tipo,
    hoy,
    notas,
    _modal.estado
  );

  /* Agregar al state en memoria y re-mergear */
  state.metricas.push(metrica);
  updateRMHistorial();

  /* Cerrar modal */
  closeMetricModalDirect();

  /* Re-renderizar solo la sección de progreso (no toda la app) */
  renderStats();
  renderRMTable();
  renderSparks();
  renderCargar();

  /* B.7 — Feedback visual: PR o registro normal */
  const cfg   = TIPO_CONFIG[_modal.tipo] || TIPO_CONFIG.peso_kg;
  const esPR  = valor > mejorPrev && mejorPrev > 0;
  if (esPR) {
    showToast(`Nuevo récord personal: ${valor}${cfg.unidad}`, 'pr');
  } else {
    showToast(`✓ ${metrica.valor}${cfg.unidad} registrado`);
  }
}

/* ════════════════════════════════════════════════════════════
   showToast
   ────────────────────────────────────────────────────────────
   Muestra un mensaje de confirmación temporal.
   ════════════════════════════════════════════════════════════ */
function showToast(msg, type = 'ok', duration) {
  let toast = document.getElementById('bpToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bpToast';
    toast.className = 'bp-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.dataset.type = type;
  toast.classList.add('bp-toast--show');
  clearTimeout(toast._timer);
  const dur = duration || (type === 'error' ? 4000 : type === 'warn' ? 3000 : 2200);
  toast._timer = setTimeout(() => toast.classList.remove('bp-toast--show'), dur);
}

/* ── Helpers internos ────────────────────────────────────────*/

/* Determina el tipo de métrica de un ejercicio consultando el
   catálogo EJERCICIOS (db.demo.js). Fallback: peso_kg. */
function _getTipoEjercicio(ejercicioId) {
  if (typeof EJERCICIOS !== 'undefined') {
    const ej = EJERCICIOS.find(e =>
      e.id === ejercicioId || e.nombre === ejercicioId
    );
    if (ej) return ej.tipoMetrica;
  }
  return 'peso_kg';
}
