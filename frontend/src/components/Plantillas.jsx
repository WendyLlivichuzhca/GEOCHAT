import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, RefreshCw, Filter, Trash2, Edit3, FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../utils/authHeaders';
import Sidebar from './Sidebar';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const normalize = (value) => String(value || '').toLowerCase().trim();

export default function Plantillas({ user, onLogout }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [deviceFilter, setDeviceFilter] = useState('todos');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/plantillas?user_id=${user.id}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.plantillas)) {
          setTemplates(data.plantillas);
        } else {
          setTemplates([]);
        }
      } catch (err) {
        console.error('No se pudo cargar plantillas:', err);
        setTemplates([]);
      }
    };

    const loadDevices = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/dashboard/${user.id}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.dashboard?.dispositivos)) {
          setDevices(data.dashboard.dispositivos);
        }
      } catch (err) {
        console.warn('No se pudo cargar dispositivos:', err);
      }
    };

    loadTemplates();
    loadDevices();
  }, [user?.id]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(''), 2800);
    return () => clearTimeout(timeout);
  }, [notice]);

  const persistTemplates = (nextTemplates) => {
    setTemplates(nextTemplates);
  };

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => {
        const term = normalize(search);
        const matchesSearch =
          !term ||
          normalize(template.nombre).includes(term) ||
          normalize(template.categoria).includes(term) ||
          normalize(template.tipo).includes(term) ||
          normalize(template.dispositivo_nombre).includes(term);

        const matchesCategory = categoryFilter === 'Todos' || template.categoria === categoryFilter;
        const matchesDevice = deviceFilter === 'todos' || String(template.dispositivo_id) === String(deviceFilter);

        return matchesSearch && matchesCategory && matchesDevice;
      }),
    [templates, search, categoryFilter, deviceFilter]
  );

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/plantillas/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: user?.id }),
      });
      const data = await res.json();
      if (!data.success) {
        setNotice(data.message || 'No se pudo eliminar la plantilla');
        return;
      }
      persistTemplates(templates.filter((item) => item.id !== id));
      setNotice('Plantilla eliminada correctamente');
    } catch (err) {
      console.error('Error eliminando plantilla:', err);
      setNotice('No se pudo eliminar la plantilla');
    }
  };

  const handleSyncConfirm = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/plantillas/sync`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: user?.id }),
      });
      const data = await res.json();
      if (!data.success) {
        setNotice(data.message || 'No se pudo sincronizar');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      const refreshed = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/plantillas?user_id=${user.id}`, {
        headers: getAuthHeaders(),
      });
      const refreshedData = await refreshed.json();
      if (refreshedData.success && Array.isArray(refreshedData.plantillas)) {
        setTemplates(refreshedData.plantillas);
      }
      setShowSyncModal(false);
      setNotice('Plantillas sincronizadas correctamente');
    } catch (err) {
      console.error('Error sincronizando plantillas:', err);
      setNotice('No se pudo sincronizar');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('Todos');
    setDeviceFilter('todos');
    setShowFilterPanel(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f6] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-64 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] ml-64">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-w-0">
        <div className="mb-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-900">Plantillas de mensaje</h1>
              <p className="mt-2 text-sm text-slate-500">Gestiona las plantillas para tus mensajes y sincronízalas con tu dispositivo.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowSyncModal(true)}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#bae6fd] bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#0ea5e9] hover:text-[#1e40af]"
              >
                <RefreshCw size={18} /> Sincronizar
              </button>
              <button
                type="button"
                onClick={() => navigate('/plantillas/crear')}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0ea5e9] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0284c7]"
              >
                <Plus size={18} /> Crear plantilla
              </button>
            </div>
          </div>

          {notice && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
              {notice}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(320px,1fr)_auto]">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white pl-12 pr-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#f0f9ff]"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Filter size={18} /> Filtrar
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Limpiar todos los filtros
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Categoría
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#f0f9ff]"
                  >
                    <option>Todos</option>
                    <option>Marketing</option>
                    <option>Utilidad</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Dispositivo
                  <select
                    value={deviceFilter}
                    onChange={(e) => setDeviceFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#f0f9ff]"
                  >
                    <option value="todos">Todos los dispositivos</option>
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.nombre || `Dispositivo ${device.id}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-2xl mb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Dispositivo</th>
                  <th className="px-6 py-4">Fecha de creación</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((template) => (
                    <tr key={template.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{template.nombre}</div>
                        <div className="text-xs text-slate-400">{template.categoria}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{template.categoria}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{template.tipo}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${template.estado === 'Sincronizado' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {template.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{template.dispositivo_nombre || 'Sin dispositivo'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(template.fecha_creacion)}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/plantillas/editar/${template.id}`)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                          title="Editar plantilla"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(template.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600"
                          title="Eliminar plantilla"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                          <FileText size={32} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-bold text-slate-600">Ningún elemento encontrado</p>
                          <p className="text-xs text-slate-400">No se encontraron registros</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

      {showSyncModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowSyncModal(false)} />
          <div className="relative z-10 w-full max-w-xl rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sincronizar Plantillas</h2>
                <p className="mt-2 text-sm text-slate-500">¿Está seguro de ejecutar esta acción?</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSyncConfirm}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#0ea5e9] px-6 text-sm font-semibold text-white transition hover:bg-[#0284c7]"
              >
                Ejecutar acción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
