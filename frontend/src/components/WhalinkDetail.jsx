import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, Bell, CalendarDays, Copy, Check, MousePointerClick, RefreshCw, Smartphone, Monitor, Edit3, Download, Trash2, TrendingUp, ChevronDown, QrCode } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch { return value; }
};

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
  const [showQrModal, setShowQrModal] = useState(false);
  const qrContainerRef = useRef(null);

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

  const deleteLink = async () => {
    if (!window.confirm('¿Eliminar este Whalink?')) return;
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/whalink/${id}?user_id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'No se pudo eliminar el link.');
      navigate('/whalink');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al eliminar el link.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!link?.short_url) return;
    try {
      await navigator.clipboard.writeText(link.short_url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch (err) { console.error(err); }
  };

  const downloadQrCode = () => {
    const canvas = qrContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const linkEl = document.createElement('a');
    linkEl.href = canvas.toDataURL('image/png');
    linkEl.download = `${link?.nombre || 'whalink'}-qr.png`;
    linkEl.click();
  };

  return (
    <div className="flex min-h-screen bg-[#f0fdf9] font-sans text-[#134e4a] selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0">
        <div className="flex-1 flex flex-col pb-8">
          <div className="flex flex-col gap-1 px-2 mb-6">
            <button
              onClick={() => navigate('/whalink')}
              className="flex items-center gap-2 text-[13px] font-bold text-[#6366f1] hover:opacity-80 transition-opacity mb-1"
            >
              <ArrowLeft size={14} /> Regresar al listado
            </button>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="text-3xl font-black text-[#134e4a]">{link?.nombre || 'Detalle del Link'}</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={deleteLink}
                  className="h-10 px-6 rounded-xl border border-[#cbd5e1] text-[14px] font-bold text-[#475569] hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => navigate(`/whalink/${id}/editar`)}
                  className="h-10 px-6 rounded-xl bg-[#6366f1] text-white text-[14px] font-bold hover:opacity-90 transition-all shadow-md shadow-indigo-100"
                >
                  Editar link
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#d1fae5] rounded-[2rem] shadow-sm p-8 lg:p-12 flex-1 flex flex-col">

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              {/* Clicks únicos */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#64748b]">
                      <MousePointerClick size={20} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#64748b]">Clicks únicos</p>
                      <p className="text-2xl font-black text-[#1e293b]">{stats?.clicks_unicos ?? 0}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#10b981]">
                    <TrendingUp size={14} /> 0 Aumento
                  </div>
                  <div className="relative">
                    <select
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      className="h-9 pl-3 pr-8 rounded-lg bg-white border border-[#e2e8f0] text-[12px] font-bold text-[#475569] outline-none appearance-none cursor-pointer"
                    >
                      <option value="week">Semana</option>
                      <option value="fortnight">Quincena</option>
                      <option value="month">Mes</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Clicks totales */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#64748b]">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#64748b]">Clicks totales</p>
                      <p className="text-2xl font-black text-[#1e293b]">{stats?.clicks_totales ?? 0}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#10b981]">
                    <TrendingUp size={14} /> 0 Aumento
                  </div>
                  <div className="relative">
                    <select
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      className="h-9 pl-3 pr-8 rounded-lg bg-white border border-[#e2e8f0] text-[12px] font-bold text-[#475569] outline-none appearance-none cursor-pointer"
                    >
                      <option value="week">Semana</option>
                      <option value="fortnight">Quincena</option>
                      <option value="month">Mes</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Clicks por dispositivo */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[12px] font-bold text-[#64748b]">Clicks por dispositivo</p>
                  <p className="text-[12px] font-bold text-[#94a3b8]">Total {stats?.clicks_totales ?? 0}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2 text-[#475569] font-medium">
                      <div className="w-2 h-2 rounded-full bg-[#10b981]" /> Escritorio
                    </div>
                    <span className="font-bold text-[#1e293b]">{stats?.clicks_pc ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2 text-[#475569] font-medium">
                      <div className="w-2 h-2 rounded-full bg-[#6366f1]" /> Móvil
                    </div>
                    <span className="font-bold text-[#1e293b]">{stats?.clicks_movil ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2 text-[#475569] font-medium">
                      <div className="w-2 h-2 rounded-full bg-[#ec4899]" /> Tableta
                    </div>
                    <span className="font-bold text-[#1e293b]">0</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 mb-10">
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black text-[#94a3b8] uppercase tracking-widest mb-3">Detalles del link</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[12px] font-bold text-[#64748b] block mb-1">Link directo</label>
                      <a href={link?.short_url} target="_blank" rel="noreferrer" className="text-[14px] font-bold text-[#6366f1] hover:underline break-all">
                        {link?.short_url}
                      </a>
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#64748b] block mb-1">Mensaje predeterminado</label>
                      <p className="text-[14px] font-medium text-[#475569] whitespace-pre-wrap leading-relaxed">{link?.mensaje || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-12">
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Código QR</p>
                    <div className="w-12 h-12 bg-white border border-[#e2e8f0] rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#f8fafc] hover:border-[#6366f1] transition-all group" onClick={() => setShowQrModal(true)}>
                      <QrCode size={22} className="text-[#6366f1] group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Dispositivo</p>
                    <div className="flex items-center gap-2 h-12">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <span className="text-[15px] font-bold text-[#1e293b]">{link?.dispositivo_nombre || 'S/D'} {link?.numero_telefono ? `(${String(link?.numero_telefono).slice(-4)})` : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-[13px] font-semibold text-red-600 mb-6">
                {error}
              </div>
            )}

            {/* Gráfico de actividad */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[2rem] p-8 shadow-inner flex-1">
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-black text-[#134e4a]">Actividad por fecha</h2>
                  <p className="text-[13px] text-[#9ca3af] mt-1">Rango: {range === 'week' ? 'Última semana' : 'Último mes'}</p>
                </div>
                <div className="inline-flex items-center gap-3 rounded-2xl bg-white border border-[#e2e8f0] p-3 text-[13px] text-[#0f766e]">
                  <CalendarDays size={18} className="text-[#10b981]" />
                  <span className="font-bold">{stats?.timeline?.length ? `${stats.timeline.length} días de datos` : 'Sin datos de actividad'}</span>
                </div>
              </div>

              <div className="space-y-4">
                {(stats?.timeline || []).map(item => {
                  const pct = Math.max(4, (Number(item.clicks || 0) / maxTimelineValue) * 100);
                  return (
                    <div key={item.fecha} className="grid grid-cols-[110px_1fr_40px] items-center gap-4">
                      <span className="text-[12px] font-bold text-[#94a3b8] uppercase">{item.fecha}</span>
                      <div className="h-3 rounded-full bg-white border border-[#e2e8f0] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#0891b2] transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-right text-[14px] font-black text-[#1e293b]">{item.clicks}</span>
                    </div>
                  );
                })}
                {!loading && (!stats?.timeline || stats.timeline.length === 0) && (
                  <div className="rounded-2xl bg-white/50 py-16 text-center border border-dashed border-[#e2e8f0]">
                    <MousePointerClick size={32} className="text-[#cbd5e1] mx-auto mb-3" />
                    <p className="text-[15px] font-bold text-[#64748b]">Todavía no hay clics en este rango</p>
                    <p className="mt-1 text-[13px] text-[#9ca3af]">Cuando alguien abra el link, aparecerá aquí.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-[#134e4a]">Descargar QR</h2>
                <p className="text-[13px] text-[#6b7280]">Escanea este código para abrir el link directo.</p>
              </div>
              <button onClick={() => setShowQrModal(false)} className="text-[#9ca3af] hover:text-[#10b981]">Cerrar</button>
            </div>
            <div ref={qrContainerRef} className="flex flex-col items-center gap-4 pb-4">
              <div className="rounded-3xl bg-[#f4f7fb] p-4">
                <QRCodeCanvas value={link?.short_url || ''} size={224} bgColor="#ffffff" fgColor="#0f766e" level="H" />
              </div>
              <p className="text-[12px] text-[#6b7280] text-center break-all">{link?.short_url}</p>
            </div>
            <button
              onClick={downloadQrCode}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6366f1] px-5 py-3 text-[14px] font-bold text-white hover:opacity-95 transition-all shadow-lg shadow-indigo-100"
            >
              <Download size={16} /> Descargar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhalinkDetail;
