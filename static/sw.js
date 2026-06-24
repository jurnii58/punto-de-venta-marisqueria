const DB_NAME = 'TioPerroPOS';
const DB_VERSION = 1;
const STORE_NAME = 'offline-orders';

// Obtener la URL del API de manera dinámica desde los parámetros de registro
function getApiUrl() {
  try {
    const urlParams = new URL(self.location.href).searchParams;
    const apiUrl = urlParams.get('apiUrl');
    if (apiUrl) return apiUrl;
  } catch (e) {
    console.error('[PWA SW] Error al parsear URL del service worker:', e);
  }
  
  // Fallback inteligente según el dominio actual (local vs producción en la nube)
  const isLocal = self.location.hostname === 'localhost' || 
                  self.location.hostname === '127.0.0.1' || 
                  /^[0-9.]+$/.test(self.location.hostname);
  if (isLocal) {
    return `http://${self.location.hostname}:5000/api`;
  }
  return `${self.location.origin}/api`;
}

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

      const apiEndpoint = getApiUrl();
      const response = await fetch(`${apiEndpoint}/orders`, {
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

// Sincronización en segundo plano oficial
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Escuchar mensajes (para disparar sincronización forzada desde frontend)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FORCE_SYNC') {
    event.waitUntil(syncOrders());
  }
});
