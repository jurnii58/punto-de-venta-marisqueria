const DB_NAME = 'TioPerroPOS';
const DB_VERSION = 1;
const STORE_NAME = 'offline-orders';

// Helper para abrir o inicializar IndexedDB en el Service Worker
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Guardar una comanda localmente
async function saveOrderOffline(orderData, authHeader) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({
      data: orderData,
      authHeader, // Almacenar token de autorización original
      timestamp: Date.now()
    });
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

// Obtener todas las comandas guardadas offline
async function getOfflineOrders() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Eliminar comanda sincronizada
async function deleteOfflineOrder(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

// Sincronizar las comandas pendientes con el Backend
async function syncOrders() {
  const offlineOrders = await getOfflineOrders();
  if (offlineOrders.length === 0) return;

  console.log(`[PWA SW] Detectada conexión. Sincronizando ${offlineOrders.length} comanda(s) guardada(s) en IndexedDB.`);

  for (const order of offlineOrders) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (order.authHeader) {
        headers['Authorization'] = order.authHeader;
      }

      const response = await fetch(`http://${self.location.hostname}:5000/api/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(order.data)
      });

      if (response.ok) {
        await deleteOfflineOrder(order.id);
        console.log(`[PWA SW] Comanda temporal ${order.id} sincronizada con éxito en el servidor.`);
      } else {
        console.warn(`[PWA SW] Falló comanda ${order.id} (Código ${response.status}). Se reintentará luego.`);
      }
    } catch (err) {
      console.error(`[PWA SW] Reintento de sincronización fallido para comanda ${order.id}:`, err.message);
      break; // Parar el bucle si volvemos a estar offline
    }
  }
}

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('[PWA SW] Service Worker instalado.');
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('[PWA SW] Service Worker activado.');
});

// Interceptar peticiones Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Capturar solicitudes POST de creación de comandas
  if (url.pathname === '/api/orders' && event.request.method === 'POST') {
    const authHeader = event.request.headers.get('Authorization');
    
    event.respondWith(
      (async () => {
        try {
          // Intentar la petición normal en la red
          const response = await fetch(event.request);
          return response;
        } catch (error) {
          // Capturar falla de red y procesar offline
          console.warn('[PWA SW] Servidor inaccesible. Guardando comanda en IndexedDB...', error);

          try {
            const reqClone = event.request.clone();
            const orderData = await reqClone.json();

            // Guardar comanda e inyectar cabecera de autenticación
            await saveOrderOffline(orderData, authHeader);

            // Registrar sincronización automática en segundo plano (si es compatible)
            if ('sync' in self.registration) {
              await self.registration.sync.register('sync-orders');
            }

            // Responder con éxito falso aceptado (202)
            return new Response(
              JSON.stringify({
                offline: true,
                message: 'Comanda guardada en la memoria local por falta de internet. Se enviará de forma automática al servidor al reconectarse.'
              }),
              {
                status: 202,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          } catch (dbError) {
            return new Response(
              JSON.stringify({ error: true, message: 'Error al escribir el pedido en el almacenamiento local.' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      })()
    );
  }
});

// Escuchar el evento Background Sync de Google Chrome/Edge/Firefox
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});
