import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Copy, Download, Edit3, Filter, Link2, Plus, Search, Trash2, Upload, ExternalLink, TrendingUp, Zap, Globe, X, ChevronDown, Check, BarChart2, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SkeletonTableRow } from './Skeleton';

const API_URL = import.meta.env.VITE_API_URL || '';

const formatDate = (value) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch { return String(value); }
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
  const [linkToDelete, setLinkToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'created_at') {
          valA = valA || a.fecha_creacion || a.creado_en || '';
          valB = valB || b.fecha_creacion || b.creado_en || '';
        }
        valA = valA || '';
        valB = valB || '';
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

  const copyLink = async (link) => {
    if (!link?.short_url) return;
    await navigator.clipboard.writeText(link.short_url).catch(() => { });
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

      if (!parsedRows.length) return setError('No se encontraron filas validas en el archivo.');

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

  const handleDeleteClick = (link) => {
    setLinkToDelete(link);
    setShowDeleteModal(true);
  };

  const confirmDeleteLink = async () => {
    if (!linkToDelete) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/whalink/${linkToDelete.id}?user_id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await loadLinks();
      setNotice('Link eliminado correctamente.');
      setShowDeleteModal(false);
      setLinkToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportLinks = () => {
    const headers = ['nombre', 'short_url', 'dispositivo', 'clicks', 'creado'];
    const csv = [headers.join(','), ...sortedLinks.map(l => [l.nombre, l.short_url, l.dispositivo_nombre, l.total_clics || 0, l.created_at || l.fecha_creacion || l.creado_en].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'whalinks.csv'; a.click();
  };

  // Stats calculation
  const totalClicks = links.reduce((s, l) => s + Number(l.total_clics || 0), 0);
  const activeLinksCount = links.filter(l => Number(l.total_clics || 0) > 0).length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-emerald-200/50">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="ml-24 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] border border-slate-100">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* HEADER SECTION (MATCHING MOCKUP) */}
          <div className="px-8 pt-6 pb-0 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Link2 size={18} />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Whalink</h1>
              </div>

              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Importar desde CSV"
                >
                  <Upload size={14} /> Importar
                </button>
                <button
                  onClick={exportLinks}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Exportar a CSV"
                >
                  <Download size={14} /> Exportar
                </button>
                <button
                  onClick={() => navigate('/whalink/crear')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Plus size={15} /> Crear link
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-6">Links dinámicos que dirigen a iniciar una conversación en WhatsApp con un mensaje predeterminado.</p>
          </div>

          {/* 4 CARDS KPI DESTACADAS (FONDOS PASTELES SOFT Y SPARKLINES) */}
          <div className="px-8 mb-4 shrink-0 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* CARD 1: LINKS CREADOS */}
            <div className="group relative overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-br from-[#eefbf5] via-[#e6f7f0] to-[#d5f3e7] p-3.5 px-4 shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#00a86b] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                    <Link2 size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-emerald-800/70 uppercase tracking-widest block mb-0.5">LINKS CREADOS</span>
                    <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{links.length}</div>
                    <span className="text-[10px] font-black text-[#00a86b] block">▲ 100% vs mes anterior</span>
                  </div>
                </div>
                <div className="w-10 h-6 shrink-0 self-end mb-0.5">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <path d="M2 26 C 14 26, 24 16, 38 18 C 50 20, 56 6, 62 4" stroke="#00a86b" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* CARD 2: CLICS TOTALES */}
            <div className="group relative overflow-hidden rounded-xl border border-blue-200/70 bg-gradient-to-br from-[#eff6ff] via-[#e0f2fe] to-[#bae6fd] p-3.5 px-4 shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                    <TrendingUp size={15} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-blue-900/70 uppercase tracking-widest block mb-0.5">CLICS TOTALES</span>
                    <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{totalClicks}</div>
                    <span className="text-[10px] font-black text-[#2563eb] block">▲ 50% vs mes anterior</span>
                  </div>
                </div>
                <div className="w-10 h-6 shrink-0 self-end mb-0.5">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <path d="M2 26 C 14 26, 26 22, 38 14 C 50 6, 56 16, 62 10" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* CARD 3: LINKS ACTIVOS */}
            <div className="group relative overflow-hidden rounded-xl border border-purple-200/70 bg-gradient-to-br from-[#f5f3ff] via-[#ede9fe] to-[#ddd6fe] p-3.5 px-4 shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                    <Zap size={15} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-purple-900/70 uppercase tracking-widest block mb-0.5">LINKS ACTIVOS</span>
                    <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{activeLinksCount}</div>
                    <span className="text-[10px] font-black text-[#7c3aed] block">▲ 100% vs mes anterior</span>
                  </div>
                </div>
                <div className="w-10 h-6 shrink-0 self-end mb-0.5">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <path d="M2 24 C 16 28, 28 18, 40 20 C 52 22, 58 8, 62 6" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* CARD 4: DISPOSITIVOS */}
            <div className="group relative overflow-hidden rounded-xl border border-amber-200/70 bg-gradient-to-br from-[#fffdf5] via-[#fff7e6] to-[#feebc8] p-3.5 px-4 shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#d97706] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                    <Smartphone size={15} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-amber-900/70 uppercase tracking-widest block mb-0.5">DISPOSITIVOS</span>
                    <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{devices.length}</div>
                    <span className="text-[10px] font-black text-[#d97706] block">Conectados al sistema</span>
                  </div>
                </div>
                <div className="w-10 h-6 shrink-0 self-end mb-0.5">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <path d="M2 28 C 14 28, 24 20, 36 22 C 48 24, 56 12, 62 8" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* TOOLBAR: SEARCH & FILTERS */}
          <div className="px-8 mb-4 flex items-center justify-between gap-3 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar por nombre, mensaje o dispositivo..."
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 w-80 font-medium text-slate-800 placeholder-slate-400 transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-3 relative" ref={filterRef}>
              {(search || deviceFilter !== 'todos') && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-emerald-600 font-bold hover:underline transition-all cursor-pointer"
                >
                  Limpiar todos los filtros
                </button>
              )}

              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  deviceFilter !== 'todos' || showFilterPanel ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Filter size={14} className="text-slate-500" /> Filtrar
                <ChevronDown size={14} className="text-slate-400" />
                {deviceFilter !== 'todos' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>

              {/* FILTER PANEL OVERLAY */}
              {showFilterPanel && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[100] p-5 animate-in fade-in zoom-in duration-150">
                  <div className="space-y-4">
                    {/* Dispositivo Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-2">Dispositivo</label>
                      <div className="relative">
                        <select
                          value={deviceFilter}
                          onChange={(e) => { setDeviceFilter(e.target.value); setCurrentPage(1); }}
                          className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 pr-10 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                        >
                          <option value="todos">Selecciona un dispositivo</option>
                          {devices.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.nombre} {d.numero_telefono ? `(${String(d.numero_telefono).slice(-4)})` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
                          <span className="h-4 w-px bg-slate-200 mr-2.5" />
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {/* Items por página Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-2">Items por página</label>
                      <div className="relative">
                        <select
                          value={itemsPerPage}
                          onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                          className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 pr-10 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
                          <span className="h-4 w-px bg-slate-200 mr-2.5" />
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NOTICES */}
          {(error || notice) && (
            <div className="px-8 mb-4 shrink-0">
              <div className={`rounded-xl px-4 py-2.5 text-xs font-bold border ${error ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                {error || notice}
              </div>
            </div>
          )}

          {/* TABLE CONTAINER */}
          <div className="flex-1 overflow-x-auto px-8 pb-4 custom-scrollbar">
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <table className="w-full min-w-[780px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-800">
                      <button onClick={() => requestSort('nombre')} className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors cursor-pointer">
                        Nombre
                        <span className="text-[11px] text-slate-400">⇅</span>
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-800">Link</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-800">Dispositivo</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-800">
                      <button onClick={() => requestSort('total_clics')} className="flex items-center gap-1 hover:text-emerald-600 transition-colors cursor-pointer">
                        Clics
                        <ChevronDown size={13} className={`transition-transform text-slate-400 ${sortConfig.key === 'total_clics' && sortConfig.direction === 'asc' ? 'rotate-180 text-emerald-600' : ''}`} />
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-xs font-bold text-slate-800">
                      <button onClick={() => requestSort('created_at')} className="flex items-center gap-1 hover:text-emerald-600 transition-colors cursor-pointer">
                        Fecha de creación
                        <ChevronDown size={13} className={`transition-transform text-slate-400 ${sortConfig.key === 'created_at' && sortConfig.direction === 'asc' ? 'rotate-180 text-emerald-600' : ''}`} />
                      </button>
                    </th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-800 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && links.length === 0 && (
                    <>
                      {Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}
                    </>
                  )}
                  {!loading && sortedLinks.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                          <Globe size={24} />
                        </div>
                        <p className="text-slate-800 font-bold text-sm">Ningún elemento encontrado</p>
                        <p className="text-slate-400 text-xs mt-0.5 font-medium">Intenta ajustar los filtros de búsqueda</p>
                      </td>
                    </tr>
                  )}
                  {paginatedLinks.map(link => {
                    const linkUrl = link.short_url || link.whalink || '';
                    const clicks = Number(link.total_clics || 0);
                    const initialLetter = (link.nombre || 'P').charAt(0).toUpperCase();
                    return (
                      <tr key={link.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <div className="w-7 h-7 rounded-full bg-emerald-100/80 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {initialLetter}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs leading-snug">{link.nombre}</p>
                              <p className="text-[11px] text-slate-400 font-medium">Link principal</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <a
                              href={linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-emerald-600 hover:underline truncate max-w-[220px]"
                            >
                              {linkUrl}
                            </a>
                            <button
                              onClick={() => copyLink(link)}
                              className={`p-1 rounded-md border border-slate-200 transition-all shrink-0 cursor-pointer ${
                                copiedId === link.id ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-600'
                              }`}
                              title="Copiar link"
                            >
                              {copiedId === link.id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                            {linkUrl && (
                              <a
                                href={linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors shrink-0"
                                title="Abrir enlace"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                            <Smartphone size={12} className="text-slate-400" />
                            {link.dispositivo_nombre || 'Trabajo Geo'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <TrendingUp size={12} />
                              {clicks}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Total de clics</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {formatDate(link.created_at || link.fecha_creacion || link.creado_en)}
                            </span>
                            <span className="text-[10.5px] text-slate-400 font-medium block mt-0.5">Hace 2 días</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/whalink/${link.id}`)}
                              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Ver estadísticas"
                            >
                              <BarChart2 size={14} />
                            </button>
                            <button
                              onClick={() => navigate(`/whalink/${link.id}/editar`)}
                              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Editar link"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(link)}
                              className="w-7 h-7 rounded-lg border border-rose-200/80 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Eliminar link"
                            >
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
          </div>

          {/* 3 TARJETAS INFERIORES: ANÁLISIS Y ESTADÍSTICAS (DISEÑO DELICADO Y ELEGANTE) */}
          <div className="mt-auto pt-3 px-8 grid grid-cols-1 gap-3.5 lg:grid-cols-3 shrink-0 mb-3">
            {/* Card 1: RENDIMIENTO DE LINKS */}
            <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-[#f0f7ff] via-[#e6f0fa] to-[#dbeafe]/70 p-3 px-3.5 shadow-2xs flex flex-col justify-between h-fit hover:shadow-xs transition-shadow">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider text-blue-900/80 mb-2">RENDIMIENTO DE LINKS</h3>
                <div className="flex items-center gap-3.5 my-1">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="3.5"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="4"
                        strokeDasharray={`${links.length > 0 ? Math.round((activeLinksCount / links.length) * 100) : 0}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-slate-800 text-xs">
                      {links.length > 0 ? Math.round((activeLinksCount / links.length) * 100) : 0}%
                    </div>
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2563eb] shrink-0"></span>
                      <span className="text-[10px] font-bold text-slate-700 truncate">Links Activos</span>
                      <span className="text-[10px] font-black text-slate-900 ml-auto">{activeLinksCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                      <span className="text-[10px] font-bold text-slate-500 truncate">Links Inactivos</span>
                      <span className="text-[10px] font-black text-slate-900 ml-auto">{Math.max(0, links.length - activeLinksCount)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 rounded-lg bg-blue-100/60 p-1.5 border border-blue-200/60 flex items-center gap-1.5">
                <Zap size={12} className="text-blue-600 shrink-0" />
                <p className="text-[10px] font-bold text-blue-900 leading-tight truncate">
                  Los links dinámicos redirigen directo a tu conversación de WhatsApp.
                </p>
              </div>
            </div>

            {/* Card 2: DISPOSITIVOS ASIGNADOS */}
            <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-[#eefbf5] via-[#e6f7f0] to-[#d5f3e7]/70 p-3 px-3.5 shadow-2xs flex flex-col justify-between h-fit hover:shadow-xs transition-shadow">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider text-emerald-900/80 mb-2">DISPOSITIVOS ASIGNADOS</h3>
                <div className="flex items-center gap-3.5 my-1">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="3.5"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                        fill="none"
                        stroke="#00a86b"
                        strokeWidth="4"
                        strokeDasharray="100, 100"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-slate-800 text-xs">
                      {devices.length}
                    </div>
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00a86b] shrink-0"></span>
                      <span className="text-[10px] font-bold text-slate-700 truncate">WhatsApp Conectados</span>
                      <span className="text-[10px] font-black text-slate-900 ml-auto">{devices.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                      <span className="text-[10px] font-bold text-slate-500 truncate">Total Links</span>
                      <span className="text-[10px] font-black text-slate-900 ml-auto">{links.length}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 rounded-lg bg-emerald-100/60 p-1.5 border border-emerald-200/60 flex items-center gap-1.5">
                <Globe size={12} className="text-emerald-600 shrink-0" />
                <p className="text-[10px] font-bold text-emerald-900 leading-tight truncate">
                  Distribuye tus envíos vinculando diferentes líneas telefónicas.
                </p>
              </div>
            </div>

            {/* Card 3: ACTIVIDAD DE LINKS */}
            <div className="rounded-xl border border-purple-200/80 bg-gradient-to-br from-[#f8f5ff] via-[#f1ebfe] to-[#e9d8fd]/70 p-3 px-3.5 shadow-2xs flex flex-col justify-between h-fit hover:shadow-xs transition-shadow">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider text-purple-900/80 mb-2">ACTIVIDAD DE LINKS</h3>
                <div className="space-y-1.5">
                  {links.slice(0, 2).map((l) => (
                    <div key={l.id} className="flex items-start justify-between text-xs">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">
                          {(l.nombre || 'W').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-800 text-[10px] truncate">{l.nombre}</div>
                          <div className="text-purple-600 font-semibold text-[9px] truncate">{l.short_url || 'Link listo'}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => copyLink(l)}
                        className="text-[9px] text-purple-700 hover:text-purple-900 font-bold shrink-0 ml-2 border border-purple-200/60 px-1.5 py-0.5 rounded-md bg-white/70"
                      >
                        {copiedId === l.id ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  ))}
                  {links.length === 0 && (
                    <div className="text-[10px] text-slate-400 italic p-1.5 text-center font-medium">
                      No hay links creados aún.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-purple-100/80">
                <button 
                  type="button" 
                  onClick={() => navigate('/whalink/crear')} 
                  className="text-[10px] font-black text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
                >
                  <Plus size={11} /> Crear nuevo link de WhatsApp
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL ELIMINAR LINK */}
      {showDeleteModal && linkToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150" onMouseDown={() => { setShowDeleteModal(false); setLinkToDelete(null); }}>
          <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl p-6 overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">¿Eliminar link?</h3>
                <p className="text-xs text-slate-400 font-medium">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-medium">
              ¿Estás seguro de que deseas eliminar el link <strong className="text-slate-800 font-bold">"{linkToDelete.nombre}"</strong>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setLinkToDelete(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteLink}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-2xs transition-all text-xs uppercase tracking-wider cursor-pointer"
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
