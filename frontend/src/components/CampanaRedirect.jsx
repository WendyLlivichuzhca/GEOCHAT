import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Users } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CampanaRedirect() {
  const { shortCode } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRedirect = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/campana/${shortCode}`);
        const result = await response.json();
        if (response.ok && result.success && result.invite_link) {
          // Redirigir al link de invitación del grupo de WhatsApp
          window.location.href = result.invite_link;
        } else {
          setError(result.message || 'No se pudo encontrar un grupo activo para esta campaña.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error en redirección de campaña:', err);
        setError('Error de conexión. Por favor, verifica tu internet e inténtalo de nuevo.');
        setLoading(false);
      }
    };

    if (shortCode) {
      fetchRedirect();
    } else {
      setError('Enlace inválido o incompleto.');
      setLoading(false);
    }
  }, [shortCode]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-tr from-[#f8fafc] to-[#f1f5f9] font-sans p-6 text-slate-800">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-2xl shadow-slate-200/50 backdrop-blur-md">
        {loading ? (
          <div className="flex flex-col items-center gap-5">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Users size={36} className="animate-pulse" />
              <div className="absolute inset-0 rounded-2xl border border-indigo-200 animate-ping opacity-30" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#1e1b4b]">Conectando al grupo</h2>
              <p className="mt-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">Espera un momento</p>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 rounded-full bg-indigo-50/50 px-4 py-2 text-sm font-semibold text-indigo-700">
              <Loader2 size={16} className="animate-spin" />
              Buscando grupo disponible...
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-lg font-black text-rose-950">Acceso no disponible</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-bold text-white hover:opacity-90 transition-all shadow-sm"
            >
              Reintentar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
