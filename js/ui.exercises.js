/* ════════════════════════════════════════════════════════════
   BOX PLANNER — UI AUTOCOMPLETE + ALTA DE EJERCICIOS
   ────────────────────────────────────────────────────────────
   - renderEjercicioAutocomplete(): input con dropdown
   - openCrearEjercicioModal(): modal de alta
   - Filtro automático por disciplina del alumno seleccionado
   ════════════════════════════════════════════════════════════ */

/* ── Constantes de disciplina ────────────────────────────── */
const DISCIPLINAS_CONFIG = {
  musculacion: { label: 'Musculación', color: '#6366f1' },
  crossfit:    { label: 'CrossFit',    color: '#ef4444' },
  oly:         { label: 'Olímpico',    color: '#f59e0b' },
  funcional:   { label: 'Funcional',   color: '#10b981' },
};

/* ── Renderizar input de búsqueda con autocomplete ────────── */
/**
 * Inyecta un widget de autocomplete en el contenedor dado.
 * @param {string} containerId  - ID del div contenedor
 * @param {string[]} disciplinas - disciplinas a filtrar (del alumno)
 * @param {function} onSelect    - callback(ejercicio) cuando se elige uno
 */
function renderEjercicioAutocomplete(containerId, disciplinas, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="autocomplete-wrapper" id="acWrapper_${containerId}">
      <input
        type="text"
        class="autocomplete-input"
        id="acInput_${containerId}"
        placeholder="Buscar ejercicio..."
        autocomplete="off"
      />
      <div class="autocomplete-dropdown" id="acDrop_${containerId}" style="display:none;"></div>
      <button class="autocomplete-add-btn" id="acAdd_${containerId}" style="display:none;"
        onclick="openCrearEjercicioModal('${containerId}', ${JSON.stringify(disciplinas)})">
        + Agregar ejercicio
      </button>
    </div>
  `;

  const input = document.getElementById(`acInput_${containerId}`);
  const drop  = document.getElementById(`acDrop_${containerId}`);
  const addBtn = document.getElementById(`acAdd_${containerId}`);
  let   debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = input.value.trim();
      if (q.length < 1) { drop.style.display = 'none'; addBtn.style.display = 'none'; return; }

      const resultados = buscarEjercicios(q, disciplinas);
      _renderDropdown(drop, resultados, q, onSelect, input, addBtn, containerId, disciplinas);
    }, 150);
  });

  /* Cerrar al clickear fuera */
  document.addEventListener('click', e => {
    if (!container.contains(e.target)) {
      drop.style.display  = 'none';
      addBtn.style.display = 'none';
    }
  });
}

function _renderDropdown(drop, resultados, query, onSelect, input, addBtn, containerId, disciplinas) {
  if (resultados.length === 0) {
    drop.style.display = 'none';
    addBtn.style.display = 'block';
    return;
  }

  addBtn.style.display = 'none';
  drop.innerHTML = resultados.map(e => {
    const discConf = DISCIPLINAS_CONFIG[e.disciplina] || {};
    const badge    = `<span class="ac-badge" style="background:${discConf.color || '#888'}">${discConf.label || e.disciplina}</span>`;
    const highlight = e.nombre.replace(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
      '<strong>$1</strong>'
    );
    const thumb = e.media_url
      ? `<img src="${e.media_url}" class="ac-thumb" alt="" loading="lazy">`
      : '';
    return `<div class="ac-item" data-id="${e.id}">
      ${thumb}
      <span class="ac-nombre">${highlight}</span>
      ${badge}
      <span class="ac-musculo">${e.musculo_principal || ''}</span>
    </div>`;
  }).join('');

  /* Agregar opción "crear" al final */
  drop.innerHTML += `<div class="ac-item ac-item--crear" data-crear="1">
    <span>+ Agregar "<strong>${query}</strong>" como nuevo ejercicio</span>
  </div>`;

  drop.style.display = 'block';

  drop.querySelectorAll('.ac-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.crear) {
        openCrearEjercicioModal(containerId, disciplinas, query);
      } else {
        const ej = buscarEjercicios('', disciplinas).find(e => e.id === item.dataset.id)
          || Object.values(_ejerciciosCache || {}).find(e => e.id === item.dataset.id);
        if (ej) {
          input.value        = ej.nombre;
          input.dataset.ejId = ej.id;
          drop.style.display = 'none';
          if (onSelect) onSelect(ej);
        }
      }
    });
  });
}

/* ── Preview de imagen en el modal de ejercicio ────────────*/
function handleEjMediaChange(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('ejMediaLabel').textContent = `✓ ${file.name}`;
  document.getElementById('ejMediaDrop').classList.add('reg-alta-drop--selected');
  const preview = document.getElementById('ejMediaPreview');
  if (preview) {
    preview.src           = URL.createObjectURL(file);
    preview.style.display = 'block';
  }
}

/* ── Modal alta de ejercicio ─────────────────────────────── */
function openCrearEjercicioModal(returnContainerId, disciplinasAlumno, nombrePrefill = '') {
  const _discs = disciplinasAlumno || [];

  /* Crear modal si no existe */
  let modal = document.getElementById('modalCrearEjercicio');
  if (!modal) {
    modal = document.createElement('div');
    modal.id        = 'modalCrearEjercicio';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const discOptions = Object.entries(DISCIPLINAS_CONFIG).map(([val, conf]) => {
    const sel = _discs.includes(val) ? 'selected' : '';
    return `<option value="${val}" ${sel}>${conf.label}</option>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">Nuevo ejercicio</h3>
        <button class="modal-close" onclick="closeCrearEjercicioModal()">×</button>
      </div>
      <form id="formCrearEjercicio">
        <div class="rform-group">
          <label class="rform-label">Nombre *</label>
          <input class="rform-input" id="ejNombre" required value="${nombrePrefill}" placeholder="Ej: Sentadilla Libre" />
        </div>
        <div class="rform-group">
          <label class="rform-label">Disciplina *</label>
          <select class="rform-input" id="ejDisciplina" required>${discOptions}</select>
        </div>
        <div class="rform-group">
          <label class="rform-label">Tipo</label>
          <select class="rform-input" id="ejTipo">
            <option value="">— Seleccionar —</option>
            <option value="hipertrofia">Hipertrofia</option>
            <option value="fuerza">Fuerza</option>
            <option value="cardio">Cardio</option>
            <option value="movilidad">Movilidad</option>
            <option value="olimpico">Olímpico</option>
            <option value="skill">Habilidad (Skill)</option>
          </select>
        </div>
        <div class="rform-group">
          <label class="rform-label">Músculo principal</label>
          <input class="rform-input" id="ejMusculo" placeholder="Ej: cuadriceps" />
        </div>
        <div class="rform-group">
          <label class="rform-label">Patrón de movimiento</label>
          <input class="rform-input" id="ejPatron" placeholder="Ej: sentadilla, empuje, jale" />
        </div>
        <div class="rform-group">
          <label class="rform-label">Equipamiento</label>
          <input class="rform-input" id="ejEquipo" placeholder="Ej: barra, mancuernas (separar con comas)" />
        </div>
        <div class="rform-group">
          <label class="rform-label">Nivel</label>
          <select class="rform-input" id="ejNivel">
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
        <div class="rform-group">
          <label class="rform-label">Imagen / GIF (opcional)</label>
          <div class="reg-alta-drop" id="ejMediaDrop"
               onclick="document.getElementById('ejMediaInput').click()" style="cursor:pointer">
            <span id="ejMediaLabel">📷 Agregar imagen o GIF</span>
          </div>
          <input type="file" id="ejMediaInput" accept="image/*" style="display:none"
                 onchange="handleEjMediaChange(this)">
          <img id="ejMediaPreview" style="display:none;max-width:100%;margin-top:.5rem;border-radius:6px;max-height:140px;object-fit:contain">
        </div>
        <p id="ejError" class="form-error" style="display:none;"></p>
        <div class="rform-actions">
          <button type="button" class="btn-secondary" onclick="closeCrearEjercicioModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="ejSubmitBtn">Guardar ejercicio</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.add('modal-open');

  document.getElementById('formCrearEjercicio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn    = document.getElementById('ejSubmitBtn');
    const errEl  = document.getElementById('ejError');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    errEl.style.display = 'none';

    try {
      const equipo = (document.getElementById('ejEquipo').value || '')
        .split(',').map(s => s.trim()).filter(Boolean);

      const nuevo = await crearEjercicio({
        nombre:            document.getElementById('ejNombre').value,
        disciplina:        document.getElementById('ejDisciplina').value,
        patron_movimiento: document.getElementById('ejPatron').value,
        tipo:              document.getElementById('ejTipo').value,
        musculo_principal: document.getElementById('ejMusculo').value,
        equipamiento:      equipo,
        nivel:             document.getElementById('ejNivel').value,
      });

      /* Subir imagen si se eligió una */
      const mediaFile = document.getElementById('ejMediaInput')?.files[0];
      if (mediaFile && typeof actualizarEjercicioMedia === 'function') {
        try {
          await actualizarEjercicioMedia(nuevo.id, mediaFile);
        } catch(e) {
          console.warn('No se pudo subir la imagen del ejercicio:', e);
        }
      }

      closeCrearEjercicioModal();
      showToast(`Ejercicio "${nuevo.nombre}" creado`);

      /* Si hay un autocomplete activo en el contexto, seleccionar el nuevo */
      if (returnContainerId) {
        const input = document.getElementById(`acInput_${returnContainerId}`);
        if (input) {
          input.value        = nuevo.nombre;
          input.dataset.ejId = nuevo.id;
        }
      }

    } catch (err) {
      errEl.textContent   = 'Error al guardar. Intentá de nuevo.';
      errEl.style.display = 'block';
      btn.disabled        = false;
      btn.textContent     = 'Guardar ejercicio';
    }
  });
}

function closeCrearEjercicioModal() {
  const modal = document.getElementById('modalCrearEjercicio');
  if (modal) modal.classList.remove('modal-open');
}

/* ── Ver detalle de ejercicio (tap desde rutina alumno) ──────*/
function openEjercicioDetail(id) {
  const ej = typeof getEjercicioById === 'function' ? getEjercicioById(id) : null;
  if (!ej) return;

  let modal = document.getElementById('ejercicioDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id        = 'ejercicioDetailModal';
    modal.className = 'modal-overlay';
    modal.onclick   = e => { if (e.target === modal) modal.classList.remove('modal-open'); };
    document.body.appendChild(modal);
  }

  const discConf = (typeof DISCIPLINAS_CONFIG !== 'undefined' && DISCIPLINAS_CONFIG[ej.disciplina]) || {};
  const badge    = discConf.label
    ? `<span class="ac-badge" style="background:${discConf.color};margin:.4rem auto .2rem;display:inline-block">${discConf.label}</span>`
    : '';

  modal.innerHTML = `
    <div class="modal-box" style="max-width:340px;text-align:center;padding-top:1.25rem">
      <button class="modal-close-x" style="position:absolute;top:.75rem;right:.75rem"
        onclick="document.getElementById('ejercicioDetailModal').classList.remove('modal-open')">✕</button>
      ${ej.media_url
        ? `<img src="${ej.media_url}" style="width:100%;border-radius:8px;margin-bottom:.9rem;max-height:220px;object-fit:contain">`
        : '<div style="font-size:2.5rem;margin-bottom:.5rem">🏋️</div>'}
      <div style="font-size:1.05rem;font-weight:600">${ej.nombre}</div>
      ${badge}
      ${ej.musculo_principal ? `<div style="font-size:.8rem;color:var(--muted);margin-top:.3rem">${ej.musculo_principal}</div>` : ''}
    </div>`;
  modal.classList.add('modal-open');
}

/* ── Editar ejercicio existente (desde el builder) ───────────*/
function openEditarEjercicioModal(id) {
  const ej = typeof getEjercicioById === 'function' ? getEjercicioById(id) : null;
  if (!ej) { showToast('Ejercicio no encontrado', 'warn'); return; }

  let modal = document.getElementById('modalEditarEjercicio');
  if (!modal) {
    modal = document.createElement('div');
    modal.id        = 'modalEditarEjercicio';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">${ej.nombre}</h3>
        <button class="modal-close"
          onclick="document.getElementById('modalEditarEjercicio').classList.remove('modal-open')">×</button>
      </div>
      ${ej.media_url
        ? `<img src="${ej.media_url}" style="width:100%;border-radius:8px;margin-bottom:.75rem;max-height:160px;object-fit:contain">`
        : '<div style="text-align:center;color:var(--muted);font-size:.82rem;margin-bottom:.75rem">Sin imagen todavía</div>'}
      <div class="rform-group">
        <label class="rform-label">${ej.media_url ? 'Cambiar imagen / GIF' : 'Agregar imagen / GIF'}</label>
        <div class="reg-alta-drop" id="editMediaDrop"
             onclick="document.getElementById('editMediaInput').click()" style="cursor:pointer">
          <span id="editMediaLabel">📷 Seleccionar archivo</span>
        </div>
        <input type="file" id="editMediaInput" accept="image/*" style="display:none"
               onchange="handleEditMediaChange(this)">
        <img id="editMediaPreview" style="display:none;max-width:100%;margin-top:.5rem;border-radius:6px;max-height:120px;object-fit:contain">
      </div>
      <p id="editEjError" class="form-error" style="display:none;"></p>
      <div class="rform-actions">
        <button type="button" class="btn-secondary"
          onclick="document.getElementById('modalEditarEjercicio').classList.remove('modal-open')">Cancelar</button>
        <button type="button" class="btn-primary" id="editEjSubmitBtn"
          onclick="guardarEditarEjercicio('${id}')">Guardar</button>
      </div>
    </div>`;
  modal.classList.add('modal-open');
}

function handleEditMediaChange(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('editMediaLabel').textContent = `✓ ${file.name}`;
  document.getElementById('editMediaDrop').classList.add('reg-alta-drop--selected');
  const preview = document.getElementById('editMediaPreview');
  if (preview) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; }
}

async function guardarEditarEjercicio(id) {
  const btn   = document.getElementById('editEjSubmitBtn');
  const errEl = document.getElementById('editEjError');
  const file  = document.getElementById('editMediaInput')?.files[0];
  if (!file) {
    document.getElementById('modalEditarEjercicio')?.classList.remove('modal-open');
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  errEl.style.display = 'none';
  try {
    if (typeof actualizarEjercicioMedia === 'function') {
      await actualizarEjercicioMedia(id, file);
    }
    document.getElementById('modalEditarEjercicio')?.classList.remove('modal-open');
    showToast('✓ Imagen actualizada');
  } catch(e) {
    console.error('guardarEditarEjercicio:', e);
    errEl.textContent   = 'Error al subir imagen. Intentá de nuevo.';
    errEl.style.display = 'block';
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  }
}
