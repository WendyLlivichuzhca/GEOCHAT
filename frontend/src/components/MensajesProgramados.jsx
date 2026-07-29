import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Filter,
  LayoutGrid,
  Plus,
  Search,
  ChevronRight,
  Clock3,
  Trash2,
  Send,
  Zap,
  FileText,
  Sparkles,
  Lightbulb,
  MessageCircle,
  Pencil,
  Clock
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
  if (item.status === 'Borrador') {
    return 'Borrador';
  }

  if (item.opcionEnvio === 'ahora') {
    return 'Enviar ahora';
  }

  return `${item.fecha || '--/--/----'} • ${item.hora || '--:--'} UTC`;
};

const formatTypeLabel = (value) => {
  if (value === 'grupo') return 'Grupo';
  return 'Campaña';
};

const parseScheduleDate = (value) => {
  if (!value) return null;
  const [day, month, year] = String(value).split('/').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
};

const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const MensajesProgramados = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [calendarFilter, setCalendarFilter] = useState('todos');
  const [compactColumns, setCompactColumns] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);

  const loadMessages = async () => {
    if (API_URL && user?.id) {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/scheduled_messages?user_id=${user.id}`, {
          headers: buildAuthHeaders(user),
        });
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setScheduledMessages(result.data);
          return;
        }
      } catch (error) {
        console.warn('No se pudo cargar la API, usando localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    }

    try {
      const saved = localStorage.getItem('geochat_mensajes_programados');
      setScheduledMessages(saved ? JSON.parse(saved) : []);
    } catch (error) {
      console.error('No se pudo cargar mensajes programados:', error);
      setScheduledMessages([]);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [user]);

  const filteredMessages = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return scheduledMessages.filter((item) => {
      const nombre = item.nombre?.toLowerCase() || '';
      const campana = item.campana?.toLowerCase() || '';
      const targetName = item.targetName?.toLowerCase() || '';
      const status = String(item.status || 'Programado').toLowerCase();
      const matchesTerm = !term || nombre.includes(term) || campana.includes(term) || targetName.includes(term);
      const matchesStatus = statusFilter === 'todos' || status === statusFilter;
      const matchesDate =
        dateFilter === 'todos' ||
        (dateFilter === 'programados' && item.opcionEnvio === 'programar') ||
        (dateFilter === 'ahora' && item.opcionEnvio === 'ahora');
      const scheduleDate = parseScheduleDate(item.fecha);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const matchesCalendar =
        calendarFilter === 'todos' ||
        (calendarFilter === 'hoy' && isSameDay(scheduleDate, today)) ||
        (calendarFilter === 'proximos' && scheduleDate && scheduleDate >= today) ||
        (calendarFilter === 'vencidos' && scheduleDate && scheduleDate < today);
      return matchesTerm && matchesStatus && matchesDate && matchesCalendar;
    });
  }, [scheduledMessages, searchTerm, statusFilter, dateFilter, calendarFilter]);

  const emptyState = scheduledMessages.length === 0;

  // Estadísticas KPI calculadas dinámicamente
  const totalCount = scheduledMessages.length;
  
  const scheduledCount = useMemo(() => {
    return scheduledMessages.filter(m => (m.opcionEnvio === 'programar' || m.status === 'Programado') && m.status !== 'Borrador').length;
  }, [scheduledMessages]);

  const scheduledPct = useMemo(() => {
    return totalCount > 0 ? Math.round((scheduledCount / totalCount) * 100) : 0;
  }, [totalCount, scheduledCount]);

  const nowCount = useMemo(() => {
    return scheduledMessages.filter(m => m.opcionEnvio === 'ahora').length;
  }, [scheduledMessages]);

  const nowPct = useMemo(() => {
    return totalCount > 0 ? Math.round((nowCount / totalCount) * 100) : 0;
  }, [totalCount, nowCount]);

  const draftCount = useMemo(() => {
    return scheduledMessages.filter(m => m.status === 'Borrador').length;
  }, [scheduledMessages]);

  const draftPct = useMemo(() => {
    return totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0;
  }, [totalCount, draftCount]);

  const groupTypeCount = useMemo(() => {
    return scheduledMessages.filter(m => m.tipoEnvio === 'grupo').length;
  }, [scheduledMessages]);

  const groupTypePct = useMemo(() => {
    return totalCount > 0 ? Math.round((groupTypeCount / totalCount) * 100) : 0;
  }, [totalCount, groupTypeCount]);

  const campaignTypeCount = useMemo(() => {
    return Math.max(0, totalCount - groupTypeCount);
  }, [totalCount, groupTypeCount]);

  const deleteMessage = async (item) => {
    const shouldDelete = window.confirm(`¿Eliminar "${item.nombre || 'mensaje'}"?`);
    if (!shouldDelete) return;

    if (API_URL && user?.id) {
      try {
        await fetch(`${API_URL}/api/scheduled_messages/${item.id}?user_id=${user.id}`, {
          method: 'DELETE',
          headers: buildAuthHeaders(user),
        });
      } catch (error) {
        console.warn('No se pudo eliminar en la API, se eliminara localmente:', error);
      }
    }

    const next = scheduledMessages.filter((message) => message.id !== item.id);
    setScheduledMessages(next);
    localStorage.setItem('geochat_mensajes_programados', JSON.stringify(next));
  };

  return (
    <div className="flex min-h-screen bg-transparent font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-24 mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-h-full">
          {/* Header Superior */}
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-0.5">
                Mensajes programados
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Envía mensajes programados a todos tus grupos y comunidades de WhatsApp de manera automática.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/mensajes/crear')}
              className="h-9 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:shadow-md transition-all flex items-center gap-2 shadow-xs shrink-0"
            >
              <Plus size={15} />
              Nuevo mensaje
            </button>
          </div>

          {/* 4 Tarjetas KPI Destacadas (Diseño Delgado, Pequeño y Delicado) */}
          <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
            {/* Card 1: TOTAL PROGRAMADOS */}
            <div className="group relative overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-br from-[#eefbf5] via-[#e6f7f0] to-[#d5f3e7] p-3.5 px-4 shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#00a86b] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                    <Send size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-emerald-800/70 uppercase tracking-widest block mb-0.5">TOTAL MENSAJES</span>
                    <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{totalCount}</div>
                    <span className="text-[10px] font-black text-[#00a86b] block">100% del total</span>
                  </div>
                </div>
                <div className="w-10 h-6 shrink-0 self-end mb-0.5">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <path d="M2 26 C 14 26, 24 16, 38 18 C 50 20, 56 6, 62 4" stroke="#00a86b" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: PROGRAMADOS */}
            <div className="group relative overflow-hidden rounded-xl border border-blue-200/70 bg-gradient-to-br from-[#eff6ff] via-[#e0f2fe] to-[#bae6fd] p-3.5 px-4 shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                    <Calendar size={15} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-blue-900/70 uppercase tracking-widest block mb-0.5">PROGRAMADOS</span>
                    <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{scheduledCount}</div>
                    <span className="text-[10px] font-black text-[#2563eb] block">{scheduledPct}% del total</span>
                  </div>
                </div>
                <div className="w-10 h-6 shrink-0 self-end mb-0.5">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <path d="M2 26 C 14 26, 26 22, 38 14 C 50 6, 56 16, 62 10" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: ENVIAR AHORA */}
            <div className="group relative overflow-hidden rounded-xl border border-purple-200/70 bg-gradient-to-br from-[#f5f3ff] via-[#ede9fe] to-[#ddd6fe] p-3.5 px-4 shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                    <Zap size={15} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-purple-900/70 uppercase tracking-widest block mb-0.5">ENVIAR AHORA</span>
                    <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{nowCount}</div>
                    <span className="text-[10px] font-black text-[#7c3aed] block">{nowPct}% del total</span>
                  </div>
                </div>
                <div className="w-10 h-6 shrink-0 self-end mb-0.5">
                  <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                    <path d="M2 24 C 16 28, 28 18, 40 20 C 52 22, 58 8, 62 6" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: BORRADORES */}
            <div className="group relative overflow-hidden rounded-xl border border-amber-200/70 bg-gradient-to-br from-[#fffdf5] via-[#fff7e6] to-[#feebc8] p-3.5 px-4 shadow-2xs hover:shadow-xs transition-all duration-300">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#d97706] text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                    <FileText size={15} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-amber-900/70 uppercase tracking-widest block mb-0.5">BORRADORES</span>
                    <div className="text-lg font-black text-slate-900 leading-none mb-0.5">{draftCount}</div>
                    <span className="text-[10px] font-black text-[#d97706] block">{draftPct}% del total</span>
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

          {/* Buscador y Filtros (Diseño Compacto y Delicado) */}
          <div className="mt-1 mb-4 flex flex-col lg:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 group max-w-md w-full">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre o campaña..."
                className="w-full h-9 pl-10 pr-4 bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl outline-none text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-emerald-500/50 focus:bg-white transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCompactColumns((prev) => !prev)}
                className={`h-9 px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold transition-all shadow-2xs border ${
                  compactColumns
                    ? 'bg-slate-800 text-white border-slate-800 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/60'
                }`}
              >
                {compactColumns ? <Check size={14} /> : <LayoutGrid size={14} />}
                <span>Columnas</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className={`h-9 px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                    showFilters || statusFilter !== 'todos' || dateFilter !== 'todos'
                      ? 'bg-emerald-50 text-emerald-600 font-bold border border-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <Filter size={14} />
                  <span>Filtrar</span>
                </button>

                {/* Popover Flotante de Filtros */}
                {showFilters && (
                  <div className="absolute right-0 top-full z-40 mt-1.5 w-72 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                        Estado del mensaje
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          ['todos', 'Todos'],
                          ['programado', 'Programados'],
                          ['borrador', 'Borradores'],
                          ['enviar ahora', 'Enviar ahora'],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setStatusFilter(value)}
                            className={`h-7 rounded-lg px-2.5 text-[11px] font-bold transition ${
                              statusFilter === value
                                ? 'bg-emerald-500 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                        Opción de envío
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          ['todos', 'Cualquiera'],
                          ['programados', 'Programados'],
                          ['ahora', 'Enviar ahora'],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setDateFilter(value)}
                            className={`h-7 rounded-lg px-2.5 text-[11px] font-bold transition ${
                              dateFilter === value
                                ? 'bg-emerald-500 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(statusFilter !== 'todos' || dateFilter !== 'todos') && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('todos');
                            setDateFilter('todos');
                          }}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendarFilter((prev) => !prev)}
                  className={`h-9 w-9 flex items-center justify-center rounded-xl text-xs font-semibold transition-all shadow-2xs border ${
                    calendarFilter === 'todos'
                      ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/60'
                      : 'bg-emerald-50 text-emerald-600 font-bold border-emerald-300'
                  }`}
                  title="Filtrar por fecha"
                >
                  <Calendar size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
                {showCalendarFilter && (
                  <div className="absolute right-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200/80 bg-white py-1 shadow-xl text-xs">
                    {[
                      ['todos', 'Todas las fechas'],
                      ['hoy', 'Hoy'],
                      ['proximos', 'Próximos'],
                      ['vencidos', 'Vencidos'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setCalendarFilter(value);
                          setShowCalendarFilter(false);
                        }}
                        className={`flex h-8 w-full items-center px-3.5 text-left text-xs font-semibold transition ${
                          calendarFilter === value
                            ? 'bg-emerald-50 text-emerald-600 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabla de Mensajes Programados o Estado Vacío */}
          {filteredMessages.length === 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-2xs shrink-0 py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3 shadow-2xs">
                <Clock size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {emptyState ? 'No hay mensajes programados' : 'No se encontraron mensajes'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                {emptyState
                  ? 'Crea tu primer mensaje programado para enviarlo automáticamente a tus grupos o campañas.'
                  : 'Prueba cambiando los filtros de búsqueda o fecha para encontrar lo que necesitas.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/mensajes/crear')}
                className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
              >
                <Plus size={15} />
                {emptyState ? 'Crear primer mensaje' : 'Crear mensaje'}
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-2xs shrink-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">NOMBRE Y CAMPAÑA</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">TIPO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">PROGRAMACIÓN</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ESTADO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMessages.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{item.nombre}</p>
                            <p className="text-[11px] font-semibold text-slate-400 truncate">{item.targetName || item.campana || 'Sin campaña'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600">{formatTypeLabel(item.tipoEnvio)}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-500">{formatScheduleLabel(item)}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                            item.status === 'Borrador'
                              ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                              : item.opcionEnvio === 'ahora'
                              ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          }`}>
                            <Clock3 size={12} />
                            {item.status || 'Programado'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => navigate('/mensajes/crear', { state: { draft: item } })}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors border border-slate-200/60 shadow-2xs"
                              title="Abrir mensaje"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMessage(item)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-slate-200/60 shadow-2xs"
                              title="Eliminar mensaje"
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
      </main>
    </div>
  );
};

export default MensajesProgramados;
