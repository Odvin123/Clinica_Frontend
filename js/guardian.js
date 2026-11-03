(() => {
  'use strict';

  const token = localStorage.getItem('token');
  const usuarioRaw = localStorage.getItem('usuario');

  if (!token || !usuarioRaw) {
    limpiarYRedirigir();
    return;
  }

  let usuario;
  try {
    usuario = JSON.parse(usuarioRaw);
  } catch (e) {
    limpiarYRedirigir();
    return;
  }

  const path = window.location.pathname.toLowerCase();

  const reglasAcceso = [
    { archivo: 'admin.html', roles: ['ADMIN'] },
    { archivo: 'doctor.html', roles: ['DOCTOR', 'ADMIN'] },
    { archivo: 'recepcion.html', roles: ['RECEPCION', 'ADMIN'] },
    { archivo: 'tutor.html', roles: ['TUTOR', 'ADMIN'] }
  ];

  for (const regla of reglasAcceso) {
    if (path.endsWith(regla.archivo) || path.includes('/' + regla.archivo)) {
      if (!regla.roles.includes(usuario.rol)) {
        console.warn(`[Guardián] Acceso denegado: el rol ${usuario.rol} no puede ver ${regla.archivo}`);
        limpiarYRedirigir();
        return;
      }
      break;
    }
  }

  function limpiarYRedirigir() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
  }

  window.cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
  };
})();
