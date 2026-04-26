/* ════════════════════════════════════════════════════════════
   BOX PLANNER — MODAL DE PERFIL DEL ALUMNO
   ════════════════════════════════════════════════════════════ */

const _FOTO_LS_KEY = pin => `bp_foto_${pin.toUpperCase()}`;

function _getFoto(pin) {
  /* En Supabase mode priorizar URL del bucket; localStorage como fallback legacy */
  if (typeof isSupabaseMode === 'function' && isSupabaseMode() && state.alumno?.avatarUrl) {
    return state.alumno.avatarUrl;
  }
  return localStorage.getItem(_FOTO_LS_KEY(pin)) || null;
}

function _saveFotoLocal(pin, dataUrl) {
  try {
    localStorage.setItem(_FOTO_LS_KEY(pin), dataUrl);
  } catch(e) {
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

  /* ── Sección "Mis entrenadores" (solo alumnos) ── */
  let misDocentesSection = '';
  if (!esDocente) {
    const relaciones = (typeof getDocentesDeAlumno === 'function')
      ? getDocentesDeAlumno(a.pin)
      : [];

    const docenteRows = relaciones.map(r => {
      /* Resolver nombre del docente */
      let nombre = r.docentePin;
      const demoDoc = (typeof ALUMNOS !== 'undefined')
        ? ALUMNOS.find(x => x.id.toUpperCase() === r.docentePin) : null;
      if (demoDoc) nombre = demoDoc.nombre;
      else if (typeof _sbCache !== 'undefined' && _sbCache.usuarios[r.docentePin]) {
        nombre = _sbCache.usuarios[r.docentePin].nombre || r.docentePin;
      } else {
        try {
          const ls = JSON.parse(localStorage.getItem('bp_nuevos_usuarios') || '{}');
          if (ls[r.docentePin]) nombre = ls[r.docentePin].nombre || r.docentePin;
        } catch { /* ignore */ }
      }
      const disc = (typeof DISCIPLINAS !== 'undefined')
        ? DISCIPLINAS.find(d => d.id === r.disciplinaId) : null;
      return `
        <div class="perfil-docente-row">
          <span class="perfil-docente-nombre">${nombre}</span>
          ${disc ? `<span class="doc-row-disc-tag">${disc.nombre}</span>` : ''}
          <button class="btn-mini btn-mini--danger" onclick="quitarDocentePerfil('${r.docentePin}')">✕</button>
        </div>`;
    }).join('');

    misDocentesSection = `
      <div class="perfil-divider"></div>
      <div class="perfil-field-group">
        <div class="perfil-flbl">Mis entrenadores</div>
        ${relaciones.length
          ? `<div class="perfil-docentes-list">${docenteRows}</div>`
          : '<div style="font-size:.8rem;color:var(--muted);margin-top:.2rem">Sin entrenadores vinculados</div>'}
      </div>`;
  }

  /* ── Sección "Alta médica" (Supabase, todos los roles) ── */
  let altaMedicaSection = '';
  if (typeof isSupabaseMode === 'function' && isSupabaseMode()) {
    const aptoMedico    = a.aptoMedico      || false;
    const fechaAlta     = a.fechaAltaMedica || null;
    const docUrl        = a.docMedicoUrl    || null;
    const altaStatus    = aptoMedico
      ? `<span class="perfil-alta-ok">✓ Apto/a${fechaAlta ? ` · desde ${fechaAlta}` : ''}</span>`
      : `<span class="perfil-alta-nok">⚠ Sin alta médica registrada</span>`;

    altaMedicaSection = `
      <div class="perfil-divider"></div>
      <div class="perfil-field-group">
        <div class="perfil-flbl">Alta médica</div>
        ${altaStatus}
        <button class="btn-mini" style="margin-top:.5rem;width:100%;text-align:center"
                onclick="document.getElementById('perfilAltaInput').click()">
          📎 ${aptoMedico ? 'Actualizar certificado' : 'Subir certificado médico'}
        </button>
        <input type="file" id="perfilAltaInput" accept="image/*,.pdf" style="display:none"
               onchange="handleAltaMedicaUpload(this)">
        ${docUrl ? `<a href="${docUrl}" target="_blank" class="perfil-alta-link">Ver documento actual</a>` : ''}
      </div>`;
  }

  const eliminarCuentaSection = `
    <div class="perfil-divider"></div>
    <div class="perfil-field-group">
      <button class="btn btn--danger" onclick="handleEliminarCuenta()">
        Eliminar mi cuenta
      </button>
    </div>`;

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

    </div>

    ${misDocentesSection}
    ${altaMedicaSection}
    ${eliminarCuentaSection}`;
}

/* ── Upload de foto ──────────────────────────────────────────*/
function handleFotoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const img    = new Image();
  const objUrl = URL.createObjectURL(file);

  img.onload = function() {
    const MAX    = 200;
    const scale  = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(img.width  * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objUrl);

    const dataUrl = canvas.toDataURL('image/jpeg', .8);

    const _applyAvatar = src => {
      const circle = document.getElementById('perfilAvatarCircle');
      if (circle) {
        circle.querySelector('.perfil-avatar-img, .perfil-avatar-initials')?.remove();
        const imgEl = document.createElement('img');
        imgEl.src       = src;
        imgEl.className = 'perfil-avatar-img';
        circle.insertBefore(imgEl, circle.querySelector('.perfil-avatar-overlay'));
      }
      updateTopbarAvatar();
    };

    if (typeof isSupabaseMode === 'function' && isSupabaseMode() && typeof uploadAvatar === 'function') {
      /* Mostrar preview inmediato con dataUrl mientras sube */
      state.alumno.avatarUrl = dataUrl;
      _applyAvatar(dataUrl);
      /* Convertir dataUrl → Blob para subir al bucket */
      canvas.toBlob(blob => {
        uploadAvatar(state.alumno.pin, new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
          .then(url => {
            state.alumno.avatarUrl = url;
            updateTopbarAvatar();
          })
          .catch(() => {
            /* Fallback: mantener dataUrl en state, guardar en localStorage */
            _saveFotoLocal(state.alumno.pin, dataUrl);
          });
      }, 'image/jpeg', 0.8);
    } else {
      _saveFotoLocal(state.alumno.pin, dataUrl);
      _applyAvatar(dataUrl);
    }
  };
  img.src = objUrl;
}

/* ── Quitar entrenador desde perfil ─────────────────────────*/
function quitarDocentePerfil(docentePin) {
  if (typeof quitarDocenteAlumno !== 'function') return;
  quitarDocenteAlumno(docentePin, state.alumno.pin);
  /* Re-render sección mis docentes sin cerrar modal */
  const body = document.getElementById('perfilModalBody');
  if (body) body.innerHTML = _renderPerfilBody();
  showToast('Entrenador desvinculado');
}

/* ── Upload alta médica ──────────────────────────────────────*/
function handleAltaMedicaUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (typeof uploadDocMedico !== 'function') {
    showToast('Función no disponible en modo demo', 'warn');
    return;
  }
  showToast('Subiendo certificado…', 'info');
  uploadDocMedico(state.alumno.pin, file)
    .then(url => {
      state.alumno.docMedicoUrl = url || state.alumno.docMedicoUrl;
      const today = new Date().toISOString().slice(0, 10);
      if (typeof actualizarAptoMedico === 'function') {
        return actualizarAptoMedico(state.alumno.pin, true, today).then(() => {
          state.alumno.aptoMedico      = true;
          state.alumno.fechaAltaMedica = today;
        });
      }
    })
    .then(() => {
      const body = document.getElementById('perfilModalBody');
      if (body) body.innerHTML = _renderPerfilBody();
      /* Ocultar banner de aviso persistente */
      if (typeof _updateAltaBanner === 'function') _updateAltaBanner();
      showToast('✓ Certificado subido y alta registrada');
    })
    .catch(err => {
      console.error('handleAltaMedicaUpload:', err);
      showToast('Error al subir certificado', 'error');
    });
}

/* ── Eliminar cuenta propia ──────────────────────────────────*/
async function handleEliminarCuenta() {
  if (!confirm('¿Eliminar tu cuenta permanentemente?\nPerderás todos tus datos y no podrás recuperarlos.')) return;
  const pin = state.alumno?.pin;
  if (!pin) return;
  try {
    if (typeof eliminarUsuario === 'function') {
      await eliminarUsuario(pin);
    } else {
      eliminarUsuarioLocal(pin);
    }
    cerrarPerfilModalDirect();
    if (typeof doLogout === 'function') doLogout();
  } catch(e) {
    console.error('handleEliminarCuenta:', e);
    showToast('Error al eliminar cuenta', 'error');
  }
}

/* ── Guardar campos del perfil ───────────────────────────────*/
function guardarPerfilPropio() {
  const btn = document.querySelector('.perfil-save-btn');
  const pin         = state.alumno.pin;
  const checkboxes  = document.querySelectorAll('input[name="miPerfil_disc"]:checked');
  const disciplinas = Array.from(checkboxes).map(cb => cb.value);
  const dias        = parseInt(document.getElementById('perfilDias')?.value) || 3;
  const objetivo    = (document.getElementById('perfilObjetivo')?.value || '').trim();

  const work = Promise.resolve(
    actualizarPerfilAlumnoLocal(pin, disciplinas, dias, objetivo || undefined)
  ).then(() => {
    state.alumno.disciplinas = disciplinas;
    state.alumno.dias        = dias;
    if (objetivo) state.alumno.objetivo = objetivo;
    state.alumno.disciplina  = _discStr(disciplinas);

    const obj  = objetivo || state.alumno.objetivo;
    const tags = [state.alumno.disciplina, `${dias} días/sem`, obj].filter(t => t && t !== '—');
    const heroMeta = document.getElementById('heroMeta');
    if (heroMeta) heroMeta.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');

    cerrarPerfilModalDirect();
    showToast('✓ Perfil actualizado');
  });

  if (typeof _btnLoading === 'function') _btnLoading(btn, 'Guardando…', work);
}
