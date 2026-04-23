/* ════════════════════════════════════════════════════════════
   BOX PLANNER — UI LESIONES
   ────────────────────────────────────────────────────────────
   Teacher:  _renderLesionesSection(pin) → inyectar en openAlumnoDetail
             openCrearLesionModal(pin)   → form dinámico
             handleResolverLesion()      → async, actualiza DOM
   Student:  renderSaludTab()           → tab Salud con lesiones + seguimiento
   ════════════════════════════════════════════════════════════ */

/* ── Catálogos ───────────────────────────────────────────── */
const ZONAS_CORPORALES = [
  'hombro_izq','hombro_der',
  'rodilla_izq','rodilla_der',
  'codo_izq','codo_der',
  'muneca_izq','muneca_der',
  'tobillo_izq','tobillo_der',
  'lumbar','cervical','dorsal',
  'cadera','cuadriceps','isquiotibiales',
  'pantorrilla','biceps','triceps',
  'pectoral','abdomen',
];

const ZONA_LABELS = {
  hombro_izq:'Hombro izq', hombro_der:'Hombro der',
  rodilla_izq:'Rodilla izq', rodilla_der:'Rodilla der',
  codo_izq:'Codo izq', codo_der:'Codo der',
  muneca_izq:'Muñeca izq', muneca_der:'Muñeca der',
  tobillo_izq:'Tobillo izq', tobillo_der:'Tobillo der',
  lumbar:'Lumbar', cervical:'Cervical', dorsal:'Dorsal',
  cadera:'Cadera', cuadriceps:'Cuádriceps', isquiotibiales:'Isquiotibiales',
  pantorrilla:'Pantorrilla', biceps:'Bíceps', triceps:'Tríceps',
  pectoral:'Pectoral', abdomen:'Abdomen',
};

/* Restricciones sugeridas por zona (para el generador) */
const ZONA_RESTRICCIONES = {
  hombro_izq:['hombro'],   hombro_der:['hombro'],
  rodilla_izq:['rodilla'],  rodilla_der:['rodilla'],
  codo_izq:['codo'],        codo_der:['codo'],
  muneca_izq:['muneca'],    muneca_der:['muneca'],
  tobillo_izq:['tobillo'],  tobillo_der:['tobillo'],
  lumbar:['lumbar'],        cervical:['cervical'],
  dorsal:['espalda'],       cadera:['cadera'],
  cuadriceps:['rodilla','cadera'], isquiotibiales:['isquiotibiales'],
  pantorrilla:['tobillo'],  biceps:['codo','hombro'],
  triceps:['codo','hombro'], pectoral:['hombro'],
  abdomen:['lumbar'],
};

const GRAVEDAD_COLORS = {
  leve:'var(--green)', moderada:'#f59e0b', severa:'var(--red)',
};

/* ════════════════════════════════════════════════════════════
   TEACHER — sección en openAlumnoDetail
   ════════════════════════════════════════════════════════════ */
function _renderLesionesSection(pin) {
  const lesiones = getLesionesByPin(pin);
  const activas  = lesiones.filter(l => l.estado !== 'resuelta');
  const pasadas  = lesiones.filter(l => l.estado === 'resuelta');

  const _card = (l) => {
    const zonaLabel  = ZONA_LABELS[l.zona_corporal] || l.zona_corporal;
    const gravColor  = GRAVEDAD_COLORS[l.gravedad]  || 'var(--muted)';
    const resBadge   = l.estado === 'resuelta'
      ? `<span class="lesion-badge lesion-badge--ok">Resuelta</span>`
      : `<span class="lesion-badge lesion-badge--activa">Activa</span>`;
    const restrs = (l.restricciones || []).join(', ') || '—';

    return `
      <div class="lesion-card${l.estado === 'resuelta' ? ' lesion-card--resuelta' : ''}">
        <div class="lesion-card-header">
          <span class="lesion-zona" style="border-left:3px solid ${gravColor}">${zonaLabel}</span>
          ${resBadge}
        </div>
        <div class="lesion-card-meta">${l.tipo_lesion || 'Sin diagnóstico'} · Gravedad: <strong>${l.gravedad || '—'}</strong></div>
        <div class="lesion-card-meta">Desde: ${l.fecha_inicio || '—'} · Restricciones: <em>${restrs}</em></div>
        ${l.notas_docente ? `<div class="lesion-nota">"${l.notas_docente}"</div>` : ''}
        ${l.estado !== 'resuelta' ? `
          <div style="display:flex;gap:.4rem;margin-top:.45rem;flex-wrap:wrap">
            <button class="btn-mini" onclick="openEditarLesionModal(${l.id}, '${pin}')">Editar</button>
            <button class="btn-mini btn-mini--danger"
              onclick="handleResolverLesion(${l.id}, '${pin}')">Marcar resuelta</button>
          </div>
        ` : ''}
      </div>`;
  };

  const activasHtml = activas.length
    ? activas.map(_card).join('')
    : '<div style="font-size:.82rem;color:var(--muted);padding:.35rem 0">Sin lesiones activas.</div>';

  const pasadasHtml = pasadas.length
    ? `<div class="lesion-hist-title">Historial resueltas</div>${pasadas.map(_card).join('')}`
    : '';

  return `
    <div class="section-hdr" style="margin:1.25rem 0 .75rem">
      <h2>Lesiones</h2>
      <div style="display:flex;gap:.4rem">
        <button class="btn-mini" onclick="generarReporteLesiones('${pin}')">📄 PDF</button>
        <button class="btn-mini" onclick="openCrearLesionModal('${pin}')">+ Agregar</button>
      </div>
    </div>
    <div id="lesionesWrap_${pin}">
      ${activasHtml}
      ${pasadasHtml}
    </div>`;
}

async function handleResolverLesion(lesionId, pin) {
  await resolverLesion(lesionId);
  showToast('Lesión marcada como resuelta');
  /* Actualizar DOM sin cerrar el modal */
  const wrap = document.getElementById(`lesionesWrap_${pin}`);
  if (wrap) {
    const temp = document.createElement('div');
    temp.innerHTML = _renderLesionesSection(pin);
    const nuevo = temp.querySelector(`#lesionesWrap_${pin}`);
    if (nuevo) wrap.innerHTML = nuevo.innerHTML;
  }
}

/* ════════════════════════════════════════════════════════════
   TEACHER — Modal crear lesión (generado dinámicamente)
   ════════════════════════════════════════════════════════════ */
function openCrearLesionModal(pin) {
  document.getElementById('crearLesionModal')?.remove();

  const zonaOpts = ZONAS_CORPORALES
    .map(z => `<option value="${z}">${ZONA_LABELS[z] || z}</option>`)
    .join('');

  const overlay = document.createElement('div');
  overlay.id        = 'crearLesionModal';
  overlay.className = 'modal-overlay modal-open';
  overlay.onclick   = (e) => { if (e.target === overlay) closeCrearLesionModal(); };

  overlay.innerHTML = `
    <div class="modal-card modal-card--tall">
      <div class="modal-header">
        <span style="font-weight:600;font-size:1rem">Registrar lesión</span>
        <button class="modal-close" onclick="closeCrearLesionModal()">✕</button>
      </div>
      <div style="padding-top:.75rem">
        <div class="rform-group">
          <label class="rform-label">Zona corporal</label>
          <select id="clZona" class="rform-input"
            onchange="clActualizarRestricciones()">${zonaOpts}</select>
        </div>
        <div class="rform-row">
          <div class="rform-group">
            <label class="rform-label">Tipo / Diagnóstico</label>
            <input id="clTipo" class="rform-input" placeholder="ej: Tendinitis" autocomplete="off">
          </div>
          <div class="rform-group">
            <label class="rform-label">Gravedad</label>
            <select id="clGravedad" class="rform-input">
              <option value="leve">Leve</option>
              <option value="moderada">Moderada</option>
              <option value="severa">Severa</option>
            </select>
          </div>
        </div>
        <div class="rform-group">
          <label class="rform-label">Restricciones de ejercicios</label>
          <input id="clRestricciones" class="rform-input"
            placeholder="ej: hombro, codo" autocomplete="off">
          <div id="clRestHint" style="font-size:.72rem;color:var(--muted);margin-top:.2rem"></div>
        </div>
        <div class="rform-row">
          <div class="rform-group">
            <label class="rform-label">Fecha inicio</label>
            <input id="clFecha" type="date" class="rform-input"
              value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="rform-group" style="justify-content:flex-end;padding-top:1.4rem">
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.83rem">
              <input type="checkbox" id="clApto" checked style="width:auto;margin:0;accent-color:var(--accent)">
              Apto para entrenar
            </label>
          </div>
        </div>
        <div class="rform-group">
          <label class="rform-label">Notas del docente</label>
          <textarea id="clNotas" class="rform-input" rows="2"
            placeholder="Protocolo de recuperación, observaciones…"></textarea>
        </div>
        <button class="metric-save-btn" onclick="handleCrearLesion('${pin}')"
          style="margin-top:.75rem">Guardar lesión</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  clActualizarRestricciones();
}

function clActualizarRestricciones() {
  const zona  = document.getElementById('clZona')?.value;
  const input = document.getElementById('clRestricciones');
  const hint  = document.getElementById('clRestHint');
  if (!zona || !input) return;
  const defaults = (ZONA_RESTRICCIONES[zona] || []).join(', ');
  input.placeholder = defaults || 'ej: hombro, codo';
  if (hint) hint.textContent = defaults ? `Sugeridas: ${defaults}` : '';
}

function closeCrearLesionModal() {
  document.getElementById('crearLesionModal')?.remove();
}

async function handleCrearLesion(pin) {
  const zona         = document.getElementById('clZona')?.value         || '';
  const tipo         = (document.getElementById('clTipo')?.value        || '').trim();
  const gravedad     = document.getElementById('clGravedad')?.value     || 'leve';
  const restStr      = (document.getElementById('clRestricciones')?.value || '').trim();
  const fecha_inicio = document.getElementById('clFecha')?.value        || new Date().toISOString().slice(0,10);
  const apto         = document.getElementById('clApto')?.checked !== false;
  const notas        = (document.getElementById('clNotas')?.value       || '').trim();

  const v = validateFields([
    { value: zona, label: 'Zona corporal', required: true },
    { value: tipo, label: 'Tipo / Diagnóstico', required: true },
  ]);
  if (!v.ok) return;

  const restricciones = restStr
    ? restStr.split(',').map(s => s.trim()).filter(Boolean)
    : (ZONA_RESTRICCIONES[zona] || []);

  try {
    await crearLesion({ pin, zona_corporal: zona, tipo_lesion: tipo,
      estado: 'activa', gravedad, restricciones,
      fecha_inicio, apto_entrenar: apto, notas_docente: notas });

    closeCrearLesionModal();
    showToast('✓ Lesión registrada');

    const wrap = document.getElementById(`lesionesWrap_${pin}`);
    if (wrap) {
      const temp = document.createElement('div');
      temp.innerHTML = _renderLesionesSection(pin);
      const nuevo = temp.querySelector(`#lesionesWrap_${pin}`);
      if (nuevo) wrap.innerHTML = nuevo.innerHTML;
    }
  } catch (e) {
    handleError(e, 'handleCrearLesion');
  }
}

/* ════════════════════════════════════════════════════════════
   TEACHER — Modal editar lesión existente
   ════════════════════════════════════════════════════════════ */
function openEditarLesionModal(lesionId, pin) {
  /* Buscar la lesión en el cache */
  const all = getLesionesByPin(pin);
  const l   = all.find(x => x.id === lesionId);
  if (!l) { showToast('Lesión no encontrada'); return; }

  document.getElementById('editarLesionModal')?.remove();

  const zonaOpts = ZONAS_CORPORALES
    .map(z => `<option value="${z}" ${z === l.zona_corporal ? 'selected' : ''}>${ZONA_LABELS[z] || z}</option>`)
    .join('');

  const restActuales = (l.restricciones || []).join(', ');

  const overlay = document.createElement('div');
  overlay.id        = 'editarLesionModal';
  overlay.className = 'modal-overlay modal-open';
  overlay.onclick   = (e) => { if (e.target === overlay) closeEditarLesionModal(); };

  overlay.innerHTML = `
    <div class="modal-card modal-card--tall">
      <div class="modal-header">
        <span style="font-weight:600;font-size:1rem">Editar lesión</span>
        <button class="modal-close" onclick="closeEditarLesionModal()">✕</button>
      </div>
      <div style="padding-top:.75rem">
        <div class="rform-group">
          <label class="rform-label">Zona corporal</label>
          <select id="elZona" class="rform-input">${zonaOpts}</select>
        </div>
        <div class="rform-row">
          <div class="rform-group">
            <label class="rform-label">Tipo / Diagnóstico</label>
            <input id="elTipo" class="rform-input"
              value="${l.tipo_lesion || ''}" autocomplete="off">
          </div>
          <div class="rform-group">
            <label class="rform-label">Gravedad</label>
            <select id="elGravedad" class="rform-input">
              <option value="leve"     ${l.gravedad === 'leve'     ? 'selected' : ''}>Leve</option>
              <option value="moderada" ${l.gravedad === 'moderada' ? 'selected' : ''}>Moderada</option>
              <option value="severa"   ${l.gravedad === 'severa'   ? 'selected' : ''}>Severa</option>
            </select>
          </div>
        </div>
        <div class="rform-group">
          <label class="rform-label">Estado</label>
          <select id="elEstado" class="rform-input">
            <option value="activa"      ${l.estado === 'activa'      ? 'selected' : ''}>Activa</option>
            <option value="en_mejora"   ${l.estado === 'en_mejora'   ? 'selected' : ''}>En mejora</option>
            <option value="cronico"     ${l.estado === 'cronico'     ? 'selected' : ''}>Crónico</option>
            <option value="resuelta"    ${l.estado === 'resuelta'    ? 'selected' : ''}>Resuelta</option>
          </select>
        </div>
        <div class="rform-group">
          <label class="rform-label">Restricciones de ejercicios</label>
          <input id="elRestricciones" class="rform-input"
            value="${restActuales}" placeholder="ej: hombro, codo" autocomplete="off">
        </div>
        <div class="rform-row">
          <div class="rform-group">
            <label class="rform-label">Fecha inicio</label>
            <input id="elFecha" type="date" class="rform-input"
              value="${l.fecha_inicio || ''}">
          </div>
          <div class="rform-group" style="justify-content:flex-end;padding-top:1.4rem">
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.83rem">
              <input type="checkbox" id="elApto"
                ${l.apto_entrenar !== false ? 'checked' : ''}
                style="width:auto;margin:0;accent-color:var(--accent)">
              Apto para entrenar
            </label>
          </div>
        </div>
        <div class="rform-group">
          <label class="rform-label">Notas del docente</label>
          <textarea id="elNotas" class="rform-input" rows="2">${l.notas_docente || ''}</textarea>
        </div>
        <button class="metric-save-btn" onclick="handleEditarLesion(${lesionId}, '${pin}')"
          style="margin-top:.75rem">Guardar cambios</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function closeEditarLesionModal() {
  document.getElementById('editarLesionModal')?.remove();
}

async function handleEditarLesion(lesionId, pin) {
  const zona         = document.getElementById('elZona')?.value          || '';
  const tipo         = (document.getElementById('elTipo')?.value         || '').trim();
  const gravedad     = document.getElementById('elGravedad')?.value      || 'leve';
  const estado       = document.getElementById('elEstado')?.value        || 'activa';
  const restStr      = (document.getElementById('elRestricciones')?.value || '').trim();
  const fecha_inicio = document.getElementById('elFecha')?.value         || '';
  const apto         = document.getElementById('elApto')?.checked !== false;
  const notas        = (document.getElementById('elNotas')?.value        || '').trim();

  const restricciones = restStr
    ? restStr.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const campos = {
    zona_corporal: zona, tipo_lesion: tipo,
    gravedad, estado, restricciones,
    fecha_inicio, apto_entrenar: apto,
    notas_docente: notas,
  };
  if (estado === 'resuelta' && !campos.fecha_fin) {
    campos.fecha_fin = new Date().toISOString().slice(0, 10);
  }

  try {
    await actualizarLesion(lesionId, campos);
    closeEditarLesionModal();
    showToast('✓ Lesión actualizada');
    const wrap = document.getElementById(`lesionesWrap_${pin}`);
    if (wrap) {
      const temp = document.createElement('div');
      temp.innerHTML = _renderLesionesSection(pin);
      const nuevo = temp.querySelector(`#lesionesWrap_${pin}`);
      if (nuevo) wrap.innerHTML = nuevo.innerHTML;
    }
  } catch (e) {
    handleError(e, 'handleEditarLesion');
  }
}

/* ════════════════════════════════════════════════════════════
   STUDENT — Tab Salud
   ════════════════════════════════════════════════════════════ */
function _renderMiPerfilForm() {
  const a    = state.alumno;
  const disc = (typeof DISCIPLINAS !== 'undefined' ? DISCIPLINAS : []).map(d => `
    <label class="miPerfil-disc-check">
      <input type="checkbox" name="miPerfil_disc" value="${d.id}"
        ${(a.disciplinas || []).includes(d.id) ? 'checked' : ''}>
      ${d.nombre}
    </label>`).join('');

  return `
    <div class="miPerfil-box">
      <div class="miPerfil-title">Mi perfil</div>
      <div class="miPerfil-field-lbl">Disciplinas</div>
      <div class="miPerfil-discs">${disc}</div>
      <div class="miPerfil-row">
        <div class="miPerfil-col">
          <label class="miPerfil-field-lbl" for="miPerfilDias">Días por semana</label>
          <input type="number" id="miPerfilDias" class="miPerfil-input-num"
            min="1" max="7" value="${a.dias || 3}">
        </div>
        <div class="miPerfil-col">
          <label class="miPerfil-field-lbl" for="miPerfilObjetivo">Objetivo</label>
          <input type="text" id="miPerfilObjetivo" class="miPerfil-input-txt"
            placeholder="Ej: perder peso, competir…"
            value="${a.objetivo && a.objetivo !== '—' ? a.objetivo : ''}">
        </div>
      </div>
      <button class="btn miPerfil-save-btn" onclick="guardarPerfilPropio()">Guardar perfil</button>
    </div>`;
}

function renderSaludTab() {
  const wrap = document.getElementById('saludWrap');
  if (!wrap || !state.alumno) return;

  const pin     = state.alumno.pin.toUpperCase();
  const lesiones = getLesionesByPin(pin);
  const activas  = lesiones.filter(l => l.estado !== 'resuelta');

  const perfilHtml = _renderMiPerfilForm();

  if (!activas.length) {
    wrap.innerHTML = perfilHtml + `
      <div class="lesion-ok-box">
        <div style="font-size:2.2rem;margin-bottom:.6rem">✓</div>
        <div style="font-size:.96rem;font-weight:700">Sin lesiones activas</div>
        <div style="font-size:.8rem;color:var(--muted);margin-top:.4rem">
          Tu docente registrará cualquier lesión o restricción aquí.
        </div>
      </div>`;
    return;
  }

  wrap.innerHTML = perfilHtml + activas.map(l => _renderLesionAlumnoCard(l, pin)).join('');
}

function _renderLesionAlumnoCard(l, pin) {
  const zonaLabel = ZONA_LABELS[l.zona_corporal] || l.zona_corporal;
  const gravColor = GRAVEDAD_COLORS[l.gravedad]  || 'var(--muted)';
  const aptoHtml  = l.apto_entrenar !== false
    ? '<span class="lesion-apto">Apto entrenar</span>'
    : '<span class="lesion-apto lesion-apto--no">No apto</span>';

  const hoy  = new Date().toISOString().slice(0, 10);
  const segs = getSeguimientoLesion(l.id);
  const hoyOk = segs.some(s => s.fecha === hoy);
  const sparkline = _buildSparkline(segs);

  return `
    <div class="lesion-alumno-card">
      <div class="lesion-alumno-header">
        <div>
          <div class="lesion-zona" style="border-left:3px solid ${gravColor}">${zonaLabel}</div>
          <div class="lesion-card-meta">${l.tipo_lesion || ''} · ${l.gravedad || ''} · desde ${l.fecha_inicio || '—'}</div>
        </div>
        ${aptoHtml}
      </div>
      ${l.notas_docente ? `<div class="lesion-nota">Tu docente: "${l.notas_docente}"</div>` : ''}
      <div class="lesion-seguimiento-wrap" id="segWrap_${l.id}">
        ${hoyOk
          ? '<div class="lesion-seguimiento-ok">✓ Seguimiento cargado hoy</div>'
          : _renderSeguimientoForm(l.id, pin)
        }
      </div>
      ${sparkline}
    </div>`;
}

function _renderSeguimientoForm(lesionId, pin) {
  const _slider = (campo, label) => `
    <div class="seg-slider-row">
      <label class="seg-slider-label">${label}</label>
      <input type="range" id="seg_${campo}_${lesionId}" min="0" max="10" value="0"
        class="seg-slider"
        oninput="document.getElementById('segVal_${campo}_${lesionId}').textContent=this.value">
      <span class="seg-slider-val" id="segVal_${campo}_${lesionId}">0</span>
    </div>`;

  return `
    <div class="seg-form">
      <div class="seg-form-title">Cómo estás hoy</div>
      ${_slider('dolor',       'Dolor (0-10)')}
      ${_slider('rigidez',     'Rigidez (0-10)')}
      ${_slider('inflamacion', 'Inflamación (0-10)')}
      ${_slider('sensacion',   'Sensación general (0-10)')}
      <textarea id="seg_obs_${lesionId}" class="rform-input" rows="2"
        placeholder="Observaciones opcionales…" style="margin:.5rem 0"></textarea>
      <button class="btn-mini" onclick="handleGuardarSeguimiento(${lesionId}, '${pin}')">
        Guardar seguimiento
      </button>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   SPARKLINE — Evolución dolor / sensación general
   ════════════════════════════════════════════════════════════ */
function _buildSparkline(segs) {
  if (segs.length < 2) return '';

  const W = 300, H = 72, pX = 6, pY = 8;
  const n   = segs.length;
  const iW  = W - pX * 2;
  const iH  = H - pY * 2 - 12; // 12px para etiquetas de fecha

  const px = i => pX + (n > 1 ? i * iW / (n - 1) : iW / 2);
  const py = v => pY + iH - (v / 10) * iH;

  const pathFor = campo =>
    segs.map((s, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(s[campo]).toFixed(1)}`).join('');

  const grid = [0, 5, 10].map(v => {
    const y = py(v).toFixed(1);
    return `<line x1="${pX}" y1="${y}" x2="${W - pX}" y2="${y}" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
    <text x="${W - pX + 3}" y="${(parseFloat(y) + 3.5).toFixed(1)}" font-size="7" fill="rgba(255,255,255,.25)">${v}</text>`;
  }).join('');

  const dots = segs.map((s, i) => `
    <circle cx="${px(i).toFixed(1)}" cy="${py(s.dolor).toFixed(1)}"       r="2.5" fill="#f87171"/>
    <circle cx="${px(i).toFixed(1)}" cy="${py(s.sensacion_gral).toFixed(1)}" r="2.5" fill="#4ade80"/>`).join('');

  const labelY = (pY + iH + 12).toFixed(1);
  const fIni = segs[0].fecha.slice(5).replace('-', '/');
  const fFin = segs[n - 1].fecha.slice(5).replace('-', '/');

  return `
    <div class="spark-wrap">
      <div class="spark-title">Evolución (${n} registros)</div>
      <div class="spark-legend">
        <span style="color:#f87171">● Dolor</span>
        <span style="color:#4ade80">● Sensación general</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:${H}px;display:block">
        ${grid}
        <path d="${pathFor('dolor')}"        fill="none" stroke="#f87171" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="${pathFor('sensacion_gral')}" fill="none" stroke="#4ade80" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        <text x="${pX}" y="${labelY}" font-size="8" fill="rgba(255,255,255,.35)">${fIni}</text>
        <text x="${W - pX}" y="${labelY}" text-anchor="end" font-size="8" fill="rgba(255,255,255,.35)">${fFin}</text>
      </svg>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   REPORTE PDF — historial de lesiones de un alumno
   ════════════════════════════════════════════════════════════ */
function generarReporteLesiones(pin) {
  const entry   = (state.panelAlumnos || []).find(e => e.alumno.pin.toUpperCase() === pin.toUpperCase());
  const nombre  = entry?.alumno?.nombre || pin;
  const lesiones = getLesionesByPin(pin);

  if (!lesiones.length) { showToast('Sin lesiones registradas'); return; }

  const hoy = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });

  const bloques = lesiones.map(l => {
    const zonaLabel = ZONA_LABELS[l.zona_corporal] || l.zona_corporal;
    const restrs    = (l.restricciones || []).join(', ') || '—';
    const segs      = getSeguimientoLesion(l.id);

    const segRows = segs.map(s => `
      <tr>
        <td>${s.fecha}</td>
        <td>${s.dolor}/10</td>
        <td>${s.rigidez}/10</td>
        <td>${s.inflamacion}/10</td>
        <td>${s.sensacion_gral}/10</td>
        <td>${s.observaciones || '—'}</td>
      </tr>`).join('');

    const segTable = segs.length
      ? `<table>
           <thead><tr><th>Fecha</th><th>Dolor</th><th>Rigidez</th><th>Inflamación</th><th>Sensación</th><th>Obs.</th></tr></thead>
           <tbody>${segRows}</tbody>
         </table>`
      : '<p class="no-data">Sin registros de seguimiento aún</p>';

    return `
      <div class="blk">
        <div class="blk-hdr">
          <span class="zona">${zonaLabel}</span>
          <span class="est est--${l.estado}">${l.estado}</span>
        </div>
        <p><strong>Tipo:</strong> ${l.tipo_lesion || '—'} &nbsp;|&nbsp; <strong>Gravedad:</strong> ${l.gravedad || '—'}</p>
        <p><strong>Desde:</strong> ${l.fecha_inicio || '—'}${l.fecha_fin ? ` &nbsp;→&nbsp; ${l.fecha_fin}` : ''}</p>
        <p><strong>Restricciones:</strong> ${restrs}</p>
        ${l.notas_docente ? `<p><strong>Notas del docente:</strong> ${l.notas_docente}</p>` : ''}
        <h4>Historial de seguimiento</h4>
        ${segTable}
      </div>`;
  }).join('<div class="sep"></div>');

  const html = `<!DOCTYPE html>
<html lang="es"><head>
  <meta charset="UTF-8">
  <title>Lesiones — ${nombre}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;color:#111;padding:28px 32px;font-size:13px}
    h1{font-size:20px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:4px}
    .sub{color:#666;font-size:11px;margin-bottom:22px}
    .blk{margin-bottom:18px}
    .blk-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .zona{font-size:15px;font-weight:700}
    .est{font-size:10px;padding:2px 8px;border-radius:99px;font-weight:700}
    .est--activa{background:#fef2f2;color:#ef4444}
    .est--resuelta{background:#f0fdf4;color:#16a34a}
    .est--en_mejora{background:#fffbeb;color:#d97706}
    .est--cronico{background:#faf5ff;color:#7c3aed}
    p{margin:3px 0}
    h4{margin:10px 0 5px;font-size:12px;color:#444}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ddd;padding:4px 7px}
    th{background:#f5f5f5;font-weight:600}
    .no-data{color:#aaa;font-style:italic;font-size:11px}
    .sep{border-top:1px solid #e5e5e5;margin:16px 0}
    @media print{body{padding:0}}
  </style>
</head><body>
  <h1>Reporte de Lesiones — ${nombre}</h1>
  <p class="sub">PIN: ${pin} &nbsp;|&nbsp; Generado: ${hoy}</p>
  ${bloques}
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { showToast('Habilitá los pop-ups para generar el PDF'); return; }
  w.document.write(html);
  w.document.close();
}

async function handleGuardarSeguimiento(lesionId, pin) {
  const g = (id) => document.getElementById(id);
  const dolor       = parseInt(g(`seg_dolor_${lesionId}`)?.value)      || 0;
  const rigidez     = parseInt(g(`seg_rigidez_${lesionId}`)?.value)    || 0;
  const inflamacion = parseInt(g(`seg_inflamacion_${lesionId}`)?.value)|| 0;
  const sensacion   = parseInt(g(`seg_sensacion_${lesionId}`)?.value)  || 0;
  const obs         = (g(`seg_obs_${lesionId}`)?.value || '').trim();

  await guardarSeguimientoLesion({
    lesion_id: lesionId, pin,
    dolor, rigidez, inflamacion,
    sensacion_gral: sensacion,
    observaciones: obs,
  });

  showToast('✓ Seguimiento guardado');
  const wrap = document.getElementById(`segWrap_${lesionId}`);
  if (wrap) wrap.innerHTML = '<div class="lesion-seguimiento-ok">✓ Seguimiento cargado hoy</div>';
}
