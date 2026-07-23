import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Filter,
  Trash2,
  Edit3,
  FileText,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../utils/authHeaders';
import Sidebar from './Sidebar';

const formatDate = (value) => {
  if (!value) return '-';
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
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModalMessage, setAlertModalMessage] = useState('');

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
    <div className="flex min-h-screen bg-transparent font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-[21rem] mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7 flex flex-col min-w-0 space-y-6">

          {/* Cabecera */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Plantillas de mensaje</h1>
              <p className="text-[13px] text-slate-400 font-medium mt-1">
                Gestiona las plantillas para tus mensajes y sincronízalas con tu dispositivo.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    title: '¿Sincronizar plantillas?',
                    message: '¿Estás seguro de ejecutar esta acción? Se descargarán todas las plantillas registradas en tu dispositivo.',
                    onConfirm: handleSyncConfirm
                  });
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-650 shadow-xs hover:bg-slate-50 transition active:scale-95"
              >
                <RefreshCw size={14} /> Sincronizar
              </button>
              <button
                type="button"
                onClick={() => navigate('/plantillas/crear')}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 text-[13px] font-semibold text-white shadow-xs transition active:scale-95"
              >
                <Plus size={16} /> Crear plantilla
              </button>
            </div>
          </div>

          {notice && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in duration-200">
              {notice}
            </div>
          )}

          {/* Buscador y Filtros */}
          <div className="grid gap-4 lg:grid-cols-[minmax(320px,1fr)_auto]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 h-10 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-emerald-500/30 rounded-xl text-[12px] font-normal text-slate-700 outline-none transition shadow-xs"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-4 text-xs font-bold text-slate-500 hover:bg-slate-50 transition shadow-xs"
              >
                <Filter size={14} /> Filtrar
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-500 hover:bg-slate-200 transition shadow-xs"
              >
                Limpiar todos los filtros
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xs grid gap-4 lg:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold text-slate-450 uppercase tracking-wider block">
                Categoría
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-11 text-[12px] font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-xs cursor-pointer"
                >
                  <option>Todos</option>
                  <option>Marketing</option>
                  <option>Utilidad</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-bold text-slate-450 uppercase tracking-wider block">
                Dispositivo
                <select
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-11 text-[12px] font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-xs cursor-pointer"
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
          )}

          {/* Tabla de Plantillas */}
          <div className="flex-1 overflow-y-auto min-h-0 border border-slate-150 rounded-2xl mb-4 overflow-hidden shadow-xs bg-white flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-[940px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/85 text-[10px] font-bold uppercase tracking-wider text-slate-450 border-b border-slate-150">
                    <th className="px-6 py-4 rounded-tl-2xl">Nombre</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Dispositivo</th>
                    <th className="px-6 py-4">Fecha de creación</th>
                    <th className="px-6 py-4 text-right rounded-tr-2xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((template) => (
                      <tr key={template.id} className="hover:bg-slate-50/40 transition duration-150 group">
                        <td className="px-6 py-4">
                          <div className="text-[13px] font-bold text-slate-700">{template.nombre}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{template.categoria}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-50 text-slate-500 border border-slate-200/50">
                            {template.categoria}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-50 text-slate-500 border border-slate-200/50">
                            {template.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase border ${template.estado === 'Sincronizado'
                              ? 'bg-emerald-50/80 border-emerald-100/50 text-emerald-600'
                              : 'bg-slate-50 border-slate-200/50 text-slate-500'
                            }`}>
                            {template.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-medium text-slate-500">
                          {template.dispositivo_nombre || 'Sin dispositivo'}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-400">
                          {formatDate(template.fecha_creacion)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/plantillas/editar/${template.id}`)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-150 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition duration-150 opacity-40 group-hover:opacity-100"
                              title="Editar plantilla"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(template.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-150 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition duration-150 opacity-40 group-hover:opacity-100"
                              title="Eliminar plantilla"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-0">
                        <div className="flex min-h-[340px] flex-col items-center justify-center text-center p-8">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center border border-emerald-100/50 mb-5 shadow-xs">
                            <FileText size={28} />
                          </div>
                          <h3 className="text-[14px] font-bold text-slate-800">No hay plantillas de mensaje</h3>
                          <p className="text-[11px] text-slate-400 mt-1.5 max-w-xs leading-normal font-medium">
                            Crea tus plantillas de WhatsApp para realizar envíos y automatizaciones.
                          </p>
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

      {/* Custom Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 text-xl">
              ❓
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1.5">{confirmModal.title}</h4>
            <p className="text-[12px] text-slate-550 leading-relaxed mb-6 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-505 hover:bg-slate-100 transition bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold transition active:scale-95 shadow-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModalMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 text-xl">
              ⚠️
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1.5">Atención</h4>
            <p className="text-[12px] text-slate-550 leading-relaxed mb-6 font-medium">
              {alertModalMessage}
            </p>
            <button
              type="button"
              onClick={() => setAlertModalMessage('')}
              className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold transition active:scale-95 shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}