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

  const typeOptions = [
    { value: 'todos', label: 'Todos los tipos' },
    { value: 'grupo', label: 'Grupo' },
    { value: 'comunidad', label: 'Comunidad' },
    { value: 'canal', label: 'Canal' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f6] text-[#0f172a]">
      <Sidebar onLogout={onLogout} user={user} />
      <main className="ml-24 min-h-screen rounded-l-[1.5rem] bg-white">
        <div className="rounded-tl-[1.5rem] bg-[#cbc7f8] px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-slate-950">Estás en el nuevo diseño de Comunidades</p>
              <p className="text-sm text-[#57518b]">Tus comunidades están intactas. Nada se pausa ni se pierde. Puedes volver cuando quieras.</p>
            </div>
            <label className="flex items-center gap-4 text-base font-semibold text-slate-950">
              <span className="relative inline-flex h-8 w-14 items-center rounded-full bg-[#625dde] p-1">
                <span className="h-6 w-6 translate-x-6 rounded-full bg-white shadow-sm" />
              </span>
              Volver al anterior
            </label>
          </div>
        </div>

        <div className="px-10 py-9">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Campañas</h1>
              <p className="mt-2 text-xl text-slate-500">Crea campañas para llenar grupos y comunidades de manera masiva y automática.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/campanas/crear')}
              className="inline-flex h-14 items-center gap-3 rounded-full bg-[#111114] px-7 text-lg font-bold text-white shadow-lg transition hover:bg-black"
            >
              <Plus size={22} />
              Crear campaña
            </button>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div className="relative w-full max-w-[450px]">
              <Search size={22} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre..."
                className="h-14 w-full rounded-[1.25rem] border border-slate-200 bg-white pl-14 pr-5 text-xl outline-none shadow-sm transition focus:border-[#625dde]"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative" ref={columnsRef}>
                <button
                  type="button"
                  onClick={() => setColumnsOpen((open) => !open)}
                  className="inline-flex h-14 items-center gap-3 rounded-full border border-slate-200 bg-white px-6 text-xl font-semibold shadow-md shadow-slate-200/50"
                >
                  <Columns size={22} />
                  Columnas
                </button>
                {columnsOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                    {columnCatalog.map((column) => (
                      <button
                        key={column.key}
                        type="button"
                        onClick={() => setVisibleColumns((current) => ({ ...current, [column.key]: !current[column.key] }))}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left text-xl transition hover:bg-slate-50"
                      >
                        <Check size={18} className={visibleColumns[column.key] ? 'opacity-100' : 'opacity-0'} />
                        {column.label}
                      </button>
                    ))}
                    <div className="my-2 border-t border-slate-100" />
                    <button type="button" onClick={() => setVisibleColumns(defaultColumns)} className="flex w-full items-center gap-3 px-5 py-3 text-left text-xl transition hover:bg-slate-50">
                      <Users size={18} />
                      Mostrar todas
                    </button>
                    <button type="button" onClick={() => setVisibleColumns(defaultColumns)} className="flex w-full items-center gap-3 px-5 py-3 text-left text-xl transition hover:bg-slate-50">
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
                  className="inline-flex h-14 items-center gap-3 rounded-full border border-slate-200 bg-white px-6 text-xl font-semibold shadow-md shadow-slate-200/50"
                >
                  <Filter size={22} />
                  Filtrar
                </button>
                {filtersOpen && (
                  <div className="absolute right-0 top-full z-40 mt-2 w-[405px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                    <h3 className="mb-6 text-xl font-semibold">Filtros</h3>
                    <div className="space-y-6">
                      <div>
                        <p className="mb-2 text-base font-semibold text-slate-500">Tipo de campaña</p>
                        <div className="relative">
                          <button type="button" onClick={() => setTypeDropdownOpen((open) => !open)} className="flex h-14 w-full items-center justify-between rounded-2xl border border-slate-200 px-4 text-left text-lg text-slate-500">
                            {typeOptions.find((option) => option.value === filters.tipo)?.label || 'Todos los tipos'}
                            <ChevronDown size={22} />
                          </button>
                          {typeDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-50 overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-lg">
                              {typeOptions.map((option) => (
                                <button key={option.value} type="button" onClick={() => { setFilters((current) => ({ ...current, tipo: option.value })); setTypeDropdownOpen(false); }} className={`block w-full px-5 py-3 text-left text-lg ${filters.tipo === option.value ? 'bg-slate-200' : 'hover:bg-slate-50'}`}>
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-base font-semibold text-slate-500">Dispositivo</p>
                        <div className="relative">
                          <button type="button" onClick={() => setDeviceDropdownOpen((open) => !open)} className="flex h-14 w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 text-left text-xl text-slate-500">
                            {filters.dispositivo === 'todos' ? 'Todos los dispositivos' : deviceLabel(selectedDevice)}
                            <ChevronDown size={22} />
                          </button>
                          {deviceDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                              <button type="button" onClick={() => { setFilters((current) => ({ ...current, dispositivo: 'todos' })); setDeviceDropdownOpen(false); }} className="flex w-full items-center justify-between bg-slate-200 px-4 py-4 text-left text-xl font-semibold">
                                <span className="flex items-center gap-3"><Phone size={20} />Todos los dispositivos</span>
                                {filters.dispositivo === 'todos' && <Check size={20} />}
                              </button>
                              {devices.map((device) => (
                                <button key={device.id} type="button" onClick={() => { setFilters((current) => ({ ...current, dispositivo: String(device.id) })); setDeviceDropdownOpen(false); }} className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-slate-50">
                                  <span className="flex items-center gap-4">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Phone size={20} /></span>
                                    <span>
                                      <span className="block text-xl font-semibold">{device.nombre}</span>
                                      <span className="block text-base text-slate-500">{device.numero_telefono}</span>
                                      <span className="block text-base text-emerald-600 capitalize">{device.estado}</span>
                                    </span>
                                  </span>
                                  {String(filters.dispositivo) === String(device.id) && <Check size={20} />}
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
              <thead className="bg-slate-50 text-left text-base font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-5">Nombre</th>
                  {visibleColumns.link && <th className="px-6 py-5">Link</th>}
                  {visibleColumns.grupos && <th className="px-6 py-5">Grupos</th>}
                  {visibleColumns.administradores && <th className="px-6 py-5">Administradores</th>}
                  {visibleColumns.ingresosClicks && <th className="px-6 py-5">Ingresos/Clicks</th>}
                  {visibleColumns.tipo && <th className="px-6 py-5">Tipo</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="h-80 text-center text-lg text-slate-500">Cargando campañas...</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex h-[340px] flex-col items-center justify-center text-center">
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <Users size={48} />
                        </div>
                        <p className="text-xl font-bold text-black">No se encontraron elementos</p>
                        <p className="mt-2 text-xl text-slate-500">Intenta ajustar los filtros de búsqueda</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 text-base">
                    <td className="px-6 py-5 font-semibold">{item.nombre}</td>
                    {visibleColumns.link && <td className="px-6 py-5 text-slate-500">{item.link || '-'}</td>}
                    {visibleColumns.grupos && <td className="px-6 py-5">{item.grupos}</td>}
                    {visibleColumns.administradores && <td className="px-6 py-5">{item.administradores}</td>}
                    {visibleColumns.ingresosClicks && <td className="px-6 py-5">{item.ingresos}/{item.clicks}</td>}
                    {visibleColumns.tipo && <td className="px-6 py-5 capitalize">{item.tipo}</td>}
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
