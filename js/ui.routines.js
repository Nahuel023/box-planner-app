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
let _rutinaGenerada  = null;  // rutina generada pendiente de guardar

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
    <div class="rbusq-wrap">
      <input class="rform-input rbusq-input" placeholder="🔍 Buscar y agregar ejercicio..." autocomplete="off">
      <div class="rbusq-dropdown"></div>
    </div>
    <textarea class="rform-input rbloque-contenido" rows="3"
      placeholder="Un ejercicio por línea:&#10;3×10 Sentadillas&#10;5×5 Press Banca"
    >${data.contenido || ''}</textarea>`;
  bloquesWrap.appendChild(bDiv);

  /* Conectar buscador al textarea */
  const searchInp = bDiv.querySelector('.rbusq-input');
  const textarea  = bDiv.querySelector('.rbloque-contenido');
  if (searchInp) _attachBusqListener(searchInp, textarea);
}

/* ── Buscador inline de ejercicios para el builder ───────────
   Busca en _ejerciciosCache (Supabase) con fallback a EJERCICIOS
   (demo). Al seleccionar inserta "3×10 Nombre" en el textarea.
   ─────────────────────────────────────────────────────────── */
function _attachBusqListener(input, textarea) {
  let _timer = null;
  const dropdown = input.parentElement.querySelector('.rbusq-dropdown');
  if (!dropdown) return;

  input.addEventListener('input', () => {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      const q    = input.value.trim();
      const disc = document.getElementById('rDisc')?.value || '';

      if (q.length < 2) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
      }

      /* Buscar en cache Supabase */
      let resultados = buscarEjercicios(q, disc ? [disc] : []);

      /* Fallback a datos demo si el cache está vacío */
      if (!resultados.length && typeof EJERCICIOS !== 'undefined') {
        resultados = EJERCICIOS
          .filter(e => e.nombre.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 12)
          .map(e => ({ nombre: e.nombre, musculo_principal: e.categoria || '' }));
      }

      if (!resultados.length) {
        dropdown.innerHTML = '<div class="rbusq-noresult">Sin resultados</div>';
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = resultados.map(e =>
        `<div class="rbusq-item" data-nombre="${e.nombre}">
           <span class="rbusq-nombre">${e.nombre}</span>
           <span class="rbusq-musculo">${e.musculo_principal || ''}</span>
         </div>`
      ).join('');
      dropdown.style.display = 'block';

      /* Click → insertar en textarea como "3×10 Nombre" */
      dropdown.querySelectorAll('.rbusq-item').forEach(item => {
        item.addEventListener('mousedown', ev => {
          ev.preventDefault();
          const linea = `3×10 ${item.dataset.nombre}`;
          textarea.value = textarea.value.trim()
            ? textarea.value.trimEnd() + '\n' + linea
            : linea;
          input.value = '';
          dropdown.innerHTML = '';
          dropdown.style.display = 'none';
          textarea.focus();
        });
      });
    }, 150);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.innerHTML = ''; dropdown.style.display = 'none'; }, 200);
  });
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
      /* Formato generador: tiene ejercicios[] en lugar de bloques[] */
      if (d.ejercicios) {
        return {
          label: diaLabel || `Día ${d.dia} — ${d.titulo || ''}`,
          bloques: [{
            tipo:     _bloqueTypeFromBloque(d.bloque),
            label:    d.titulo || '',
            contenido:(d.ejercicios || []).map(e => `${e.series}×${e.reps} ${e.nombre}`).join('\n'),
          }],
        };
      }
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

  body.innerHTML = `
    <p style="font-size:.83rem;color:var(--muted);margin-bottom:1rem">
      Rutina: <strong style="color:var(--text)">${rutina?.nombre || rutinaId}</strong>
    </p>
    <div class="rform-group">
      <label class="rform-label">Buscar alumno</label>
      <input id="rAlumnoBusqueda" class="rform-input" placeholder="Nombre, PIN o disciplina…"
             oninput="_renderAsignarAlumnos(this.value)" autocomplete="off" spellcheck="false">
    </div>
    <div id="rAlumnoLista" class="rasignar-lista"></div>
    <input type="hidden" id="rAlumnoSel" value="">
    <div id="rAsignarConfirm" style="display:none;margin-top:.75rem">
      <div id="rAsignarSelNombre" class="rasignar-sel-nombre"></div>
      <button class="metric-save-btn" onclick="submitAsignarRutina()" style="margin-top:.75rem">
        Confirmar asignación
      </button>
    </div>`;

  _renderAsignarAlumnos('');
  modal.classList.add('modal-open');
}

function _renderAsignarAlumnos(query) {
  const lista = document.getElementById('rAlumnoLista');
  if (!lista) return;

  const q       = (query || '').toLowerCase().trim();
  const alumnos = state.panelAlumnos.map(p => p.alumno);
  const filtrados = q
    ? alumnos.filter(a =>
        a.nombre.toLowerCase().includes(q) ||
        a.pin.toLowerCase().includes(q) ||
        (a.disciplina || '').toLowerCase().includes(q)
      )
    : alumnos;

  if (!filtrados.length) {
    lista.innerHTML = '<div style="font-size:.8rem;color:var(--muted);padding:.5rem 0">Sin resultados</div>';
    return;
  }

  lista.innerHTML = filtrados.slice(0, 12).map(a => {
    const disc = a.disciplina || '—';
    return `
      <div class="rasignar-row" onclick="_seleccionarAlumnoAsignar('${a.pin}','${a.nombre.replace(/'/g,"\\'")}')">
        <div>
          <div style="font-size:.88rem;font-weight:500">${a.nombre}</div>
          <div style="font-size:.72rem;color:var(--muted);font-family:var(--font-mono)">${a.pin} · ${disc}</div>
        </div>
        <span style="color:var(--muted);font-size:1rem">›</span>
      </div>`;
  }).join('');
}

function _seleccionarAlumnoAsignar(pin, nombre) {
  document.getElementById('rAlumnoSel').value      = pin;
  document.getElementById('rAlumnoBusqueda').value = nombre;
  document.getElementById('rAlumnoLista').innerHTML = '';
  const conf = document.getElementById('rAsignarConfirm');
  const lbl  = document.getElementById('rAsignarSelNombre');
  if (conf) conf.style.display = '';
  if (lbl)  lbl.innerHTML = `Asignar a <strong>${nombre}</strong>`;
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
  _rDiaCount      = 0;
  _rutinaGenerada = null;
}

/* ════════════════════════════════════════════════════════════
   GENERADOR DE RUTINAS  (usa svc.generator.js)
   ════════════════════════════════════════════════════════════ */
function openGenerarRutinaModal() {
  console.log('[Generador] openGenerarRutinaModal llamado');
  _rutinaGenerada = null;
  const modal  = document.getElementById('rutinaModal');
  const titulo = document.getElementById('rutinaModalTitulo');
  const body   = document.getElementById('rutinaModalBody');
  if (!modal) { console.error('[Generador] rutinaModal no encontrado en el DOM'); return; }

  titulo.textContent = 'Generar rutina';

  /* Opciones de alumnos */
  const alumnosOpts = (state.panelAlumnos || []).map(p => {
    const a = p.alumno;
    return `<option value="${a.pin}">${a.nombre} (${a.disciplina || '—'})</option>`;
  }).join('');

  /* Opciones de disciplina */
  const discOpts = (typeof DISCIPLINAS !== 'undefined' ? DISCIPLINAS : [])
    .map(d => `<option value="${d.id}">${d.nombre}</option>`)
    .join('');

  body.innerHTML = `
    <div class="rform-group">
      <label class="rform-label">Alumno (opcional — para obtener restricciones)</label>
      <select id="genAlumno" class="rform-input" onchange="genActualizarDisc()">
        <option value="">— elegir alumno —</option>
        ${alumnosOpts}
      </select>
    </div>
    <div class="rform-row">
      <div class="rform-group">
        <label class="rform-label">Disciplina</label>
        <select id="genDisc" class="rform-input">
          <option value="">— elegir —</option>${discOpts}
        </select>
      </div>
      <div class="rform-group">
        <label class="rform-label">Frecuencia (días/sem)</label>
        <select id="genFrec" class="rform-input">
          <option value="3">3 días</option>
          <option value="4" selected>4 días</option>
          <option value="5">5 días</option>
          <option value="6">6 días</option>
        </select>
      </div>
    </div>
    <div class="rform-row">
      <div class="rform-group">
        <label class="rform-label">Objetivo</label>
        <select id="genObj" class="rform-input">
          <option value="hipertrofia">Hipertrofia</option>
          <option value="fuerza">Fuerza</option>
          <option value="cardio">Cardio</option>
          <option value="resistencia">Resistencia</option>
        </select>
      </div>
      <div class="rform-group">
        <label class="rform-label">Nivel</label>
        <select id="genNivel" class="rform-input">
          <option value="principiante">Principiante</option>
          <option value="intermedio" selected>Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
      </div>
    </div>
    <div id="genError" style="display:none"></div>
    <button class="metric-save-btn" onclick="submitGenerarRutina()" style="margin-top:.75rem">
      Generar rutina ⚡
    </button>
    <div id="genPreviewWrap" style="margin-top:1.25rem"></div>`;

  try {
    modal.classList.add('modal-open');
    console.log('[Generador] modal abierto OK');
  } catch (e) {
    console.error('[Generador] error abriendo modal:', e);
  }
}

/* Cuando se selecciona alumno, auto-completar disciplina */
function genActualizarDisc() {
  const pin = document.getElementById('genAlumno')?.value;
  if (!pin) return;
  const entrada = (state.panelAlumnos || []).find(p => p.alumno.pin === pin);
  if (!entrada) return;

  /* Leer disciplinas del alumno (array de ids) */
  let disciplinas = [];
  if (typeof isSupabaseMode === 'function' && isSupabaseMode()) {
    const sbUser = getUsuariosLocales().find(u => u.pin === pin.toUpperCase());
    disciplinas = sbUser?.disciplinas || [];
  } else {
    const localData  = JSON.parse(localStorage.getItem('bp_nuevos_usuarios') || '{}');
    const localUser  = localData[pin.toUpperCase()];
    const override   = JSON.parse(localStorage.getItem('bp_demo_overrides') || '{}')[pin.toUpperCase()];
    const demoAlumno = (typeof ALUMNOS !== 'undefined') ? ALUMNOS.find(a => a.id.toUpperCase() === pin.toUpperCase()) : null;
    disciplinas = localUser?.disciplinas || override?.disciplinas || demoAlumno?.disciplinas || [];
  }
  const sel = document.getElementById('genDisc');
  if (sel && disciplinas.length) sel.value = disciplinas[0];
}

function submitGenerarRutina() {
  const errDiv = document.getElementById('genError');
  errDiv.style.display = 'none';

  const pin        = document.getElementById('genAlumno')?.value  || '';
  const disciplina = document.getElementById('genDisc')?.value    || '';
  const frecuencia = parseInt(document.getElementById('genFrec')?.value || '4');
  const objetivo   = document.getElementById('genObj')?.value     || 'hipertrofia';
  const nivel      = document.getElementById('genNivel')?.value   || 'intermedio';

  if (!disciplina) {
    _genShowError('Elegí una disciplina para generar la rutina.');
    return;
  }

  /* Restricciones de lesiones del alumno (vacío si no hay alumno) */
  const restricciones = pin ? getRestriccionesAlumno(pin) : [];

  try {
    const rutina = generarRutina({
      disciplina, objetivo, nivel, frecuencia,
      sexo: 'mixto', restricciones,
      alumnoPin: pin || 'doc',
    });
    _rutinaGenerada = rutina;
    _genRenderPreview(rutina, pin);
  } catch (e) {
    _genShowError(e.message);
    console.error('generarRutina:', e);
  }
}

function _genShowError(msg) {
  const d = document.getElementById('genError');
  if (!d) return;
  d.className      = 'gen-error-box';
  d.textContent    = msg;
  d.style.display  = 'block';
}

function _genRenderPreview(rutina, pin) {
  const wrap = document.getElementById('genPreviewWrap');
  if (!wrap) return;

  const diasHtml = rutina.dias.map(d => {
    const ejItems = d.ejercicios.map(e =>
      `<div class="gen-preview-ej">
        <span class="gen-preview-ej-series">${e.series}×${e.reps}</span>
        <span>${e.nombre}</span>
       </div>`
    ).join('');
    return `
      <div class="gen-preview-day">
        <div class="gen-preview-day-title">Día ${d.dia} — ${d.titulo}</div>
        ${ejItems}
      </div>`;
  }).join('');

  const alumnoNombre = pin
    ? (state.panelAlumnos.find(p => p.alumno.pin === pin)?.alumno.nombre || pin)
    : '';

  wrap.innerHTML = `
    <div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.6rem">
      Vista previa — ${rutina.nombre}
    </div>
    ${diasHtml}
    <div style="display:flex;gap:.6rem;margin-top:1rem;flex-wrap:wrap">
      <button class="metric-save-btn" onclick="confirmarGuardarGenerada('${pin}')" style="flex:1">
        Guardar rutina
      </button>
      ${pin ? `<button class="btn-mini" onclick="confirmarGuardarGenerada('${pin}', true)">
        Guardar y asignar a ${alumnoNombre}
      </button>` : ''}
    </div>`;
}

function confirmarGuardarGenerada(pin, asignar = false) {
  if (!_rutinaGenerada) return;

  /* Convertir formato generador { ejercicios[] } → formato editor { bloques[] }
     para que openEditarRutinaModal pueda pre-poblar el formulario correctamente. */
  const rutinaParaGuardar = {
    ..._rutinaGenerada,
    dias: (_rutinaGenerada.dias || []).map(d => ({
      label: `Día ${d.dia} — ${d.titulo}`,
      bloques: [{
        tipo:     _bloqueTypeFromBloque(d.bloque),
        label:    d.titulo || '',
        contenido:(d.ejercicios || []).map(e => `${e.series}×${e.reps} ${e.nombre}`).join('\n'),
      }],
    })),
  };

  saveCustomRutina(rutinaParaGuardar);
  if (asignar && pin) asignarRutina(pin, rutinaParaGuardar.id);
  closeRutinaModalDirect();
  renderDocenteRutinas();
  const msg = asignar
    ? `✓ Rutina generada y asignada a ${state.panelAlumnos.find(p => p.alumno.pin === pin)?.alumno.nombre || pin}`
    : `✓ "${rutinaParaGuardar.nombre}" guardada`;
  showToast(msg);
}

/* Mapea el bloque del generador al tipo de bloque del editor */
function _bloqueTypeFromBloque(bloque) {
  const map = {
    push: 'strength',  pull: 'strength',     legs: 'strength',
    upper_push: 'strength', upper_pull: 'strength', lower: 'strength',
    chest_tri: 'strength',  back_bi: 'strength',    shoulders: 'strength',
    fullbody: 'strength',   strength: 'strength',
    metcon: 'metcon',       conditioning: 'metcon',
    skill: 'metcon',        recovery: 'core',        core: 'core',
    snatch: 'wl',           clean_jerk: 'wl',        technique: 'wl',
    accessory: 'core',
  };
  return map[bloque] || 'metcon';
}
