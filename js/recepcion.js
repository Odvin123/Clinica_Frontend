(() => {
  'use strict';

  const API_URL = 'http://localhost:4000/api';

  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
  }

  function showToast(message, type = 'info') {
    let region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region';
      document.body.appendChild(region);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    if (type === 'error') {
      toast.style.backgroundColor = '#991B1B';
      toast.style.borderColor = '#DC2626';
    } else if (type === 'success') {
      toast.style.backgroundColor = '#065F46';
      toast.style.borderColor = '#059669';
    }
    toast.textContent = message;
    region.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 240);
    }, 3800);
  }

  function getIsoDatePlusDays(daysOffset) {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getHoyIso() {
    return getIsoDatePlusDays(0);
  }

  function getLabelFecha(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaNombre = diasSemana[d.getDay()];
    const diaNum = d.getDate();

    if (offset === 0) return `Hoy, ${diaNombre} ${diaNum}`;
    if (offset === 1) return `Mañana, ${diaNombre} ${diaNum}`;
    if (offset === 2) return `${diaNombre} ${diaNum}`;
    return `${diaNombre} ${diaNum}`;
  }

  let filtroDiaAgendaActual = getIsoDatePlusDays(0);
  let terminoBusquedaGlobal = '';

  function actualizarPildorasFechaRecepcion(fechaIso) {
    document.querySelectorAll('[data-rec-date-offset]').forEach(btn => {
      const offset = parseInt(btn.getAttribute('data-rec-date-offset'), 10);
      const fechaBtn = getIsoDatePlusDays(offset);
      const esActivo = fechaIso === fechaBtn;
      btn.setAttribute('aria-pressed', String(esActivo));
      btn.classList.toggle('is-active', esActivo);
    });
  }

  function inicializarBotonesFecha() {
    const fechaHoy = getIsoDatePlusDays(0);
    const dateInput = document.getElementById('cal-appt-date');
    const calDateFilter = document.getElementById('rec-cal-date-filter');
    const agendaDateFilter = document.getElementById('rec-agenda-date-filter');

    if (agendaDateFilter && !agendaDateFilter.value) {
      agendaDateFilter.value = fechaHoy;
    }
    if (calDateFilter && !calDateFilter.value) {
      calDateFilter.value = fechaHoy;
    }
    if (dateInput && !dateInput.value) {
      dateInput.value = fechaHoy;
      dateInput.min = fechaHoy;
    }

    actualizarPildorasFechaRecepcion(filtroDiaAgendaActual);
  }

  function sincronizarFechaRecepcion(nuevaFecha) {
    if (!nuevaFecha) return;
    filtroDiaAgendaActual = nuevaFecha;

    const agendaInput = document.getElementById('rec-agenda-date-filter');
    const calInput = document.getElementById('rec-cal-date-filter');
    const calApptInput = document.getElementById('cal-appt-date');

    if (agendaInput && agendaInput.value !== nuevaFecha) {
      agendaInput.value = nuevaFecha;
    }
    if (calInput && calInput.value !== nuevaFecha) {
      calInput.value = nuevaFecha;
    }
    if (calApptInput && calApptInput.value !== nuevaFecha) {
      calApptInput.value = nuevaFecha;
    }

    actualizarPildorasFechaRecepcion(nuevaFecha);

    cargarAgenda(nuevaFecha);
    cargarCalendarioBloques(nuevaFecha);
  }

  function pintarUsuarioRecepcion() {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      if (!usuarioStr) return;
      const usuario = JSON.parse(usuarioStr);

      document.querySelectorAll('.user-card__name').forEach(el => {
        el.textContent = usuario.nombre;
      });

      const iniciales = (usuario.nombre || 'RC')
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      document.querySelectorAll('.avatar').forEach(el => {
        el.textContent = iniciales;
      });
    } catch (e) {
      console.error(e);
    }
  }

  function aplicarMascaraDni(input) {
    if (!input) return;
    input.addEventListener('input', () => {
      let val = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (val.length > 14) val = val.slice(0, 14);

      let formatted = '';
      if (val.length > 0) formatted += val.slice(0, 3);
      if (val.length > 3) formatted += '-' + val.slice(3, 9);
      if (val.length > 9) formatted += '-' + val.slice(9, 14);
      input.value = formatted;
    });
  }

  function actualizarColorSelectTriage(selectEl) {
    if (!selectEl) return;
    const val = (selectEl.value || 'verde').toLowerCase();
    selectEl.classList.remove('rec-triage-select--verde', 'rec-triage-select--amarillo', 'rec-triage-select--rojo');
    if (val === 'rojo') {
      selectEl.classList.add('rec-triage-select--rojo');
    } else if (val === 'amarillo') {
      selectEl.classList.add('rec-triage-select--amarillo');
    } else {
      selectEl.classList.add('rec-triage-select--verde');
    }
  }

  function inicializarTagManager(containerId, inputId, hiddenId) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);

    let tags = [];

    function render() {
      if (!container) return;
      container.innerHTML = tags.map((t, idx) => `
        <span class="tag-chip" style="background:#E0F2FE; color:#0369A1; padding:3px 8px; border-radius:14px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:5px; border:1px solid #BAE6FD;">
          <span>${t}</span>
          <button type="button" data-remove-tag-idx="${idx}" style="background:none; border:none; color:#0369A1; cursor:pointer; font-weight:bold; font-size:14px; line-height:1; padding:0;">&times;</button>
        </span>
      `).join('');

      if (hidden) {
        hidden.value = tags.join(', ');
      }
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = input.value.trim().replace(/,/g, '');
          if (val && !tags.some(t => t.toLowerCase() === val.toLowerCase())) {
            tags.push(val);
            render();
          }
          input.value = '';
        } else if (e.key === 'Backspace' && !input.value && tags.length > 0) {
          tags.pop();
          render();
        }
      });
    }

    if (container) {
      container.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove-tag-idx]');
        if (removeBtn) {
          e.preventDefault();
          const idx = parseInt(removeBtn.getAttribute('data-remove-tag-idx'), 10);
          if (!isNaN(idx)) {
            tags.splice(idx, 1);
            render();
          }
        }
      });
    }

    return {
      setTags: (newTags) => {
        if (Array.isArray(newTags)) {
          tags = [...newTags];
        } else if (typeof newTags === 'string' && newTags.trim()) {
          tags = newTags.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          tags = [];
        }
        render();
      },
      getTags: () => [...tags],
      getValue: () => tags.join(', '),
      clear: () => {
        tags = [];
        if (input) input.value = '';
        render();
      }
    };
  }

  let tagManagerAltaTutor = null;
  let tagManagerValidarCita = null;
  let tagManagerAltaAnt = null;
  let tagManagerValidarAnt = null;

  const TITULOS_VISTAS = {
    'tab-dashboard': {
      title: 'Dashboard Operativo',
      sub: 'Control de agenda del día, check-in de pacientes y priorización por Triage pediátrico.'
    },
    'tab-citas': {
      title: 'Gestión de Citas y Bloques Horarios',
      sub: 'Visualiza los pacientes con horario reservado y agenda nuevas consultas sin solapamientos.'
    },
    'tab-familias': {
      title: 'Padrón de Familias y Expedientes',
      sub: 'Directorio de tutores, estado real de activación de PIN y expediente pediátrico de solo lectura.'
    },
    'tab-alertas': {
      title: 'Bandeja de Alertas y Recetas',
      sub: 'Programa las recetas enviadas por el Doctor para activar los recordatorios de WhatsApp.'
    }
  };

  function cambiarVista(targetId) {
    if (!targetId) return;

    const paneles = document.querySelectorAll('.rec-tab-panel');
    paneles.forEach(panel => {
      const match = panel.id === targetId;
      panel.classList.toggle('hidden', !match);
    });

    document.querySelectorAll('.sidebar .nav-item').forEach(btn => {
      const match = btn.getAttribute('data-tab-target') === targetId;
      if (match) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    const infoTitulo = TITULOS_VISTAS[targetId];
    if (infoTitulo) {
      const titleEl = document.getElementById('rec-view-title');
      const subEl = document.getElementById('rec-view-subtitle');
      if (titleEl) titleEl.textContent = infoTitulo.title;
      if (subEl) subEl.textContent = infoTitulo.sub;
    }

    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('is-open');

    if (targetId === 'tab-citas') {
      cargarCalendarioBloques();
      cargarPacientesSelector();
    } else if (targetId === 'tab-familias') {
      cargarPadronFamilias();
    } else if (targetId === 'tab-alertas') {
      cargarRecetasAlertas();
    } else if (targetId === 'tab-dashboard') {
      cargarAgenda();
    }
  }

  function abrirModalValidar(data) {
    const inputId = document.getElementById('validar-cita-id');
    const inputTutor = document.getElementById('validar-tutor-nombre');
    const inputTel = document.getElementById('validar-tutor-telefono');
    const inputPac = document.getElementById('validar-paciente-nombre');
    const inputMotivo = document.getElementById('validar-motivo');
    const inputPin = document.getElementById('validar-pin');
    const inputDni = document.getElementById('validar-dni');
    const inputEmail = document.getElementById('validar-email');
    const inputPeso = document.getElementById('validar-peso');
    const inputTalla = document.getElementById('validar-talla');
    const inputPc = document.getElementById('validar-pc');
    const inputTemp = document.getElementById('validar-temp');
    const modal = document.getElementById('modal-validar-tutor');

    if (inputId) inputId.value = data.id || '';
    if (inputTutor) inputTutor.value = data.tutor || '';
    if (inputTel) inputTel.value = data.telefono || '';
    if (inputPac) inputPac.value = data.paciente || '';
    if (inputMotivo) inputMotivo.value = data.motivo || 'Consulta general';
    if (inputPin) inputPin.value = data.pin || 'Ya configurado';
    if (inputDni) inputDni.value = (data.dni && data.dni !== 'PENDIENTE') ? data.dni : '';
    if (inputEmail) inputEmail.value = (data.email && !data.email.endsWith('@temp.ni')) ? data.email : '';
    if (inputPeso) inputPeso.value = data.peso || '';
    if (inputTalla) inputTalla.value = data.talla || '';
    if (inputPc) inputPc.value = data.pc || '';
    if (inputTemp) inputTemp.value = data.temp || '';

    document.querySelectorAll('input[name="vax-validar"]').forEach(cb => { cb.checked = false; });

    if (tagManagerValidarCita) {
      tagManagerValidarCita.setTags(data.cronicos || '');
    }
    if (tagManagerValidarAnt) {
      tagManagerValidarAnt.setTags(data.antecedentes || '');
    }

    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      if (inputDni) inputDni.focus();
    }
  }

  function abrirModalNuevoTutor() {
    const modal = document.getElementById('modal-new-patient');
    const pinInput = document.getElementById('reg-tutor-pin');

    document.querySelectorAll('input[name="vax-alta"]').forEach(cb => { cb.checked = false; });

    const pinAleatorio = Math.floor(1000 + Math.random() * 9000).toString();
    if (pinInput) {
      pinInput.value = pinAleatorio;
      pinInput.setAttribute('readonly', 'true');
    }

    if (tagManagerAltaTutor) {
      tagManagerAltaTutor.clear();
    }

    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  let citasPendientesCache = [];
  let todasCitasCache = [];
  let padronFamiliasCache = [];
  let recetasCache = [];
  let pacientesSelectorCache = [];
  let pacienteDrawerActual = null;

  function actualizarContadoresReales() {
    const hoyIso = getHoyIso();
    const citasHoy = todasCitasCache.filter(c => c.fecha && c.fecha.split('T')[0] === hoyIso);
    const totalAgenda = citasHoy.length > 0 ? citasHoy.length : todasCitasCache.length;
    const enSalaCount = todasCitasCache.filter(c => c.estado === 'EN_SALA' || c.estado === 'CONFIRMADA').length;
    const pendientesRx = recetasCache.filter(r => r.estado === 'PENDIENTE_RECEPCION').length;

    const badgeAgenda = document.getElementById('rec-nav-count-agenda');
    const badgeCitas = document.getElementById('rec-nav-count-citas');
    const badgePatients = document.getElementById('rec-nav-count-patients');
    const badgeAlerts = document.getElementById('rec-nav-count-alerts');

    if (badgeAgenda) badgeAgenda.textContent = String(totalAgenda);
    if (badgeCitas) badgeCitas.textContent = String(todasCitasCache.length);
    if (badgePatients) badgePatients.textContent = String(padronFamiliasCache.length);
    if (badgeAlerts) badgeAlerts.textContent = String(pendientesRx);

    const kpiCitasHoy = document.getElementById('rec-kpi-citas-hoy');
    const kpiTriage = document.getElementById('rec-kpi-triage');
    const kpiRxInbox = document.getElementById('rec-kpi-rx-inbox');
    const rxBadgeCount = document.getElementById('rec-rx-badge-count');

    if (kpiCitasHoy) kpiCitasHoy.textContent = String(todasCitasCache.length);
    if (kpiTriage) kpiTriage.textContent = String(enSalaCount);
    if (kpiRxInbox) kpiRxInbox.textContent = String(pendientesRx);
    if (rxBadgeCount) rxBadgeCount.textContent = `${pendientesRx} pendiente${pendientesRx === 1 ? '' : 's'}`;
  }

  function setupUI() {
    aplicarMascaraDni(document.getElementById('validar-dni'));
    aplicarMascaraDni(document.getElementById('reg-tutor-dni'));

    const regPhone = document.getElementById('reg-tutor-phone');
    if (regPhone) {
      regPhone.addEventListener('input', () => {
        regPhone.value = regPhone.value.replace(/\D/g, '').slice(0, 8);
      });
    }

    const regTutorName = document.getElementById('reg-tutor-name');
    if (regTutorName) {
      regTutorName.addEventListener('input', () => {
        regTutorName.value = regTutorName.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
      });
    }
    const regChildName = document.getElementById('reg-child-name');
    if (regChildName) {
      regChildName.addEventListener('input', () => {
        regChildName.value = regChildName.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
      });
    }

    const calTriageSelect = document.getElementById('cal-appt-triage');
    if (calTriageSelect) {
      actualizarColorSelectTriage(calTriageSelect);
      calTriageSelect.addEventListener('change', () => actualizarColorSelectTriage(calTriageSelect));
    }
    const regTriageSelect = document.getElementById('reg-child-triage');
    if (regTriageSelect) {
      actualizarColorSelectTriage(regTriageSelect);
      regTriageSelect.addEventListener('change', () => actualizarColorSelectTriage(regTriageSelect));
    }

    const globalSearchInput = document.getElementById('rec-global-search-input');
    if (globalSearchInput) {
      globalSearchInput.addEventListener('input', () => {
        terminoBusquedaGlobal = globalSearchInput.value.trim().toLowerCase();
        filtrarAgendaPorDia(filtroDiaAgendaActual);
        renderizarSalaEspera();
        filtrarPadronFamilias(terminoBusquedaGlobal);
        filtrarPacientesSelector(terminoBusquedaGlobal);
        renderizarBandejaRecetas();
      });
    }

    const typeaheadInput = document.getElementById('cal-appt-patient-search');
    if (typeaheadInput) {
      typeaheadInput.addEventListener('input', () => {
        const q = typeaheadInput.value.trim().toLowerCase();
        filtrarPacientesSelector(q, true);
      });
    }

    document.addEventListener('click', (e) => {

      const navTrigger = e.target.closest('[data-tab-target]');
      if (navTrigger) {
        const targetView = navTrigger.getAttribute('data-tab-target');
        cambiarVista(targetView);
        return;
      }

      const recDatePill = e.target.closest('[data-rec-date-offset]');
      if (recDatePill) {
        const offset = parseInt(recDatePill.getAttribute('data-rec-date-offset'), 10);
        const nuevaFecha = getIsoDatePlusDays(offset);
        sincronizarFechaRecepcion(nuevaFecha);
        return;
      }

      const dayFilterBtn = e.target.closest('[data-rec-day]');
      if (dayFilterBtn) {
        document.querySelectorAll('[data-rec-day]').forEach(b => b.setAttribute('aria-pressed', 'false'));
        dayFilterBtn.setAttribute('aria-pressed', 'true');
        filtroDiaAgendaActual = dayFilterBtn.getAttribute('data-rec-day');
        filtrarAgendaPorDia(filtroDiaAgendaActual);
        return;
      }

      const calDayBtn = e.target.closest('[data-cal-day]');
      if (calDayBtn) {
        document.querySelectorAll('[data-cal-day]').forEach(b => b.setAttribute('aria-pressed', 'false'));
        calDayBtn.setAttribute('aria-pressed', 'true');
        const fecha = calDayBtn.getAttribute('data-cal-day');
        const dateInput = document.getElementById('cal-appt-date');
        const calDateFilter = document.getElementById('rec-cal-date-filter');
        if (dateInput) dateInput.value = fecha;
        if (calDateFilter) calDateFilter.value = fecha;
        cargarCalendarioBloques(fecha);
        return;
      }

      const slotBtn = e.target.closest('[data-slot-time]');
      if (slotBtn && !slotBtn.disabled && !slotBtn.classList.contains('is-busy')) {
        const hora = slotBtn.getAttribute('data-slot-time');
        const selectHora = document.getElementById('cal-appt-time');
        if (selectHora) selectHora.value = hora;

        document.querySelectorAll('.rec-slot-card').forEach(s => s.classList.remove('is-selected'));
        slotBtn.classList.add('is-selected');

        const feedback = document.getElementById('cal-overlap-feedback');
        if (feedback) feedback.textContent = `Horario seleccionado: ${hora}. Selecciona el paciente y confirma.`;
        return;
      }

      const validarTrigger = e.target.closest('[data-open-validar-id]');
      if (validarTrigger) {
        const citaData = {
          id: validarTrigger.getAttribute('data-open-validar-id'),
          tutor: validarTrigger.getAttribute('data-tutor'),
          telefono: validarTrigger.getAttribute('data-telefono'),
          paciente: validarTrigger.getAttribute('data-paciente'),
          motivo: validarTrigger.getAttribute('data-motivo'),
          pin: validarTrigger.getAttribute('data-pin'),
          dni: validarTrigger.getAttribute('data-dni') || '',
          email: validarTrigger.getAttribute('data-email') || '',
          cronicos: validarTrigger.getAttribute('data-cronicos') || '',
          peso: validarTrigger.getAttribute('data-peso') || '',
          talla: validarTrigger.getAttribute('data-talla') || '',
          pc: validarTrigger.getAttribute('data-pc') || '',
          temp: validarTrigger.getAttribute('data-temp') || '',
          antecedentes: validarTrigger.getAttribute('data-ant') || ''
        };
        abrirModalValidar(citaData);
        return;
      }

      const btnProgramarRx = e.target.closest('[data-programar-rx-id]');
      if (btnProgramarRx) {
        const rxId = btnProgramarRx.getAttribute('data-programar-rx-id');
        abrirModalProgramarReceta(rxId);
        return;
      }

      const btnTestPushRx = e.target.closest('[data-test-push-rx-id]');
      if (btnTestPushRx) {
        const rxId = btnTestPushRx.getAttribute('data-test-push-rx-id');
        probarPushInmediatoRecepcion(rxId);
        return;
      }
      const btnModalTestPush = e.target.closest('#btn-rec-modal-test-push');
      if (btnModalTestPush) {
        const rxId = document.getElementById('alert-rx-id') ? document.getElementById('alert-rx-id').value : '';
        probarPushInmediatoRecepcion(rxId);
        return;
      }

      const btnVerFicha = e.target.closest('[data-ver-ficha-tutor-id]');
      if (btnVerFicha) {
        const tutorId = btnVerFicha.getAttribute('data-ver-ficha-tutor-id');
        abrirDrawerFamilia(tutorId);
        return;
      }

      if (e.target.closest('#drawer-close-btn') || e.target.id === 'drawer-expediente') {
        const drawer = document.getElementById('drawer-expediente');
        if (drawer) {
          drawer.classList.remove('is-open');
          drawer.setAttribute('aria-hidden', 'true');
        }
        return;
      }

      const btnBookDrawer = e.target.closest('#drawer-book-btn');
      if (btnBookDrawer) {
        const pacId = btnBookDrawer.getAttribute('data-paciente-id');
        const drawer = document.getElementById('drawer-expediente');
        if (drawer) {
          drawer.classList.remove('is-open');
          drawer.setAttribute('aria-hidden', 'true');
        }
        cambiarVista('tab-citas');
        setTimeout(() => {
          const sel = document.getElementById('cal-appt-patient');
          if (sel && pacId) sel.value = pacId;
        }, 120);
        return;
      }

      if (e.target.closest('#drawer-update-medidas-btn') || e.target.closest('#drawer-foot-update-medidas-btn')) {
        abrirModalActualizarMedidas();
        return;
      }

      const openNewPatientBtn = e.target.closest('[data-open-modal="modal-new-patient"]');
      if (openNewPatientBtn) {
        abrirModalNuevoTutor();
        return;
      }

      const openModalBtn = e.target.closest('[data-open-modal]');
      if (openModalBtn) {
        const modalId = openModalBtn.getAttribute('data-open-modal');
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
        }
        return;
      }

      const closeModalBtn = e.target.closest('[data-close-modal]');
      if (closeModalBtn) {
        const modalId = closeModalBtn.getAttribute('data-close-modal');
        cerrarModal(modalId);
        return;
      }

      if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.remove('is-open');
        e.target.setAttribute('aria-hidden', 'true');
        return;
      }

      const mobileOpen = e.target.closest('#mobile-menu-open');
      if (mobileOpen) {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) sidebar.classList.add('is-open');
        return;
      }
      const mobileClose = e.target.closest('#mobile-menu-close');
      if (mobileClose) {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) sidebar.classList.remove('is-open');
        return;
      }

      const logoutLink = e.target.closest('.rec-sidebar-logout, [href*="login.html"]');
      if (logoutLink) {
        e.preventDefault();
        if (window.cerrarSesion) {
          window.cerrarSesion();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          window.location.href = 'login.html';
        }
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.is-open, .rec-drawer-backdrop.is-open').forEach((m) => {
          m.classList.remove('is-open');
          m.setAttribute('aria-hidden', 'true');
        });
      }
    });

    const recCalDateFilter = document.getElementById('rec-cal-date-filter');
    const calApptDate = document.getElementById('cal-appt-date');

    if (recCalDateFilter) {
      recCalDateFilter.addEventListener('change', () => {
        const val = recCalDateFilter.value;
        if (!val) return;
        sincronizarFechaRecepcion(val);
      });
    }

    if (calApptDate) {
      calApptDate.addEventListener('change', () => {
        const val = calApptDate.value;
        if (!val) return;
        sincronizarFechaRecepcion(val);
      });
    }

    const recAgendaDateFilter = document.getElementById('rec-agenda-date-filter');

    if (recAgendaDateFilter) {
      if (!recAgendaDateFilter.value) recAgendaDateFilter.value = getHoyIso();
      recAgendaDateFilter.addEventListener('change', () => {
        const val = recAgendaDateFilter.value;
        if (!val) return;
        sincronizarFechaRecepcion(val);
      });
      actualizarPildorasFechaRecepcion(recAgendaDateFilter.value);
    }

    const searchFamilias = document.getElementById('rec-family-search');
    if (searchFamilias) {
      searchFamilias.addEventListener('input', () => {
        filtrarPadronFamilias(searchFamilias.value.trim().toLowerCase());
      });
    }
  }

  function obtenerMetaEstadoCita(estado) {
    const st = (estado || '').toUpperCase();
    if (st === 'PENDIENTE_VALIDACION') {
      return { texto: 'Pendiente', clase: 'pill--warn', bg: '#FFFBEB', color: '#B45309' };
    }
    if (st === 'CONFIRMADA' || st === 'EN_SALA') {
      return { texto: 'En Sala', clase: 'pill--info', bg: '#EFF6FF', color: '#1E56C5' };
    }
    if (st === 'ATENDIDA') {
      return { texto: 'Atendida', clase: 'pill--pos', bg: '#ECFDF5', color: '#047857' };
    }
    return { texto: estado || 'Pendiente', clase: 'rec-badge--neutral', bg: '#F3F4F6', color: '#374151' };
  }

  async function cargarAgenda(fechaParam) {
    const contenedor = document.getElementById('rec-agenda-stream');
    if (!contenedor) return;

    const fechaFiltro = fechaParam || (document.getElementById('rec-agenda-date-filter') && document.getElementById('rec-agenda-date-filter').value) || getHoyIso();
    const dateInput = document.getElementById('rec-agenda-date-filter');
    if (dateInput && dateInput.value !== fechaFiltro) {
      dateInput.value = fechaFiltro;
    }
    filtroDiaAgendaActual = fechaFiltro;
    actualizarPildorasFechaRecepcion(fechaFiltro);

    contenedor.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">Sincronizando agenda con PostgreSQL...</div>';

    try {
      const [resPendientes, resTodas, resFamilias, resRecetas] = await Promise.all([
        fetch(`${API_URL}/recepcion/citas-pendientes`, { headers: getHeaders() }),
        fetch(`${API_URL}/recepcion/agenda?fecha=${encodeURIComponent(fechaFiltro)}`, { headers: getHeaders() }),
        fetch(`${API_URL}/recepcion/familias`, { headers: getHeaders() }),
        fetch(`${API_URL}/recepcion/recetas`, { headers: getHeaders() })
      ]);

      if (resPendientes.status === 401 || resPendientes.status === 403) {
        window.location.href = 'login.html';
        return;
      }

      if (resPendientes.ok) citasPendientesCache = await resPendientes.json();
      if (resTodas.ok) todasCitasCache = await resTodas.json();
      if (resFamilias.ok) padronFamiliasCache = await resFamilias.json();
      if (resRecetas.ok) recetasCache = await resRecetas.json();

      inicializarBotonesFecha();
      actualizarContadoresReales();

      filtrarAgendaPorDia(filtroDiaAgendaActual);
      renderizarSalaEspera();
      renderizarBandejaRecetas();
    } catch (e) {
      console.error(e);
      contenedor.innerHTML = '<p style="padding: 15px; color: #BE123C;">Error de conexión con el servidor.</p>';
    }
  }

  function filtrarAgendaPorDia(fechaFiltro) {
    const contenedor = document.getElementById('rec-agenda-stream');
    if (!contenedor) return;

    let lista = [...todasCitasCache];

    if (fechaFiltro && fechaFiltro !== 'all') {
      lista = lista.filter(c => {
        if (!c.fecha) return true;
        return c.fecha.split('T')[0] === fechaFiltro;
      });
    }

    if (terminoBusquedaGlobal) {
      lista = lista.filter(c => {
        const pac = (c.paciente_nombre || '').toLowerCase();
        const tut = (c.tutor_nombre || '').toLowerCase();
        const dni = (c.tutor_dni || '').toLowerCase();
        const tel = (c.tutor_telefono || '').toLowerCase();
        const fol = (c.folio || '').toLowerCase();
        return pac.includes(terminoBusquedaGlobal) ||
               tut.includes(terminoBusquedaGlobal) ||
               dni.includes(terminoBusquedaGlobal) ||
               tel.includes(terminoBusquedaGlobal) ||
               fol.includes(terminoBusquedaGlobal);
      });
    }

    if (lista.length === 0) {
      contenedor.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 10px; text-align: center; border: 1px dashed #CBD5E1;">
          <p style="color: #64748B; margin: 0; font-size: 14px;">No hay citas para esta fecha</p>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = lista.map(c => {
      const metaEstado = obtenerMetaEstadoCita(c.estado);
      const triageUpper = (c.triage || 'VERDE').toUpperCase();
      const borderColor = triageUpper === 'ROJO' ? '#EF4444' : (triageUpper === 'AMARILLO' ? '#F59E0B' : '#10B981');
      const esPendiente = c.estado === 'PENDIENTE_VALIDACION';

      return `
        <div class="agenda-card" style="background: white; padding: 16px 18px; border-radius: 10px; border: 1px solid #E2E8F0; border-left: 4px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; box-shadow: 0 1px 2px rgba(15,23,42,0.04);">
          <div style="flex: 1; min-width: 240px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="pill pill--info num" style="font-weight: 700; font-size: 11px;">${c.folio || 'CITA'}</span>
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0F172A;">${c.paciente_nombre}</h4>
              <span class="pill" style="background:${metaEstado.bg}; color:${metaEstado.color}; font-weight: 700; font-size: 11px;">
                ${metaEstado.texto}
              </span>
              <span class="pill" style="font-size: 11px; background:#F1F5F9; color:#475569;">Triage: ${triageUpper}</span>
            </div>
            <p style="margin: 2px 0; font-size: 13px; color: #475569;">
              <strong>Tutor:</strong> ${c.tutor_nombre} · <strong>DNI:</strong> <span class="num">${c.tutor_dni || 'Pendiente'}</span> · <strong>Tel:</strong> <span class="num">${c.tutor_telefono || 'N/A'}</span>
            </p>
            <p style="margin: 2px 0; font-size: 13px; color: #64748B;">
              <strong>Fecha:</strong> <span class="num">${c.fecha ? c.fecha.split('T')[0] : 'Hoy'}</span> · <strong>Hora:</strong> <span class="num">${String(c.hora).slice(0, 5)}</span> · <strong>Motivo:</strong> ${c.motivo || 'Control Pediátrico'}
            </p>
            ${c.pin_activacion ? `
              <p style="margin: 6px 0 0 0; font-size: 12px; color:#64748B;">
                <strong>PIN Temporal Tutor:</strong>
                <span class="num" style="color: #BE123C; font-weight: 800; font-size: 13px; background: #FFE4E6; padding: 2px 8px; border-radius: 4px;">
                  ${c.pin_activacion}
                </span>
              </p>
            ` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${esPendiente ? `
              <button type="button"
                      class="btn btn--primary btn--sm"
                      data-open-validar-id="${c.id}"
                      data-tutor="${(c.tutor_nombre || '').replace(/"/g, '&quot;')}"
                      data-telefono="${c.tutor_telefono || ''}"
                      data-email="${(c.tutor_email || '').replace(/"/g, '&quot;')}"
                      data-paciente="${(c.paciente_nombre || '').replace(/"/g, '&quot;')}"
                      data-motivo="${(c.motivo || '').replace(/"/g, '&quot;')}"
                      data-pin="${c.pin_activacion || ''}"
                      data-dni="${c.tutor_dni || ''}"
                      data-cronicos="${(c.cronicos || '').replace(/"/g, '&quot;')}"
                      data-peso="${c.peso_kg || ''}"
                      data-talla="${c.talla_cm || ''}"
                      data-pc="${c.perimetro_cefalico || ''}"
                      data-temp="${c.temperatura || ''}"
                      data-ant="${(c.antecedentes || '').replace(/"/g, '&quot;')}">
                Validar Tutor y Cita →
              </button>
            ` : `
              <span class="pill" style="background:${metaEstado.bg}; color:${metaEstado.color}; font-weight:700; padding:6px 12px;">
                ${metaEstado.texto === 'En Sala' ? '🟢 En Sala de Espera' : '✅ Consulta Atendida'}
              </span>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderizarSalaEspera() {
    const triageList = document.getElementById('rec-triage-list');
    if (!triageList) return;

    let enSala = todasCitasCache.filter(c => c.estado === 'CONFIRMADA' || c.estado === 'EN_SALA');

    if (terminoBusquedaGlobal) {
      enSala = enSala.filter(c =>
        (c.paciente_nombre || '').toLowerCase().includes(terminoBusquedaGlobal) ||
        (c.tutor_nombre || '').toLowerCase().includes(terminoBusquedaGlobal) ||
        (c.tutor_dni || '').toLowerCase().includes(terminoBusquedaGlobal) ||
        (c.tutor_telefono || '').toLowerCase().includes(terminoBusquedaGlobal)
      );
    }

    if (enSala.length === 0) {
      triageList.innerHTML = `
        <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; border: 1px dashed #CBD5E1;">
          <p style="color: #64748B; margin: 0; font-size: 13px;">No hay pacientes en sala de espera en este momento.</p>
        </div>
      `;
      return;
    }

    enSala.sort((a, b) => {
      const p = { ROJO: 1, AMARILLO: 2, VERDE: 3 };
      return (p[(a.triage || 'VERDE').toUpperCase()] || 3) - (p[(b.triage || 'VERDE').toUpperCase()] || 3);
    });

    triageList.innerHTML = enSala.map(c => {
      const triage = (c.triage || 'VERDE').toUpperCase();
      let colorBadge = 'emerald';
      if (triage === 'ROJO') colorBadge = 'rose';
      else if (triage === 'AMARILLO') colorBadge = 'amber';

      return `
        <div class="agenda-card" style="background:white; padding:12px 14px; border-radius:8px; border:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="pill pill--${colorBadge}" style="font-weight:700; font-size:10px;">${triage}</span>
              <strong style="font-size:14px; color:#0F172A;">${c.paciente_nombre}</strong>
            </div>
            <p style="margin:2px 0 0; font-size:12px; color:#64748B;">Hora: <span class="num">${String(c.hora).slice(0, 5)}</span> · Tutor: ${c.tutor_nombre}</p>
          </div>
          <span class="rec-badge rec-badge--blue" style="font-size:11px;">En Sala</span>
        </div>
      `;
    }).join('');
  }

  /* ==========================================================================
     CALENDARIO DE BLOQUES (GENERACIÓN DINÁMICA DE HORAS Y PACIENTES RESERVADOS)
     Horario Clínica: Lunes a Viernes 08:00-17:00 | Sábados 08:00-12:30
     ========================================================================== */
  function generarBloquesHorarioClinica(diaSemana) {
    // 0 = Domingo (Cerrado), 1..5 = Lunes a Viernes (08:00-17:00), 6 = Sábado (08:00-12:30)
    if (diaSemana === 0) return [];

    const inicioMinutos = 8 * 60;
    const finMinutos = diaSemana === 6 ? (12 * 60 + 30) : (17 * 60);
    const intervaloMinutos = 30;
    const bloques = [];

    for (let min = inicioMinutos; min <= finMinutos; min += intervaloMinutos) {
      const h24 = Math.floor(min / 60);
      const m = min % 60;
      const hora = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const etiqueta = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
      bloques.push({ hora, etiqueta });
    }

    return bloques;
  }

  async function cargarCalendarioBloques(fechaParam) {
    const slotsGrid = document.getElementById('rec-calendar-slots-grid');
    const selectHora = document.getElementById('cal-appt-time');
    const inputFecha = document.getElementById('cal-appt-date');
    const filtroFechaCalendario = document.getElementById('rec-cal-date-filter');
    const scheduleBadge = document.getElementById('rec-cal-schedule-badge');
    if (!slotsGrid) return;

    const fecha = fechaParam ||
      (filtroFechaCalendario && filtroFechaCalendario.value) ||
      (inputFecha && inputFecha.value) ||
      getHoyIso();

    if (filtroFechaCalendario && filtroFechaCalendario.value !== fecha) {
      filtroFechaCalendario.value = fecha;
    }
    if (inputFecha && inputFecha.value !== fecha) {
      inputFecha.value = fecha;
    }

    const parts = fecha.split('-');
    const fechaObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const diaSemana = fechaObj.getDay();
    const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    if (scheduleBadge) {
      if (diaSemana === 0) {
        scheduleBadge.textContent = `${nombresDias[diaSemana]} (${fecha}) · Clínica Cerrada`;
      } else if (diaSemana === 6) {
        scheduleBadge.textContent = `${nombresDias[diaSemana]} (${fecha}) · Horario 08:00 AM – 12:30 PM`;
      } else {
        scheduleBadge.textContent = `${nombresDias[diaSemana]} (${fecha}) · Horario 08:00 AM – 05:00 PM (17:00)`;
      }
    }

    if (diaSemana === 0) {
      slotsGrid.innerHTML = `
        <div style="padding:24px; text-align:center; background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; color:#991B1B; grid-column:1/-1;">
          <strong style="font-size:15px; display:block; margin-bottom:4px;">Clínica Cerrada los Domingos</strong>
          <p style="margin:0; font-size:13px; color:#B91C1C;">Horarios de atención: Lunes a Viernes de 08:00 a 17:00 y Sábados de 08:00 a 12:30. Selecciona otra fecha.</p>
        </div>
      `;
      if (selectHora) {
        selectHora.innerHTML = '<option value="" disabled selected>Clínica cerrada los domingos</option>';
      }
      return;
    }

    slotsGrid.innerHTML = '<div style="padding:20px; text-align:center; color:#64748B; grid-column:1/-1;">Consultando bloques y pacientes reservados...</div>';

    try {

      const resAgendaFecha = await fetch(`${API_URL}/recepcion/agenda?fecha=${encodeURIComponent(fecha)}`, { headers: getHeaders() });
      const citasDeFecha = resAgendaFecha.ok ? await resAgendaFecha.json() : [];

      const mapaPacientesPorHora = new Map();
      citasDeFecha.forEach(c => {
        if (c.hora && c.estado !== 'CANCELADA') {
          const hhmm = String(c.hora).trim().slice(0, 5);
          mapaPacientesPorHora.set(hhmm, c.paciente_nombre);
        }
      });

      const listaBloques = generarBloquesHorarioClinica(diaSemana);

      slotsGrid.innerHTML = '';
      if (selectHora) selectHora.innerHTML = '<option value="">-- Selecciona hora disponible --</option>';

      listaBloques.forEach(bloque => {
        const nombrePacienteReservado = mapaPacientesPorHora.get(bloque.hora) || null;
        const estaReservado = Boolean(nombrePacienteReservado);

        const btnSlot = document.createElement('button');
        btnSlot.type = 'button';
        btnSlot.className = `rec-slot-card ${estaReservado ? 'is-busy' : 'is-free'}`;
        btnSlot.setAttribute('data-slot-time', bloque.hora);
        btnSlot.disabled = estaReservado;

        if (estaReservado) {
          btnSlot.style.backgroundColor = '#FEF2F2';
          btnSlot.style.borderColor = '#FECACA';
          btnSlot.style.cursor = 'not-allowed';
          btnSlot.innerHTML = `
            <div class="num" style="font-weight:700; font-size:14px; color:#991B1B;">${bloque.etiqueta}</div>
            <div style="font-size:12px; margin-top:4px; font-weight:700; color:#BE123C; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${nombrePacienteReservado}">
              Reservado · ${nombrePacienteReservado}
            </div>
          `;
        } else {
          btnSlot.innerHTML = `
            <div class="num" style="font-weight:700; font-size:14px; color:#0F172A;">${bloque.etiqueta}</div>
            <div style="font-size:12px; margin-top:4px; color:#047857; font-weight:600;">
              Disponible
            </div>
          `;
        }

        slotsGrid.appendChild(btnSlot);

        if (selectHora && !estaReservado) {
          const opt = document.createElement('option');
          opt.value = bloque.hora;
          opt.textContent = `${bloque.etiqueta} — Disponible`;
          selectHora.appendChild(opt);
        }
      });
    } catch (e) {
      console.error(e);
      slotsGrid.innerHTML = '<div style="padding:20px; text-align:center; color:#BE123C; grid-column:1/-1;">Error al consultar horarios del servidor.</div>';
    }
  }

  async function cargarPacientesSelector() {
    const select = document.getElementById('cal-appt-patient');
    if (!select) return;

    try {
      const res = await fetch(`${API_URL}/recepcion/pacientes`, { headers: getHeaders() });
      if (res.ok) {
        pacientesSelectorCache = await res.json();
        poblarDropdownPacientes(pacientesSelectorCache);
      }
    } catch (e) {
      console.error('Error cargando pacientes:', e);
    }
  }

  function poblarDropdownPacientes(lista, autoSelectFirst = false) {
    const select = document.getElementById('cal-appt-patient');
    if (!select) return;

    if (lista.length === 0) {
      select.innerHTML = '<option value="">-- Sin coincidencias --</option>';
      return;
    }

    select.innerHTML = '<option value="">-- Selecciona un paciente registrado --</option>';
    lista.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nombre} · Tutor: ${p.tutor_nombre} (Tel: ${p.tutor_telefono || 'S/N'})`;
      if (autoSelectFirst && idx === 0) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function filtrarPacientesSelector(termino, autoSelect = false) {
    if (!termino) {
      poblarDropdownPacientes(pacientesSelectorCache, false);
      return;
    }
    const filtrados = pacientesSelectorCache.filter(p =>
      (p.nombre || '').toLowerCase().includes(termino) ||
      (p.tutor_nombre || '').toLowerCase().includes(termino) ||
      (p.tutor_dni || '').toLowerCase().includes(termino) ||
      (p.tutor_telefono || '').toLowerCase().includes(termino)
    );
    poblarDropdownPacientes(filtrados, autoSelect);
  }

  async function cargarPadronFamilias() {
    const tbody = document.getElementById('rec-directory-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748B;">Cargando familias desde PostgreSQL...</td></tr>';

    try {
      const res = await fetch(`${API_URL}/recepcion/familias`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al cargar familias');

      padronFamiliasCache = await res.json();
      actualizarContadoresReales();
      renderizarTablaFamilias(padronFamiliasCache);
    } catch (e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#BE123C;">Error de conexión al cargar padrón de familias.</td></tr>';
    }
  }

  function renderizarTablaFamilias(lista) {
    const tbody = document.getElementById('rec-directory-tbody');
    if (!tbody) return;

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748B;">No se encontraron registros de familias.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(f => {

      const yaCambioPin = Boolean(f.tutor_activo) && !f.pin_activacion;
      const estadoHtml = yaCambioPin
        ? `<span class="pill pill--pos" style="font-weight:700;">Activo</span><div style="font-size:11px; color:#047857; margin-top:2px;">Contraseña configurada</div>`
        : `<span class="pill pill--warn" style="background:#FFE4E6; color:#BE123C; font-weight:700;">Pendiente</span><div class="num" style="font-size:12px; color:#64748B; margin-top:3px;">PIN: <strong style="color:#0F172A;">${f.pin_activacion || '----'}</strong></div>`;

      const hijos = Array.isArray(f.hijos) ? f.hijos : [];
      const nombresHijos = hijos.length > 0
        ? hijos.map(h => `<div style="font-weight:600; color:#0F172A;">• ${h.nombre} <small style="color:#64748B;">(${h.triage || 'VERDE'})</small></div>`).join('')
        : '<span style="color:#94A3B8;">Sin hijos registrados</span>';

      const cronicosList = hijos.map(h => h.cronicos).filter(Boolean).join(', ');
      const resumenClinico = cronicosList
        ? `<span style="color:#BE123C; font-weight:600; font-size:12px;">⚠️ ${cronicosList}</span>`
        : '<span style="color:#047857; font-size:12px; font-weight:500;">Esquema PAI activo · Sin crónicos</span>';

      return `
        <tr>
          <td>
            <div style="font-weight:700; color:#0F172A;">${f.tutor_nombre}</div>
            <div class="num" style="font-size:12px; color:#64748B;">Tel: ${f.tutor_telefono || 'N/A'} · DNI: ${f.tutor_dni || 'Pendiente'}</div>
            ${f.tutor_email ? `<div style="font-size:11px; color:#0284C7;">${f.tutor_email}</div>` : ''}
          </td>
          <td>${nombresHijos}</td>
          <td>${estadoHtml}</td>
          <td>${resumenClinico}</td>
          <td class="rec-table__th-right">
            <button type="button" class="btn btn--sm btn--outline" data-ver-ficha-tutor-id="${f.tutor_id}">
              Ver Ficha →
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filtrarPadronFamilias(termino) {
    if (!termino) {
      renderizarTablaFamilias(padronFamiliasCache);
      return;
    }
    const filtradas = padronFamiliasCache.filter(f => {
      const matchTutor = (f.tutor_nombre || '').toLowerCase().includes(termino);
      const matchDni = (f.tutor_dni || '').toLowerCase().includes(termino);
      const matchTel = (f.tutor_telefono || '').toLowerCase().includes(termino);
      const matchEmail = (f.tutor_email || '').toLowerCase().includes(termino);
      const matchHijos = Array.isArray(f.hijos) && f.hijos.some(h => (h.nombre || '').toLowerCase().includes(termino));
      return matchTutor || matchDni || matchTel || matchEmail || matchHijos;
    });
    renderizarTablaFamilias(filtradas);
  }

  async function abrirDrawerFamilia(tutorId) {
    const familia = padronFamiliasCache.find(f => String(f.tutor_id) === String(tutorId));
    if (!familia) return;

    const drawer = document.getElementById('drawer-expediente');
    const hijo = Array.isArray(familia.hijos) && familia.hijos.length > 0 ? familia.hijos[0] : null;
    pacienteDrawerActual = hijo ? { ...hijo, tutor_nombre: familia.tutor_nombre } : null;

    const idBadge = document.getElementById('drawer-child-id');
    const nameEl = document.getElementById('drawer-child-name');
    const metaEl = document.getElementById('drawer-child-meta');
    const chronicEl = document.getElementById('drawer-child-chronic');
    const tutorInfoEl = document.getElementById('drawer-tutor-info');
    const vaxListEl = document.getElementById('drawer-vaccines-list');
    const bookBtn = document.getElementById('drawer-book-btn');

    const medPeso = document.getElementById('drawer-med-peso');
    const medTalla = document.getElementById('drawer-med-talla');
    const medPc = document.getElementById('drawer-med-pc');
    const medTemp = document.getElementById('drawer-med-temp');
    const btnUpdateMed = document.getElementById('drawer-update-medidas-btn');
    const btnFootUpdateMed = document.getElementById('drawer-foot-update-medidas-btn');

    if (medPeso) medPeso.textContent = (hijo && hijo.peso_kg) ? `${hijo.peso_kg} kg` : '-- kg';
    if (medTalla) medTalla.textContent = (hijo && hijo.talla_cm) ? `${hijo.talla_cm} cm` : '-- cm';
    if (medPc) medPc.textContent = (hijo && hijo.perimetro_cefalico) ? `${hijo.perimetro_cefalico} cm` : '-- cm';
    if (medTemp) medTemp.textContent = (hijo && hijo.temperatura) ? `${hijo.temperatura} °C` : '-- °C';

    if (btnUpdateMed) btnUpdateMed.disabled = !hijo;
    if (btnFootUpdateMed) btnFootUpdateMed.disabled = !hijo;

    if (idBadge) idBadge.textContent = hijo ? `PAC-${String(hijo.id).slice(0, 6).toUpperCase()}` : 'FAMILIA';
    if (nameEl) nameEl.textContent = hijo ? hijo.nombre : familia.tutor_nombre;
    if (metaEl) {
      metaEl.textContent = hijo
        ? `Nacimiento: ${hijo.fecha_nacimiento ? String(hijo.fecha_nacimiento).split('T')[0] : 'N/A'} · Peso: ${hijo.peso_kg || '--'} kg · Tutor: ${familia.tutor_nombre}`
        : `Tutor registrado en recepción`;
    }
    if (chronicEl) {
      chronicEl.textContent = (hijo && hijo.cronicos) ? hijo.cronicos : 'Sin alergias ni antecedentes crónicos reportados.';
    }

    const yaCambioPin = Boolean(familia.tutor_activo) && !familia.pin_activacion;
    if (tutorInfoEl) {
      tutorInfoEl.innerHTML = `
        <div class="rec-drawer__kv">
          <span class="rec-drawer__k">Tutor Responsable</span>
          <span class="rec-drawer__v">${familia.tutor_nombre}</span>
        </div>
        <div class="rec-drawer__kv">
          <span class="rec-drawer__k">Cédula / DNI</span>
          <span class="rec-drawer__v num">${familia.tutor_dni || 'Pendiente'}</span>
        </div>
        <div class="rec-drawer__kv">
          <span class="rec-drawer__k">Teléfono WhatsApp</span>
          <span class="rec-drawer__v num">${familia.tutor_telefono || 'N/A'}</span>
        </div>
        <div class="rec-drawer__kv">
          <span class="rec-drawer__k">Credencial / Estado</span>
          <span class="rec-drawer__v">${yaCambioPin ? 'Activo (Contraseña)' : `Pendiente (PIN: ${familia.pin_activacion || '----'})`}</span>
        </div>
      `;
    }

    if (bookBtn && hijo) {
      bookBtn.setAttribute('data-paciente-id', hijo.id);
    }

    if (drawer) {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
    }

    if (vaxListEl) {
      if (!hijo) {
        vaxListEl.innerHTML = '<p style="font-size:13px; color:#64748B;">Sin paciente vinculado.</p>';
        return;
      }
      vaxListEl.innerHTML = '<p style="font-size:13px; color:#64748B;">Consultando esquema PAI en PostgreSQL...</p>';
      try {
        const resVax = await fetch(`${API_URL}/recepcion/paciente/${hijo.id}/vacunas`, { headers: getHeaders() });
        const vacunas = resVax.ok ? await resVax.json() : [];
        if (vacunas.length === 0) {
          vaxListEl.innerHTML = '<p style="font-size:13px; color:#64748B;">No hay vacunas registradas aún.</p>';
        } else {
          vaxListEl.innerHTML = vacunas.map(v => {
            const aplicada = v.estado === 'APLICADA' || v.aplicada;
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border:1px solid #E5E7EB; border-radius:8px; background:#FFFFFF;">
                <div>
                  <strong style="font-size:13px; color:#0F172A;">${v.nombre}</strong>
                  <span style="font-size:12px; color:#64748B; margin-left:6px;">${v.dosis || ''}</span>
                </div>
                <span class="pill ${aplicada ? 'pill--pos' : 'pill--warn'}" style="font-size:11px;">
                  ${aplicada ? 'Aplicada' : 'Pendiente'}
                </span>
              </div>
            `;
          }).join('');
        }
      } catch (e) {
        vaxListEl.innerHTML = '<p style="font-size:13px; color:#BE123C;">Error al cargar vacunas.</p>';
      }
    }
  }

  function abrirModalActualizarMedidas() {
    if (!pacienteDrawerActual) {
      showToast('Selecciona un paciente en el padrón para actualizar sus medidas.', 'error');
      return;
    }
    const inputId = document.getElementById('medidas-paciente-id');
    const inputNombre = document.getElementById('medidas-paciente-nombre');
    const inputPeso = document.getElementById('medidas-peso');
    const inputTalla = document.getElementById('medidas-talla');
    const inputPc = document.getElementById('medidas-pc');
    const inputTemp = document.getElementById('medidas-temp');

    if (inputId) inputId.value = pacienteDrawerActual.id || '';
    if (inputNombre) inputNombre.value = `${pacienteDrawerActual.nombre || 'Paciente'} (Tutor: ${pacienteDrawerActual.tutor_nombre || ''})`;
    if (inputPeso) inputPeso.value = pacienteDrawerActual.peso_kg || '';
    if (inputTalla) inputTalla.value = pacienteDrawerActual.talla_cm || '';
    if (inputPc) inputPc.value = pacienteDrawerActual.perimetro_cefalico || '';
    if (inputTemp) inputTemp.value = pacienteDrawerActual.temperatura || '';

    const modal = document.getElementById('modal-actualizar-medidas');
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  async function cargarRecetasAlertas() {
    try {
      const res = await fetch(`${API_URL}/recepcion/recetas`, { headers: getHeaders() });
      if (res.ok) {
        recetasCache = await res.json();
        actualizarContadoresReales();
        renderizarBandejaRecetas();
      }
    } catch (e) {
      console.error('Error cargando recetas en recepción:', e);
    }
  }

  function formatearIntervaloTexto(receta) {
    const intMin = parseInt(receta.intervalo_minutos, 10);
    if (!isNaN(intMin) && intMin > 0) {
      if (intMin % 60 === 0) {
        return `Cada ${intMin / 60} hora(s)`;
      }
      return `Cada ${intMin} minuto(s)`;
    }
    return `Cada ${receta.frecuencia_horas || 8} horas`;
  }

  function formatearProximoEnvioTexto(fechaIso) {
    if (!fechaIso) return 'Al activar la receta';
    const d = new Date(fechaIso);
    if (isNaN(d.getTime())) return 'Pendiente';
    return d.toLocaleString('es-NI', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function renderizarBandejaRecetas() {
    const inboxContainer = document.getElementById('rec-doctor-rx-inbox');
    const activeContainer = document.getElementById('rec-active-alerts-list');
    if (!inboxContainer || !activeContainer) return;

    let lista = [...recetasCache];
    if (terminoBusquedaGlobal) {
      lista = lista.filter(r =>
        (r.paciente_nombre || '').toLowerCase().includes(terminoBusquedaGlobal) ||
        (r.tutor_nombre || '').toLowerCase().includes(terminoBusquedaGlobal) ||
        (r.medicamento || '').toLowerCase().includes(terminoBusquedaGlobal) ||
        (r.tutor_telefono || '').toLowerCase().includes(terminoBusquedaGlobal)
      );
    }

    const pendientes = lista.filter(r => r.estado === 'PENDIENTE_RECEPCION');
    const activas = lista.filter(r => r.estado === 'ACTIVA');

    if (pendientes.length === 0) {
      inboxContainer.innerHTML = `
        <div style="padding:24px; text-align:center; border:1px dashed #CBD5E1; border-radius:10px; color:#64748B;">
          No hay recetas pendientes de programar en este momento.
        </div>
      `;
    } else {
      inboxContainer.innerHTML = pendientes.map(r => `
        <div class="rec-rx-card">
          <div class="rec-rx-card__info">
            <div class="rec-rx-card__top">
              <span class="rec-rx-card__patient">${r.paciente_nombre}</span>
              <span class="rec-rx-card__code">${r.cie10}</span>
              <span class="pill pill--warn" style="font-size:11px;">PENDIENTE_RECEPCION</span>
            </div>
            <div class="rec-rx-card__med">${r.medicamento} — <strong>${r.dosis}</strong></div>
            <div class="rec-rx-card__meta num">
              ${formatearIntervaloTexto(r)} por ${r.dias} días · Tutor: ${r.tutor_nombre} (Tel: ${r.tutor_telefono || 'N/A'})
            </div>
            <div class="num" style="margin-top:4px; font-size:12px; color:#0F766E; font-weight:600;">
              Próximo envío: ${formatearProximoEnvioTexto(r.proximo_envio)}
            </div>
          </div>
          <div class="rec-rx-card__actions" style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="btn btn--outline btn--sm" data-test-push-rx-id="${r.id}" style="border-color:#0F766E; color:#0F766E;">
              🔔 Probar Push Ahora
            </button>
            <button type="button" class="btn btn--primary btn--sm" data-programar-rx-id="${r.id}">
              Programar →
            </button>
          </div>
        </div>
      `).join('');
    }

    if (activeContainer) {
      if (activas.length === 0) {
        activeContainer.innerHTML = `
          <div style="padding:24px; text-align:center; border:1px dashed #CBD5E1; border-radius:10px; color:#64748B;">
            No hay recordatorios activos en la cola de notificaciones Push.
          </div>
        `;
      } else {
        activeContainer.innerHTML = activas.map(r => `
          <div class="rec-rx-card" style="border-left: 4px solid #10B981;">
            <div class="rec-rx-card__info">
              <div class="rec-rx-card__top">
                <span class="rec-rx-card__patient">${r.paciente_nombre}</span>
                <span class="rec-rx-card__code">${r.cie10}</span>
                <span class="pill pill--pos" style="font-size:11px;">ACTIVA</span>
              </div>
              <div class="rec-rx-card__med">${r.medicamento} — <strong>${r.dosis}</strong></div>
              <div class="rec-rx-card__schedule num">
                ⏰ Inicio: ${r.hora_inicio || '08:00'} · ${formatearIntervaloTexto(r)} por ${r.dias} días · Tutor: ${r.tutor_nombre} (${r.tutor_telefono || 'N/A'})
              </div>
              <div class="num" style="margin-top:4px; font-size:12.5px; color:#047857; font-weight:700;">
                🔔 Próximo envío: ${formatearProximoEnvioTexto(r.proximo_envio)}
              </div>
            </div>
            <div class="rec-rx-card__actions" style="display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="btn btn--outline btn--sm" data-test-push-rx-id="${r.id}" style="border-color:#0F766E; color:#0F766E;">
                🔔 Probar Push Ahora
              </button>
              <button type="button" class="btn btn--outline btn--sm" data-programar-rx-id="${r.id}">
                Editar Horario
              </button>
            </div>
          </div>
        `).join('');
      }
    }
  }

  function actualizarVistaPreviaModalReceta() {
    const unitSelect = document.getElementById('alert-interval-unit');
    const valInput = document.getElementById('alert-interval-val');
    const previewText = document.getElementById('rec-schedule-preview-text');
    const nextSendEl = document.getElementById('alert-next-send-preview');
    const startHourInput = document.getElementById('alert-start-hour');
    const hiddenFreq = document.getElementById('alert-med-freq');

    const unit = unitSelect ? unitSelect.value : 'horas';
    const rawVal = Math.max(1, parseInt(valInput ? valInput.value : '8', 10) || 1);
    const intervaloMinutos = unit === 'minutos' ? rawVal : rawVal * 60;

    if (hiddenFreq) {
      hiddenFreq.value = String(Math.max(1, Math.round(intervaloMinutos / 60)));
    }

    if (previewText) {
      const horaBase = startHourInput && startHourInput.value ? startHourInput.value : '08:00';
      previewText.textContent = unit === 'minutos'
        ? `Cada ${rawVal} minuto(s) · Inicio: ${horaBase}`
        : `Cada ${rawVal} hora(s) (${intervaloMinutos} min) · Inicio: ${horaBase}`;
    }

    if (nextSendEl) {
      const proxDate = new Date(Date.now() + intervaloMinutos * 60000);
      nextSendEl.textContent = `Próximo envío: ${proxDate.toLocaleString('es-NI', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}`;
    }
  }

  function abrirModalProgramarReceta(rxId) {
    const receta = recetasCache.find(r => String(r.id) === String(rxId));
    if (!receta) return;

    const inputId = document.getElementById('alert-rx-id');
    const inputTutorId = document.getElementById('alert-tutor-id');
    const inputPat = document.getElementById('alert-pat-name');
    const inputMed = document.getElementById('alert-med-name');
    const inputDose = document.getElementById('alert-med-dose');
    const selectFreq = document.getElementById('alert-med-freq');
    const inputDays = document.getElementById('alert-med-days');
    const unitSelect = document.getElementById('alert-interval-unit');
    const valInput = document.getElementById('alert-interval-val');
    const startHourInput = document.getElementById('alert-start-hour');
    const modal = document.getElementById('modal-schedule-rx');

    if (inputId) inputId.value = receta.id;
    if (inputTutorId) inputTutorId.value = receta.tutor_id || '';
    if (inputPat) inputPat.value = `${receta.paciente_nombre} (Tutor: ${receta.tutor_nombre} · ${receta.tutor_telefono || ''})`;
    if (inputMed) inputMed.value = receta.medicamento || '';
    if (inputDose) inputDose.value = receta.dosis || '';
    if (selectFreq) selectFreq.value = String(receta.frecuencia_horas || 8);
    if (inputDays) inputDays.value = String(receta.dias || 5);
    if (startHourInput && receta.hora_inicio) {
      const matchHora = String(receta.hora_inicio).match(/(\d{1,2}):(\d{2})/);
      if (matchHora) {
        startHourInput.value = `${matchHora[1].padStart(2, '0')}:${matchHora[2]}`;
      }
    }

    const intMin = parseInt(receta.intervalo_minutos, 10);
    if (!isNaN(intMin) && intMin > 0 && intMin % 60 !== 0) {
      if (unitSelect) unitSelect.value = 'minutos';
      if (valInput) valInput.value = String(intMin);
    } else {
      const horas = !isNaN(intMin) && intMin > 0 ? Math.round(intMin / 60) : (receta.frecuencia_horas || 8);
      if (unitSelect) unitSelect.value = 'horas';
      if (valInput) valInput.value = String(horas);
    }

    actualizarVistaPreviaModalReceta();

    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  async function probarPushInmediatoRecepcion(rxId) {
    const receta = recetasCache.find(r => String(r.id) === String(rxId));
    const tutorId = (receta && receta.tutor_id) || (document.getElementById('alert-tutor-id') && document.getElementById('alert-tutor-id').value);

    if (!receta && !tutorId) {
      showToast('Selecciona una receta con tutor asociado para enviar el Push de prueba.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/recepcion/probar-push`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          recetaId: receta ? receta.id : rxId,
          tutorId: receta ? receta.tutor_id : tutorId,
          pacienteNombre: receta ? receta.paciente_nombre : undefined,
          medicamento: receta ? receta.medicamento : undefined,
          dosis: receta ? receta.dosis : undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`🔔 Push enviado ahora mismo al tutor (${receta ? receta.tutor_nombre : 'Tutor'}): ${data.titulo}`, 'success');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.titulo, { body: data.mensaje });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => {
            if (p === 'granted') new Notification(data.titulo, { body: data.mensaje });
          });
        }
      } else {
        showToast(data.error || 'No se pudo enviar la notificación Push.', 'error');
      }
    } catch (err) {
      console.error('Error al probar push:', err);
      showToast('Error de conexión al enviar Push de prueba.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    pintarUsuarioRecepcion();
    setupUI();
    cargarAgenda();
    cargarPacientesSelector();

    tagManagerAltaTutor = inicializarTagManager('new-patient-tags-container', 'reg-child-allergy-input', 'reg-child-allergy');
    tagManagerValidarCita = inicializarTagManager('validar-tags-container', 'validar-cronicos-input', 'validar-cronicos');
    tagManagerAltaAnt = inicializarTagManager('new-patient-ant-tags-container', 'reg-child-ant-input', 'reg-child-antecedentes');
    tagManagerValidarAnt = inicializarTagManager('validar-ant-tags-container', 'validar-ant-input', 'validar-antecedentes');

    const formValidar = document.getElementById('form-validar-tutor');
    if (formValidar) {
      formValidar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('validar-cita-id').value;
        const dni = document.getElementById('validar-dni').value.trim();
        const email = document.getElementById('validar-email').value.trim();
        const cronicos = tagManagerValidarCita ? tagManagerValidarCita.getValue() : '';
        const pesoKg = document.getElementById('validar-peso') ? document.getElementById('validar-peso').value : null;
        const tallaCm = document.getElementById('validar-talla') ? document.getElementById('validar-talla').value : null;
        const perimetroCefalico = document.getElementById('validar-pc') ? document.getElementById('validar-pc').value : null;
        const temperatura = document.getElementById('validar-temp') ? document.getElementById('validar-temp').value : null;
        const antecedentes = tagManagerValidarAnt ? tagManagerValidarAnt.getValue() : '';

        if (!dni) {
          showToast('Por favor ingresa la cédula o DNI del tutor.', 'error');
          return;
        }

        if (email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            showToast('Por favor ingresa un correo electrónico válido.', 'error');
            return;
          }
        }

        const vacunasMarcadas = Array.from(document.querySelectorAll('input[name="vax-validar"]:checked')).map(cb => cb.value);

        const btnSubmit = formValidar.querySelector('button[type="submit"]');
        const origText = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
          btnSubmit.textContent = 'Validando...';
          btnSubmit.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/recepcion/validar-cita/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
              dniTutor: dni,
              emailTutor: email,
              cronicos,
              vacunasAplicadas: vacunasMarcadas,
              pesoKg,
              tallaCm,
              perimetroCefalico,
              temperatura,
              antecedentes
            })
          });

          const data = await res.json();

          if (res.ok) {
            showToast('✅ Cita validada (En Sala), signos vitales y carnet PAI actualizados.', 'success');
            cerrarModal('modal-validar-tutor');
            formValidar.reset();
            if (tagManagerValidarCita) tagManagerValidarCita.clear();
            if (tagManagerValidarAnt) tagManagerValidarAnt.clear();
            await cargarAgenda();
            await cargarCalendarioBloques();
          } else {
            showToast(data.error || 'Error al validar la cita.', 'error');
          }
        } catch (error) {
          console.error(error);
          showToast('Error de conexión con el servidor.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.textContent = origText;
            btnSubmit.disabled = false;
          }
        }
      });
    }

    const formAltaPaciente = document.getElementById('form-modal-patient');
    if (formAltaPaciente) {
      formAltaPaciente.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
          tutorNombre: document.getElementById('reg-tutor-name').value.trim(),
          tutorDni: document.getElementById('reg-tutor-dni').value.trim(),
          tutorTelefono: document.getElementById('reg-tutor-phone').value.trim(),
          tutorEmail: document.getElementById('reg-tutor-email').value.trim(),
          pin: document.getElementById('reg-tutor-pin').value.trim(),
          childNombre: document.getElementById('reg-child-name').value.trim(),
          childDob: document.getElementById('reg-child-dob').value,
          childWeight: document.getElementById('reg-child-weight').value,
          childTalla: document.getElementById('reg-child-talla') ? document.getElementById('reg-child-talla').value : null,
          childHeadCirc: document.getElementById('reg-child-head-circ') ? document.getElementById('reg-child-head-circ').value : null,
          childTemp: document.getElementById('reg-child-temp') ? document.getElementById('reg-child-temp').value : null,
          childAntecedentes: tagManagerAltaAnt ? tagManagerAltaAnt.getValue() : '',
          childTriage: document.getElementById('reg-child-triage').value,
          cronicos: tagManagerAltaTutor ? tagManagerAltaTutor.getValue() : '',
          vacunasAplicadas: Array.from(document.querySelectorAll('input[name="vax-alta"]:checked')).map(cb => cb.value)
        };

        if (!payload.tutorNombre || !payload.tutorDni || !payload.tutorTelefono || !payload.childNombre) {
          showToast('Por favor completa los campos obligatorios del tutor y paciente.', 'error');
          return;
        }

        const telDigitos = payload.tutorTelefono.replace(/\D/g, '');
        if (telDigitos.length !== 8) {
          showToast('El teléfono debe tener exactamente 8 dígitos.', 'error');
          return;
        }

        const btnSubmit = formAltaPaciente.querySelector('button[type="submit"]');
        const origText = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
          btnSubmit.textContent = 'Registrando...';
          btnSubmit.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/recepcion/crear-tutor-paciente`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });

          const data = await res.json();

          if (res.ok) {
            showToast(`✅ Familia registrada con éxito. PIN: ${data.pin} (Estado: Pendiente hasta cambiar PIN)`, 'success');
            cerrarModal('modal-new-patient');
            formAltaPaciente.reset();
            if (tagManagerAltaTutor) tagManagerAltaTutor.clear();
            if (tagManagerAltaAnt) tagManagerAltaAnt.clear();
            await cargarPadronFamilias();
            await cargarPacientesSelector();
            await cargarAgenda();
          } else {
            showToast(data.error || 'Error al registrar la familia.', 'error');
          }
        } catch (error) {
          console.error(error);
          showToast('Error de conexión con el servidor.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.textContent = origText;
            btnSubmit.disabled = false;
          }
        }
      });
    }

    const formCalendarAppt = document.getElementById('form-calendar-appt');
    if (formCalendarAppt) {
      formCalendarAppt.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pacienteId = document.getElementById('cal-appt-patient').value;
        const fecha = document.getElementById('cal-appt-date').value;
        const hora = document.getElementById('cal-appt-time').value;
        const triage = document.getElementById('cal-appt-triage').value;
        const motivo = document.getElementById('cal-appt-reason').value.trim();

        if (!pacienteId) {
          showToast('Por favor selecciona el paciente pediátrico.', 'error');
          return;
        }
        if (!fecha || !hora) {
          showToast('Por favor selecciona la fecha y el bloque horario disponible.', 'error');
          return;
        }

        const btnSubmit = formCalendarAppt.querySelector('button[type="submit"]');
        const origText = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
          btnSubmit.textContent = 'Confirmando bloque...';
          btnSubmit.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/recepcion/agendar-cita`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
              pacienteId,
              fecha,
              hora,
              motivo: motivo || 'Control Pediátrico',
              triage
            })
          });

          const data = await res.json();

          if (res.ok) {
            showToast(`✅ Cita agendada en Sala. Folio: ${data.cita.folio || 'N/A'}`, 'success');
            formCalendarAppt.reset();
            if (calApptDate) calApptDate.value = fecha;
            actualizarColorSelectTriage(document.getElementById('cal-appt-triage'));
            await cargarCalendarioBloques(fecha);
            await cargarAgenda();
          } else {
            showToast(data.error || 'Error al agendar la cita.', 'error');
          }
        } catch (error) {
          console.error(error);
          showToast('Error de conexión al agendar la cita.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.textContent = origText;
            btnSubmit.disabled = false;
          }
        }
      });
    }

    const unitSelectRx = document.getElementById('alert-interval-unit');
    const valInputRx = document.getElementById('alert-interval-val');
    const startHourInputRx = document.getElementById('alert-start-hour');
    [unitSelectRx, valInputRx, startHourInputRx].forEach(el => {
      if (!el) return;
      el.addEventListener('change', actualizarVistaPreviaModalReceta);
      el.addEventListener('input', actualizarVistaPreviaModalReceta);
    });

    const formScheduleRx = document.getElementById('rec-alert-form');
    if (formScheduleRx) {
      formScheduleRx.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rxId = document.getElementById('alert-rx-id').value;
        const horaInicio = document.getElementById('alert-start-hour').value;
        const dias = document.getElementById('alert-med-days').value;
        const unit = unitSelectRx ? unitSelectRx.value : 'horas';
        const rawVal = Math.max(1, parseInt(valInputRx ? valInputRx.value : '8', 10) || 1);
        const intervaloMinutos = unit === 'minutos' ? rawVal : rawVal * 60;
        const frecuenciaHoras = Math.max(1, Math.round(intervaloMinutos / 60));

        if (!rxId) {
          showToast('Selecciona una receta pendiente para programar.', 'error');
          return;
        }

        const btnSubmit = formScheduleRx.querySelector('button[type="submit"]');
        const origText = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
          btnSubmit.textContent = 'Activando...';
          btnSubmit.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/recepcion/recetas/${rxId}/programar`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ horaInicio, frecuenciaHoras, intervaloMinutos, dias })
          });

          const data = await res.json();
          if (res.ok) {
            showToast(`✅ Receta programada (${unit === 'minutos' ? `Cada ${rawVal} min` : `Cada ${rawVal} h`}). Estado: ACTIVA.`, 'success');
            cerrarModal('modal-schedule-rx');
            await cargarRecetasAlertas();
          } else {
            showToast(data.error || 'Error al programar la receta.', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Error de conexión al programar receta.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.textContent = origText;
            btnSubmit.disabled = false;
          }
        }
      });
    }

    const formMedidas = document.getElementById('rec-form-medidas');
    if (formMedidas) {
      formMedidas.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pacId = document.getElementById('medidas-paciente-id').value;
        const peso = document.getElementById('medidas-peso').value;
        const talla = document.getElementById('medidas-talla').value;
        const perimetroCefalico = document.getElementById('medidas-pc').value;
        const temperatura = document.getElementById('medidas-temp').value;

        if (!pacId) {
          showToast('No se identificó el paciente.', 'error');
          return;
        }

        if (!peso || parseFloat(peso) <= 0) {
          showToast('Por favor ingresa un peso válido en kg.', 'error');
          return;
        }

        if (!talla || parseFloat(talla) <= 0) {
          showToast('Por favor ingresa una talla válida en cm.', 'error');
          return;
        }

        const btnSubmit = document.getElementById('btn-guardar-medidas');
        const origText = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
          btnSubmit.textContent = 'Guardando...';
          btnSubmit.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/recepcion/pacientes/${pacId}/medidas`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
              peso: parseFloat(peso),
              talla: parseFloat(talla),
              perimetroCefalico: perimetroCefalico ? parseFloat(perimetroCefalico) : null,
              temperatura: temperatura ? parseFloat(temperatura) : null
            })
          });

          const data = await res.json();
          if (res.ok) {
            showToast('✅ Medidas actualizadas e historial guardado para la Curva OMS.', 'success');
            cerrarModal('modal-actualizar-medidas');

            if (pacienteDrawerActual && String(pacienteDrawerActual.id) === String(pacId)) {
              pacienteDrawerActual.peso_kg = data.paciente.peso_kg;
              pacienteDrawerActual.talla_cm = data.paciente.talla_cm;
              pacienteDrawerActual.perimetro_cefalico = data.paciente.perimetro_cefalico;
              pacienteDrawerActual.temperatura = data.paciente.temperatura;

              const medPeso = document.getElementById('drawer-med-peso');
              const medTalla = document.getElementById('drawer-med-talla');
              const medPc = document.getElementById('drawer-med-pc');
              const medTemp = document.getElementById('drawer-med-temp');
              const metaEl = document.getElementById('drawer-child-meta');

              if (medPeso) medPeso.textContent = `${data.paciente.peso_kg} kg`;
              if (medTalla) medTalla.textContent = `${data.paciente.talla_cm} cm`;
              if (medPc) medPc.textContent = data.paciente.perimetro_cefalico ? `${data.paciente.perimetro_cefalico} cm` : '-- cm';
              if (medTemp) medTemp.textContent = data.paciente.temperatura ? `${data.paciente.temperatura} °C` : '-- °C';
              if (metaEl) {
                metaEl.textContent = `Nacimiento: ${data.paciente.fecha_nacimiento ? String(data.paciente.fecha_nacimiento).split('T')[0] : 'N/A'} · Peso: ${data.paciente.peso_kg} kg · Tutor: ${pacienteDrawerActual.tutor_nombre || ''}`;
              }
            }

            await cargarPadronFamilias();
            await cargarAgenda();
          } else {
            showToast(data.error || 'Error al actualizar las medidas.', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Error de red al actualizar medidas del paciente.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.textContent = origText;
            btnSubmit.disabled = false;
          }
        }
      });
    }
  });
})();
