import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Columns, Copy, ExternalLink, Filter, Phone, Plus, RotateCcw, Search, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const API_URL = import.meta.env.VITE_API_URL || '';

const buildAuthHeaders = (user) => {
  const headers = {};
  if (user?.token) headers.Authorization = `Bearer ${user.token}`;
  return headers;
};

const columnCatalog = [
  { key: 'link', label: 'Link' },
  { key: 'grupos', label: 'Grupos' },
  { key: 'administradores', label: 'Administradores' },
  { key: 'ingresosClicks', label: 'Ingresos/Clicks' },
  { key: 'tipo', label: 'Tipo' },
];

const defaultColumns = columnCatalog.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});

const deviceLabel = (device) => {
  if (!device) return 'Todos los dispositivos';
  return device.numero_telefono ? `${device.nombre} ${device.numero_telefono}` : device.nombre;
};

const Campanas = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(defaultColumns);
  const [filters, setFilters] = useState({ tipo: 'todos', dispositivo: 'todos' });
  const [actionMessage, setActionMessage] = useState(null);
  const columnsRef = useRef(null);
  const filtersRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (columnsRef.current && !columnsRef.current.contains(event.target)) setColumnsOpen(false);
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setFiltersOpen(false);
        setTypeDropdownOpen(false);
        setDeviceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const loadCampaigns = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: String(user.id),
        q: search,
        tipo: filters.tipo,
        dispositivo_id: filters.dispositivo,
      });
      const response = await fetch(`${API_URL}/api/campanas?${params.toString()}`, {
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (result.success) {
        setItems(result.data?.items || []);
        setDevices(result.data?.devices || []);
      }
    } catch (error) {
      console.error('Error cargando campañas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadCampaigns, 250);
    return () => window.clearTimeout(timer);
  }, [user?.id, search, filters.tipo, filters.dispositivo]);

  const selectedDevice = useMemo(
    () => devices.find((device) => String(device.id) === String(filters.dispositivo)),
    [devices, filters.dispositivo],
  );
  const visibleColumnCount = 2 + Object.values(visibleColumns).filter(Boolean).length;

  const typeOptions = [
    { value: 'todos', label: 'Todos los tipos' },
    { value: 'grupo', label: 'Grupo' },
    { value: 'comunidad', label: 'Comunidad' },
    { value: 'canal', label: 'Canal' },
  ];

  const campaignLink = (item) => item.short_url || item.link || '';

  const handleCopyLink = async (item) => {
    const link = campaignLink(item);
    if (!link) {
      setActionMessage({ type: 'error', text: 'Esta campañaa todavía no tiene link disponible.' });
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setActionMessage({ type: 'success', text: 'Link copiado al portapapeles.' });
    } catch (error) {
      console.error('Error copiando link:', error);
      setActionMessage({ type: 'error', text: 'No se pudo copiar el link.' });
    }
  };

  const handleDeleteCampaign = async (item) => {
    if (!window.confirm(`¿Eliminar la campaña "${item.nombre}"? Esta acción no borra tus grupos ni dispositivos.`)) return;
    try {
      const response = await fetch(`${API_URL}/api/campanas/${item.id}?user_id=${user.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudo eliminar la campaña');
      }
      setActionMessage({ type: 'success', text: result.message || 'Campaña eliminada correctamente.' });
      loadCampaigns();
    } catch (error) {
      console.error('Error eliminando campaña:', error);
      setActionMessage({ type: 'error', text: error.message || 'No se pudo eliminar la campaña.' });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-20 flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={onLogout} title="GeoChat" onRefresh={loadCampaigns} isLoading={loading} />

        <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] border border-slate-100">
        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col custom-scrollbar">
          
          {/* HEADER SECTION (MATCHING MOCKUP) */}
          <div className="mb-6 shrink-0 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Campañas</h1>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Crea campañas para llenar grupos y comunidades de manera masiva y automática.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/campanas/crear')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-100 cursor-pointer"
              >
                <Plus size={15} />
                Crear campaña
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="mb-6 flex items-center justify-between gap-4 shrink-0">
            <div className="relative w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium text-slate-800 placeholder-slate-400 transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2.5">
              {/* COLUMNAS DROPDOWN */}
              <div className="relative" ref={columnsRef}>
                <button
                  type="button"
                  onClick={() => setColumnsOpen((open) => !open)}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Columns size={14} />
                  Columnas
                </button>
                {columnsOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl text-left animate-in fade-in duration-100">
                    {columnCatalog.map((column) => (
                      <button
                        key={column.key}
                        type="button"
                        onClick={() => setVisibleColumns((current) => ({ ...current, [column.key]: !current[column.key] }))}
                        className="flex w-full items-center justify-between px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <span>{column.label}</span>
                        <Check size={14} className={visibleColumns[column.key] ? 'text-emerald-600 opacity-100' : 'opacity-0'} />
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-100" />
                    <button type="button" onClick={() => setVisibleColumns(defaultColumns)} className="flex w-full items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                      <Users size={14} />
                      Mostrar todas
                    </button>
                    <button type="button" onClick={() => setVisibleColumns(defaultColumns)} className="flex w-full items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                      <RotateCcw size={14} />
                      Restablecer anchos
                    </button>
                  </div>
                )}
              </div>

              {/* FILTRAR DROPDOWN */}
              <div className="relative" ref={filtersRef}>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Filter size={14} />
                  Filtrar
                </button>
                {filtersOpen && (
                  <div className="absolute right-0 top-full z-40 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl text-left animate-in fade-in duration-100">
                    <h3 className="mb-4 text-xs font-bold text-slate-800 uppercase tracking-wider">Filtros de búsqueda</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1.5 text-xs font-bold text-slate-600">Tipo de campaña</p>
                        <div className="relative">
                          <button type="button" onClick={() => setTypeDropdownOpen((open) => !open)} className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-xs text-slate-700 font-medium bg-white">
                            {typeOptions.find((option) => option.value === filters.tipo)?.label || 'Todos los tipos'}
                            <ChevronDown size={14} />
                          </button>
                          {typeDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                              {typeOptions.map((option) => (
                                <button key={option.value} type="button" onClick={() => { setFilters((current) => ({ ...current, tipo: option.value })); setTypeDropdownOpen(false); }} className={`block w-full px-3 py-1.5 text-left text-xs font-medium ${filters.tipo === option.value ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-bold text-slate-600">Dispositivo</p>
                        <div className="relative">
                          <button type="button" onClick={() => setDeviceDropdownOpen((open) => !open)} className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium">
                            {filters.dispositivo === 'todos' ? 'Todos los dispositivos' : deviceLabel(selectedDevice)}
                            <ChevronDown size={14} />
                          </button>
                          {deviceDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl py-1 max-h-48 overflow-y-auto">
                              <button type="button" onClick={() => { setFilters((current) => ({ ...current, dispositivo: 'todos' })); setDeviceDropdownOpen(false); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-50">
                                <span className="flex items-center gap-2"><Phone size={14} />Todos los dispositivos</span>
                                {filters.dispositivo === 'todos' && <Check size={14} className="text-emerald-600" />}
                              </button>
                              {devices.map((device) => (
                                <button key={device.id} type="button" onClick={() => { setFilters((current) => ({ ...current, dispositivo: String(device.id) })); setDeviceDropdownOpen(false); }} className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-slate-50 text-xs">
                                  <span className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Phone size={12} /></span>
                                    <span>
                                      <span className="block font-bold text-slate-800">{device.nombre}</span>
                                      <span className="block text-[11px] text-slate-400">{device.numero_telefono}</span>
                                    </span>
                                  </span>
                                  {String(filters.dispositivo) === String(device.id) && <Check size={14} className="text-emerald-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {actionMessage && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-xs font-bold shrink-0 ${actionMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {actionMessage.text}
            </div>
          )}

          {/* TABLE OF CAMPAIGNS */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs flex-1 flex flex-col">
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase tracking-wider">NOMBRE</th>
                      {visibleColumns.link && <th className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase tracking-wider">LINK</th>}
                      {visibleColumns.grupos && <th className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase tracking-wider">GRUPOS</th>}
                      {visibleColumns.administradores && <th className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase tracking-wider">ADMINISTRADORES</th>}
                      {visibleColumns.ingresosClicks && <th className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase tracking-wider">INGRESOS/CLICKS</th>}
                      {visibleColumns.tipo && <th className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase tracking-wider">TIPO</th>}
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-800 text-right uppercase tracking-wider">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={visibleColumnCount} className="py-20 text-center text-xs font-medium text-slate-400">Cargando campañas...</td></tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumnCount} className="py-20 text-center">
                          {/* EMPTY STATE MATCHING MOCKUP IMAGE 100% */}
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100/80 border border-slate-200/60 flex items-center justify-center mb-3 text-slate-400 shadow-2xs">
                              <Users size={28} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">No se encontraron elementos</h3>
                            <p className="text-xs text-slate-400 font-medium">Intenta ajustar los filtros de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    ) : items.map((item) => (
                      <tr key={item.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-bold text-slate-900 text-xs truncate">{item.nombre}</p>
                          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{item.estado || 'borrador'}</span>
                        </td>
                        {visibleColumns.link && (
                          <td className="px-6 py-3.5 text-xs font-medium text-slate-500">
                            {campaignLink(item) ? (
                              <a className="block truncate text-emerald-600 font-medium hover:underline" href={campaignLink(item)} target="_blank" rel="noreferrer">
                                {campaignLink(item)}
                              </a>
                            ) : '-'}
                          </td>
                        )}
                        {visibleColumns.grupos && <td className="px-6 py-3.5 text-xs font-bold text-slate-800">{item.grupos}</td>}
                        {visibleColumns.administradores && <td className="px-6 py-3.5 text-xs font-bold text-slate-800">{item.administradores}</td>}
                        {visibleColumns.ingresosClicks && <td className="px-6 py-3.5 text-xs font-bold text-slate-800">{item.ingresos}/{item.clicks}</td>}
                        {visibleColumns.tipo && <td className="px-6 py-3.5 text-xs font-medium text-slate-600 capitalize">{item.tipo}</td>}
                        <td className="px-6 py-3.5 text-right">
                          <div className="relative inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Copiar link"
                              onClick={() => handleCopyLink(item)}
                              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            >
                              <Copy size={14} />
                            </button>
                            {campaignLink(item) && (
                              <a
                                title="Abrir link"
                                href={campaignLink(item)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button
                              type="button"
                              title="Eliminar campaña"
                              onClick={() => handleDeleteCampaign(item)}
                              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default Campanas;

