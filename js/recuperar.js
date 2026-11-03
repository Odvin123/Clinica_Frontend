(function () {
  'use strict';

  const emailInput = document.getElementById('recovery-email');
  const errorEl = document.getElementById('error-recovery-email');
  const form = document.getElementById('recovery-form');
  const card = document.getElementById('recovery-card');
  const stepRequest = document.getElementById('recovery-step-request');
  const stepSent = document.getElementById('recovery-step-sent');
  const sentEmailTarget = document.getElementById('sent-email-target');
  const resendBtn = document.getElementById('resend-btn');
  const resendStatus = document.getElementById('resend-status');

  const params = new URLSearchParams(window.location.search);
  const prefilledEmail = params.get('email');
  if (prefilledEmail && emailInput) {
    emailInput.value = prefilledEmail;
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      emailInput.classList.remove('is-invalid');
      if (errorEl) errorEl.textContent = '';
    });
  }

  if (form && emailInput) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const val = emailInput.value.trim();

      if (val.length < 5 || !val.includes('@')) {
        emailInput.classList.add('is-invalid');
        if (errorEl) {
          errorEl.textContent = 'Ingresa una dirección de correo electrónico válida.';
        }
        emailInput.focus();
        return;
      }

      if (sentEmailTarget) {
        sentEmailTarget.textContent = val;
      }

      if (card) card.classList.add('is-transitioning');
      window.setTimeout(() => {
        if (stepRequest) stepRequest.hidden = true;
        if (stepSent) stepSent.hidden = false;
        if (card) card.classList.remove('is-transitioning');
      }, 160);
    });
  }

  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      if (resendStatus) {
        resendStatus.textContent = 'Se ha enviado un nuevo enlace de restablecimiento.';
      }
    });
  }
})();
