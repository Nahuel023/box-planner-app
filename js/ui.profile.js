/* ════════════════════════════════════════════════════════════
   BOX PLANNER — MODAL DE PERFIL DEL ALUMNO
   ════════════════════════════════════════════════════════════ */

const _FOTO_LS_KEY = pin => `bp_foto_${pin.toUpperCase()}`;

function _getFoto(pin) {
  return localStorage.getItem(_FOTO_LS_KEY(pin)) || null;
}

function _saveFotoLocal(pin, dataUrl) {
  try {
    localStorage.setItem(_FOTO_LS_KEY(pin), dataUrl);
  } catch(e) {
    /* base64 puede ser grande — informar si falla */
    showToast('Foto guardada solo en esta sesión (imagen muy grande)', 'warn');
  }
}

/* ── Iniciales desde nombre completo ─────────────────────────*/
function _getInitials(nombre) {
  const parts = (nombre || '').split(' ').filter(Boolean);
  if (!parts.length) return '?';
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

/* ── Actualiza el avatar del topbar ─────────────────────────*/
function updateTopbarAvatar() {
  if (!state.alumno) return;
  const foto     = _getFoto(state.alumno.pin);
  const initials = _getInitials(state.alumno.nombre);
  const inner    = foto
    ? `<img src="${foto}" alt="" class="topbar-avatar-img">`
    : `<span class="topbar-avatar-initials">${initials}</span>`;
  const btn1 = document.getElementById('perfilAvatarBtn');
  const btn2 = document.getElementById('docPerfilAvatarBtn');
  if (btn1) btn1.innerHTML = inner;
  if (btn2) btn2.innerHTML = inner;
}

/* ── Abrir modal ─────────────────────────────────────────────*/
function openPerfilModal() {
  const modal = document.getElementById('perfilModal');
  const body  = document.getElementById('perfilModalBody');
  if (!modal || !body || !state.alumno) return;
  body.innerHTML = _renderPerfilBody();
  modal.classList.add('modal-open');
}

/* ── Cerrar modal ────────────────────────────────────────────*/
function cerrarPerfilModal(e) {
  if (e && e.target !== document.getElementById('perfilModal')) return;
  document.getElementById('perfilModal').classList.remove('modal-open');
}
function cerrarPerfilModalDirect() {
  document.getElementById('perfilModal').classList.remove('modal-open');
}

/* ── Render del contenido del modal ─────────────────────────*/
function _renderPerfilBody() {
  const a        = state.alumno;
  const foto     = _getFoto(a.pin);
  const initials = _getInitials(a.nombre);

  const avatarInner = foto
    ? `<img src="${foto}" alt="" class="perfil-avatar-img">`
    : `<span class="perfil-avatar-initials">${initials}</span>`;

  const esDocente      = a.rol === 'docente' || a.rol === 'admin';
  const discLabel      = esDocente ? 'Disciplinas que dictás' : 'Disciplinas';
  const discCheckboxes = (typeof DISCIPLINAS !== 'undefined' ? DISCIPLINAS : []).map(d => `
    <label class="perfil-disc-label">
      <input type="checkbox" name="miPerfil_disc" value="${d.id}"
        ${(a.disciplinas || []).includes(d.id) ? 'checked' : ''}>
      ${d.nombre}
    </label>`).join('');

  return `
    <div class="perfil-mhdr">
      <span class="perfil-mhdr-title">Mi Perfil</span>
      <button class="modal-close-x" onclick="cerrarPerfilModalDirect()">✕</button>
    </div>

    <!-- Avatar con tap-to-change -->
    <div class="perfil-avatar-wrap" onclick="document.getElementById('perfilFotoInput').click()" title="Cambiar foto">
      <div class="perfil-avatar-circle" id="perfilAvatarCircle">
        ${avatarInner}
        <div class="perfil-avatar-overlay">Cambiar foto</div>
      </div>
    </div>
    <input type="file" id="perfilFotoInput" accept="image/*" style="display:none"
           onchange="handleFotoUpload(this)">

    <!-- Nombre y PIN (solo lectura) -->
    <div class="perfil-readonly-block">
      <div class="perfil-readonly-nombre">${a.nombre}</div>
      <div class="perfil-readonly-pin">${a.pin}</div>
    </div>

    <div class="perfil-divider"></div>

    <!-- Campos editables -->
    <div class="perfil-fields">

      <div class="perfil-field-group">
        <div class="perfil-flbl">${discLabel}</div>
        <div class="perfil-discs-grid">${discCheckboxes}</div>
      </div>

      <div class="perfil-2col">
        <div class="perfil-field-group">
          <label class="perfil-flbl" for="perfilDias">Días / semana</label>
          <input type="number" id="perfilDias" class="perfil-input"
            min="1" max="7" value="${a.dias || 3}">
        </div>
        <div class="perfil-field-group" style="flex:2">
          <label class="perfil-flbl" for="perfilObjetivo">Objetivo</label>
          <input type="text" id="perfilObjetivo" class="perfil-input"
            placeholder="competir, perder peso, ganar masa…"
            value="${a.objetivo && a.objetivo !== '—' ? a.objetivo : ''}">
        </div>
      </div>

      <button class="btn perfil-save-btn" onclick="guardarPerfilPropio()">
        Guardar cambios
      </button>

    </div>`;
}

/* ── Upload de foto ──────────────────────────────────────────*/
function handleFotoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  /* Reducir tamaño antes de guardar en localStorage */
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = function() {
    const MAX = 200;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(img.width  * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const dataUrl = canvas.toDataURL('image/jpeg', .8);
    _saveFotoLocal(state.alumno.pin, dataUrl);
    updateTopbarAvatar();

    /* Actualizar avatar dentro del modal en tiempo real */
    const circle = document.getElementById('perfilAvatarCircle');
    if (circle) {
      circle.querySelector('.perfil-avatar-img, .perfil-avatar-initials')?.remove();
      const imgEl = document.createElement('img');
      imgEl.src       = dataUrl;
      imgEl.className = 'perfil-avatar-img';
      const overlay   = circle.querySelector('.perfil-avatar-overlay');
      circle.insertBefore(imgEl, overlay);
    }
  };
  img.src = url;
}

/* ── Guardar campos del perfil ───────────────────────────────*/
function guardarPerfilPropio() {
  const pin         = state.alumno.pin;
  const checkboxes  = document.querySelectorAll('input[name="miPerfil_disc"]:checked');
  const disciplinas = Array.from(checkboxes).map(cb => cb.value);
  const dias        = parseInt(document.getElementById('perfilDias')?.value) || 3;
  const objetivo    = (document.getElementById('perfilObjetivo')?.value || '').trim();

  actualizarPerfilAlumnoLocal(pin, disciplinas, dias, objetivo || undefined);

  /* Actualizar state.alumno */
  state.alumno.disciplinas = disciplinas;
  state.alumno.dias        = dias;
  if (objetivo) state.alumno.objetivo = objetivo;
  state.alumno.disciplina  = disciplinas
    .map(id => {
      const d = (typeof DISCIPLINAS !== 'undefined') ? DISCIPLINAS.find(d => d.id === id) : null;
      return d ? d.nombre : id;
    })
    .join(' / ') || '—';

  /* Refresh hero tags */
  const obj  = objetivo || state.alumno.objetivo;
  const tags = [state.alumno.disciplina, `${dias} días/sem`, obj].filter(t => t && t !== '—');
  const heroMeta = document.getElementById('heroMeta');
  if (heroMeta) heroMeta.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');

  cerrarPerfilModalDirect();
  showToast('✓ Perfil actualizado');
}
