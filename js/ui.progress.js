/* ════════════════════════════════════════════════════════════
   BOX PLANNER — FOTOS DE PROGRESO
   ════════════════════════════════════════════════════════════ */

let _fotosProgreso = [];   // cache local de la sesión

/* ── Carga y render principal ────────────────────────────────*/
async function loadFotosProgreso() {
  const wrap = document.getElementById('fotosProgresoWrap');
  if (!wrap) return;
  wrap.innerHTML = _fotosLoadingHtml();

  const pin = state.alumno?.pin;
  if (!pin) return;

  if (typeof getFotosProgreso === 'function') {
    _fotosProgreso = await Promise.resolve(getFotosProgreso(pin));
  } else {
    _fotosProgreso = [];
  }

  renderFotosProgreso();
}

function renderFotosProgreso() {
  const wrap = document.getElementById('fotosProgresoWrap');
  if (!wrap) return;

  if (!_fotosProgreso.length) {
    wrap.innerHTML = `
      <div class="fotos-empty">
        <div class="fotos-empty-icon">📷</div>
        <div class="fotos-empty-text">Todavía no subiste fotos de progreso</div>
        <div class="fotos-empty-sub">Subí tu primera foto para empezar a ver tu evolución</div>
      </div>`;
    return;
  }

  /* Agrupar por año-mes */
  const grupos = {};
  _fotosProgreso.forEach(f => {
    const key = f.fecha ? f.fecha.slice(0, 7) : 'Sin fecha';
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(f);
  });

  const mesesLabel = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const html = Object.entries(grupos)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, fotos]) => {
      const [anio, mes] = key.split('-');
      const label = mes ? `${mesesLabel[parseInt(mes) - 1]} ${anio}` : key;
      const grid  = fotos.map(f => `
        <div class="fotos-item" onclick="openFotoModal('${f.id}')">
          <img src="${f.url}" alt="" class="fotos-img" loading="lazy">
          <div class="fotos-item-footer">
            <span class="fotos-fecha">${_formatFecha(f.fecha)}</span>
            <button class="fotos-delete-btn" onclick="event.stopPropagation();confirmarDeleteFoto('${f.id}','${f.url}')" title="Eliminar">✕</button>
          </div>
          ${f.notas ? `<div class="fotos-notas">${f.notas}</div>` : ''}
        </div>`).join('');
      return `
        <div class="fotos-grupo">
          <div class="fotos-grupo-label">${label}</div>
          <div class="fotos-grid">${grid}</div>
        </div>`;
    }).join('');

  wrap.innerHTML = html;
}

/* ── Upload ──────────────────────────────────────────────────*/
function openSubirFotoModal() {
  const modal = document.getElementById('subirFotoModal');
  if (!modal) return;
  document.getElementById('subirFotoForm')?.reset();
  document.getElementById('subirFotoDrop').classList.remove('reg-alta-drop--selected');
  document.getElementById('subirFotoDropLabel').textContent = '📷 Seleccionar foto';
  document.getElementById('subirFotoPreview').style.display = 'none';
  /* Fecha por defecto: hoy */
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaInput = document.getElementById('subirFotoFecha');
  if (fechaInput) fechaInput.value = hoy;
  modal.classList.add('modal-open');
}

function closeSubirFotoModal(e) {
  if (e && e.target !== document.getElementById('subirFotoModal')) return;
  document.getElementById('subirFotoModal')?.classList.remove('modal-open');
}
function closeSubirFotoModalDirect() {
  document.getElementById('subirFotoModal')?.classList.remove('modal-open');
}

function handleSubirFotoChange(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('subirFotoDropLabel').textContent = `✓ ${file.name}`;
  document.getElementById('subirFotoDrop').classList.add('reg-alta-drop--selected');
  /* Preview */
  const preview = document.getElementById('subirFotoPreview');
  if (preview) {
    preview.src     = URL.createObjectURL(file);
    preview.style.display = 'block';
  }
}

async function handleSubirFoto(event) {
  event.preventDefault();
  const btn  = event.target.querySelector('[type="submit"]');
  const file = document.getElementById('subirFotoInput')?.files[0];
  if (!file) { showToast('Seleccioná una foto primero', 'warn'); return; }

  const fecha = document.getElementById('subirFotoFecha')?.value || new Date().toISOString().slice(0, 10);
  const notas = (document.getElementById('subirFotoNotas')?.value || '').trim();
  const pin   = state.alumno?.pin;

  if (typeof _btnLoading === 'function') {
    await _btnLoading(btn, 'Subiendo…', _doSubirFoto(pin, file, fecha, notas));
  } else {
    await _doSubirFoto(pin, file, fecha, notas);
  }
}

async function _doSubirFoto(pin, file, fecha, notas) {
  try {
    let nueva;
    if (typeof uploadFotoProgreso === 'function') {
      nueva = await uploadFotoProgreso(pin, file, fecha, notas);
    } else {
      /* Demo mode: crear URL local */
      const url = URL.createObjectURL(file);
      nueva = { id: Date.now().toString(), pin, url, fecha, notas };
      saveFotoProgresoLocal(pin, nueva);
    }
    _fotosProgreso.unshift(nueva);
    closeSubirFotoModalDirect();
    renderFotosProgreso();
    showToast('✓ Foto subida');
  } catch (e) {
    console.error('_doSubirFoto:', e);
    showToast('Error al subir la foto', 'error');
  }
}

/* ── Ver foto ampliada ───────────────────────────────────────*/
function openFotoModal(id) {
  const foto  = _fotosProgreso.find(f => f.id === id);
  if (!foto) return;
  const modal = document.getElementById('verFotoModal');
  const img   = document.getElementById('verFotoImg');
  const meta  = document.getElementById('verFotoMeta');
  if (!modal || !img) return;
  img.src        = foto.url;
  meta.innerHTML = `<span>${_formatFecha(foto.fecha)}</span>${foto.notas ? `<span class="ver-foto-notas">${foto.notas}</span>` : ''}`;
  modal.classList.add('modal-open');
}
function closeVerFotoModal(e) {
  if (e && e.target !== document.getElementById('verFotoModal')) return;
  document.getElementById('verFotoModal')?.classList.remove('modal-open');
}
function closeVerFotoModalDirect() {
  document.getElementById('verFotoModal')?.classList.remove('modal-open');
}

/* ── Eliminar foto ───────────────────────────────────────────*/
function confirmarDeleteFoto(id, url) {
  if (!confirm('¿Eliminar esta foto? No se puede deshacer.')) return;
  _deleteFoto(id, url);
}

async function _deleteFoto(id, url) {
  try {
    if (typeof deleteFotoProgreso === 'function') {
      await deleteFotoProgreso(id, state.alumno?.pin, url);
    } else {
      deleteFotoProgresoLocal(state.alumno?.pin, id);
    }
    _fotosProgreso = _fotosProgreso.filter(f => f.id !== id);
    renderFotosProgreso();
    showToast('Foto eliminada');
  } catch(e) {
    console.error('_deleteFoto:', e);
    showToast('Error al eliminar', 'error');
  }
}

/* ── Helpers ─────────────────────────────────────────────────*/
function _formatFecha(fecha) {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function _fotosLoadingHtml() {
  return `<div class="loading-state">
    <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
  </div>`;
}
