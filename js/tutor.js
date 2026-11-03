(() => {
  'use strict';

const API_URL = 'https://clinica-backend-dx7x.onrender.com/api';
  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
  }

  function getIsoDatePlusDays(daysOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getProximaFechaHabilIso() {
    let offset = 1;
    while (offset <= 7) {
      const iso = getIsoDatePlusDays(offset);
      const parts = iso.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (d.getDay() !== 0) return iso;
      offset++;
    }
    return getIsoDatePlusDays(1);
  }

  function formatearFechaLegible(fechaStr) {
    if (!fechaStr) return 'Sin fecha';
    const iso = String(fechaStr).split('T')[0];
    const partes = iso.split('-');
    if (partes.length !== 3) return iso;
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mIdx = parseInt(partes[1], 10) - 1;
    return `${partes[2]} ${meses[mIdx] || partes[1]} ${partes[0]}`;
  }

  function formatearHora12(horaStr) {
    if (!horaStr) return '--:--';
    const limpio = String(horaStr).trim();
    if (/AM|PM/i.test(limpio)) return limpio;
    const partes = limpio.split(':');
    if (partes.length < 2) return limpio;
    const h24 = parseInt(partes[0], 10);
    const m = partes[1].slice(0, 2);
    if (isNaN(h24)) return limpio;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
  }

  function generarBloquesLocales(fechaStr) {
    if (!fechaStr) return [];
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return [];
    const fechaObj = new Date(
      parseInt(partes[0], 10),
      parseInt(partes[1], 10) - 1,
      parseInt(partes[2], 10)
    );
    const diaSemana = fechaObj.getDay();
    if (diaSemana === 0) return [];

    const inicioMin = 8 * 60;
    const finMin = diaSemana === 6 ? (12 * 60 + 30) : (17 * 60);
    const bloques = [];

    for (let min = inicioMin; min <= finMin; min += 30) {
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

  function showToast(message, type = 'info') {
    const region = document.getElementById('toast-region');
    if (!region) {
      alert(message);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    region.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 220);
    }, 3400);
  }

  const TITULOS_VISTAS = {
    'view-tut-dashboard': {
      sub: 'Seguimiento integral de citas médicas, esquema oficial de vacunación PAI y tratamientos activos.'
    },
    'view-tut-dosis': {
      sub: 'Cronograma diario de medicamentos indicados en consulta y confirmación de tomas.'
    },
    'view-tut-vacunas': {
      sub: 'Esquema oficial PAI con verificación de dosis aplicadas y pendientes.'
    },
    'view-tut-citas': {
      sub: 'Consulta horarios reales disponibles en la clínica para solicitar o reprogramar tu cita.'
    }
  };

  function cerrarMenuMovil() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const openBtn = document.getElementById('mobile-menu-open');
    if (sidebar) sidebar.classList.remove('is-open');
    if (backdrop) {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
  }

  function abrirMenuMovil() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const openBtn = document.getElementById('mobile-menu-open');
    if (sidebar) sidebar.classList.add('is-open');
    if (backdrop) {
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
  }

  function activateSubView(viewId) {
    if (!viewId) return;

    document.querySelectorAll('.subview').forEach((sec) => {
      const isTarget = sec.id === viewId;
      if (isTarget) {
        sec.classList.remove('is-hidden');

        sec.classList.remove('is-entering');
        void sec.offsetWidth;
        sec.classList.add('is-entering');
      } else {
        sec.classList.add('is-hidden');
        sec.classList.remove('is-entering');
      }
    });

    document.querySelectorAll('.sidebar .nav-item[data-nav-view]').forEach((btn) => {
      const isMatch = btn.getAttribute('data-nav-view') === viewId;
      if (isMatch) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    const subMeta = TITULOS_VISTAS[viewId];
    const subEl = document.getElementById('tut-page-sub');
    if (subMeta && subEl) {
      subEl.textContent = subMeta.sub;
    }

    cerrarMenuMovil();

    if (viewId === 'view-tut-citas') {
      const dateInput = document.getElementById('tut-appt-date');
      if (dateInput && dateInput.value) {
        cargarDisponibilidadFecha(dateInput.value);
      }
    }
  }

  let tutorActual = null;
  let hijosCache = [];
  let citasCache = [];
  let vacunasCache = [];
  let recetasCache = [];
  let citaConfirmadaFutura = null;

  function pintarCabeceraTutor(tutorData, pacientesList) {
    try {
      const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}');
      const tutor = tutorData || usuarioLocal || {};
      const nombreTutor = tutor.nombre || 'Tutor Familiar';
      const primerNombre = nombreTutor.split(' ')[0];

      const nameEl = document.getElementById('tut-sidebar-name');
      if (nameEl) nameEl.textContent = nombreTutor;

      const dniEl = document.getElementById('tut-sidebar-dni');
      if (dniEl) {
        dniEl.textContent = tutor.dni
          ? `DNI: ${tutor.dni}`
          : (tutor.telefono ? `Tel: ${tutor.telefono}` : 'Sesión verificada');
      }

      const iniciales = nombreTutor
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'TF';

      const avatarEl = document.getElementById('tut-sidebar-avatar');
      if (avatarEl) avatarEl.textContent = iniciales;

      const primerHijo = Array.isArray(pacientesList) && pacientesList.length > 0 ? pacientesList[0] : null;
      const titleEl = document.getElementById('tut-page-title');
      if (titleEl) {
        titleEl.textContent = primerHijo
          ? `Hola, ${primerNombre} · Salud de ${primerHijo.nombre}`
          : `Hola, ${primerNombre} · Dashboard del Tutor`;
      }

      const chipText = document.getElementById('tut-patient-chip-text');
      if (chipText) {
        if (primerHijo) {
          const pesoTxt = primerHijo.peso_kg ? `${primerHijo.peso_kg} kg` : 'Peso s/r';
          const tallaTxt = primerHijo.talla_cm ? `${primerHijo.talla_cm} cm` : 'Talla s/r';
          chipText.textContent = `${primerHijo.nombre} · ${pesoTxt} · ${tallaTxt}`;
        } else {
          chipText.textContent = 'Portal Familiar Activo';
        }
      }
    } catch (e) {
      console.error('Error en pintarCabeceraTutor:', e);
    }
  }

  async function cargarMisDatos() {
    try {
      const res = await fetch(`${API_URL}/tutor/mis-datos`, { headers: getHeaders() });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = 'login.html';
          return;
        }
        throw new Error('No se pudieron consultar los datos del tutor.');
      }

      const data = await res.json();
      tutorActual = data.tutor || null;
      hijosCache = data.pacientes || [];

      pintarCabeceraTutor(tutorActual, hijosCache);

      if (hijosCache.length > 0) {
        const p = hijosCache[0];
        const vaxTitle = document.getElementById('tut-full-vax-title');
        if (vaxTitle) {
          vaxTitle.textContent = `Carnet Digital Oficial de Vacunación PAI · ${p.nombre}`;
        }

        const vitalsSummary = document.getElementById('tut-vitals-summary');
        if (vitalsSummary) {
          const peso = p.peso_kg ? `${p.peso_kg} kg` : '-- kg';
          const talla = p.talla_cm ? `${p.talla_cm} cm` : '-- cm';
          vitalsSummary.textContent = `${p.nombre} · Último control: ${peso} y ${talla}`;
        }

        const wEl = document.getElementById('tut-child-weight');
        const hEl = document.getElementById('tut-child-height');
        const pcEl = document.getElementById('tut-child-pc');
        const tempEl = document.getElementById('tut-child-temp');
        const antEl = document.getElementById('tut-child-antecedentes');

        if (wEl) wEl.textContent = p.peso_kg ? `${p.peso_kg} kg` : '-- kg';
        if (hEl) hEl.textContent = p.talla_cm ? `${p.talla_cm} cm` : '-- cm';
        if (pcEl) pcEl.textContent = p.perimetro_cefalico ? `${p.perimetro_cefalico} cm` : '-- cm';
        if (tempEl) tempEl.textContent = p.temperatura ? `${p.temperatura} °C` : '-- °C';
        if (antEl) {
          const listaAnt = [p.cronicos, p.antecedentes].filter(Boolean);
          antEl.textContent = listaAnt.length > 0 ? listaAnt.join(' · ') : 'Sin antecedentes reportados ni crónicos.';
        }

        renderizarGraficoOMS(p);
      }
    } catch (e) {
      console.error('Error en cargarMisDatos:', e);
    }
  }

  let chartInstancia = null;

  function calcularMesesEdad(fechaNac) {
    if (!fechaNac) return 12;
    const fn = new Date(String(fechaNac).split('T')[0] + 'T00:00:00');
    const hoy = new Date();
    let m = (hoy.getFullYear() - fn.getFullYear()) * 12 + (hoy.getMonth() - fn.getMonth());
    if (hoy.getDate() < fn.getDate()) m--;
    return Math.max(0, Math.min(60, m));
  }

  function renderizarGraficoOMS(paciente) {
    const canvas = document.getElementById('tut-growth-chart');
    const statusBadge = document.getElementById('tut-growth-status');
    if (!canvas || typeof Chart === 'undefined') return;

    const meses = [0, 6, 12, 18, 24, 36, 48, 60];
    const etiquetas = ['0m', '6m', '1 año', '1.5a', '2 años', '3 años', '4 años', '5 años'];

    const curvaMas2SD = [4.3, 9.3, 11.8, 13.5, 15.0, 18.0, 20.8, 23.5];
    const curvaMediana = [3.3, 7.5, 9.6, 10.9, 12.0, 14.3, 16.3, 18.3];
    const curvaMenos2SD = [2.4, 5.9, 7.7, 8.6, 9.6, 11.3, 12.7, 14.1];

    const edadMeses = calcularMesesEdad(paciente?.fecha_nacimiento);
    const pesoActual = (paciente?.peso_kg !== null && paciente?.peso_kg !== undefined && paciente?.peso_kg !== '')
      ? parseFloat(paciente.peso_kg)
      : null;

    let minEsperado = 7.7;
    let maxEsperado = 11.8;
    for (let i = 0; i < meses.length - 1; i++) {
      if (edadMeses >= meses[i] && edadMeses <= meses[i + 1]) {
        const factor = (edadMeses - meses[i]) / (meses[i + 1] - meses[i]);
        minEsperado = curvaMenos2SD[i] + factor * (curvaMenos2SD[i + 1] - curvaMenos2SD[i]);
        maxEsperado = curvaMas2SD[i] + factor * (curvaMas2SD[i + 1] - curvaMas2SD[i]);
        break;
      }
    }

    let estadoVerde = true;
    if (pesoActual !== null) {
      if (pesoActual < minEsperado || pesoActual > maxEsperado) {
        estadoVerde = false;
      }
    }

    if (statusBadge) {
      if (pesoActual === null) {
        statusBadge.className = 'pill';
        statusBadge.style.background = '#F1F5F9';
        statusBadge.style.color = '#475569';
        statusBadge.textContent = 'Pendiente de Control';
      } else if (estadoVerde) {
        statusBadge.className = 'pill pill--pos';
        statusBadge.style.background = '#ECFDF5';
        statusBadge.style.color = '#047857';
        statusBadge.textContent = '🟢 Verde (Normal OMS)';
      } else {
        statusBadge.className = 'pill pill--warn';
        statusBadge.style.background = '#FEF3C7';
        statusBadge.style.color = '#B45309';
        statusBadge.textContent = '🟡 Requiere Atención';
      }
    }

    const serieNino = meses.map((m, idx) => {
      if (idx === 0 && edadMeses < 3) return pesoActual;
      if (idx === 1 && edadMeses >= 3 && edadMeses < 9) return pesoActual;
      if (idx === 2 && edadMeses >= 9 && edadMeses < 15) return pesoActual;
      if (idx === 3 && edadMeses >= 15 && edadMeses < 21) return pesoActual;
      if (idx === 4 && edadMeses >= 21 && edadMeses < 30) return pesoActual;
      if (idx === 5 && edadMeses >= 30 && edadMeses < 42) return pesoActual;
      if (idx === 6 && edadMeses >= 42 && edadMeses < 54) return pesoActual;
      if (idx === 7 && edadMeses >= 54) return pesoActual;
      return null;
    });

    if (chartInstancia) {
      chartInstancia.destroy();
    }

    const ctx = canvas.getContext('2d');
    chartInstancia = new Chart(ctx, {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: '+2 DE (Máximo Normal)',
            data: curvaMas2SD,
            borderColor: '#F59E0B',
            borderDash: [5, 5],
            backgroundColor: 'transparent',
            pointRadius: 0,
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: 'Mediana OMS (Normal P50)',
            data: curvaMediana,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            fill: true,
            pointRadius: 2,
            borderWidth: 2.5,
            tension: 0.3
          },
          {
            label: '-2 DE (Mínimo Normal)',
            data: curvaMenos2SD,
            borderColor: '#F59E0B',
            borderDash: [5, 5],
            backgroundColor: 'transparent',
            pointRadius: 0,
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: `Peso Actual (${paciente?.nombre || 'Niño'})`,
            data: serieNino,
            borderColor: '#0284C7',
            backgroundColor: '#0284C7',
            pointRadius: 7,
            pointHoverRadius: 9,
            pointStyle: 'circle',
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} kg`
            }
          }
        },
        scales: {
          y: {
            title: { display: true, text: 'Peso (kg)', font: { size: 11 } },
            min: 2,
            max: 26,
            grid: { color: '#F1F5F9' }
          },
          x: {
            title: { display: true, text: 'Edad', font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  async function cargarCarnet() {
    const fullTbody = document.getElementById('tut-full-vax-tbody');
    const previewList = document.getElementById('tut-vax-preview-list');
    const kpiPct = document.getElementById('tut-kpi-vax-pct');
    const kpiDelta = document.getElementById('tut-kpi-vax-delta');
    const fullPct = document.getElementById('tut-full-vax-pct');
    const navVaxBadge = document.getElementById('tut-nav-vax-badge');

    try {
      const res = await fetch(`${API_URL}/tutor/carnet`, { headers: getHeaders() });
      if (!res.ok) return;

      vacunasCache = await res.json();

      if (vacunasCache.length === 0) {
        if (kpiPct) kpiPct.innerHTML = `0% <small>al día</small>`;
        if (kpiDelta) kpiDelta.textContent = 'Sin registros de vacunas en el esquema PAI';
        if (fullPct) fullPct.textContent = '0% completado';
        if (fullTbody) {
          fullTbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No hay vacunas registradas en el carnet digital aún.</td></tr>';
        }
        if (previewList) {
          previewList.innerHTML = '<div class="empty-box">El esquema PAI se sincronizará en tu consulta pediátrica.</div>';
        }
        return;
      }

      let aplicadasCount = 0;

      const rowsHtml = vacunasCache.map(v => {
        const aplicada = (String(v.estado || '').toUpperCase() === 'APLICADA') || Boolean(v.aplicada);
        if (aplicada) aplicadasCount++;

        const checkSvg = `
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path d="m5 10.5 3.2 3.2L15 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        const pendingSvg = `
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="10" cy="10" r="7"/>
            <path d="M10 6.5v4l2.5 1.5" stroke-linecap="round"/>
          </svg>
        `;

        const estadoBadge = aplicada
          ? `<span class="pill pill--vax-applied">${checkSvg}<span>Aplicada</span></span>`
          : `<span class="pill pill--vax-pending">${pendingSvg}<span>Pendiente</span></span>`;

        const fechaTexto = v.fecha_aplicacion
          ? formatearFechaLegible(v.fecha_aplicacion)
          : 'Sellada en clínica';

        const firmaTexto = v.firmada_por || v.doctor_nombre || 'Dr. Elman Urbina';

        const detalleFirma = aplicada
          ? `<span class="vax-meta-applied num">${fechaTexto}</span><span class="cell-sub">Firma: ${firmaTexto}</span>`
          : `<span class="vax-meta-pending">Programada según edad PAI</span>`;

        return `
          <tr class="vax-row ${aplicada ? 'vax-row--applied' : 'vax-row--pending'}">
            <td>
              <div class="vax-name-cell">
                <span class="vax-status-icon ${aplicada ? 'is-applied' : 'is-pending'}" aria-hidden="true">
                  ${aplicada ? checkSvg : pendingSvg}
                </span>
                <div>
                  <strong class="vax-bio-name">${v.nombre}</strong>
                  ${v.paciente_nombre ? `<span class="cell-sub">${v.paciente_nombre}</span>` : ''}
                </div>
              </div>
            </td>
            <td><span class="vax-dose-text">${v.dosis || 'Dosis oficial'}</span></td>
            <td><span class="vax-age-text">${v.edad_recomendada || 'Esquema PAI'}</span></td>
            <td>${estadoBadge}</td>
            <td class="n">${detalleFirma}</td>
          </tr>
        `;
      }).join('');

      if (fullTbody) {
        fullTbody.innerHTML = rowsHtml;
      }

      const totalVax = vacunasCache.length;
      const pendientesCount = totalVax - aplicadasCount;
      const pct = Math.round((aplicadasCount / totalVax) * 100);

      if (kpiPct) kpiPct.innerHTML = `${pct}% <small>al día</small>`;
      if (fullPct) fullPct.textContent = `${pct}% completado (${aplicadasCount}/${totalVax})`;
      if (navVaxBadge) navVaxBadge.textContent = `${pct}%`;
      if (kpiDelta) {
        kpiDelta.innerHTML = `<span class="pos">${aplicadasCount} aplicadas</span> · <span class="warn">${pendientesCount} pendientes</span>`;
      }

      if (previewList) {
        const previewItems = vacunasCache.slice(0, 4);
        previewList.innerHTML = previewItems.map(v => {
          const aplicada = (String(v.estado || '').toUpperCase() === 'APLICADA') || Boolean(v.aplicada);
          return `
            <div class="summary-row ${aplicada ? 'summary-row--applied' : 'summary-row--pending'}">
              <div class="summary-row__info">
                <strong>${v.nombre} · ${v.dosis || 'PAI'}</strong>
                <span>Edad recomendada: ${v.edad_recomendada || 'Esquema oficial'}</span>
              </div>
              <span class="pill ${aplicada ? 'pill--vax-applied' : 'pill--vax-pending'}">
                ${aplicada ? 'Aplicada' : 'Pendiente'}
              </span>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.error('Error en cargarCarnet:', e);
    }
  }

  async function cargarRecetas() {
    const medsList = document.getElementById('tut-meds-list');
    const kpiLastRx = document.getElementById('tut-kpi-last-rx');
    const kpiLastRxMeta = document.getElementById('tut-kpi-last-rx-meta');
    const navCountMeds = document.getElementById('tut-nav-count-meds');
    const nextDosePill = document.getElementById('tut-next-dose-pill');

    try {
      const res = await fetch(`${API_URL}/tutor/recetas`, { headers: getHeaders() });
      if (!res.ok) return;

      recetasCache = await res.json();

      if (navCountMeds) {
        navCountMeds.textContent = String(recetasCache.length);
      }

      if (recetasCache.length === 0) {
        if (kpiLastRx) kpiLastRx.innerHTML = `Sin recetas <small>activas</small>`;
        if (kpiLastRxMeta) kpiLastRxMeta.textContent = 'No hay medicamentos pendientes de administrar hoy';
        if (nextDosePill) nextDosePill.textContent = 'Sin dosis pendientes';
        if (medsList) {
          medsList.innerHTML = `
            <div class="empty-box">
              No hay recetas médicas activas en este momento. Cuando el Dr. Elman Urbina emita una indicación, aparecerá aquí automáticamente.
            </div>
          `;
        }
        return;
      }

      const ultima = recetasCache[0];
      if (kpiLastRx) {
        kpiLastRx.innerHTML = `${ultima.medicamento} <small class="num">${ultima.dosis}</small>`;
      }
      if (kpiLastRxMeta) {
        const estadoTxt = ultima.estado === 'ACTIVA' ? 'Alerta WhatsApp activa' : 'En programación';
        kpiLastRxMeta.innerHTML = `Cada <span class="num">${ultima.frecuencia_horas}h</span> por <span class="num">${ultima.dias} días</span> · <span class="pos">${estadoTxt}</span>`;
      }
      if (nextDosePill) {
        nextDosePill.textContent = `Inicio: ${ultima.hora_inicio || '08:00 AM'} · Cada ${ultima.frecuencia_horas}h`;
      }

      if (medsList) {
        medsList.innerHTML = recetasCache.map(r => {
          const esActiva = r.estado === 'ACTIVA';
          const intMin = parseInt(r.intervalo_minutos, 10);
          const freqTexto = (!isNaN(intMin) && intMin > 0 && intMin % 60 !== 0)
            ? `Cada ${intMin} minuto(s)`
            : `Cada ${(!isNaN(intMin) && intMin > 0) ? Math.round(intMin / 60) : (r.frecuencia_horas || 8)} hora(s)`;
          const proxEnvioTxt = r.proximo_envio
            ? new Date(r.proximo_envio).toLocaleString('es-NI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : 'Pendiente de activar';
          return `
            <div class="rx-card">
              <div class="rx-card__top">
                <div>
                  <strong class="rx-card__title">${r.medicamento} · <span class="num">${r.dosis}</span></strong>
                  <p class="rx-card__sub num">
                    Frecuencia: ${freqTexto} durante ${r.dias} días (Inicio: ${r.hora_inicio || '08:00 AM'})
                  </p>
                  <p class="num" style="margin:4px 0 0 0; font-size:12px; color:#0F766E; font-weight:700;">
                    🔔 Próximo envío Push: ${proxEnvioTxt}
                  </p>
                </div>
                <span class="pill ${esActiva ? 'pill--vax-applied' : 'pill--vax-pending'}">
                  ${esActiva ? 'Activa' : 'En Recepción'}
                </span>
              </div>
              <p class="rx-card__diag">
                <strong>Diagnóstico CIE-10:</strong> <span class="num">${r.cie10}</span> · Médico: ${r.doctor_nombre || 'Dr. Elman Urbina'}
              </p>
              ${r.notas ? `<div class="rx-card__notes">Indicación médica: ${r.notas}</div>` : ''}
              <div class="rx-card__actions">
                <button type="button" class="btn btn--sm btn--primary" data-confirm-dose="${r.id}">
                  Registrar dosis administrada
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.error('Error en cargarRecetas:', e);
    }
  }

  function obtenerBadgeEstadoCita(estado, reprogramada = false) {
    const st = String(estado || '').toUpperCase();
    if (st === 'CONFIRMADA') {
      return {
        label: reprogramada ? 'Confirmada (Reprogramada)' : 'Confirmada',
        clase: 'pill--vax-applied'
      };
    }
    if (st === 'EN_SALA') {
      return { label: 'En Sala', clase: 'pill--info' };
    }
    if (st === 'ATENDIDA') {
      return { label: 'Atendida', clase: 'pill--neutral' };
    }
    if (st === 'PENDIENTE_VALIDACION') {
      return { label: 'Pendiente de confirmación', clase: 'pill--vax-pending' };
    }
    if (st === 'CANCELADA') {
      return { label: 'Cancelada', clase: 'pill--neg' };
    }
    return { label: estado || 'Registrada', clase: 'pill--neutral' };
  }

  async function cargarCitas() {
    const kpiNextAppt = document.getElementById('tut-kpi-next-appt');
    const kpiNextApptMeta = document.getElementById('tut-kpi-next-appt-meta');
    const tbodyHistorial = document.getElementById('tut-dashboard-citas-tbody');
    const sideList = document.getElementById('tut-citas-side-list');

    try {
      const res = await fetch(`${API_URL}/tutor/citas`, { headers: getHeaders() });
      if (!res.ok) return;

      citasCache = await res.json();
      const hoyIso = getIsoDatePlusDays(0);

      const citasFuturasActivas = citasCache
        .filter(c => {
          const fechaIso = c.fecha ? String(c.fecha).split('T')[0] : '';
          const st = String(c.estado || '').toUpperCase();
          return fechaIso >= hoyIso && st !== 'CANCELADA' && st !== 'ATENDIDA';
        })
        .sort((a, b) => {
          const fa = String(a.fecha).split('T')[0] + ' ' + String(a.hora);
          const fb = String(b.fecha).split('T')[0] + ' ' + String(b.hora);
          return fa.localeCompare(fb);
        });

      citaConfirmadaFutura = citasFuturasActivas.find(
        c => String(c.estado || '').toUpperCase() === 'CONFIRMADA'
      ) || null;

      const proximaCita = citaConfirmadaFutura || citasFuturasActivas[0] || null;
      if (proximaCita) {
        const fechaLeg = formatearFechaLegible(proximaCita.fecha);
        const horaLeg = formatearHora12(proximaCita.hora);
        const badgeMeta = obtenerBadgeEstadoCita(proximaCita.estado, proximaCita.reprogramada);
        if (kpiNextAppt) {
          kpiNextAppt.innerHTML = `${fechaLeg} <small>${horaLeg}</small>`;
        }
        if (kpiNextApptMeta) {
          kpiNextApptMeta.innerHTML = `${proximaCita.motivo || 'Control pediátrico'} · <span class="pos">${badgeMeta.label}</span>`;
        }
      } else {
        if (kpiNextAppt) kpiNextAppt.innerHTML = `Sin cita <small>próxima</small>`;
        if (kpiNextApptMeta) kpiNextApptMeta.textContent = 'Puedes solicitar una nueva cita en la pestaña Citas';
      }

      if (tbodyHistorial) {
        if (citasCache.length === 0) {
          tbodyHistorial.innerHTML = `
            <tr>
              <td colspan="3" class="empty-cell">No hay citas registradas para tu hijo(a) aún.</td>
            </tr>
          `;
        } else {
          tbodyHistorial.innerHTML = citasCache.map(c => {
            const fechaLeg = formatearFechaLegible(c.fecha);
            const horaLeg = formatearHora12(c.hora);
            const badge = obtenerBadgeEstadoCita(c.estado, c.reprogramada);
            return `
              <tr>
                <td class="num">
                  <strong>${fechaLeg}</strong>
                  <span class="cell-sub">${horaLeg} · Folio ${c.folio || 'CITA'}</span>
                </td>
                <td>
                  <span class="appt-reason-text">${c.motivo || 'Consulta pediátrica'}</span>
                  ${c.paciente_nombre ? `<span class="cell-sub">Paciente: ${c.paciente_nombre}</span>` : ''}
                </td>
                <td class="n">
                  <span class="pill ${badge.clase}">${badge.label}</span>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      if (sideList) {
        if (citasCache.length === 0) {
          sideList.innerHTML = '<div class="empty-box">Aún no tienes citas registradas.</div>';
        } else {
          sideList.innerHTML = citasCache.slice(0, 5).map(c => {
            const badge = obtenerBadgeEstadoCita(c.estado, c.reprogramada);
            return `
              <div class="summary-row">
                <div class="summary-row__info">
                  <strong class="num">${formatearFechaLegible(c.fecha)} · ${formatearHora12(c.hora)}</strong>
                  <span>${c.motivo || 'Control pediátrico'} (${c.folio || 'CITA'})</span>
                </div>
                <span class="pill ${badge.clase}">${badge.label}</span>
              </div>
            `;
          }).join('');
        }
      }

      actualizarModoFormularioCitas();
    } catch (e) {
      console.error('Error en cargarCitas:', e);
    }
  }

  function actualizarModoFormularioCitas() {
    const formTitle = document.getElementById('tut-appt-form-title');
    const modeBadge = document.getElementById('tut-appt-mode-badge');
    const banner = document.getElementById('tut-reschedule-banner');
    const bannerTitle = document.getElementById('tut-reschedule-banner-title');
    const bannerDesc = document.getElementById('tut-reschedule-banner-desc');
    const submitBtn = document.getElementById('btn-tut-appt-submit');
    const headerCtaLabel = document.getElementById('tut-header-cta-label');
    const dateInput = document.getElementById('tut-appt-date');
    const timeSelect = document.getElementById('tut-appt-time');
    const reasonInput = document.getElementById('tut-appt-reason');

    if (!submitBtn) return;

    if (citaConfirmadaFutura) {
      const fechaActual = formatearFechaLegible(citaConfirmadaFutura.fecha);
      const horaActual = formatearHora12(citaConfirmadaFutura.hora);
      const yaReprogramada = Boolean(citaConfirmadaFutura.reprogramada);

      if (banner) {
        banner.classList.remove('is-hidden');
        banner.classList.toggle('reschedule-banner--locked', yaReprogramada);
      }

      if (yaReprogramada) {

        if (formTitle) formTitle.textContent = 'Reprogramación de cita (Límite alcanzado)';
        if (modeBadge) {
          modeBadge.textContent = '1/1 Reprogramación usada';
          modeBadge.className = 'pill pill--vax-pending num';
        }
        if (bannerTitle) {
          bannerTitle.textContent = `Cita CONFIRMADA para el ${fechaActual} a las ${horaActual}`;
        }
        if (bannerDesc) {
          bannerDesc.textContent = 'Ya utilizaste tu única reprogramación permitida para esta cita confirmada. Para cambios adicionales, comunícate directamente con Recepción.';
        }
        submitBtn.textContent = 'Reprogramar (Límite de 1 cambio alcanzado)';
        submitBtn.disabled = true;
        if (dateInput) dateInput.disabled = true;
        if (timeSelect) timeSelect.disabled = true;
        if (reasonInput) reasonInput.disabled = true;
        if (headerCtaLabel) headerCtaLabel.textContent = 'Ver cita confirmada';
      } else {

        if (formTitle) formTitle.textContent = 'Reprogramar cita confirmada para mi hijo(a)';
        if (modeBadge) {
          modeBadge.textContent = 'Modo Reprogramación (1 disponible)';
          modeBadge.className = 'pill pill--vax-applied num';
        }
        if (bannerTitle) {
          bannerTitle.textContent = `Tienes una cita CONFIRMADA el ${fechaActual} a las ${horaActual}`;
        }
        if (bannerDesc) {
          bannerDesc.textContent = 'Como tutor puedes reprogramar tu cita confirmada una única vez. Elige la nueva fecha y bloque horario disponible.';
        }
        submitBtn.textContent = 'Reprogramar cita';
        submitBtn.disabled = false;
        if (dateInput) dateInput.disabled = false;
        if (timeSelect) timeSelect.disabled = false;
        if (reasonInput) {
          reasonInput.disabled = false;
          if (citaConfirmadaFutura.motivo) reasonInput.value = citaConfirmadaFutura.motivo;
        }
        if (headerCtaLabel) headerCtaLabel.textContent = 'Reprogramar cita';
      }
    } else {

      if (banner) banner.classList.add('is-hidden');
      if (formTitle) formTitle.textContent = 'Solicitar o reprogramar cita para mi hijo(a)';
      if (modeBadge) {
        modeBadge.textContent = 'Nueva solicitud';
        modeBadge.className = 'pill pill--info num';
      }
      submitBtn.textContent = 'Solicitar cita';
      submitBtn.disabled = false;
      if (dateInput) dateInput.disabled = false;
      if (timeSelect) timeSelect.disabled = false;
      if (reasonInput) reasonInput.disabled = false;
      if (headerCtaLabel) headerCtaLabel.textContent = 'Solicitar cita';
    }
  }

  let horasOcupadasFechaActual = new Set();

  async function cargarDisponibilidadFecha(fechaStr) {
    const selectHora = document.getElementById('tut-appt-time');
    const slotsGrid = document.getElementById('tut-appt-slots-grid');
    const dateHint = document.getElementById('tut-appt-date-hint');
    const submitBtn = document.getElementById('btn-tut-appt-submit');
    if (!selectHora || !slotsGrid) return;

    const fecha = fechaStr || getProximaFechaHabilIso();
    const partes = fecha.split('-');
    const fechaObj = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
    const diaSemana = fechaObj.getDay();

    if (diaSemana === 0) {
      if (dateHint) dateHint.textContent = 'Domingo: Clínica cerrada. Elige de lunes a sábado.';
      selectHora.innerHTML = '<option value="" disabled selected>Clínica cerrada los domingos</option>';
      slotsGrid.innerHTML = `
        <div class="empty-box empty-box--warn" style="grid-column: 1 / -1;">
          La clínica permanece cerrada los domingos. Por favor selecciona una fecha de lunes a viernes (08:00 – 17:00) o sábado (08:00 – 12:30).
        </div>
      `;
      return;
    }

    if (dateHint) {
      dateHint.textContent = diaSemana === 6
        ? 'Horario Sábado: 08:00 AM a 12:30 PM'
        : 'Horario Lunes a Viernes: 08:00 AM a 05:00 PM';
    }

    slotsGrid.innerHTML = '<div class="empty-box" style="grid-column: 1 / -1;">Verificando disponibilidad en la base de datos...</div>';

    try {
      let bloques = [];
      horasOcupadasFechaActual = new Set();

      const res = await fetch(`${API_URL}/tutor/disponibilidad?fecha=${encodeURIComponent(fecha)}`, {
        headers: getHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        bloques = data.bloques || [];
        (data.horasOcupadas || []).forEach(h => horasOcupadasFechaActual.add(String(h).slice(0, 5)));
      } else {

        const resPub = await fetch(`${API_URL}/public/horas-ocupadas/${encodeURIComponent(fecha)}`);
        const ocupadasPub = resPub.ok ? await resPub.json() : [];
        ocupadasPub.forEach(h => horasOcupadasFechaActual.add(String(h).slice(0, 5)));
        bloques = generarBloquesLocales(fecha).map(b => ({
          ...b,
          ocupado: horasOcupadasFechaActual.has(b.hora),
          disponible: !horasOcupadasFechaActual.has(b.hora)
        }));
      }

      const bloqueadoPorLimite = Boolean(citaConfirmadaFutura && citaConfirmadaFutura.reprogramada);

      selectHora.innerHTML = '';
      slotsGrid.innerHTML = '';

      let primerDisponible = null;

      bloques.forEach(b => {
        const ocupado = Boolean(b.ocupado);
        if (!ocupado && !primerDisponible) {
          primerDisponible = b.hora;
        }

        const opt = document.createElement('option');
        opt.value = b.hora;
        opt.disabled = ocupado;
        opt.textContent = ocupado
          ? `${b.etiqueta} — Ocupado (No disponible)`
          : `${b.etiqueta} — Disponible`;
        selectHora.appendChild(opt);

        const btnSlot = document.createElement('button');
        btnSlot.type = 'button';
        btnSlot.className = `tut-slot-btn num ${ocupado ? 'is-busy' : 'is-free'}`;
        btnSlot.setAttribute('data-tut-slot', b.hora);
        btnSlot.disabled = ocupado || bloqueadoPorLimite;
        btnSlot.innerHTML = `
          <span class="tut-slot-btn__time">${b.etiqueta}</span>
          <span class="tut-slot-btn__status">${ocupado ? 'Ocupado' : 'Disponible'}</span>
        `;
        slotsGrid.appendChild(btnSlot);
      });

      if (primerDisponible) {
        selectHora.value = primerDisponible;
        marcarSlotVisualActivo(primerDisponible);
      } else {
        const optNone = document.createElement('option');
        optNone.value = '';
        optNone.textContent = 'Sin bloques disponibles en esta fecha';
        selectHora.appendChild(optNone);
      }

      if (submitBtn && bloqueadoPorLimite) {
        submitBtn.disabled = true;
      }
    } catch (e) {
      console.error('Error en cargarDisponibilidadFecha:', e);
      slotsGrid.innerHTML = '<div class="empty-box" style="grid-column: 1 / -1;">No se pudo consultar la disponibilidad del servidor.</div>';
    }
  }

  function marcarSlotVisualActivo(horaSeleccionada) {
    document.querySelectorAll('[data-tut-slot]').forEach(btn => {
      const h = btn.getAttribute('data-tut-slot');
      btn.classList.toggle('is-selected', h === horaSeleccionada && !btn.disabled);
    });
  }

  function setupUI() {
    document.addEventListener('click', (e) => {

      const navTrigger = e.target.closest('[data-nav-view]');
      if (navTrigger) {
        e.preventDefault();
        const targetView = navTrigger.getAttribute('data-nav-view');
        activateSubView(targetView);
        return;
      }

      const slotBtn = e.target.closest('[data-tut-slot]');
      if (slotBtn && !slotBtn.disabled) {
        const hora = slotBtn.getAttribute('data-tut-slot');
        if (horasOcupadasFechaActual.has(hora)) {
          showToast('Este bloque horario ya está ocupado. Elige otro horario disponible.', 'error');
          return;
        }
        const selectHora = document.getElementById('tut-appt-time');
        if (selectHora) selectHora.value = hora;
        marcarSlotVisualActivo(hora);
        return;
      }

      const btnDose = e.target.closest('[data-confirm-dose]');
      if (btnDose) {
        btnDose.disabled = true;
        btnDose.textContent = 'Dosis administrada';
        btnDose.className = 'btn btn--sm btn--outline';
        showToast('Dosis registrada en tu bitácora diaria.', 'success');
        return;
      }

      const btnConfirmAll = e.target.closest('#btn-tut-confirm-all');
      if (btnConfirmAll) {
        const botones = document.querySelectorAll('[data-confirm-dose]:not(:disabled)');
        botones.forEach(btn => {
          btn.disabled = true;
          btn.textContent = 'Dosis administrada';
          btn.className = 'btn btn--sm btn--outline';
        });
        showToast('Todas las dosis del día fueron marcadas como administradas.', 'success');
        return;
      }

      if (e.target.closest('#mobile-menu-open')) {
        abrirMenuMovil();
        return;
      }
      if (e.target.closest('#mobile-menu-close') || e.target.closest('#sidebar-backdrop')) {
        cerrarMenuMovil();
        return;
      }

      const logoutBtn = e.target.closest('#tut-logout-link, .sidebar__links a, [href*="login.html"]');
      if (logoutBtn) {
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
        cerrarMenuMovil();
      }
    });

    const dateInput = document.getElementById('tut-appt-date');
    if (dateInput) {
      const hoy = getIsoDatePlusDays(0);
      dateInput.min = hoy;
      if (!dateInput.value) {
        dateInput.value = getProximaFechaHabilIso();
      }
      dateInput.addEventListener('change', () => {
        if (dateInput.value) {
          cargarDisponibilidadFecha(dateInput.value);
        }
      });
    }

    const timeSelect = document.getElementById('tut-appt-time');
    if (timeSelect) {
      timeSelect.addEventListener('change', () => {
        const val = timeSelect.value;
        if (horasOcupadasFechaActual.has(val)) {
          showToast('Ese bloque horario ya se encuentra ocupado.', 'error');
          return;
        }
        marcarSlotVisualActivo(val);
      });
    }

    const formAppt = document.getElementById('form-tut-appt');
    if (formAppt) {
      formAppt.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (citaConfirmadaFutura && citaConfirmadaFutura.reprogramada) {
          showToast('Solo puedes reprogramar tu cita confirmada una única vez.', 'error');
          return;
        }

        const fecha = document.getElementById('tut-appt-date')?.value;
        const hora = document.getElementById('tut-appt-time')?.value;
        const motivo = document.getElementById('tut-appt-reason')?.value.trim() || 'Control pediátrico y esquema PAI';

        if (!fecha || !hora) {
          showToast('Selecciona una fecha y una hora disponible.', 'error');
          return;
        }

        if (horasOcupadasFechaActual.has(hora)) {
          showToast('El bloque seleccionado ya está ocupado. Elige otro horario disponible.', 'error');
          return;
        }

        const submitBtn = document.getElementById('btn-tut-appt-submit');
        const origText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.textContent = citaConfirmadaFutura ? 'Reprogramando cita...' : 'Enviando solicitud...';
          submitBtn.disabled = true;
        }

        try {
          const esReprogramacion = Boolean(citaConfirmadaFutura && !citaConfirmadaFutura.reprogramada);
          const endpoint = esReprogramacion
            ? `${API_URL}/tutor/citas/${citaConfirmadaFutura.id}/reprogramar`
            : `${API_URL}/tutor/citas`;
          const method = esReprogramacion ? 'PUT' : 'POST';

          const res = await fetch(endpoint, {
            method,
            headers: getHeaders(),
            body: JSON.stringify({
              pacienteId: hijosCache.length > 0 ? hijosCache[0].id : undefined,
              fecha,
              hora,
              motivo
            })
          });

          const data = await res.json();

          if (res.ok) {
            showToast(
              esReprogramacion
                ? 'Cita reprogramada exitosamente (1/1 reprogramación utilizada).'
                : 'Solicitud de cita registrada exitosamente.',
              'success'
            );
            await cargarCitas();
            await cargarDisponibilidadFecha(fecha);
            activateSubView('view-tut-dashboard');
          } else {
            showToast(data.error || 'No se pudo procesar la cita.', 'error');
            await cargarDisponibilidadFecha(fecha);
          }
        } catch (err) {
          console.error('Error al solicitar/reprogramar cita:', err);
          showToast('Error de conexión con el servidor.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.textContent = origText;
            actualizarModoFormularioCitas();
          }
        }
      });
    }
  }

  const notificacionesMostradasSet = new Set();

  async function verificarNotificacionesPush() {
    try {
      const res = await fetch(`${API_URL}/tutor/notificaciones`, { headers: getHeaders() });
      if (!res.ok) return;
      const lista = await res.json();
      if (!Array.isArray(lista)) return;

      const noLeidas = lista.filter(n => !n.leida && !notificacionesMostradasSet.has(n.id));
      if (noLeidas.length > 0) {
        noLeidas.forEach(n => {
          notificacionesMostradasSet.add(n.id);
          showToast(`🔔 ${n.titulo}: ${n.mensaje}`, 'info');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(n.titulo, { body: n.mensaje });
          }
        });

        await fetch(`${API_URL}/tutor/notificaciones/leer`, {
          method: 'PUT',
          headers: getHeaders()
        });
        await cargarRecetas();
      }
    } catch (err) {

    }
  }

  async function initTutor() {
    pintarCabeceraTutor();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    await Promise.all([
      cargarMisDatos(),
      cargarCarnet(),
      cargarRecetas(),
      cargarCitas(),
      verificarNotificacionesPush()
    ]);

    setInterval(verificarNotificacionesPush, 15000);

    const dateInput = document.getElementById('tut-appt-date');
    if (dateInput && dateInput.value) {
      cargarDisponibilidadFecha(dateInput.value);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    initTutor();
  });
})();