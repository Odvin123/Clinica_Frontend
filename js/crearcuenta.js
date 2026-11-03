(function () {
  'use strict';

  const form = document.getElementById('register-form');
  const fullnameInput = document.getElementById('fullname');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirm-password');
  const termsInput = document.getElementById('accept-terms');
  const statusEl = document.getElementById('register-status');
  const googleBtn = document.getElementById('google-register-btn');

  document.querySelectorAll('[data-toggle-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isShowing = input.type === 'text';
      input.type = isShowing ? 'password' : 'text';
      btn.classList.toggle('is-showing', !isShowing);
      btn.setAttribute('aria-pressed', String(!isShowing));
      btn.setAttribute(
        'aria-label',
        !isShowing ? 'Ocultar contraseña' : 'Mostrar contraseña'
      );
    });
  });

  [fullnameInput, emailInput, phoneInput, passwordInput, confirmInput, termsInput].forEach(
    (input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        input.classList.remove('is-invalid');
        const errEl = document.getElementById(`error-${input.id}`);
        if (errEl) errEl.textContent = '';
        if (statusEl) statusEl.textContent = '';
      });
      input.addEventListener('change', () => {
        const errEl = document.getElementById(`error-${input.id}`);
        if (errEl) errEl.textContent = '';
      });
    }
  );

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let isValid = true;

      const nameVal = fullnameInput ? fullnameInput.value.trim() : '';
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const phoneVal = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
      const passVal = passwordInput ? passwordInput.value : '';
      const confirmVal = confirmInput ? confirmInput.value : '';

      if (nameVal.length < 3) {
        isValid = false;
        fullnameInput.classList.add('is-invalid');
        document.getElementById('error-fullname').textContent =
          'Ingresa tu nombre y apellido.';
      }

      if (emailVal.length < 5 || !emailVal.includes('@')) {
        isValid = false;
        emailInput.classList.add('is-invalid');
        document.getElementById('error-email').textContent =
          'Ingresa un correo electrónico válido.';
      }

      if (phoneVal.length < 8) {
        isValid = false;
        phoneInput.classList.add('is-invalid');
        document.getElementById('error-phone').textContent =
          'Ingresa un teléfono válido (mínimo 8 dígitos).';
      }

      if (passVal.length < 6) {
        isValid = false;
        passwordInput.classList.add('is-invalid');
        document.getElementById('error-password').textContent =
          'Mínimo 6 caracteres.';
      }

      if (!confirmVal || confirmVal !== passVal) {
        isValid = false;
        confirmInput.classList.add('is-invalid');
        document.getElementById('error-confirm-password').textContent =
          'Las contraseñas no coinciden.';
      }

      if (termsInput && !termsInput.checked) {
        isValid = false;
        document.getElementById('error-accept-terms').textContent =
          'Debes aceptar el uso confidencial de datos para crear tu cuenta.';
      }

      if (!isValid) return;

      if (statusEl) {
        statusEl.textContent = 'Creando tu cuenta en el servidor de la clínica...';
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      if (statusEl) {
        statusEl.textContent = 'Redirigiendo al registro con cuenta de Google...';
      }
    });
  }
})();
