import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Bell, CalendarDays, Copy, MousePointerClick, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';
const StatCard = ({ icon, label, value, tone = 'indigo' }) => {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100'
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
        {icon}
      </div>
      <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
};

const WhalinkDetail = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [range, setRange] = useState('week');
  const [link, setLink] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const maxTimelineValue = useMemo(() => {
    const values = stats?.timeline?.map(item => Number(item.clicks || 0)) || [];
    return Math.max(1, ...values);
  }, [stats]);

  const loadStats = async () => {
    if (!user?.id || !id) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/whalink/${id}/stats?user_id=${user.id}&range=${range}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudieron cargar las estadÃ­sticas.');
      }

      setLink(data.link);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cargar estadÃ­sticas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user?.id, id, range]);

  const copyLink = async () => {
    if (!link?.short_url) return;

    try {
      await navigator.clipboard.writeText(link.short_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error(err);
      setError('No se pudo copiar el enlace.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] font-sans text-slate-800">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-20 lg:ml-24">
        <header className="h-14 bg-[#1e1e2d] text-white flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center">
              <BarChart3 size={15} />
            </div>
            <div>
              <p className="font-bold tracking-tight leading-none">EstadÃ­sticas Whalink</p>
              <p className="text-[10px] text-slate-400 mt-1">{link?.nombre || 'Detalle del link'}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={loadStats}
              className="text-slate-400 hover:text-white transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <Bell size={18} className="text-slate-400" />
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-[11px] font-bold">
              {user?.nombre?.charAt(0) || 'W'}
            </div>
          </div>
        </header>

        <section className="p-8 max-w-6xl mx-auto">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                onClick={() => navigate('/whalink')}
                className="mb-2 inline-flex items-center gap-1 text-[13px] font-bold text-indigo-600 hover:underline"
              >
                <ArrowLeft size={15} /> Volver a Whalinks
              </button>
              <h1 className="text-[26px] font-bold text-slate-900">{link?.nombre || 'EstadÃ­sticas del link'}</h1>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="rounded-lg bg-white px-3 py-2 text-[12px] text-indigo-700 shadow-sm ring-1 ring-slate-200">
                  {link?.short_url || 'Cargando link...'}
                </code>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-100 px-3 py-2 text-[12px] font-bold text-indigo-600 transition-all hover:bg-indigo-50"
                >
                  <Copy size={14} /> {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {[
                { id: 'week', label: 'Semana' },
                { id: 'month', label: 'Mes' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setRange(item.id)}
                  className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
                    range === item.id ? 'bg-[#5d5fef] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<MousePointerClick size={21} />} label="Clicks Ãºnicos" value={stats?.clicks_unicos || 0} tone="emerald" />
            <StatCard icon={<BarChart3 size={21} />} label="Clicks totales" value={stats?.clicks_totales || 0} />
            <StatCard icon={<Smartphone size={21} />} label="MÃ³vil" value={stats?.clicks_movil || 0} tone="slate" />
            <StatCard icon={<Monitor size={21} />} label="PC" value={stats?.clicks_pc || 0} tone="slate" />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-black text-slate-900">Actividad por fecha</h2>
                <p className="text-[13px] text-slate-400">Rango seleccionado: {range === 'week' ? 'Semana' : 'Mes'}</p>
              </div>
              <CalendarDays size={22} className="text-indigo-400" />
            </div>

            <div className="space-y-3">
              {(stats?.timeline || []).map(item => {
                const width = `${Math.max(8, (Number(item.clicks || 0) / maxTimelineValue) * 100)}%`;
                return (
                  <div key={item.fecha} className="grid grid-cols-[120px_1fr_42px] items-center gap-3">
                    <span className="text-[12px] font-semibold text-slate-500">{item.fecha}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[#5d5fef]" style={{ width }} />
                    </div>
                    <span className="text-right text-[12px] font-bold text-slate-700">{item.clicks}</span>
                  </div>
                );
              })}
              {!loading && (!stats?.timeline || stats.timeline.length === 0) && (
                <div className="rounded-xl bg-slate-50 py-10 text-center">
                  <p className="text-[14px] font-bold text-slate-700">TodavÃ­a no hay clics en este rango</p>
                  <p className="mt-1 text-[12px] text-slate-400">Cuando alguien abra el link corto, aparecerÃ¡ aquÃ­.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WhalinkDetail;
