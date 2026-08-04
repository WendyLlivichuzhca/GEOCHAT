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
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  Sliders,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../utils/authHeaders';
import Sidebar from './Sidebar';
import Header from './Header';

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
  const [isLoading, setIsLoading] = useState(false);

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

  const loadAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadTemplates(), loadDevices()]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
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

  // Métricas para tarjetas resumen KPI
  const totalCount = templates.length;
  const syncCount = templates.filter((t) => t.meta_status === 'APPROVED').length;
  const marketingCount = templates.filter((t) => t.categoria === 'Marketing').length;
  const utilidadCount = templates.filter((t) => t.categoria === 'Utilidad').length;

  return (
    <div className="flex min-h-screen bg-transparent font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-20 flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={onLogout} title="GeoChat" onRefresh={loadAll} isLoading={isLoading} />

        <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-w-0 space-y-5">

          {/* Cabecera Principal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Plantillas de mensaje</h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Gestiona las plantillas para tus mensajes y sincronízalas con tu dispositivo.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    title: '¿Sincronizar plantillas?',
                    message: 'Vamos a consultarle a Meta el estado real de tus plantillas (Pendiente, Aprobada o Rechazada). No se descarga ni se borra nada.',
                    onConfirm: handleSyncConfirm
                  });
                }}
                className="h-9 px-3.5 inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
              >
                <RefreshCw size={14} className="text-slate-500" />
                <span>Sincronizar</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/plantillas/crear')}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
              >
                <Plus size={15} />
                <span>Crear plantilla</span>
              </button>
            </div>
          </div>

          {notice && (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 shadow-2xs">
              {notice}
            </div>
          )}

          {/* Tarjetas KPI de Resumen Estilo Pastel */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
            <div className="flex h-fit items-center gap-3.5 rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/60 to-slate-50/30 p-3.5 shadow-2xs transition-all hover:shadow-xs">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 shadow-2xs">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Plantillas</p>
                <p className="text-lg font-black text-slate-800 tracking-tight leading-tight">{totalCount}</p>
                <p className="text-[10.5px] font-semibold text-indigo-600/80 mt-0.5">Registradas en sistema</p>
              </div>
            </div>

            <div className="flex h-fit items-center gap-3.5 rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/60 to-slate-50/30 p-3.5 shadow-2xs transition-all hover:shadow-xs">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-2xs">
                <CheckCircle size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Aprobadas por Meta</p>
                <p className="text-lg font-black text-slate-800 tracking-tight leading-tight">{syncCount}</p>
                <p className="text-[10.5px] font-semibold text-emerald-600/80 mt-0.5">Listas para envío</p>
              </div>
            </div>

            <div className="flex h-fit items-center gap-3.5 rounded-2xl border border-purple-100/80 bg-gradient-to-br from-purple-50/60 to-slate-50/30 p-3.5 shadow-2xs transition-all hover:shadow-xs">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 shadow-2xs">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Marketing</p>
                <p className="text-lg font-black text-slate-800 tracking-tight leading-tight">{marketingCount}</p>
                <p className="text-[10.5px] font-semibold text-purple-600/80 mt-0.5">Promocionales</p>
              </div>
            </div>

            <div className="flex h-fit items-center gap-3.5 rounded-2xl border border-amber-100/80 bg-gradient-to-br from-amber-50/60 to-slate-50/30 p-3.5 shadow-2xs transition-all hover:shadow-xs">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shadow-2xs">
                <Sliders size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Utilidad</p>
                <p className="text-lg font-black text-slate-800 tracking-tight leading-tight">{utilidadCount}</p>
                <p className="text-[10.5px] font-semibold text-amber-600/80 mt-0.5">Notificaciones</p>
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="mt-1 mb-2 flex flex-col lg:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 group max-w-md w-full">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full h-9 pl-10 pr-4 bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl outline-none text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-emerald-500/50 focus:bg-white transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterPanel((prev) => !prev)}
                  className={`h-9 px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold transition-all shadow-2xs border ${
                    showFilterPanel || categoryFilter !== 'Todos' || deviceFilter !== 'todos'
                      ? 'bg-emerald-50 text-emerald-600 font-bold border border-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <Filter size={14} />
                  <span>Filtrar</span>
                </button>

                {showFilterPanel && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFilterPanel(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 z-50 text-left flex flex-col gap-3 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Filtrar plantillas
                      </span>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Categoría</label>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-2xs"
                        >
                          <option value="Todos">Todas las categorías</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Utilidad">Utilidad</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Dispositivo</label>
                        <select
                          value={deviceFilter}
                          onChange={(e) => setDeviceFilter(e.target.value)}
                          className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-2xs"
                        >
                          <option value="todos">Todos los dispositivos</option>
                          {devices.map((device) => (
                            <option key={device.id} value={device.id}>
                              {device.nombre || `Dispositivo ${device.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {(search || categoryFilter !== 'Todos' || deviceFilter !== 'todos') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 px-3 flex items-center gap-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                >
                  <X size={14} />
                  <span>Limpiar todos los filtros</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Plantillas de Mensaje o Estado Vacío */}
          {filteredTemplates.length === 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-2xs shrink-0 py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3 shadow-2xs">
                <FileText size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">No hay plantillas de mensaje</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Crea tus plantillas de WhatsApp para realizar envíos y automatizaciones.
              </p>
              <button
                type="button"
                onClick={() => navigate('/plantillas/crear')}
                className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
              >
                <Plus size={15} />
                Crear plantilla
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-2xs shrink-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">NOMBRE</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CATEGORÍA</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">TIPO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ESTADO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">DISPOSITIVO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">FECHA DE CREACIÓN</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTemplates.map((template) => (
                      <tr key={template.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{template.nombre}</p>
                            <p className="text-[11px] font-semibold text-slate-400 truncate">{template.categoria || 'Sin categoría'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            template.categoria === 'Marketing'
                              ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                              : 'bg-blue-50 text-blue-700 border-blue-200/60'
                          }`}>
                            {template.categoria}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600">{template.tipo}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {(() => {
                            const status = template.meta_status;
                            const style =
                              status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : status === 'REJECTED' || status === 'ERROR'
                                ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                                : status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                                : 'bg-slate-100 text-slate-500 border-slate-200/60';
                            const label =
                              status === 'APPROVED'
                                ? 'Aprobada'
                                : status === 'REJECTED'
                                ? 'Rechazada'
                                : status === 'ERROR'
                                ? 'Error al enviar'
                                : status === 'PENDING'
                                ? 'Pendiente de aprobación'
                                : 'Sin enviar a Meta';
                            const detail = template.meta_rejected_reason || template.meta_sync_error || '';
                            return (
                              <span
                                title={detail || undefined}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${style}`}
                              >
                                <CheckCircle size={12} />
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-500">{template.dispositivo_nombre || 'Sin dispositivo'}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-500">{formatDate(template.fecha_creacion)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/plantillas/editar/${template.id}`)}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors border border-slate-200/60 shadow-2xs"
                              title="Editar plantilla"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(template.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-slate-200/60 shadow-2xs"
                              title="Eliminar plantilla"
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
          )}
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