import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Code2,
  Contact2,
  Eye,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Info,
  Italic,
  Link as LinkIcon,
  MessageCircle,
  Mic,
  Pin,
  Smile,
  Sparkles,
  Strikethrough,
  Trash2,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';
const STORAGE_KEY = 'geochat_mensajes_programados';
const DAY_LABELS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sa', 'do'];
const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const SHORT_MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAY_OPTIONS = [
  { key: 'L', label: 'L', name: 'Lunes', dayIndex: 1 },
  { key: 'M', label: 'M', name: 'Martes', dayIndex: 2 },
  { key: 'X', label: 'X', name: 'Miércoles', dayIndex: 3 },
  { key: 'J', label: 'J', name: 'Jueves', dayIndex: 4 },
  { key: 'V', label: 'V', name: 'Viernes', dayIndex: 5 },
  { key: 'S', label: 'S', name: 'Sábado', dayIndex: 6 },
  { key: 'D', label: 'D', name: 'Domingo', dayIndex: 0 },
];
const TYPE_OPTIONS = [
  { type: 'Mensaje', icon: MessageCircle },
  { type: 'Audio', icon: Mic },
  { type: 'Documento', icon: FileText },
  { type: 'Imagen/Video', icon: ImageIcon },
  { type: 'Link', icon: LinkIcon },
  { type: 'Encuesta', icon: ClipboardList },
  { type: 'Contacto', icon: Contact2 },
  { type: 'Evento', icon: CalendarRange },
];

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildAuthHeaders = (user, extraHeaders = {}) => {
  const headers = { ...extraHeaders };
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  }
  return headers;
};

const parseDateString = (value) => {
  if (!value) return new Date();
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) return new Date();
  return new Date(year, month - 1, day);
};

const formatDate = (date) => {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const formatMonthChip = (date) => {
  return `${String(date.getDate()).padStart(2, '0')} ${SHORT_MONTH_NAMES[date.getMonth()]}`;
};

const formatDateTimeForInput = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const buildDefaultEventDate = (baseDate, time) => {
  const eventDate = new Date(baseDate);
  const [hours, minutes] = time.split(':').map(Number);
  eventDate.setHours((hours + 1) % 24, minutes || 0, 0, 0);
  return formatDateTimeForInput(eventDate);
};

const createEmptyBlock = (type, baseDate, time) => {
  const shared = {
    id: createId(),
    type,
    mentionAll: false,
    pin: false,
  };

  switch (type) {
    case 'Mensaje':
      return { ...shared, content: '' };
    case 'Audio':
      return { ...shared };
    case 'Documento':
      return { ...shared };
    case 'Imagen/Video':
      return { ...shared, caption: '' };
    case 'Link':
      return { ...shared, message: '', title: '', description: '', link: 'https://' };
    case 'Encuesta':
      return { ...shared, question: '', options: ['', '', ''] };
    case 'Contacto':
      return { ...shared, name: '', phone: '' };
    case 'Evento':
      return {
        ...shared,
        title: '',
        description: '',
        eventDate: buildDefaultEventDate(baseDate, time),
        location: '',
      };
    default:
      return { ...shared, content: '' };
  }
};

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
      checked ? 'bg-[#1f2240]' : 'bg-slate-200'
    }`}
  >
    <span
      className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

function MiniCalendar({ selectedDate, onChange, onClose }) {
  const initialDate = selectedDate || new Date();
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
      return;
    }
    setViewMonth((prev) => prev - 1);
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
      return;
    }
    setViewMonth((prev) => prev + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const firstWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let index = firstWeekday - 1; index >= 0; index -= 1) {
    cells.push({ day: daysInPrevMonth - index, current: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, current: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - daysInMonth - firstWeekday + 1, current: false });
  }

  const isSelected = (cell) =>
    cell.current &&
    selectedDate &&
    cell.day === selectedDate.getDate() &&
    viewMonth === selectedDate.getMonth() &&
    viewYear === selectedDate.getFullYear();

  return (
    <div className="absolute left-0 top-full z-40 mt-2 w-[290px] rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-[13px] font-semibold capitalize text-slate-700">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-slate-400">
        {DAY_LABELS.map((day) => (
          <span key={day} className="py-1 lowercase">
            {day}
          </span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
        {cells.map((cell, index) => (
          <button
            key={`${cell.day}-${index}`}
            type="button"
            disabled={!cell.current}
            onClick={() => {
              const next = new Date(viewYear, viewMonth, cell.day);
              next.setHours(selectedDate?.getHours() || 0, selectedDate?.getMinutes() || 0, 0, 0);
              onChange(next);
              onClose();
            }}
            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${
              cell.current
                ? isSelected(cell)
                  ? 'bg-[#171a31] text-white'
                  : 'text-slate-500 hover:bg-slate-100'
                : 'cursor-default text-slate-200'
            }`}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimePopover({ value, onChange, onClose }) {
  const [hour, minute] = value.split(':').map(Number);
  const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

  const selectHour = (nextHour) => {
    onChange(`${nextHour}:${String(minute).padStart(2, '0')}`);
  };

  const selectMinute = (nextMinute) => {
    onChange(`${String(hour).padStart(2, '0')}:${nextMinute}`);
  };

  return (
    <div className="absolute left-0 top-full z-40 mt-2 flex w-[178px] overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
      <div className="max-h-64 flex-1 overflow-y-auto border-r border-slate-100 py-1">
        {hours.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => selectHour(item)}
            className={`flex h-9 w-full items-center justify-center text-sm transition ${
              item === String(hour).padStart(2, '0')
                ? 'bg-[#2563eb] text-white'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="max-h-64 flex-1 overflow-y-auto py-1">
        {minutes.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => selectMinute(item)}
            className={`flex h-9 w-full items-center justify-center text-sm transition ${
              item === String(minute).padStart(2, '0')
                ? 'bg-[#2563eb] text-white'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200"
      >
        <X size={12} />
      </button>
    </div>
  );
}

const Toolbar = ({ onAction }) => {
  const buttons = [
    { key: 'emoji', icon: Smile },
    { key: 'bold', icon: Bold },
    { key: 'italic', icon: Italic },
    { key: 'strike', icon: Strikethrough },
    { key: 'code', icon: Code2 },
    { key: 'sparkle', icon: Sparkles },
  ];

  return (
    <div className="flex items-center gap-4 text-slate-400">
      {buttons.map(({ key, icon: Icon }) => (
        <button key={key} type="button" onClick={() => onAction(key)} className="transition hover:text-slate-700">
          <Icon size={17} />
        </button>
      ))}
    </div>
  );
};

const CrearMensaje = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const calendarRef = useRef(null);
  const endCalendarRef = useRef(null);
  const timeRef = useRef(null);
  const campaignRef = useRef(null);
  const frequencyRef = useRef(null);

  const [tipoEnvio, setTipoEnvio] = useState('campana');
  const [nombre, setNombre] = useState('');
  const [campana, setCampana] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [scheduledOptions, setScheduledOptions] = useState({ campaigns: [], groups: [], devices: [] });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [velocidad, setVelocidad] = useState('rapido');
  const [opcionEnvio, setOpcionEnvio] = useState('programar');
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 3, 29, 18, 0, 0, 0));
  const [hora, setHora] = useState('18:00');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePopover, setShowTimePopover] = useState(false);
  const [repetir, setRepetir] = useState(false);
  const [frecuencia, setFrecuencia] = useState('Semanal');
  const [showFrequencyMenu, setShowFrequencyMenu] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState(['L', 'X', 'V']);
  const [repetirCada, setRepetirCada] = useState(1);
  const [finalizarOp, setFinalizarOp] = useState('despues');
  const [repeticiones, setRepeticiones] = useState(4);
  const [finalizarFecha, setFinalizarFecha] = useState(new Date(2026, 4, 6, 18, 0, 0, 0));
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [soloLlenos, setSoloLlenos] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [draggingBlockId, setDraggingBlockId] = useState(null);

  useEffect(() => {
    const draft = location.state?.draft;
    if (!draft) return;

    setTipoEnvio(draft.tipoEnvio || 'campana');
    setNombre(draft.nombre || '');
    setCampana(draft.campana || '');
    setSelectedTargetId(draft.targetId || '');
    setSelectedDeviceId(draft.dispositivoId || null);
    setVelocidad(draft.velocidad || 'rapido');
    setOpcionEnvio(draft.opcionEnvio || 'programar');
    setSelectedDate(parseDateString(draft.fecha));
    setHora(draft.hora || '18:00');
    setRepetir(Boolean(draft.repetir));
    setFrecuencia(draft.frecuencia || 'Semanal');
    setDiasSeleccionados(draft.diasSeleccionados?.length ? draft.diasSeleccionados : ['L', 'X', 'V']);
    setRepetirCada(draft.repetirCada || 1);
    setFinalizarOp(draft.finalizarOp || 'despues');
    setRepeticiones(draft.repeticiones || 4);
    setFinalizarFecha(draft.finalizarFecha ? parseDateString(draft.finalizarFecha) : new Date(2026, 4, 6, 18, 0, 0, 0));
    setSoloNuevos(Boolean(draft.soloNuevos));
    setSoloLlenos(Boolean(draft.soloLlenos));
    setBlocks(Array.isArray(draft.messageBlocks) ? draft.messageBlocks : []);
    setActiveBlockId(draft.messageBlocks?.[0]?.id || null);
  }, [location.state]);

  useEffect(() => {
    const loadScheduledOptions = async () => {
      if (!API_URL || !user?.id) return;

      setOptionsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/scheduled_messages/options?user_id=${user.id}`, {
          headers: buildAuthHeaders(user),
        });
        const result = await response.json();

        if (response.ok && result.success && result.data) {
          setScheduledOptions({
            campaigns: Array.isArray(result.data.campaigns) ? result.data.campaigns : [],
            groups: Array.isArray(result.data.groups) ? result.data.groups : [],
            devices: Array.isArray(result.data.devices) ? result.data.devices : [],
          });
        }
      } catch (error) {
        console.warn('No se pudieron cargar las opciones programadas:', error);
      } finally {
        setOptionsLoading(false);
      }
    };

    loadScheduledOptions();
  }, [user]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target)) {
        setShowEndCalendar(false);
      }
      if (timeRef.current && !timeRef.current.contains(event.target)) {
        setShowTimePopover(false);
      }
      if (campaignRef.current && !campaignRef.current.contains(event.target)) {
        setShowCampaigns(false);
      }
      if (frequencyRef.current && !frequencyRef.current.contains(event.target)) {
        setShowFrequencyMenu(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  const activeBlock = useMemo(
    () => blocks.find((block) => block.id === activeBlockId) || null,
    [blocks, activeBlockId],
  );

  const availableTargets = useMemo(() => {
    if (tipoEnvio === 'grupo') {
      return scheduledOptions.groups.map((group) => ({
        targetId: String(group.id),
        name: group.nombre || group.jid || `Grupo ${group.id}`,
        subtitle: group.dispositivo_nombre || 'Grupo de WhatsApp',
        deviceId: group.dispositivo_id ?? null,
      }));
    }

    return scheduledOptions.campaigns.map((campaign) => ({
      targetId: campaign.target_id,
      name: campaign.nombre || `${campaign.source || 'campana'} ${campaign.id}`,
      subtitle: campaign.source === 'envio_masivo' ? 'Envio masivo' : 'Campana',
      deviceId: campaign.dispositivo_id ?? null,
    }));
  }, [scheduledOptions, tipoEnvio]);

  useEffect(() => {
    if (!availableTargets.length) return;

    const currentTarget = availableTargets.find((option) => option.targetId === selectedTargetId);
    if (currentTarget) {
      if (!campana || campana !== currentTarget.name) {
        setCampana(currentTarget.name);
      }
      if (selectedDeviceId == null && currentTarget.deviceId != null) {
        setSelectedDeviceId(currentTarget.deviceId);
      }
      return;
    }

    if (selectedTargetId) {
      setSelectedTargetId('');
      setSelectedDeviceId(null);
      setCampana('');
      return;
    }

    if (campana) {
      const matchedByName = availableTargets.find((option) => option.name === campana);
      if (matchedByName) {
        setSelectedTargetId(matchedByName.targetId);
        setSelectedDeviceId(matchedByName.deviceId);
      }
    }
  }, [availableTargets, campana, selectedDeviceId, selectedTargetId]);

  const totalCountLabel = blocks.length === 1 ? '1 mensaje' : `${blocks.length} mensajes`;

  const updateBlock = (id, updater) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...updater(block) } : block)),
    );
  };

  const addOrSelectBlock = (type) => {
    setAlertMessage('');
    const existing = blocks.find((block) => block.type === type);
    if (existing) {
      setActiveBlockId(existing.id);
      return;
    }
    if (blocks.length >= 3) {
      setAlertMessage('Solo puedes agregar hasta 3 mensajes.');
      return;
    }
    const block = createEmptyBlock(type, selectedDate, hora);
    setBlocks((prev) => [...prev, block]);
    setActiveBlockId(block.id);
  };

  const removeBlock = (id) => {
    setBlocks((prev) => {
      const next = prev.filter((block) => block.id !== id);
      setActiveBlockId(next[0]?.id || null);
      return next;
    });
  };

  const toggleDay = (key) => {
    setDiasSeleccionados((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  };

  const reorderBlocks = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    setBlocks((prev) => {
      const sourceIndex = prev.findIndex((block) => block.id === sourceId);
      const targetIndex = prev.findIndex((block) => block.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleToolbarAction = (blockId, action) => {
    updateBlock(blockId, (block) => {
      const contentField = block.type === 'Link' ? 'message' : block.type === 'Encuesta' ? 'question' : 'content';
      const currentValue = block[contentField] || '';
      let nextValue = currentValue;

      if (action === 'emoji') nextValue = `${currentValue} 😊`;
      if (action === 'bold') nextValue = `${currentValue} **texto**`;
      if (action === 'italic') nextValue = `${currentValue} *texto*`;
      if (action === 'strike') nextValue = `${currentValue} ~texto~`;
      if (action === 'code') nextValue = `${currentValue} {{Nombre}}`;
      if (action === 'sparkle') {
        const examples = [
          'Hola, tenemos una actualización importante para tu grupo.',
          'Te compartimos un recordatorio rápido para no perder el contexto.',
          'Este mensaje fue optimizado para mejorar la respuesta del grupo.',
        ];
        nextValue = `${currentValue}${currentValue ? '\n\n' : ''}${examples[Math.floor(Math.random() * examples.length)]}`;
      }

      return { [contentField]: nextValue };
    });
  };

  const scheduleSummary = () => {
    if (!repetir) {
      return `1 mensaje el ${formatDate(selectedDate)} a las ${hora} (UTC)`;
    }

    if (frecuencia === 'Diario') {
      if (finalizarOp === 'nunca') return `∞ mensaje todos los días a las ${hora} (UTC)`;
      if (finalizarOp === 'fecha') {
        return `Hasta ${formatDate(finalizarFecha)}: mensaje todos los días a las ${hora} (UTC)`;
      }
      return `${repeticiones} mensajes todos los días a las ${hora} (UTC)`;
    }

    if (frecuencia === 'Mensual') {
      if (finalizarOp === 'nunca') return `∞ mensaje cada ${repetirCada} mes(es) a las ${hora} (UTC)`;
      if (finalizarOp === 'fecha') {
        return `Hasta ${formatDate(finalizarFecha)}: mensaje mensual a las ${hora} (UTC)`;
      }
      return `${repeticiones} mensajes cada ${repetirCada} mes(es) a las ${hora} (UTC)`;
    }

    const days = WEEKDAY_OPTIONS.filter((item) => diasSeleccionados.includes(item.key)).map((item) => item.name);
    if (finalizarOp === 'nunca') {
      return `∞ mensaje cada semana (${days.join(', ')}) a las ${hora} (UTC)`;
    }
    if (finalizarOp === 'fecha') {
      return `Hasta ${formatDate(finalizarFecha)}: mensajes (${days.join(', ')}) a las ${hora} (UTC)`;
    }
    return `${repeticiones} mensajes cada semana (${days.join(', ')}) a las ${hora} (UTC)`;
  };

  const generateUpcomingDates = () => {
    const results = [];
    const current = new Date(selectedDate);
    const limit = finalizacionCantidad();
    let guard = 0;

    while (results.length < limit && guard < 120) {
      const dayIndex = current.getDay();
      const weeklyMatch = diasSeleccionados.some(
        (key) => WEEKDAY_OPTIONS.find((option) => option.key === key)?.dayIndex === dayIndex,
      );

      const matches =
        frecuencia === 'Diario' ||
        (frecuencia === 'Semanal' && weeklyMatch) ||
        (frecuencia === 'Mensual' && current.getDate() === selectedDate.getDate());

      if (matches) {
        if (finalizarOp === 'fecha' && current > finalizarFecha) break;
        results.push(new Date(current));
      }

      current.setDate(current.getDate() + 1);
      guard += 1;
    }

    return results;
  };

  const finalizacionCantidad = () => {
    if (finalizarOp === 'nunca') return 12;
    if (finalizarOp === 'fecha') return 12;
    return Math.max(repeticiones, 1);
  };

  const upcomingDates = useMemo(() => {
    if (!repetir) return [selectedDate];
    return generateUpcomingDates();
  }, [selectedDate, repetir, frecuencia, diasSeleccionados, repeticiones, finalizarOp, finalizarFecha, repetirCada]);

  const buildPreviewBody = (block) => {
    if (block.type === 'Mensaje') return block.content || 'Escribe un mensaje...';
    if (block.type === 'Audio') return 'Audio listo para reproducir';
    if (block.type === 'Documento') return 'Documento adjunto';
    if (block.type === 'Imagen/Video') return block.caption || 'Imagen o video adjunto';
    if (block.type === 'Link') return block.title || block.link || 'Enlace compartido';
    if (block.type === 'Encuesta') return block.question || 'Pregunta de encuesta';
    if (block.type === 'Contacto') return block.name || 'Nombre del contacto';
    if (block.type === 'Evento') return block.title || 'Nombre del evento';
    return 'Bloque sin contenido';
  };

  const saveMessage = async (status) => {
    if (!nombre.trim() && status !== 'Borrador') {
      setAlertMessage('Escribe un nombre para el mensaje.');
      return;
    }

    if (blocks.length === 0 && status !== 'Borrador') {
      setAlertMessage('Agrega al menos un mensaje antes de continuar.');
      return;
    }

    if (!campana.trim() && status !== 'Borrador') {
      setAlertMessage(`Selecciona ${tipoEnvio === 'grupo' ? 'un grupo' : 'una campaña'} antes de continuar.`);
      return;
    }

    setSaving(true);
    setAlertMessage('');

    const payload = {
      id: location.state?.draft?.id || Date.now(),
      usuario_id: user?.id,
      dispositivoId: selectedDeviceId,
      tipoEnvio,
      targetId: selectedTargetId || null,
      targetName: campana || null,
      nombre,
      campana,
      velocidad,
      opcionEnvio,
      fecha: formatDate(selectedDate),
      hora,
      repetir,
      frecuencia,
      diasSeleccionados,
      repetirCada,
      finalizarOp,
      repeticiones,
      finalizarFecha: finalizarFecha ? formatDate(finalizarFecha) : null,
      soloNuevos,
      soloLlenos,
      status,
      messageBlocks: blocks,
      updatedAt: new Date().toISOString(),
      createdAt: location.state?.draft?.createdAt || new Date().toISOString(),
    };

    try {
      let storedItem = payload;
      if (API_URL) {
        try {
          const response = await fetch(`${API_URL}/api/scheduled_messages`, {
            method: 'POST',
            headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || 'No se pudo guardar en la API');
          }
          storedItem = result.data || payload;
        } catch (error) {
          console.warn('No se pudo guardar en la API, se mantuvo localmente:', error);
        }
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(existing)
        ? [...existing.filter((item) => item.id !== storedItem.id), storedItem]
        : [storedItem];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      navigate('/mensajes');
    } catch (error) {
      console.error('No se pudo guardar el mensaje:', error);
      setAlertMessage('No se pudo guardar el mensaje. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const renderEmptyEditor = () => (
    <div className="rounded-[1.7rem] border border-dashed border-slate-200 px-8 py-16 text-center">
      <FileText size={44} className="mx-auto text-slate-300" />
      <p className="mt-5 text-[15px] text-slate-500">Ningún mensaje seleccionado</p>
    </div>
  );

  const renderToolbarRow = (block) => {
    const supportsMention = ['Mensaje', 'Imagen/Video'].includes(block.type);
    const supportsVariations = ['Mensaje', 'Imagen/Video', 'Link', 'Encuesta', 'Evento'].includes(block.type);

    return (
      <>
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Toolbar onAction={(action) => handleToolbarAction(block.id, action)} />
            {supportsVariations && (
              <button
                type="button"
                onClick={() => handleToolbarAction(block.id, 'sparkle')}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm text-slate-500 transition hover:bg-slate-50"
              >
                <Sparkles size={15} />
                Generar variaciones
              </button>
            )}
          </div>

          {supportsMention && (
            <div>
              <label className="flex items-center gap-3 text-[15px] text-slate-500">
                <input
                  type="checkbox"
                  checked={block.mentionAll}
                  onChange={(event) =>
                    updateBlock(block.id, () => ({ mentionAll: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#1b1b38] focus:ring-[#8f88ff]"
                />
                <span>@ Mencionar a todos</span>
                <Info size={14} className="text-slate-300" />
              </label>
              <p className="mt-1 pl-7 text-xs text-slate-400">
                Mejora la visibilidad notificando a todos los participantes
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-[15px] text-slate-700">
              <Pin size={14} className="text-slate-400" />
              <span>Fijar mensaje</span>
              <span className="rounded-md bg-[#ffcf63] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6f4d00]">
                PRO
              </span>
            </div>
            <Toggle
              checked={block.pin}
              onChange={(checked) => updateBlock(block.id, () => ({ pin: checked }))}
            />
          </div>
        </div>
      </>
    );
  };

  const renderBlockBody = (block) => {
    if (block.type === 'Mensaje') {
      return (
        <>
          <textarea
            rows={5}
            value={block.content}
            onChange={(event) => updateBlock(block.id, () => ({ content: event.target.value }))}
            placeholder="Escribe un mensaje..."
            className="min-h-[100px] w-full resize-none rounded-[1.2rem] border border-slate-200 px-4 py-4 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
          />
          <div className="mt-2 text-xs text-slate-400">0/4096</div>
          {renderToolbarRow(block)}
        </>
      );
    }

    if (block.type === 'Audio') {
      return (
        <>
          <div className="rounded-[1.2rem] border border-dashed border-slate-200 px-5 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ffe6e6] text-[#ff4d4f]">
              <Mic size={24} />
            </div>
            <p className="mt-4 text-[15px] text-slate-500">Toca para grabar</p>
          </div>
          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-300">
            <span className="h-px flex-1 bg-slate-200" />
            o
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="rounded-[1.2rem] border border-dashed border-slate-200 px-5 py-10 text-center">
            <FileText size={28} className="mx-auto text-slate-300" />
            <p className="mt-4 text-[15px] text-slate-500">Cargar archivo de audio</p>
            <p className="mt-2 text-xs text-slate-400">Máximo 80MB · MP3, OGG, WAV</p>
          </div>
          {renderToolbarRow(block)}
        </>
      );
    }

    if (block.type === 'Documento') {
      return (
        <>
          <div className="rounded-[1.2rem] border border-dashed border-slate-200 px-5 py-10 text-center">
            <FileText size={30} className="mx-auto text-slate-300" />
            <p className="mt-4 text-[15px] text-slate-500">Haz clic para cargar</p>
            <p className="mt-2 text-xs text-slate-400">Máximo 16MB</p>
            <p className="mt-1 text-xs text-slate-400">PDF</p>
          </div>
          {renderToolbarRow(block)}
        </>
      );
    }

    if (block.type === 'Imagen/Video') {
      return (
        <>
          <div className="rounded-[1.2rem] border border-dashed border-slate-200 px-5 py-10 text-center">
            <ImageIcon size={30} className="mx-auto text-slate-300" />
            <p className="mt-4 text-[15px] text-slate-500">Haz clic para cargar</p>
            <p className="mt-2 text-xs text-slate-400">Imagen máx. 8MB · Video máx. 80MB</p>
            <p className="mt-1 text-xs text-slate-400">PNG, JPG, JPEG, WEBP, MP4</p>
          </div>
          <textarea
            rows={3}
            value={block.caption}
            onChange={(event) => updateBlock(block.id, () => ({ caption: event.target.value }))}
            placeholder="Escribe un pie de foto o video..."
            className="mt-4 min-h-[86px] w-full resize-none rounded-[1.2rem] border border-slate-200 px-4 py-4 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
          />
          <div className="mt-2 text-xs text-slate-400">0/1024</div>
          {renderToolbarRow(block)}
        </>
      );
    }

    if (block.type === 'Link') {
      return (
        <>
          <label className="mb-2 block text-sm font-medium text-slate-700">Mensaje*</label>
          <textarea
            rows={4}
            value={block.message}
            onChange={(event) => updateBlock(block.id, () => ({ message: event.target.value }))}
            placeholder="Escribe un mensaje..."
            className="min-h-[84px] w-full resize-none rounded-[1.2rem] border border-slate-200 px-4 py-4 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
          />
          <div className="mt-2 text-xs text-slate-400">0/4096</div>
          {renderToolbarRow(block)}
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Título*</label>
              <input
                type="text"
                value={block.title}
                onChange={(event) => updateBlock(block.id, () => ({ title: event.target.value }))}
                placeholder="Escribe el título"
                className="h-12 w-full rounded-full border border-slate-200 px-4 text-[15px] outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Descripción*</label>
              <input
                type="text"
                value={block.description}
                onChange={(event) => updateBlock(block.id, () => ({ description: event.target.value }))}
                placeholder="Escribe la descripción"
                className="h-12 w-full rounded-full border border-slate-200 px-4 text-[15px] outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Link*</label>
              <input
                type="text"
                value={block.link}
                onChange={(event) => updateBlock(block.id, () => ({ link: event.target.value }))}
                placeholder="https://"
                className="h-12 w-full rounded-full border border-slate-200 px-4 text-[15px] outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
              />
            </div>
          </div>
        </>
      );
    }

    if (block.type === 'Encuesta') {
      return (
        <>
          <textarea
            rows={3}
            value={block.question}
            onChange={(event) => updateBlock(block.id, () => ({ question: event.target.value }))}
            placeholder="Escribe la pregunta de la encuesta..."
            className="min-h-[84px] w-full resize-none rounded-[1.2rem] border border-slate-200 px-4 py-4 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
          />
          <div className="mt-2 text-xs text-slate-400">0/256</div>
          {renderToolbarRow(block)}
          <div className="mt-5">
            <label className="mb-3 block text-sm font-medium text-slate-700">Opciones*</label>
            <div className="space-y-3">
              {block.options.map((option, index) => (
                <div key={`${block.id}-option-${index}`} className="flex items-center gap-3">
                  <GripVertical size={15} className="shrink-0 text-slate-300" />
                  <input
                    type="text"
                    value={option}
                    onChange={(event) =>
                      updateBlock(block.id, () => {
                        const nextOptions = [...block.options];
                        nextOptions[index] = event.target.value;
                        return { options: nextOptions };
                      })
                    }
                    placeholder="Escribe el texto"
                    className="h-12 flex-1 rounded-full border border-slate-200 px-4 text-[15px] outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
                  />
                  <span className="text-xs text-slate-400">0/100</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateBlock(block.id, () => ({
                        options: block.options.filter((_, optionIndex) => optionIndex !== index),
                      }))
                    }
                    className="text-slate-300 transition hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-400 lg:flex-row lg:items-center lg:justify-between">
              <span>Mínimo 2 opciones · Máximo 12 opciones</span>
              <button
                type="button"
                onClick={() =>
                  updateBlock(block.id, () => ({
                    options: block.options.length >= 12 ? block.options : [...block.options, ''],
                  }))
                }
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#1b1b38] px-5 text-sm font-semibold text-white transition hover:bg-[#111126]"
              >
                Añadir opción
              </button>
            </div>
          </div>
          {renderToolbarRow(block)}
        </>
      );
    }

    if (block.type === 'Contacto') {
      return (
        <>
          <input
            type="text"
            value={block.name}
            onChange={(event) => updateBlock(block.id, () => ({ name: event.target.value }))}
            placeholder="Nombre del contacto"
            className="h-12 w-full rounded-full border border-slate-200 px-4 text-[15px] outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
          />
          <div className="mt-2 text-xs text-slate-400">0/100</div>
          <input
            type="text"
            value={block.phone}
            onChange={(event) => updateBlock(block.id, () => ({ phone: event.target.value }))}
            placeholder="Número de teléfono (ej: +57 300 123 4567)"
            className="mt-4 h-12 w-full rounded-full border border-slate-200 px-4 text-[15px] outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
          />
          <p className="mt-3 text-xs text-slate-400">Ingresa los datos del contacto a compartir</p>
          {renderToolbarRow(block)}
        </>
      );
    }

    if (block.type === 'Evento') {
      return (
        <>
          <input
            type="text"
            value={block.title}
            onChange={(event) => updateBlock(block.id, () => ({ title: event.target.value }))}
            placeholder="Nombre del evento"
            className="h-12 w-full rounded-none border-x-0 border-b border-t-0 border-slate-200 px-0 text-[15px] outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff]"
          />
          <div className="mt-2 text-xs text-slate-400">0/100</div>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Descripción <span className="font-normal text-slate-400">(Opcional)</span>
          </label>
          <textarea
            rows={4}
            value={block.description}
            onChange={(event) => updateBlock(block.id, () => ({ description: event.target.value }))}
            placeholder="Escribe un mensaje..."
            className="mt-2 min-h-[86px] w-full resize-none rounded-[1.2rem] border border-slate-200 px-4 py-4 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
          />
          <div className="mt-2 text-xs text-slate-400">0/2048</div>
          {renderToolbarRow(block)}
          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Fecha y hora del evento</p>
              </div>
              <div className="space-y-2 text-right">
                <input
                  type="datetime-local"
                  value={block.eventDate}
                  onChange={(event) => updateBlock(block.id, () => ({ eventDate: event.target.value }))}
                  className="h-11 rounded-full border border-slate-200 px-4 text-[15px] outline-none transition focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
                />
                <p className="text-xs text-slate-400">UTC (GMT)</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarRange size={15} />
                <span>Ubicación</span>
              </div>
              <input
                type="text"
                value={block.location}
                onChange={(event) => updateBlock(block.id, () => ({ location: event.target.value }))}
                className="mt-3 h-12 w-full rounded-full border border-slate-200 px-4 text-[15px] outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
              />
              <div className="mt-2 text-xs text-slate-400">0/1000</div>
            </div>
          </div>
          {renderToolbarRow(block)}
        </>
      );
    }

    return null;
  };

  const renderPreviewCard = (block) => {
    if (block.type === 'Contacto') {
      return (
        <div className="ml-auto w-[85%] rounded-[1.1rem] bg-[#0b7a67] p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <Contact2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{block.name || 'Nombre del contacto'}</p>
              <p className="truncate text-xs text-white/80">{block.phone || '+57 300 123 4567'}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="ml-auto w-[85%] rounded-[1.1rem] bg-[#0b7a67] px-4 py-3 text-white shadow-lg">
        <p className="text-sm leading-6">{buildPreviewBody(block)}</p>
        <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-white/70">
          <span>14:16</span>
          <span>✓✓</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex min-h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/mensajes')}
              className="inline-flex items-center gap-2 text-[15px] text-slate-700 transition hover:text-slate-950"
            >
              <ArrowLeft size={18} />
              Regresar
            </button>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#22223e] shadow-sm transition hover:bg-slate-50"
            >
              <Eye size={17} />
              Vista previa
            </button>
          </div>

          <h1 className="mb-7 text-[2.1rem] font-semibold tracking-[-0.03em] text-slate-950">
            Crear mensaje programado
          </h1>

          {alertMessage && (
            <div className="mb-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {alertMessage}
            </div>
          )}

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.98fr)]">
            <div className="min-w-0 space-y-8">
              <section>
                <label className="mb-2 block text-[15px] font-medium text-slate-900">Tipo</label>
                <div className="flex items-center gap-8 text-[15px] text-slate-800">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={tipoEnvio === 'campana'}
                      onChange={() => setTipoEnvio('campana')}
                      className="h-4 w-4 border-slate-300 text-[#111126] focus:ring-[#8f88ff]"
                    />
                    Campaña
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={tipoEnvio === 'grupo'}
                      onChange={() => setTipoEnvio('grupo')}
                      className="h-4 w-4 border-slate-300 text-[#111126] focus:ring-[#8f88ff]"
                    />
                    Grupo
                  </label>
                </div>
              </section>

              <section>
                <label className="mb-2 block text-[15px] font-medium text-slate-900">
                  Nombre<span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value.slice(0, 100))}
                  placeholder="Escribe el nombre"
                  className="h-14 w-full rounded-full border border-slate-200 px-5 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
                />
                <div className="mt-2 text-right text-xs text-slate-400">{nombre.length}/100</div>
              </section>

              <section ref={campaignRef}>
                <label className="mb-2 block text-[15px] font-medium text-slate-900">
                  {tipoEnvio === 'grupo' ? 'Grupos' : 'Campañas'}<span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCampaigns((prev) => !prev)}
                    className="flex h-14 w-full items-center justify-between rounded-full border border-slate-200 px-5 text-left text-[15px] text-slate-400 transition hover:border-slate-300"
                  >
                    <span>
                      {campana ||
                        (tipoEnvio === 'grupo'
                          ? 'Buscar y seleccionar grupos...'
                          : 'Buscar y seleccionar campañas...')}
                    </span>
                    <ChevronDown size={18} />
                  </button>

                  {showCampaigns && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-[1.2rem] border border-slate-200 bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                      {optionsLoading ? (
                        <div className="px-4 py-3 text-sm text-slate-500">Cargando opciones...</div>
                      ) : availableTargets.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          No hay {tipoEnvio === 'grupo' ? 'grupos' : 'campañas'} disponibles.
                        </div>
                      ) : (
                        availableTargets.map((option) => (
                          <button
                            key={option.targetId}
                            type="button"
                            onClick={() => {
                              setCampana(option.name);
                              setSelectedTargetId(option.targetId);
                              setSelectedDeviceId(option.deviceId);
                              setShowCampaigns(false);
                            }}
                            className="flex min-h-[52px] w-full flex-col items-start justify-center rounded-xl px-4 py-2 text-left transition hover:bg-slate-50"
                          >
                            <span className="text-sm font-medium text-slate-700">{option.name}</span>
                            <span className="text-xs text-slate-400">{option.subtitle}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <label className="mb-2 block text-[15px] font-medium text-slate-900">Velocidad de envío</label>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { key: 'rapido', title: 'Rápido', subtitle: '1 mensaje cada 3 seg' },
                    { key: 'lento', title: 'Lento', subtitle: '10-15 seg entre mensajes' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setVelocidad(item.key)}
                      className={`flex h-[70px] items-center gap-4 rounded-[1rem] border px-5 text-left transition ${
                        velocidad === item.key
                          ? 'border-slate-300 bg-slate-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Clock3 size={18} className="shrink-0 text-slate-500" />
                      <div>
                        <p className="text-[15px] font-semibold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-500">{item.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="mb-2 block text-[15px] font-medium text-slate-900">Opciones de envío</label>
                <div className="flex flex-wrap items-center gap-8 text-[15px] text-slate-800">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={opcionEnvio === 'ahora'}
                      onChange={() => setOpcionEnvio('ahora')}
                      className="h-4 w-4 border-slate-300 text-[#111126] focus:ring-[#8f88ff]"
                    />
                    Enviar mensaje ahora
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={opcionEnvio === 'programar'}
                      onChange={() => setOpcionEnvio('programar')}
                      className="h-4 w-4 border-slate-300 text-[#111126] focus:ring-[#8f88ff]"
                    />
                    Programar mensaje
                  </label>
                </div>
              </section>

              {opcionEnvio === 'programar' && (
                <section className="space-y-8">
                  <div>
                    <p className="mb-4 text-[15px] font-medium text-slate-900">Programar</p>
                    <label className="mb-2 block text-[15px] font-medium text-slate-900">
                      Fecha y hora<span className="text-rose-500">*</span>
                    </label>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_60px]">
                      <div className="relative" ref={calendarRef}>
                        <button
                          type="button"
                          onClick={() => setShowCalendar((prev) => !prev)}
                          className="flex h-14 w-full items-center gap-3 rounded-[1rem] border border-slate-200 px-4 text-left text-[15px] text-slate-800 transition hover:border-slate-300"
                        >
                          <CalendarDays size={18} className="text-slate-400" />
                          {formatDate(selectedDate)}
                        </button>
                        {showCalendar && (
                          <MiniCalendar
                            selectedDate={selectedDate}
                            onChange={setSelectedDate}
                            onClose={() => setShowCalendar(false)}
                          />
                        )}
                      </div>

                      <div className="relative" ref={timeRef}>
                        <button
                          type="button"
                          onClick={() => setShowTimePopover((prev) => !prev)}
                          className="flex h-14 w-full items-center gap-3 rounded-[1rem] border border-slate-200 px-4 text-left text-[15px] text-slate-800 transition hover:border-slate-300"
                        >
                          <Clock3 size={18} className="text-slate-400" />
                          {hora}
                        </button>
                        {showTimePopover && (
                          <TimePopover
                            value={hora}
                            onChange={setHora}
                            onClose={() => setShowTimePopover(false)}
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        className="h-14 rounded-[1rem] border border-slate-200 text-[15px] text-slate-500"
                      >
                        UTC
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-5">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <RefreshIndicator />
                        <span className="text-[15px] font-semibold text-slate-900">Repetir mensaje</span>
                        <Info size={15} className="text-slate-300" />
                      </div>
                      <Toggle checked={repetir} onChange={setRepetir} />
                    </div>

                    {repetir && (
                      <div className="ml-2 border-l border-slate-200 pl-6">
                        <div className="space-y-7">
                          <div>
                            <label className="mb-2 block text-sm text-slate-500">Frecuencia</label>
                            <div className="flex flex-wrap items-center gap-3" ref={frequencyRef}>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowFrequencyMenu((prev) => !prev)}
                                  className="flex h-14 items-center gap-4 rounded-[1rem] border border-[#7e79ff] px-4 text-[15px] text-slate-600"
                                >
                                  {frecuencia}
                                  <ChevronDown size={18} />
                                </button>
                                {showFrequencyMenu && (
                                  <div className="absolute left-0 top-full z-30 mt-2 w-[120px] overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                                    {['Diario', 'Semanal', 'Mensual'].map((item) => (
                                      <button
                                        key={item}
                                        type="button"
                                        onClick={() => {
                                          setFrecuencia(item);
                                          setShowFrequencyMenu(false);
                                        }}
                                        className={`flex h-12 w-full items-center px-4 text-left text-sm transition ${
                                          frecuencia === item
                                            ? 'bg-slate-100 text-slate-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        {item}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="text-[15px] text-slate-500">cada</span>
                              <input
                                type="number"
                                min="1"
                                value={repetirCada}
                                onChange={(event) => setRepetirCada(Math.max(1, Number(event.target.value) || 1))}
                                className="h-12 w-[68px] rounded-full border border-slate-200 px-3 text-center text-[15px] outline-none transition focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
                              />
                              <span className="text-[15px] text-slate-500">
                                {frecuencia === 'Diario'
                                  ? 'día(s)'
                                  : frecuencia === 'Mensual'
                                    ? 'mes(es)'
                                    : 'semana(s)'}
                              </span>
                            </div>
                          </div>

                          {frecuencia === 'Semanal' && (
                            <div>
                              <label className="mb-3 block text-sm text-slate-500">Días de la semana</label>
                              <div className="flex flex-wrap gap-3">
                                {WEEKDAY_OPTIONS.map((day) => (
                                  <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => toggleDay(day.key)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition ${
                                      diasSeleccionados.includes(day.key)
                                        ? 'bg-[#1a1b2f] text-white'
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    }`}
                                  >
                                    {day.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="mb-3 block text-sm text-slate-500">Finalizar</label>
                            <div className="space-y-4">
                              <label className="flex flex-wrap items-center gap-3 text-[15px] text-slate-800">
                                <input
                                  type="radio"
                                  checked={finalizarOp === 'despues'}
                                  onChange={() => setFinalizarOp('despues')}
                                  className="h-4 w-4 border-slate-300 text-[#111126] focus:ring-[#8f88ff]"
                                />
                                Después de
                                <input
                                  type="number"
                                  min="1"
                                  value={repeticiones}
                                  onChange={(event) => setRepeticiones(Math.max(1, Number(event.target.value) || 1))}
                                  disabled={finalizarOp !== 'despues'}
                                  className="h-10 w-[64px] rounded-full border border-slate-200 px-3 text-center text-[15px] outline-none transition disabled:opacity-50 focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe]"
                                />
                                repeticiones
                              </label>

                              <div className="flex flex-wrap items-center gap-3 text-[15px] text-slate-800">
                                <label className="flex items-center gap-3">
                                  <input
                                    type="radio"
                                    checked={finalizarOp === 'fecha'}
                                    onChange={() => setFinalizarOp('fecha')}
                                    className="h-4 w-4 border-slate-300 text-[#111126] focus:ring-[#8f88ff]"
                                  />
                                  En fecha
                                </label>

                                <div className="relative" ref={endCalendarRef}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFinalizarOp('fecha');
                                      setShowEndCalendar((prev) => !prev);
                                    }}
                                    className="flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm text-slate-500 transition hover:border-slate-300"
                                  >
                                    <CalendarDays size={15} />
                                    {finalizarFecha ? 'Elegir' : 'Elegir'}
                                  </button>
                                  {showEndCalendar && (
                                    <MiniCalendar
                                      selectedDate={finalizarFecha}
                                      onChange={setFinalizarFecha}
                                      onClose={() => setShowEndCalendar(false)}
                                    />
                                  )}
                                </div>
                              </div>

                              <label className="flex items-center gap-3 text-[15px] text-slate-800">
                                <input
                                  type="radio"
                                  checked={finalizarOp === 'nunca'}
                                  onChange={() => setFinalizarOp('nunca')}
                                  className="h-4 w-4 border-slate-300 text-[#111126] focus:ring-[#8f88ff]"
                                />
                                Nunca (manual)
                              </label>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {[
                              {
                                label: 'Solo a grupos nuevos',
                                checked: soloNuevos,
                                onChange: setSoloNuevos,
                              },
                              {
                                label: 'Solo a grupos llenos',
                                checked: soloLlenos,
                                onChange: setSoloLlenos,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="flex items-center justify-between rounded-[1rem] bg-slate-50 px-4 py-4"
                              >
                                <div className="flex items-center gap-2 text-[15px] text-slate-800">
                                  <span>{item.label}</span>
                                  <Info size={14} className="text-slate-300" />
                                </div>
                                <Toggle checked={item.checked} onChange={item.onChange} />
                              </div>
                            ))}
                          </div>

                          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4">
                            <div className="flex items-start gap-2 text-[15px] font-medium text-slate-800">
                              <CalendarRange size={16} className="mt-1 text-slate-500" />
                              <span>{scheduleSummary()}</span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {upcomingDates.slice(0, 8).map((date, index) => (
                                <span
                                  key={`${date.toISOString()}-${index}`}
                                  className="rounded-full bg-[#eceff3] px-3 py-1 text-xs text-slate-600"
                                >
                                  {formatMonthChip(date)}
                                </span>
                              ))}
                              {upcomingDates.length > 8 && (
                                <span className="rounded-full bg-[#eceff3] px-3 py-1 text-xs text-slate-500">
                                  +{upcomingDates.length - 8} más
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-4">
                <label className="text-[15px] font-medium text-slate-900">Tipo de mensaje</label>
                <span className="text-sm text-slate-400">{blocks.length}/3 mensajes</span>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                {TYPE_OPTIONS.map(({ type, icon: Icon }) => {
                  const selected = activeBlock?.type === type;
                  const created = blocks.some((block) => block.type === type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addOrSelectBlock(type)}
                      className={`flex min-h-[72px] flex-col items-center justify-center rounded-[1rem] border border-dashed px-3 py-3 text-center transition ${
                        selected
                          ? 'border-slate-300 bg-white shadow-sm'
                          : created
                            ? 'border-[#d9d7ff] bg-[#f7f6ff] text-[#5f58c7]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Icon size={21} className={selected || created ? 'text-[#6f67dd]' : 'text-slate-400'} />
                      <span className="mt-2 text-sm text-slate-500">{type}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 min-h-[420px]">
                {blocks.length === 0 ? (
                  renderEmptyEditor()
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <GripVertical size={15} />
                      Arrastra para reordenar los mensajes
                    </div>

                    {blocks.map((block) => {
                      const expanded = block.id === activeBlockId;
                      const title =
                        block.type === 'Mensaje'
                          ? 'Enviar mensaje'
                          : block.type === 'Audio'
                            ? 'Enviar audio'
                            : block.type === 'Documento'
                              ? 'Enviar documento'
                              : block.type === 'Imagen/Video'
                                ? 'Enviar imagen o video'
                                : block.type === 'Link'
                                  ? 'Enviar link'
                                  : block.type === 'Encuesta'
                                    ? 'Enviar encuesta'
                                    : block.type === 'Contacto'
                                      ? 'Enviar contacto'
                                      : 'Enviar evento';

                      return (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={() => setDraggingBlockId(block.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            reorderBlocks(draggingBlockId, block.id);
                            setDraggingBlockId(null);
                          }}
                          onDragEnd={() => setDraggingBlockId(null)}
                          className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
                            <button
                              type="button"
                              onClick={() => setActiveBlockId(block.id)}
                              className="flex min-w-0 items-center gap-3 text-left"
                            >
                              <GripVertical size={15} className="shrink-0 text-slate-300" />
                              <span className="truncate text-[15px] font-medium text-slate-900">{title}</span>
                            </button>

                            <div className="flex items-center gap-3 text-slate-400">
                              <button
                                type="button"
                                onClick={() => setActiveBlockId(expanded ? null : block.id)}
                                className="transition hover:text-slate-700"
                              >
                                <ChevronDown
                                  size={17}
                                  className={`transition ${expanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeBlock(block.id)}
                                className="transition hover:text-rose-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {expanded ? (
                            <div className="px-4 py-4">{renderBlockBody(block)}</div>
                          ) : (
                            <div className="px-4 py-4 text-sm text-slate-400">
                              {buildPreviewBody(block)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <span className="text-[15px] text-slate-500">
                {blocks.length === 0 ? 'Agrega al menos un mensaje' : totalCountLabel}
              </span>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/mensajes')}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-base font-medium text-[#22223e] shadow-sm transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => saveMessage('Borrador')}
                  disabled={saving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-base font-medium text-slate-400 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <FileText size={16} />
                  Guardar borrador
                </button>
                <button
                  type="button"
                  onClick={() => saveMessage(opcionEnvio === 'programar' ? 'Programado' : 'Enviar ahora')}
                  disabled={saving}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#151624] px-8 text-base font-semibold text-white transition hover:bg-[#0d0e18] disabled:opacity-60"
                >
                  {saving
                    ? 'Guardando...'
                    : opcionEnvio === 'programar'
                      ? 'Programar envío'
                      : 'Enviar ahora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {previewOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <div className="w-full max-w-[360px] rounded-[1.7rem] bg-white shadow-[0_30px_70px_rgba(15,23,42,0.4)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-[15px] font-medium text-slate-800">Vista previa</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-400">WhatsApp</span>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-b-[1.7rem] bg-[#12202d]">
              <div className="flex items-center gap-3 bg-[#26333f] px-4 py-4 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0fb08b] font-semibold">
                  G
                </div>
                <div>
                  <p className="text-sm font-semibold">Grupo de WhatsApp</p>
                  <p className="text-xs text-white/70">32 participantes</p>
                </div>
              </div>

              <div className="preview-grid min-h-[455px] space-y-4 px-4 py-5">
                {blocks.length === 0 ? (
                  <div className="flex min-h-[340px] items-center justify-center">
                    <div className="rounded-[1rem] border border-white/50 px-6 py-4 text-center text-white/60">
                      Agrega bloques de mensaje para ver la vista previa
                    </div>
                  </div>
                ) : (
                  blocks.map((block) => (
                    <div key={`preview-${block.id}`}>{renderPreviewCard(block)}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .preview-grid {
              background-image:
                linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
              background-size: 30px 30px;
            }
          `,
        }}
      />
    </div>
  );
};

function RefreshIndicator() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-slate-500">
      <path
        d="M4 4v6h6M20 20v-6h-6M19 10a7 7 0 0 0-12-3M5 14a7 7 0 0 0 12 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CrearMensaje;
