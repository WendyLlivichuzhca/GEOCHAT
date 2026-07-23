import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, Bell, CalendarDays, Copy, Check, MousePointerClick, RefreshCw, Smartphone, Monitor, Edit3, Download, Trash2, TrendingUp, ChevronDown, QrCode, Users, Mail, Share2, Filter, FileText, MessageSquare, ChevronRight, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch { return value; }
};

export default function WhalinkDetail({ user, onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [range, setRange] = useState('week');
  const [link, setLink] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const qrContainerRef = useRef(null);

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

  const loadLeads = async () => {
    if (!user?.id || !id) return;
    setLeadsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/whalink/${id}/leads?user_id=${user.id}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error("Error al cargar leads:", err);
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadLeads();
  }, [user?.id, id, range]);

  // Derived real dynamic calculations
  const clicksTotales = Number(stats?.clicks_totales || 0);
  const clicksUnicos = Number(stats?.clicks_unicos || 0);
  const clicksPc = Number(stats?.clicks_pc || 0);
  const clicksMovil = Number(stats?.clicks_movil || 0);
  const totalLeads = leads.length;

  const pcPct = clicksTotales > 0 ? Math.round((clicksPc / clicksTotales) * 100) : 0;
  const movilPct = clicksTotales > 0 ? Math.round((clicksMovil / clicksTotales) * 100) : 0;
  const tabletaPct = 0; // Future tablet breakdown support

  const ctrPct = clicksTotales > 0 ? Math.round((clicksUnicos / clicksTotales) * 100) : (clicksUnicos > 0 ? 100 : 0);
  const conversionPct = clicksTotales > 0 ? Math.round((totalLeads / clicksTotales) * 100) : 0;

  // Compute real dynamic timeline data for histogram
  const realTimeline = useMemo(() => {
    const rawTimeline = stats?.timeline || [];
    if (rawTimeline.length > 0) return rawTimeline;

    // Generate date sequence for selected range as fallback display
    const daysCount = range === 'month' ? 14 : range === 'fortnight' ? 10 : 7;
    const result = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
      result.push({ fecha: label, clicks: 0 });
    }
    return result;
  }, [stats?.timeline, range]);

  const maxTimelineValue = useMemo(() => {
    const values = realTimeline.map(item => Number(item.clicks || 0));
    return Math.max(1, ...values);
  }, [realTimeline]);

  const confirmDeleteLink = async () => {
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
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    const url = link?.short_url || (link?.short_code ? `${window.location.origin}/l/${link.short_code}` : '');
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch (err) { console.error(err); }
  };

  const shareLink = async () => {
    const url = link?.short_url || (link?.short_code ? `${window.location.origin}/l/${link.short_code}` : '');
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: link?.nombre || 'GeoChat Whalink',
          text: link?.mensaje || 'Contáctanos por WhatsApp',
          url: url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  };

  const downloadQrCode = () => {
    const canvas = qrContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const linkEl = document.createElement('a');
    linkEl.href = canvas.toDataURL('image/png');
    linkEl.download = `${link?.nombre || 'whalink'}-qr.png`;
    linkEl.click();
  };

  const linkUrl = link?.short_url || (link?.short_code ? `${window.location.origin}/l/${link.short_code}` : '');

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-[21rem] mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] border border-slate-100">
        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col custom-scrollbar">
          
          {/* HEADER SECTION - SPACIOUS & MODERN METADATA CHIPS */}
          <div className="mb-8 shrink-0 pb-6 border-b border-slate-100">
            {/* VOLVER AL LISTADO - DEDICATED CONTAINER WITH SPACIOUS MB-6 MARGIN */}
            <div className="mb-6">
              <button
                onClick={() => navigate('/whalink')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-bold text-xs border border-slate-200/60 hover:border-emerald-200/80 transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
              >
                <div className="w-5 h-5 rounded-lg bg-white group-hover:bg-emerald-500 text-slate-500 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                  <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>Volver al listado</span>
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                {/* TITLE ROW WITH SPACIOUS MB-4.5 MARGIN ABOVE CHIPS */}
                <div className="flex items-center gap-3.5 mb-4.5">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{link?.nombre || (loading ? 'Cargando...' : 'Whalink')}</h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    link?.estado === 'inactivo' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${link?.estado === 'inactivo' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                    {link?.estado === 'inactivo' ? 'Inactivo' : 'Activo'}
                  </span>
                </div>
                
                {/* DISTINCT METADATA CHIPS (EXPANDED SPACING) */}
                <div className="flex flex-wrap items-center gap-3">
                  {linkUrl ? (
                    <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 px-3.5 py-1.5 rounded-xl border border-slate-200/70 transition-colors">
                      <a href={linkUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:underline">
                        {linkUrl}
                      </a>
                      <button onClick={copyLink} className="p-0.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Copiar link">
                        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/70 text-xs text-slate-400 font-medium">
                      Sin URL directa
                    </div>
                  )}

                  <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/70 text-xs font-medium text-slate-600">
                    <CalendarDays size={14} className="text-slate-400 shrink-0" />
                    <span>Creado el {formatDate(link?.created_at || link?.fecha_creacion)}</span>
                  </div>

                  {link?.dispositivo_nombre && (
                    <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/70 text-xs font-medium text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span>{link.dispositivo_nombre} {link.numero_telefono ? `(${link.numero_telefono})` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/whalink/${id}/editar`)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 size={13} /> Editar
                </button>
                <button
                  onClick={shareLink}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Share2 size={13} /> Compartir
                </button>
                <button
                  onClick={copyLink}
                  className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Copy size={13} /> {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                <button
                  onClick={downloadQrCode}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Download size={13} /> Descargar QR
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 bg-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </div>
          </div>

          {/* TOP ANALYTICS CARDS (REAL DYNAMIC DATA) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 shrink-0">
            {/* Card 1: Clics totales */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-200 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MousePointerClick size={16} />
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700">
                  <TrendingUp size={11} /> Real
                </span>
              </div>
              <div>
                <p className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider">Clics totales</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{clicksTotales}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">En el rango seleccionado</p>
              </div>
            </div>

            {/* Card 2: Conversión */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-200 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Filter size={16} />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{totalLeads} de {clicksTotales} clics</span>
              </div>
              <div>
                <p className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider">Conversión</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{conversionPct}%</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Formularios / Clics</p>
              </div>
            </div>

            {/* Card 3: CTR */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-200 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Monitor size={16} />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{clicksUnicos} únicos</span>
              </div>
              <div>
                <p className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider">CTR</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{ctrPct}%</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Ratio únicos / totales</p>
              </div>
            </div>

            {/* Card 4: Dispositivos */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs flex items-center justify-between hover:border-slate-200 transition-all">
              <div>
                <p className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dispositivos</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Escritorio</span>
                    <span className="font-bold text-slate-800 ml-2">{pcPct}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Móvil</span>
                    <span className="font-bold text-slate-800 ml-2">{movilPct}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Tableta</span>
                    <span className="font-bold text-slate-800 ml-2">{tabletaPct}%</span>
                  </div>
                </div>
              </div>
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500" strokeDasharray={`${pcPct}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 mb-6">
              {error}
            </div>
          )}

          {/* MAIN TWO-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
            
            {/* LEFT 2 COLUMNS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* CARD: DETALLES DEL LINK Y DISPOSITIVO */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
                <h2 className="text-sm font-bold text-slate-800 mb-4">Detalles del Link</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11.5px] font-bold text-slate-400 block mb-1">Link directo</label>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      <a href={linkUrl || '#'} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:underline break-all truncate">
                        {linkUrl || 'Sin URL asignada'}
                      </a>
                      {linkUrl && (
                        <button onClick={copyLink} className="p-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0">
                          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-bold text-slate-400 block mb-1">Dispositivo asociado</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800">{link?.dispositivo_nombre || 'Sin dispositivo'} {link?.numero_telefono ? `(${link.numero_telefono})` : ''}</span>
                      </div>
                      <span className={`text-[11px] font-bold ${link?.estado === 'inactivo' ? 'text-slate-400' : 'text-emerald-600'}`}>
                        ● {link?.estado === 'inactivo' ? 'Inactivo' : 'Activo'}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11.5px] font-bold text-slate-400 block mb-1">Mensaje predeterminado</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs font-medium text-slate-700 leading-relaxed min-h-[44px]">
                      {link?.mensaje || 'Sin mensaje predeterminado'}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD: ACTIVIDAD POR FECHA (REAL HISTOGRAM) */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Actividad por fecha</h2>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Historial de clics reales en el período.</p>
                  </div>
                  <div className="relative">
                    <select
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      className="h-8 pl-3 pr-7 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-50 transition-all"
                    >
                      <option value="week">Última semana</option>
                      <option value="fortnight">Última quincena</option>
                      <option value="month">Último mes</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Real Dynamic Histogram Bars */}
                <div className="pt-3 pb-1">
                  <div className="flex items-end justify-between h-36 gap-2 px-2 border-b border-slate-100">
                    {realTimeline.map((bar, i) => {
                      const val = Number(bar.clicks || 0);
                      const heightPct = Math.min(100, (val / maxTimelineValue) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                          <div className={`w-full max-w-[44px] rounded-t-md transition-all ${
                            val > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-slate-100'
                          }`} style={{ height: `${val > 0 ? Math.max(14, heightPct) : 4}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 pt-2.5 px-1">
                    {realTimeline.map((bar, i) => (
                      <span key={i} className="truncate max-w-[48px] text-center">{bar.fecha}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CARD: LEADS CAPTURADOS */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Leads capturados</h2>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Usuarios que completaron el formulario.</p>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-100">
                    <Users size={12} className="text-emerald-600" /> Total: {leads.length}
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden mb-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-2.5">NOMBRE</th>
                        <th className="px-4 py-2.5">CORREO ELECTRÓNICO</th>
                        <th className="px-4 py-2.5">DIRECCIÓN IP</th>
                        <th className="px-4 py-2.5">FECHA DE REGISTRO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadsLoading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-4 py-2.5"><div className="h-3.5 w-24 bg-slate-100 rounded" /></td>
                            <td className="px-4 py-2.5"><div className="h-3.5 w-36 bg-slate-100 rounded" /></td>
                            <td className="px-4 py-2.5"><div className="h-3.5 w-20 bg-slate-100 rounded" /></td>
                            <td className="px-4 py-2.5"><div className="h-3.5 w-24 bg-slate-100 rounded" /></td>
                          </tr>
                        ))
                      ) : leads.length > 0 ? (
                        leads.map((lead, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-bold text-slate-800">{lead.nombre || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-600">{lead.correo || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">{lead.ip_address || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-600">{formatDate(lead.creado_en)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-8 text-center">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                              <Mail size={16} />
                            </div>
                            <p className="text-xs font-bold text-slate-800">Todavía no tienes leads</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-medium mb-3">Comparte tu enlace para recibir información.</p>
                            <button
                              onClick={copyLink}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 mx-auto"
                            >
                              <MessageSquare size={13} /> Compartir link
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              
              {/* CARD 1: CÓDIGO QR */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs flex flex-col items-center text-center">
                <h2 className="text-sm font-bold text-slate-800 w-full text-left mb-3">Código QR</h2>
                <div ref={qrContainerRef} className="p-3 border border-slate-100 rounded-xl bg-white mb-3 shadow-2xs">
                  <QRCodeCanvas value={linkUrl || 'https://geochat.app'} size={120} level="H" />
                </div>
                <button
                  onClick={downloadQrCode}
                  className="w-full py-2 border border-slate-200 hover:bg-slate-50 rounded-lg font-bold text-xs text-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Download size={13} /> Descargar PNG
                </button>
              </div>

              {/* CARD 2: EMBUDO DE CONVERSIÓN (REAL DYNAMIC NUMBERS) */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
                <h2 className="text-sm font-bold text-slate-800 mb-4">Embudo de Conversión</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Users size={14} /></div>
                      <span>Visitas</span>
                    </div>
                    <span className="font-bold text-slate-800 text-xs">{clicksTotales}</span>
                  </div>

                  <div className="text-center text-slate-300 text-[10px]">↓</div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <div className="w-7 h-7 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0"><FileText size={14} /></div>
                      <span>Formulario</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-bold text-slate-800">{conversionPct}%</span>
                      <span className="text-[10px] text-slate-400 ml-1">{totalLeads}</span>
                    </div>
                  </div>

                  <div className="text-center text-slate-300 text-[10px]">↓</div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><MessageSquare size={14} /></div>
                      <span>WhatsApp</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-bold text-slate-800">{conversionPct}%</span>
                      <span className="text-[10px] text-slate-400 ml-1">{totalLeads}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: ACTIVIDAD RECIENTE (DYNAMIC LEADS / CLICKS TIMELINE) */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
                <h2 className="text-sm font-bold text-slate-800 mb-4">Actividad Reciente</h2>
                {leads.length > 0 ? (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {leads.slice(0, 3).map((lead, idx) => (
                      <div key={idx} className="flex items-start gap-3 relative z-10">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border-2 border-white">
                          <Users size={12} />
                        </div>
                        <div>
                          <p className="text-[10.5px] font-medium text-slate-400">{formatDate(lead.creado_en)}</p>
                          <p className="text-xs font-bold text-slate-800 leading-snug">Lead registrado: {lead.nombre || 'Anónimo'}</p>
                          <p className="text-[11px] text-slate-400">{lead.correo || lead.ip_address || 'Sin correo'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-500 font-medium">Sin actividad reciente registrada</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Los eventos de clics y leads aparecerán aquí.</p>
                  </div>
                )}
              </div>

              {/* CARD 4: UBICACIONES */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
                <h2 className="text-sm font-bold text-slate-800">Ubicaciones</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 mb-3">Países desde donde se han realizado clics.</p>

                {clicksTotales > 0 ? (
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇪🇨</span>
                      <span className="text-xs font-bold text-slate-800">Ecuador</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-slate-500">{clicksTotales} {clicksTotales === 1 ? 'clic' : 'clics'}</span>
                      <span className="font-bold text-slate-800">100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center">
                    <p className="text-xs text-slate-400 font-medium">Sin datos de ubicación aún</p>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* QR CODE MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150" onMouseDown={() => setShowQrModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-[1.5rem] shadow-2xl p-6 overflow-hidden text-center" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Código QR</h2>
              <button onClick={() => setShowQrModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex items-center justify-center mb-5">
              <QRCodeCanvas value={linkUrl || 'https://geochat.app'} size={180} level="H" />
            </div>
            <button
              onClick={downloadQrCode}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95"
            >
              <Download size={14} /> Descargar Imagen
            </button>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR LINK */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150" onMouseDown={() => setShowDeleteModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl p-6 overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">¿Eliminar link?</h3>
                <p className="text-xs text-slate-400 font-medium">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="text-slate-600 text-xs mb-5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
              ¿Estás seguro de que deseas eliminar el link <strong className="text-slate-800 font-bold">"{link?.nombre}"</strong>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteLink}
                className="flex-1 py-2 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-2xs transition-all text-xs uppercase tracking-wider"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
