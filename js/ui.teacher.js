/* ════════════════════════════════════════════════════════════
   BOX PLANNER — PANEL DOCENTE
   ────────────────────────────────────────────────────────────
   Responsabilidades:
     - renderDocente()        → entrada principal
     - renderDocenteStats()   → cards de resumen global + alertas
     - renderDocenteAlumnos() → lista filtrable con badges de alerta
     - openAlumnoDetail(pin)  → slide-up con detalle + info de alerta
     - toggleFiltroDoc()      → alterna filtro todos / necesitan atención

   Lee state.panelAlumnos (escrito por loadDocenteData en app.js).
   No modifica state. No depende de render.js.
   ════════════════════════════════════════════════════════════ */

/* ── Estado local del panel ──────────────────────────────────*/
let _filtroDoc = 'todos';  // 'todos' | 'atencion'

/* ── Utilidad de tiempo relativo ─────────────────────────────*/
function _diasDesde(fechaISO) {
  if (!fechaISO) return null;
  const diff = Date.now() - new Date(fechaISO + 'T12:00:00').getTime();
  const dias  = Math.floor(diff / 86400000);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

/* ════════════════════════════════════════════════════════════
   renderDocente — punto de entrada
   ════════════════════════════════════════════════════════════ */
function renderDocente() {
  renderDocenteStats();
  renderDocenteAlumnos();
}

/* ════════════════════════════════════════════════════════════
   renderDocenteStats
   Cards: activos · cargaron hoy · necesitan atención
   ════════════════════════════════════════════════════════════ */
function renderDocenteStats() {
  const wrap = document.getElementById('docStatGrid');
  if (!wrap) return;

  const alumnos = state.panelAlumnos;
  const activos = alumnos.filter(p => p.alumno.estado === 'Activo').length;
  const hoy     = alumnos.filter(p => p.cargaHoy).length;
  const alertas = alumnos.filter(p => p.necesitaAtencion).length;

  wrap.innerHTML = [
    { val: activos, lbl: 'Alumnos activos',     icon: '👥', cls: '' },
    { val: hoy,     lbl: 'Cargaron hoy',         icon: '✅', cls: '' },
    { val: alertas, lbl: 'Necesitan atención',   icon: '⚠️', cls: alertas > 0 ? 'doc-stat-val--alerta' : '' },
  ].map(c => `
    <div class="doc-stat-box">
      <div class="doc-stat-icon">${c.icon}</div>
      <div class="doc-stat-val ${c.cls}">${c.val}</div>
      <div class="doc-stat-lbl">${c.lbl}</div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   renderDocenteAlumnos
   Lista con filtro y badge de alerta por card.
   ════════════════════════════════════════════════════════════ */
function renderDocenteAlumnos() {
  const wrap   = document.getElementById('docAlumnosWrap');
  const badge  = document.getElementById('docAlumnosBadge');
  const btnFil = document.getElementById('btnFiltroAtencion');
  if (!wrap) return;

  const todos   = state.panelAlumnos;
  const alertas = todos.filter(p => p.necesitaAtencion);

  if (badge)  badge.textContent = todos.length;
  if (btnFil) {
    const activo = _filtroDoc === 'atencion';
    btnFil.classList.toggle('btn-filtro--active', activo);
    btnFil.textContent = `⚠ Atención (${alertas.length})`;
  }

  const lista = _filtroDoc === 'atencion' ? alertas : todos;

  if (!lista.length) {
    wrap.innerHTML = _filtroDoc === 'atencion'
      ? '<div class="doc-ok-box">✓ Todos los alumnos al día</div>'
      : '<div class="error-box">No hay alumnos cargados.</div>';
    return;
  }

  const mes = new Date().getMonth();

  wrap.innerHTML = lista.map(entrada => {
    const { alumno, rms, cargaHoy, ultimaCarga, diasSinCarga, estancado, necesitaAtencion } = entrada;

    /* Chips de RMs del mes actual */
    const rmChips = rms.slice(0, 3).map(rm => {
      const val = rm.meses[mes] || rm.mejor;
      if (!val) return '';
      const name = rm.ejercicio.split(' ').slice(0, 2).join(' ');
      return `<span class="doc-rm-chip">${name}: <strong>${val}kg</strong></span>`;
    }).filter(Boolean).join('');

    /* Indicador de actividad */
    const tiempoDesde = _diasDesde(ultimaCarga);
    const actividadHtml = cargaHoy
      ? '<span class="doc-actividad doc-actividad--hoy">✓ cargó hoy</span>'
      : tiempoDesde
        ? `<span class="doc-actividad">${tiempoDesde}</span>`
        : '<span class="doc-actividad doc-actividad--nunca">sin registros</span>';

    /* Badge de alerta */
    let alertaBadge = '';
    if (necesitaAtencion) {
      const motivos = [];
      if (!ultimaCarga)         motivos.push('sin registros');
      else if (diasSinCarga >= 7) motivos.push(`${diasSinCarga}d sin carga`);
      if (estancado)            motivos.push('estancado');
      alertaBadge = `<div class="doc-alerta-badge">⚠ ${motivos.join(' · ')}</div>`;
    }

    return `
      <div class="doc-alumno-card${necesitaAtencion ? ' doc-alumno-card--alerta' : ''}"
           onclick="openAlumnoDetail('${alumno.pin}')">
        <div class="doc-alumno-header">
          <div>
            <div class="doc-alumno-nombre">${alumno.nombre}</div>
            <div class="doc-alumno-meta">${alumno.disciplina} · ${alumno.dias} días/sem</div>
          </div>
          ${actividadHtml}
        </div>
        ${alertaBadge}
        ${rmChips
          ? `<div class="doc-alumno-rms">${rmChips}</div>`
          : '<div class="doc-alumno-rms doc-alumno-rms--empty">Sin RMs registrados</div>'
        }
      </div>`;
  }).join('');
}

/* ── Alternar filtro ─────────────────────────────────────────*/
function toggleFiltroDoc() {
  _filtroDoc = _filtroDoc === 'todos' ? 'atencion' : 'todos';
  renderDocenteAlumnos();
}

/* ════════════════════════════════════════════════════════════
   openAlumnoDetail
   Slide-up con tabla de RMs + sección de alertas si aplica.
   ════════════════════════════════════════════════════════════ */
function openAlumnoDetail(pin) {
  const overlay = document.getElementById('alumnoDetailModal');
  const body    = document.getElementById('alumnoDetailBody');
  if (!overlay || !body) return;

  const entrada = state.panelAlumnos.find(p => p.alumno.pin === pin);
  if (!entrada) return;

  const { alumno, rms, metricas = [], ultimaCarga, diasSinCarga, estancado, necesitaAtencion } = entrada;
  const mes   = new Date().getMonth();
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  /* Tabla de RMs */
  const rmRows = rms.map(rm => {
    const curr = rm.meses[mes];
    const prev = rm.meses.slice(0, mes).reverse().find(v => v !== null);
    const diff = (curr !== null && prev !== null) ? curr - prev : null;
    const cls  = diff === null ? '' : diff > 0 ? 'prog-up' : diff < 0 ? 'prog-down' : 'prog-flat';
    const txt  = diff === null ? '—' : diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);

    return `
      <div class="rm-row-item">
        <div>
          <div class="rm-exercise">${rm.ejercicio}</div>
          <div class="rm-cat">${rm.cat}</div>
        </div>
        <div class="rm-kg">${curr !== null ? curr + 'kg' : '—'}</div>
        <div class="rm-best">${rm.mejor !== null ? rm.mejor + 'kg' : '—'}</div>
        <div><span class="stat-prog ${cls}" style="font-size:.7rem;padding:.12rem .4rem;">${txt}</span></div>
      </div>`;
  }).join('');

  const rmTable = rms.length
    ? `<div class="rm-table">
        <div class="rm-table-header">
          <span>Ejercicio</span><span>${MESES[mes]}</span><span>Mejor</span><span>Δ</span>
        </div>
        ${rmRows}
       </div>`
    : '<div class="error-box">Sin RMs registrados.</div>';

  /* Sección de alertas */
  let alertaSection = '';
  if (necesitaAtencion) {
    const items = [];
    if (!ultimaCarga)           items.push('Sin registros de métricas cargados');
    else if (diasSinCarga >= 7) items.push(`${diasSinCarga} días sin cargar datos`);
    if (estancado)              items.push('Sin mejora en el último mes en todos los ejercicios');
    alertaSection = `
      <div class="detail-alerta-section">
        <div class="detail-alerta-titulo">⚠ Alertas</div>
        ${items.map(i => `<div class="detail-alerta-item">${i}</div>`).join('')}
      </div>`;
  }

  const tiempoDesde = _diasDesde(ultimaCarga);

  /* Construir sección de lesiones fuera del template para que un error
     no rompa todo el modal */
  let lesionesSection = '';
  try {
    if (typeof _renderLesionesSection === 'function') {
      lesionesSection = _renderLesionesSection(pin);
    }
  } catch (e) {
    console.error('_renderLesionesSection error:', e);
  }

  body.innerHTML = `
    <div class="detail-header">
      <div class="detail-nombre">${alumno.nombre}</div>
      <div class="detail-meta">${alumno.disciplina} · ${alumno.dias} días/sem</div>
      ${alumno.objetivo ? `<div class="detail-objetivo">${alumno.objetivo}</div>` : ''}
    </div>

    ${alertaSection}

    ${_renderPerfilSection(pin)}

    ${_renderRutinaSection(pin)}

    ${lesionesSection}

    <div class="section-hdr" style="margin:1.25rem 0 .75rem">
      <h2>RMs — ${MESES[mes]}</h2>
    </div>

    ${rmTable}

    ${_renderUltimasCargas(metricas)}

    <div class="detail-footer">
      ${tiempoDesde
        ? `<span class="detail-footer-label">Última carga:</span> ${tiempoDesde}`
        : '<span class="detail-footer-label">Sin registros de métricas todavía.</span>'
      }
    </div>`;

  overlay.classList.add('modal-open');
}

/* ── _renderPerfilSection ───────────────────────────────────
   Edición de disciplinas y días/semana visible solo para docente/admin.
   ─────────────────────────────────────────────────────────── */
function _renderPerfilSection(pin) {
  const rol = state.alumno && state.alumno.rol;
  if (rol !== 'docente' && rol !== 'admin') return '';

  /* Leer disciplinas actuales del alumno */
  const entrada = state.panelAlumnos.find(p => p.alumno.pin === pin);
  if (!entrada) return '';

  /* Obtener ids activos del alumno: probar bp_nuevos_usuarios primero, luego demo overrides */
  const localData = JSON.parse(localStorage.getItem('bp_nuevos_usuarios') || '{}');
  const localUser = localData[pin.toUpperCase()];
  const override  = JSON.parse(localStorage.getItem('bp_demo_overrides') || '{}')[pin.toUpperCase()];
  const demoAlumno = (typeof ALUMNOS !== 'undefined') ? ALUMNOS.find(a => a.id.toUpperCase() === pin.toUpperCase()) : null;

  let activeDisciplinas = [];
  let activeDias        = 3;

  if (localUser) {
    activeDisciplinas = localUser.disciplinas || [];
    activeDias        = localUser.dias !== undefined ? localUser.dias : 3;
  } else if (override) {
    activeDisciplinas = override.disciplinas || [];
    activeDias        = override.dias !== undefined ? override.dias : (demoAlumno ? demoAlumno.diasPorSemana : 3);
  } else if (demoAlumno) {
    activeDisciplinas = demoAlumno.disciplinas || [];
    activeDias        = demoAlumno.diasPorSemana;
  }

  const checkboxes = (typeof DISCIPLINAS !== 'undefined' ? DISCIPLINAS : []).map(d => `
    <label class="perfil-disc-check">
      <input type="checkbox" name="perfil_disc" value="${d.id}"
        ${activeDisciplinas.includes(d.id) ? 'checked' : ''}>
      ${d.nombre}
    </label>`).join('');

  return `
    <div class="section-hdr" style="margin:1.25rem 0 .75rem">
      <h2>Perfil deportivo</h2>
    </div>
    <div class="detail-perfil-box">
      <div class="detail-perfil-disciplinas">${checkboxes}</div>
      <div class="detail-perfil-dias-row">
        <label for="perfilDias_${pin}">Días por semana:</label>
        <input type="number" id="perfilDias_${pin}" class="detail-perfil-dias-input"
          min="1" max="7" value="${activeDias}">
      </div>
      <button class="btn-mini" onclick="guardarPerfilAlumno('${pin}')">Guardar perfil</button>
    </div>`;
}

function guardarPerfilAlumno(pin) {
  const checkboxes  = document.querySelectorAll('input[name="perfil_disc"]:checked');
  const disciplinas = Array.from(checkboxes).map(cb => cb.value);
  const dias        = parseInt(document.getElementById(`perfilDias_${pin}`)?.value) || 3;

  actualizarPerfilAlumnoLocal(pin, disciplinas, dias);

  /* Actualizar state.panelAlumnos para que el re-render sea coherente */
  const entrada = state.panelAlumnos.find(p => p.alumno.pin === pin);
  if (entrada) {
    const disciplinaNombre = disciplinas
      .map(id => { const d = (typeof DISCIPLINAS !== 'undefined') ? DISCIPLINAS.find(d => d.id === id) : null; return d ? d.nombre : id; })
      .join(' / ') || '—';
    entrada.alumno.disciplina = disciplinaNombre;
    entrada.alumno.dias       = dias;
  }

  showToast('✓ Perfil actualizado');
  openAlumnoDetail(pin);
  renderDocenteAlumnos();
}

/* ── _renderRutinaSection ────────────────────────────────────
   Muestra la rutina actual asignada + historial de asignaciones
   anteriores, con botón para quitar la rutina vigente.
   ─────────────────────────────────────────────────────────── */
function _renderRutinaSection(pin) {
  const historial  = getHistorialRutinas(pin);
  if (!historial.length) return '';

  const allRutinas = getAllRutinas();
  const actual     = historial[0];

  const _nombre = (rutinaId) => {
    if (rutinaId === null || rutinaId === undefined) return '<em style="color:var(--muted)">Sin rutina</em>';
    return allRutinas[rutinaId]
      ? allRutinas[rutinaId].nombre
      : `<em style="color:var(--muted)">${rutinaId}</em>`;
  };

  const histRows = historial.slice(1).map(h => `
    <div class="detail-hist-row">
      <span>${_nombre(h.rutinaId)}</span>
      <span class="detail-hist-fecha">${h.fecha_asignacion || ''}</span>
    </div>`).join('');

  return `
    <div class="section-hdr" style="margin:1.25rem 0 .75rem">
      <h2>Rutina asignada</h2>
    </div>
    <div class="detail-rutina-box">
      <div class="detail-rutina-actual">
        <span>${_nombre(actual.rutinaId)}</span>
        <span class="detail-hist-fecha">${actual.fecha_asignacion || ''}</span>
      </div>
      ${actual.rutinaId !== null
        ? `<button class="btn-mini btn-mini--danger" style="margin-top:.55rem"
             onclick="quitarRutinaAlumno('${pin}')">Quitar rutina actual</button>`
        : ''}
    </div>
    ${historial.length > 1 ? `
      <div class="detail-hist-wrap">
        <div class="detail-hist-title">Historial</div>
        ${histRows}
      </div>` : ''}`;
}

/* ════════════════════════════════════════════════════════════
   renderAdminTab  (solo rol admin)
   Muestra pendientes de aprobación y usuarios locales activos.
   ════════════════════════════════════════════════════════════ */
function renderAdminTab() {
  const wrap = document.getElementById('adminTabWrap');
  if (!wrap) return;

  const todos     = getUsuariosLocales();
  const pendientes = todos.filter(u => u.estado === 'pendiente');
  const activos    = todos.filter(u => u.estado === 'activo');

  const _rolSelect = (pin, rolActual, inputId) => `
    <select id="${inputId}" class="admin-rol-select">
      <option value="alumno"  ${rolActual === 'alumno'  ? 'selected' : ''}>Alumno</option>
      <option value="docente" ${rolActual === 'docente' ? 'selected' : ''}>Docente</option>
      <option value="admin"   ${rolActual === 'admin'   ? 'selected' : ''}>Admin</option>
    </select>`;

  /* ── Pendientes ── */
  const pendientesHtml = pendientes.length
    ? pendientes.map(u => `
        <div class="admin-user-row">
          <div class="admin-user-info">
            <div class="admin-user-nombre">${u.nombre}</div>
            <div class="admin-user-meta">${u.pin} · ${u.email || '—'} · ${u.fechaNacimiento || '—'}</div>
          </div>
          ${_rolSelect(u.pin, 'alumno', `rol_${u.pin}`)}
          <button class="btn-mini" onclick="handleAprobar('${u.pin}')">Aprobar</button>
          <button class="btn-mini btn-mini--danger" onclick="handleRechazar('${u.pin}')">Rechazar</button>
        </div>`).join('')
    : '<div class="doc-ok-box">✓ Sin solicitudes pendientes</div>';

  /* ── Activos locales ── */
  const activosHtml = activos.length
    ? activos.map(u => `
        <div class="admin-user-row">
          <div class="admin-user-info">
            <div class="admin-user-nombre">${u.nombre}</div>
            <div class="admin-user-meta">${u.pin} · ${u.email || '—'}</div>
          </div>
          ${_rolSelect(u.pin, u.rol || 'alumno', `rolact_${u.pin}`)}
          <button class="btn-mini" onclick="handleActualizarRol('${u.pin}')">Actualizar rol</button>
        </div>`).join('')
    : '<div style="font-size:.82rem;color:var(--muted);padding:.5rem 0">Sin usuarios locales activos.</div>';

  wrap.innerHTML = `
    <div class="admin-section-hdr">Solicitudes pendientes (${pendientes.length})</div>
    ${pendientesHtml}
    <div class="admin-section-hdr" style="margin-top:1.5rem">Usuarios locales activos (${activos.length})</div>
    ${activosHtml}`;
}

function handleAprobar(pin) {
  const rol    = (document.getElementById('rol_' + pin)?.value) || 'alumno';
  const nombre = getUsuariosLocales().find(u => u.pin === pin)?.nombre || pin;
  aprobarUsuarioLocal(pin, rol);
  showToast(`✓ ${nombre} aprobado como ${rol}`);
  renderAdminTab();
}

function handleRechazar(pin) {
  rechazarUsuarioLocal(pin);
  showToast('Solicitud rechazada');
  renderAdminTab();
}

function handleActualizarRol(pin) {
  const rol = (document.getElementById('rolact_' + pin)?.value) || 'alumno';
  cambiarRolLocal(pin, rol);
  showToast(`Rol actualizado a ${rol}`);
  renderAdminTab();
}

/* ── quitarRutinaAlumno ──────────────────────────────────────*/
function quitarRutinaAlumno(pin) {
  asignarRutina(pin, null);
  showToast('Rutina quitada');
  openAlumnoDetail(pin);  // re-renderiza el cuerpo del modal
}

/* ── _renderUltimasCargas ────────────────────────────────────
   Muestra las últimas 8 cargas del alumno con notas y estado.
   ─────────────────────────────────────────────────────────── */
const _ESTADO_DOT = {
  bien:    'var(--green)',
  regular: 'var(--accent)',
  fatiga:  '#f59e0b',
  dolor:   'var(--red)',
};

function _renderUltimasCargas(metricas) {
  if (!metricas || !metricas.length) return '';

  const ultimas = metricas.slice().reverse().slice(0, 8);

  const filas = ultimas.map(m => {
    const ej = (typeof EJERCICIOS !== 'undefined')
      ? EJERCICIOS.find(e => e.id === m.ejercicioId)
      : null;
    const ejNombre = ej ? ej.nombre : m.ejercicioId;
    const d   = new Date(m.fecha + 'T12:00:00');
    const dia = d.toLocaleDateString('es-AR', { day:'numeric', month:'short' });
    const dot = m.estado ? _ESTADO_DOT[m.estado] : null;

    return `
      <div class="log-row">
        <div class="log-row-main">
          <span class="log-ejercicio">${ejNombre}</span>
          <span class="log-valor">${m.valor}${m.tipo === 'tiempo_seg' ? 's' : m.tipo === 'repeticiones' ? 'r' : 'kg'}</span>
        </div>
        ${m.notas || dot ? `
          <div class="log-row-meta">
            ${m.notas ? `<span class="log-nota">"${m.notas}"</span>` : ''}
            ${dot ? `<span class="log-estado-dot" style="background:${dot}"></span>` : ''}
          </div>` : ''}
        <span class="log-fecha-badge">${dia}</span>
      </div>`;
  }).join('');

  return `
    <div class="section-hdr" style="margin:1.25rem 0 .75rem">
      <h2>Últimas cargas</h2>
    </div>
    <div class="log-wrap log-wrap--compact">${filas}</div>`;
}

/* ── Cerrar detalle ──────────────────────────────────────────*/
function closeAlumnoDetail(e) {
  if (e && e.target !== document.getElementById('alumnoDetailModal')) return;
  document.getElementById('alumnoDetailModal').classList.remove('modal-open');
}

function closeAlumnoDetailDirect() {
  document.getElementById('alumnoDetailModal').classList.remove('modal-open');
}
