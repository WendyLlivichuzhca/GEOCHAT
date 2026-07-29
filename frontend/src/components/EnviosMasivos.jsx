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
  ChevronDown,
  ChevronUp,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Target,
  Clock,
  ShieldCheck
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
    return `${day}/${month}/${dt.getFullYear()} - ${hours}:${minutes}`;
  } catch {
    return item.programado_para;
  }
};

const getStatusBadge = (estado) => {
  switch (estado) {
    case 'borrador':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 border border-slate-200/50">
          Borrador
        </span>
      );
    case 'programado':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 border border-blue-100">
          Programado
        </span>
      );
    case 'enviando':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 border border-amber-100">
          <Loader2 size={11} className="animate-spin text-amber-500" />
          Enviando
        </span>
      );
    case 'completado':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 border border-emerald-100">
          <CheckCircle size={11} />
          Completado
        </span>
      );
    case 'fallido':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-500 border border-rose-100">
          <AlertCircle size={11} />
          Fallido
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 border border-slate-200">
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
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModalMessage, setAlertModalMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

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

  const handleCancelCampaign = (id) => {
    setConfirmModal({
      title: '¿Cancelar envío masivo?',
      message: '¿Estás seguro de que deseas cancelar esta campaña programada? Se guardará como borrador.',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_URL}/api/envios_masivos/${id}/cancelar?user_id=${user.id}`, {
            method: 'POST',
            headers: buildAuthHeaders(user)
          });
          const data = await response.json();
          if (data.success) {
            loadCampaigns();
          } else {
            setAlertModalMessage(data.message || 'No se pudo cancelar la campaña.');
          }
        } catch (err) {
          console.error(err);
          setAlertModalMessage('Error de red al intentar cancelar la campaña.');
        }
      }
    });
  };

  const handleDeleteCampaign = (id) => {
    setConfirmModal({
      title: '¿Eliminar envío masivo?',
      message: '¿Estás seguro de que deseas eliminar esta campaña permanentemente? Esto también eliminará el historial de destinatarios.',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_URL}/api/envios_masivos/${id}?user_id=${user.id}`, {
            method: 'DELETE',
            headers: buildAuthHeaders(user)
          });
          const data = await response.json();
          if (data.success) {
            loadCampaigns();
          } else {
            setAlertModalMessage(data.message || 'No se pudo eliminar la campaña.');
          }
        } catch (err) {
          console.error(err);
          setAlertModalMessage('Error de red al intentar eliminar la campaña.');
        }
      }
    });
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

  const stats = useMemo(() => {
    const totalEnvios = total || campaigns.length;
    const totalContactos = campaigns.reduce((acc, c) => acc + (Number(c.total_contactos) || 0), 0);
    const totalExitosos = campaigns.reduce((acc, c) => acc + (Number(c.total_enviados) || 0), 0);
    const totalFallidos = campaigns.reduce((acc, c) => acc + (Number(c.total_fallidos) || 0), 0);

    const percentExitosos = totalContactos > 0 ? Math.round((totalExitosos / totalContactos) * 100) : 0;
    const percentFallidos = totalContactos > 0 ? Math.round((totalFallidos / totalContactos) * 100) : 0;

    return {
      totalEnvios,
      totalContactos,
      totalExitosos,
      totalFallidos,
      percentExitosos,
      percentFallidos
    };
  }, [campaigns, total]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(sortedCampaigns.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const renderSortIcon = (field) => {
    const isActive = sortField === field;
    return (
      <span className={"inline-flex items-center justify-center p-0.5 rounded-md ml-1.5 transition-colors " + (
        isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" : "text-slate-300 group-hover:text-slate-450"
      )}>
        {isActive ? (
          sortOrder === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        ) : (
          <ChevronsUpDown size={11} />
        )}
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex min-h-screen bg-slate-50/60 font-sans text-slate-900 selection:bg-emerald-100">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-[21rem] mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-200/70">
        <div className="flex-1 overflow-y-auto px-8 pb-10 pt-8 custom-scrollbar">

          {/* Header Superior Premium */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
                <Send size={24} className="-rotate-12 translate-x-0.5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Envíos masivos a contactos
                </h1>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Envía mensajes a todos tus contactos de forma segmentada y efectiva.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/envios-masivos/crear')}
              className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 text-xs font-bold text-white transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Plus size={18} strokeWidth={3} />
              Crear envío masivo
            </button>
          </div>

          {/* Tarjetas de Estadísticas KPI Premium */}
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Envíos Totales */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-all duration-300 group cursor-default">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
                    <Send size={20} className="-rotate-12" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">ENVÍOS TOTALES</span>
                    <div className="text-3xl font-black tracking-tight text-slate-900 leading-none">{stats.totalEnvios}</div>
                    <span className="text-[11px] font-bold text-slate-400 mt-1 block">En total</span>
                  </div>
                </div>
                <div className="w-16 h-10 text-emerald-500 shrink-0 self-center">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <defs>
                      <linearGradient id="emerald-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M2 28 C 16 28, 24 16, 40 18 C 52 20, 56 6, 62 4 L 62 32 L 2 32 Z" fill="url(#emerald-grad)" />
                    <path d="M2 28 C 16 28, 24 16, 40 18 C 52 20, 56 6, 62 4" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Contactos Totales */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-all duration-300 group cursor-default">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                    <Users size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">CONTACTOS TOTALES</span>
                    <div className="text-3xl font-black tracking-tight text-slate-900 leading-none">{stats.totalContactos}</div>
                    <span className="text-[11px] font-bold text-slate-400 mt-1 block">En total</span>
                  </div>
                </div>
                <div className="w-16 h-10 text-blue-500 shrink-0 self-center">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <defs>
                      <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M2 26 C 14 26, 26 22, 38 14 C 50 6, 56 16, 62 10 L 62 32 L 2 32 Z" fill="url(#blue-grad)" />
                    <path d="M2 26 C 14 26, 26 22, 38 14 C 50 6, 56 16, 62 10" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Envíos Exitosos */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-all duration-300 group cursor-default">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">ENVÍOS EXITOSOS</span>
                    <div className="text-3xl font-black tracking-tight text-slate-900 leading-none">{stats.totalExitosos}</div>
                    <span className="text-[11px] font-bold text-emerald-600 mt-1 block">{stats.percentExitosos}% <span className="font-semibold text-slate-400">del total</span></span>
                  </div>
                </div>
                <div className="w-16 h-10 text-emerald-500 shrink-0 self-center">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <path d="M2 28 C 16 28, 28 20, 42 16 C 52 12, 58 6, 62 4 L 62 32 L 2 32 Z" fill="url(#emerald-grad)" />
                    <path d="M2 28 C 16 28, 28 20, 42 16 C 52 12, 58 6, 62 4" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: Envíos Fallidos */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-all duration-300 group cursor-default">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-400" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform duration-300">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">ENVÍOS FALLIDOS</span>
                    <div className="text-3xl font-black tracking-tight text-slate-900 leading-none">{stats.totalFallidos}</div>
                    <span className="text-[11px] font-bold text-rose-500 mt-1 block">{stats.percentFallidos}% <span className="font-semibold text-slate-400">del total</span></span>
                  </div>
                </div>
                <div className="w-16 h-10 text-rose-500 shrink-0 self-center">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <defs>
                      <linearGradient id="rose-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M2 28 C 18 28, 28 24, 40 20 C 50 16, 56 12, 62 6 L 62 32 L 2 32 Z" fill="url(#rose-grad)" />
                    <path d="M2 28 C 18 28, 28 24, 40 20 C 50 16, 56 12, 62 6" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros Card Container */}
          <div className="mb-7 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative w-full max-w-lg">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Buscar por nombre, dispositivo o contacto..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white pl-11 pr-4 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
              />
            </div>

            {/* Menú de Filtros y Limpiar */}
            <div className="flex items-center gap-3 relative shrink-0" ref={filterRef}>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
              >
                <Trash2 size={15} className="text-slate-400" />
                Limpiar filtros
              </button>

              <button
                type="button"
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-100/70 px-4 text-xs font-bold text-emerald-700 shadow-2xs transition-all cursor-pointer"
              >
                <Filter size={15} className="text-emerald-600" />
                Filtrar
                <ChevronDown size={14} className="text-emerald-500 ml-0.5" />
              </button>

              {/* Popover de Filtros */}
              {showFilterPopover && (
                <div className="absolute right-0 top-full mt-2.5 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl z-50 animate-in fade-in duration-150">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">
                    Items por página
                  </h4>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLimitDropdown(!showLimitDropdown)}
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300"
                    >
                      <span>{limit} por página</span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>

                    {showLimitDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl z-50">
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
                            className={`flex h-10.5 w-full items-center px-4 text-xs font-bold transition cursor-pointer ${limit === opt
                                ? 'bg-emerald-50 text-emerald-700 font-extrabold'
                                : 'text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            {opt} por página
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Registros Premium */}
          <section className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
            {isLoading ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <Loader2 size={40} className="animate-spin text-emerald-500" />
                <p className="mt-4 text-xs font-bold text-slate-600">Cargando envíos masivos...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <th className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={sortedCampaigns.length > 0 && selectedIds.length === sortedCampaigns.length}
                          onChange={handleSelectAll}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-800 transition" onClick={() => handleSort('nombre')}>
                        <div className="flex items-center gap-1.5">
                          NOMBRE
                          {renderSortIcon('nombre')}
                        </div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-800 transition" onClick={() => handleSort('dispositivo_nombre')}>
                        <div className="flex items-center gap-1.5">
                          DISPOSITIVO
                          {renderSortIcon('dispositivo_nombre')}
                        </div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-800 transition" onClick={() => handleSort('programado_para')}>
                        <div className="flex items-center gap-1.5">
                          FECHA PARA ENVÍO
                          {renderSortIcon('programado_para')}
                        </div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-800 transition" onClick={() => handleSort('total_contactos')}>
                        <div className="flex items-center gap-1.5">
                          CONTACTOS
                          {renderSortIcon('total_contactos')}
                        </div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-800 transition" onClick={() => handleSort('estado')}>
                        <div className="flex items-center gap-1.5">
                          ESTADO
                          {renderSortIcon('estado')}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right font-black">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          {/* Ilustración de Estado Vacío Ilustrada Premium */}
                          <div className="flex min-h-[420px] flex-col items-center justify-center text-center p-12 bg-gradient-to-b from-emerald-50/40 via-white to-white">
                            <div className="relative mb-6 flex items-center justify-center">
                              <div className="relative w-48 h-32 flex items-center justify-center">
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" fill="none">
                                  <circle cx="40" cy="30" r="18" fill="#d1fae5" opacity="0.6" />
                                  <circle cx="160" cy="35" r="20" fill="#d1fae5" opacity="0.6" />
                                  <circle cx="100" cy="95" r="16" fill="#ecfdf5" />
                                  <path d="M 25 70 Q 100 5 175 60" stroke="#a7f3d0" strokeWidth="2" strokeDasharray="5 5" />
                                </svg>

                                {/* Icono central glowing */}
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 z-10">
                                  <Send size={34} className="-rotate-12 translate-x-0.5" />
                                </div>

                                {/* Badges flotantes */}
                                <div className="absolute top-1 left-3 w-8 h-8 rounded-2xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center text-slate-500">
                                  <Users size={15} />
                                </div>
                                <div className="absolute top-2 right-4 w-8 h-8 rounded-2xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center text-slate-500">
                                  <FileText size={15} />
                                </div>
                                <div className="absolute bottom-2 right-10 w-7 h-7 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                  <CheckCircle2 size={15} />
                                </div>
                              </div>
                            </div>

                            <h3 className="text-lg font-black tracking-tight text-slate-900">No hay envíos registrados</h3>
                            <p className="text-xs font-medium text-slate-500 mt-1.5 max-w-md leading-relaxed">
                              Comienza creando tu primer envío masivo haciendo clic en el botón de la parte superior derecha.
                            </p>

                            <button
                              type="button"
                              onClick={() => navigate('/envios-masivos/crear')}
                              className="mt-6 inline-flex h-11 items-center justify-center gap-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Plus size={16} strokeWidth={3} />
                              Crear envío masivo
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : sortedCampaigns.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-100 transition duration-150 last:border-b-0 ${
                          selectedIds.includes(item.id) ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="w-12 px-4 py-4.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleSelectOne(item.id)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">{item.nombre}</p>
                            <p className="truncate text-[11px] font-medium text-slate-400 mt-0.5">{item.mensaje?.substring(0, 50)}...</p>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-xs font-semibold text-slate-600">
                          {item.dispositivo_nombre || 'Sin asignación'}
                        </td>
                        <td className="px-6 py-4.5 text-xs font-semibold text-slate-600">
                          {formatScheduleLabel(item)}
                        </td>
                        <td className="px-6 py-4.5 text-xs font-semibold text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{item.total_contactos}</span>
                            {(item.estado === 'enviando' || item.estado === 'completado' || item.estado === 'fallido') && (
                              <span className="text-[11px] text-slate-400 font-medium">
                                ({item.total_enviados} enviados • {item.total_fallidos} fallidos)
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
                                className="inline-flex h-8.5 px-3.5 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 text-xs font-bold transition hover:bg-amber-100 shadow-2xs cursor-pointer"
                                title="Cancelar envío y guardar como borrador"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCampaign(item.id)}
                              className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition cursor-pointer"
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

          {/* Paginación y Contador */}
          {!isLoading && (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
              <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                {sortedCampaigns.length === 0 ? (
                  <span>No se encontraron registros</span>
                ) : (
                  <span>Mostrando {sortedCampaigns.length} de {total} envíos</span>
                )}
              </div>

              {sortedCampaigns.length > 0 && (
                <div className="flex items-center justify-end gap-3">
                  <span className="text-xs font-bold text-slate-600">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3 Tarjetas Informativas Inferiores Premium */}
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Card 1: Segmenta tu audiencia */}
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-start gap-4.5 group cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
                <Target size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900">Segmenta tu audiencia</h3>
                <p className="mt-1.5 text-xs text-slate-500 font-medium leading-relaxed">
                  Usa filtros y etiquetas para enviar mensajes relevantes y aumentar la efectividad de tus campañas.
                </p>
              </div>
            </div>

            {/* Card 2: Programa tus envíos */}
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-start gap-4.5 group cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                <Clock size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900">Programa tus envíos</h3>
                <p className="mt-1.5 text-xs text-slate-500 font-medium leading-relaxed">
                  Agenda tus mensajes en el mejor horario para obtener más respuestas y mejorar tus resultados.
                </p>
              </div>
            </div>

            {/* Card 3: Revisa el estado */}
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-start gap-4.5 group cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900">Revisa el estado</h3>
                <p className="mt-1.5 text-xs text-slate-500 font-medium leading-relaxed">
                  Monitorea el estado de tus envíos en tiempo real y asegúrate de que todo esté correcto.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Modal de Confirmación */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
            <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">{confirmModal.message}</p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta */}
      {alertModalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Atención</h3>
            <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">{alertModalMessage}</p>
            <button
              type="button"
              onClick={() => setAlertModalMessage('')}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnviosMasivos;
