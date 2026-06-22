import React, { useState } from 'react';
import TableMap from './components/TableMap';
import KitchenMonitor from './components/KitchenMonitor';
import CashierTerminal from './components/CashierTerminal';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import { Compass, LayoutGrid, ChefHat, DollarSign, BarChart3, LogOut } from 'lucide-react';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u.role === 'Cocina') return 'cocina';
      if (u.role === 'Cajero') return 'caja';
      if (u.role === 'Admin' || u.role === 'Gerente') return 'admin';
    }
    return 'mesero';
  });

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'Cocina') {
      setActiveTab('cocina');
    } else if (loggedInUser.role === 'Cajero') {
      setActiveTab('caja');
    } else if (loggedInUser.role === 'Admin' || loggedInUser.role === 'Gerente') {
      setActiveTab('admin');
    } else {
      setActiveTab('mesero');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('mesero');
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Comprobar visibilidad de pestañas según rol
  const showMeseroTab = ['Admin', 'Gerente', 'Cajero', 'Mesero'].includes(user.role);
  const showCocinaTab = ['Admin', 'Gerente', 'Cocina'].includes(user.role);
  const showCajeroTab = ['Admin', 'Gerente', 'Cajero'].includes(user.role);
  const showAdminTab = ['Admin', 'Gerente'].includes(user.role);

  return (
    <div className="min-h-screen bg-[#F3E4D4] flex flex-col font-sans">
      {/* Barra de Navegación Superior Premium */}
      <header className="bg-[#0B525B] text-[#F3E4D4] shadow-md z-40 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center py-2.5 md:py-4 gap-2 md:gap-4">
          {/* Logo / Identidad */}
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="p-2 bg-[#E8912E] rounded-xl text-white shadow-inner animate-pulse">
              <Compass className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <span className="text-xl font-black tracking-wide uppercase block">Tío Perro</span>
              <span className="text-[10px] font-bold tracking-widest text-[#5CA8B5] uppercase block -mt-1">Sistema POS & Cocina</span>
            </div>
          </div>

          {/* Menú de Roles y Perfil */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <nav className="flex items-center bg-[#073b42] rounded-2xl p-1 border border-white/5 flex-wrap justify-center">
              {showMeseroTab && (
                <button
                  onClick={() => setActiveTab('mesero')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'mesero'
                      ? 'bg-[#E8912E] text-white shadow'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Mesas / Mesero
                </button>
              )}

              {showCocinaTab && (
                <button
                  onClick={() => setActiveTab('cocina')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'cocina'
                      ? 'bg-[#E8912E] text-white shadow'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  Cocina
                </button>
              )}

              {showCajeroTab && (
                <button
                  onClick={() => setActiveTab('caja')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'caja'
                      ? 'bg-[#E8912E] text-white shadow'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Caja
                </button>
              )}

              {showAdminTab && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-[#E8912E] text-white shadow'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Admin
                </button>
              )}
            </nav>

            {/* Logout y perfil de usuario */}
            <div className="flex items-center gap-2.5 md:gap-3 bg-[#073b42] border border-white/5 px-2.5 py-1 md:py-1.5 rounded-xl md:rounded-2xl">
              <div className="text-right">
                <span className="text-xs font-black block leading-none">{user.name}</span>
                <span className="text-[9px] font-bold text-[#5CA8B5] uppercase leading-none block mt-1">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-xl bg-rose-650 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase cursor-pointer transition active:scale-95 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenedor Principal de la Vista Activa */}
      <main className="flex-1 py-8">
        {activeTab === 'mesero' && showMeseroTab && <TableMap />}
        {activeTab === 'cocina' && showCocinaTab && <KitchenMonitor />}
        {activeTab === 'caja' && showCajeroTab && <CashierTerminal />}
        {activeTab === 'admin' && showAdminTab && <AdminDashboard />}
      </main>

      {/* Pie de Página */}
      <footer className="py-3.5 md:py-6 border-t border-[#0B525B]/10 bg-white/20 text-center text-xs text-[#0B525B]/60 font-semibold mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          <span>&copy; 2026 Marisquería El Tío Perro POS. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
