/* ════════════════════════════════════════════════════════════
   BOX PLANNER — CAPA DE RENDERIZADO
   ────────────────────────────────────────────────────────────
   Responsabilidades:
     - Leer `state` (global, definido en app.js)
     - Escribir en el DOM
     - Nunca modificar `state` directamente
   ════════════════════════════════════════════════════════════ */

/* ── Meses ───────────────────────────────────────────────────*/
const MESES_CORTO  = ['E','F','M','A','M','J','J','A','S','O','N','D'];
const MESES_LARGO  = ['Enero','Feb','Marzo','Abril','Mayo','Junio','Julio','Agosto','Sep','Oct','Nov','Dic'];
const MESES_BADGE  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/* ── Clases CSS por tipo de bloque ───────────────────────────*/
const SEC_CLASS = {
  structure: 'sec-structure', strength: 'sec-strength', wl:   'sec-wl',
  metcon:    'sec-metcon',    core:     'sec-core',     tabata:'sec-tabata',
};

/* ── renderStats ─────────────────────────────────────────────
   Muestra las 3 stat-cards con el RM del mes actual.
   ─────────────────────────────────────────────────────────── */
function renderStats() {
  const rms = state.rms;
  const grid = document.getElementById('statGrid');

  if (!rms.length) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:.85rem;grid-column:1/-1">No hay RMs registrados aún.</p>';
    return;
  }

  const mesActual = new Date().getMonth();
  document.getElementById('rmMesBadge').textContent = MESES_BADGE[mesActual];

  grid.innerHTML = rms.slice(0, 3).map(rm => {
    const curr = rm.meses[mesActual] || rm.mejor || 0;
    const prev = rm.meses.slice(0, mesActual).reverse().find(v => v !== null);
    const diff = (curr && prev) ? curr - prev : null;
    const cls  = diff === null ? 'prog-flat' : diff > 0 ? 'prog-up' : 'prog-down';
    const txt  = diff === null ? '—' : diff > 0 ? `+${diff.toFixed(1)}kg` : `${diff.toFixed(1)}kg`;
    const name = rm.ejercicio.split(' ').slice(0, 2).join(' ');
    return `
      <div class="stat-box">
        <div class="stat-val">${curr || '—'}</div>
        <div class="stat-lbl">${name}</div>
        <div class="stat-prog ${cls}">${txt}</div>
      </div>`;
  }).join('');
}

/* ── renderRMTable ───────────────────────────────────────────
   Tabla completa de ejercicios con mes actual, mejor marca y delta.
   ─────────────────────────────────────────────────────────── */
function renderRMTable() {
  const rms  = state.rms;
  const wrap = document.getElementById('rmTableWrap');

  if (!rms.length) {
    wrap.innerHTML = '<div class="error-box">No hay datos de RMs para este alumno.</div>';
    return;
  }

  const mesActual = new Date().getMonth();

  const rows = rms.map(rm => {
    const curr = rm.meses[mesActual];
    const prev = rm.meses.slice(0, mesActual).reverse().find(v => v !== null);
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

  wrap.innerHTML = `
    <div class="rm-table">
      <div class="rm-table-header">
        <span>Ejercicio</span><span>Este mes</span><span>Mejor</span><span>Δ</span>
      </div>
      ${rows}
    </div>`;
}

/* ── renderSparks ────────────────────────────────────────────
   Gráfico SVG de evolución mensual por ejercicio.
   ─────────────────────────────────────────────────────────── */
function renderSparks() {
  const rms  = state.rms;
  const wrap = document.getElementById('sparkWrap');
  if (!rms.length) { wrap.innerHTML = ''; return; }

  wrap.innerHTML = rms.map(rm => {
    const data = rm.meses.filter(v => v !== null);
    if (data.length < 2) return '';

    const labels = MESES_CORTO.slice(0, data.length);
    const W = 300, H = 60, padX = 20, padY = 8;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pts = data.map((v, i) => [
      padX + (i / (data.length - 1)) * (W - 2 * padX),
      padY + (1 - (v - min) / range) * (H - 2 * padY),
    ]);

    const polyline = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const lastPt   = pts[pts.length - 1];
    const progPct  = ((data[data.length - 1] - data[0]) / data[0] * 100).toFixed(1);
    const color    = parseFloat(progPct) >= 0 ? 'var(--green)' : 'var(--red)';

    return `
      <div class="spark-card">
        <div class="spark-title">
          <strong>${rm.ejercicio}</strong>
          <span class="rm-badge">${data[data.length-1]}kg  /  ${parseFloat(progPct)>=0?'+':''}${progPct}%</span>
        </div>
        <svg class="spark-svg" viewBox="0 0 ${W} ${H}" height="60">
          <polyline points="${polyline}"
            fill="none" stroke="${color}" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round"/>
          ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}"
            r="${i === data.length-1 ? 4 : 2.5}"
            fill="${i === data.length-1 ? color : 'rgba(255,255,255,.2)'}"
            stroke="${color}" stroke-width="1"/>`).join('')}
          <text x="${(lastPt[0]+6).toFixed(1)}" y="${(lastPt[1]+4).toFixed(1)}"
            font-size="10" fill="${color}" font-family="'DM Mono',monospace">${data[data.length-1]}kg</text>
          ${labels.map((l, i) => `<text x="${pts[i][0].toFixed(1)}" y="${H}"
            text-anchor="middle" font-size="9" fill="rgba(255,255,255,.3)"
            font-family="'DM Sans',sans-serif">${l}</text>`).join('')}
        </svg>
      </div>`;
  }).join('');
}

/* ── renderDayCard ───────────────────────────────────────────
   Tarjeta de un día de rutina (modo demo).
   ─────────────────────────────────────────────────────────── */
function renderDayCard(dia) {
  return `
    <div class="day-card">
      <div class="day-header">
        <span class="day-name">${dia.dia}</span>
      </div>
      <div class="day-body">
        ${(dia.secs || []).map(sec => `
          <div class="sec-block">
            <div class="sec-label ${SEC_CLASS[sec.tipo] || 'sec-structure'}">${sec.label}</div>
            ${(sec.items || []).map(it =>
              `<div class="sec-item ${it.startsWith('  ') || it.startsWith('─') ? 'indent' : ''}">${it.replace(/^  /, '')}</div>`
            ).join('')}
            ${sec.cap ? `<div class="sec-cap">⏱ Cap: ${sec.cap}</div>` : ''}
          </div>`
        ).join('')}
      </div>
    </div>`;
}

/* ── renderRutinas ───────────────────────────────────────────
   Vista de la rutina semanal. Demo usa renderDayCard;
   modo sheet usa una vista de tabla simple.
   ─────────────────────────────────────────────────────────── */
function renderRutinas() {
  const wrap = document.getElementById('rutinaWrap');
  document.getElementById('rutSemBadge').textContent = `Sem. ${getWeekNumber(new Date())}`;

  if (isDemoMode()) {
    if (!state.rutinas.length) {
      wrap.innerHTML = '<div class="error-box">No hay rutinas cargadas esta semana.</div>';
      return;
    }
    wrap.innerHTML = state.rutinas.map(dia => renderDayCard(dia)).join('');
    return;
  }

  if (!state.rutinas.length) {
    wrap.innerHTML = '<div class="error-box">No hay rutinas cargadas para esta semana.</div>';
    return;
  }

  wrap.innerHTML = state.rutinas.map(r => `
    <div class="day-card">
      <div class="day-header">
        <span class="day-name">${r.dia || 'Semana ' + r.semana}</span>
        <span style="font-size:.75rem;color:var(--muted);">${r.bloque}</span>
      </div>
      <div class="day-body">
        <div class="sec-block">
          <div class="sec-label sec-strength">${r.disciplina}</div>
          <div class="sec-item">${r.objetivo}</div>
          <div class="sec-item">${r.contenido}</div>
          ${r.carga ? `<div class="sec-cap">Carga: ${r.carga}</div>` : ''}
        </div>
      </div>
    </div>`).join('');
}

/* ── renderHistorial ─────────────────────────────────────────
   Grilla de tarjetas por mes (RMs) + log de cargas individuales.
   ─────────────────────────────────────────────────────────── */
function renderHistorial() {
  const rms  = state.rms;
  const wrap = document.getElementById('histWrap');
  if (!wrap) return;

  /* Sección 1: grid mensual de RMs */
  let gridHtml = '';
  if (rms.length) {
    const maxMes = Math.max(...rms.flatMap(r => r.meses.map((v, i) => v !== null ? i + 1 : 0)));
    const cards  = [];
    for (let m = 0; m < Math.min(maxMes, 12); m++) {
      const filas = rms.map(r => ({ ej: r.ejercicio, v: r.meses[m] })).filter(f => f.v !== null);
      if (!filas.length) continue;
      cards.push(`
        <div class="hist-card">
          <div class="hist-mes">${MESES_LARGO[m]}</div>
          ${filas.map(f => `
            <div class="hist-row">
              <span class="hist-label">${f.ej.split(' ').slice(0, 2).join(' ')}</span>
              <span class="hist-kg">${f.v} kg</span>
            </div>`).join('')}
        </div>`);
    }
    gridHtml = cards.length
      ? `<div class="hist-grid">${cards.join('')}</div>`
      : '<div class="error-box">Sin RMs registrados.</div>';
  } else {
    gridHtml = '<div class="error-box">Sin datos de RMs.</div>';
  }

  /* Sección 2: log de cargas individuales */
  const logHtml = renderLogMetricas();

  wrap.innerHTML = gridHtml + logHtml;
}

/* ── renderLogMetricas ───────────────────────────────────────
   Timeline de métricas individuales con notas y estado.
   Lee state.metricas (ordenadas por fecha desc).
   ─────────────────────────────────────────────────────────── */
const ESTADO_CONFIG = {
  bien:    { label: 'Bien',    dot: 'var(--green)' },
  regular: { label: 'Regular', dot: 'var(--accent)' },
  fatiga:  { label: 'Fatiga',  dot: '#f59e0b' },
  dolor:   { label: 'Dolor',   dot: 'var(--red)' },
};

function renderLogMetricas() {
  const metricas = (state.metricas || []).slice().reverse();  // más reciente primero
  if (!metricas.length) return '';

  /* Agrupar por fecha para mostrar el día como encabezado */
  const porFecha = {};
  metricas.forEach(m => {
    if (!porFecha[m.fecha]) porFecha[m.fecha] = [];
    porFecha[m.fecha].push(m);
  });

  const filas = Object.entries(porFecha).map(([fecha, items]) => {
    const d    = new Date(fecha + 'T12:00:00');
    const dStr = d.toLocaleDateString('es-AR', { day:'numeric', month:'short' });

    const rows = items.map(m => {
      const ej  = (typeof EJERCICIOS !== 'undefined')
        ? EJERCICIOS.find(e => e.id === m.ejercicioId)
        : null;
      const ejNombre = ej ? ej.nombre : m.ejercicioId;
      const cfg = (typeof TIPO_CONFIG !== 'undefined')
        ? (TIPO_CONFIG[m.tipo] || TIPO_CONFIG.peso_kg)
        : { unidad: '' };

      const estadoCfg = ESTADO_CONFIG[m.estado];
      const estadoHtml = estadoCfg
        ? `<span class="log-estado-dot" style="background:${estadoCfg.dot}"></span>
           <span class="log-estado-lbl" style="color:${estadoCfg.dot}">${estadoCfg.label}</span>`
        : '';

      return `
        <div class="log-row">
          <div class="log-row-main">
            <span class="log-ejercicio">${ejNombre}</span>
            <span class="log-valor">${m.valor}${cfg.unidad}</span>
          </div>
          ${m.notas || estadoCfg ? `
            <div class="log-row-meta">
              ${m.notas ? `<span class="log-nota">"${m.notas}"</span>` : ''}
              ${estadoHtml}
            </div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="log-dia">
        <div class="log-dia-hdr">${dStr}</div>
        ${rows}
      </div>`;
  }).join('');

  return `
    <div class="log-section-hdr">Cargas registradas</div>
    <div class="log-wrap">${filas}</div>`;
}

/* ── renderAll ───────────────────────────────────────────────*/
function renderAll() {
  renderStats();
  renderRMTable();
  renderSparks();
  renderRutinas();
  renderHistorial();
  renderCargar();  // definida en ui.metrics.js (cargado antes)
}
