import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Columns, Filter, Megaphone, Phone, Plus, RotateCcw, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

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
      console.error('Error cargando campaÃ±as:', error);
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

  const typeOptions = [
    { value: 'todos', label: 'Todos los tipos' },
    { value: 'grupo', label: 'Grupo' },
    { value: 'comunidad', label: 'Comunidad' },
    { value: 'canal', label: 'Canal' },
  ];

  return (
    <div className="flex min-h-screen bg-[#f5f5f6] text-[#0f172a]">
      <Sidebar onLogout={onLogout} user={user} />
      <main className="ml-28 mr-5 mt-3 mb-3 flex min-h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="bg-[#cbc7f8] px-7 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-950">EstÃ¡s en el nuevo diseÃ±o de Comunidades</p>
              <p className="text-sm text-[#57518b]">Tus comunidades estÃ¡n intactas. Nada se pausa ni se pierde. Puedes volver cuando quieras.</p>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-950">
              <span className="relative inline-flex h-7 w-12 items-center rounded-full bg-[#625dde] p-1">
                <span className="h-5 w-5 translate-x-5 rounded-full bg-white shadow-sm" />
              </span>
              Volver al anterior
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mb-7 flex items-start justify-between">
            <div>
              <h1 className="text-[26px] font-bold tracking-tight text-slate-950">CampaÃ±as</h1>
              <p className="mt-1.5 text-[15px] text-slate-500">Crea campaÃ±as para llenar grupos y comunidades de manera masiva y automÃ¡tica.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/campanas/crear')}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#111114] px-6 text-base font-bold text-white shadow-lg transition hover:bg-black"
            >
              <Plus size={19} />
              Crear campaÃ±a
            </button>
          </div>

          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-[380px]">
              <Search size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre..."
                className="h-12 w-full rounded-[1.1rem] border border-slate-200 bg-white pl-12 pr-5 text-[15px] outline-none shadow-sm transition placeholder:text-slate-400 focus:border-[#625dde]"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative" ref={columnsRef}>
                <button
                  type="button"
                  onClick={() => setColumnsOpen((open) => !open)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold shadow-md shadow-slate-200/50"
                >
                  <Columns size={18} />
                  Columnas
                </button>
                {columnsOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                    {columnCatalog.map((column) => (
                      <button
                        key={column.key}
                        type="button"
                        onClick={() => setVisibleColumns((current) => ({ ...current, [column.key]: !current[column.key] }))}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] transition hover:bg-slate-50"
                      >
                        <Check size={18} className={visibleColumns[column.key] ? 'opacity-100' : 'opacity-0'} />
                        {column.label}
                      </button>
                    ))}
                    <div className="my-2 border-t border-slate-100" />
                    <button type="button" onClick={() => setVisibleColumns(defaultColumns)} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] transition hover:bg-slate-50">
                      <Users size={18} />
                      Mostrar todas
                    </button>
                    <button type="button" onClick={() => setVisibleColumns(defaultColumns)} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] transition hover:bg-slate-50">
                      <RotateCcw size={18} />
                      Restablecer anchos
                    </button>
                  </div>
                )}
              </div>

              <div className="relative" ref={filtersRef}>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold shadow-md shadow-slate-200/50"
                >
                  <Filter size={18} />
                  Filtrar
                </button>
                {filtersOpen && (
                  <div className="absolute right-0 top-full z-40 mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <h3 className="mb-5 text-base font-semibold">Filtros</h3>
                    <div className="space-y-5">
                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-500">Tipo de campaÃ±a</p>
                        <div className="relative">
                          <button type="button" onClick={() => setTypeDropdownOpen((open) => !open)} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 px-4 text-left text-sm text-slate-500">
                            {typeOptions.find((option) => option.value === filters.tipo)?.label || 'Todos los tipos'}
                            <ChevronDown size={18} />
                          </button>
                          {typeDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-50 overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-lg">
                              {typeOptions.map((option) => (
                                <button key={option.value} type="button" onClick={() => { setFilters((current) => ({ ...current, tipo: option.value })); setTypeDropdownOpen(false); }} className={`block w-full px-5 py-3 text-left text-sm ${filters.tipo === option.value ? 'bg-slate-200' : 'hover:bg-slate-50'}`}>
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-500">Dispositivo</p>
                        <div className="relative">
                          <button type="button" onClick={() => setDeviceDropdownOpen((open) => !open)} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-sm text-slate-500">
                            {filters.dispositivo === 'todos' ? 'Todos los dispositivos' : deviceLabel(selectedDevice)}
                            <ChevronDown size={18} />
                          </button>
                          {deviceDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                              <button type="button" onClick={() => { setFilters((current) => ({ ...current, dispositivo: 'todos' })); setDeviceDropdownOpen(false); }} className="flex w-full items-center justify-between bg-slate-200 px-4 py-3 text-left text-sm font-semibold">
                                <span className="flex items-center gap-3"><Phone size={17} />Todos los dispositivos</span>
                                {filters.dispositivo === 'todos' && <Check size={18} />}
                              </button>
                              {devices.map((device) => (
                                <button key={device.id} type="button" onClick={() => { setFilters((current) => ({ ...current, dispositivo: String(device.id) })); setDeviceDropdownOpen(false); }} className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50">
                                  <span className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Phone size={18} /></span>
                                    <span>
                                      <span className="block text-base font-semibold">{device.nombre}</span>
                                      <span className="block text-sm text-slate-500">{device.numero_telefono}</span>
                                      <span className="block text-sm text-emerald-600 capitalize">{device.estado}</span>
                                    </span>
                                  </span>
                                  {String(filters.dispositivo) === String(device.id) && <Check size={18} />}
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

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-slate-50 text-left text-[13px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nombre</th>
                  {visibleColumns.link && <th className="px-6 py-4">Link</th>}
                  {visibleColumns.grupos && <th className="px-6 py-4">Grupos</th>}
                  {visibleColumns.administradores && <th className="px-6 py-4">Administradores</th>}
                  {visibleColumns.ingresosClicks && <th className="px-6 py-4">Ingresos/Clicks</th>}
                  {visibleColumns.tipo && <th className="px-6 py-4">Tipo</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="h-72 text-center text-sm text-slate-500">Cargando campaÃ±as...</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex h-[320px] flex-col items-center justify-center text-center">
                        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <Users size={40} />
                        </div>
                        <p className="text-base font-bold text-black">No se encontraron elementos</p>
                        <p className="mt-1.5 text-[15px] text-slate-500">Intenta ajustar los filtros de bÃºsqueda</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 text-sm">
                    <td className="px-6 py-4 font-semibold">{item.nombre}</td>
                    {visibleColumns.link && <td className="px-6 py-4 text-slate-500">{item.link || '-'}</td>}
                    {visibleColumns.grupos && <td className="px-6 py-4">{item.grupos}</td>}
                    {visibleColumns.administradores && <td className="px-6 py-4">{item.administradores}</td>}
                    {visibleColumns.ingresosClicks && <td className="px-6 py-4">{item.ingresos}/{item.clicks}</td>}
                    {visibleColumns.tipo && <td className="px-6 py-4 capitalize">{item.tipo}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Campanas;

