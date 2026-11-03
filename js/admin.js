(() => {
  'use strict';

const API_URL = 'https://clinica-backend-dx7x.onrender.com/api';
  let todosUsuariosCache = [];

  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
  }

  function showToast(message) {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    region.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 240);
    }, 3600);
  }

  function mostrarModalPin(nombreUsuario, pin) {
    const nameEl = document.getElementById('pin-modal-user-name');
    const codeEl = document.getElementById('pin-modal-code');
    const modal = document.getElementById('modal-pin-generado');
    if (nameEl) nameEl.textContent = nombreUsuario;
    if (codeEl) codeEl.textContent = pin;
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function pintarDatosAdmin() {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      if (!usuarioStr) return;

      const usuario = JSON.parse(usuarioStr);
      const nameEl = document.getElementById('adm-sidebar-name');
      if (nameEl) nameEl.textContent = usuario.nombre;

      const iniciales = (usuario.nombre || 'AD')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const avatarEl = document.getElementById('adm-sidebar-avatar');
      if (avatarEl) avatarEl.textContent = iniciales;
    } catch (e) {
      console.error(e);
    }
  }

  function setupUI() {
    const sidebar = document.getElementById('app-sidebar');
    const openMenuBtn = document.getElementById('mobile-menu-open');
    const closeMenuBtn = document.getElementById('mobile-menu-close');

    if (openMenuBtn && sidebar) {
      openMenuBtn.addEventListener('click', () => sidebar.classList.add('is-open'));
    }
    if (closeMenuBtn && sidebar) {
      closeMenuBtn.addEventListener('click', () => sidebar.classList.remove('is-open'));
    }

    document.addEventListener('click', (e) => {

      const openBtn = e.target.closest('[data-open-modal]');
      if (openBtn) {
        const modal = document.getElementById(openBtn.getAttribute('data-open-modal'));
        if (modal) {
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
        }
        return;
      }

      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) {
        const modal = document.getElementById(closeBtn.getAttribute('data-close-modal'));
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

      const navBtn = e.target.closest('[data-nav-view]');
      if (navBtn) {
        const targetView = navBtn.getAttribute('data-nav-view');
        document.querySelectorAll('.nav-item').forEach(btn => btn.removeAttribute('aria-current'));
        navBtn.setAttribute('aria-current', 'page');
        document.querySelectorAll('.subview').forEach(sec => {
          sec.classList.toggle('is-hidden', sec.id !== targetView);
        });
        if (sidebar) sidebar.classList.remove('is-open');
        return;
      }

      const logoutLink = e.target.closest('.sidebar__links a, [href*="login.html"]');
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

    document.addEventListener('click', async (e) => {
      const resetPinBtn = e.target.closest('[data-reset-pin-id]');
      if (!resetPinBtn) return;

      const userId = resetPinBtn.getAttribute('data-reset-pin-id');
      const userName = resetPinBtn.getAttribute('data-user-name') || 'Usuario';
      const origText = resetPinBtn.textContent;
      resetPinBtn.disabled = true;
      resetPinBtn.textContent = 'Generando...';

      try {
        const res = await fetch(`${API_URL}/admin/generar-pin/${userId}`, {
          method: 'PUT',
          headers: getHeaders()
        });
        const data = await res.json();

        if (res.ok) {
          mostrarModalPin(userName, data.pinTemporal);
          showToast(`Nuevo PIN ${data.pinTemporal} generado para ${userName}`);
          await Promise.all([cargarTodosUsuarios(), cargarMetricas()]);
        } else {
          showToast(data.error || 'No se pudo generar el PIN.');
          resetPinBtn.disabled = false;
          resetPinBtn.textContent = origText;
        }
      } catch (error) {
        console.error(error);
        showToast('Error de conexión al generar el PIN.');
        resetPinBtn.disabled = false;
        resetPinBtn.textContent = origText;
      }
    });

    document.addEventListener('click', async (e) => {
      const toggleBtn = e.target.closest('[data-toggle-staff-id]');
      if (!toggleBtn) return;

      const staffId = toggleBtn.getAttribute('data-toggle-staff-id');
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'Actualizando...';

      try {
        const res = await fetch(`${API_URL}/admin/suspender-personal/${staffId}`, {
          method: 'PUT',
          headers: getHeaders()
        });

        const data = await res.json();

        if (res.ok) {
          showToast(data.mensaje || 'Estado de cuenta actualizado.');
          await Promise.all([cargarTodosUsuarios(), cargarMetricas()]);
        } else {
          showToast(data.error || 'No se pudo modificar el estado del usuario.');
          toggleBtn.disabled = false;
        }
      } catch (error) {
        console.error(error);
        showToast('Error de conexión al intentar cambiar el estado del usuario.');
        toggleBtn.disabled = false;
      }
    });

    const searchInput = document.getElementById('adm-user-search');
    const roleFilter = document.getElementById('adm-user-role-filter');
    if (searchInput) searchInput.addEventListener('input', renderTablaUsuarios);
    if (roleFilter) roleFilter.addEventListener('change', renderTablaUsuarios);

    const refreshAuditBtn = document.getElementById('btn-refresh-audit');
    if (refreshAuditBtn) {
      refreshAuditBtn.addEventListener('click', async () => {
        await cargarMetricas();
        showToast('Bitácora y KPIs actualizados desde PostgreSQL.');
      });
    }
  }

  async function cargarMetricas() {
    try {
      const res = await fetch(`${API_URL}/admin/metricas`, { headers: getHeaders() });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = 'login.html';
        }
        return;
      }
      const data = await res.json();

      const kpiAtenciones = document.getElementById('adm-kpi-atenciones');
      if (kpiAtenciones) kpiAtenciones.innerHTML = `${Number(data.atencionesMes || 0)} <small>consultas</small>`;

      const kpiVacunas = document.getElementById('adm-kpi-vacunas');
      if (kpiVacunas) kpiVacunas.innerHTML = `${Number(data.recetasEmitidas || 0)} <small>emitidas</small>`;

      const kpiEspera = document.getElementById('adm-kpi-espera');
      if (kpiEspera) kpiEspera.innerHTML = `${Number(data.citasEnEspera || 0)} <small>en fila</small>`;

      const kpiStaff = document.getElementById('adm-kpi-staff');
      if (kpiStaff) kpiStaff.innerHTML = `${Number(data.staffActivos || 0)} <small>funcionarios</small>`;

      const tbodyAudit = document.getElementById('adm-audit-tbody');
      if (tbodyAudit) {
        if (data.bitacora && data.bitacora.length > 0) {
          tbodyAudit.innerHTML = data.bitacora.slice(0, 10).map(log => {
            let roleBadge = 'pill--info';
            if (log.rol === 'DOCTOR') roleBadge = 'pill--pos';
            else if (log.rol === 'ADMIN') roleBadge = 'pill--warn';
            return `
              <tr>
                <td class="num">${new Date(log.creado_en).toLocaleString('es-NI')}</td>
                <td><strong>${log.usuario}</strong></td>
                <td><span class="pill ${roleBadge}">${log.rol}</span></td>
                <td>${log.accion}</td>
              </tr>
            `;
          }).join('');
        } else {
          tbodyAudit.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay registros de auditoría aún.</td></tr>';
        }
      }
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }

  function renderTablaUsuarios() {
    const tbody = document.getElementById('adm-all-users-tbody');
    if (!tbody) return;

    const query = (document.getElementById('adm-user-search')?.value || '').trim().toLowerCase();
    const roleFilter = document.getElementById('adm-user-role-filter')?.value || 'ALL';

    const filtrados = todosUsuariosCache.filter(u => {
      if (roleFilter !== 'ALL' && u.rol !== roleFilter) return false;
      if (!query) return true;
      const texto = `${u.nombre || ''} ${u.email || ''} ${u.dni || ''} ${u.telefono || ''}`.toLowerCase();
      return texto.includes(query);
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--muted);">No se encontraron usuarios con ese criterio.</td></tr>';
      return;
    }

    tbody.innerHTML = filtrados.map(u => {
      let badgeRol = 'pill--info';
      if (u.rol === 'DOCTOR') badgeRol = 'pill--pos';
      else if (u.rol === 'RECEPCION') badgeRol = 'pill--info';
      else if (u.rol === 'TUTOR') badgeRol = 'pill--warn';

      const tienePinPendiente = Boolean(u.pin_activacion);
      const estaActivoReal = Boolean(u.activo) && !tienePinPendiente;

      let estadoBadge = '';
      if (estaActivoReal) {
        estadoBadge = `<span class="pill pill--pos">Activo</span>`;
      } else if (tienePinPendiente) {
        estadoBadge = `<span class="pill pill--warn">Pendiente</span>`;
      } else {
        estadoBadge = `<span class="pill" style="background:var(--coral-soft); color:var(--coral-ink);">Suspendido</span>`;
      }

      let pinDisplay = '';
      if (tienePinPendiente) {
        pinDisplay = `<span class="num" style="color:#BE123C; font-weight:800; background:#FFE4E6; padding:3px 8px; border-radius:6px; font-size:13px;">${u.pin_activacion}</span>`;
      } else {
        pinDisplay = `<span style="color:var(--health-green); font-size:12px; font-weight:600;">✓ Contraseña activa</span>`;
      }

      const btnResetPin = `
        <button type="button"
                class="btn btn--sm btn--amber"
                data-reset-pin-id="${u.id}"
                data-user-name="${u.nombre}"
                title="Genera un nuevo PIN de 4 dígitos y pasa la cuenta a estado Pendiente">
          🔑 Generar PIN
        </button>
      `;

      const btnSuspender = `
        <button type="button"
                class="btn btn--sm ${u.activo ? 'btn--danger' : 'btn--green'}"
                data-toggle-staff-id="${u.id}"
                data-staff-name="${u.nombre}">
          ${u.activo ? 'Suspender' : 'Activar'}
        </button>
      `;

      return `
        <tr>
          <td>
            <strong>${u.nombre}</strong><br>
            <small style="color:var(--muted);">${u.email}</small>
          </td>
          <td><span class="pill ${badgeRol}">${u.rol}</span></td>
          <td class="num">${u.telefono || '-'}</td>
          <td class="num">${u.dni || '-'}</td>
          <td>${pinDisplay}</td>
          <td>${estadoBadge}</td>
          <td class="n">
            <div style="display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
              ${btnResetPin}
              ${btnSuspender}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function cargarTodosUsuarios() {
    try {
      const res = await fetch(`${API_URL}/admin/usuarios`, { headers: getHeaders() });
      if (!res.ok) return;

      todosUsuariosCache = await res.json();

      const navCountAll = document.getElementById('adm-nav-count-all-users');
      if (navCountAll) navCountAll.textContent = todosUsuariosCache.length;

      renderTablaUsuarios();
    } catch (error) {
      console.error('Error cargando todos los usuarios:', error);
    }
  }

  async function cargarConfiguracionClinica() {
    try {
      const res = await fetch(`${API_URL}/admin/configuracion`, { headers: getHeaders() });
      if (!res.ok) return;
      const cfg = await res.json();

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.value = val;
      };

      setVal('cfg-nombre', cfg.nombre_clinica);
      setVal('cfg-director', cfg.director_medico);
      setVal('cfg-minsa', cfg.codigo_minsa);
      setVal('cfg-telefono', cfg.telefono_recepcion);
      setVal('cfg-correo', cfg.correo_contacto);
      setVal('cfg-direccion', cfg.direccion);
      setVal('cfg-horario-semana', cfg.horario_semana);
      setVal('cfg-horario-sabado', cfg.horario_sabado);
      setVal('cfg-duracion-bloque', cfg.duracion_bloque_min);

      const chkWa = document.getElementById('cfg-whatsapp-activo');
      if (chkWa) chkWa.checked = cfg.whatsapp_alertas_activo !== false;
    } catch (error) {
      console.error('Error cargando configuración clínica:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    pintarDatosAdmin();
    setupUI();
    cargarMetricas();
    cargarTodosUsuarios();
    cargarConfiguracionClinica();

    const formConfig = document.getElementById('form-adm-config');
    if (formConfig) {
      formConfig.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSave = document.getElementById('btn-save-config');
        const origText = btnSave ? btnSave.textContent : '';
        if (btnSave) {
          btnSave.disabled = true;
          btnSave.textContent = 'Guardando en PostgreSQL...';
        }

        const payload = {
          nombreClinica: document.getElementById('cfg-nombre')?.value.trim(),
          directorMedico: document.getElementById('cfg-director')?.value.trim(),
          codigoMinsa: document.getElementById('cfg-minsa')?.value.trim(),
          telefonoRecepcion: document.getElementById('cfg-telefono')?.value.trim(),
          correoContacto: document.getElementById('cfg-correo')?.value.trim(),
          direccion: document.getElementById('cfg-direccion')?.value.trim(),
          horarioSemana: document.getElementById('cfg-horario-semana')?.value.trim(),
          horarioSabado: document.getElementById('cfg-horario-sabado')?.value.trim(),
          duracionBloqueMin: Number(document.getElementById('cfg-duracion-bloque')?.value) || 30,
          whatsappAlertasActivo: Boolean(document.getElementById('cfg-whatsapp-activo')?.checked)
        };

        try {
          const res = await fetch(`${API_URL}/admin/configuracion`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (res.ok) {
            showToast('Configuración de la clínica actualizada en PostgreSQL.');
            await cargarMetricas();
          } else {
            showToast(data.error || 'Error al guardar la configuración.');
          }
        } catch (error) {
          console.error(error);
          showToast('Error de conexión al guardar la configuración.');
        } finally {
          if (btnSave) {
            btnSave.disabled = false;
            btnSave.textContent = origText;
          }
        }
      });
    }

    const formUser = document.getElementById('form-modal-user');
    if (formUser) {
      formUser.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
          nombre: document.getElementById('new-user-name').value.trim(),
          email: document.getElementById('new-user-email').value.trim(),
          rol: document.getElementById('new-user-role').value,
          dni: document.getElementById('new-user-minsa').value.trim()
        };

        if (!payload.nombre || !payload.email || !payload.rol) {
          showToast('Por favor completa todos los campos requeridos.');
          return;
        }

        const btnSubmit = formUser.querySelector('button[type="submit"]');
        const origText = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
          btnSubmit.textContent = 'Guardando personal...';
          btnSubmit.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/admin/crear-personal`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });

          const data = await res.json();

          if (res.ok) {
            formUser.reset();
            const modal = document.getElementById('modal-new-user');
            if (modal) {
              modal.classList.remove('is-open');
              modal.setAttribute('aria-hidden', 'true');
            }

            mostrarModalPin(`${payload.nombre} (${payload.rol})`, data.pinTemporal);
            showToast(`Personal registrado. PIN Temporal: ${data.pinTemporal}`);

            await Promise.all([cargarTodosUsuarios(), cargarMetricas()]);
          } else {
            showToast(data.error || 'Error al registrar al funcionario.');
          }
        } catch (error) {
          console.error(error);
          showToast('Error de conexión con el servidor.');
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