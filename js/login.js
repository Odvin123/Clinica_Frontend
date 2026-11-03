(() => {
  'use strict';

  const API_URL = window.API_URL || 'http://localhost:4000/api';
  
  document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('login-form');
    const pwdInput = document.getElementById('login-password');
    const identifierInput = document.getElementById('login-identifier');
    const toggleEyeBtn = document.getElementById('btn-toggle-login-pwd');
    const btnSubmit = document.getElementById('btn-login-submit');

    const modalFirstPwd = document.getElementById('modal-first-password');
    const formFirstPwd = document.getElementById('form-first-password');
    const newPwdInput = document.getElementById('new-password');
    const confirmPwdInput = document.getElementById('confirm-password');
    const btnSaveFirstPwd = document.getElementById('btn-save-first-pwd');

    const strengthFill = document.getElementById('pwd-strength-fill');
    const strengthLabel = document.getElementById('pwd-strength-label');
    const ruleLen = document.getElementById('rule-len');
    const ruleLetter = document.getElementById('rule-letter');
    const ruleNum = document.getElementById('rule-num');
    const ruleSpecial = document.getElementById('rule-special');

    let lockoutBanner = document.getElementById('login-lockout-banner');
    if (!lockoutBanner && formLogin) {
      lockoutBanner = document.createElement('div');
      lockoutBanner.id = 'login-lockout-banner';
      lockoutBanner.setAttribute('role', 'alert');
      lockoutBanner.style.cssText = 'display:none; padding:12px 14px; border-radius:8px; background:#FEF2F2; border:1px solid #FECACA; color:#991B1B; font-size:13px; font-weight:600; margin-bottom:14px;';
      formLogin.insertBefore(lockoutBanner, formLogin.firstChild);
    }

    let intentosFallidosLocales = 0;
    let bloqueoInterval = null;

    function mostrarMensajeErrorLogin(msg) {
      if (!lockoutBanner) return;
      lockoutBanner.style.display = 'block';
      lockoutBanner.style.backgroundColor = '#FEF2F2';
      lockoutBanner.style.borderColor = '#FECACA';
      lockoutBanner.style.color = '#991B1B';
      lockoutBanner.textContent = msg;
    }

    function activarBloqueo10Segundos(segundosIniciales = 10) {
      if (bloqueoInterval) clearInterval(bloqueoInterval);
      let restantes = segundosIniciales;

      if (identifierInput) identifierInput.disabled = true;
      if (pwdInput) pwdInput.disabled = true;
      if (btnSubmit) btnSubmit.disabled = true;

      const actualizarContador = () => {
        if (lockoutBanner) {
          lockoutBanner.style.display = 'block';
          lockoutBanner.style.backgroundColor = '#FEF2F2';
          lockoutBanner.style.borderColor = '#EF4444';
          lockoutBanner.style.color = '#991B1B';
          lockoutBanner.innerHTML = `🔒 Has fallado 3 intentos. Campos bloqueados por <strong>${restantes}s</strong> por seguridad.`;
        }
        if (btnSubmit) {
          btnSubmit.innerHTML = `<span>Bloqueado (${restantes}s)...</span>`;
        }
      };

      actualizarContador();

      bloqueoInterval = setInterval(() => {
        restantes -= 1;
        if (restantes <= 0) {
          clearInterval(bloqueoInterval);
          bloqueoInterval = null;
          intentosFallidosLocales = 0;

          if (identifierInput) identifierInput.disabled = false;
          if (pwdInput) {
            pwdInput.disabled = false;
            pwdInput.value = '';
            pwdInput.focus();
          }
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<span>Iniciar sesión</span>';
          }
          if (lockoutBanner) {
            lockoutBanner.style.display = 'none';
          }
        } else {
          actualizarContador();
        }
      }, 1000);
    }

    if (toggleEyeBtn && pwdInput) {
      toggleEyeBtn.addEventListener('click', () => {
        const esPwd = pwdInput.type === 'password';
        pwdInput.type = esPwd ? 'text' : 'password';
        toggleEyeBtn.setAttribute('aria-pressed', String(esPwd));
      });
    }

    function evaluarFuerzaContrasena(password) {
      const val = password || '';
      const confirmVal = confirmPwdInput ? confirmPwdInput.value : '';

      const tieneLen = val.length >= 8;
      const tieneLetra = /[a-zA-Z]/.test(val);
      const tieneNum = /[0-9]/.test(val);
      const tieneEspecial = /[^a-zA-Z0-9]/.test(val);

      if (ruleLen) ruleLen.classList.toggle('is-met', tieneLen);
      if (ruleLetter) ruleLetter.classList.toggle('is-met', tieneLetra);
      if (ruleNum) ruleNum.classList.toggle('is-met', tieneNum);
      if (ruleSpecial) ruleSpecial.classList.toggle('is-met', tieneEspecial);

      if (btnSaveFirstPwd) {
        const cumpleMinimo8 = tieneLen && (!confirmVal || val === confirmVal);
        btnSaveFirstPwd.disabled = !cumpleMinimo8;
        btnSaveFirstPwd.style.opacity = cumpleMinimo8 ? '1' : '0.55';
        btnSaveFirstPwd.style.cursor = cumpleMinimo8 ? 'pointer' : 'not-allowed';
      }

      const score = (tieneLen ? 1 : 0) + (tieneLetra ? 1 : 0) + (tieneNum ? 1 : 0) + (tieneEspecial ? 1 : 0);

      if (!strengthFill || !strengthLabel) return;

      if (val.length === 0) {
        strengthFill.style.width = '0%';
        strengthFill.className = 'strength-meter__fill';
        strengthLabel.textContent = 'Mínimo 8 caracteres';
        strengthLabel.style.color = '#BE123C';
        return;
      }

      if (!tieneLen) {
        strengthFill.style.width = '25%';
        strengthFill.className = 'strength-meter__fill strength-meter__fill--rojo';
        strengthLabel.textContent = `Faltan ${8 - val.length} caracteres`;
        strengthLabel.style.color = '#BE123C';
      } else if (score === 2) {
        strengthFill.style.width = '50%';
        strengthFill.className = 'strength-meter__fill strength-meter__fill--amarillo';
        strengthLabel.textContent = 'Media (8+ caracteres)';
        strengthLabel.style.color = '#D97706';
      } else if (score === 3) {
        strengthFill.style.width = '75%';
        strengthFill.className = 'strength-meter__fill strength-meter__fill--amarillo';
        strengthLabel.textContent = 'Buena';
        strengthLabel.style.color = '#D97706';
      } else if (score === 4) {
        strengthFill.style.width = '100%';
        strengthFill.className = 'strength-meter__fill strength-meter__fill--verde';
        strengthLabel.textContent = 'Segura';
        strengthLabel.style.color = '#0F766E';
      }
    }

    if (newPwdInput) {
      newPwdInput.addEventListener('input', () => {
        evaluarFuerzaContrasena(newPwdInput.value);
      });
    }
    if (confirmPwdInput) {
      confirmPwdInput.addEventListener('input', () => {
        evaluarFuerzaContrasena(newPwdInput ? newPwdInput.value : '');
      });
    }

    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (bloqueoInterval) return;

        const email = identifierInput.value.trim();
        const password = pwdInput.value.trim();

        if (!email || !password) {
          mostrarMensajeErrorLogin('Por favor ingresa tu correo/teléfono y tu contraseña o PIN.');
          return;
        }

        const esPinCuatroDigitos = /^\d{4}$/.test(password) || /^PIN-\d{4}$/i.test(password);

        if (esPinCuatroDigitos) {
          const pinPuro = password.replace(/\D/g, '') || password;

          if (btnSubmit) {
            btnSubmit.innerHTML = '<span>Verificando PIN...</span>';
            btnSubmit.disabled = true;
          }

          try {
            const resPin = await fetch(`${API_URL}/auth/verificar-pin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, pin: pinPuro })
            });

            const dataPin = await resPin.json();

            if (!resPin.ok) {
              intentosFallidosLocales += 1;
              if (resPin.status === 429 || dataPin.bloqueado || intentosFallidosLocales >= 3) {
                activarBloqueo10Segundos(dataPin.segundosRestantes || 10);
                return;
              }
              const rest = 3 - intentosFallidosLocales;
              mostrarMensajeErrorLogin(dataPin.error || `PIN incorrecto. Intentos restantes: ${rest}`);
              if (btnSubmit) {
                btnSubmit.innerHTML = '<span>Iniciar sesión</span>';
                btnSubmit.disabled = false;
              }
              return;
            }

            intentosFallidosLocales = 0;
            if (lockoutBanner) lockoutBanner.style.display = 'none';

            sessionStorage.setItem('temp_email', email);
            sessionStorage.setItem('temp_pin', pinPuro);

            if (modalFirstPwd) {
              modalFirstPwd.classList.add('is-open');
              modalFirstPwd.setAttribute('aria-hidden', 'false');
              if (newPwdInput) {
                newPwdInput.value = '';
                if (confirmPwdInput) confirmPwdInput.value = '';
                evaluarFuerzaContrasena('');
                newPwdInput.focus();
              }
            }
          } catch (errPin) {
            console.error('Error al verificar PIN:', errPin);
            mostrarMensajeErrorLogin('Error de conexión con el servidor al verificar el PIN.');
          } finally {
            if (!bloqueoInterval && btnSubmit) {
              btnSubmit.innerHTML = '<span>Iniciar sesión</span>';
              btnSubmit.disabled = false;
            }
          }
          return;
        }

        if (btnSubmit) {
          btnSubmit.innerHTML = '<span>Verificando credenciales...</span>';
          btnSubmit.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          const data = await res.json();

          if (!res.ok) {
            if (data.requiereCambioPin) {
              sessionStorage.setItem('temp_email', email);
              sessionStorage.setItem('temp_pin', data.pinTemporal || password);
              if (modalFirstPwd) {
                modalFirstPwd.classList.add('is-open');
                modalFirstPwd.setAttribute('aria-hidden', 'false');
                if (newPwdInput) {
                  newPwdInput.value = '';
                  if (confirmPwdInput) confirmPwdInput.value = '';
                  evaluarFuerzaContrasena('');
                  newPwdInput.focus();
                }
              }
              return;
            }

            intentosFallidosLocales += 1;
            if (res.status === 429 || data.bloqueado || intentosFallidosLocales >= 3) {
              activarBloqueo10Segundos(data.segundosRestantes || 10);
              return;
            }
            const rest = 3 - intentosFallidosLocales;
            mostrarMensajeErrorLogin(data.error || `Credenciales incorrectas. Intentos restantes: ${rest}`);
            return;
          }

          intentosFallidosLocales = 0;
          localStorage.setItem('token', data.token);
          localStorage.setItem('usuario', JSON.stringify(data.usuario));

          const rutas = {
            ADMIN: 'admin.html',
            DOCTOR: 'doctor.html',
            RECEPCION: 'recepcion.html',
            TUTOR: 'tutor.html'
          };

          const destino = rutas[data.usuario.rol] || 'index.html';
          window.location.href = destino;
        } catch (error) {
          console.error('Error de red:', error);
          mostrarMensajeErrorLogin('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
        } finally {
          if (!bloqueoInterval && btnSubmit) {
            btnSubmit.innerHTML = '<span>Iniciar sesión</span>';
            btnSubmit.disabled = false;
          }
        }
      });
    }

    if (formFirstPwd) {
      formFirstPwd.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = sessionStorage.getItem('temp_email') || (identifierInput ? identifierInput.value.trim() : '');
        const pinTemporal = sessionStorage.getItem('temp_pin') || (pwdInput ? pwdInput.value.trim() : '');
        const nuevaPassword = newPwdInput ? newPwdInput.value : '';
        const confirmPassword = confirmPwdInput ? confirmPwdInput.value : '';

        if (!nuevaPassword || nuevaPassword.length < 8) {
          alert('⚠️ Error de seguridad: La contraseña debe tener obligatoriamente un mínimo de 8 caracteres.');
          if (newPwdInput) newPwdInput.focus();
          return;
        }

        if (nuevaPassword !== confirmPassword) {
          alert('⚠️ Las contraseñas ingresadas no coinciden.');
          if (confirmPwdInput) confirmPwdInput.focus();
          return;
        }

        const origBtnText = btnSaveFirstPwd ? btnSaveFirstPwd.textContent : 'Actualizar Contraseña y Continuar al Módulo';
        if (btnSaveFirstPwd) {
          btnSaveFirstPwd.textContent = 'Actualizando y activando...';
          btnSaveFirstPwd.disabled = true;
        }

        try {
          const res = await fetch(`${API_URL}/auth/cambiar-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              pinTemporal,
              nuevaPassword
            })
          });

          const data = await res.json();

          if (res.ok) {
            alert('✅ ' + (data.mensaje || 'Contraseña configurada exitosamente. Tu cuenta ahora está Activa.'));

            sessionStorage.removeItem('temp_email');
            sessionStorage.removeItem('temp_pin');

            if (modalFirstPwd) {
              modalFirstPwd.classList.remove('is-open');
              modalFirstPwd.setAttribute('aria-hidden', 'true');
            }
            formFirstPwd.reset();

            if (identifierInput) identifierInput.value = email;
            if (pwdInput) {
              pwdInput.value = '';
              pwdInput.focus();
            }
          } else {
            alert(data.error || 'Error al actualizar la contraseña.');
          }
        } catch (error) {
          console.error(error);
          alert('Error de conexión con el servidor.');
        } finally {
          if (btnSaveFirstPwd) {
            btnSaveFirstPwd.textContent = origBtnText;
            evaluarFuerzaContrasena(newPwdInput ? newPwdInput.value : '');
          }
        }
      });
    }
  });
})();
