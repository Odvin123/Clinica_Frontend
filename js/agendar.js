(function () {
  'use strict';

  const API_URL = 'https://clinica-backend-dx7x.onrender.com/api';

  document.addEventListener('DOMContentLoaded', () => {
    initCurrentYear();
    initBookingForm();
  });

  function initCurrentYear() {
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  function initBookingForm() {
    const form = document.getElementById('appointment-form');
    if (!form) return;

    const parentInput = document.getElementById('parent-name');
    const parentRelation = document.getElementById('parent-relation');
    const childInput = document.getElementById('child-name');
    const childAgeInput = document.getElementById('child-age');
    const phoneInput = document.getElementById('phone');
    const dateInput = document.getElementById('preferred-date');
    const timeInput = document.getElementById('preferred-time');
    const reasonInput = document.getElementById('reason');
    const livePreview = document.getElementById('booking-live-preview');
    const feedbackEl = document.getElementById('form-feedback');
    const dynamicTimeContainer = document.getElementById('dynamic-time-slots-container');

    const pdfActionsWrap = document.getElementById('ticket-pdf-actions');
    const btnDownloadPdf = document.getElementById('btn-download-pdf');

    if (pdfActionsWrap) pdfActionsWrap.style.display = 'none';
    if (btnDownloadPdf) btnDownloadPdf.disabled = true;

    const ticketFolio = document.getElementById('ticket-folio');
    const ticketService = document.getElementById('ticket-service');
    const ticketVisitType = document.getElementById('ticket-visit-type');
    const ticketDate = document.getElementById('ticket-date');
    const ticketTime = document.getElementById('ticket-time');
    const ticketChild = document.getElementById('ticket-child');
    const ticketChildAge = document.getElementById('ticket-child-age');
    const ticketParent = document.getElementById('ticket-parent');
    const ticketPhone = document.getElementById('ticket-phone');

    const quickDateBtns = document.querySelectorAll('.date-quick-btn');

    let folioCode = 'URB-' + Math.floor(1000 + Math.random() * 9000);
    if (ticketFolio) ticketFolio.textContent = `FOLIO · ${folioCode}`;
    let ultimoPinAsignado = '';

    if (ticketVisitType) ticketVisitType.textContent = 'Primera visita a la clínica';

    if (reasonInput) {
      reasonInput.readOnly = true;
      reasonInput.addEventListener('keydown', (e) => e.preventDefault());
    }

    function showToast(message, type = 'info') {
      let region = document.getElementById('toast-region');
      if (!region) {
        region = document.createElement('div');
        region.id = 'toast-region';
        region.className = 'toast-region';
        region.setAttribute('aria-live', 'polite');
        document.body.appendChild(region);
      }
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;
      region.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add('toast--visible');
      });

      setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 220);
      }, 4000);
    }

    const stepBlocks = [
      document.getElementById('step-block-1'),
      document.getElementById('step-block-2'),
      document.getElementById('step-block-3')
    ];
    const stepIndicators = document.querySelectorAll('.booking-stepper__item');

    function setActiveStep(stepNumber, scroll = false) {
      stepIndicators.forEach(ind => {
        const s = parseInt(ind.getAttribute('data-step-indicator') || '1', 10);
        ind.classList.toggle('booking-stepper__item--active', s === stepNumber);
        ind.classList.toggle('booking-stepper__item--completed', s < stepNumber);
      });

      stepBlocks.forEach((block, idx) => {
        if (!block) return;
        const current = idx + 1;
        block.classList.toggle('is-step-active', current === stepNumber);
        block.classList.toggle('is-step-completed', current < stepNumber);
      });

      if (scroll && stepBlocks[stepNumber - 1]) {
        stepBlocks[stepNumber - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    stepIndicators.forEach(ind => {
      ind.addEventListener('click', () => {
        const s = parseInt(ind.getAttribute('data-step-indicator') || '1', 10);
        setActiveStep(s, true);
      });
    });

    setActiveStep(1, false);

    const today = new Date();
    const todayLocal = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    const todayStr = todayLocal.toISOString().split('T')[0];

    const HORARIOS_LUNES_VIERNES_MANANA = [
      { valor: '08:00 AM', etiqueta: '08:00 AM' },
      { valor: '09:00 AM', etiqueta: '09:00 AM' },
      { valor: '10:00 AM', etiqueta: '10:00 AM' },
      { valor: '11:00 AM', etiqueta: '11:00 AM' },
      { valor: '12:00 PM', etiqueta: '12:00 PM' }
    ];

    const HORARIOS_LUNES_VIERNES_TARDE = [
      { valor: '01:00 PM', etiqueta: '01:00 PM (13:00)' },
      { valor: '02:00 PM', etiqueta: '02:00 PM (14:00)' },
      { valor: '03:00 PM', etiqueta: '03:00 PM (15:00)' },
      { valor: '04:00 PM', etiqueta: '04:00 PM (16:00)' },
      { valor: '05:00 PM', etiqueta: '05:00 PM (17:00)' }
    ];

    const HORARIOS_SABADO = [
      { valor: '08:00 AM', etiqueta: '08:00 AM' },
      { valor: '08:30 AM', etiqueta: '08:30 AM' },
      { valor: '09:00 AM', etiqueta: '09:00 AM' },
      { valor: '09:30 AM', etiqueta: '09:30 AM' },
      { valor: '10:00 AM', etiqueta: '10:00 AM' },
      { valor: '10:30 AM', etiqueta: '10:30 AM' },
      { valor: '11:00 AM', etiqueta: '11:00 AM' },
      { valor: '11:30 AM', etiqueta: '11:30 AM' },
      { valor: '12:00 PM', etiqueta: '12:00 PM' },
      { valor: '12:30 PM', etiqueta: '12:30 PM' }
    ];

    function normalizarHora(hStr) {
      if (!hStr) return '';
      const str = String(hStr).trim().toUpperCase();
      const m = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
      if (!m) return str;
      let h = parseInt(m[1], 10);
      const min = m[2];
      let ampm = m[3] ? m[3].toUpperCase() : null;
      if (!ampm) {
        ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
      }
      return `${String(h).padStart(2, '0')}:${min} ${ampm}`;
    }

    function limpiarSeleccionHorario() {
      if (timeInput) timeInput.value = '';
      document.querySelectorAll('.time-slot-chip').forEach(c => c.classList.remove('is-selected'));
      if (ticketTime) {
        ticketTime.textContent = 'Pendiente de seleccionar';
      }
    }

    function limpiarBloqueosHorarios() {
      const chips = document.querySelectorAll('.time-slot-chip');
      chips.forEach(chip => {
        chip.disabled = false;
        chip.classList.remove('is-occupied', 'is-blocked');
        const originalLabel = chip.getAttribute('data-time-label') || chip.getAttribute('data-time-slot');
        if (originalLabel) {
          chip.textContent = originalLabel;
        }
        chip.style.backgroundColor = '';
        chip.style.borderColor = '';
        chip.style.color = '';
        chip.style.cursor = '';
        chip.title = 'Disponible para agendar';
      });
    }

    function vincularEventosChipsHorario() {
      const timeChips = document.querySelectorAll('.time-slot-chip');
      timeChips.forEach(chip => {
        chip.addEventListener('click', () => {
          if (chip.disabled || chip.classList.contains('is-blocked') || chip.classList.contains('is-occupied')) return;

          timeChips.forEach(c => c.classList.remove('is-selected'));
          chip.classList.add('is-selected');

          const slot = chip.getAttribute('data-time-slot') || chip.textContent.trim();
          if (timeInput) {
            timeInput.value = slot;
            clearFieldError(timeInput);
          }
          if (ticketTime) {
            ticketTime.textContent = slot;
          }
          setActiveStep(3, false);
          updateTicket();
        });
      });
    }

    function renderizarHorariosPorDia(fechaStr, conservarSeleccion = false) {
      if (!dynamicTimeContainer || !fechaStr) return;

      const fechaObj = new Date(fechaStr + 'T00:00:00');
      const diaSemana = fechaObj.getDay();

      if (diaSemana === 0) {
        if (timeInput) timeInput.value = '';
        dynamicTimeContainer.innerHTML = `
          <div class="closed-day-notice" role="alert">
            <span class="closed-day-notice__badge">Cerrado</span>
            <div class="closed-day-notice__text">
              <strong>Domingos Cerrado</strong>
              <p>La clínica no brinda consulta externa los domingos. Por favor selecciona una fecha de Lunes a Sábado.</p>
            </div>
          </div>
        `;
        setFieldError(dateInput, 'Domingos Cerrado. Selecciona un día de lunes a sábado.');
        updateTicket();
        return;
      }

      clearFieldError(dateInput);
      const horarioActual = (conservarSeleccion && timeInput) ? timeInput.value : '';

      if (diaSemana === 6) {
        dynamicTimeContainer.innerHTML = `
          <div class="time-slot-group">
            <span class="time-slot-group__label">Jornada Sabatina (08:00 AM – 12:30 PM)</span>
            <div class="time-slot-grid">
              ${HORARIOS_SABADO.map(slot => `
                <button type="button" class="time-slot-chip ${slot.valor === horarioActual ? 'is-selected' : ''}" data-time-slot="${slot.valor}" data-time-label="${slot.etiqueta}">
                  ${slot.etiqueta}
                </button>
              `).join('')}
              <button type="button" class="time-slot-chip time-slot-chip--urgent ${horarioActual.includes('Urgencia') ? 'is-selected' : ''}" data-time-slot="Urgencia / Lo antes posible" data-time-label="Urgencia / Hoy mismo">
                Urgencia / Hoy mismo
              </button>
            </div>
          </div>
        `;
      } else {
        dynamicTimeContainer.innerHTML = `
          <div class="time-slot-group">
            <span class="time-slot-group__label">Turno Matutino (08:00 – 12:00)</span>
            <div class="time-slot-grid">
              ${HORARIOS_LUNES_VIERNES_MANANA.map(slot => `
                <button type="button" class="time-slot-chip ${slot.valor === horarioActual ? 'is-selected' : ''}" data-time-slot="${slot.valor}" data-time-label="${slot.etiqueta}">
                  ${slot.etiqueta}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="time-slot-group">
            <span class="time-slot-group__label">Turno Vespertino (13:00 – 17:00)</span>
            <div class="time-slot-grid">
              ${HORARIOS_LUNES_VIERNES_TARDE.map(slot => `
                <button type="button" class="time-slot-chip ${slot.valor === horarioActual ? 'is-selected' : ''}" data-time-slot="${slot.valor}" data-time-label="${slot.etiqueta}">
                  ${slot.etiqueta}
                </button>
              `).join('')}
              <button type="button" class="time-slot-chip time-slot-chip--urgent ${horarioActual.includes('Urgencia') ? 'is-selected' : ''}" data-time-slot="Urgencia / Lo antes posible" data-time-label="Urgencia / Hoy mismo">
                Urgencia / Hoy mismo
              </button>
            </div>
          </div>
        `;
      }

      vincularEventosChipsHorario();
      limpiarBloqueosHorarios();
      actualizarHorasOcupadas(fechaStr);
      updateTicket();
    }

    if (dateInput) {
      dateInput.min = todayStr;
      if (!dateInput.value || dateInput.value < todayStr) {
        dateInput.value = todayStr;
      }

      dateInput.addEventListener('change', () => {
        setActiveStep(2, false);
        const val = dateInput.value;
        if (!val) {
          setFieldError(dateInput, 'Debes seleccionar una fecha.');
          return;
        }

        if (val < todayStr) {
          dateInput.value = todayStr;
          setFieldError(dateInput, 'No puedes seleccionar una fecha anterior a hoy.');
          showToast('No es posible agendar citas en fechas pasadas.', 'error');
          limpiarSeleccionHorario();
          renderizarHorariosPorDia(todayStr, false);
          return;
        }

        quickDateBtns.forEach(b => b.classList.remove('is-active'));
        limpiarSeleccionHorario();
        renderizarHorariosPorDia(val, false);
      });
    }

    const prepData = {
      'Consulta Pediátrica General': {
        title: 'Preparación para Consulta Pediátrica General',
        items: [
          'Acudir con el menor acompañado por su madre, padre o tutor legal.',
          'Presentar la Tarjeta de Vacunación MINSA o historial médico previo si dispone de él.',
          'Si el niño(a) ha recibido algún medicamento en las últimas 6 horas, anotar nombre y dosis.'
        ]
      },
      'Control de Crecimiento y Desarrollo': {
        title: 'Preparación para Control de Niño Sano',
        items: [
          'Vestir al menor con ropa cómoda y fácil de retirar para la medición de peso, talla y perímetro cefálico.',
          'Llevar la cartilla de vacunación y registro de controles pediátricos anteriores.',
          'Anotar dudas sobre alimentación, horas de sueño, hitos de desarrollo psicomotor o suplementación vitamínica.'
        ]
      },
      'Vacunación e Inmunización': {
        title: 'Preparación para Vacunación e Inmunización PAI',
        items: [
          'Es indispensable presentar el Carnet de Vacunación físico del MINSA para sellado oficial.',
          'Informar al Dr. Urbina si el niño(a) ha presentado fiebre en las últimas 24 horas o tiene alergia al huevo o antibióticos.',
          'Traer ropa de dos piezas que facilite el acceso al muslo o brazo del pequeño.'
        ]
      },
      'Emergencia / Valoración Prioritaria': {
        title: 'Indicaciones para Valoración Prioritaria',
        items: [
          'Si el niño(a) presenta fiebre superior a 38.5°C o dificultad para respirar, no espere y diríjase de inmediato a la clínica.',
          'Si cuenta con termómetro digital o medicamentos que administró recientemente, llévelos consigo a consulta.',
          'En recepción informe de inmediato al personal que su cita fue agendada como Valoración Prioritaria.'
        ]
      }
    };

    function updatePrepBox(serviceName) {
      const titleEl = document.getElementById('prep-service-title');
      const listEl = document.getElementById('prep-service-list');
      const data = prepData[serviceName] || prepData['Consulta Pediátrica General'];

      if (titleEl) titleEl.textContent = data.title;
      if (listEl) {
        listEl.innerHTML = '';
        data.items.forEach(itemText => {
          const li = document.createElement('li');
          li.textContent = itemText;
          listEl.appendChild(li);
        });
      }
    }

    const reasonPills = document.querySelectorAll('.reason-pill');
    reasonPills.forEach(pill => {
      pill.addEventListener('click', () => {
        reasonPills.forEach(p => p.classList.remove('is-selected'));
        pill.classList.add('is-selected');

        const serviceName = pill.getAttribute('data-reason');
        if (reasonInput) reasonInput.value = serviceName;
        updatePrepBox(serviceName);
        setActiveStep(2, false);
        updateTicket();
      });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('servicio');
    if (serviceParam) {
      const matchPill = Array.from(reasonPills).find(p =>
        (p.getAttribute('data-reason') || '').toLowerCase().includes(serviceParam.toLowerCase())
      );
      if (matchPill) matchPill.click();
    }

    quickDateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        quickDateBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const offset = parseInt(btn.getAttribute('data-date-offset') || '0', 10);
        const targetDate = new Date(todayLocal.getTime());
        targetDate.setDate(targetDate.getDate() + offset);

        const dateStr = targetDate.toISOString().split('T')[0];
        if (dateInput) {
          dateInput.value = dateStr;
          setActiveStep(2, false);
          limpiarSeleccionHorario();
          renderizarHorariosPorDia(dateStr, false);
        }
      });
    });

    async function actualizarHorasOcupadas(fechaStr) {
      if (!fechaStr) return;

      limpiarBloqueosHorarios();

      try {
        const res = await fetch(`${API_URL}/public/horas-ocupadas/${encodeURIComponent(fechaStr)}`);
        const horasOcupadas = res.ok ? await res.json() : [];
        const ocupadasNormalizadas = (horasOcupadas || []).map(h => normalizarHora(h));
        const ocupadasSet = new Set(ocupadasNormalizadas);
        (horasOcupadas || []).forEach(h => ocupadasSet.add(String(h).trim().toUpperCase()));

        const chips = document.querySelectorAll('.time-slot-chip');
        chips.forEach(chip => {
          const slot = (chip.getAttribute('data-time-slot') || '').trim();
          if (slot.includes('Urgencia')) {
            chip.disabled = false;
            chip.classList.remove('is-occupied', 'is-blocked');
            return;
          }

          const slotNormalizado = normalizarHora(slot);
          const estaOcupado = ocupadasSet.has(slotNormalizado) || ocupadasSet.has(slot.toUpperCase());

          if (estaOcupado) {
            chip.disabled = true;
            chip.classList.add('is-occupied', 'is-blocked');
            chip.classList.remove('is-selected');
            chip.textContent = 'Ocupado';
            chip.title = 'Horario reservado por otro paciente';
            chip.style.backgroundColor = '#FEE2E2';
            chip.style.borderColor = '#EF4444';
            chip.style.color = '#DC2626';
            chip.style.cursor = 'not-allowed';

            if (timeInput && normalizarHora(timeInput.value) === slotNormalizado) {
              timeInput.value = '';
              if (ticketTime) ticketTime.textContent = 'Pendiente de seleccionar';
            }
          } else {
            chip.disabled = false;
            chip.classList.remove('is-occupied', 'is-blocked');
            const originalLabel = chip.getAttribute('data-time-label') || slot;
            chip.textContent = originalLabel;
            chip.title = 'Disponible para agendar';
            chip.style.backgroundColor = '';
            chip.style.borderColor = '';
            chip.style.color = '';
            chip.style.cursor = '';
          }
        });

        updateTicket();
      } catch (err) {
        console.warn('No se pudo sincronizar horas ocupadas:', err);
      }
    }

    [childInput, childAgeInput, parentInput, phoneInput].forEach(inp => {
      if (!inp) return;
      inp.addEventListener('focus', () => setActiveStep(3, false));
    });

    if (childInput) {
      childInput.addEventListener('input', () => {
        childInput.value = childInput.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        clearFieldError(childInput);
        updateTicket();
      });
    }

    if (parentInput) {
      parentInput.addEventListener('input', () => {
        parentInput.value = parentInput.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        clearFieldError(parentInput);
        updateTicket();
      });
    }

    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 8);
        clearFieldError(phoneInput);
        updateTicket();
      });
    }

    if (childAgeInput) {
      childAgeInput.max = todayStr;
      childAgeInput.addEventListener('change', () => {
        clearFieldError(childAgeInput);
        updateTicket();
      });
    }

    function calculateAgeText(birthDateStr) {
      if (!birthDateStr) return 'Por indicar';
      const birth = new Date(birthDateStr + 'T00:00:00');
      const diffMs = today - birth;
      if (diffMs < 0) return 'Fecha no válida';

      const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));

      if (diffYears >= 1) {
        const remainingMonths = diffMonths % 12;
        return `${diffYears} año${diffYears > 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} m.` : ''}`;
      } else {
        return `${diffMonths} mes${diffMonths === 1 ? '' : 'es'}`;
      }
    }

    function formatDateDisplay(isoDateStr) {
      if (!isoDateStr) return 'Hoy';
      const parts = isoDateStr.split('-');
      if (parts.length !== 3) return isoDateStr;
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    function updateTicket() {
      const activeReason = document.querySelector('.reason-pill.is-selected');
      if (ticketService && activeReason) {
        ticketService.textContent = activeReason.getAttribute('data-reason');
      }

      if (ticketVisitType) {
        ticketVisitType.textContent = 'Primera visita a la clínica';
      }

      if (ticketDate && dateInput) {
        ticketDate.textContent = formatDateDisplay(dateInput.value);
      }

      if (ticketTime) {
        const selectedChip = document.querySelector('.time-slot-chip.is-selected');
        if (selectedChip) {
          ticketTime.textContent = selectedChip.getAttribute('data-time-slot') || selectedChip.textContent.trim();
        } else {
          const fechaObj = dateInput && dateInput.value ? new Date(dateInput.value + 'T00:00:00') : null;
          if (fechaObj && fechaObj.getDay() === 0) {
            ticketTime.textContent = 'Cerrado / Sin horario';
          } else {
            ticketTime.textContent = 'Pendiente de seleccionar';
          }
        }
      }

      if (ticketChild) {
        ticketChild.textContent = childInput && childInput.value.trim() ? childInput.value.trim() : 'Pendiente de ingresar';
      }

      if (ticketChildAge) {
        const edadTexto = childAgeInput ? calculateAgeText(childAgeInput.value) : 'Por indicar';
        ticketChildAge.textContent = `Edad: ${edadTexto}`;
      }

      if (ticketParent) {
        ticketParent.textContent = parentInput && parentInput.value.trim() ? parentInput.value.trim() : 'Pendiente de ingresar';
      }

      if (ticketPhone) {
        ticketPhone.textContent = phoneInput && phoneInput.value.trim() ? `Tel: ${phoneInput.value.trim()}` : 'Tel: Por indicar';
      }

      if (livePreview) {
        const selectedChip = document.querySelector('.time-slot-chip.is-selected');
        const horaTexto = selectedChip ? (selectedChip.getAttribute('data-time-slot') || selectedChip.textContent.trim()) : (timeInput && timeInput.value ? timeInput.value : 'por definir');
        if (childInput && childInput.value.trim()) {
          livePreview.textContent = `Pre-reserva para ${childInput.value.trim()} el ${formatDateDisplay(dateInput.value)} a las ${horaTexto}. Presentarse 10 min antes en clínica.`;
        } else {
          livePreview.textContent = 'Complete los datos del paciente para generar el detalle de su cita médica.';
        }
      }
    }

    function setFieldError(fieldEl, message) {
      if (!fieldEl) return;
      fieldEl.classList.add('has-error');
      const errEl = document.getElementById(`error-${fieldEl.id}`);
      if (errEl) errEl.textContent = message;
    }

    function clearFieldError(fieldEl) {
      if (!fieldEl) return;
      fieldEl.classList.remove('has-error');
      const errEl = document.getElementById(`error-${fieldEl.id}`);
      if (errEl) errEl.textContent = '';
    }

    function resetFormularioCompleto() {
      form.reset();

      folioCode = 'URB-' + Math.floor(1000 + Math.random() * 9000);
      if (ticketFolio) ticketFolio.textContent = `FOLIO · ${folioCode}`;
      ultimoPinAsignado = '';

      if (dateInput) {
        dateInput.value = todayStr;
        dateInput.min = todayStr;
        clearFieldError(dateInput);
      }
      quickDateBtns.forEach((b, idx) => b.classList.toggle('is-active', idx === 0));
      renderizarHorariosPorDia(todayStr);

      reasonPills.forEach((p, idx) => {
        p.classList.toggle('is-selected', idx === 0);
      });
      if (reasonInput) {
        reasonInput.value = 'Consulta Pediátrica General';
        clearFieldError(reasonInput);
      }
      updatePrepBox('Consulta Pediátrica General');

      [childInput, childAgeInput, parentInput, phoneInput, timeInput, dateInput].forEach(inp => {
        if (inp) clearFieldError(inp);
      });

      if (pdfActionsWrap) pdfActionsWrap.style.display = 'none';
      if (btnDownloadPdf) {
        btnDownloadPdf.disabled = true;
        btnDownloadPdf.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="7 10 12 15 17 10" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Descargar Comprobante (PDF)</span>
        `;
      }

      const submitBtn = document.getElementById('btn-submit-booking');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Agendar Cita Pediátrica</span>';
        submitBtn.style.backgroundColor = '';
        submitBtn.style.borderColor = '';
      }

      const ticketKicker = document.getElementById('ticket-status-kicker');
      if (ticketKicker) ticketKicker.textContent = 'Comprobante de Pre-Cita';
      if (feedbackEl) feedbackEl.innerHTML = '';

      setActiveStep(1, true);

      updateTicket();

      showToast('Formulario restablecido. Listo para agendar una nueva cita.', 'info');
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let isValid = true;
      let firstInvalid = null;

      if (!dateInput || !dateInput.value) {
        isValid = false;
        setFieldError(dateInput, 'Selecciona una fecha para la cita.');
        if (!firstInvalid) firstInvalid = dateInput;
      } else if (dateInput.value < todayStr) {
        isValid = false;
        setFieldError(dateInput, 'No puedes seleccionar una fecha anterior a hoy.');
        if (!firstInvalid) firstInvalid = dateInput;
      } else {
        const dObj = new Date(dateInput.value + 'T00:00:00');
        if (dObj.getDay() === 0) {
          isValid = false;
          setFieldError(dateInput, 'Domingos Cerrado. Selecciona un día de lunes a sábado.');
          if (!firstInvalid) firstInvalid = dateInput;
        } else {
          clearFieldError(dateInput);
        }
      }

      const selectedChip = document.querySelector('.time-slot-chip.is-selected');
      const horaSeleccionada = selectedChip ? (selectedChip.getAttribute('data-time-slot') || selectedChip.textContent.trim()) : (timeInput ? timeInput.value : '');
      if (!horaSeleccionada) {
        isValid = false;
        setFieldError(timeInput, 'Debes seleccionar un horario disponible.');
        if (!firstInvalid) firstInvalid = document.getElementById('preferred-date') || timeInput;
      } else {
        if (timeInput) timeInput.value = horaSeleccionada;
        clearFieldError(timeInput);
      }

      if (!childInput || childInput.value.trim().length < 3) {
        isValid = false;
        setFieldError(childInput, 'Ingresa el nombre completo del niño(a) (mínimo 3 letras).');
        if (!firstInvalid) firstInvalid = childInput;
      } else {
        clearFieldError(childInput);
      }

      if (!childAgeInput || !childAgeInput.value || childAgeInput.value > todayStr) {
        isValid = false;
        setFieldError(childAgeInput, 'Selecciona una fecha de nacimiento válida para el paciente.');
        if (!firstInvalid) firstInvalid = childAgeInput;
      } else {
        clearFieldError(childAgeInput);
      }

      if (!parentInput || parentInput.value.trim().length < 3) {
        isValid = false;
        setFieldError(parentInput, 'Ingresa el nombre completo del tutor responsable.');
        if (!firstInvalid) firstInvalid = parentInput;
      } else {
        clearFieldError(parentInput);
      }

      const telPuro = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
      if (telPuro.length !== 8) {
        isValid = false;
        setFieldError(phoneInput, 'El teléfono debe contener exactamente 8 dígitos numéricos.');
        if (!firstInvalid) firstInvalid = phoneInput;
      } else {
        clearFieldError(phoneInput);
      }

      if (!timeInput || !timeInput.value || timeInput.value.trim() === '') {
        isValid = false;
        setFieldError(timeInput, 'Debes seleccionar un horario disponible de la lista.');
        if (!firstInvalid) firstInvalid = timeInput;
      }

      if (!isValid) {
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus();
        }
        if (feedbackEl) {
          feedbackEl.textContent = 'Por favor revisa los campos señalados antes de continuar.';
          feedbackEl.style.color = '#BE123C';
        }
        showToast('Por favor revisa los campos señalados en el formulario.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-booking');
      const origBtnContent = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Procesando reserva...</span>';
      }

      try {
        const datosParaEnviar = {
          nombreNino: childInput.value.trim(),
          fechaNacimiento: (childAgeInput.value && childAgeInput.value.trim()) ? childAgeInput.value.trim() : '2023-01-01',
          nombreTutor: parentInput.value.trim(),
          telefono: phoneInput.value.trim(),
          parentesco: parentRelation ? parentRelation.value : 'Madre',
          fecha: dateInput.value,
          hora: timeInput.value,
          motivo: reasonInput ? reasonInput.value.trim() : 'Consulta Pediátrica General',
          folio: folioCode
        };

        console.log("🔍 DATOS A ENVIAR AL BACKEND:", datosParaEnviar);

        const respuesta = await fetch(`${API_URL}/public/reservar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosParaEnviar)
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.error || 'Error al agendar la cita.');
        }

        const ticketKicker = document.getElementById('ticket-status-kicker');
        if (ticketKicker) ticketKicker.textContent = 'Cita Agendada · Comprobante Oficial';

        if (submitBtn) {
          submitBtn.innerHTML = '<span>✓ Cita Agendada Exitosamente</span>';
          submitBtn.style.backgroundColor = '#059669';
          submitBtn.style.borderColor = '#059669';
        }

        ultimoPinAsignado = datos.pin || datos.pinTemporal || '';
        if (feedbackEl) {
          feedbackEl.innerHTML = `<strong>¡Cita reservada con éxito!</strong> Folio oficial: <span class="tabular-nums font-bold">${folioCode}</span>${ultimoPinAsignado ? ` · Tu PIN de acceso al portal es: <strong>${ultimoPinAsignado}</strong>` : ''}. Por favor descarga tu comprobante en PDF.`;
          feedbackEl.style.color = '#065F46';
        }

        if (pdfActionsWrap) {
          pdfActionsWrap.style.display = 'block';
          pdfActionsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (btnDownloadPdf) {
          btnDownloadPdf.disabled = false;
        }

        showToast(`¡Cita agendada con éxito! Folio: ${folioCode}`, 'success');
        actualizarHorasOcupadas(dateInput.value);

      } catch (error) {
        console.error('Error al agendar:', error);
        if (feedbackEl) {
          feedbackEl.textContent = error.message || 'Error de conexión. Intenta de nuevo.';
          feedbackEl.style.color = '#BE123C';
        }
        showToast(error.message || 'Error de conexión. Intenta de nuevo.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnContent;
        }
      }
    });

    function generarPdfComprobanteReal(dataSnapshot) {
      const nombreNino = (dataSnapshot && dataSnapshot.nino) || (childInput && childInput.value.trim()) || (ticketChild && ticketChild.textContent) || 'Paciente Pediátrico';
      const edadTexto = (dataSnapshot && dataSnapshot.edad) || (childAgeInput && childAgeInput.value ? `${calculateAgeText(childAgeInput.value)} (Nac: ${childAgeInput.value})` : 'Registrada en clínica');
      const nombreTutor = (dataSnapshot && dataSnapshot.tutor) || (parentInput && parentInput.value.trim()) || (ticketParent && ticketParent.textContent) || 'Tutor Responsable';
      const parentescoTexto = (dataSnapshot && dataSnapshot.parentesco) || (parentRelation && parentRelation.value) || 'Tutor';
      const telefonoTexto = (dataSnapshot && dataSnapshot.telefono) || (phoneInput && phoneInput.value.trim()) || 'No indicado';
      const fechaTexto = (dataSnapshot && dataSnapshot.fecha) || (dateInput && dateInput.value ? formatDateDisplay(dateInput.value) : (ticketDate ? ticketDate.textContent : 'Hoy'));
      const horaTexto = (dataSnapshot && dataSnapshot.hora) || (timeInput && timeInput.value) || (ticketTime && ticketTime.textContent) || '08:00 AM';
      const servicioTexto = (dataSnapshot && dataSnapshot.servicio) || (reasonInput && reasonInput.value) || (ticketService && ticketService.textContent) || 'Consulta Pediátrica General';
      const modalidadTexto = 'Primera visita a la clínica';
      const pinParaPdf = (dataSnapshot && dataSnapshot.pin) || ultimoPinAsignado || '';
      const folioParaPdf = (dataSnapshot && dataSnapshot.folio) || folioCode;

      const JsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

      if (typeof JsPDFConstructor === 'function') {
        const doc = new JsPDFConstructor({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        doc.setFillColor(15, 118, 110);
        doc.rect(0, 0, 210, 42, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('CLINICA PEDIATRICA DR. ELMAN URBINA', 18, 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.text('Especialista en Pediatria, Neonatologia y Desarrollo Infantil', 18, 25);
        doc.text('Juigalpa, Chontales · Gasolinera Puma 1c al Este, 1/2c al Sur · Tel: 8977-7523', 18, 31);

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(142, 11, 50, 18, 3, 3, 'F');
        doc.setTextColor(15, 118, 110);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('FOLIO DE RESERVA', 167, 17.5, { align: 'center' });
        doc.setFontSize(13);
        doc.text(folioParaPdf, 167, 25, { align: 'center' });

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('COMPROBANTE OFICIAL DE CITA MEDICA', 18, 56);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(`Emitido el: ${new Date().toLocaleString('es-NI')}`, 18, 62);

        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(18, 68, 174, 98, 4, 4, 'FD');

        const drawField = (label, value, x, y) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(label.toUpperCase(), x, y);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text(String(value || '-'), x, y + 6.5);
        };

        drawField('Servicio Pediatrico Solicitado', servicioTexto, 26, 79);
        drawField('Modalidad de Consulta', modalidadTexto, 130, 79);

        doc.setDrawColor(226, 232, 240);
        doc.line(26, 91, 184, 91);

        drawField('Fecha Programada', fechaTexto, 26, 100);
        drawField('Hora Seleccionada', horaTexto, 130, 100);

        doc.line(26, 112, 184, 112);

        drawField('Nombre del Nino(a) / Paciente', nombreNino, 26, 121);
        drawField('Edad / Fecha de Nacimiento', edadTexto, 130, 121);

        doc.line(26, 133, 184, 133);

        drawField(`Nombre del Tutor (${parentescoTexto})`, nombreTutor, 26, 142);
        drawField('Telefono de Contacto', `+505 ${telefonoTexto}`, 130, 142);

        let currentY = 178;
        if (pinParaPdf) {
          doc.setFillColor(236, 253, 245);
          doc.setDrawColor(16, 185, 129);
          doc.roundedRect(18, currentY, 174, 22, 3, 3, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(6, 95, 70);
          doc.text(`CREDENCIALES DEL PORTAL DEL TUTOR — Tel: ${telefonoTexto} · PIN Temporal: ${pinParaPdf}`, 25, currentY + 13);
          currentY += 30;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('INDICACIONES PREVIAS A SU CONSULTA:', 18, currentY);

        const indicaciones = (prepData[servicioTexto] && prepData[servicioTexto].items) || prepData['Consulta Pediátrica General'].items;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        let itemY = currentY + 8;
        indicaciones.forEach((item, index) => {
          const lines = doc.splitTextToSize(`${index + 1}. ${item}`, 170);
          doc.text(lines, 20, itemY);
          itemY += lines.length * 5.5 + 2;
        });

        doc.setDrawColor(203, 213, 225);
        doc.line(18, 265, 192, 265);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Presente este comprobante digital o impreso en Recepcion 10 minutos antes de su hora programada.', 105, 272, { align: 'center' });
        doc.text('Clinica Pediatrica Dr. Elman Urbina · Juigalpa, Chontales, Nicaragua.', 105, 278, { align: 'center' });

        doc.save(`Comprobante_Cita_${folioParaPdf}.pdf`);
        return Promise.resolve();
      }

      if (typeof window.html2pdf === 'function') {
        const ticketCard = document.getElementById('booking-ticket-card');
        return window.html2pdf()
          .set({
            margin: 10,
            filename: `Comprobante_Cita_${folioParaPdf}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF', scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          })
          .from(ticketCard)
          .save();
      }

      window.print();
      return Promise.resolve();
    }

    if (btnDownloadPdf) {
      btnDownloadPdf.addEventListener('click', async () => {
        const origHtml = btnDownloadPdf.innerHTML;
        btnDownloadPdf.disabled = true;
        btnDownloadPdf.innerHTML = '<span>Generando documento PDF...</span>';

        const snapshotData = {
          folio: folioCode,
          nino: (childInput && childInput.value.trim()) || 'Paciente Pediátrico',
          edad: childAgeInput && childAgeInput.value ? `${calculateAgeText(childAgeInput.value)} (Nac: ${childAgeInput.value})` : 'Registrada en clínica',
          tutor: (parentInput && parentInput.value.trim()) || 'Tutor Responsable',
          parentesco: (parentRelation && parentRelation.value) || 'Madre',
          telefono: (phoneInput && phoneInput.value.trim()) || 'No indicado',
          fecha: dateInput && dateInput.value ? formatDateDisplay(dateInput.value) : 'Hoy',
          hora: (document.querySelector('.time-slot-chip.is-selected')?.getAttribute('data-time-slot')) || (timeInput && timeInput.value) || (ticketTime && ticketTime.textContent) || '08:00 AM',
          servicio: (reasonInput && reasonInput.value) || 'Consulta Pediátrica General',
          pin: ultimoPinAsignado
        };

        try {
          await generarPdfComprobanteReal(snapshotData);
          showToast(`Comprobante ${snapshotData.folio}.pdf descargado correctamente.`, 'success');

          resetFormularioCompleto();
        } catch (err) {
          console.error('Error generando PDF:', err);
          showToast('No se pudo generar el PDF automáticamente, abriendo vista de impresión.', 'error');
          window.print();
          resetFormularioCompleto();
        }
      });
    }

    renderizarHorariosPorDia(dateInput ? dateInput.value : todayStr, false);
    updateTicket();
  }
})();