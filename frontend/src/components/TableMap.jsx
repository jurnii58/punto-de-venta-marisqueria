import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Users, Utensils, Plus, Minus, Send, X, 
  ClipboardList, Check, UserPlus, UserMinus, Clock, Flame, 
  CheckCircle, XCircle, DollarSign, PlusCircle, GlassWater, 
  LayoutGrid, AlertCircle, ClipboardPlus
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:5000/api`;

// Función para disparar vibración háptica suave en dispositivos móviles (si es soportado)
const triggerHaptic = (duration = 30) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(duration);
  }
};

const DEFAULT_MOCK_TABLES = [
  { number: 1, capacity: 4, status: 'libre' },
  { number: 2, capacity: 2, status: 'libre' },
  { number: 3, capacity: 6, status: 'ocupada' },
  { number: 4, capacity: 4, status: 'libre' },
  { number: 5, capacity: 8, status: 'ocupada' },
  { number: 6, capacity: 4, status: 'libre' }
];

export default function TableMap() {
  const [tables, setTables] = useState(DEFAULT_MOCK_TABLES);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  // Estados para el Modal de Comanda (Mesero)
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);
  const [orderDraft, setOrderDraft] = useState({}); // { menuItemId: { quantity, notes } }
  const [activeOrders, setActiveOrders] = useState([]);

  // Cargar mesas e insumos
  const fetchTablesAndMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const tableRes = await fetch(`${API_URL}/tables`);
      if (!tableRes.ok) throw new Error('Error al conectar con la base de datos');
      const tableData = await tableRes.json();
      setTables(tableData);
      setUsingMockData(false);
    } catch (err) {
      console.warn('Usando mesas de simulación local');
      setUsingMockData(true);
    }

    try {
      const menuRes = await fetch(`${API_URL}/menu`);
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenuItems(menuData);
      } else {
        throw new Error();
      }
    } catch (err) {
      // Menú fallback en modo offline/desconectado
      setMenuItems([
        { _id: 'm1', name: 'Ceviche de Camarón', price: 180, category: 'Entradas', description: 'Ceviche fresco marinado con limón' },
        { _id: 'm2', name: 'Pulpo a las Brasas', price: 280, category: 'Especialidades', description: 'Pulpo tierno asado al carbón' },
        { _id: 'm3', name: 'Michelada de la Casa', price: 95, category: 'Bebidas', description: 'Cerveza preparada con camarón' },
        { _id: 'm4', name: 'Tacos de Pescado Rebosado', price: 130, category: 'Especialidades', description: 'Estilo Ensenada' }
      ]);
    }

    try {
      const ordersRes = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || 'mesero_auth_token'}` }
      });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setActiveOrders(ordersData);
      }
    } catch (err) {
      console.warn('No se pudieron obtener las comandas activas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTablesAndMenu();
  }, []);

  // Abrir modal de pedido para la mesa
  const handleOpenOrderModal = (table) => {
    triggerHaptic(40); // Vibración media al abrir comanda
    setSelectedTableForOrder(table);
    setOrderDraft({}); // Limpiar borrador previo
  };

  // Alternar el estado directamente (libre/ocupada) sin comanda
  const toggleTableStatus = async (tableNumber, currentStatus) => {
    triggerHaptic(30); // Vibración suave al ocupar/liberar mesa
    const newStatus = currentStatus === 'libre' ? 'ocupada' : 'libre';
    setTables(prev => prev.map(t => (t.number === tableNumber ? { ...t, status: newStatus } : t)));
    setUpdateMessage(`Mesa ${tableNumber} marcada como ${newStatus}`);
    setTimeout(() => setUpdateMessage(''), 3000);

    if (!usingMockData) {
      try {
        await fetch(`${API_URL}/tables/${tableNumber}/status`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || 'placeholder_token'}`
          },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (err) {
        console.error('Error al actualizar en DB', err);
      }
    }
  };

  // Añadir un platillo al borrador del pedido
  const adjustItemQuantity = (menuItemId, change) => {
    triggerHaptic(20); // Vibración ultra-corta al cambiar cantidades (+ / -)
    setOrderDraft(prev => {
      const current = prev[menuItemId] || { quantity: 0, notes: '' };
      const newQty = Math.max(0, current.quantity + change);
      
      if (newQty === 0) {
        const updated = { ...prev };
        delete updated[menuItemId];
        return updated;
      }

      return {
        ...prev,
        [menuItemId]: { ...current, quantity: newQty }
      };
    });
  };

  // Editar notas para un platillo del borrador
  const updateItemNotes = (menuItemId, notes) => {
    setOrderDraft(prev => {
      if (!prev[menuItemId]) return prev;
      return {
        ...prev,
        [menuItemId]: { ...prev[menuItemId], notes }
      };
    });
  };

  // Enviar comanda al Backend
  const submitOrder = async (e) => {
    triggerHaptic(70); // Vibración larga al enviar pedido
    e.preventDefault();
    const items = Object.entries(orderDraft).map(([menuItemId, detail]) => ({
      menuItem: menuItemId,
      quantity: detail.quantity,
      notes: detail.notes
    }));

    if (items.length === 0) return;

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'mesero_auth_token'}`
        },
        body: JSON.stringify({
          tableNumber: selectedTableForOrder.number,
          items
        })
      });

      const data = await response.json();

      if (response.ok) {
        setUpdateMessage(`¡Comanda enviada a cocina para Mesa ${selectedTableForOrder.number}!`);
        setTimeout(() => setUpdateMessage(''), 4000);
        setSelectedTableForOrder(null);
        fetchTablesAndMenu();
      } else {
        // Respuesta del Service Worker si estuviera offline (202 Accepted)
        if (response.status === 202) {
          setUpdateMessage(data.message);
          setTimeout(() => setUpdateMessage(''), 5000);
          setSelectedTableForOrder(null);
          // Actualizar estado local
          setTables(prev => prev.map(t => t.number === selectedTableForOrder.number ? { ...t, status: 'ocupada' } : t));
        } else {
          setError(data.message || 'Error al enviar comanda.');
          setTimeout(() => setError(null), 4000);
        }
      }
    } catch (err) {
      console.warn('Conexión fallida. Registrando localmente con el PWA Service Worker...');
      // Si la petición falla por completo, el Service Worker en producción lo interceptará.
      // Aquí simulamos el guardado exitoso offline.
      setUpdateMessage('Comanda registrada localmente (Modo Offline). Se enviará a cocina al recuperar conexión.');
      setTimeout(() => setUpdateMessage(''), 5000);
      setSelectedTableForOrder(null);
      setTables(prev => prev.map(t => t.number === selectedTableForOrder.number ? { ...t, status: 'ocupada' } : t));
    }
  };

  // Estadísticas de mesas
  const totalTables = tables.length;
  const occupiedTables = tables.filter(t => t.status === 'ocupada').length;
  const freeTables = totalTables - occupiedTables;

  // Renderizar las sillas visuales
  const renderSeats = (capacity) => {
    const seats = [];
    const radius = 48;
    for (let i = 0; i < capacity; i++) {
      const angle = (i * 360) / capacity;
      const x = Math.cos((angle * Math.PI) / 180) * radius;
      const y = Math.sin((angle * Math.PI) / 180) * radius;
      seats.push(
        <div
          key={i}
          className="absolute w-3.5 h-3.5 rounded-full bg-brand-secondary/35 border border-brand-secondary/55 shadow-sm"
          style={{
            transform: `translate(${x}px, ${y}px)`,
            top: 'calc(50% - 7px)',
            left: 'calc(50% - 7px)',
          }}
        />
      );
    }
    return seats;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      {/* Panel Superior / Header */}
      <div className="glass-panel rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-secondary/15 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-brand-secondary/15 text-brand-header text-xs font-bold uppercase tracking-widest border border-brand-secondary/20">
                Meseros
              </span>
              {usingMockData && (
                <span className="px-3 py-1 rounded-full bg-brand-primary/15 text-brand-primary text-xs font-bold uppercase tracking-widest border border-brand-primary/20">
                  Modo Local / Demo
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand-header mt-2">
              Distribución de Sala y Mesas
            </h1>
            <p className="text-brand-text/80 mt-1 text-sm md:text-base">
              Monitoreo de disponibilidad y toma rápida de comandas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchTablesAndMenu}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white shadow-md transition-all duration-200 disabled:opacity-50 text-sm font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        {/* Panel de Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-brand-header/10">
          <div className="glass-card rounded-2xl p-4 text-center flex flex-col items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-brand-header mb-1 opacity-85" />
            <p className="text-xs text-brand-text/70 uppercase tracking-wider font-semibold">Sala Completa</p>
            <p className="text-2xl md:text-3xl font-extrabold text-brand-text mt-1">{totalTables} Mesas</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center border-l-2 border-emerald-500/40 flex flex-col items-center justify-center">
            <Check className="w-5 h-5 text-emerald-600 mb-1" />
            <p className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">Libres</p>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 mt-1">{freeTables}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center border-l-2 border-rose-500/40 flex flex-col items-center justify-center">
            <Users className="w-5 h-5 text-rose-600 mb-1" />
            <p className="text-xs text-rose-600 uppercase tracking-wider font-semibold">Ocupadas</p>
            <p className="text-2xl md:text-3xl font-extrabold text-rose-600 mt-1">{occupiedTables}</p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {updateMessage && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-brand-secondary/10 text-brand-header border border-brand-secondary/20 text-sm font-medium shadow-md animate-bounce text-center">
          {updateMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-medium shadow-md text-center">
          {error}
        </div>
      )}

      {/* Grid de Mesas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {tables.map((table) => {
          const isOcupada = table.status === 'ocupada';
          const tableOrder = activeOrders.find(o => o.table?.number === table.number || o.table?._id === table._id);
          return (
            <div
              key={table.number}
              className={`glass-panel rounded-3xl p-6 transition-all duration-300 relative group flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 ${
                isOcupada
                  ? 'border-rose-300 hover:border-rose-400 bg-white/50'
                  : 'border-emerald-300 hover:border-emerald-400 bg-white/50'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-brand-header flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOcupada ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    Mesa {table.number}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-brand-text/70 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Capacidad: {table.capacity} paxs</span>
                  </div>
                  {isOcupada && tableOrder && (
                    <div className="mt-1 text-xs font-black text-[#E8912E] flex items-center gap-0.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Consumo: ${tableOrder.total.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 ${
                    isOcupada
                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {isOcupada ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  <span>{table.status}</span>
                </span>
              </div>

              {/* Mesa circular interactiva */}
              <div className="relative h-44 flex items-center justify-center my-4">
                {renderSeats(table.capacity)}

                <div
                  onClick={() => isOcupada ? handleOpenOrderModal(table) : toggleTableStatus(table.number, 'libre')}
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-lg transition-all duration-350 transform active:scale-95 z-10 select-none ${
                    isOcupada
                      ? 'bg-rose-50 border-2 border-rose-500 text-rose-750 shadow-rose-900/10 hover:bg-rose-100'
                      : 'bg-emerald-50 border-2 border-emerald-500 text-emerald-750 shadow-emerald-900/10 hover:bg-emerald-100'
                  }`}
                >
                  <Utensils className="w-6 h-6 mb-1" />
                  <span className="text-2xl font-black">{table.number}</span>
                </div>
              </div>

              {/* Acciones del Mesero */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => handleOpenOrderModal(table)}
                  className="py-2.5 px-3 rounded-xl bg-brand-secondary/20 hover:bg-brand-secondary text-brand-header hover:text-white font-bold text-xs transition duration-200 border border-brand-secondary/20 cursor-pointer flex items-center justify-center gap-1"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Comanda</span>
                </button>
                <button
                  onClick={() => toggleTableStatus(table.number, table.status)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition duration-200 border cursor-pointer flex items-center justify-center gap-1 ${
                    isOcupada
                      ? 'bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-500 text-emerald-750 hover:text-white border-emerald-200'
                  }`}
                >
                  {isOcupada ? (
                    <>
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Liberar</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Ocupar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Comanda (Tomar Pedido) */}
      {selectedTableForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-header/60 backdrop-blur-sm p-4">
          <div className="bg-[#F3E4D4] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col justify-between p-6 shadow-2xl border border-brand-header/20 overflow-hidden">
            {/* Cabecera */}
            {(() => {
              const currentOrder = activeOrders.find(o => o.table?.number === selectedTableForOrder.number || o.table?._id === selectedTableForOrder._id);
              return (
                <>
                  <div className="flex items-center justify-between border-b border-brand-header/10 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
                        <ClipboardPlus className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-brand-header leading-none">
                          {currentOrder ? 'Añadir a Comanda' : 'Nueva Comanda'}
                        </h3>
                        <p className="text-xs text-brand-text/80 font-bold mt-1.5 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Mesa {selectedTableForOrder.number} • Capacidad: {selectedTableForOrder.capacity} personas
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedTableForOrder(null)}
                      className="p-2 rounded-full hover:bg-slate-200/50 text-brand-header transition duration-200 cursor-pointer"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {currentOrder && (
                    <div className="bg-[#0B525B]/5 rounded-2xl p-4 border border-[#0B525B]/10 text-xs mb-4">
                      <h4 className="font-black text-brand-header uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-brand-primary" />
                        Consumido hasta el momento (Estatus de Cocina):
                      </h4>
                      <div className="max-h-32 overflow-y-auto flex flex-col gap-1.5 pr-1">
                        {currentOrder.items.map((item, idx) => {
                          const statusColors = {
                            'pendiente': 'bg-slate-100 text-slate-700 border-slate-200',
                            'en preparación': 'bg-amber-100 text-amber-700 border-amber-200',
                            'entregado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            'cancelado': 'bg-rose-100 text-rose-700 border-rose-200'
                          };
                          const badgeClass = statusColors[item.status] || 'bg-slate-100 text-slate-700 border-slate-200';
                          return (
                            <div key={idx} className="flex justify-between items-center py-1 border-b border-brand-header/5 last:border-0 text-brand-text">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold">{item.quantity}x {item.menuItem?.name}</span>
                                {item.notes && <span className="text-[10px] text-rose-650 italic">({item.notes})</span>}
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider shrink-0 flex items-center gap-0.5 ${badgeClass}`}>
                                  {item.status === 'pendiente' && <Clock className="w-2.5 h-2.5 animate-spin" />}
                                  {item.status === 'en preparación' && <Flame className="w-2.5 h-2.5 animate-pulse" />}
                                  {item.status === 'entregado' && <CheckCircle className="w-2.5 h-2.5" />}
                                  {item.status === 'cancelado' && <XCircle className="w-2.5 h-2.5" />}
                                  {item.status}
                                </span>
                              </div>
                              <span className="font-bold shrink-0 flex items-center gap-0.5">
                                <DollarSign className="w-3 h-3 text-brand-text/60" />
                                {((item.menuItem?.price || 0) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center border-t border-[#0B525B]/10 pt-2 mt-2 font-black text-sm text-brand-header">
                        <span>Subtotal Acumulado:</span>
                        <span className="text-[#E8912E] flex items-center gap-0.5">
                          <DollarSign className="w-4 h-4" />
                          {currentOrder.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Listado de Platillos dividido en dos secciones */}
            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
              {/* Sección de Comida */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-black uppercase text-[#0B525B] border-b border-[#0B525B]/10 pb-2 flex items-center gap-2 tracking-widest">
                  <Utensils className="w-4 h-4 text-[#E8912E]" />
                  Comida
                </h4>
                <div className="flex flex-col gap-3">
                  {menuItems.filter(item => item.category !== 'Bebidas').map(item => {
                    const current = orderDraft[item._id] || { quantity: 0, notes: '' };
                    return (
                      <div key={item._id} className="glass-card rounded-2xl p-4 flex flex-col justify-between gap-2.5 bg-white/60">
                        <div>
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="font-extrabold text-brand-header text-sm leading-tight">{item.name}</span>
                            <span className="text-sm font-black text-[#E8912E] shrink-0">${item.price}</span>
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-brand-text/60 mt-1 leading-snug">{item.description}</p>
                          )}
                        </div>

                        {current.quantity > 0 ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <div className="flex items-center justify-between bg-white/85 rounded-xl px-2 py-1 border border-brand-header/5">
                              <button
                                type="button"
                                onClick={() => adjustItemQuantity(item._id, -1)}
                                className="p-1 rounded bg-slate-200/80 text-brand-header hover:bg-slate-350 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-black text-brand-header text-sm">{current.quantity}</span>
                              <button
                                type="button"
                                onClick={() => adjustItemQuantity(item._id, 1)}
                                className="p-1 rounded bg-slate-200/80 text-brand-header hover:bg-slate-350 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Nota (ej: sin cebolla)"
                              value={current.notes}
                              onChange={(e) => updateItemNotes(item._id, e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-brand-header/10 bg-white focus:outline-none"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => adjustItemQuantity(item._id, 1)}
                            className="w-full py-2 bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Añadir al pedido
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sección de Bebidas */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-black uppercase text-[#0B525B] border-b border-[#0B525B]/10 pb-2 flex items-center gap-2 tracking-widest">
                  <GlassWater className="w-4 h-4 text-[#5CA8B5]" />
                  Bebidas
                </h4>
                <div className="flex flex-col gap-3">
                  {menuItems.filter(item => item.category === 'Bebidas').map(item => {
                    const current = orderDraft[item._id] || { quantity: 0, notes: '' };
                    return (
                      <div key={item._id} className="glass-card rounded-2xl p-4 flex flex-col justify-between gap-2.5 bg-white/60">
                        <div>
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="font-extrabold text-brand-header text-sm leading-tight">{item.name}</span>
                            <span className="text-sm font-black text-[#E8912E] shrink-0">${item.price}</span>
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-brand-text/60 mt-1 leading-snug">{item.description}</p>
                          )}
                        </div>

                        {current.quantity > 0 ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <div className="flex items-center justify-between bg-white/85 rounded-xl px-2 py-1 border border-brand-header/5">
                              <button
                                type="button"
                                onClick={() => adjustItemQuantity(item._id, -1)}
                                className="p-1 rounded bg-slate-200/80 text-brand-header hover:bg-slate-350 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-black text-brand-header text-sm">{current.quantity}</span>
                              <button
                                type="button"
                                onClick={() => adjustItemQuantity(item._id, 1)}
                                className="p-1 rounded bg-slate-200/80 text-brand-header hover:bg-slate-350 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Nota (ej: bien fría)"
                              value={current.notes}
                              onChange={(e) => updateItemNotes(item._id, e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-brand-header/10 bg-white focus:outline-none"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => adjustItemQuantity(item._id, 1)}
                            className="w-full py-2 bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Añadir al pedido
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Resumen y Envío */}
            <div className="border-t border-brand-header/10 pt-4 mt-4 flex items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-xs text-brand-text/60 font-semibold block">Total comanda draft:</span>
                <span className="text-2xl font-black text-brand-header flex items-center gap-0.5">
                  <DollarSign className="w-5 h-5 text-brand-header" />
                  {Object.entries(orderDraft).reduce((sum, [id, details]) => {
                    const item = menuItems.find(m => m._id === id);
                    return sum + (item ? item.price * details.quantity : 0);
                  }, 0).toFixed(2)}
                </span>
              </div>

              <button
                onClick={submitOrder}
                disabled={Object.keys(orderDraft).length === 0}
                className="px-6 py-3 rounded-2xl bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
                Enviar Comanda a Cocina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
