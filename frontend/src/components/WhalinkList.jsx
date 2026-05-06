import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckSquare, Copy, Download, Edit3, Filter, Link2, Plus, RefreshCw, Search, Square, Trash2, Upload, ExternalLink, TrendingUp, Zap, Globe, X } from 'lucide-react';
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
  const [deviceFilter, setDeviceFilter] = useState('todos');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [devices, setDevices] = useState([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const filterRef = useRef(null);

  // Close filter popover on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterPanel(false);
      }
    };
    if (showFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPanel]);

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

  const loadDevices = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/dashboard/${user.id}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.dashboard?.dispositivos)) {
        setDevices(data.dashboard.dispositivos);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLinks();
    loadDevices();
  }, [user?.id]);

  const sortedLinks = useMemo(() => {
    const q = normalizeText(search);
    let result = links.filter(l => {
      const matchSearch = !q || [l.nombre, l.short_url, l.dispositivo_nombre].some(v => normalizeText(v).includes(q));
      const matchDevice = deviceFilter === 'todos' || String(l.device_id) === String(deviceFilter);
      return matchSearch && matchDevice;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [links, search, deviceFilter, sortConfig]);

  const paginatedLinks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedLinks.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedLinks, currentPage, itemsPerPage]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const allVisibleSelected = sortedLinks.length > 0 && sortedLinks.every(l => selectedIds.includes(l.id));
  const toggleAll = () => allVisibleSelected ? setSelectedIds(c => c.filter(id => !sortedLinks.some(l => l.id === id))) : setSelectedIds(c => Array.from(new Set([...c, ...sortedLinks.map(l => l.id)])));
  const toggleOne = (id) => setSelectedIds(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  const copyLink = async (link) => {
    if (!link?.short_url) return;
    await navigator.clipboard.writeText(link.short_url).catch(() => {});
    setCopiedId(link.id); setTimeout(() => setCopiedId(null), 1800);
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      const text = target?.result;
      if (!text || typeof text !== 'string') return;
      const delimiter = text.includes(';') && !text.includes(',') ? ';' : ',';
      const rows = text
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map(line => line.split(delimiter).map(cell => cell.trim()));

      if (rows.length < 2) return setError('Archivo CSV inválido o sin contenido.');

      const headers = rows[0].map(header => header.toLowerCase());
      const parsedRows = rows.slice(1).map(values => {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      }).filter(row => Object.values(row).some(value => value));

      if (!parsedRows.length) return setError('No se encontraron filas válidas en el archivo.');

      setLoading(true);
      setError(''); setNotice('');
      try {
        const res = await fetch(`${API_URL}/api/whalink/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, rows: parsedRows }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'No se pudieron importar los links.');
        await loadLinks();
        setNotice(data.message || 'Importación completada.');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const clearFilters = () => {
    setSearch('');
    setFilter('todos');
    setDeviceFilter('todos');
    setItemsPerPage(25);
    setCurrentPage(1);
    setShowFilterPanel(false);
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
    const csv = [headers.join(','), ...sortedLinks.map(l => [l.nombre, l.short_url, l.dispositivo_nombre, l.total_clics || 0, l.created_at].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'whalinks.csv'; a.click();
  };

  // Calcular totales para las stat cards
  const totalClicks = links.reduce((s, l) => s + Number(l.total_clics || 0), 0);
  const activeLinks = links.filter(l => Number(l.total_clics || 0) > 0).length;

  const getDeviceColor = (index) => {
    const colors = ['#ec4899', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];
    return colors[index % colors.length];
  };

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

        <div className="flex items-start justify-between px-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-[#134e4a]">Whalink</h1>
            <p className="text-[14px] text-[#64748b]">Links que dirigen a iniciar una conversación a tu número de WhatsApp con un mensaje predeterminado.</p>
          </div>
          <button 
            onClick={() => navigate('/whalink/crear')} 
            className="h-10 px-5 rounded-xl bg-[#6366f1] text-white text-[14px] font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} strokeWidth={3} /> Crear link
          </button>
        </div>

        {/* ── PANEL PRINCIPAL ── */}
        <div className="bg-white border border-[#d1fae5] rounded-[2rem] shadow-sm flex-1 flex flex-col overflow-visible">

          {/* Toolbar */}
          <div className="relative p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between overflow-visible">
            <div className="relative w-full lg:w-[320px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar por nombre"
                className="h-10 w-full rounded-xl bg-white border border-[#e2e8f0] pl-11 pr-4 text-[14px] text-[#334155] placeholder:text-[#94a3b8] outline-none focus:border-[#6366f1] transition-all"
              />
            </div>
            
            <div className="flex items-center gap-4 relative" ref={filterRef}>
              <button 
                onClick={clearFilters} 
                className="text-[13px] text-[#6366f1] font-semibold hover:opacity-80 transition-opacity"
              >
                Limpiar todos los filtros
              </button>

              <button 
                onClick={() => setShowFilterPanel(!showFilterPanel)} 
                className={`h-10 px-4 rounded-xl border transition-all flex items-center gap-2 text-[14px] font-semibold ${showFilterPanel ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#1e293b]' : 'bg-white border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc]'}`}
              >
                <Filter size={16} /> Filtrar
              </button>

              {showFilterPanel && (
                <div className="absolute top-full right-0 mt-2 w-[320px] bg-white border border-[#e2e8f0] rounded-[1.5rem] shadow-xl z-[100] p-5 animate-in fade-in zoom-in duration-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wide mb-2">Dispositivo</label>
                      <div className="space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                        <button
                          onClick={() => { setDeviceFilter('todos'); setCurrentPage(1); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-[14px] flex items-center gap-3 transition-all ${deviceFilter === 'todos' ? 'bg-[#f1f5f9] font-bold text-[#1e293b]' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
                        >
                          <div className="w-2 h-2 rounded-full bg-[#94a3b8]" />
                          Todos los dispositivos
                        </button>
                        {devices.map((d, i) => (
                          <button
                            key={d.id}
                            onClick={() => { setDeviceFilter(d.id); setCurrentPage(1); }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-[14px] flex items-center gap-3 transition-all ${String(deviceFilter) === String(d.id) ? 'bg-[#f1f5f9] font-bold text-[#1e293b]' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getDeviceColor(i) }} />
                            <span>{d.nombre} {d.numero_telefono ? `(${String(d.numero_telefono).slice(-4)})` : ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[12px] font-bold text-[#64748b] uppercase tracking-wide mb-2">Items por página</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[25, 50, 100].map(val => (
                          <button
                            key={val}
                            onClick={() => { setItemsPerPage(val); setCurrentPage(1); }}
                            className={`h-9 rounded-xl border text-[13px] font-bold transition-all ${itemsPerPage === val ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#1e293b]' : 'bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1]'}`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                <tr className="border-b border-[#f1f5f9]">
                  <th className="px-5 py-4 text-[12px] font-bold text-[#64748b] tracking-tight">
                    <button onClick={() => requestSort('nombre')} className="flex items-center gap-1.5 hover:text-[#1e293b] transition-colors">
                      Nombre
                      <div className="flex flex-col scale-[0.6] leading-none opacity-50">
                        <span className={sortConfig.key === 'nombre' && sortConfig.direction === 'asc' ? 'text-[#10b981]' : ''}>▲</span>
                        <span className={sortConfig.key === 'nombre' && sortConfig.direction === 'desc' ? 'text-[#10b981]' : ''}>▼</span>
                      </div>
                    </button>
                  </th>
                  <th className="px-3 py-4 text-[12px] font-bold text-[#64748b] tracking-tight">Link</th>
                  <th className="px-3 py-4 text-[12px] font-bold text-[#64748b] tracking-tight">Dispositivo</th>
                  <th className="px-3 py-4 text-[12px] font-bold text-[#64748b] tracking-tight">
                    <button onClick={() => requestSort('created_at')} className="flex items-center gap-1.5 hover:text-[#1e293b] transition-colors">
                      Fecha de creación
                      <div className="flex flex-col scale-[0.6] leading-none opacity-50">
                        <span className={sortConfig.key === 'created_at' && sortConfig.direction === 'asc' ? 'text-[#10b981]' : ''}>▲</span>
                        <span className={sortConfig.key === 'created_at' && sortConfig.direction === 'desc' ? 'text-[#10b981]' : ''}>▼</span>
                      </div>
                    </button>
                  </th>
                  <th className="px-5 py-4 text-[12px] font-bold text-[#64748b] tracking-tight text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0fdf9]">
                {loading && links.length === 0 && (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}
                  </>
                )}
                {!loading && sortedLinks.length === 0 && (
                  <tr><td colSpan="5" className="py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#f8fafc] flex items-center justify-center mx-auto mb-4">
                      <Globe size={32} className="text-[#94a3b8]" />
                    </div>
                    <p className="text-[#1e293b] font-bold text-[16px]">Ningún elemento encontrado</p>
                    <p className="text-[#64748b] text-[13px] mt-1">Intenta ajustar los filtros de búsqueda</p>
                  </td></tr>
                )}
                {paginatedLinks.map(link => {
                  const sel = selectedIds.includes(link.id);
                  const linkUrl = link.short_url || link.whalink || '';
                  const clicks = Number(link.total_clics || 0);
                  return (
                    <tr key={link.id} className="group transition-colors hover:bg-[#f8fafc] border-b border-[#f1f5f9]">
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#1e293b] text-[14px]">{link.nombre}</p>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[#6366f1] font-medium truncate max-w-[200px]">{linkUrl}</span>
                          <button
                            onClick={() => copyLink(link)}
                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${copiedId === link.id ? 'bg-[#ecfdf5] text-[#10b981]' : 'text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#6366f1]'}`}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-[13px] text-[#475569]">
                          {link.dispositivo_nombre || 'S/D'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-[13px] text-[#475569]">{formatDate(link.created_at).split(',')[0]}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => navigate(`/whalink/${link.id}`)} className="h-8 w-8 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#6366f1]" title="Estadísticas">
                            <TrendingUp size={14} />
                          </button>
                          <button onClick={() => navigate(`/whalink/${link.id}/editar`)} className="h-8 w-8 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] hover:text-amber-500" title="Editar">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => deleteLink(link)} className="h-8 w-8 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] hover:text-red-500" title="Eliminar">
                            <Trash2 size={14} />
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
          <div className="px-6 py-4 border-t border-[#d1fae5] bg-[#f9fffe] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
            <p className="text-[12px] font-bold text-[#64748b]">
              Mostrando <span className="text-[#1e293b]">{paginatedLinks.length}</span> de <span className="text-[#1e293b]">{sortedLinks.length}</span> registros
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-8 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] px-3 text-[11px] text-[#374151] outline-none cursor-pointer hover:bg-[#ecfdf5] transition-all"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 px-4 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-[11px] font-black text-[#6b7280] uppercase tracking-widest hover:text-[#10b981] hover:bg-[#ecfdf5] transition-all disabled:opacity-50"
              >Anterior</button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedLinks.length / itemsPerPage) || 1))}
                disabled={currentPage >= Math.ceil(sortedLinks.length / itemsPerPage) || sortedLinks.length === 0}
                className="h-8 px-4 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-[11px] font-black text-[#6b7280] uppercase tracking-widest hover:text-[#10b981] hover:bg-[#ecfdf5] transition-all disabled:opacity-50"
              >Siguiente</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
