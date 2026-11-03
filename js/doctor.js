(() => {
  'use strict';
const API_URL = 'https://clinica-backend-dx7x.onrender.com/api';
  function getAuthToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  function getAuthHeaders() {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
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

  let pacienteActivo = null;
  let pacientesEsperaCache = [];
  let todosPacientesCache = [];
  let triageFilter = 'all';

  function activateSubView(viewId) {
    if (!viewId) return;

    const targetId = viewId === 'view-doc-pacientes' ? 'view-doc-dashboard' : viewId;

    document.querySelectorAll('.subview').forEach((sec) => {
      sec.classList.toggle('is-hidden', sec.id !== targetId);
    });

    document.querySelectorAll('.sidebar .nav-item[data-nav-view]').forEach((btn) => {
      const isMatch = btn.getAttribute('data-nav-view') === targetId;
      if (isMatch) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    const titleEl = document.getElementById('doc-page-title');
    const subEl = document.getElementById('doc-page-sub');
    if (targetId === 'view-doc-dashboard') {
      if (titleEl) titleEl.textContent = 'Dashboard · Dr. Elman Urbina';
      if (subEl) subEl.textContent = 'Indicadores clínicos en tiempo real y fila de espera priorizada por Triage pediátrico.';
      cargarDashboardUnificado();
    } else if (targetId === 'view-doc-expediente') {
      if (titleEl) titleEl.textContent = 'Expediente Pediátrico Único y Esquema PAI';
      if (subEl) subEl.textContent = 'Historia clínica, signos vitales, consultas anteriores, curvas OMS y sellado oficial de vacunas.';
      if (!pacienteActivo && (pacientesEsperaCache.length > 0 || todosPacientesCache.length > 0)) {
        const primero = pacientesEsperaCache[0] || todosPacientesCache[0];
        if (primero) abrirExpedientePaciente(primero, false);
      }
    } else if (targetId === 'view-doc-medicacion') {
      if (titleEl) titleEl.textContent = 'Emitir Receta y Envío a Recepción';
      if (subEl) subEl.textContent = 'Prescripción médica editable. Al finalizar, el paciente pasa a ATENDIDA y la receta a PENDIENTE_RECEPCION.';
      prellenarPacienteEnReceta();
      cargarRecetasEnviadas();
    }

    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('is-open');
  }

  function cambiarTabExpediente(targetTabId) {
    if (!targetTabId) return;

    document.querySelectorAll('[data-doc-tab]').forEach((b) => {
      const isMatch = b.getAttribute('data-doc-tab') === targetTabId;
      b.setAttribute('aria-selected', String(isMatch));
    });

    document.querySelectorAll('.doc-tab-pane').forEach((pane) => {
      pane.classList.toggle('is-hidden', pane.id !== targetTabId);
    });
  }

  function calcularEdadTexto(fechaNac) {
    if (!fechaNac) return 'Edad no registrada';
    const fn = new Date(String(fechaNac).split('T')[0] + 'T00:00:00');
    const hoy = new Date();
    let meses = (hoy.getFullYear() - fn.getFullYear()) * 12 + (hoy.getMonth() - fn.getMonth());
    if (hoy.getDate() < fn.getDate()) meses--;
    meses = Math.max(1, meses);
    if (meses < 24) return `${meses} mes${meses === 1 ? '' : 'es'}`;
    const anos = Math.floor(meses / 12);
    const mRest = meses % 12;
    return mRest > 0 ? `${anos} años ${mRest} m` : `${anos} años`;
  }

  function buscarPacienteEnCaches(id) {
    return (
      pacientesEsperaCache.find(p => String(p.paciente_id) === String(id)) ||
      todosPacientesCache.find(p => String(p.paciente_id) === String(id)) ||
      null
    );
  }

  async function atenderPaciente(id) {
    if (!id) return;
    let paciente = buscarPacienteEnCaches(id);

    try {
      const res = await fetch(`${API_URL}/doctor/paciente/${id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const datosFrescos = await res.json();
        paciente = { ...(paciente || {}), ...datosFrescos };
      }
    } catch (e) {
      console.error(e);
    }

    if (paciente) {
      abrirExpedientePaciente(paciente, true);
      showToast(`Expediente clínico de ${paciente.paciente_nombre} cargado.`);
    }
  }

  function actualizarTarjetasSignosHeader(p) {
    const valWeight = document.getElementById('ehr-val-weight');
    const valHeight = document.getElementById('ehr-val-height');
    const valHeadSub = document.getElementById('ehr-val-head-sub');
    const valTemp = document.getElementById('ehr-val-temp');
    const valPerinatal = document.getElementById('ehr-val-perinatal');

    if (valWeight) valWeight.textContent = p.peso_kg ? `${p.peso_kg} kg` : 'Sin registro';
    if (valHeight) valHeight.textContent = p.talla_cm ? `${p.talla_cm} cm` : 'Sin registro';
    if (valHeadSub) valHeadSub.textContent = `Perímetro cefálico: ${p.perimetro_cefalico ? `${p.perimetro_cefalico} cm` : 'Sin registro'}`;
    if (valTemp) valTemp.textContent = p.temperatura ? `${p.temperatura} °C` : 'Sin registro';
    if (valPerinatal) {
      valPerinatal.textContent = p.antecedentes && String(p.antecedentes).trim()
        ? String(p.antecedentes).trim().slice(0, 48)
        : 'Sin antecedentes perinatales';
    }
  }

  let antecedentesTags = [];

  function renderizarTagsAntecedentes() {
    const listEl = document.getElementById('doc-family-tags-list');
    const hiddenInput = document.getElementById('input-doc-family-history');
    if (!listEl) return;

    if (antecedentesTags.length === 0) {
      listEl.innerHTML = '<span style="font-size: 12.5px; color: #94A3B8; font-style: italic;">Sin antecedentes registrados aún. Escribe arriba para agregar.</span>';
    } else {
      listEl.innerHTML = antecedentesTags.map((tag, idx) => `
        <span class="tag-chip">
          <span>${tag}</span>
          <button type="button" class="tag-chip__remove" data-remove-tag="${idx}" aria-label="Eliminar ${tag}">&times;</button>
        </span>
      `).join('');
    }

    if (hiddenInput) {
      hiddenInput.value = antecedentesTags.join(', ');
    }
  }

  function agregarTagAntecedente(texto) {
    if (!texto) return;
    const partes = texto.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
    partes.forEach(p => {
      const yaExiste = antecedentesTags.some(t => t.toLowerCase() === p.toLowerCase());
      if (!yaExiste) {
        antecedentesTags.push(p);
      }
    });
    renderizarTagsAntecedentes();
  }

  function eliminarTagAntecedente(idx) {
    if (idx >= 0 && idx < antecedentesTags.length) {
      antecedentesTags.splice(idx, 1);
      renderizarTagsAntecedentes();
    }
  }

  function setTagsDesdeString(str) {
    antecedentesTags = [];
    if (str && typeof str === 'string') {
      const partes = str.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
      antecedentesTags = [...partes];
    }
    renderizarTagsAntecedentes();
  }

  function abrirExpedientePaciente(p, cambiarVista = true) {
    if (!p) return;
    pacienteActivo = p;

    if (cambiarVista) {
      activateSubView('view-doc-expediente');
    }

    const nameEl = document.getElementById('ehr-patient-name');
    if (nameEl) nameEl.textContent = p.paciente_nombre || 'Paciente';

    const codeEl = document.getElementById('ehr-patient-code');
    if (codeEl) codeEl.textContent = `PAC-${String(p.paciente_id || '').slice(0, 6).toUpperCase()}`;

    const summaryEl = document.getElementById('ehr-patient-summary');
    if (summaryEl) {
      const fnStr = p.fecha_nacimiento ? String(p.fecha_nacimiento).split('T')[0] : 'N/A';
      summaryEl.textContent = `Edad: ${calcularEdadTexto(p.fecha_nacimiento)} · Nac: ${fnStr} · Tutor: ${p.tutor_nombre || 'N/A'} (Tel: ${p.tutor_telefono || 'N/A'})`;
    }

    const triageBadge = document.getElementById('ehr-patient-triage');
    if (triageBadge) {
      const triageUpper = (p.triage || 'VERDE').toUpperCase();
      triageBadge.className = `triage-badge triage-badge--${triageUpper.toLowerCase()}`;
      triageBadge.innerHTML = `<span class="triage-dot"></span><span>Triage ${triageUpper}</span>`;
    }

    const switcher = document.getElementById('ehr-switcher');
    if (switcher) switcher.value = p.paciente_id;

    const chronicDesc = document.getElementById('ehr-chronic-desc');
    const inputChronic = document.getElementById('input-chronic-text');
    const cronicosTexto = p.cronicos && String(p.cronicos).trim()
      ? String(p.cronicos).trim()
      : 'Sin alergias ni padecimientos crónicos registrados.';

    if (chronicDesc) chronicDesc.textContent = cronicosTexto;
    if (inputChronic) inputChronic.value = p.cronicos && String(p.cronicos).trim() ? String(p.cronicos).trim() : '';

    actualizarTarjetasSignosHeader(p);

    const weightInput = document.getElementById('input-doc-weight');
    const heightInput = document.getElementById('input-doc-height');
    const headInput = document.getElementById('input-doc-head');
    const tempInput = document.getElementById('input-doc-temp');

    if (weightInput) weightInput.value = p.peso_kg !== null && p.peso_kg !== undefined ? p.peso_kg : '';
    if (heightInput) heightInput.value = p.talla_cm !== null && p.talla_cm !== undefined ? p.talla_cm : '';
    if (headInput) headInput.value = p.perimetro_cefalico !== null && p.perimetro_cefalico !== undefined ? p.perimetro_cefalico : '';
    if (tempInput) tempInput.value = p.temperatura !== null && p.temperatura !== undefined ? p.temperatura : '';

    setTagsDesdeString(p.antecedentes || '');

    prellenarPacienteEnReceta();

    cargarVacunasPAI(p.paciente_id);
    cargarHistorialConsultas(p.paciente_id);
    actualizarCurvasOMS(p);

    cambiarTabExpediente('doc-tab-vacunas');
  }

  function prellenarPacienteEnReceta() {
    const selectPaciente = document.getElementById('med-plan-patient');
    if (!selectPaciente || !pacienteActivo) return;

    let optionExists = Array.from(selectPaciente.options).some(opt => String(opt.value) === String(pacienteActivo.paciente_id));
    if (!optionExists) {
      const newOption = new Option(pacienteActivo.paciente_nombre || 'Paciente actual', pacienteActivo.paciente_id);
      selectPaciente.add(newOption);
    }
    selectPaciente.value = pacienteActivo.paciente_id;
  }

  async function cargarVacunasPAI(pacienteId) {
    const tbody = document.getElementById('doc-vax-tbody');
    if (!tbody || !pacienteId) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px; color:#64748B;">Consultando esquema PAI en PostgreSQL...</td></tr>';

    try {
      const res = await fetch(`${API_URL}/doctor/paciente/${pacienteId}/vacunas`, {
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Error al cargar vacunas');
      const vacunas = await res.json();

      const totalVax = vacunas.length || 13;
      const aplicadasCount = vacunas.filter(v => Boolean(v.aplicada) || v.estado === 'APLICADA').length;
      const pct = Math.round((aplicadasCount / totalVax) * 100);

      const pctPill = document.getElementById('ehr-vax-pct-pill');
      const countLabel = document.getElementById('ehr-vax-count-label');
      const progBar = document.getElementById('ehr-vax-progress-bar');

      if (pctPill) pctPill.textContent = `${pct}%`;
      if (countLabel) countLabel.textContent = `${aplicadasCount} de ${totalVax} aplicadas`;
      if (progBar) progBar.style.width = `${pct}%`;

      if (vacunas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px;">Sin registros de vacunas.</td></tr>';
        return;
      }

      tbody.innerHTML = vacunas.map(v => {
        const aplicada = Boolean(v.aplicada) || v.estado === 'APLICADA';
        const estadoHtml = aplicada
          ? `<span class="pill pill--pos" style="font-weight:700;">✅ Aplicada</span><br><small style="color:#64748B;">${v.fecha_aplicacion ? String(v.fecha_aplicacion).split('T')[0] : 'Sellada'} · ${v.firmada_por || v.doctor_nombre || 'Dr. Elman Urbina'}</small>`
          : `<span class="pill pill--warn" style="background:#FFF1F2; color:#BE123C; font-weight:700;">Pendiente</span>`;

        const accionHtml = aplicada
          ? `<span style="color:#10B981; font-size:12px; font-weight:600;">Sellada en carnet</span>`
          : `<button type="button" class="btn btn--sm btn--primary" data-aplicar-vacuna="${v.id}">Aplicar y Sellar</button>`;

        return `
          <tr>
            <td><strong>${v.nombre}</strong><br><small style="color:#64748B;">Edad recomendada: ${v.edad_recomendada}</small></td>
            <td>${v.dosis}</td>
            <td>${estadoHtml}</td>
            <td class="n">${accionHtml}</td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#BE123C; padding:16px;">Error de conexión con el esquema de vacunas.</td></tr>';
    }
  }

  async function aplicarVacuna(vacunaId) {
    if (!vacunaId) return;

    try {
      const res = await fetch(`${API_URL}/doctor/vacuna/${vacunaId}/aplicar`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        showToast('✅ Vacuna aplicada y sellada con fecha y firma médica en la BD.', 'success');
        if (pacienteActivo) {
          cargarVacunasPAI(pacienteActivo.paciente_id);
        }
      } else {
        const d = await res.json();
        showToast(d.error || 'No se pudo registrar la aplicación de la vacuna.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al sellar la vacuna.', 'error');
    }
  }

  async function cargarHistorialConsultas(pacienteId) {
    const tbody = document.getElementById('ehr-consultas-tbody');
    if (!tbody || !pacienteId) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:#64748B;">Cargando historial clínico real...</td></tr>';

    try {
      const res = await fetch(`${API_URL}/doctor/paciente/${pacienteId}/historial`, {
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Error al cargar historial');
      const data = await res.json();
      const recetas = Array.isArray(data.recetas) ? data.recetas : [];
      const citas = Array.isArray(data.citasAtendidas) ? data.citasAtendidas : [];

      if (Array.isArray(data.historialMedidas) && pacienteActivo) {
        pacienteActivo.historial_medidas = data.historialMedidas;
        actualizarCurvasOMS(pacienteActivo);
      }

      const filas = [];

      recetas.forEach(r => {
        const fechaStr = r.fecha ? String(r.fecha).split('T')[0] : 'Reciente';
        filas.push(`
          <tr>
            <td class="num">${fechaStr}</td>
            <td><span class="pill pill--info num">${r.cie10}</span></td>
            <td><strong>${r.medicamento}</strong> (${r.dosis})<br><small style="color:#64748B;">${r.notas || 'Sin notas adicionales'}</small></td>
            <td class="n num">Cada ${r.frecuencia_horas}h x ${r.dias}d · <span class="pill pill--pos" style="font-size:11px;">${r.estado}</span></td>
            <td>${r.doctor_nombre || 'Dr. Elman Urbina'}</td>
          </tr>
        `);
      });

      citas.forEach(c => {
        const fechaStr = c.fecha ? String(c.fecha).split('T')[0] : '';
        filas.push(`
          <tr>
            <td class="num">${fechaStr}</td>
            <td><span class="pill pill--pos num">${c.folio || 'CITA'}</span> Consulta Atendida</td>
            <td>${c.motivo || 'Control pediátrico general'}</td>
            <td class="n num"><span class="pill pill--pos" style="font-size:11px;">ATENDIDA</span></td>
            <td>${c.doctor_nombre || 'Dr. Elman Urbina'}</td>
          </tr>
        `);
      });

      if (filas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748B;">Este paciente aún no registra consultas o recetas previas en la base de datos.</td></tr>';
      } else {
        tbody.innerHTML = filas.join('');
      }
    } catch (e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:#BE123C;">Error al cargar el historial de consultas.</td></tr>';
    }
  }

  function actualizarCurvasOMS(p) {
    if (!p) return;

    const pesoVal = parseFloat(p.peso_kg) || parseFloat(document.getElementById('input-doc-weight')?.value) || 10.0;
    const tallaVal = parseFloat(p.talla_cm) || parseFloat(document.getElementById('input-doc-height')?.value) || 75.0;
    const perimVal = parseFloat(p.perimetro_cefalico) || parseFloat(document.getElementById('input-doc-head')?.value) || 45.0;

    let mesesActuales = 12;
    if (p.fecha_nacimiento) {
      const diffMs = new Date() - new Date(String(p.fecha_nacimiento).split('T')[0] + 'T00:00:00');
      mesesActuales = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
    }

    function calcMedianas(meses) {
      const pesoMed = 3.3 + (meses <= 12 ? meses * 0.6 : 7.2 + (meses - 12) * 0.22);
      const tallaMed = 50.0 + (meses <= 12 ? meses * 2.1 : 25.0 + (meses - 12) * 0.9);
      const perimMed = 35.0 + (meses <= 12 ? meses * 0.95 : 11.4 + (meses - 12) * 0.15);
      return { pesoMed, tallaMed, perimMed };
    }

    function zScoreAPercentil(z) {
      const pct = Math.round((1 / (1 + Math.exp(-1.702 * z))) * 100);
      return Math.max(1, Math.min(99, pct));
    }

    const { pesoMed: pesoMediana, tallaMed: tallaMediana, perimMed: perimMediana } = calcMedianas(mesesActuales);

    const zPeso = (pesoVal - pesoMediana) / (pesoMediana * 0.12);
    const zTalla = (tallaVal - tallaMediana) / (tallaMediana * 0.04);
    const zPerim = (perimVal - perimMediana) / (perimMediana * 0.04);

    const pctPeso = zScoreAPercentil(zPeso);
    const pctTalla = zScoreAPercentil(zTalla);
    const pctPerim = zScoreAPercentil(zPerim);

    const badgeW = document.getElementById('oms-badge-weight');
    const valW = document.getElementById('oms-val-weight');
    const barW = document.getElementById('oms-bar-weight');
    if (badgeW) badgeW.textContent = `P${pctPeso} · ${zPeso >= 0 ? '+' : ''}${zPeso.toFixed(2)} SD`;
    if (valW) valW.textContent = `${pesoVal.toFixed(1)} kg · ${Math.abs(zPeso) <= 1.5 ? 'Verde (Normal)' : 'Seguimiento'}`;
    if (barW) barW.style.width = `${pctPeso}%`;

    const badgeH = document.getElementById('oms-badge-height');
    const valH = document.getElementById('oms-val-height');
    const barH = document.getElementById('oms-bar-height');
    if (badgeH) badgeH.textContent = `P${pctTalla} · ${zTalla >= 0 ? '+' : ''}${zTalla.toFixed(2)} SD`;
    if (valH) valH.textContent = `${tallaVal.toFixed(1)} cm · ${Math.abs(zTalla) <= 1.5 ? 'Verde (Normal)' : 'Seguimiento'}`;
    if (barH) barH.style.width = `${pctTalla}%`;

    const badgeHead = document.getElementById('oms-badge-head');
    const valHead = document.getElementById('oms-val-head');
    const barHead = document.getElementById('oms-bar-head');
    if (badgeHead) badgeHead.textContent = `P${pctPerim} · ${zPerim >= 0 ? '+' : ''}${zPerim.toFixed(2)} SD`;
    if (valHead) valHead.textContent = `${perimVal.toFixed(1)} cm · ${Math.abs(zPerim) <= 1.5 ? 'Verde (Normal)' : 'Seguimiento'}`;
    if (barHead) barHead.style.width = `${pctPerim}%`;

    const rawHistorial = Array.isArray(p.historial_medidas) && p.historial_medidas.length > 0
      ? p.historial_medidas
      : (Array.isArray(p.historialMedidas) && p.historialMedidas.length > 0 ? p.historialMedidas : []);

    const puntos = [];
    const fechaNac = p.fecha_nacimiento ? new Date(String(p.fecha_nacimiento).split('T')[0] + 'T00:00:00') : null;

    rawHistorial.forEach(m => {
      const pesoM = parseFloat(m.peso_kg);
      if (isNaN(pesoM) || pesoM <= 0) return;
      let mesesM = mesesActuales;
      if (fechaNac && m.fecha) {
        const dMed = new Date(String(m.fecha).split('T')[0] + 'T00:00:00');
        mesesM = Math.max(0, Math.round((dMed - fechaNac) / (1000 * 60 * 60 * 24 * 30.4375)));
      }
      puntos.push({
        fecha: m.fecha ? String(m.fecha).split('T')[0] : 'N/A',
        meses: mesesM,
        peso: pesoM,
        talla: parseFloat(m.talla_cm) || null,
        pc: parseFloat(m.perimetro_cefalico) || null,
        temp: parseFloat(m.temperatura) || null
      });
    });

    if (puntos.length === 0) {
      puntos.push({
        fecha: new Date().toISOString().split('T')[0],
        meses: mesesActuales,
        peso: pesoVal,
        talla: tallaVal,
        pc: perimVal,
        temp: parseFloat(p.temperatura) || null
      });
    }

    puntos.sort((a, b) => a.meses - b.meses);

    const maxMeses = Math.max(36, ...puntos.map(pt => pt.meses));
    const maxPeso = Math.max(18, Math.ceil((Math.max(...puntos.map(pt => pt.peso)) + 3) / 5) * 5);

    function xCoord(m) {
      return 35 + (Math.min(m, maxMeses) / maxMeses) * 440;
    }
    function yCoord(w) {
      return 160 - (Math.min(w, maxPeso) / maxPeso) * 135;
    }

    const curvePointsP97 = [];
    const curvePointsP50 = [];
    const curvePointsP3 = [];

    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const mStep = (maxMeses / steps) * i;
      const { pesoMed } = calcMedianas(mStep);
      const wP97 = pesoMed + (pesoMed * 0.12 * 1.88);
      const wP50 = pesoMed;
      const wP3 = Math.max(1.5, pesoMed - (pesoMed * 0.12 * 1.88));

      curvePointsP97.push(`${xCoord(mStep).toFixed(1)},${yCoord(wP97).toFixed(1)}`);
      curvePointsP50.push(`${xCoord(mStep).toFixed(1)},${yCoord(wP50).toFixed(1)}`);
      curvePointsP3.push(`${xCoord(mStep).toFixed(1)},${yCoord(wP3).toFixed(1)}`);
    }

    puntos.forEach(pt => {
      pt.cx = xCoord(pt.meses);
      pt.cy = yCoord(pt.peso);
    });

    const polylinePoints = puntos.map(pt => `${pt.cx.toFixed(1)},${pt.cy.toFixed(1)}`).join(' ');

    const chartEl = document.getElementById('doc-who-chart');
    if (chartEl) {
      const circlesSvg = puntos.map((pt, idx) => `
        <circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy.toFixed(1)}" r="${idx === puntos.length - 1 ? 6.5 : 5}" fill="#0284C7" stroke="#FFFFFF" stroke-width="2">
          <title>${pt.fecha} (${pt.meses}m): ${pt.peso.toFixed(1)} kg${pt.talla ? ` · ${pt.talla} cm` : ''}</title>
        </circle>
      `).join('');

      const ultimoPt = puntos[puntos.length - 1];
      const textX = Math.min(350, Math.max(40, ultimoPt.cx - 20));
      const textY = Math.max(22, ultimoPt.cy - 10);

      chartEl.innerHTML = `
        <svg viewBox="0 0 500 190" style="width:100%; height:auto; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:8px;" role="img" aria-label="Curva de crecimiento ponderal OMS">
          <line x1="35" y1="160" x2="475" y2="160" stroke="#CBD5E1" stroke-width="1.5" />
          <line x1="35" y1="25" x2="35" y2="160" stroke="#CBD5E1" stroke-width="1.5" />
          <line x1="35" y1="92" x2="475" y2="92" stroke="#F1F5F9" stroke-width="1" stroke-dasharray="2,2" />

          <!-- Curvas Oficiales OMS -->
          <polyline points="${curvePointsP97.join(' ')}" fill="none" stroke="#FBBF24" stroke-width="2" stroke-dasharray="4,4" />
          <polyline points="${curvePointsP50.join(' ')}" fill="none" stroke="#10B981" stroke-width="2.5" />
          <polyline points="${curvePointsP3.join(' ')}" fill="none" stroke="#F87171" stroke-width="2" stroke-dasharray="4,4" />

          <!-- Leyendas percentiles -->
          <text x="478" y="${yCoord(calcMedianas(maxMeses).pesoMed * 1.22) + 3}" font-size="9" fill="#D97706" font-weight="600">P97 (+2 SD)</text>
          <text x="478" y="${yCoord(calcMedianas(maxMeses).pesoMed) + 3}" font-size="9" fill="#059669" font-weight="600">P50 (Mediana)</text>
          <text x="478" y="${yCoord(calcMedianas(maxMeses).pesoMed * 0.78) + 3}" font-size="9" fill="#DC2626" font-weight="600">P3 (-2 SD)</text>

          <!-- Evolución del Niño -->
          ${puntos.length > 1 ? `<polyline points="${polylinePoints}" fill="none" stroke="#0284C7" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />` : ''}
          ${circlesSvg}

          <rect x="${textX - 4}" y="${textY - 12}" width="150" height="18" rx="4" fill="#0F172A" opacity="0.88" />
          <text x="${textX + 4}" y="${textY}" font-size="10.5" font-weight="700" fill="#FFFFFF">
            Último: ${ultimoPt.peso.toFixed(1)} kg (${ultimoPt.meses}m)
          </text>

          <text x="35" y="176" font-size="10" fill="#64748B" text-anchor="start">0m (Nac.)</text>
          <text x="${xCoord(Math.round(maxMeses / 2))}" y="176" font-size="10" fill="#64748B" text-anchor="middle">${Math.round(maxMeses / 2)} meses</text>
          <text x="475" y="176" font-size="10" fill="#64748B" text-anchor="end">${maxMeses} meses</text>

          <text x="30" y="163" font-size="9" fill="#64748B" text-anchor="end">0</text>
          <text x="30" y="${yCoord(maxPeso / 2) + 3}" font-size="9" fill="#64748B" text-anchor="end">${(maxPeso / 2).toFixed(0)}kg</text>
          <text x="30" y="28" font-size="9" fill="#64748B" text-anchor="end">${maxPeso}kg</text>
        </svg>
      `;
    }

    const tbodyMedidas = document.getElementById('ehr-medidas-tbody');
    if (tbodyMedidas) {
      const puntosDesc = [...puntos].reverse();
      tbodyMedidas.innerHTML = puntosDesc.map((pt, idx) => {
        const { pesoMed } = calcMedianas(pt.meses);
        const zP = (pt.peso - pesoMed) / (pesoMed * 0.12);
        const pctP = zScoreAPercentil(zP);
        const normal = Math.abs(zP) <= 1.5;
        const esReciente = idx === 0;

        return `
          <tr style="${esReciente ? 'background:#F0FDF4; font-weight:600;' : ''}">
            <td class="num">${pt.fecha}${esReciente ? ' <span class="pill pill--pos" style="font-size:10px; margin-left:4px;">Actual</span>' : ''}</td>
            <td class="num">${pt.meses} meses</td>
            <td class="num">${pt.peso.toFixed(2)} kg</td>
            <td class="num">${pt.talla ? `${pt.talla.toFixed(1)} cm` : '--'}</td>
            <td class="num">${pt.pc ? `${pt.pc.toFixed(1)} cm` : '--'}</td>
            <td class="num">${pt.temp ? `${pt.temp.toFixed(1)} °C` : '--'}</td>
            <td>
              <span class="pill ${normal ? 'pill--pos' : 'pill--warn'}" style="font-size:11px;">
                P${pctP} · ${zP >= 0 ? '+' : ''}${zP.toFixed(2)} SD (${normal ? 'Normal' : 'Seguimiento'})
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  let recetasDoctorCache = [];

  function formatearIntervaloDoc(r) {
    const intMin = parseInt(r.intervalo_minutos, 10);
    if (!isNaN(intMin) && intMin > 0) {
      if (intMin % 60 === 0) return `Cada ${intMin / 60} hora(s)`;
      return `Cada ${intMin} minuto(s)`;
    }
    return `Cada ${r.frecuencia_horas || 8} horas`;
  }

  function formatearProximoEnvioDoc(fechaIso) {
    if (!fechaIso) return 'Al activar horario';
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

  async function cargarRecetasEnviadas(fechaFiltro = '') {
    const listContainer = document.getElementById('doc-active-plans-list');
    const navPlansBadge = document.getElementById('doc-nav-count-plans');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="padding:16px; text-align:center; color:#64748B;">Consultando recetas enviadas...</div>';

    try {
      const query = fechaFiltro ? `?fecha=${encodeURIComponent(fechaFiltro)}` : '';
      const res = await fetch(`${API_URL}/doctor/recetas${query}`, {
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Error al cargar recetas');
      const recetas = await res.json();
      recetasDoctorCache = Array.isArray(recetas) ? recetas : [];

      if (navPlansBadge && !fechaFiltro) {
        navPlansBadge.textContent = String(recetasDoctorCache.length);
      }

      if (recetasDoctorCache.length === 0) {
        listContainer.innerHTML = `
          <div style="padding:20px; text-align:center; border:1px dashed #CBD5E1; border-radius:8px; color:#64748B; font-size:13px;">
            No hay recetas registradas para la fecha seleccionada.
          </div>
        `;
        return;
      }

      listContainer.innerHTML = recetasDoctorCache.map(r => {
        const esActiva = r.estado === 'ACTIVA';
        const fechaCorta = r.creado_en ? String(r.creado_en).split('T')[0] : '';
        return `
          <div style="padding:14px 16px; border:1px solid #E2E8F0; border-left:4px solid ${esActiva ? '#10B981' : '#F59E0B'}; border-radius:8px; background:#FFFFFF;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
              <strong style="font-size:14px; color:#0F172A;">${r.paciente_nombre}</strong>
              <span class="pill ${esActiva ? 'pill--pos' : 'pill--warn'}" style="font-size:11px;">${r.estado}</span>
            </div>
            <div style="font-size:12px; color:#0369A1; font-weight:600; margin-bottom:4px;">${r.cie10}</div>
            <div style="font-size:13px; color:#334155;">
              <strong>${r.medicamento}</strong> · ${r.dosis}
            </div>
            <div class="num" style="font-size:12px; color:#64748B; margin-top:4px;">
              ⏰ Inicio: ${r.hora_inicio || '08:00'} · ${formatearIntervaloDoc(r)} por ${r.dias} días · Fecha: ${fechaCorta}
            </div>
            <div class="num" style="font-size:12px; color:#0F766E; font-weight:700; margin-top:4px;">
              🔔 Próximo envío: ${formatearProximoEnvioDoc(r.proximo_envio)}
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
              <button type="button" class="btn btn--sm" data-doc-test-push-rx="${r.id}" style="border:1px solid #0F766E; color:#0F766E; font-weight:700;">
                🔔 Probar Push Ahora
              </button>
              <button type="button" class="btn btn--sm btn--primary" data-doc-programar-rx="${r.id}">
                Programar Horarios
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
      listContainer.innerHTML = '<div style="padding:16px; color:#BE123C; text-align:center;">Error al cargar recetas enviadas.</div>';
    }
  }

  function actualizarPreviewEmisionRecetaDoctor() {
    const unitSelect = document.getElementById('med-plan-interval-unit');
    const freqInput = document.getElementById('med-plan-freq');
    const previewEl = document.getElementById('doc-med-next-send-preview');
    if (!previewEl) return;

    const unit = unitSelect ? unitSelect.value : 'horas';
    const rawVal = Math.max(1, parseInt(freqInput ? freqInput.value : '8', 10) || 1);
    const intervaloMinutos = unit === 'minutos' ? rawVal : rawVal * 60;
    const proxDate = new Date(Date.now() + intervaloMinutos * 60000);

    previewEl.textContent = `Próximo envío: ${proxDate.toLocaleString('es-NI', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} (${unit === 'minutos' ? `Cada ${rawVal} min` : `Cada ${rawVal} h`})`;
  }

  function actualizarPreviewModalHorarioDoctor() {
    const unitSelect = document.getElementById('doc-sched-interval-unit');
    const valInput = document.getElementById('doc-sched-interval-val');
    const previewEl = document.getElementById('doc-sched-next-send-preview');
    if (!previewEl) return;

    const unit = unitSelect ? unitSelect.value : 'horas';
    const rawVal = Math.max(1, parseInt(valInput ? valInput.value : '8', 10) || 1);
    const intervaloMinutos = unit === 'minutos' ? rawVal : rawVal * 60;
    const proxDate = new Date(Date.now() + intervaloMinutos * 60000);

    previewEl.textContent = `Próximo envío: ${proxDate.toLocaleString('es-NI', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} (${unit === 'minutos' ? `Cada ${rawVal} min` : `Cada ${rawVal} h`})`;
  }

  function abrirModalProgramarHorarioDoctor(rxId) {
    const receta = recetasDoctorCache.find(r => String(r.id) === String(rxId));
    if (!receta) return;

    const inputId = document.getElementById('doc-sched-rx-id');
    const inputTutorId = document.getElementById('doc-sched-tutor-id');
    const inputPat = document.getElementById('doc-sched-pat-name');
    const startHour = document.getElementById('doc-sched-start-hour');
    const inputDays = document.getElementById('doc-sched-days');
    const unitSelect = document.getElementById('doc-sched-interval-unit');
    const valInput = document.getElementById('doc-sched-interval-val');
    const modal = document.getElementById('modal-doc-schedule-rx');

    if (inputId) inputId.value = receta.id;
    if (inputTutorId) inputTutorId.value = receta.tutor_id || '';
    if (inputPat) inputPat.value = `${receta.paciente_nombre} — ${receta.medicamento} (${receta.dosis})`;
    if (inputDays) inputDays.value = String(receta.dias || 5);
    if (startHour && receta.hora_inicio) {
      const m = String(receta.hora_inicio).match(/(\d{1,2}):(\d{2})/);
      if (m) startHour.value = `${m[1].padStart(2, '0')}:${m[2]}`;
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

    actualizarPreviewModalHorarioDoctor();

    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  async function probarPushInmediatoDoctor({ recetaId, pacienteId, medicamento, dosis }) {
    try {
      const res = await fetch(`${API_URL}/doctor/probar-push`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recetaId, pacienteId, medicamento, dosis })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`🔔 Push inmediato enviado al tutor: ${data.titulo}`, 'success');
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
      console.error(err);
      showToast('Error de conexión al enviar Push.', 'error');
    }
  }

  function getIsoDatePlusDaysDoctor(daysOffset) {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const targetLocal = new Date(target.getTime() - target.getTimezoneOffset() * 60000);
    return targetLocal.toISOString().split('T')[0];
  }

  function actualizarPildorasFechaDoctor(fechaIso) {
    document.querySelectorAll('[data-doc-date-offset]').forEach(btn => {
      const offset = parseInt(btn.getAttribute('data-doc-date-offset'), 10);
      const fechaBtn = getIsoDatePlusDaysDoctor(offset);
      const esActivo = fechaIso === fechaBtn;
      btn.setAttribute('aria-pressed', String(esActivo));
      btn.classList.toggle('is-active', esActivo);
    });
  }

  let fechaDashboardActual = new Date().toISOString().split('T')[0];

  async function cargarDashboardUnificado(fechaParam) {
    const listEl = document.getElementById('doc-dashboard-waiting-list');
    const badgeWaiting = document.getElementById('dash-waiting-badge');
    const kpiTotal = document.getElementById('dash-kpi-total');
    const kpiUrgencias = document.getElementById('dash-kpi-urgencias');
    const kpiControles = document.getElementById('dash-kpi-controles');
    const kpiAtendidos = document.getElementById('dash-kpi-atendidos');
    const dateInput = document.getElementById('doc-dash-date-filter');

    const hoyIso = getIsoDatePlusDaysDoctor(0);
    fechaDashboardActual = fechaParam || (dateInput && dateInput.value) || hoyIso;
    if (dateInput && dateInput.value !== fechaDashboardActual) {
      dateInput.value = fechaDashboardActual;
    }
    actualizarPildorasFechaDoctor(fechaDashboardActual);

    try {
      const res = await fetch(`${API_URL}/doctor/dashboard?fecha=${encodeURIComponent(fechaDashboardActual)}`, {
        headers: getAuthHeaders()
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = 'login.html';
        return;
      }

      const data = res.ok ? await res.json() : {};

      pacientesEsperaCache = Array.isArray(data.pacientesEspera) ? data.pacientesEspera : [];
      todosPacientesCache = Array.isArray(data.todosPacientes) ? data.todosPacientes : [];

      poblarSelectoresPacientes();

      if (kpiTotal) kpiTotal.innerHTML = `${data.totalHoy || 0} <small>citas</small>`;
      if (kpiUrgencias) kpiUrgencias.innerHTML = `${data.urgenciasRojo || 0} <small>urgentes</small>`;
      if (kpiControles) kpiControles.innerHTML = `${data.controlesVerde || 0} <small>pacientes</small>`;
      if (kpiAtendidos) kpiAtendidos.innerHTML = `${data.atendidosHoy || 0} <small>completados</small>`;

      if (badgeWaiting) badgeWaiting.textContent = `${pacientesEsperaCache.length} en espera`;

      const navCount = document.getElementById('doc-nav-count-patients');
      if (navCount) navCount.textContent = String(pacientesEsperaCache.length);

      const btnFilterAll = document.getElementById('btn-filter-all');
      if (btnFilterAll) btnFilterAll.textContent = `Todos (${pacientesEsperaCache.length})`;

      renderizarListaEsperaUnificada();
    } catch (e) {
      console.error('Error cargando dashboard unificado:', e);
      if (listEl) {
        listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #E11D48;">Error de conexión con el servidor.</div>';
      }
    }
  }

  function renderizarListaEsperaUnificada() {
    const listEl = document.getElementById('doc-dashboard-waiting-list');
    if (!listEl) return;

    if (pacientesEsperaCache.length === 0) {
      listEl.innerHTML = `
        <div style="background: white; padding: 32px 20px; text-align: center; border-radius: 8px; border: 1px dashed var(--border);">
          <div style="font-size: 28px; margin-bottom: 8px;">🩺</div>
          <strong style="color: var(--text); font-size: 15px; display: block;">No hay citas para esta fecha</strong>
          <p style="color: var(--muted); margin: 4px 0 0; font-size: 13px;">No se encontraron pacientes en espera ni citas para el día seleccionado (${fechaDashboardActual}).</p>
        </div>
      `;
      return;
    }

    let filtrados = [...pacientesEsperaCache];
    if (triageFilter !== 'all') {
      filtrados = filtrados.filter(p => (p.triage || 'VERDE').toUpperCase() === triageFilter.toUpperCase());
    }

    if (filtrados.length === 0) {
      listEl.innerHTML = `
        <div style="background: white; padding: 24px; text-align: center; border-radius: 8px; border: 1px dashed var(--border);">
          <p style="color: var(--muted); margin: 0;">No hay pacientes en espera con nivel de Triage ${triageFilter.toUpperCase()}.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtrados.map(p => {
      const triageNivel = (p.triage || 'VERDE').toUpperCase();
      let badgeClass = 'triage-badge--verde';
      let label = 'Verde · Control / Vacuna';
      let cardBorder = 'agenda-card--verde';

      if (triageNivel === 'ROJO') {
        badgeClass = 'triage-badge--rojo';
        label = 'Rojo · Urgencia Médica';
        cardBorder = 'agenda-card--rojo';
      } else if (triageNivel === 'AMARILLO') {
        badgeClass = 'triage-badge--amarillo';
        label = 'Amarillo · Fiebre / Moderado';
        cardBorder = 'agenda-card--amarillo';
      }

      const edadTxt = p.fecha_nacimiento ? `(${calcularEdadTexto(p.fecha_nacimiento)})` : '';

      return `
        <div class="agenda-card agenda-card--clickable ${cardBorder}"
             data-open-ehr="${p.paciente_id}"
             style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          <div class="agenda-card__body" style="flex:1; min-width:240px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="pill pill--info num" style="font-size:11px; font-weight:700;">${p.hora ? String(p.hora).slice(0, 5) : 'S/H'}</span>
              <span class="agenda-card__patient" style="font-size:15px; font-weight:700;">${p.paciente_nombre} ${edadTxt}</span>
              <span class="pill" style="font-size:11px;">${p.estado}</span>
            </div>
            <div class="agenda-card__meta" style="margin-top:4px;">
              <strong>Motivo de consulta:</strong> ${p.motivo || 'Valoración pediátrica'}
            </div>
            <div class="agenda-card__meta num" style="font-size:12px; color:var(--muted); margin-top:2px;">
              Tutor: ${p.tutor_nombre || 'N/A'} · Tel: ${p.tutor_telefono || 'N/A'} · Peso: ${p.peso_kg || '--'} kg
            </div>
            ${p.cronicos && String(p.cronicos).trim() ? `
              <div style="margin-top:6px;">
                <span class="pill pill--warn" style="background:#FFF1F2; border:1px solid #FECDD3; color:#BE123C; font-size:12px; font-weight:700;">
                  ⚠️ Alergias / Crónicos: ${p.cronicos}
                </span>
              </div>
            ` : ''}
          </div>
          <div class="agenda-card__actions" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span class="triage-badge ${badgeClass}">
              <span class="triage-dot"></span>
              <span>${label}</span>
            </span>
            <button type="button"
                    class="btn btn--sm btn--primary"
                    data-atender-paciente="${p.paciente_id}">
              Atender paciente →
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function poblarSelectoresPacientes() {
    const selectReceta = document.getElementById('med-plan-patient');
    const switcherEhr = document.getElementById('ehr-switcher');

    const listaCombinada = [];
    const vistos = new Set();

    [...pacientesEsperaCache, ...todosPacientesCache].forEach(p => {
      if (p && p.paciente_id && !vistos.has(p.paciente_id)) {
        vistos.add(p.paciente_id);
        listaCombinada.push(p);
      }
    });

    if (selectReceta) {
      const valPrevio = pacienteActivo ? pacienteActivo.paciente_id : selectReceta.value;
      selectReceta.innerHTML = '<option value="">-- Selecciona un paciente --</option>';
      listaCombinada.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.paciente_id;
        opt.textContent = `${p.paciente_nombre} (Tutor: ${p.tutor_nombre || 'N/A'})`;
        selectReceta.appendChild(opt);
      });
      if (valPrevio && vistos.has(valPrevio)) {
        selectReceta.value = valPrevio;
      }
    }

    if (switcherEhr) {
      const valPrevioEhr = pacienteActivo ? pacienteActivo.paciente_id : switcherEhr.value;
      switcherEhr.innerHTML = '<option value="">-- Cambiar paciente --</option>';
      listaCombinada.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.paciente_id;
        opt.textContent = p.paciente_nombre;
        switcherEhr.appendChild(opt);
      });
      if (valPrevioEhr && vistos.has(valPrevioEhr)) {
        switcherEhr.value = valPrevioEhr;
      }
    }
  }

  function setupUI() {
    document.addEventListener('click', (e) => {
      const navTrigger = e.target.closest('[data-nav-view]');
      if (navTrigger) {
        const targetView = navTrigger.getAttribute('data-nav-view');
        activateSubView(targetView);
        return;
      }

      const docTabTrigger = e.target.closest('[data-doc-tab]');
      if (docTabTrigger) {
        const targetTab = docTabTrigger.getAttribute('data-doc-tab');
        cambiarTabExpediente(targetTab);
        return;
      }

      const docDatePill = e.target.closest('[data-doc-date-offset]');
      if (docDatePill) {
        const offset = parseInt(docDatePill.getAttribute('data-doc-date-offset'), 10);
        const nuevaFecha = getIsoDatePlusDaysDoctor(offset);
        const dateInput = document.getElementById('doc-dash-date-filter');
        if (dateInput) {
          dateInput.value = nuevaFecha;
          dateInput.dispatchEvent(new Event('change'));
        }
        return;
      }

      const btnRemoveTag = e.target.closest('[data-remove-tag]');
      if (btnRemoveTag) {
        const idx = parseInt(btnRemoveTag.getAttribute('data-remove-tag'), 10);
        eliminarTagAntecedente(idx);
        return;
      }

      const btnAtender = e.target.closest('[data-atender-paciente], [data-atender-id]');
      if (btnAtender) {
        const id = btnAtender.getAttribute('data-atender-paciente') || btnAtender.getAttribute('data-atender-id');
        atenderPaciente(id);
        return;
      }

      const cardTrigger = e.target.closest('[data-open-ehr]');
      if (cardTrigger && !e.target.closest('button')) {
        const id = cardTrigger.getAttribute('data-open-ehr');
        atenderPaciente(id);
        return;
      }

      const btnVax = e.target.closest('[data-aplicar-vacuna]');
      if (btnVax) {
        const vacunaId = btnVax.getAttribute('data-aplicar-vacuna');
        aplicarVacuna(vacunaId);
        return;
      }

      const btnDocProgramarRx = e.target.closest('[data-doc-programar-rx]');
      if (btnDocProgramarRx) {
        const rxId = btnDocProgramarRx.getAttribute('data-doc-programar-rx');
        abrirModalProgramarHorarioDoctor(rxId);
        return;
      }

      const btnDocTestPushRx = e.target.closest('[data-doc-test-push-rx]');
      if (btnDocTestPushRx) {
        const rxId = btnDocTestPushRx.getAttribute('data-doc-test-push-rx');
        probarPushInmediatoDoctor({ recetaId: rxId });
        return;
      }

      const btnDocFormTestPush = e.target.closest('#btn-doc-form-test-push');
      if (btnDocFormTestPush) {
        const pacienteId = document.getElementById('med-plan-patient')?.value || (pacienteActivo && pacienteActivo.paciente_id);
        const medicamento = document.getElementById('med-plan-drug')?.value.trim() || 'Medicamento Pediátrico';
        const dosis = document.getElementById('med-plan-dose')?.value.trim() || '1 dosis';
        if (!pacienteId) {
          showToast('Selecciona primero un paciente para enviarle una notificación Push de prueba a su tutor.', 'error');
          return;
        }
        probarPushInmediatoDoctor({ pacienteId, medicamento, dosis });
        return;
      }

      const btnDocModalTestPush = e.target.closest('#btn-doc-modal-test-push');
      if (btnDocModalTestPush) {
        const rxId = document.getElementById('doc-sched-rx-id')?.value;
        if (rxId) probarPushInmediatoDoctor({ recetaId: rxId });
        return;
      }

      const filterBtn = e.target.closest('[data-doc-filter]');
      if (filterBtn) {
        triageFilter = filterBtn.getAttribute('data-doc-filter') || 'all';
        document.querySelectorAll('[data-doc-filter]').forEach((b) => {
          b.setAttribute('aria-pressed', String(b === filterBtn));
        });
        renderizarListaEsperaUnificada();
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
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.classList.remove('is-open');
          modal.setAttribute('aria-hidden', 'true');
        }
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

      const logoutBtn = e.target.closest('.user-card__logout, .sidebar__links a, [href*="login.html"]');
      if (logoutBtn) {
        e.preventDefault();
        if (window.cerrarSesion) window.cerrarSesion();
        else {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          window.location.href = 'login.html';
        }
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.is-open').forEach((m) => {
          m.classList.remove('is-open');
          m.setAttribute('aria-hidden', 'true');
        });
        const resSearch = document.getElementById('doc-patient-search-results');
        if (resSearch) resSearch.classList.add('is-hidden');
      }
    });
  }

  function setupBuscadorPacientesDoctor() {
    const searchInput = document.getElementById('doc-patient-search-input');
    const resultsContainer = document.getElementById('doc-patient-search-results');
    if (!searchInput || !resultsContainer) return;

    function renderResultados(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('is-hidden');
        return;
      }

      const lista = todosPacientesCache || [];
      const matches = lista.filter(p => {
        const nom = (p.paciente_nombre || p.nombre || '').toLowerCase();
        const id = String(p.paciente_id || p.id || '').toLowerCase();
        const tut = (p.tutor_nombre || '').toLowerCase();
        return nom.includes(q) || id.includes(q) || tut.includes(q);
      });

      if (matches.length === 0) {
        resultsContainer.innerHTML = `
          <div style="padding:14px; text-align:center; color:#64748B; font-size:13px;">
            No se encontró ningún paciente con "<strong>${query}</strong>"
          </div>
        `;
        resultsContainer.classList.remove('is-hidden');
        return;
      }

      resultsContainer.innerHTML = matches.slice(0, 8).map(p => {
        const idPac = p.paciente_id || p.id;
        const nomPac = p.paciente_nombre || p.nombre;
        const tutPac = p.tutor_nombre || 'N/A';
        return `
          <div class="doc-search-item" data-search-select-id="${idPac}" style="padding:10px 14px; border-bottom:1px solid #F1F5F9; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s ease;">
            <div>
              <strong style="font-size:14px; color:#0F172A; display:block;">${nomPac}</strong>
              <span class="num" style="font-size:12px; color:#64748B;">UUID: ${idPac} · Tutor: ${tutPac}</span>
            </div>
            <span class="pill pill--info" style="font-size:11px;">Abrir Expediente →</span>
          </div>
        `;
      }).join('');
      resultsContainer.classList.remove('is-hidden');
    }

    searchInput.addEventListener('input', () => {
      renderResultados(searchInput.value);
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) {
        renderResultados(searchInput.value);
      }
    });

    resultsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('[data-search-select-id]');
      if (item) {
        const pacId = item.getAttribute('data-search-select-id');
        atenderPaciente(pacId);
        searchInput.value = '';
        resultsContainer.classList.add('is-hidden');
      }
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.classList.add('is-hidden');
      }
    });
  }

  function initDoctor() {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        const nameEl = document.querySelector('.user-card__name');
        if (nameEl) nameEl.textContent = usuario.nombre;
      }
    } catch (e) {
      console.error(e);
    }

    const dashDateFilter = document.getElementById('doc-dash-date-filter');
    if (dashDateFilter) {
      if (!dashDateFilter.value) dashDateFilter.value = getIsoDatePlusDaysDoctor(0);
      dashDateFilter.addEventListener('change', () => {
        actualizarPildorasFechaDoctor(dashDateFilter.value);
        cargarDashboardUnificado(dashDateFilter.value);
      });
      actualizarPildorasFechaDoctor(dashDateFilter.value);
    }

    setupBuscadorPacientesDoctor();

    const switcherEhr = document.getElementById('ehr-switcher');
    if (switcherEhr) {
      switcherEhr.addEventListener('change', () => {
        if (switcherEhr.value) {
          atenderPaciente(switcherEhr.value);
        }
      });
    }

    const rxDateFilter = document.getElementById('doc-rx-date-filter');
    const btnRxAll = document.getElementById('btn-doc-rx-all');
    if (rxDateFilter) {
      rxDateFilter.addEventListener('change', () => {
        cargarRecetasEnviadas(rxDateFilter.value);
      });
    }
    if (btnRxAll) {
      btnRxAll.addEventListener('click', () => {
        if (rxDateFilter) rxDateFilter.value = '';
        cargarRecetasEnviadas('');
      });
    }

    const formVitals = document.getElementById('form-doc-vitals');
    if (formVitals) {
      formVitals.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!pacienteActivo) {
          showToast('Selecciona un paciente primero.', 'error');
          return;
        }

        const peso = document.getElementById('input-doc-weight')?.value.trim();
        const talla = document.getElementById('input-doc-height')?.value.trim();
        const perimetro = document.getElementById('input-doc-head')?.value.trim();
        const temp = document.getElementById('input-doc-temp')?.value.trim();
        const antecedentes = document.getElementById('input-doc-family-history')?.value.trim();

        const esPositivo = (val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0);
        if (!esPositivo(peso) || !esPositivo(talla) || !esPositivo(perimetro) || !esPositivo(temp)) {
          showToast('Peso, talla, perímetro y temperatura deben ser números positivos.', 'error');
          return;
        }

        const btnSubmit = formVitals.querySelector('button[type="submit"]');
        const origText = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
          btnSubmit.textContent = 'Guardando en BD...';
          btnSubmit.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/doctor/paciente/${pacienteActivo.paciente_id}/signos`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              peso,
              talla,
              perimetroCefalico: perimetro,
              temperatura: temp,
              antecedentes
            })
          });

          const data = await res.json();

          if (res.ok) {
            showToast('✅ Signos vitales actualizados en la base de datos.', 'success');
            if (peso) pacienteActivo.peso_kg = peso;
            if (talla) pacienteActivo.talla_cm = talla;
            if (perimetro) pacienteActivo.perimetro_cefalico = perimetro;
            if (temp) pacienteActivo.temperatura = temp;
            if (antecedentes !== undefined) pacienteActivo.antecedentes = antecedentes;
            if (Array.isArray(data.historialMedidas)) {
              pacienteActivo.historial_medidas = data.historialMedidas;
            }

            actualizarTarjetasSignosHeader(pacienteActivo);
            actualizarCurvasOMS(pacienteActivo);
          } else {
            showToast(data.error || 'Error al guardar signos vitales.', 'error');
          }
        } catch (error) {
          console.error(error);
          showToast('Error de conexión con el servidor al guardar signos vitales.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.textContent = origText;
            btnSubmit.disabled = false;
          }
        }
      });
    }

    const inputDocTag = document.getElementById('input-doc-tag-entry');
    const btnAddDocTag = document.getElementById('btn-add-doc-tag');

    if (inputDocTag) {
      inputDocTag.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = inputDocTag.value.trim();
          if (val) {
            agregarTagAntecedente(val);
            inputDocTag.value = '';
          }
        }
      });
    }

    if (btnAddDocTag) {
      btnAddDocTag.addEventListener('click', (e) => {
        e.preventDefault();
        if (inputDocTag && inputDocTag.value.trim()) {
          agregarTagAntecedente(inputDocTag.value.trim());
          inputDocTag.value = '';
          inputDocTag.focus();
        }
      });
    }

    const formChronic = document.getElementById('form-modal-chronic');
    if (formChronic) {
      formChronic.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!pacienteActivo) return;

        const nuevoCronico = document.getElementById('input-chronic-text')?.value.trim() || '';
        try {
          const res = await fetch(`${API_URL}/doctor/paciente/${pacienteActivo.paciente_id}/signos`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ cronicos: nuevoCronico })
          });

          if (res.ok) {
            pacienteActivo.cronicos = nuevoCronico;
            const chronicDesc = document.getElementById('ehr-chronic-desc');
            if (chronicDesc) {
              chronicDesc.textContent = nuevoCronico || 'Sin alergias ni padecimientos crónicos registrados.';
            }
            const modal = document.getElementById('modal-edit-chronic');
            if (modal) {
              modal.classList.remove('is-open');
              modal.setAttribute('aria-hidden', 'true');
            }
            showToast('✅ Antecedentes crónicos actualizados en BD.', 'success');
          }
        } catch (err) {
          console.error(err);
          showToast('Error al guardar antecedentes crónicos.', 'error');
        }
      });
    }

    const medUnitSelect = document.getElementById('med-plan-interval-unit');
    const medFreqInput = document.getElementById('med-plan-freq');
    [medUnitSelect, medFreqInput].forEach(el => {
      if (!el) return;
      el.addEventListener('change', actualizarPreviewEmisionRecetaDoctor);
      el.addEventListener('input', actualizarPreviewEmisionRecetaDoctor);
    });
    actualizarPreviewEmisionRecetaDoctor();

    const schedUnitSelect = document.getElementById('doc-sched-interval-unit');
    const schedValInput = document.getElementById('doc-sched-interval-val');
    [schedUnitSelect, schedValInput].forEach(el => {
      if (!el) return;
      el.addEventListener('change', actualizarPreviewModalHorarioDoctor);
      el.addEventListener('input', actualizarPreviewModalHorarioDoctor);
    });

    const formDocScheduleRx = document.getElementById('form-doc-schedule-rx');
    if (formDocScheduleRx) {
      formDocScheduleRx.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rxId = document.getElementById('doc-sched-rx-id')?.value;
        const horaInicio = document.getElementById('doc-sched-start-hour')?.value || '08:00';
        const dias = parseInt(document.getElementById('doc-sched-days')?.value || '5', 10) || 5;
        const unit = schedUnitSelect ? schedUnitSelect.value : 'horas';
        const rawVal = Math.max(1, parseInt(schedValInput ? schedValInput.value : '8', 10) || 1);
        const intervaloMinutos = parseInt(unit === 'minutos' ? rawVal : rawVal * 60, 10);
        const frecuenciaHoras = parseInt(Math.max(1, Math.round(intervaloMinutos / 60)), 10);

        if (!rxId) return;

        const token = getAuthToken();
        if (!token) {
          showToast('⚠️ No se encontró sesión activa. Por favor inicia sesión.', 'error');
          setTimeout(() => { window.location.href = 'login.html'; }, 1500);
          return;
        }

        const submitBtn = formDocScheduleRx.querySelector('button[type="submit"]');
        const origHtml = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Guardando...';
        }

        try {
          const res = await fetch(`${API_URL}/doctor/recetas/${rxId}/programar`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              horaInicio,
              frecuenciaHoras: Number(frecuenciaHoras),
              intervaloMinutos: Number(intervaloMinutos),
              dias: Number(dias),
              token
            })
          });

          const data = await res.json();
          if (res.status === 401) {
            showToast('⚠️ Sesión expirada o no autorizada. Redirigiendo...', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            return;
          }
          if (res.ok) {
            showToast(`✅ Horario programado (${unit === 'minutos' ? `Cada ${rawVal} min` : `Cada ${rawVal} h`}). Estado: ACTIVA.`, 'success');
            const modal = document.getElementById('modal-doc-schedule-rx');
            if (modal) {
              modal.classList.remove('is-open');
              modal.setAttribute('aria-hidden', 'true');
            }
            const filtroFecha = document.getElementById('doc-rx-date-filter')?.value || '';
            await cargarRecetasEnviadas(filtroFecha);
          } else {
            showToast(data.error || 'Error al programar el horario.', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Error de conexión al programar horario.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origHtml;
          }
        }
      });
    }

    const formMed = document.getElementById('form-doc-medication');
    if (formMed) {
      formMed.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pacienteId = document.getElementById('med-plan-patient').value;
        const cie10 = document.getElementById('med-plan-cie10').value.trim();
        const medicamento = document.getElementById('med-plan-drug').value.trim();
        const dosis = document.getElementById('med-plan-dose').value.trim();
        const unit = medUnitSelect ? medUnitSelect.value : 'horas';
        const rawFreq = Math.max(1, parseInt(document.getElementById('med-plan-freq').value, 10) || 8);
        const intervaloMinutos = parseInt(unit === 'minutos' ? rawFreq : rawFreq * 60, 10);
        const frecuenciaHoras = parseInt(Math.max(1, Math.round(intervaloMinutos / 60)), 10);
        const dias = parseInt(document.getElementById('med-plan-days').value, 10) || 5;
        const horaInicio = document.getElementById('med-plan-time')?.value || '08:00';
        const notas = document.getElementById('med-plan-notes').value.trim();

        if (!pacienteId) {
          showToast('Debes seleccionar el paciente atendido.', 'error');
          return;
        }

        if (!cie10 || !medicamento || !dosis) {
          showToast('Por favor completa Diagnóstico, Medicamento y Dosis.', 'error');
          return;
        }

        const token = getAuthToken();
        if (!token) {
          showToast('⚠️ No se encontró sesión activa. Por favor inicia sesión.', 'error');
          setTimeout(() => { window.location.href = 'login.html'; }, 1500);
          return;
        }

        const submitBtn = formMed.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Enviando receta...';
        submitBtn.disabled = true;

        try {
          const res = await fetch(`${API_URL}/doctor/receta`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              pacienteId,
              cie10,
              medicamento,
              dosis,
              frecuenciaHoras: Number(frecuenciaHoras),
              intervaloMinutos: Number(intervaloMinutos),
              dias: Number(dias),
              horaInicio,
              notas,
              token
            })
          });

          const data = await res.json();

          if (res.status === 401) {
            showToast('⚠️ Sesión expirada o no autorizada. Redirigiendo...', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            return;
          }

          if (res.ok) {
            showToast('✅ Consulta finalizada: Paciente en ATENDIDA y receta emitida.', 'success');
            formMed.reset();
            if (medUnitSelect) medUnitSelect.value = 'horas';
            document.getElementById('med-plan-freq').value = '8';
            document.getElementById('med-plan-days').value = '5';
            actualizarPreviewEmisionRecetaDoctor();
            if (pacienteActivo) {
              document.getElementById('med-plan-patient').value = pacienteActivo.paciente_id;
              cargarHistorialConsultas(pacienteActivo.paciente_id);
            }
            await cargarRecetasEnviadas();
            await cargarDashboardUnificado();
          } else {
            showToast(data.error || 'Error al emitir la receta.', 'error');
          }
        } catch (error) {
          console.error(error);
          showToast('Error de conexión con el servidor al emitir la receta.', 'error');
        } finally {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }
      });
    }

    activateSubView('view-doc-dashboard');
    cargarRecetasEnviadas();
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    initDoctor();
  });
})();
