import React, { useState, useEffect, useRef } from 'react';
import { Fish, RefreshCw, Clock, Flame, Snowflake, GlassWater, CheckCircle, Play, Droplet, Wave } from 'lucide-react';
import { io as ioClient } from 'socket.io-client';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return `http://${window.location.hostname}:5000/api`;
};
const API_URL = getApiUrl();
const SOCKET_URL = API_URL.replace('/api', '');

// Función sintetizadora de audio para reproducir un timbre de cocina agradable ("ding-ding")
const playKitchenBell = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq, startTime, duration, vol) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(vol, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Dos campanas sucesivas (ding-ding)
    playTone(880, now, 0.4, 0.2);
    playTone(1760, now, 0.4, 0.08);

    playTone(880, now + 0.15, 0.5, 0.2);
    playTone(1760, now + 0.15, 0.5, 0.08);
  } catch (err) {
    console.warn('Fallo en reproducción de audio de cocina:', err);
  }
};

export default function KitchenMonitor() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeArea, setActiveArea] = useState('Cocina Caliente'); // Barra Fría, Cocina Caliente, Bebidas

  // Refs para control de timbre por estación
  const prevItemsByAreaRef = useRef({});

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error al obtener comandas para la cocina:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mantener la pantalla encendida (Wake Lock)
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('[PWA Cocina] Screen Wake Lock activado.');
        }
      } catch (err) {
        console.warn('[PWA Cocina] Error al solicitar Wake Lock:', err.message);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLock) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          console.log('[PWA Cocina] Screen Wake Lock liberado.');
        }).catch(err => console.error(err));
      }
    };
  }, []);

  // Sincronizar y consultar pedidos periódicamente
  useEffect(() => {
    fetchOrders();

    // Conexión WebSocket (socket.io) para actualizaciones en tiempo real
    let socket = null;
    try {
      socket = ioClient(SOCKET_URL, { transports: ['websocket'] });
      socket.on('connect', () => console.log('Socket conectado a', SOCKET_URL));
      socket.on('orders', (data) => {
        // Reemplazar la lista completa de pedidos con lo enviado por el servidor
        setOrders(data);
      });
    } catch (err) {
      console.warn('No fue posible conectar via WebSocket:', err);
    }

    const interval = setInterval(fetchOrders, 5000); // Auto-refresco cada 5 segundos
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Actualizar el estado de preparación de un platillo en el backend
  const toggleItemReady = async (orderId, itemId, currentStatus) => {
    const nextStatus = currentStatus === 'pendiente' ? 'en preparación' : 'entregado';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (response.ok) {
        setOrders(prevOrders =>
          prevOrders.map(order => {
            if (order._id === orderId) {
              const updatedItems = order.items.map(item => {
                if (item._id === itemId) {
                  return { ...item, status: nextStatus };
                }
                return item;
              });
              return { ...order, items: updatedItems };
            }
            return order;
          })
        );
      }
    } catch (error) {
      console.error('Error al actualizar el estado del platillo:', error);
    }
  };

  // Filtrar los platillos que pertenecen al área seleccionada
  const getItemsForArea = () => {
    const items = [];
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.area === activeArea && item.status !== 'entregado') {
          items.push({
            orderId: order._id,
            tableNumber: order.table?.number || 'S/N',
            itemId: item._id,
            name: item.menuItem?.name || 'Platillo',
            quantity: item.quantity,
            notes: item.notes,
            status: item.status,
            time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      });
    });
    return items;
  };

  const areaItems = getItemsForArea();

  // Monitorear e informar mediante timbre ("bell") si entran nuevos pedidos pendientes a esta estación
  useEffect(() => {
    if (orders.length === 0) return;

    const currentItemIds = new Set(areaItems.map(item => `${item.orderId}-${item.itemId}`));
    const prevItemIds = prevItemsByAreaRef.current[activeArea];

    if (!prevItemIds) {
      // Registrar la primera carga de esta área sin sonar
      prevItemsByAreaRef.current[activeArea] = currentItemIds;
      return;
    }

    // Verificar si entró algún nuevo ID de platillo
    let hasNewItems = false;
    for (const id of currentItemIds) {
      if (!prevItemIds.has(id)) {
        hasNewItems = true;
        break;
      }
    }

    // Guardar para el siguiente ciclo
    prevItemsByAreaRef.current[activeArea] = currentItemIds;

    if (hasNewItems) {
      playKitchenBell();
    }
  }, [orders, activeArea, areaItems]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      {/* Cabecera */}
      <div className="glass-panel rounded-3xl p-6 mb-8 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
            <Fish className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand-header">Monitor de Cocina y Barra</h2>
            <p className="text-brand-text/75 text-sm">Monitoreo de comandas activas por estación de preparación.</p>
          </div>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-brand-secondary/15 hover:bg-brand-secondary/25 text-brand-header transition duration-200 font-bold text-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Selector de Áreas de Trabajo / Pestañas */}
      <div className="flex border-b border-brand-header/10 mb-8 gap-2">
        {['Barra Fría', 'Cocina Caliente', 'Bebidas'].map(area => {
          const areaIcons = {
            'Barra Fría': <Droplet className="w-4 h-4 text-sky-650" />,
            'Cocina Caliente': <Flame className="w-4 h-4 text-orange-655" />,
            'Bebidas': <GlassWater className="w-4 h-4 text-[#5CA8B5]" />
          };
          return (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 transition duration-200 cursor-pointer flex items-center gap-2 ${
                activeArea === area
                  ? 'border-brand-primary text-brand-primary font-extrabold'
                  : 'border-transparent text-brand-text/60 hover:text-brand-header'
              }`}
            >
              {areaIcons[area]}
              {area}
            </button>
          );
        })}
      </div>

      {/* Grid de Tickets */}
      {areaItems.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-brand-header/20">
          <p className="text-brand-text/60 font-medium text-lg">No hay pedidos pendientes en esta área.</p>
          <p className="text-brand-text/40 text-sm mt-1">¡Buen trabajo en equipo!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {areaItems.map((item, idx) => (
            <div
              key={`${item.orderId}-${item.itemId}-${idx}`}
              className={`glass-panel rounded-3xl p-5 border flex flex-col justify-between shadow-md hover:shadow-lg transition ${
                item.status === 'en preparación' ? 'border-amber-300 bg-amber-500/5' : 'border-brand-header/10'
              }`}
            >
              <div>
                {/* Cabecera del ticket */}
                <div className="flex items-center justify-between border-b border-brand-header/15 pb-3 mb-4">
                  <span className="text-xs font-black text-brand-primary tracking-widest uppercase flex items-center gap-1.5">
                    {activeArea === 'Barra Fría' && <Snowflake className="w-3.5 h-3.5" />}
                    {activeArea === 'Cocina Caliente' && <Flame className="w-3.5 h-3.5" />}
                    {activeArea === 'Bebidas' && <GlassWater className="w-3.5 h-3.5" />}
                    {activeArea.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 text-brand-text/50 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.time}</span>
                  </div>
                </div>

                {/* Mesa */}
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-xl font-black text-brand-header">
                    MESA {item.tableNumber}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 border ${
                    item.status === 'en preparación' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {item.status === 'en preparación' ? (
                      <Wave className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {item.status}
                  </span>
                </div>

                {/* Detalle */}
                <div className="bg-white/40 border border-brand-header/5 rounded-2xl p-4 my-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xl font-black text-brand-primary">{item.quantity}x</span>
                    <div>
                      <p className="font-extrabold text-brand-header leading-tight">{item.name}</p>
                      {item.notes && (
                        <p className="text-xs text-rose-600 font-semibold mt-1">
                          Nota: {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de cambio de estado */}
              <button
                onClick={() => toggleItemReady(item.orderId, item.itemId, item.status)}
                className={`w-full mt-4 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  item.status === 'en preparación'
                    ? 'bg-emerald-550/10 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-300'
                    : 'bg-amber-550/10 hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-300'
                }`}
              >
                {item.status === 'en preparación' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Marcar Entregado
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Empezar Preparación
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
