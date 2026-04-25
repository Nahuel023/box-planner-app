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
let _filtroDoc   = 'todos';   // backward compat (usado en toggleFiltroDoc legacy)
let _docBusqueda = '';        // texto de búsqueda libre
let _docFiltros  = new Set(); // chips activos: 'atencion' | 'sinCarga' | disciplina ID

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
   Lista comprimida + buscador + chips de filtros dinámicos.
   ════════════════════════════════════════════════════════════ */
function renderDocenteAlumnos() {
  const wrap  = document.getElementById('docAlumnosWrap');
  const badge = document.getElementById('docAlumnosBadge');
  if (!wrap) return;

  const todos = state.panelAlumnos;
  if (badge) badge.textContent = todos.length;

  _renderFiltroChips(todos);

  const lista = _aplicarFiltros(todos);

  if (!lista.length) {
    wrap.innerHTML = (_docBusqueda || _docFiltros.size)
      ? '<div class="doc-ok-box">Sin resultados para esta búsqueda.</div>'
      : '<div class="error-box">No hay alumnos cargados.</div>';
    return;
  }

  wrap.innerHTML = lista.map(entrada => {
    const { alumno, cargaHoy, ultimaCarga, diasSinCarga, estancado, necesitaAtencion } = entrada;

    const tiempoDesde   = _diasDesde(ultimaCarga);
    const actividadHtml = cargaHoy
      ? '<span class="doc-row-actividad doc-actividad--hoy">hoy</span>'
      : tiempoDesde
        ? `<span class="doc-row-actividad">${tiempoDesde}</span>`
        : '<span class="doc-row-actividad doc-actividad--nunca">nunca</span>';

    let alertaHtml = '';
    if (necesitaAtencion) {
      const motivos = [];
      if (!ultimaCarga)            motivos.push('sin registros');
      else if (diasSinCarga >= 7)  motivos.push(`${diasSinCarga}d`);
      if (estancado)               motivos.push('estancado');
      alertaHtml = `<span class="doc-row-alerta">⚠ ${motivos.join(' · ')}</span>`;
    }

    const discTags = (alumno.disciplinas || []).map(id => {
      const d = (typeof DISCIPLINAS !== 'undefined') ? DISCIPLINAS.find(x => x.id === id) : null;
      return `<span class="doc-row-disc-tag">${d ? d.nombre : id}</span>`;
    }).join('');

    return `
      <div class="doc-alumno-row${necesitaAtencion ? ' doc-alumno-row--alerta' : ''}"
           onclick="openAlumnoDetail('${alumno.pin}')">
        <div class="doc-row-left">
          <div class="doc-row-nombre">${alumno.nombre}</div>
          <div class="doc-row-meta">
            ${discTags || `<span class="doc-row-disc-tag doc-row-disc-tag--muted">${alumno.disciplina || '—'}</span>`}
            <span class="doc-row-dias">${alumno.dias}d/sem</span>
          </div>
        </div>
        <div class="doc-row-right">
          ${alertaHtml}
          ${actividadHtml}
          <span class="doc-row-arrow">›</span>
        </div>
      </div>`;
  }).join('');
}

/* ── Renderizar chips de filtros ─────────────────────────────*/
function _renderFiltroChips(todos) {
  const wrap = document.getElementById('docFiltrosWrap');
  if (!wrap) return;

  const alertas   = todos.filter(p => p.necesitaAtencion).length;
  const sinCarga  = todos.filter(p => !p.cargaHoy && p.diasSinCarga >= 7).length;

  /* Disciplinas únicas entre todos los alumnos */
  const discMap = {};
  todos.forEach(p => {
    (p.alumno.disciplinas || []).forEach(id => {
      if (!discMap[id]) {
        const d = (typeof DISCIPLINAS !== 'undefined') ? DISCIPLINAS.find(x => x.id === id) : null;
        discMap[id] = d ? d.nombre : id;
      }
    });
  });

  const chips = [
    { id: 'atencion', label: `⚠ Atención`, count: alertas },
    { id: 'sinCarga', label: `Sin carga`,  count: sinCarga },
    ...Object.entries(discMap).map(([id, nombre]) => ({ id, label: nombre, count: null })),
  ];

  wrap.innerHTML = chips.map(c => {
    const activo = _docFiltros.has(c.id);
    const cnt    = c.count !== null ? ` <span class="chip-count">${c.count}</span>` : '';
    return `<button class="doc-chip${activo ? ' doc-chip--active' : ''}"
               onclick="toggleDocChip('${c.id}')">${c.label}${cnt}</button>`;
  }).join('');
}

/* ── Aplicar búsqueda + filtros ──────────────────────────────*/
function _aplicarFiltros(lista) {
  let res = lista;

  if (_docBusqueda) {
    const q = _docBusqueda.toLowerCase();
    res = res.filter(p =>
      p.alumno.nombre.toLowerCase().includes(q) ||
      p.alumno.pin.toLowerCase().includes(q)
    );
  }

  if (_docFiltros.has('atencion')) res = res.filter(p => p.necesitaAtencion);
  if (_docFiltros.has('sinCarga')) res = res.filter(p => !p.cargaHoy && p.diasSinCarga >= 7);

  /* Chips de disciplina activos */
  const discActivos = [..._docFiltros].filter(f => f !== 'atencion' && f !== 'sinCarga');
  if (discActivos.length) {
    res = res.filter(p =>
      discActivos.some(d => (p.alumno.disciplinas || []).includes(d))
    );
  }

  return res;
}

/* ── Handlers de búsqueda / chips ────────────────────────────*/
function buscarDocAlumnos(val) {
  _docBusqueda = (val || '').trim();
  renderDocenteAlumnos();
}

function toggleDocChip(id) {
  if (_docFiltros.has(id)) _docFiltros.delete(id);
  else _docFiltros.add(id);
  renderDocenteAlumnos();
}

/* ── Alternar filtro (backward compat) ───────────────────────*/
function toggleFiltroDoc() {
  toggleDocChip('atencion');
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

    <div class="detail-tabs">
      <button class="detail-tab detail-tab--active" id="detailTabResumen"
              onclick="switchAlumnoTab('resumen')">Resumen</button>
      <button class="detail-tab" id="detailTabEvolucion"
              onclick="switchAlumnoTab('evolucion')">Evolución</button>
    </div>

    <div id="detailPanelResumen">
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
      </div>
    </div>

    <div id="detailPanelEvolucion" style="display:none">
      ${_renderEvolucionSection(rms, metricas)}
    </div>`;

  overlay.classList.add('modal-open');
}

function switchAlumnoTab(tab) {
  document.getElementById('detailPanelResumen').style.display  = tab === 'resumen'   ? '' : 'none';
  document.getElementById('detailPanelEvolucion').style.display = tab === 'evolucion' ? '' : 'none';
  document.getElementById('detailTabResumen').classList.toggle('detail-tab--active',  tab === 'resumen');
  document.getElementById('detailTabEvolucion').classList.toggle('detail-tab--active', tab === 'evolucion');
}

/* ── _renderEvolucionSection ─────────────────────────────────
   C.11 — Vista de evolución: actividad mensual + sparklines.
   ─────────────────────────────────────────────────────────── */
const _MESES_CORTO = ['E','F','M','A','M','J','J','A','S','O','N','D'];

function _renderEvolucionSection(rms, metricas) {
  /* ── Actividad mensual (cantidad de cargas por mes) ────── */
  const actMensual = new Array(12).fill(0);
  (metricas || []).forEach(m => {
    const mes = new Date(m.fecha + 'T12:00:00').getMonth();
    actMensual[mes]++;
  });

  const maxAct  = Math.max(...actMensual, 1);
  const mesHoy  = new Date().getMonth();
  const barras  = actMensual.map((n, i) => {
    const h   = Math.round((n / maxAct) * 52);
    const act = i === mesHoy ? 'evo-bar--current' : '';
    return `
      <div class="evo-bar-col">
        <div class="evo-bar-val">${n || ''}</div>
        <div class="evo-bar ${act}" style="height:${Math.max(h, n > 0 ? 4 : 0)}px"></div>
        <div class="evo-bar-lbl">${_MESES_CORTO[i]}</div>
      </div>`;
  }).join('');

  const actividadHtml = `
    <div class="evo-section">
      <div class="evo-section-title">Actividad mensual</div>
      <div class="evo-bars">${barras}</div>
      <div class="evo-total">Total: ${(metricas || []).length} registros</div>
    </div>`;

  /* ── Sparklines por ejercicio ──────────────────────────── */
  const sparks = (rms || [])
    .map(rm => {
      const data = rm.meses.map((v, i) => ({ v, i })).filter(x => x.v !== null);
      if (data.length < 2) return null;

      const vals   = data.map(x => x.v);
      const min    = Math.min(...vals);
      const max    = Math.max(...vals);
      const range  = max - min || 1;
      const W = 260, H = 52, padX = 12, padY = 6;

      const pts = data.map(({ v }, idx) => [
        padX + (idx / (data.length - 1)) * (W - 2 * padX),
        padY + (1 - (v - min) / range) * (H - 2 * padY),
      ]);

      const line  = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      const lastV = vals[vals.length - 1];
      const firstV = vals[0];
      const pct   = ((lastV - firstV) / firstV * 100).toFixed(1);
      const color = parseFloat(pct) >= 0 ? 'var(--green)' : 'var(--red)';
      const lp    = pts[pts.length - 1];
      const labMes = _MESES_CORTO[data[data.length - 1].i];

      return `
        <div class="evo-spark-card">
          <div class="evo-spark-hdr">
            <span class="evo-spark-name">${rm.ejercicio}</span>
            <span class="evo-spark-badge" style="color:${color}">
              ${parseFloat(pct) >= 0 ? '+' : ''}${pct}%
            </span>
          </div>
          <svg viewBox="0 0 ${W} ${H}" class="evo-spark-svg">
            <polyline points="${line}"
              fill="none" stroke="${color}" stroke-width="1.8"
              stroke-linejoin="round" stroke-linecap="round"/>
            ${pts.map((p, i) => `
              <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5"
                fill="${color}" opacity="${i === pts.length - 1 ? 1 : .45}"/>`).join('')}
            <text x="${lp[0].toFixed(1)}" y="${(lp[1] - 6).toFixed(1)}"
              fill="${color}" font-size="9" text-anchor="middle"
              font-family="monospace">${lastV}kg</text>
          </svg>
          <div class="evo-spark-range">
            <span>${_MESES_CORTO[data[0].i]}: ${firstV}kg</span>
            <span>${labMes}: ${lastV}kg · mejor: ${rm.mejor}kg</span>
          </div>
        </div>`;
    })
    .filter(Boolean)
    .join('');

  const sparksHtml = sparks
    ? `<div class="evo-section" style="margin-top:1.1rem">
        <div class="evo-section-title">Progreso por ejercicio</div>
        <div class="evo-sparks">${sparks}</div>
       </div>`
    : `<div class="evo-empty">Sin suficientes datos para mostrar progreso.</div>`;

  return actividadHtml + sparksHtml;
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

  let activeDisciplinas = [];
  let activeDias        = 3;

  if (typeof isSupabaseMode === 'function' && isSupabaseMode()) {
    /* En modo Supabase, getUsuariosLocales() devuelve filas crudas con disciplinas/dias */
    const sbUser = getUsuariosLocales().find(u => u.pin === pin.toUpperCase());
    if (sbUser) {
      activeDisciplinas = sbUser.disciplinas || [];
      activeDias        = sbUser.dias !== undefined ? sbUser.dias : 3;
    }
  } else {
    const localData  = JSON.parse(localStorage.getItem('bp_nuevos_usuarios') || '{}');
    const localUser  = localData[pin.toUpperCase()];
    const override   = JSON.parse(localStorage.getItem('bp_demo_overrides') || '{}')[pin.toUpperCase()];
    const demoAlumno = (typeof ALUMNOS !== 'undefined') ? ALUMNOS.find(a => a.id.toUpperCase() === pin.toUpperCase()) : null;

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
  const activas    = (typeof getTodasRutinasAsignadas === 'function')
    ? getTodasRutinasAsignadas(pin)
    : (getRutinaAsignada(pin) ? [{ rutinaId: getRutinaAsignada(pin), fecha_asignacion: '' }] : []);

  if (!activas.length) return '';

  const allRutinas = getAllRutinas();

  const _nombre = (rutinaId) => {
    if (!rutinaId) return '<em style="color:var(--muted)">Sin rutina</em>';
    return allRutinas[rutinaId]
      ? allRutinas[rutinaId].nombre
      : `<em style="color:var(--muted)">${rutinaId}</em>`;
  };

  const _diaDesde = fecha => {
    if (!fecha) return null;
    const diff = new Date() - new Date(fecha + 'T00:00:00');
    const n    = Math.floor(diff / 86400000) + 1;
    return n >= 1 ? n : null;
  };
  const _fmtFecha = fecha => {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
  };

  const activasHtml = activas.map(a => {
    const dia   = _diaDesde(a.fecha_asignacion);
    const desde = _fmtFecha(a.fecha_asignacion);
    return `
    <div class="detail-rutina-actual">
      <div style="flex:1;min-width:0">
        <div style="font-size:.9rem;font-weight:500">${_nombre(a.rutinaId)}</div>
        <div class="detail-hist-fecha">
          Inicio: ${desde}${dia ? ` · <strong>Día ${dia}</strong>` : ''}
        </div>
      </div>
      <button class="btn-mini btn-mini--danger"
        onclick="quitarRutinaAlumno('${pin}', '${a.rutinaId}')">Quitar</button>
    </div>`;
  }).join('');

  return `
    <div class="section-hdr" style="margin:1.25rem 0 .75rem">
      <h2>Rutinas asignadas (${activas.length})</h2>
    </div>
    <div class="detail-rutina-box">
      ${activasHtml}
    </div>`;
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
    ? activos.map(u => {
        const rolesArr    = Array.isArray(u.roles) ? u.roles : [u.rol || 'alumno'];
        const esDobleRol  = rolesArr.length > 1 || (rolesArr[0] !== 'alumno' && rolesArr.includes('alumno'));
        const dualChecked = rolesArr.includes('alumno') && rolesArr.some(r => r === 'docente' || r === 'admin');
        return `
        <div class="admin-user-row">
          <div class="admin-user-info">
            <div class="admin-user-nombre">${u.nombre}</div>
            <div class="admin-user-meta">${u.pin} · ${u.email || '—'}</div>
          </div>
          ${_rolSelect(u.pin, u.rol || 'alumno', `rolact_${u.pin}`)}
          <label class="admin-dual-label" title="Puede ver su propio perfil de alumno">
            <input type="checkbox" id="dualrol_${u.pin}" ${dualChecked ? 'checked' : ''}
              onchange="handleToggleDualRol('${u.pin}')">
            también alumno
          </label>
          <button class="btn-mini" onclick="handleActualizarRol('${u.pin}')">Actualizar</button>
        </div>`;
      }).join('')
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
  const rol      = (document.getElementById('rolact_' + pin)?.value) || 'alumno';
  const dualChk  = document.getElementById('dualrol_' + pin);
  const dualRol  = dualChk?.checked && rol !== 'alumno';
  const rolesArr = dualRol ? [rol, 'alumno'] : [rol];
  if (typeof actualizarRolesLocal === 'function') {
    actualizarRolesLocal(pin, rolesArr);
  } else {
    cambiarRolLocal(pin, rol);
  }
  showToast(`Rol actualizado a ${rol}${dualRol ? ' + alumno' : ''}`);
  renderAdminTab();
}

function handleToggleDualRol(pin) {
  const rolSelect = document.getElementById('rolact_' + pin);
  const dualChk   = document.getElementById('dualrol_' + pin);
  if (!rolSelect || !dualChk) return;
  const rol      = rolSelect.value || 'alumno';
  const dualRol  = dualChk.checked && rol !== 'alumno';
  const rolesArr = dualRol ? [rol, 'alumno'] : [rol];
  if (typeof actualizarRolesLocal === 'function') {
    actualizarRolesLocal(pin, rolesArr);
    showToast(`${dualRol ? 'Acceso alumno activado' : 'Acceso alumno quitado'}`);
  }
}

/* ── quitarRutinaAlumno ──────────────────────────────────────*/
function quitarRutinaAlumno(pin, rutinaId) {
  if (rutinaId && typeof quitarRutina === 'function') {
    quitarRutina(pin, rutinaId);
  } else {
    asignarRutina(pin, null);  // fallback modo demo/legacy
  }
  showToast('Rutina quitada');
  openAlumnoDetail(pin);
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
    const ejCache  = (typeof getEjercicioById === 'function') ? getEjercicioById(m.ejercicioId) : null;
    const ej       = ejCache || ((typeof EJERCICIOS !== 'undefined') ? EJERCICIOS.find(e => e.id === m.ejercicioId) : null);
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

/* ════════════════════════════════════════════════════════════
   F.20 — Admin stats sub-tab
   ════════════════════════════════════════════════════════════ */
function switchAdminSub(sub) {
  const tabWrap   = document.getElementById('adminTabWrap');
  const statsWrap = document.getElementById('adminStatsWrap');
  const btnU      = document.getElementById('adminSubUsuarios');
  const btnS      = document.getElementById('adminSubStats');
  if (!tabWrap || !statsWrap) return;

  if (sub === 'stats') {
    tabWrap.style.display   = 'none';
    statsWrap.style.display = '';
    btnU?.classList.remove('admin-subnav-btn--active');
    btnS?.classList.add('admin-subnav-btn--active');
    renderStatsTab();
  } else {
    tabWrap.style.display   = '';
    statsWrap.style.display = 'none';
    btnU?.classList.add('admin-subnav-btn--active');
    btnS?.classList.remove('admin-subnav-btn--active');
  }
}

function renderStatsTab() {
  const wrap = document.getElementById('adminStatsWrap');
  if (!wrap) return;

  const hoy     = new Date().toISOString().slice(0, 10);
  const lunes   = _getAdminLunes().toISOString().slice(0, 10);
  const hace30  = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const usuarios = getUsuariosLocales().filter(u => u.estado === 'activo');

  let totalHoy = 0, totalSemana = 0;

  const rows = usuarios.map(u => {
    const mets    = (typeof getMetricsByAlumno === 'function') ? getMetricsByAlumno(u.pin) : [];
    const total   = mets.length;
    const ultObj  = mets.length ? mets.reduce((a, b) => a.fecha > b.fecha ? a : b) : null;
    const ultFecha = ultObj ? ultObj.fecha : null;

    totalHoy    += mets.filter(m => m.fecha === hoy).length;
    totalSemana += mets.filter(m => m.fecha >= lunes).length;

    let badge, badgeCls;
    if (!ultFecha) {
      badge = 'Sin cargas'; badgeCls = 'admin-act-badge--stale';
    } else if (ultFecha >= hace30) {
      badge = _diasDesde(ultFecha); badgeCls = 'admin-act-badge--ok';
    } else {
      badge = '+30 días'; badgeCls = 'admin-act-badge--stale';
    }

    return { u, total, ultFecha, badge, badgeCls };
  });

  const stale30 = rows.filter(r => r.badgeCls === 'admin-act-badge--stale').length;
  rows.sort((a, b) => (b.ultFecha || '') > (a.ultFecha || '') ? 1 : -1);

  const cardsHtml = [
    { val: usuarios.length, lbl: 'Alumnos activos',    icon: '👥', cls: '' },
    { val: totalHoy,        lbl: 'Cargas hoy',         icon: '📥', cls: '' },
    { val: totalSemana,     lbl: 'Cargas esta semana', icon: '📊', cls: '' },
    { val: stale30,         lbl: 'Sin actividad 30d',  icon: '⚠️', cls: stale30 > 0 ? 'doc-stat-val--alerta' : '' },
  ].map(c => `
    <div class="doc-stat-box">
      <div class="doc-stat-icon">${c.icon}</div>
      <div class="doc-stat-val ${c.cls}">${c.val}</div>
      <div class="doc-stat-lbl">${c.lbl}</div>
    </div>`).join('');

  const tableRows = rows.map(({ u, total, badge, badgeCls }) => `
    <tr>
      <td>
        <div style="font-size:.82rem;font-weight:500">${u.nombre}</div>
        <div class="admin-act-pin">${u.pin}</div>
      </td>
      <td style="text-align:center;font-weight:600">${total}</td>
      <td><span class="admin-act-badge ${badgeCls}">${badge}</span></td>
    </tr>`).join('');

  wrap.innerHTML = `
    <div class="admin-stat-grid">${cardsHtml}</div>
    <div class="admin-section-hdr">Actividad por alumno</div>
    <div style="overflow-x:auto">
      <table class="admin-act-table">
        <thead>
          <tr>
            <th>Alumno</th>
            <th style="text-align:center">Total cargas</th>
            <th>Última actividad</th>
          </tr>
        </thead>
        <tbody>${tableRows || '<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:1rem">Sin datos</td></tr>'}</tbody>
      </table>
    </div>`;
}

function _getAdminLunes() {
  const d   = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}
