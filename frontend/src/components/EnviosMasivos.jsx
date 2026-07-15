import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Filter,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  FileText,
  Trash2,
  X,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronsUpDown,
  ChevronDown
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

  // Popover State
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);
  const filterRef = useRef(null);

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
    const delayDebounce = setTimeout(() => {
      loadCampaigns();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [user, limit, offset, searchTerm]);

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterPopover(false);
        setShowLimitDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      loadCampaigns();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPage(1);
    setTimeout(() => {
      loadCampaigns();
    }, 50);
  };

  const handleCancelCampaign = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta campaña programada? Se guardará como borrador.')) return;
    try {
      const response = await fetch(`${API_URL}/api/envios_masivos/${id}/cancelar?user_id=${user.id}`, {
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
      const response = await fetch(`${API_URL}/api/envios_masivos/${id}?user_id=${user.id}`, {
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

  const renderSortIcon = (field) => {
    if (sortField === field) {
      return sortOrder === 'asc' ? (
        <span className="text-[#5c5dfb] ml-1.5 font-bold text-xs select-none">▲</span>
      ) : (
        <span className="text-[#5c5dfb] ml-1.5 font-bold text-xs select-none">▼</span>
      );
    }
    return <span className="text-slate-300 ml-1.5 font-medium text-xs select-none">◇</span>;
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-64 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] ml-64">
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
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#5c5dfb] px-7 text-base font-semibold text-white transition hover:bg-[#4748db] shadow-md shadow-sky-100"
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
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-14 pr-5 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
              />
            </div>

            {/* Menu de Filtros y Limpiar (Siempre visible) */}
            <div className="flex items-center justify-end gap-5 relative" ref={filterRef}>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[14px] font-semibold text-[#5c5dfb] hover:text-[#4748db] transition"
              >
                Limpiar todos los filtros
              </button>
              
              <button
                type="button"
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fafc] px-5 text-[15px] font-bold text-[#22223e] shadow-sm transition hover:bg-slate-100"
              >
                <Filter size={18} />
                Filtrar
              </button>

              {/* Popover de Filtros (Items por página) */}
              {showFilterPopover && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] z-50 animate-in fade-in duration-150">
                  <h4 className="text-xs font-bold text-slate-700 mb-2.5">
                    Items por página
                  </h4>
                  
                  {/* Select Personalizado */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLimitDropdown(!showLimitDropdown)}
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none"
                    >
                      <span>{limit}</span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>

                    {showLimitDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg z-50">
                        {[25, 50, 100].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setLimit(opt);
                              setPage(1);
                              setShowLimitDropdown(false);
                              setShowFilterPopover(false);
                            }}
                            className={`flex h-10 w-full items-center px-4 text-sm font-semibold transition ${
                              limit === opt
                                ? 'bg-slate-100 text-slate-800'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Listado */}
          <section className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <Loader2 size={36} className="animate-spin text-sky-500" />
                <p className="mt-4 text-[15px] text-slate-500 font-medium">Cargando campañas masivas...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      <th className="px-6 py-4.5 cursor-pointer select-none hover:text-slate-600 transition" onClick={() => handleSort('nombre')}>
                        <div className="flex items-center">
                          Nombre
                          {renderSortIcon('nombre')}
                        </div>
                      </th>
                      <th className="px-6 py-4.5">Dispositivo</th>
                      <th className="px-6 py-4.5 cursor-pointer select-none hover:text-slate-600 transition" onClick={() => handleSort('programado_para')}>
                        <div className="flex items-center">
                          Fecha para envío
                          {renderSortIcon('programado_para')}
                        </div>
                      </th>
                      <th className="px-6 py-4.5">Contactos</th>
                      <th className="px-6 py-4.5">Estado</th>
                      <th className="px-6 py-4.5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="flex min-h-[300px] flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 mb-5">
                              <FileText size={32} />
                            </div>
                            <h3 className="text-[17px] font-bold text-slate-700">No hay datos para mostrar</h3>
                          </div>
                        </td>
                      </tr>
                    ) : sortedCampaigns.map((item) => (
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

          {/* Registros no encontrados / Paginación */}
          {!isLoading && (
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
              <div className="flex items-center gap-3 text-slate-500 text-sm font-bold">
                {sortedCampaigns.length === 0 ? (
                  <span>No se encontraron registros</span>
                ) : (
                  <span>Registros totales: {total}</span>
                )}
              </div>

              {sortedCampaigns.length > 0 && (
                <div className="flex items-center justify-end gap-3">
                  <span className="text-sm font-semibold text-slate-500">
                    Página {page} de {totalPages}
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
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EnviosMasivos;
