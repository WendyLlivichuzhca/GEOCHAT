import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Filter,
  LayoutGrid,
  Plus,
  Search,
  ChevronRight,
  Clock3,
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

const MensajesProgramados = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!term) return scheduledMessages;

    return scheduledMessages.filter((item) => {
      const nombre = item.nombre?.toLowerCase() || '';
      const campana = item.campana?.toLowerCase() || '';
      const targetName = item.targetName?.toLowerCase() || '';
      return nombre.includes(term) || campana.includes(term) || targetName.includes(term);
    });
  }, [scheduledMessages, searchTerm]);

  const emptyState = scheduledMessages.length === 0;

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex min-h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
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
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#22223e] shadow-sm transition hover:bg-slate-50"
              >
                <LayoutGrid size={18} />
                Columnas
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#22223e] shadow-sm transition hover:bg-slate-50"
              >
                <Filter size={18} />
                Filtrar
              </button>
              <button
                type="button"
                onClick={loadMessages}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#22223e] shadow-sm transition hover:bg-slate-50"
                title="Actualizar mensajes"
              >
                <Calendar size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

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
                    <button
                      type="button"
                      onClick={() => navigate('/mensajes/crear', { state: { draft: item } })}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      title="Abrir mensaje"
                    >
                      <ChevronRight size={16} />
                    </button>
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
