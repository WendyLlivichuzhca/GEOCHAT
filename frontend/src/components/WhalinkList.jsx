import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckSquare, Copy, Download, Edit3, Filter, Link2, Plus, RefreshCw, Search, Square, Trash2, Upload, ExternalLink, TrendingUp, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SkeletonTableRow } from './Skeleton';

const API_URL = import.meta.env.VITE_API_URL || '';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch { return value; }
};

const normalizeText = (v) => String(v || '').toLowerCase().trim();

export default function WhalinkList({ user, onLogout }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const loadLinks = async () => {
    if (!user?.id) return;
    setLoading(true); setError(''); setNotice('');
    try {
      const res = await fetch(`${API_URL}/api/whalink/list?user_id=${user.id}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'No se pudieron cargar los links.');
      setLinks(data.links || []); setSelectedIds([]);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadLinks(); }, [user?.id]);

  const filteredLinks = useMemo(() => {
    const q = normalizeText(search);
    return links.filter(l => {
      const matchSearch = !q || [l.nombre, l.short_url, l.dispositivo_nombre].some(v => normalizeText(v).includes(q));
      const matchFilter = filter === 'todos' || (filter === 'con_clicks' && Number(l.total_clics || 0) > 0) || (filter === 'sin_clicks' && Number(l.total_clics || 0) === 0);
      return matchSearch && matchFilter;
    });
  }, [links, search, filter]);

  const allVisibleSelected = filteredLinks.length > 0 && filteredLinks.every(l => selectedIds.includes(l.id));
  const toggleAll = () => allVisibleSelected ? setSelectedIds(c => c.filter(id => !filteredLinks.some(l => l.id === id))) : setSelectedIds(c => Array.from(new Set([...c, ...filteredLinks.map(l => l.id)])));
  const toggleOne = (id) => setSelectedIds(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  const copyLink = async (link) => {
    if (!link?.short_url) return;
    await navigator.clipboard.writeText(link.short_url).catch(() => {});
    setCopiedId(link.id); setTimeout(() => setCopiedId(null), 1800);
  };

  const deleteLink = async (link) => {
    if (!window.confirm(`¿Eliminar "${link.nombre}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/whalink/${link.id}?user_id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await loadLinks(); setNotice('Link eliminado correctamente.');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const exportLinks = () => {
    const headers = ['nombre', 'short_url', 'dispositivo', 'clicks', 'creado'];
    const csv = [headers.join(','), ...filteredLinks.map(l => [l.nombre, l.short_url, l.dispositivo_nombre, l.total_clics || 0, l.created_at].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'whalinks.csv'; a.click();
  };

  // Calcular totales para las stat cards
  const totalClicks = links.reduce((s, l) => s + Number(l.total_clics || 0), 0);
  const activeLinks = links.filter(l => Number(l.total_clics || 0) > 0).length;

  return (
    <div className="flex min-h-screen bg-[#f0fdf9] font-sans text-[#134e4a] selection:bg-emerald-200/50">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0 gap-6">

        {/* ── HEADER ── */}
        <header className="h-[72px] bg-white rounded-3xl border border-[#d1fae5] shadow-sm flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#ecfdf5] rounded-2xl p-2.5 w-11 h-11 flex items-center justify-center border border-[#a7f3d0]">
              <Link2 size={20} className="text-[#10b981]" />
            </div>
            <div>
              <h2 className="text-[18px] font-black tracking-tight text-[#134e4a] leading-none">Whalink</h2>
              <p className="text-[11px] text-[#10b981] font-bold tracking-widest uppercase mt-0.5">Links de WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={loadLinks} className="h-9 w-9 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] flex items-center justify-center text-[#9ca3af] hover:text-[#10b981] transition-colors">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <Bell size={18} className="text-[#9ca3af]" />
            <div className="flex items-center gap-3 border-l border-[#d1fae5] pl-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#10b981] to-[#0891b2] flex items-center justify-center text-sm font-black text-white">{user?.nombre?.charAt(0) || 'W'}</div>
              <div className="hidden sm:block">
                <p className="text-[13px] font-bold text-[#134e4a] leading-none">{user?.nombre || 'Wendy'}</p>
                <p className="text-[10px] text-[#9ca3af] mt-0.5 uppercase tracking-wide">{user?.rol || 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-3 gap-4 shrink-0">
          {[
            { label: 'Links creados', value: links.length, icon: <Globe size={18}/>, color: 'from-[#10b981] to-[#0d9488]', glow: 'shadow-emerald-200' },
            { label: 'Clicks totales', value: totalClicks, icon: <TrendingUp size={18}/>, color: 'from-[#0891b2] to-[#0e7490]', glow: 'shadow-cyan-200' },
            { label: 'Links activos', value: activeLinks, icon: <Zap size={18}/>, color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-200' },
          ].map(card => (
            <div key={card.label} className="bg-white border border-[#d1fae5] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg ${card.glow} shrink-0`}>
                {card.icon}
              </div>
              <div>
                <p className="text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">{card.label}</p>
                <p className="text-[28px] font-black text-[#134e4a] leading-tight tracking-tight">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── PANEL PRINCIPAL ── */}
        <div className="bg-white border border-[#d1fae5] rounded-[2rem] shadow-sm flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="p-6 border-b border-[#d1fae5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Buscador */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o URL…"
                  className="h-10 w-[280px] rounded-xl bg-[#f0fdf9] border border-[#d1fae5] pl-9 pr-4 text-[13px] text-[#134e4a] placeholder:text-[#9ca3af] outline-none focus:border-[#10b981] focus:ring-1 focus:ring-emerald-100 transition-all"
                />
              </div>
              {/* Filtro */}
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-10 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] px-4 text-[13px] text-[#374151] outline-none cursor-pointer hover:bg-[#ecfdf5] transition-all"
              >
                <option value="todos">Todos</option>
                <option value="con_clicks">Con clicks</option>
                <option value="sin_clicks">Sin clicks</option>
              </select>
              {search && (
                <button onClick={() => setSearch('')} className="text-[12px] text-[#10b981] hover:text-[#059669] font-bold transition-colors">Limpiar</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" />
              <button onClick={exportLinks} className="h-10 px-4 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-[13px] font-bold text-[#6b7280] hover:text-[#134e4a] hover:bg-[#ecfdf5] flex items-center gap-2 transition-all">
                <Download size={14} /> Exportar
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="h-10 px-4 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-[13px] font-bold text-[#6b7280] hover:text-[#134e4a] hover:bg-[#ecfdf5] flex items-center gap-2 transition-all">
                <Upload size={14} /> Importar
              </button>
              <button onClick={() => navigate('/whalink/crear')} className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#0d9488] hover:opacity-90 text-white text-[13px] font-black flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95">
                <Plus size={16} strokeWidth={3} /> Crear link
              </button>
            </div>
          </div>

          {/* Mensajes */}
          {(error || notice) && (
            <div className={`mx-6 mt-4 rounded-xl px-5 py-3 text-[13px] font-semibold border ${error ? 'bg-red-50 border-red-200 text-red-600' : 'bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]'}`}>
              {error || notice}
            </div>
          )}

          {/* Tabla */}
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#d1fae5]">
                  <th className="w-12 py-4 px-5">
                    <button onClick={toggleAll} className="flex items-center justify-center text-[#9ca3af] hover:text-[#10b981] transition-colors">
                      {allVisibleSelected ? <CheckSquare size={18} className="text-[#10b981]" /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="px-3 py-4 text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">Nombre</th>
                  <th className="px-3 py-4 text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">Link</th>
                  <th className="px-3 py-4 text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">Dispositivo</th>
                  <th className="px-3 py-4 text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">Clicks</th>
                  <th className="px-3 py-4 text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">Creado</th>
                  <th className="px-5 py-4 text-[11px] font-black text-[#9ca3af] uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0fdf9]">
                {loading && links.length === 0 && (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}
                  </>
                )}
                {!loading && filteredLinks.length === 0 && (
                  <tr><td colSpan="7" className="py-20 text-center">
                    <Globe size={36} className="text-[#a7f3d0] mx-auto mb-3" />
                    <p className="text-[#6b7280] font-bold text-[15px]">No hay links todavía</p>
                    <p className="text-[#9ca3af] text-[13px] mt-1">Crea tu primer Whalink para empezar</p>
                    <button onClick={() => navigate('/whalink/crear')} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#10b981] to-[#0d9488] text-white text-[13px] font-bold rounded-xl transition-all">
                      <Plus size={14} /> Crear link
                    </button>
                  </td></tr>
                )}
                {filteredLinks.map(link => {
                  const sel = selectedIds.includes(link.id);
                  const linkUrl = link.short_url || link.whalink || '';
                  const clicks = Number(link.total_clics || 0);
                  return (
                    <tr key={link.id} className={`group transition-colors hover:bg-[#f9fffe] ${sel ? 'bg-[#ecfdf5]' : ''}`}>
                      <td className="py-4 px-5">
                        <button onClick={() => toggleOne(link.id)} className={`flex items-center justify-center transition-all ${sel ? 'text-[#10b981]' : 'text-[#9ca3af] hover:text-[#10b981]'}`}>
                          {sel ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      {/* Nombre */}
                      <td className="px-3 py-4">
                        <p className="font-bold text-[#134e4a] text-[14px] group-hover:text-[#10b981] transition-colors">{link.nombre}</p>
                      </td>
                      {/* Link */}
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[#0891b2] truncate max-w-[180px]">{linkUrl}</span>
                          <button
                            onClick={() => copyLink(link)}
                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${copiedId === link.id ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#f0fdf9] text-[#9ca3af] hover:bg-[#ecfdf5] hover:text-[#10b981]'}`}
                            title="Copiar link"
                          >
                            <Copy size={12} />
                          </button>
                          {linkUrl && (
                            <a href={linkUrl} target="_blank" rel="noreferrer" className="h-7 w-7 rounded-lg bg-[#f0fdf9] flex items-center justify-center text-[#9ca3af] hover:text-[#10b981] hover:bg-[#ecfdf5] transition-all shrink-0">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      {/* Dispositivo */}
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
                          <span className="text-[13px] text-[#374151]">
                            {link.dispositivo_nombre || 'S/D'}
                            {link.numero_telefono ? ` (${String(link.numero_telefono).slice(-4)})` : ''}
                          </span>
                        </div>
                      </td>
                      {/* Clicks */}
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-bold ${clicks > 0 ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]' : 'bg-[#f3f4f6] text-[#9ca3af] border border-[#e5e7eb]'}`}>
                          {clicks > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />}
                          {clicks} clics
                        </span>
                      </td>
                      {/* Fecha */}
                      <td className="px-3 py-4 text-[12px] text-[#9ca3af]">{formatDate(link.created_at)}</td>
                      {/* Acciones */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/whalink/${link.id}`)} className="h-8 w-8 rounded-lg bg-[#f0fdf9] border border-[#d1fae5] flex items-center justify-center text-[#9ca3af] hover:text-[#10b981] hover:bg-[#ecfdf5] transition-all" title="Ver estadísticas">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          </button>
                          <button onClick={() => navigate(`/whalink/${link.id}/editar`)} className="h-8 w-8 rounded-lg bg-[#f0fdf9] border border-[#d1fae5] flex items-center justify-center text-[#9ca3af] hover:text-amber-500 hover:bg-amber-50 transition-all" title="Editar">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => deleteLink(link)} className="h-8 w-8 rounded-lg bg-[#f0fdf9] border border-[#d1fae5] flex items-center justify-center text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-all" title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#d1fae5] bg-[#f9fffe] flex items-center justify-between shrink-0">
            <p className="text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">
              Mostrando <span className="text-[#374151]">{filteredLinks.length}</span> de <span className="text-[#374151]">{links.length}</span> registros
              {selectedIds.length > 0 && <span className="ml-3 text-[#10b981]">· {selectedIds.length} seleccionados</span>}
            </p>
            <div className="flex items-center gap-2">
              <button className="h-8 px-4 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-[11px] font-black text-[#6b7280] uppercase tracking-widest hover:text-[#10b981] hover:bg-[#ecfdf5] transition-all">Anterior</button>
              <button className="h-8 px-4 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-[11px] font-black text-[#6b7280] uppercase tracking-widest hover:text-[#10b981] hover:bg-[#ecfdf5] transition-all">Siguiente</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
