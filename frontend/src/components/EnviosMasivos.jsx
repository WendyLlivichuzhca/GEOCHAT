import React, { useEffect, useMemo, useState } from 'react';
import {
  Filter,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  FileText,
  Trash2,
  RefreshCw,
  X,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const buildAuthHeaders = (user) => {
  const headers = {};
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  }
  return headers;
};

const formatScheduleLabel = (item) => {
  if (item.estado === 'borrador') {
    return 'Borrador';
  }
  if (!item.programado_para) {
    return 'Enviar ahora';
  }
  try {
    const dt = new Date(item.programado_para);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${dt.getFullYear()} · ${hours}:${minutes}`;
  } catch {
    return item.programado_para;
  }
};

const getStatusBadge = (estado) => {
  switch (estado) {
    case 'borrador':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Borrador
        </span>
      );
    case 'programado':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-100">
          Programado
        </span>
      );
    case 'enviando':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 border border-amber-100">
          <Loader2 size={12} className="animate-spin" />
          Enviando
        </span>
      );
    case 'completado':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
          <CheckCircle size={12} />
          Completado
        </span>
      );
    case 'fallido':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 border border-rose-100">
          <AlertCircle size={12} />
          Fallido
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {estado}
        </span>
      );
  }
};

const EnviosMasivos = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('creado_en');
  const [sortOrder, setSortOrder] = useState('desc');

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);

  const loadCampaigns = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/envios_masivos?user_id=${user.id}&search=${encodeURIComponent(searchTerm)}&limit=${limit}&offset=${offset}`,
        {
          headers: buildAuthHeaders(user),
        }
      );
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setCampaigns(result.data);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error('Error cargando envíos masivos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [user, limit, offset]);

  // Recarga al pulsar enter en la búsqueda
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      loadCampaigns();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPage(1);
    // Para recargar inmediatamente
    setTimeout(() => {
      loadCampaigns();
    }, 50);
  };

  const handleCancelCampaign = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta campaña programada? Se guardará como borrador.')) return;
    try {
      const response = await fetch(`${API_URL}/api/envios_masivos/${id}/cancelar`, {
        method: 'POST',
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (result.success) {
        loadCampaigns();
      } else {
        alert(result.message || 'Error al cancelar la campaña');
      }
    } catch (error) {
      console.error('Error cancelando campaña:', error);
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta campaña permanentemente? Esto también eliminará el historial de destinatarios.')) return;
    try {
      const response = await fetch(`${API_URL}/api/envios_masivos/${id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (result.success) {
        loadCampaigns();
      } else {
        alert(result.message || 'Error al eliminar la campaña');
      }
    } catch (error) {
      console.error('Error eliminando campaña:', error);
    }
  };

  // Ordenar en memoria
  const sortedCampaigns = useMemo(() => {
    const list = [...campaigns];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'programado_para') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [campaigns, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex min-h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7">
          
          {/* Header */}
          <div className="mb-7 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-slate-900">
                Envíos masivos a contactos
              </h1>
              <p className="mt-2 max-w-3xl text-[15px] text-slate-500">
                Envía mensajes a todos tus contactos de forma segmentada.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/envios-masivos/crear')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#5c5dfb] px-7 text-base font-semibold text-white transition hover:bg-[#4748db] shadow-md shadow-indigo-100"
            >
              <Plus size={18} />
              Crear envío masivo
            </button>
          </div>

          {/* Filtros */}
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-[520px]">
              <Search
                size={19}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Buscar por nombre"
                className="h-12 w-full rounded-full border border-slate-200 bg-white pl-14 pr-5 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-5">
              {(searchTerm) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[14px] font-semibold text-[#5c5dfb] hover:text-[#4748db] transition"
                >
                  Limpiar todos los filtros
                </button>
              )}
              
              <button
                type="button"
                onClick={loadCampaigns}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold text-[#22223e] shadow-sm transition hover:bg-slate-50"
              >
                <Filter size={18} />
                Filtrar
              </button>

              <button
                type="button"
                onClick={loadCampaigns}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#22223e] shadow-sm transition hover:bg-slate-50"
                title="Actualizar tabla"
              >
                <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Contenido / Listado */}
          <section className="rounded-[1.8rem] border border-slate-100 bg-white overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <Loader2 size={36} className="animate-spin text-indigo-500" />
                <p className="mt-4 text-[15px] text-slate-500 font-medium">Cargando campañas masivas...</p>
              </div>
            ) : sortedCampaigns.length === 0 ? (
              <div className="flex min-h-[350px] flex-col items-center justify-center text-center p-8">
                {/* SVG Icon matching empty state style */}
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 mb-5">
                  <FileText size={32} />
                </div>
                <h3 className="text-[18px] font-bold text-slate-700">No hay datos para mostrar</h3>
                <p className="mt-1 text-[14px] text-slate-400 font-medium">No se encontraron registros</p>
                <button
                  type="button"
                  onClick={() => navigate('/envios-masivos/crear')}
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-base font-semibold text-[#22223e] shadow-sm transition hover:bg-slate-50"
                >
                  <Plus size={18} />
                  Crear primer envío masivo
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      <th className="px-6 py-4.5 cursor-pointer select-none hover:text-slate-600 transition" onClick={() => handleSort('nombre')}>
                        <div className="flex items-center gap-1.5">
                          Nombre
                          {sortField === 'nombre' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </div>
                      </th>
                      <th className="px-6 py-4.5">Dispositivo</th>
                      <th className="px-6 py-4.5 cursor-pointer select-none hover:text-slate-600 transition" onClick={() => handleSort('programado_para')}>
                        <div className="flex items-center gap-1.5">
                          Fecha para envío
                          {sortField === 'programado_para' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </div>
                      </th>
                      <th className="px-6 py-4.5">Contactos</th>
                      <th className="px-6 py-4.5">Estado</th>
                      <th className="px-6 py-4.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCampaigns.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition duration-150 last:border-b-0"
                      >
                        <td className="px-6 py-4.5">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold text-slate-800">{item.nombre}</p>
                            <p className="truncate text-xs text-slate-400 mt-0.5">{item.mensaje?.substring(0, 50)}...</p>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-sm font-semibold text-slate-500">
                          {item.dispositivo_nombre}
                        </td>
                        <td className="px-6 py-4.5 text-sm font-semibold text-slate-500">
                          {formatScheduleLabel(item)}
                        </td>
                        <td className="px-6 py-4.5 text-sm font-semibold text-slate-500">
                          <div className="flex items-center gap-2">
                            <span>{item.total_contactos}</span>
                            {(item.estado === 'enviando' || item.estado === 'completado' || item.estado === 'fallido') && (
                              <span className="text-xs text-slate-400">
                                ({item.total_enviados} ✓ · {item.total_fallidos} ✗)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          {getStatusBadge(item.estado)}
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.estado === 'programado' && (
                              <button
                                type="button"
                                onClick={() => handleCancelCampaign(item.id)}
                                className="inline-flex h-9 px-3 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 text-xs font-bold transition hover:bg-amber-100"
                                title="Cancelar envío y guardar como borrador"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCampaign(item.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition duration-150"
                              title="Eliminar campaña"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Paginación */}
          {!isLoading && sortedCampaigns.length > 0 && (
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
              <div className="flex items-center gap-3 text-slate-500 text-sm font-semibold">
                <span>Items por página</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-slate-700 outline-none focus:border-[#8f88ff]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3">
                <span className="text-sm font-semibold text-slate-500">
                  Página {page} de {totalPages} ({total} registros totales)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EnviosMasivos;
