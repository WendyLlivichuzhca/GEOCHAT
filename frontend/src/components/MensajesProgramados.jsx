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

  return `${item.fecha || '--/--/----'} · ${item.hora || '--:--'} UTC`;
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
        console.warn('No se pudo eliminar en la API, se eliminará localmente:', error);
      }
    }

    const next = scheduledMessages.filter((message) => message.id !== item.id);
    setScheduledMessages(next);
    localStorage.setItem('geochat_mensajes_programados', JSON.stringify(next));
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-80 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] ml-80">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7">
          <div className="mb-7 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-slate-900">
                Mensajes programados
              </h1>
              <p className="mt-2 max-w-3xl text-[15px] text-slate-500">
                Envía mensajes programados a todos tus grupos y comunidades de WhatsApp de manera automática.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/mensajes/crear')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1b1b38] px-7 text-base font-semibold text-white transition hover:bg-[#111126]"
            >
              <Plus size={18} />
              Nuevo mensaje
            </button>
          </div>

          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-[520px]">
              <Search
                size={19}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre"
                className="h-12 w-full rounded-full border border-slate-200 bg-white pl-14 pr-5 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCompactColumns((prev) => !prev)}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-medium shadow-sm transition ${
                  compactColumns
                    ? 'border-[#1b1b38] bg-[#1b1b38] text-white'
                    : 'border-slate-200 bg-white text-[#22223e] hover:bg-slate-50'
                }`}
              >
                {compactColumns ? <Check size={18} /> : <LayoutGrid size={18} />}
                Columnas
              </button>
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-medium shadow-sm transition ${
                  showFilters
                    ? 'border-[#1b1b38] bg-[#1b1b38] text-white'
                    : 'border-slate-200 bg-white text-[#22223e] hover:bg-slate-50'
                }`}
              >
                <Filter size={18} />
                Filtrar
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendarFilter((prev) => !prev)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition ${
                    calendarFilter === 'todos'
                      ? 'border-slate-200 bg-white text-[#22223e] hover:bg-slate-50'
                      : 'border-[#1b1b38] bg-[#1b1b38] text-white'
                  }`}
                  title="Filtrar por fecha"
                >
                  <Calendar size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
                {showCalendarFilter && (
                  <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-[1rem] border border-slate-200 bg-white py-2 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                    {[
                      ['todos', 'Todas las fechas'],
                      ['hoy', 'Hoy'],
                      ['proximos', 'PrÃ³ximos'],
                      ['vencidos', 'Vencidos'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setCalendarFilter(value);
                          setShowCalendarFilter(false);
                        }}
                        className={`flex h-10 w-full items-center px-4 text-left text-sm transition ${
                          calendarFilter === value
                            ? 'bg-slate-100 text-slate-800'
                            : 'text-slate-500 hover:bg-slate-50'
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

          {showFilters && (
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[1.2rem] border border-slate-100 bg-slate-50 px-4 py-3">
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
                  className={`h-9 rounded-full px-4 text-sm font-medium transition ${
                    statusFilter === value
                      ? 'bg-[#1b1b38] text-white'
                      : 'bg-white text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="mx-1 h-6 w-px bg-slate-200" />
              {[
                ['todos', 'Cualquier fecha'],
                ['programados', 'Programar mensaje'],
                ['ahora', 'Enviar ahora'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDateFilter(value)}
                  className={`h-9 rounded-full px-4 text-sm font-medium transition ${
                    dateFilter === value
                      ? 'bg-[#1b1b38] text-white'
                      : 'bg-white text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <section className="rounded-[1.8rem] border border-dashed border-slate-200 bg-white px-6 py-8">
            {filteredMessages.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                <p className="text-[18px] font-medium text-slate-500">
                  {emptyState ? 'No hay mensajes programados' : 'No se encontraron mensajes'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/mensajes/crear')}
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-base font-medium text-[#22223e] shadow-sm transition hover:bg-slate-50"
                >
                  <Plus size={18} />
                  {emptyState ? 'Crear primer mensaje' : 'Crear mensaje'}
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.4rem] border border-slate-100">
                <div className="grid grid-cols-[1.7fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>Nombre</span>
                  <span>Tipo</span>
                  <span>Programación</span>
                  <span>Estado</span>
                  <span />
                </div>

                {filteredMessages.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1.7fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{item.nombre}</p>
                      <p className="truncate text-xs text-slate-400">{item.targetName || item.campana || 'Sin campaña'}</p>
                    </div>
                    <span className="text-sm text-slate-500">{formatTypeLabel(item.tipoEnvio)}</span>
                    <span className="text-sm text-slate-500">{formatScheduleLabel(item)}</span>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      <Clock3 size={13} />
                      {item.status || 'Programado'}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => deleteMessage(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                        title="Eliminar mensaje"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/mensajes/crear', { state: { draft: item } })}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        title="Abrir mensaje"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default MensajesProgramados;
