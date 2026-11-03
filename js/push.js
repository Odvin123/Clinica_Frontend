function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function inicializarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications no soportadas en este navegador.');
    return;
  }

  try {
    const register = await navigator.serviceWorker.register('/sw.js');
    
    const res = await fetch('http://localhost:4000/api/tutor/vapid-public-key', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const { publicKey } = await res.json();

    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await fetch('http://localhost:4000/api/tutor/suscribir-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(subscription)
    });

    console.log('✅ Suscripción Push exitosa');
  } catch (error) {
    console.error('❌ Error al suscribir Push:', error);
  }
}

// Ejecutar cuando el tutor inicie sesión (en tutor.html)
if (window.location.pathname.includes('tutor.html')) {
  document.addEventListener('DOMContentLoaded', inicializarPush);
}