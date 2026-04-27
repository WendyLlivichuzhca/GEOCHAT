import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Bell, CalendarDays, Copy, Check, MousePointerClick, RefreshCw, Smartphone, Monitor, Edit3 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const StatCard = ({ icon, label, value, color = 'emerald' }) => {
  const colors = {
    emerald: 'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]',
    indigo: 'bg-[#ecfdf5] text-[#0d9488] border-[#99f6e4]',
    violet: 'bg-[#ecfeff] text-[#0891b2] border-[#a5f3fc]',
    amber: 'bg-amber-50 text-amber-500 border-amber-200',
  };
  return (
    <div className="bg-white border border-[#d1fae5] rounded-2xl p-6 flex flex-col gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-[#134e4a] tracking-tight">{value}</p>
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
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/whalink/${id}/stats?user_id=${user.id}&range=${range}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'No se pudieron cargar las estadísticas.');
      setLink(data.link); setStats(data.stats);
    } catch (err) {
      console.error(err); setError(err.message || 'Error al cargar estadísticas.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); }, [user?.id, id, range]);

  const copyLink = async () => {
    if (!link?.short_url) return;
    try {
      await navigator.clipboard.writeText(link.short_url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex min-h-screen bg-[#f0fdf9] font-sans text-[#134e4a] selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[72px] bg-white border border-[#d1fae5] shadow-sm rounded-3xl flex items-center justify-between px-8 sticky top-0 z-50 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#ecfdf5] rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-[#a7f3d0] shrink-0">
              <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
              <span className="text-[10px] text-[#10b981] font-bold tracking-widest uppercase">Estadísticas Whalink</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={loadStats} className="text-[#9ca3af] hover:text-[#10b981] transition-colors" title="Actualizar">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <Bell size={18} className="text-[#9ca3af]" />
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10b981] to-[#0891b2] flex items-center justify-center text-[13px] font-black text-white">
              {user?.nombre?.charAt(0) || 'W'}
            </div>
          </div>
        </header>

        <section className="space-y-6 max-w-6xl mx-auto w-full pb-8">
          {/* Breadcrumb + título */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate('/whalink')}
                className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#10b981] hover:text-[#059669] transition-colors"
              >
                <ArrowLeft size={14} /> Volver a Whalinks
              </button>
              <h1 className="text-2xl font-black geopulse-text-gradient">{link?.nombre || 'Estadísticas del link'}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="rounded-xl bg-[#f0fdf9] border border-[#d1fae5] px-4 py-2 text-[13px] text-[#0891b2]">
                  {link?.short_url || 'Cargando...'}
                </code>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] px-4 py-2 text-[13px] font-bold text-[#6b7280] hover:text-[#10b981] hover:bg-[#ecfdf5] transition-all"
                >
                  {copied ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  onClick={() => navigate(`/whalink/${id}/editar`)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#10b981] to-[#0d9488] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 transition-all"
                >
                  <Edit3 size={14} /> Editar link
                </button>
              </div>
            </div>

            {/* Selector de rango */}
            <div className="inline-flex rounded-2xl bg-white border border-[#d1fae5] p-1 self-start">
              {[{ id: 'week', label: 'Semana' }, { id: 'month', label: 'Mes' }].map(item => (
                <button
                  key={item.id}
                  onClick={() => setRange(item.id)}
                  className={`rounded-xl px-5 py-2 text-[13px] font-bold transition-all ${range === item.id ? 'bg-gradient-to-r from-[#10b981] to-[#0d9488] text-white shadow-lg shadow-emerald-200' : 'text-[#6b7280] hover:text-[#134e4a]'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[13px] font-semibold text-red-600">
              {error}
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<MousePointerClick size={20} />} label="Clicks únicos" value={stats?.clicks_unicos ?? 0} color="emerald" />
            <StatCard icon={<BarChart3 size={20} />} label="Clicks totales" value={stats?.clicks_totales ?? 0} color="indigo" />
            <StatCard icon={<Smartphone size={20} />} label="Móvil" value={stats?.clicks_movil ?? 0} color="violet" />
            <StatCard icon={<Monitor size={20} />} label="PC / Desktop" value={stats?.clicks_pc ?? 0} color="amber" />
          </div>

          {/* Gráfico de actividad */}
          <div className="bg-white border border-[#d1fae5] rounded-[2rem] p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-black text-[#134e4a]">Actividad por fecha</h2>
                <p className="text-[13px] text-[#9ca3af] mt-1">Rango: {range === 'week' ? 'Última semana' : 'Último mes'}</p>
              </div>
              <CalendarDays size={22} className="text-[#10b981]" />
            </div>

            <div className="space-y-3">
              {(stats?.timeline || []).map(item => {
                const pct = Math.max(4, (Number(item.clicks || 0) / maxTimelineValue) * 100);
                return (
                  <div key={item.fecha} className="grid grid-cols-[110px_1fr_40px] items-center gap-4">
                    <span className="text-[12px] font-semibold text-[#9ca3af]">{item.fecha}</span>
                    <div className="h-2.5 rounded-full bg-[#f0fdf9] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#0891b2] transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-right text-[13px] font-black text-[#374151]">{item.clicks}</span>
                  </div>
                );
              })}
              {!loading && (!stats?.timeline || stats.timeline.length === 0) && (
                <div className="rounded-2xl bg-[#f0fdf9] py-14 text-center">
                  <MousePointerClick size={32} className="text-[#a7f3d0] mx-auto mb-3" />
                  <p className="text-[15px] font-bold text-[#6b7280]">Todavía no hay clics en este rango</p>
                  <p className="mt-1 text-[13px] text-[#9ca3af]">Cuando alguien abra el link, aparecerá aquí.</p>
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
