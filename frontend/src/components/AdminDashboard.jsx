import React, { useState, useEffect } from 'react';
import { 
  Award, BarChart3, TrendingUp, AlertTriangle, Package2, 
  RefreshCw, Plus, Minus, Tag, BookOpen, DollarSign, 
  Receipt, ShoppingBag, PlusCircle, FolderPlus, Users, UserPlus,
  LayoutGrid
} from 'lucide-react';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return `${window.location.origin}/api`;
};
const API_URL = getApiUrl();

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    today: { totalSales: 0, transactionsCount: 0 },
    weeklyTopDishes: []
  });
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  // Navegación interna
  const [activeSubTab, setActiveSubTab] = useState('metrics'); // metrics, inventory, menu
  const [adminMessage, setAdminMessage] = useState(null);

  // Estados para nuevo insumo
  const [ingName, setIngName] = useState('');
  const [ingStock, setIngStock] = useState('');
  const [ingUnit, setIngUnit] = useState('kg');
  const [ingMinStock, setIngMinStock] = useState('');

  // Estados para nuevo platillo
  const [dishName, setDishName] = useState('');
  const [dishDesc, setDishDesc] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishCat, setDishCat] = useState('Entradas');
  const [dishRecipe, setDishRecipe] = useState({}); // { ingredientId: quantity }

  // Estado para ajustar stock de insumos existentes
  const [adjustingStockMap, setAdjustingStockMap] = useState({}); // { ingredientId: amount }

  // Nuevos estados para Personal y Mesas (Admin)
  const [staffList, setStaffList] = useState([]);
  const [tablesList, setTablesList] = useState([]);
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('Mesero');
  const [tableNumber, setTableNumber] = useState('');
  const [tableCapacity, setTableCapacity] = useState('');

  const fetchStaffAndTables = async () => {
    try {
      const token = localStorage.getItem('token');
      // Obtener mesas
      const tablesRes = await fetch(`${API_URL}/tables`);
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTablesList(tablesData);
      }
      
      // Obtener personal
      const staffRes = await fetch(`${API_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        }
      });
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffList(staffData);
      }
    } catch (err) {
      console.warn('Error al obtener personal y mesas. Usando mock fallbacks.');
      setTablesList([
        { _id: 't1', number: 1, capacity: 4, status: 'libre' },
        { _id: 't2', number: 2, capacity: 2, status: 'libre' },
        { _id: 't3', number: 3, capacity: 6, status: 'ocupada' }
      ]);
      setStaffList([
        { _id: 'u1', name: 'Administrador POS', username: 'admin', role: 'Admin' },
        { _id: 'u2', name: 'Mesero de Turno', username: 'mesero', role: 'Mesero' }
      ]);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const statsResponse = await fetch(`${API_URL}/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        }
      });
      
      const ingResponse = await fetch(`${API_URL}/ingredients`);

      if (statsResponse.ok && ingResponse.ok) {
        const statsData = await statsResponse.json();
        const ingData = await ingResponse.json();
        setStats(statsData);
        setIngredients(ingData);
        setUsingMock(false);
      } else {
        throw new Error('Servidor offline');
      }
    } catch (error) {
      console.warn('Usando datos de simulación:', error.message);
      setUsingMock(true);
      setStats({
        today: { totalSales: 1680, transactionsCount: 8 },
        weeklyTopDishes: [
          { name: 'Ceviche de Camarón', quantitySold: 34, category: 'Entradas', price: 180 },
          { name: 'Pulpo a las Brasas', quantitySold: 21, category: 'Especialidades', price: 280 },
          { name: 'Michelada de la Casa', quantitySold: 18, category: 'Bebidas', price: 95 }
        ]
      });
      setIngredients([
        { _id: 'ing1', name: 'Camarón', stock: 12.4, unit: 'kg', minStock: 5 },
        { _id: 'ing2', name: 'Pulpo', stock: 2.1, unit: 'kg', minStock: 3 },
        { _id: 'ing3', name: 'Limón', stock: 8.5, unit: 'kg', minStock: 2 },
        { _id: 'ing4', name: 'Cerveza', stock: 45, unit: 'pieza', minStock: 10 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch(`${API_URL}/menu`);
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data);
      }
    } catch (error) {
      console.error('Error al obtener menú:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchMenuItems();
    fetchStaffAndTables();
  }, []);

  // Agregar nuevo insumo
  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!ingName || ingStock === '' || !ingUnit) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        },
        body: JSON.stringify({
          name: ingName,
          stock: Number(ingStock),
          unit: ingUnit,
          minStock: Number(ingMinStock || 0)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAdminMessage({ type: 'success', text: `Insumo "${ingName}" agregado correctamente.` });
        setIngName('');
        setIngStock('');
        setIngMinStock('');
        fetchDashboardData();
        setTimeout(() => setAdminMessage(null), 3000);
      } else {
        setAdminMessage({ type: 'error', text: data.message || 'Error al agregar el insumo.' });
      }
    } catch (error) {
      console.error('Error al agregar insumo:', error);
      setAdminMessage({ type: 'error', text: 'Error de conexión.' });
    }
  };

  // Agregar nuevo personal/mesero
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffUsername || !staffPassword || !staffRole) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        },
        body: JSON.stringify({
          name: staffName,
          username: staffUsername,
          password: staffPassword,
          role: staffRole
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAdminMessage({ type: 'success', text: `Usuario "${staffName}" (${staffRole}) registrado correctamente.` });
        setStaffName('');
        setStaffUsername('');
        setStaffPassword('');
        setStaffRole('Mesero');
        fetchStaffAndTables();
        setTimeout(() => setAdminMessage(null), 3000);
      } else {
        setAdminMessage({ type: 'error', text: data.message || 'Error al registrar al usuario.' });
      }
    } catch (error) {
      console.error('Error al registrar personal:', error);
      setAdminMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    }
  };

  // Agregar nueva mesa
  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!tableNumber || !tableCapacity) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        },
        body: JSON.stringify({
          number: Number(tableNumber),
          capacity: Number(tableCapacity)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAdminMessage({ type: 'success', text: `Mesa número ${tableNumber} creada con éxito.` });
        setTableNumber('');
        setTableCapacity('');
        fetchStaffAndTables();
        setTimeout(() => setAdminMessage(null), 3000);
      } else {
        setAdminMessage({ type: 'error', text: data.message || 'Error al crear la mesa.' });
      }
    } catch (error) {
      console.error('Error al crear mesa:', error);
      setAdminMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    }
  };

  // Ajustar stock (Entrada/Salida)
  const handleAdjustStock = async (ingredientId, isAdding) => {
    const qtyStr = adjustingStockMap[ingredientId];
    if (!qtyStr || isNaN(qtyStr)) return;
    
    const quantity = Number(qtyStr) * (isAdding ? 1 : -1);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/ingredients/${ingredientId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        },
        body: JSON.stringify({ quantity })
      });

      if (response.ok) {
        setAdminMessage({ type: 'success', text: 'Stock actualizado con éxito.' });
        setAdjustingStockMap(prev => ({ ...prev, [ingredientId]: '' }));
        fetchDashboardData();
        setTimeout(() => setAdminMessage(null), 3000);
      } else {
        const data = await response.json();
        setAdminMessage({ type: 'error', text: data.message || 'Error al ajustar stock.' });
      }
    } catch (error) {
      console.error('Error al ajustar stock:', error);
      setAdminMessage({ type: 'error', text: 'Error de conexión.' });
    }
  };

  // Agregar nuevo platillo al menú
  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    if (!dishName || dishPrice === '' || !dishCat) return;

    // Convertir receta a array [{ ingredient, quantity }]
    const ingredientsArray = Object.entries(dishRecipe)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([id, qty]) => ({
        ingredient: id,
        quantity: Number(qty)
      }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'placeholder_token'}`
        },
        body: JSON.stringify({
          name: dishName,
          description: dishDesc,
          price: Number(dishPrice),
          category: dishCat,
          ingredients: ingredientsArray
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAdminMessage({ type: 'success', text: `Platillo "${dishName}" agregado al menú con éxito.` });
        setDishName('');
        setDishDesc('');
        setDishPrice('');
        setDishRecipe({});
        fetchMenuItems();
        setTimeout(() => setAdminMessage(null), 3000);
      } else {
        setAdminMessage({ type: 'error', text: data.message || 'Error al agregar platillo.' });
      }
    } catch (error) {
      console.error('Error al agregar platillo:', error);
      setAdminMessage({ type: 'error', text: 'Error de conexión.' });
    }
  };

  const handleRecipeChange = (ingredientId, quantity) => {
    setDishRecipe(prev => ({
      ...prev,
      [ingredientId]: quantity
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      {/* Cabecera */}
      <div className="glass-panel rounded-3xl p-6 mb-6 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand-header">Panel de Administración</h2>
            <p className="text-brand-text/75 text-sm">Finanzas, control de inventario y configuración de recetas.</p>
          </div>
        </div>

        <button
          onClick={() => { fetchDashboardData(); fetchMenuItems(); fetchStaffAndTables(); }}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-brand-secondary/15 hover:bg-brand-secondary/25 text-brand-header transition duration-200 font-bold text-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar Datos
        </button>
      </div>

      {/* Sub-Tab de Navegación de Administrador */}
      <div className="flex gap-2 mb-6 bg-[#0B525B]/5 p-1.5 rounded-2xl border border-[#0B525B]/10 w-fit flex-wrap">
        <button
          onClick={() => { setActiveSubTab('metrics'); setAdminMessage(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'metrics'
              ? 'bg-[#E8912E] text-white shadow'
              : 'text-[#0B525B] hover:bg-white/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Métricas y Ventas
        </button>
        <button
          onClick={() => { setActiveSubTab('inventory'); setAdminMessage(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'inventory'
              ? 'bg-[#E8912E] text-white shadow'
              : 'text-[#0B525B] hover:bg-white/50'
          }`}
        >
          <Package2 className="w-4 h-4" />
          Inventario (Insumos)
        </button>
        <button
          onClick={() => { setActiveSubTab('menu'); setAdminMessage(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'menu'
              ? 'bg-[#E8912E] text-white shadow'
              : 'text-[#0B525B] hover:bg-white/50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Menú y Recetas
        </button>
        <button
          onClick={() => { setActiveSubTab('management'); setAdminMessage(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'management'
              ? 'bg-[#E8912E] text-white shadow'
              : 'text-[#0B525B] hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4" />
          Personal y Mesas
        </button>
      </div>

      {/* Alertas de Administrador */}
      {adminMessage && (
        <div className={`mb-6 p-4 rounded-xl text-xs font-bold text-center border ${
          adminMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          {adminMessage.text}
        </div>
      )}

      {/* VISTA 1: MÉTRICAS Y VENTAS */}
      {activeSubTab === 'metrics' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {/* Indicadores Financieros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-3xl p-6 shadow-md border-l-4 border-brand-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <TrendingUp className="w-32 h-32 text-brand-primary" />
              </div>
              <p className="text-sm text-brand-text/70 uppercase tracking-wider font-semibold">Ventas del Día</p>
              <p className="text-4xl md:text-5xl font-black text-brand-header mt-2 flex items-center gap-0.5">
                <DollarSign className="w-9 h-9 text-brand-primary" />
                {stats.today.totalSales.toFixed(2)}
              </p>
              <p className="text-xs text-brand-text/50 mt-1">Suma acumulada de cobros registrados hoy.</p>
            </div>

            <div className="glass-panel rounded-3xl p-6 shadow-md border-l-4 border-brand-secondary relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Receipt className="w-32 h-32 text-brand-secondary" />
              </div>
              <p className="text-sm text-brand-text/70 uppercase tracking-wider font-semibold">Transacciones Realizadas</p>
              <p className="text-4xl md:text-5xl font-black text-brand-header mt-2 flex items-center gap-1.5">
                <ShoppingBag className="w-8 h-8 text-brand-secondary" />
                {stats.today.transactionsCount} tickets
              </p>
              <p className="text-xs text-brand-text/50 mt-1">Número de comandas liquidadas con éxito hoy.</p>
            </div>
          </div>

          {/* Top 3 Platillos */}
          <div className="glass-panel rounded-3xl p-6 shadow-md max-w-2xl">
            <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-primary" />
              Top 3 Platillos Semanales
            </h3>

            <div className="flex flex-col gap-4">
              {stats.weeklyTopDishes.length === 0 ? (
                <p className="text-sm text-brand-text/60 text-center py-6">No hay suficientes comandas esta semana.</p>
              ) : (
                stats.weeklyTopDishes.map((dish, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/45 border border-brand-header/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-black text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-extrabold text-brand-header">{dish.name}</p>
                        <p className="text-xs text-brand-text/60 uppercase">{dish.category}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-brand-header block">{dish.quantitySold} pzs</span>
                      <span className="text-xs text-brand-text/50">Vendidos</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: INVENTARIO DE INSUMOS */}
      {activeSubTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
          {/* Listado de Insumos */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 shadow-md h-fit">
            <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
              <Package2 className="w-5 h-5 text-brand-secondary" />
              Control de Insumos Perecederos
            </h3>

            <div className="flex flex-col gap-4">
              {ingredients.length === 0 ? (
                <p className="text-sm text-brand-text/60 text-center py-6">No se encontraron insumos.</p>
              ) : (
                ingredients.map((ing) => {
                  const isLowStock = ing.stock <= ing.minStock;
                  return (
                    <div
                      key={ing._id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-2xl gap-4 transition ${
                        isLowStock ? 'bg-rose-50 border-rose-200' : 'bg-white/45 border-brand-header/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isLowStock ? (
                          <div className="p-2 rounded-xl bg-rose-100 text-rose-650 animate-pulse">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-650">
                            <Package2 className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-brand-header">{ing.name}</p>
                          <p className="text-xs text-brand-text/60">Stock Mínimo: {ing.minStock} {ing.unit}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right">
                          <span className={`text-lg font-black block ${isLowStock ? 'text-rose-650' : 'text-brand-header'}`}>
                            {ing.stock.toFixed(2)} {ing.unit}
                          </span>
                          {isLowStock && <span className="text-[10px] font-black uppercase text-rose-650 tracking-wider">Reordenar Ya</span>}
                        </div>

                        {/* Control de ajuste rápido de stock */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Cant"
                            value={adjustingStockMap[ing._id] || ''}
                            onChange={(e) => setAdjustingStockMap(prev => ({ ...prev, [ing._id]: e.target.value }))}
                            className="w-16 px-2 py-1.5 rounded-lg border border-brand-header/15 bg-white text-xs text-center font-bold"
                          />
                          <button
                            onClick={() => handleAdjustStock(ing._id, true)}
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-250 text-emerald-700 cursor-pointer"
                            title="Entrada de inventario"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(ing._id, false)}
                            className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-250 text-rose-700 cursor-pointer"
                            title="Merma o merma salida"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Formulario para Agregar Insumo */}
          <div className="glass-panel rounded-3xl p-6 shadow-md h-fit">
            <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-brand-primary" />
              Agregar Nuevo Insumo
            </h3>
            <form onSubmit={handleAddIngredient} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-brand-text/85 uppercase">Nombre del Insumo</label>
                <input
                  type="text"
                  placeholder="Ej: Camarón, Limón, Sal"
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-brand-text/85 uppercase">Stock Inicial</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 20"
                    value={ingStock}
                    onChange={(e) => setIngStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-brand-text/85 uppercase">Unidad</label>
                  <select
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold"
                  >
                    <option value="kg">kilogramo (kg)</option>
                    <option value="g">gramo (g)</option>
                    <option value="l">litro (l)</option>
                    <option value="ml">mililitro (ml)</option>
                    <option value="pieza">pieza</option>
                    <option value="manojo">manojo</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-brand-text/85 uppercase">Stock Mínimo (Alerta)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 5"
                  value={ingMinStock}
                  onChange={(e) => setIngMinStock(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold shadow cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Registrar Insumo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VISTA 3: MENÚ Y RECETAS */}
      {activeSubTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
          {/* Listado del Menú */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 shadow-md h-fit">
            <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-primary" />
              Carta de Platillos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.length === 0 ? (
                <p className="text-sm text-brand-text/60 text-center py-6 col-span-2">No hay platillos registrados.</p>
              ) : (
                menuItems.map((item) => (
                  <div key={item._id} className="p-4 bg-white/45 border border-brand-header/5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-extrabold text-brand-header text-sm">{item.name}</span>
                        <span className="text-sm font-black text-brand-primary">${item.price}</span>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#5CA8B5]/10 text-[#0B525B] text-[9px] font-black uppercase tracking-wider">
                        {item.category}
                      </span>
                      {item.description && (
                        <p className="text-[10px] text-brand-text/65 mt-2 leading-relaxed">{item.description}</p>
                      )}
                    </div>

                    {/* Mostrar Receta */}
                    {item.ingredients && item.ingredients.length > 0 && (
                      <div className="border-t border-brand-header/5 mt-3 pt-2">
                        <span className="text-[9px] font-black text-brand-text/50 uppercase block">Receta Estándar:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {item.ingredients.map((ingItem, idx) => (
                            <span key={idx} className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {ingItem.ingredient?.name}: {ingItem.quantity} {ingItem.ingredient?.unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulario para Agregar Platillo y Configurar Receta */}
          <div className="glass-panel rounded-3xl p-6 shadow-md h-fit">
            <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-brand-primary" />
              Agregar Platillo
            </h3>
            <form onSubmit={handleAddMenuItem} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-brand-text/85 uppercase">Nombre del Platillo</label>
                <input
                  type="text"
                  placeholder="Ej: Tostada de Pulpo, Filete Frito"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-brand-text/85 uppercase">Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 145"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-brand-text/85 uppercase">Categoría</label>
                  <select
                    value={dishCat}
                    onChange={(e) => setDishCat(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold"
                  >
                    <option value="Entradas">Entradas</option>
                    <option value="Cocteles">Cocteles</option>
                    <option value="Especialidades">Especialidades</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Postres">Postres</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-brand-text/85 uppercase">Descripción</label>
                <textarea
                  placeholder="Ej: Tostada de pulpo cocido con aguacate..."
                  value={dishDesc}
                  onChange={(e) => setDishDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold h-16 resize-none"
                />
              </div>

              {/* Sección de Receta / Componentes */}
              <div className="flex flex-col gap-2 border-t border-brand-header/10 pt-3">
                <span className="font-black text-brand-header uppercase tracking-wider block">Receta Estándar (Escandallo)</span>
                <span className="text-[10px] text-brand-text/60 -mt-1 block">Configura la cantidad de cada ingrediente deducida por venta.</span>

                <div className="max-h-40 overflow-y-auto flex flex-col gap-2 bg-white/40 p-2.5 rounded-xl border border-brand-header/10">
                  {ingredients.map((ing) => (
                    <div key={ing._id} className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-brand-text text-[11px] truncate w-24">{ing.name}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.00"
                          value={dishRecipe[ing._id] || ''}
                          onChange={(e) => handleRecipeChange(ing._id, e.target.value)}
                          className="w-16 px-1.5 py-1 rounded border border-brand-header/10 bg-white text-right text-xs"
                        />
                        <span className="text-[10px] text-brand-text/50 font-bold w-6">{ing.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold shadow cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Agregar Platillo al Menú
              </button>
            </form>
          </div>
        </div>
      )}
      {/* VISTA 4: PERSONAL Y MESAS */}
      {activeSubTab === 'management' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
          {/* SECCIÓN 1: GESTIÓN DE PERSONAL */}
          <div className="flex flex-col gap-6">
            {/* Formulario Agregar Personal */}
            <div className="glass-panel rounded-3xl p-6 shadow-md bg-white/50 border border-brand-header/10">
              <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-primary" />
                Registrar Nuevo Personal
              </h3>
              <form onSubmit={handleAddStaff} className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-brand-text/85 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold text-brand-header"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-brand-text/85 uppercase">Usuario de Acceso</label>
                    <input
                      type="text"
                      placeholder="Ej: juan.mesero"
                      value={staffUsername}
                      onChange={(e) => setStaffUsername(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold text-brand-header"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-brand-text/85 uppercase">Rol / Cargo</label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold text-brand-header"
                    >
                      <option value="Mesero">Mesero</option>
                      <option value="Cocina">Cocina / Barra</option>
                      <option value="Cajero">Cajero</option>
                      <option value="Gerente">Gerente</option>
                      <option value="Admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-brand-text/85 uppercase">Contraseña</label>
                  <input
                    type="password"
                    placeholder="Ingresa la contraseña temporal"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold text-brand-header"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-[#E8912E] hover:bg-[#E8912E]/90 text-white font-extrabold shadow cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrar Personal
                </button>
              </form>
            </div>

            {/* Listado de Personal Registrado */}
            <div className="glass-panel rounded-3xl p-6 shadow-md bg-white/50 border border-brand-header/10">
              <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-secondary" />
                Personal en el Sistema
              </h3>
              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                {staffList.length === 0 ? (
                  <p className="text-xs text-brand-text/50 text-center py-6">No hay personal registrado.</p>
                ) : (
                  staffList.map((emp) => (
                    <div key={emp._id} className="p-3 bg-white/60 border border-brand-header/5 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-extrabold text-brand-header">{emp.name}</p>
                        <p className="text-[10px] text-brand-text/60 font-medium">Usuario: @{emp.username}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        emp.role === 'Admin' || emp.role === 'Gerente'
                          ? 'bg-[#E8912E]/10 text-[#E8912E] border-[#E8912E]/25'
                          : emp.role === 'Cajero'
                          ? 'bg-[#5CA8B5]/10 text-[#0B525B] border-[#5CA8B5]/25'
                          : emp.role === 'Cocina'
                          ? 'bg-[#0B525B]/15 text-[#0B525B] border-[#0B525B]/25'
                          : 'bg-slate-105 text-slate-605 border-slate-250'
                      }`}>
                        {emp.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: GESTIÓN DE MESAS */}
          <div className="flex flex-col gap-6">
            {/* Formulario Agregar Mesa */}
            <div className="glass-panel rounded-3xl p-6 shadow-md bg-white/50 border border-brand-header/10">
              <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-brand-primary" />
                Crear Nueva Mesa
              </h3>
              <form onSubmit={handleAddTable} className="flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-brand-text/85 uppercase">Número de Mesa</label>
                    <input
                      type="number"
                      placeholder="Ej: 7"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold text-brand-header"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-brand-text/85 uppercase">Capacidad (Paxs)</label>
                    <input
                      type="number"
                      placeholder="Ej: 4"
                      value={tableCapacity}
                      onChange={(e) => setTableCapacity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-brand-header/15 bg-white font-bold text-brand-header"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold shadow cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  Crear Mesa
                </button>
              </form>
            </div>

            {/* Listado de Mesas del Salón */}
            <div className="glass-panel rounded-3xl p-6 shadow-md bg-white/50 border border-brand-header/10">
              <h3 className="text-lg font-black text-brand-header mb-6 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-brand-secondary" />
                Mesas en el Salón
              </h3>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {tablesList.length === 0 ? (
                  <p className="text-xs text-brand-text/50 text-center py-6 col-span-2">No hay mesas creadas.</p>
                ) : (
                  tablesList.map((tbl) => (
                    <div key={tbl._id || tbl.number} className="p-3 bg-white/60 border border-brand-header/5 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-extrabold text-brand-header">Mesa {tbl.number}</p>
                        <p className="text-[10px] text-brand-text/60 font-semibold">Capacidad: {tbl.capacity} paxs</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider shrink-0 ${
                        tbl.status === 'ocupada'
                          ? 'bg-rose-100 text-rose-700 border-rose-250'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-250'
                      }`}>
                        {tbl.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
