import React, { useEffect, useState } from 'react';
import { ArrowLeft, Megaphone, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const API_URL = import.meta.env.VITE_API_URL || '';

const DifusionSistema = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [planId, setPlanId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const getToken = () => user?.token || localStorage.getItem('token') || localStorage.getItem('jwt_token') || '';

  const loadPlanes = () => {
    setLoadingPlanes(true);
    const token = getToken();
    fetch(`${API_URL}/api/admin/notificaciones/planes`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPlanes(data.planes || []);
      })
      .catch(() => {})
      .finally(() => setLoadingPlanes(false));
  };

  useEffect(() => {
    if (user?.rol !== 'superadmin') {
      navigate('/');
      return;
    }
    loadPlanes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnviar = async () => {
    if (!mensaje.trim()) {
      setError('Escribe el mensaje que quieres difundir.');
      return;
    }
    setError('');
    setResultado(null);
    setEnviando(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/notificaciones/difusion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mensaje: mensaje.trim(), plan_id: planId || null }),
      });
      const data = await res.json();
      if (data.success) {
        setResultado(data);
        setMensaje('');
      } else {
        setError(data.message || 'No se pudo enviar la difusión.');
      }
    } catch (err) {
      setError('Error de conexión al enviar la difusión.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-20 flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={onLogout} title="GeoChat" onRefresh={loadPlanes} isLoading={loadingPlanes} />

        <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
            <div className="flex-1 overflow-y-auto px-8 py-7 max-w-2xl">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft size={15} />
                Regresar
              </button>

              <div className="flex items-center gap-2 mb-1">
                <Megaphone size={22} className="text-emerald-600" />
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
                  Difusión a clientes
                </h1>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                Envía un aviso por WhatsApp (desde el número de sistema de GeoChat) a todos tus clientes de un plan,
                o a todos en general. Úsalo para anunciar funciones nuevas u otros comunicados importantes.
              </p>

              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Destinatarios</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full mb-5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="">Todos los planes (todos los clientes activos)</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>Solo clientes con plan: {p.nombre}</option>
                ))}
              </select>

              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mensaje</label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={6}
                placeholder="Ej: 🎉 ¡Nueva función en GeoChat! Ya puedes..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />

              {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              {resultado && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                  {resultado.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleEnviar}
                disabled={enviando}
                className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-[0_3px_12px_-2px_rgba(16,185,129,0.45)] hover:bg-emerald-600 transition disabled:opacity-60"
              >
                <Send size={16} />
                {enviando ? 'Enviando...' : 'Enviar difusión'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DifusionSistema;
