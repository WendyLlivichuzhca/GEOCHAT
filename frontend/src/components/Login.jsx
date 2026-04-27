// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import { Eye, EyeOff, Leaf } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const Login = ({ onLoginSuccess }) => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });
      const data = await response.json();

      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Credenciales incorrectas');
      }
    } catch {
      setError('Error de conexión: asegúrate de que el servidor Flask esté activo en el puerto 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0fdf9] p-6 font-sans relative overflow-hidden">

      {/* Blobs decorativos de fondo */}
      <div className="absolute top-[-8%] right-[-4%] w-[35%] h-[35%] bg-[#6ee7b7] opacity-20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-8%] left-[-4%] w-[30%] h-[30%] bg-[#0891b2] opacity-15 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[440px] bg-white p-10 rounded-[2rem] shadow-xl border border-[#d1fae5] relative z-10">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#0891b2] flex items-center justify-center shadow-md shadow-emerald-200">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-4 h-1.5 bg-white rounded-full" />
              <div className="w-3 h-1.5 bg-white/70 rounded-full" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-[#134e4a] tracking-tighter uppercase">GEOCHAT</h1>
        </div>

        {/* Encabezado */}
        <div className="mb-8">
          <h2 className="text-[28px] font-black text-[#134e4a] mb-1.5 leading-tight tracking-tight">Bienvenido</h2>
          <p className="text-[#6b7280] text-sm font-medium">
            Ingresa tus credenciales para administrar tus conversaciones.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#374151] ml-1 uppercase tracking-wider">Correo electrónico</label>
            <input
              type="email"
              className="w-full px-4 py-3.5 rounded-xl border border-[#d1fae5] bg-[#f9fffe] focus:border-[#10b981] focus:ring-3 focus:ring-emerald-50 outline-none transition-all text-[#134e4a] font-medium placeholder:text-[#9ca3af]"
              placeholder="correo@geochat.com"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              required
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#374151] ml-1 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-4 py-3.5 rounded-xl border border-[#d1fae5] bg-[#f9fffe] focus:border-[#10b981] focus:ring-3 focus:ring-emerald-50 outline-none transition-all text-[#134e4a] font-medium placeholder:text-[#9ca3af]"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#10b981] transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 font-bold text-center">
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#10b981] to-[#0d9488] hover:from-[#059669] hover:to-[#0f766e] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Validando...
              </span>
            ) : 'Iniciar sesión'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[10px] text-[#9ca3af] mt-7 font-medium">
          GeoCHAT · Plataforma de mensajería profesional
        </p>
      </div>
    </div>
  );
};

export default Login;
