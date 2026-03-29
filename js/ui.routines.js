/* ════════════════════════════════════════════════════════════
   BOX PLANNER — UI GESTIÓN DE RUTINAS (DOCENTE)
   ────────────────────────────────────────────────────────────
   Responsabilidades:
     - renderDocenteRutinas()  → lista de rutinas (demo + custom)
     - openNuevaRutinaModal()  → formulario para crear rutina
     - openAsignarModal(id)    → formulario para asignar a alumno
     - submitNuevaRutina()     → guarda y re-renderiza
     - submitAsignarRutina()   → asigna y confirma

   Usa: getAllRutinas, saveCustomRutina, deleteCustomRutinaById,
        asignarRutina, getRutinaAsignada  (db.routines.js)
        showToast  (ui.metrics.js)
   ════════════════════════════════════════════════════════════ */

let _rModalAsignarId = null;  // rutinaId activo en el modal asignar
let _rDiaCount       = 0;     // contador de días en formulario nueva rutina

/* Tipos de bloque disponibles (deben coincidir con clases de render.js) */
const BLOCK_TIPOS = [
  { id: 'strength', label: 'Fuerza' },
  { id: 'wl',       label: 'Levantamiento' },
  { id: 'metcon',   label: 'Metcon / WOD' },
  { id: 'core',     label: 'Core / Accesorios' },
  { id: 'structure',label: 'Estructura / Calentamiento' },
];

function _tipoOpts(selected = 'metcon') {
  return BLOCK_TIPOS.map(t =>
    `<option value="${t.id}" ${t.id === selected ? 'selected' : ''}>${t.label}</option>`
  ).join('');
}

/* Agrega un bloque de trabajo a un día.
   btn  → botón "+ Añadir Bloque" del día, O el div .rdia-block mismo.
   data → objeto { tipo, label, contenido } para pre-poblar (opcional). */
function addBloqueRutina(btnOrBlock, data = {}) {
  const diaBlock   = btnOrBlock.closest
    ? btnOrBlock.closest('.rdia-block')
    : btnOrBlock;
  const bloquesWrap = diaBlock.querySelector('.rdia-bloques');
  if (!bloquesWrap) return;

  const bDiv = document.createElement('div');
  bDiv.className = 'rbloque-block';
  bDiv.innerHTML = `
    <div class="rbloque-header">
      <select class="rform-input rbloque-tipo">${_tipoOpts(data.tipo || 'metcon')}</select>
      <button class="btn-mini btn-mini--danger" onclick="this.closest('.rbloque-block').remove()">✕</button>
    </div>
    <input class="rform-input rbloque-label"
      placeholder="Título del bloque (ej: FUERZA Y TÉCNICA)"
      value="${data.label || ''}"
      style="margin-bottom:.4rem" autocomplete="off">
    <textarea class="rform-input rbloque-contenido" rows="3"
      placeholder="Un ejercicio por línea:&#10;3x10 Sentadillas&#10;5x5 Press Banca"
    >${data.contenido || ''}</textarea>`;
  bloquesWrap.appendChild(bDiv);
}

/* Construye el HTML base de un .rdia-block (sin bloques aún) */
function _crearDiaBlock(idx, labelVal = '') {
  const div = document.createElement('div');
  div.className  = 'rdia-block';
  div.dataset.idx = idx;
  div.innerHTML = `
    <div class="rdia-header">
      <label class="rform-label">Día ${idx}</label>
      <button class="btn-mini btn-mini--danger" onclick="this.closest('.rdia-block').remove()">✕</button>
    </div>
    <input class="rform-input rdia-label"
      placeholder="Ej: LUNES — Empuje"
      value="${labelVal}"
      style="margin-bottom:.6rem" autocomplete="off">
    <div class="rdia-bloques"></div>
    <button class="btn-add-bloque" onclick="addBloqueRutina(this)">+ Añadir Bloque</button>`;
  return div;
}

/* Recolecta { label, bloques[] } de todos los .rdia-block del DOM */
function _recolectarDias() {
  return Array.from(document.querySelectorAll('.rdia-block')).map(el => {
    const bloques = Array.from(el.querySelectorAll('.rbloque-block')).map(b => ({
      tipo:      b.querySelector('.rbloque-tipo')?.value     || 'metcon',
      label:    (b.querySelector('.rbloque-label')?.value    || '').trim(),
      contenido:(b.querySelector('.rbloque-contenido')?.value || '').trim(),
    })).filter(b => b.contenido);
    return {
      label: (el.querySelector('.rdia-label')?.value || '').trim() || 'Día',
      bloques,
    };
  }).filter(d => d.bloques.length);
}

/* ════════════════════════════════════════════════════════════
   renderDocenteRutinas
   Lista todas las rutinas disponibles con botón Asignar.
   ════════════════════════════════════════════════════════════ */
function renderDocenteRutinas() {
  const wrap = document.getElementById('docRutinasWrap');
  if (!wrap) return;

  const allRutinas = getAllRutinas();
  const entries    = Object.entries(allRutinas);

  if (!entries.length) {
    wrap.innerHTML = '<div class="error-box">No hay rutinas definidas.</div>';
    return;
  }

  wrap.innerHTML = entries.map(([id, r]) => {
    const disc      = DISCIPLINAS.find(d => d.id === r.disciplinaId);
    const discColor = disc ? disc.color : 'var(--muted)';
    const discNombre= disc ? disc.nombre : (r.disciplinaId || '—');
    const diasCount = (r.dias || []).length;
    const esCustom  = !!r._custom;

    return `
      <div class="doc-rutina-card">
        <div class="doc-rutina-disc-dot" style="background:${discColor}"></div>
        <div class="doc-rutina-info">
          <div class="doc-rutina-nombre">${r.nombre}</div>
          <div class="doc-rutina-meta">
            ${discNombre} · ${r.nivel || '—'} · ${diasCount} día${diasCount !== 1 ? 's' : ''}
            ${esCustom ? '<span class="badge" style="margin-left:.3rem">custom</span>' : ''}
          </div>
        </div>
        <div class="doc-rutina-actions">
          <button class="btn-mini" onclick="openAsignarModal('${id}')">Asignar</button>
          <button class="btn-mini" onclick="duplicarRutina('${id}')">Duplicar</button>
          ${esCustom ? `<button class="btn-mini" onclick="openEditarRutinaModal('${id}')">Editar</button>` : ''}
          ${esCustom ? `<button class="btn-mini btn-mini--danger" onclick="confirmDeleteRutina('${id}')">✕</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════
   openNuevaRutinaModal
   ════════════════════════════════════════════════════════════ */
function openNuevaRutinaModal() {
  _rDiaCount = 0;
  const modal  = document.getElementById('rutinaModal');
  const titulo = document.getElementById('rutinaModalTitulo');
  const body   = document.getElementById('rutinaModalBody');
  if (!modal) return;

  titulo.textContent = 'Nueva rutina';

  const discOpts = DISCIPLINAS.map(d =>
    `<option value="${d.id}">${d.nombre}</option>`
  ).join('');

  body.innerHTML = `
    <div class="rform-group">
      <label class="rform-label">Nombre de la rutina</label>
      <input id="rNombre" class="rform-input" placeholder="Ej: CF Avanzado Sem 14" autocomplete="off">
    </div>
    <div class="rform-row">
      <div class="rform-group">
        <label class="rform-label">Disciplina</label>
        <select id="rDisc" class="rform-input">
          <option value="">— elegir —</option>${discOpts}
        </select>
      </div>
      <div class="rform-group">
        <label class="rform-label">Nivel</label>
        <select id="rNivel" class="rform-input">
          <option value="principiante">Principiante</option>
          <option value="intermedio" selected>Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
      </div>
    </div>
    <div id="rDiasWrap"></div>
    <button class="btn-add-day" onclick="addDiaRutina()">+ Agregar día</button>
    <button class="metric-save-btn" onclick="submitNuevaRutina()" style="margin-top:1rem">
      Guardar rutina
    </button>`;

  modal.classList.add('modal-open');
  addDiaRutina();
  requestAnimationFrame(() => {
    const inp = document.getElementById('rNombre');
    if (inp) inp.focus();
  });
}

function addDiaRutina() {
  _rDiaCount++;
  const wrap = document.getElementById('rDiasWrap');
  if (!wrap) return;
  const div = _crearDiaBlock(_rDiaCount);
  wrap.appendChild(div);
  addBloqueRutina(div);  // primer bloque vacío por defecto
}

function submitNuevaRutina() {
  const nombre = (document.getElementById('rNombre')?.value || '').trim();
  const disc   = document.getElementById('rDisc')?.value || '';
  const nivel  = document.getElementById('rNivel')?.value || 'intermedio';

  if (!nombre) { showToast('Ingresá un nombre para la rutina'); return; }

  const dias = _recolectarDias();
  if (!dias.length) { showToast('Agregá al menos un día con al menos un bloque'); return; }

  saveCustomRutina({ id: `custom_${Date.now()}`, nombre, disciplinaId: disc, nivel, _custom: true, dias });
  closeRutinaModalDirect();
  renderDocenteRutinas();
  showToast(`✓ "${nombre}" guardada`);
}

/* ════════════════════════════════════════════════════════════
   duplicarRutina
   ════════════════════════════════════════════════════════════ */
function duplicarRutina(id) {
  const allRutinas = getAllRutinas();
  const original   = allRutinas[id];
  if (!original) return;

  const copia = {
    id:           `custom_${Date.now()}`,
    nombre:       `${original.nombre} (copia)`,
    disciplinaId: original.disciplinaId || '',
    nivel:        original.nivel || 'intermedio',
    _custom:      true,
    dias: (original.dias || []).map(d => {
      const diaLabel = d.label || d.diaSemana || 'Día';
      /* Demo: tiene items[] por bloque → convertir a contenido */
      if (d.bloques && d.bloques[0]?.items !== undefined) {
        return {
          label: diaLabel,
          bloques: d.bloques.map(b => ({
            tipo:     b.tipo || 'metcon',
            label:    b.label || '',
            contenido:(b.items || []).join('\n'),
          })),
        };
      }
      /* Custom nuevo: ya tiene bloques con contenido */
      if (d.bloques) {
        return { label: diaLabel, bloques: d.bloques.map(b => ({ ...b })) };
      }
      /* Custom antiguo: contenido plano → un solo bloque */
      return {
        label: diaLabel,
        bloques: d.contenido
          ? [{ tipo: 'structure', label: '', contenido: d.contenido }]
          : [],
      };
    }),
  };

  saveCustomRutina(copia);
  renderDocenteRutinas();
  showToast(`"${copia.nombre}" creada`);
}

/* ════════════════════════════════════════════════════════════
   openEditarRutinaModal  (solo rutinas custom)
   ════════════════════════════════════════════════════════════ */
function openEditarRutinaModal(id) {
  _rDiaCount = 0;
  const allRutinas = getAllRutinas();
  const rutina     = allRutinas[id];
  if (!rutina || !rutina._custom) return;

  const modal  = document.getElementById('rutinaModal');
  const titulo = document.getElementById('rutinaModalTitulo');
  const body   = document.getElementById('rutinaModalBody');
  if (!modal) return;

  titulo.textContent = 'Editar rutina';

  const discOpts = DISCIPLINAS.map(d =>
    `<option value="${d.id}" ${d.id === rutina.disciplinaId ? 'selected' : ''}>${d.nombre}</option>`
  ).join('');

  const niveles = ['principiante', 'intermedio', 'avanzado'];
  const nivelOpts = niveles.map(n =>
    `<option value="${n}" ${n === rutina.nivel ? 'selected' : ''}>${n.charAt(0).toUpperCase() + n.slice(1)}</option>`
  ).join('');

  body.innerHTML = `
    <input type="hidden" id="rEditId" value="${id}">
    <div class="rform-group">
      <label class="rform-label">Nombre de la rutina</label>
      <input id="rNombre" class="rform-input" value="${rutina.nombre}" autocomplete="off">
    </div>
    <div class="rform-row">
      <div class="rform-group">
        <label class="rform-label">Disciplina</label>
        <select id="rDisc" class="rform-input">
          <option value="">— elegir —</option>${discOpts}
        </select>
      </div>
      <div class="rform-group">
        <label class="rform-label">Nivel</label>
        <select id="rNivel" class="rform-input">${nivelOpts}</select>
      </div>
    </div>
    <div id="rDiasWrap"></div>
    <button class="btn-add-day" onclick="addDiaRutina()">+ Agregar día</button>
    <button class="metric-save-btn" onclick="submitEditarRutina()" style="margin-top:1rem">
      Guardar cambios
    </button>`;

  modal.classList.add('modal-open');

  /* Pre-poblar días existentes */
  (rutina.dias || []).forEach(d => {
    _rDiaCount++;
    const wrap = document.getElementById('rDiasWrap');
    const div  = _crearDiaBlock(_rDiaCount, d.label || '');
    wrap.appendChild(div);

    /* Compatibilidad: formato antiguo (contenido plano) → un bloque */
    const bloques = d.bloques || (d.contenido
      ? [{ tipo: 'structure', label: '', contenido: d.contenido }]
      : []);
    bloques.forEach(b => addBloqueRutina(div, b));
  });
}

function submitEditarRutina() {
  const id     = document.getElementById('rEditId')?.value || '';
  const nombre = (document.getElementById('rNombre')?.value || '').trim();
  const disc   = document.getElementById('rDisc')?.value || '';
  const nivel  = document.getElementById('rNivel')?.value || 'intermedio';

  if (!nombre) { showToast('Ingresá un nombre'); return; }

  const dias = _recolectarDias();
  if (!dias.length) { showToast('Agregá al menos un día con al menos un bloque'); return; }

  saveCustomRutina({ id, nombre, disciplinaId: disc, nivel, _custom: true, dias });
  closeRutinaModalDirect();
  renderDocenteRutinas();
  showToast(`"${nombre}" actualizada`);
}

/* ════════════════════════════════════════════════════════════
   openAsignarModal
   ════════════════════════════════════════════════════════════ */
function openAsignarModal(rutinaId) {
  _rModalAsignarId = rutinaId;
  const modal  = document.getElementById('rutinaModal');
  const titulo = document.getElementById('rutinaModalTitulo');
  const body   = document.getElementById('rutinaModalBody');
  if (!modal) return;

  const allRutinas = getAllRutinas();
  const rutina     = allRutinas[rutinaId];
  titulo.textContent = 'Asignar rutina';

  const alumnos = state.panelAlumnos.map(p => p.alumno);
  const opts = alumnos.map(a => {
    const asigId   = getRutinaAsignada(a.pin);
    const asigNombre = asigId && allRutinas[asigId] ? ` (actual: ${allRutinas[asigId].nombre})` : '';
    return `<option value="${a.pin}">${a.nombre}${asigNombre}</option>`;
  }).join('');

  body.innerHTML = `
    <p style="font-size:.83rem;color:var(--muted);margin-bottom:1.1rem">
      Rutina: <strong style="color:var(--text)">${rutina?.nombre || rutinaId}</strong>
    </p>
    <div class="rform-group">
      <label class="rform-label">Asignar a</label>
      <select id="rAlumnoSel" class="rform-input">
        <option value="">— elegir alumno —</option>
        ${opts}
      </select>
    </div>
    <button class="metric-save-btn" onclick="submitAsignarRutina()" style="margin-top:1rem">
      Confirmar asignación
    </button>`;

  modal.classList.add('modal-open');
}

function submitAsignarRutina(forzar = false) {
  const pin = document.getElementById('rAlumnoSel')?.value || '';
  if (!pin) { showToast('Elegí un alumno'); return; }

  /* Verificar si ya fue asignada antes */
  if (!forzar && checkRutinaAsignada(pin, _rModalAsignarId)) {
    const allRutinas    = getAllRutinas();
    const rutinaNombre  = allRutinas[_rModalAsignarId]?.nombre || _rModalAsignarId;
    const alumnoNombre  = (state.panelAlumnos.find(p => p.alumno.pin === pin)?.alumno.nombre) || pin;

    /* Mostrar advertencia inline en el modal */
    let warn = document.getElementById('rAsignarWarn');
    if (!warn) {
      warn = document.createElement('div');
      warn.id = 'rAsignarWarn';
      warn.className = 'rasignar-warn';
      document.getElementById('rutinaModalBody').appendChild(warn);
    }
    warn.innerHTML = `
      <div class="rasignar-warn-txt">
        Esta rutina ya fue asignada a <strong>${alumnoNombre}</strong> anteriormente.
        ¿Asignar nuevamente?
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.6rem">
        <button class="btn-mini" onclick="submitAsignarRutina(true)">Asignar igual</button>
        <button class="btn-mini btn-mini--danger" onclick="document.getElementById('rAsignarWarn').remove()">Cancelar</button>
      </div>`;
    return;
  }

  const allRutinas   = getAllRutinas();
  const rutina       = allRutinas[_rModalAsignarId];
  asignarRutina(pin, _rModalAsignarId);
  closeRutinaModalDirect();

  const alumnoNombre = (state.panelAlumnos.find(p => p.alumno.pin === pin)?.alumno.nombre) || pin;
  showToast(`✓ "${rutina?.nombre}" asignada a ${alumnoNombre}`);
}

/* ════════════════════════════════════════════════════════════
   confirmDeleteRutina
   ════════════════════════════════════════════════════════════ */
function confirmDeleteRutina(id) {
  const allRutinas = getAllRutinas();
  const nombre     = allRutinas[id]?.nombre || id;
  deleteCustomRutinaById(id);
  renderDocenteRutinas();
  showToast(`"${nombre}" eliminada`);
}

/* ── Cerrar modal ────────────────────────────────────────────*/
function closeRutinaModal(e) {
  if (e && e.target !== document.getElementById('rutinaModal')) return;
  closeRutinaModalDirect();
}

function closeRutinaModalDirect() {
  document.getElementById('rutinaModal')?.classList.remove('modal-open');
  _rDiaCount = 0;
}
