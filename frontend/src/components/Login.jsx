// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [correo, setcorreo] = useState('');
  const [contrasena_hash, setcontrasena_hash] = useState('');
  const [showcontrasena_hash, setShowcontrasena_hash] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena_hash })
      });
      const data = await response.json();
      
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || "Credenciales incorrectas");
      }
    } catch (err) {
      setError("Error de conexión: Asegúrate de que el servidor Flask esté activo en el puerto 5000.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb] p-6 font-sans">
      <div className="w-full max-w-[460px] bg-white p-12 rounded-[2.5rem] shadow-xl border border-white/60">
        <div className="flex items-center gap-3 mb-12">
          <div className="flex flex-col gap-1">
            <div className="w-9 h-2.5 bg-[#4CAF50] rounded-full transform -skew-x-12"></div>
            <div className="w-7 h-2.5 bg-[#4CAF50] rounded-full transform -skew-x-12 opacity-60"></div>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">GEOCHAT</h1>
        </div>

        <div className="mb-10 text-center">
          <h2 className="text-[32px] font-bold text-slate-900 mb-2 leading-tight">Login</h2>
          <p className="text-slate-500 text-sm font-medium px-4">
            Ingresa tus credenciales para administrar tus funnels.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Correo electrónico</label>
            <input 
              type="correo" 
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-[#6366f1] focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
              placeholder="correo@geochat.com"
              value={correo}
              onChange={(e) => setcorreo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Contraseña</label>
            <div className="relative">
              <input 
                type={showcontrasena_hash ? "text" : "password"} 
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-[#6366f1] focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                placeholder="••••••••"
                value={contrasena_hash}
                onChange={(e) => setcontrasena_hash(e.target.value)}
                required
              />
              <button 
                type="button"
                onClick={() => setShowcontrasena_hash(!showcontrasena_hash)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showcontrasena_hash ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 font-bold text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#6366f1] hover:bg-[#585ce5] text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98]"
          >
            {isLoading ? "Validando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;