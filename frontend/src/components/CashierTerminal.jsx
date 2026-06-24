import React, { useState, useEffect } from 'react';
import { 
  CreditCard, DollarSign, RefreshCw, CheckCircle, Receipt, 
  Users, UserPlus, Gift, Coins, UserCheck, AlertTriangle, 
  Plus, Minus, Banknote
} from 'lucide-react';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return `${window.location.origin}/api`;
};
const API_URL = getApiUrl();

export default function CashierTerminal() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [message, setMessage] = useState(null);
  const [changeInfo, setChangeInfo] = useState(null);

  // Nuevos estados para división de cuenta e historial de pagos
  const [payments, setPayments] = useState([]);
  const [splitCount, setSplitCount] = useState(1);
  const [splitBase, setSplitBase] = useState('remaining');

  // Nuevos estados para clientes / programa de lealtad
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isRegisteringCustomer, setIsRegisteringCustomer] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');

  // Agrupar órdenes por número de mesa
  const getGroupedOrders = () => {
    const groups = {};
    orders.forEach(order => {
      const tableNum = order.table?.number || 'S/N';
      if (!groups[tableNum]) {
        groups[tableNum] = {
          tableNumber: tableNum,
          tableId: order.table?._id,
          orders: [],
          items: [],
          total: 0,
          totalPaid: 0,
          remaining: 0,
          paymentStatus: 'pending'
        };
      }
      groups[tableNum].orders.push(order);
      groups[tableNum].total += order.total;
      groups[tableNum].totalPaid += order.totalPaid || 0;
      groups[tableNum].remaining += order.remaining !== undefined ? order.remaining : order.total;
      
      // Consolidar ítems
      order.items.forEach(item => {
        const menuItemId = item.menuItem?._id;
        const existingItem = groups[tableNum].items.find(i => i.menuItem?._id === menuItemId && i.notes === item.notes);
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          groups[tableNum].items.push({ ...item });
        }
      });

      if (order.paymentStatus === 'partial') {
        groups[tableNum].paymentStatus = 'partial';
      }
    });

    return Object.values(groups).sort((a, b) => {
      if (typeof a.tableNumber === 'number' && typeof b.tableNumber === 'number') {
        return a.tableNumber - b.tableNumber;
      }
      return String(a.tableNumber).localeCompare(String(b.tableNumber));
    });
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'placeholder_token'}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error al obtener comandas para caja:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupPayments = async (groupOrders) => {
    try {
      const allPayments = [];
      for (const order of groupOrders) {
        const response = await fetch(`${API_URL}/payments/order/${order._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || 'placeholder_token'}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          allPayments.push(...data);
        }
      }
      setPayments(allPayments);
    } catch (error) {
      console.error('Error al obtener abonos de comanda:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_URL}/customers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || 'placeholder_token'}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error al obtener clientes:', error);
    }
  };

  const handleRegisterCustomer = async (e) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'placeholder_token'}`
        },
        body: JSON.stringify({
          name: custName,
          phone: custPhone,
          email: custEmail
        })
      });

      const data = await response.json();

      if (response.ok) {
        setCustomerMessage('Cliente registrado con éxito.');
        fetchCustomers();
        setSelectedCustomerId(data._id);
        setIsRegisteringCustomer(false);
        setCustName('');
        setCustPhone('');
        setCustEmail('');
        setTimeout(() => setCustomerMessage(''), 3000);
      } else {
        setCustomerMessage(data.message || 'Error al registrar cliente.');
      }
    } catch (error) {
      console.error('Error al registrar cliente:', error);
      setCustomerMessage('Error al conectar con la base de datos.');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);

  // Seleccionar comanda y resetear campos
  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setAmount(group.remaining.toFixed(2));
    setChangeInfo(null);
    setMessage(null);
    setSplitCount(1);
    setSplitBase('remaining');
    setSelectedCustomerId('');
    setIsRegisteringCustomer(false);
    setCustomerMessage('');
    fetchGroupPayments(group.orders);
  };

  // Enviar el pago al servidor
  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !amount) return;

    let paymentLeft = Number(amount);
    let lastChange = 0;
    let success = false;
    let errorMsg = null;

    // Ordenar de la más antigua a la más nueva
    const sortedOrders = [...selectedGroup.orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const order of sortedOrders) {
      if (paymentLeft <= 0) break;

      const orderRemaining = order.remaining !== undefined ? order.remaining : order.total;
      if (orderRemaining <= 0) continue;

      const amountToPay = Math.min(paymentLeft, orderRemaining);

      try {
        const response = await fetch(`${API_URL}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || 'placeholder_token'}`
          },
          body: JSON.stringify({
            orderId: order._id,
            amount: amountToPay,
            method: paymentMethod,
            customerId: selectedCustomerId || undefined
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          success = true;
          paymentLeft -= amountToPay;
          lastChange = data.change || 0;
        } else {
          errorMsg = data.message || 'Error al procesar el pago.';
          break;
        }
      } catch (error) {
        console.error('Error al conectar con la API de cobros:', error);
        errorMsg = 'Error al procesar el abono de grupo.';
        break;
      }
    }

    if (success) {
      const totalChange = lastChange + (paymentLeft > 0 ? paymentLeft : 0);
      const newRemaining = Math.max(0, selectedGroup.remaining - Number(amount));

      setChangeInfo({
        change: totalChange,
        remaining: newRemaining
      });

      setMessage({
        type: 'success',
        text: newRemaining > 0 ? 'Abono registrado con éxito y puntos de lealtad otorgados.' : 'Comanda saldada por completo.'
      });

      if (newRemaining > 0) {
        setAmount(newRemaining.toFixed(2));
        // Recargar abonos para el grupo
        setTimeout(() => {
          fetchGroupPayments(selectedGroup.orders);
        }, 300);
      } else {
        setSelectedGroup(null);
        setPayments([]);
        setSelectedCustomerId('');
      }

      fetchOrders();
      fetchCustomers();
    } else {
      setMessage({ type: 'error', text: errorMsg || 'Error al procesar el pago.' });
    }
  };

  const groupedOrders = getGroupedOrders();

  // Actualizar el grupo seleccionado si cambia la lista general de órdenes
  useEffect(() => {
    if (selectedGroup && orders.length > 0) {
      const updatedGroups = getGroupedOrders();
      const updatedSelected = updatedGroups.find(g => g.tableNumber === selectedGroup.tableNumber);
      if (updatedSelected) {
        setSelectedGroup(updatedSelected);
      } else {
        setSelectedGroup(null);
        setPayments([]);
      }
    }
  }, [orders]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      {/* Cabecera */}
      <div className="glass-panel rounded-3xl p-6 mb-8 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand-header">Terminal de Caja</h2>
            <p className="text-brand-text/75 text-sm">Registro de abonos, pagos totales y cuentas divididas agrupadas por mesa.</p>
          </div>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-brand-secondary/15 hover:bg-brand-secondary/25 text-brand-header transition duration-200 font-bold text-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar Cuentas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Comandas Activas */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-lg font-black text-brand-header mb-2 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-primary" />
            Cuentas Abiertas
          </h3>

          {groupedOrders.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-brand-header/20">
              <p className="text-brand-text/60 font-medium">No hay mesas activas con comanda en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groupedOrders.map((group) => {
                const isSelected = selectedGroup && selectedGroup.tableNumber === group.tableNumber;
                return (
                  <div
                    key={group.tableNumber}
                    onClick={() => handleSelectGroup(group)}
                    className={`glass-panel rounded-2xl p-5 border cursor-pointer hover:shadow-md transition flex flex-col justify-between ${
                      isSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-header/10 hover:border-brand-header/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-black text-brand-header text-lg flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${group.paymentStatus === 'partial' ? 'bg-amber-500' : 'bg-[#0B525B]'}`} />
                          Mesa {group.tableNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 border ${
                          group.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700 border-amber-250' : 'bg-slate-100 text-slate-600 border-slate-250'
                        }`}>
                          {group.paymentStatus === 'partial' ? <Coins className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {group.paymentStatus === 'partial' ? 'Abono Parcial' : 'Sin Pagar'}
                        </span>
                      </div>

                      <div className="border-t border-brand-header/5 pt-3 my-2 text-xs text-brand-text/80">
                        {group.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-0.5">
                            <span>{item.quantity}x {item.menuItem?.name}</span>
                            <span className="flex items-center gap-0.5">
                              <DollarSign className="w-3 h-3 text-brand-text/50" />
                              {((item.menuItem?.price || 0) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-brand-header/5 pt-3 mt-3 flex flex-col gap-1">
                      {group.totalPaid > 0 && (
                        <div className="flex justify-between text-xs text-brand-text/65 font-medium">
                          <span>Abonado:</span>
                          <span className="flex items-center gap-0.5">
                            <DollarSign className="w-3 h-3" />
                            {group.totalPaid.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-brand-text/60 font-semibold">
                          {group.totalPaid > 0 ? 'Restante por pagar:' : 'Total a pagar:'}
                        </span>
                        <span className="text-xl font-black text-brand-primary flex items-center gap-0.5">
                          <DollarSign className="w-4 h-4 text-brand-primary" />
                          {group.remaining.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel de Cobros */}
        <div className="glass-panel rounded-3xl p-6 shadow-md h-fit">
          <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-primary" />
            Detalle de Cobro
          </h3>

          {selectedGroup ? (
            <form onSubmit={handlePayment} className="flex flex-col gap-4">
              <div className="bg-brand-header/5 rounded-2xl p-4 border border-brand-header/10 flex flex-col gap-1.5">
                <span className="text-xs text-brand-text/60 font-semibold uppercase tracking-wider block mb-1">Mesa Seleccionada</span>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-black text-brand-header flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                    Mesa {selectedGroup.tableNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 border ${
                    selectedGroup.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700 border-amber-250' : 'bg-slate-100 text-slate-600 border-slate-250'
                  }`}>
                    {selectedGroup.paymentStatus === 'partial' ? <Coins className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {selectedGroup.paymentStatus === 'partial' ? 'Abono Parcial' : 'Sin Pagar'}
                  </span>
                </div>
                
                <div className="border-t border-brand-header/10 mt-3 pt-3 flex flex-col gap-1.5 text-xs text-brand-text/80">
                  <div className="flex justify-between">
                    <span>Total comanda:</span>
                    <span className="font-bold flex items-center gap-0.5">
                      <DollarSign className="w-3.5 h-3.5 text-brand-text/60" />
                      {selectedGroup.total.toFixed(2)}
                    </span>
                  </div>
                  {selectedGroup.totalPaid > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Total abonado:</span>
                      <span className="font-bold flex items-center gap-0.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        {selectedGroup.totalPaid.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline border-t border-brand-header/10 pt-2 mt-1 font-black text-sm text-brand-header">
                    <span>Restante por pagar:</span>
                    <span className="text-xl font-black text-brand-primary flex items-center gap-0.5">
                      <DollarSign className="w-4 h-4 text-brand-primary" />
                      {selectedGroup.remaining.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historial de Abonos */}
              {payments.length > 0 && (
                <div className="bg-[#0B525B]/5 border border-[#0B525B]/10 rounded-2xl p-4 flex flex-col gap-2 text-xs">
                  <h4 className="font-black text-brand-header uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#0B525B]" />
                    Historial de Pagos / Abonos
                  </h4>
                  <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {payments.map((p, idx) => (
                      <div key={p._id || idx} className="flex justify-between items-center py-1 border-b border-brand-header/5 last:border-0 text-brand-text">
                        <span className="capitalize flex items-center gap-1.5">
                          {p.method === 'tarjeta' ? <CreditCard className="w-3.5 h-3.5 text-sky-600" /> : <Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                          {p.method} • {new Date(p.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="font-bold text-emerald-650 flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" />
                          {p.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculadora de Cuenta Dividida */}
              <div className="bg-[#0B525B]/5 border border-[#0B525B]/10 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-brand-header uppercase tracking-wider">Dividir Cuenta</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#5CA8B5]/20 text-[#0B525B]">
                    Calculadora
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSplitBase('remaining')}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                      splitBase === 'remaining'
                        ? 'bg-[#5CA8B5] border-[#5CA8B5] text-white font-extrabold'
                        : 'bg-white border-brand-header/15 text-brand-text hover:bg-slate-50'
                    }`}
                  >
                    Dividir Restante
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitBase('total')}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                      splitBase === 'total'
                        ? 'bg-[#5CA8B5] border-[#5CA8B5] text-white font-extrabold'
                        : 'bg-white border-brand-header/15 text-brand-text hover:bg-slate-50'
                    }`}
                  >
                    Dividir Total
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-brand-header/10">
                  <span className="text-xs font-bold text-brand-text/80 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-brand-text/60" />
                    Partes (Personas):
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSplitCount(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-header font-black flex items-center justify-center cursor-pointer select-none"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-black text-brand-header text-sm w-4 text-center">{splitCount}</span>
                    <button
                      type="button"
                      onClick={() => setSplitCount(prev => Math.min(12, prev + 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-header font-black flex items-center justify-center cursor-pointer select-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-1.5 justify-between">
                  {[2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSplitCount(num)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                        splitCount === num
                          ? 'bg-[#E8912E] border-[#E8912E] text-white font-extrabold'
                          : 'bg-white border-brand-header/10 text-brand-text/80 hover:bg-slate-50'
                      }`}
                    >
                      {num} pax
                    </button>
                  ))}
                </div>

                {(() => {
                  const baseAmount = splitBase === 'total' ? selectedGroup.total : selectedGroup.remaining;
                  const share = baseAmount / splitCount;
                  return (
                    <div className="border-t border-brand-header/10 pt-3 flex flex-col gap-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-brand-text/70">Monto por persona:</span>
                        <span className="text-lg font-black text-brand-primary flex items-center gap-0.5">
                          <DollarSign className="w-4 h-4" />
                          {share.toFixed(2)}
                        </span>
                      </div>
                      {splitCount > 1 && (
                        <button
                          type="button"
                          onClick={() => setAmount(share.toFixed(2))}
                          className="w-full py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          Cargar ${share.toFixed(2)} a Cobrar
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Selección de Cliente para Programa de Lealtad */}
              <div className="bg-[#0B525B]/5 border border-[#0B525B]/10 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-brand-header uppercase tracking-wider flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-brand-primary" />
                    Cliente Frecuente (Lealtad)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisteringCustomer(!isRegisteringCustomer);
                      setCustomerMessage('');
                    }}
                    className="text-[10px] font-black text-[#E8912E] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    {isRegisteringCustomer ? 'Cancelar' : <><Plus className="w-3 h-3" /> Registrar Nuevo</>}
                  </button>
                </div>

                {customerMessage && (
                  <div className="text-[10px] font-bold text-[#E8912E] bg-white border border-[#E8912E]/10 rounded-lg p-1.5 text-center">
                    {customerMessage}
                  </div>
                )}

                {isRegisteringCustomer ? (
                  <div className="flex flex-col gap-2 bg-white rounded-xl p-3 border border-brand-header/10 text-xs">
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full p-2 border border-brand-header/15 rounded-lg focus:outline-none"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full p-2 border border-brand-header/15 rounded-lg focus:outline-none"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      className="w-full p-2 border border-brand-header/15 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleRegisterCustomer}
                      className="w-full py-2 bg-[#5CA8B5] hover:bg-[#5CA8B5]/95 text-white font-bold rounded-lg cursor-pointer transition text-[11px] flex items-center justify-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Guardar Cliente
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl border border-brand-header/15 focus:border-brand-primary focus:outline-none bg-white text-brand-header font-bold text-xs"
                    >
                      <option value="">-- Sin Cliente Asociado --</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.phone}) - {c.loyaltyPoints} pts
                        </option>
                      ))}
                    </select>
                    {selectedCustomerId && (() => {
                      const selected = customers.find(c => c._id === selectedCustomerId);
                      if (selected) {
                        return (
                          <div className="flex justify-between items-center text-[10px] font-bold text-[#0B525B]">
                            <span className="flex items-center gap-0.5">
                              <Gift className="w-3 h-3 text-[#E8912E]" />
                              Puntos acumulados: {selected.loyaltyPoints} pts
                            </span>
                            <span className="text-emerald-600 flex items-center gap-0.5">
                              <Coins className="w-3 h-3" />
                              +10% en puntos
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* Método de Pago */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-brand-text/80 uppercase">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border cursor-pointer ${
                      paymentMethod === 'efectivo'
                        ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                        : 'bg-white border-brand-header/15 text-brand-text hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tarjeta')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border cursor-pointer ${
                      paymentMethod === 'tarjeta'
                        ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                        : 'bg-white border-brand-header/15 text-brand-text hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Tarjeta
                  </button>
                </div>
              </div>

              {/* Botón de envío */}
              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-2xl bg-brand-header hover:bg-brand-header/90 text-white font-extrabold text-sm shadow-md transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Registrar Pago
              </button>
            </form>
          ) : (
            <div className="text-center py-12 border border-dashed border-brand-header/15 rounded-3xl bg-white/20">
              <p className="text-brand-text/50 text-sm font-medium">Selecciona una comanda de la lista para procesar el pago.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
