import React, { useState } from 'react';
import { Compass, Lock, User, AlertCircle } from 'lucide-react';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return `http://${window.location.hostname}:5000/api`;
};
const API_URL = getApiUrl();

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e, customUser, customPass) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    const loginUser = customUser || username;
    const loginPass = customPass || password;

    if (!loginUser || !loginPass) {
      setError('Por favor, ingresa el usuario y contraseña.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Credenciales incorrectas.');
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      // Fallback local en caso de estar desconectado
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (roleUser, rolePass) => {
    setUsername(roleUser);
    setPassword(rolePass);
    handleLogin(null, roleUser, rolePass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F3E4D4]">
      {/* Círculos decorativos de fondo */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0B525B]/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#5CA8B5]/15 rounded-full blur-3xl" />

      <div className="glass-panel rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#0B525B]/10 relative">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-[#E8912E] rounded-2xl text-white shadow-lg mb-3">
            <Compass className="w-8 h-8 rotate-45" />
          </div>
          <h1 className="text-3xl font-black text-[#0B525B] uppercase tracking-wide">Tío Perro POS</h1>
          <p className="text-[#0B525B]/70 text-xs font-bold uppercase tracking-wider mt-1">Control de Acceso de Personal</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[#0B525B] uppercase">Usuario</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0B525B]/50">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#0B525B]/15 focus:border-[#E8912E] focus:outline-none bg-white text-[#0B525B] font-bold text-sm"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[#0B525B] uppercase">Contraseña</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0B525B]/50">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#0B525B]/15 focus:border-[#E8912E] focus:outline-none bg-white text-[#0B525B] font-bold text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#E8912E] hover:bg-[#E8912E]/90 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition duration-200 cursor-pointer active:scale-95 flex justify-center"
          >
            {loading ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Separador */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#0B525B]/15" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#F3E4D4] px-3 font-bold text-[#0B525B]/50">Ingreso Rápido de Demo</span>
          </div>
        </div>

        {/* Roles rápidos */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => quickLogin('mesero', 'mesero123')}
            className="p-2.5 rounded-lg border border-[#0B525B]/10 hover:border-[#0B525B]/25 bg-white text-[#0B525B] font-bold hover:bg-slate-50 cursor-pointer transition text-center"
          >
            Mesero
          </button>
          <button
            onClick={() => quickLogin('cocina', 'cocina123')}
            className="p-2.5 rounded-lg border border-[#0B525B]/10 hover:border-[#0B525B]/25 bg-white text-[#0B525B] font-bold hover:bg-slate-50 cursor-pointer transition text-center"
          >
            Cocina (Chef)
          </button>
          <button
            onClick={() => quickLogin('cajero', 'cajero123')}
            className="p-2.5 rounded-lg border border-[#0B525B]/10 hover:border-[#0B525B]/25 bg-white text-[#0B525B] font-bold hover:bg-slate-50 cursor-pointer transition text-center"
          >
            Cajero
          </button>
          <button
            onClick={() => quickLogin('admin', 'admin123')}
            className="p-2.5 rounded-lg border border-[#E8912E]/30 bg-[#E8912E]/5 hover:bg-[#E8912E]/10 text-[#0B525B] font-black cursor-pointer transition text-center"
          >
            Gerente / Admin
          </button>
        </div>
      </div>
    </div>
  );
}
