// Función para registrar el Service Worker en la aplicación React
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const getApiUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        return `http://${window.location.hostname}:5000/api`;
      };
      const apiUrl = getApiUrl();
      navigator.serviceWorker.register(`/sw.js?apiUrl=${encodeURIComponent(apiUrl)}`)
        .then((registration) => {
          console.log('PWA Service Worker registrado con éxito en el ámbito:', registration.scope);

          // Escuchar cambios de red locales en el navegador (fallback inmediato)
          window.addEventListener('online', () => {
            console.log('El navegador detectó conexión recuperada. Solicitando sincronización...');
            if ('sync' in registration) {
              // Disparar sincronización de fondo oficial
              registration.sync.register('sync-orders').catch(err => {
                console.error('Error al registrar sync-orders:', err);
              });
            }
          });
        })
        .catch((error) => {
          console.error('Fallo en el registro del PWA Service Worker:', error);
        });
    });
  }
}
