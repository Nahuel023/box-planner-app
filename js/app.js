/* ════════════════════════════════════════════════════════════
   BOX PLANNER — APP SHELL
   ────────────────────────────────────────────────────────────
   Responsabilidades:
     - Estado global de sesión
     - Login / logout
     - Carga de datos (delega a data.js / db.demo.js)
     - Navegación por tabs
     - Inicialización (PIN en URL o sessionStorage)
   ════════════════════════════════════════════════════════════ */

/* ── Estado global ───────────────────────────────────────────
   Único objeto mutable de la app. render.js lo lee; solo app.js
   y data.js lo escriben.
   ─────────────────────────────────────────────────────────── */
let state = {
  alumno:       null,  // { pin, nombre, rol, edad, disciplina, objetivo, dias, rutina, estado }
  rms:          [],    // [{ ejercicio, cat, meses[12], mejor, prog }]  ← render.js lo lee
  rutinas:      [],    // [{ dia, secs[] }]  (demo) | [{ semana, dia, bloque, … }] (sheet)
  historial:    [],
  metricas:     [],    // [{ id, alumnoId, ejercicioId, valor, tipo, fecha, notas }]
  panelAlumnos: [],    // solo docente: [{ alumno, rms, cargaHoy, ultimaCarga, diasSinCarga, estancado, necesitaAtencion }]
};

/* ── Login ───────────────────────────────────────────────────*/
/* ── Modal de registro ───────────────────────────────────────*/
function openRegistroModal() {
  document.getElementById('registroModal').classList.add('modal-open');
}

function closeRegistroModal() {
  document.getElementById('registroModal').classList.remove('modal-open');
  document.getElementById('registroForm').reset();
  document.getElementById('regPinError').style.display = 'none';
}

async function handleRegistro(event) {
  event.preventDefault();
  const pin             = (document.getElementById('regPin').value       || '').trim().toUpperCase();
  const nombre          = (document.getElementById('regNombre').value    || '').trim();
  const email           = (document.getElementById('regEmail').value     || '').trim();
  const fechaNacimiento =  document.getElementById('regFecha').value     || '';
  const objetivo        = (document.getElementById('regObjetivo').value  || '').trim();

  const pinErr = document.getElementById('regPinError');
  /* await funciona para ambos modos: bool en localStorage, Promise en Supabase */
  if (await Promise.resolve(pinEnUso(pin))) {
    pinErr.textContent   = 'Ese PIN ya está en uso. Elegí otro.';
    pinErr.style.display = 'block';
    document.getElementById('regPin').focus();
    return;
  }
  pinErr.style.display = 'none';

  await Promise.resolve(registrarAlumnoLocal({ pin, nombre, email, fechaNacimiento, objetivo }));
  closeRegistroModal();
  showToast('Registro exitoso. Cuenta pendiente de aprobación.');
}

/* ── Login ───────────────────────────────────────────────────*/
async function handleLogin() {
  const pin = document.getElementById('pinInput').value.trim().toUpperCase();
  if (!pin) return;

  /* Cuenta registrada pero aún no aprobada por el docente */
  if (await Promise.resolve(checkAlumnoPendiente(pin))) {
    const err = document.getElementById('loginError');
    err.textContent   = 'Tu cuenta está pendiente de aprobación por el box.';
    err.style.display = 'block';
    return;
  }

  const btn = document.querySelector('.login-btn');
  btn.textContent = 'Verificando...';
  document.getElementById('loginError').style.display = 'none';

  try {
    let alumno = null;

    if (isSupabaseMode()) {
      alumno = getAlumnoDemo(pin) || await Promise.resolve(getAlumnoLocal(pin));
    } else if (isDemoMode()) {
      alumno = getAlumnoDemo(pin) || getAlumnoLocal(pin);
    } else {
      const rows = await fetchSheet(CONFIG.HOJA_ALUMNOS);
      const C = CONFIG.COL_ALU;
      const row = rows.slice(4).find(r => (r[C.ID] || '').toUpperCase() === pin);
      if (row) {
        alumno = {
          pin,
          nombre:     row[C.NOMBRE]     || '—',
          edad:       row[C.EDAD]       || '—',
          disciplina: row[C.DISCIPLINA] || '—',
          objetivo:   row[C.OBJETIVO]   || '—',
          dias:       row[C.DIAS]       || '—',
          rutina:     row[C.RUTINA]     || '—',
          estado:     row[C.ESTADO]     || '—',
        };
      }
    }

    if (!alumno) {
      document.getElementById('loginError').style.display = 'block';
      btn.textContent = 'INGRESAR →';
      return;
    }

    state.alumno = alumno;
    sessionStorage.setItem('bp_pin', pin);

    const rolesActivos = alumno.roles || [alumno.rol];
    const esDocente    = alumno.rol === 'docente' || alumno.rol === 'admin';

    if (esDocente) {
      showDocente();
      await loadDocenteData();
      /* Mostrar switcher si también tiene rol alumno */
      _updateRoleSwitchers(rolesActivos, 'docente');
    } else {
      showApp();
      await loadData();
      _updateRoleSwitchers(rolesActivos, 'alumno');
    }

  } catch (e) {
    console.error(e);
    document.getElementById('loginError').textContent = 'Error de conexión. Revisá tu internet.';
    document.getElementById('loginError').style.display = 'block';
    btn.textContent = 'INGRESAR →';
  }
}

/* ── Logout ──────────────────────────────────────────────────*/
function doLogout() {
  _stopRutinaPolling();
  sessionStorage.removeItem('bp_pin');
  state = { alumno: null, rms: [], rutinas: [], historial: [], metricas: [], panelAlumnos: [] };
  document.getElementById('appScreen').style.display     = 'none';
  document.getElementById('docenteScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display   = 'flex';
  document.getElementById('pinInput').value = '';
  document.querySelector('.login-btn').textContent = 'INGRESAR →';
}

/* ── A.3 — Refresh automático de rutinas ─────────────────────
   Detecta cambios en las asignaciones activas del alumno sin
   requerir re-login. Usa polling cada 2 min + Page Visibility
   API para reaccionar inmediatamente cuando el usuario vuelve
   a la app desde otra pantalla.
   ─────────────────────────────────────────────────────────── */
let _rutinaCheckInterval = null;
let _lastRutinaIds       = null;

function _getActiveRutinaIds() {
  if (!state.alumno) return '';
  const activas = getTodasRutinasAsignadas(state.alumno.pin);
  return activas.map(a => a.rutinaId).sort().join(',');
}

async function _checkRutinaUpdate() {
  if (!state.alumno || document.hidden) return;

  /* En Supabase, refrescar la cache antes de comparar */
  if (isSupabaseMode() && typeof refreshAsignacionesCache === 'function') {
    await refreshAsignacionesCache(state.alumno.pin);
  }

  const current = _getActiveRutinaIds();

  /* Primera llamada: solo establecer baseline */
  if (_lastRutinaIds === null) {
    _lastRutinaIds = current;
    return;
  }

  if (current === _lastRutinaIds) return;

  const prevCount = _lastRutinaIds.split(',').filter(Boolean).length;
  const newCount  = current.split(',').filter(Boolean).length;
  _lastRutinaIds  = current;

  /* Actualizar state.rutinas y re-renderizar */
  const pin     = state.alumno.pin;
  state.rutinas = getRutinasFinal(pin);
  if (typeof buildRMsFromRutinas === 'function') buildRMsFromRutinas();
  renderAll();

  /* Punto rojo en tab Rutina */
  _setRutinaNotifDot(true);

  showToast(newCount > prevCount ? 'Nueva rutina asignada' : 'Rutina actualizada');
}

function _setRutinaNotifDot(on) {
  const navBtn = document.getElementById('navRutina');
  if (!navBtn) return;
  const existing = document.getElementById('navRutinaDot');
  if (on && !existing) {
    const dot = document.createElement('span');
    dot.id = 'navRutinaDot'; dot.className = 'nav-rutina-dot';
    navBtn.appendChild(dot);
  } else if (!on && existing) {
    existing.remove();
  }
}

function _startRutinaPolling() {
  _lastRutinaIds = null;
  _checkRutinaUpdate(); /* baseline */
  _rutinaCheckInterval = setInterval(_checkRutinaUpdate, 2 * 60 * 1000);
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

function _stopRutinaPolling() {
  clearInterval(_rutinaCheckInterval);
  _rutinaCheckInterval = null;
  _lastRutinaIds       = null;
  document.removeEventListener('visibilitychange', _onVisibilityChange);
}

function _onVisibilityChange() {
  if (document.visibilityState === 'visible') _checkRutinaUpdate();
}

/* ── Cargar datos ────────────────────────────────────────────
   Demo: usa los adaptadores de db.demo.js.
   Sheet real: fetch CSV → mapea columnas según CONFIG.
   ─────────────────────────────────────────────────────────── */
async function loadData() {
  const pin = state.alumno.pin.toUpperCase();
  const rol = state.alumno.rol || 'alumno';

  if (isSupabaseMode()) {
    await initSupabaseCache(pin, rol);
    await migrateLocalMetrics(pin);
    await loadEjerciciosCache();
    await loadLesionesCache(pin, rol);
    state.rms     = getRMsDemo(pin);
    state.rutinas = getRutinasFinal(pin);
    buildRMsFromRutinas();  // poblar state.rms con ejercicios de la rutina asignada
  } else if (isDemoMode()) {
    state.rms     = getRMsDemo(pin);
    state.rutinas = getRutinasFinal(pin);
  } else {
    try {
      /* RMs */
      const rmRows = await fetchSheet(CONFIG.HOJA_RMS);
      const C = CONFIG.COL_RM;
      state.rms = rmRows.slice(3)
        .filter(r => (r[C.ALUMNO] || '').toUpperCase().includes(pin) && r[C.EJERCICIO])
        .map(r => ({
          ejercicio: r[C.EJERCICIO],
          cat:       r[C.CATEGORIA] || '',
          meses:     Array.from({ length: 12 }, (_, i) => {
            const v = parseFloat(r[C.MES_1 + i]);
            return isNaN(v) ? null : v;
          }),
          mejor: parseFloat(r[C.MEJOR])    || null,
          prog:  parseFloat(r[C.PROGRESO]) || null,
        }));

      /* Rutinas */
      const rutRows   = await fetchSheet(CONFIG.HOJA_RUTINAS);
      const R         = CONFIG.COL_RUT;
      const semActual = getWeekNumber(new Date());
      state.rutinas   = rutRows.slice(4)
        .filter(r => {
          const s = parseInt(r[R.SEMANA]);
          return s >= semActual - 1 && s <= semActual + 1;
        })
        .map(r => ({
          semana:     r[R.SEMANA],
          dia:        r[R.DIA] || r[R.FECHAS] || '',
          bloque:     r[R.BLOQUE]     || '',
          disciplina: r[R.DISCIPLINA] || '',
          objetivo:   r[R.OBJETIVO]   || '',
          contenido:  r[R.CONTENIDO]  || '',
          carga:      r[R.CARGA]      || '',
        }));

    } catch (e) {
      console.error('Error cargando datos:', e);
    }
  }

  /* Cargar métricas guardadas por el alumno y mergear en state.rms */
  loadMetrics(pin);

  renderAll();

  /* Punto rojo en tab Rutina si hay alguna asignación activa no vista */
  const histRut    = getHistorialRutinas(pin);
  const hayNoVista = histRut.some(h => h.rutinaId && !h.vista_por_alumno);
  _setRutinaNotifDot(hayNoVista);

  /* Arrancar polling de rutinas (A.3) */
  _startRutinaPolling();
}

/* ── Mostrar app ─────────────────────────────────────────────*/
function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display  = 'block';

  const a = state.alumno;

  const parts   = a.nombre.split(' ');
  const display = parts.length >= 2
    ? `${parts[0]} <span>${parts.slice(1).join(' ')}</span>`
    : a.nombre;
  document.getElementById('heroName').innerHTML = display;

  const tags = [a.disciplina, `${a.dias} días/sem`, a.objetivo].filter(t => t && t !== '—');
  document.getElementById('heroMeta').innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');

  if (isDemoMode()) {
    const pill = document.querySelector('.info-pill');
    if (pill) pill.innerHTML = '<span class="info-dot" style="background:#f59e0b"></span> Modo demo — conectá tu Google Sheet';
  }

  if (typeof updateTopbarAvatar === 'function') updateTopbarAvatar();
}

/* ── Panel docente / admin ───────────────────────────────────*/
function showDocente() {
  document.getElementById('loginScreen').style.display   = 'none';
  document.getElementById('appScreen').style.display     = 'none';
  document.getElementById('docenteScreen').style.display = 'block';

  const a = state.alumno;
  document.getElementById('docTopName').textContent = a.nombre;
  if (typeof updateTopbarAvatar === 'function') updateTopbarAvatar();

  /* Ocultar tab Admin si no es admin */
  const navAdmin = document.getElementById('navAdmin');
  if (navAdmin) navAdmin.style.display = a.rol === 'admin' ? '' : 'none';

  /* Ocultar pill demo si hay backend real */
  const demoPill = document.querySelector('.doc-demo-pill');
  if (demoPill) demoPill.style.display = isSupabaseMode() ? 'none' : '';

  switchDocTab('Alumnos');
}

/* ── Navegación tabs del panel docente ───────────────────────*/
function switchDocTab(name) {
  ['Alumnos', 'Rutinas', 'Admin'].forEach(t => {
    const sec = document.getElementById('sectionDoc' + t);
    const btn = document.getElementById(t === 'Admin' ? 'navAdmin' : 'navDoc' + t);
    if (sec) sec.style.display = (t === name) ? '' : 'none';
    if (btn) btn.classList.toggle('doc-tab--active', t === name);
  });
  if (name === 'Admin') renderAdminTab();
}

/* ── Helper: enriquece una entrada del panel con datos de alerta ─*/
function _buildPanelEntry(alumno, rms, metricas, mes, hoy) {
  // metricas se guarda en la entrada para que ui.teacher.js pueda mostrar el historial
  const cargaHoy    = metricas.some(m => m.fecha === hoy);
  const ultimaCarga = metricas.length ? metricas[metricas.length - 1].fecha : null;

  const diasSinCarga = ultimaCarga
    ? Math.floor((Date.now() - new Date(ultimaCarga + 'T12:00:00').getTime()) / 86400000)
    : null;

  /* Estancado: todos los ejercicios con ≥2 meses de datos no mejoraron */
  const conDatos = rms.filter(rm => {
    const vals = rm.meses.slice(0, mes + 1).filter(v => v !== null);
    return vals.length >= 2;
  });
  const estancado = conDatos.length > 0 && conDatos.every(rm => {
    const vals = rm.meses.slice(0, mes + 1).filter(v => v !== null);
    return vals[vals.length - 1] <= vals[vals.length - 2];
  });

  const necesitaAtencion = !ultimaCarga || diasSinCarga >= 7 || estancado;

  return { alumno, rms, metricas, cargaHoy, ultimaCarga, diasSinCarga, estancado, necesitaAtencion };
}

async function loadDocenteData() {
  const hoy = new Date().toISOString().slice(0, 10);
  const mes = new Date().getMonth();

  if (isSupabaseMode()) {
    await initSupabaseCache(state.alumno.pin, state.alumno.rol);
    await loadEjerciciosCache();
    await loadLesionesCache(state.alumno.pin, state.alumno.rol);

    /* Demo users hardcodeados */
    const demoEntries = getTodosAlumnosDemo().map(({ alumno, rms }) => {
      const metricas = getMetricsByAlumno(alumno.pin);
      return _buildPanelEntry(alumno, rms, metricas, mes, hoy);
    });

    /* Usuarios aprobados en Supabase */
    const sbEntries = getTodosAlumnosSupabase().map(({ alumno }) => {
      const metricas = getMetricsByAlumno(alumno.pin);
      return _buildPanelEntry(alumno, [], metricas, mes, hoy);
    });

    state.panelAlumnos = [...demoEntries, ...sbEntries];

  } else if (isDemoMode()) {
    const todos = getTodosAlumnosDemo();
    const demoEntries = todos.map(({ alumno, rms }) => {
      const metricas = getMetricsByAlumno(alumno.pin);
      return _buildPanelEntry(alumno, rms, metricas, mes, hoy);
    });

    const locales = getUsuariosLocales()
      .filter(u => u.estado === 'activo' && u.rol === 'alumno')
      .map(u => {
        const alumno   = getAlumnoLocal(u.pin);
        const metricas = getMetricsByAlumno(u.pin);
        return _buildPanelEntry(alumno, [], metricas, mes, hoy);
      });

    state.panelAlumnos = [...demoEntries, ...locales];
  }

  renderDocente();
  renderDocenteRutinas();
}

/* ── Navegación por tabs ─────────────────────────────────────*/
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab' + name).classList.add('active');
  document.getElementById('nav' + name).classList.add('active');

  /* Al entrar a Rutina: marcar como vista y quitar punto rojo */
  if (name === 'Rutina' && state.alumno) {
    marcarRutinaVista(state.alumno.pin);
    const dot = document.getElementById('navRutinaDot');
    if (dot) dot.remove();
  }

  /* Al entrar a Salud: re-renderizar por si hubo cambios */
  if (name === 'Salud' && typeof renderSaludTab === 'function') {
    renderSaludTab();
  }
}

/* ── Inicialización ──────────────────────────────────────────
   Auto-login si hay PIN en la URL (?pin=XXX) o en sessionStorage.
   ─────────────────────────────────────────────────────────── */
(async function init() {
  const params     = new URLSearchParams(window.location.search);
  const pinUrl     = params.get('pin') || params.get('PIN');
  const pinSession = sessionStorage.getItem('bp_pin');
  const pin        = (pinUrl || pinSession || '').trim().toUpperCase();

  if (pin) {
    document.getElementById('pinInput').value = pin;
    await handleLogin();
  }
})();

/* ── Roles múltiples ─────────────────────────────────────────
   Muestra/oculta los botones de cambio de vista según los roles
   del usuario logueado. Solo aplica a usuarios con doble rol.
   ─────────────────────────────────────────────────────────── */
function _updateRoleSwitchers(roles, rolActivo) {
  const btnApp = document.getElementById('rolSwitcherApp');
  const btnDoc = document.getElementById('rolSwitcherDoc');
  if (btnApp) btnApp.style.display =
    (rolActivo === 'alumno' && roles.some(r => r === 'docente' || r === 'admin')) ? '' : 'none';
  if (btnDoc) btnDoc.style.display =
    (rolActivo !== 'alumno' && roles.includes('alumno')) ? '' : 'none';
}

async function switchRoleToAlumno() {
  document.getElementById('appScreen').style.display     = 'block';
  document.getElementById('docenteScreen').style.display = 'none';
  const a = state.alumno;
  const parts   = a.nombre.split(' ');
  const display = parts.length >= 2
    ? `${parts[0]} <span>${parts.slice(1).join(' ')}</span>`
    : a.nombre;
  document.getElementById('heroName').innerHTML = display;
  const tags = [a.disciplina, `${a.dias} días/sem`, a.objetivo].filter(t => t && t !== '—');
  document.getElementById('heroMeta').innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
  if (typeof updateTopbarAvatar === 'function') updateTopbarAvatar();
  await loadData();
  _updateRoleSwitchers(a.roles || [a.rol], 'alumno');
}

async function switchRoleToDocente() {
  _stopRutinaPolling();
  document.getElementById('appScreen').style.display     = 'none';
  document.getElementById('docenteScreen').style.display = 'block';
  const a = state.alumno;
  document.getElementById('docTopName').textContent = a.nombre;
  const navAdmin = document.getElementById('navAdmin');
  if (navAdmin) navAdmin.style.display = a.rol === 'admin' ? '' : 'none';
  await loadDocenteData();
  _updateRoleSwitchers(a.roles || [a.rol], 'docente');
}

document.getElementById('pinInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});
