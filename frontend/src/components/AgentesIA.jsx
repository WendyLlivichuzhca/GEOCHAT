// frontend/src/components/AgentesIA.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Plus, Search, ChevronDown, Check, Trash2, Edit2, Info,
  AlertCircle, Server, Database, Activity, Stethoscope,
  Utensils, ShoppingBag, Home, Dumbbell, Sparkles, Briefcase,
  GraduationCap, X, SlidersHorizontal, ArrowLeft, MoreHorizontal,
  ChevronRight, MessageSquare, BookOpen, Zap, Calendar,
  Mic, Image, Send, RefreshCw, CheckCircle2, Paperclip, Crown, Building,
  Play, Save, FileText, Clock, Folder, ChevronsUpDown, Smile, Shield, Globe, Settings, Video, Link, Upload, HelpCircle, File, FileX, Tag, Copy, Circle, Target, Lock, GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

const API_URL = import.meta.env.VITE_API_URL || '';

const getFormattedTime = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strMinutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${strMinutes} ${ampm}`;
};

// Plantillas de industrias
const TEMPLATES = [
  {
    id: 'restaurante',
    title: 'Restaurante',
    description: 'Perfecto para reservaciones, menú y horarios',
    icon: <Utensils size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres un recepcionista de un restaurante. Ayudas a los clientes a reservar mesas, explicas el menú de comidas y bebidas, indicas los precios y detallas los horarios de atenciónn y la ubicación.',
    personality: 'Amigable, servicial, entusiasta y detallista con los antojos de los comensales.',
    followUp: '¿Sigues por ahí? Con gusto te ayudo a reservar tu mesa cuando quieras. 😊'
  },
  {
    id: 'clinica',
    title: 'Clínica / Consultorio',
    description: 'Ideal para agendar citas médicas',
    icon: <Stethoscope size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres un asistente médico para una clínica. Tu objetivo principal es ayudar a los pacientes a agendar, reprogramar o cancelar citas médicas. Proporcionas información sobre especialidades disponibles, doctores y horarios.',
    personality: 'Empático, paciente, profesional, calmado y muy organizado.',
    followUp: '¿Sigues por ahí? Quería saber si te ayudo a agendar tu cita.'
  },
  {
    id: 'ecommerce',
    title: 'Tienda / E-commerce',
    description: 'Para ventas y atención al cliente',
    icon: <ShoppingBag size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres un agente de soporte de una tienda online. Ayudas a los clientes a encontrar productos en el catálogo, explicas los métodos de pago y de envío, y resuelves dudas comunes de postventa o estado de pedidos.',
    personality: 'Persuasivo, rápido, resolutivo y siempre orientado a concretar la venta.',
    followUp: '¿Sigues por ahí? Si tienes dudas sobre algún producto o tu pedido, aquí estoy para ayudarte. 🛍️'
  },
  {
    id: 'inmobiliaria',
    title: 'Inmobiliaria',
    description: 'Para captar leads y agendar visitas',
    icon: <Building size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres un asesor inmobiliario virtual. Tu tarea es atender a personas interesadas en comprar, vender o alquilar inmuebles. Filtras el presupuesto, zonas de interés, captas sus datos de contacto y agendas visitas a propiedades.',
    personality: 'Formal, persuasivo, conocedor y generador de confianza.',
    followUp: '¿Sigues por ahí? Cuéntame si quieres que te ayude a agendar una visita a alguna propiedad.'
  },
  {
    id: 'gimnasio',
    title: 'Gimnasio / Fitness',
    description: 'Para membresías y clases',
    icon: <Dumbbell size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres el asistente virtual de un gimnasio. Brindas detalles sobre planes de membresía, precios, promociones vigentes, horarios de clases grupales y reservas con entrenadores personales.',
    personality: 'Energético, motivador, saludable y muy claro al explicar las reglas del club.',
    followUp: '¿Sigues por ahí? Cuéntame si quieres info sobre nuestras membresías o las clases disponibles. 💪'
  },
  {
    id: 'belleza',
    title: 'Salón de Belleza / Spa',
    description: 'Para citas y servicios de belleza',
    icon: <Sparkles size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres el asistente de recepción de un salón de belleza y spa. Agendas citas para cortes, tinte, manicura, masajes y faciales. Recomiendas combos especiales y das consejos rápidos de cuidado personal.',
    personality: 'Cálido, elegante, conversador y atento a las preferencias estáticas del cliente.',
    followUp: '¿Sigues por ahí? Si quieres agendar tu cita, aquí estoy para ayudarte. ✨'
  },
  {
    id: 'servicios',
    title: 'Servicios Profesionales',
    description: 'Abogados, contadores, consultores',
    icon: <Briefcase size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres el asistente de un despacho de servicios profesionales. Filtras las consultas iniciales de clientes potenciales, explicas el alcance general de las asesorías y programas videollamadas de diagnóstico técnico.',
    personality: 'Muy profesional, discreto, preciso y estructurado.',
    followUp: '¿Sigues por ahí? Si necesitas más información sobre nuestros servicios, con gusto te ayudo.'
  },
  {
    id: 'academia',
    title: 'Escuela / Academia',
    description: 'Para inscripciones y cursos',
    icon: <GraduationCap size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres el asistente virtual de una escuela o academia. Brindas información sobre cursos disponibles, costos de inscripción, requisitos de admisión y horarios de clases.',
    personality: 'Paciente, formal, motivador y muy informativo.',
    followUp: '¿Sigues por ahí? Cuéntame si tienes dudas sobre nuestros cursos o el proceso de inscripción.'
  }
];

// Objetivos de superagentes (Paso 2)
const OBJECTIVES = [
  {
    id: 'preguntas_frecuentes',
    title: 'Preguntas Frecuentes',
    description: 'Responde con precisión, anticipa dudas relacionadas y genera engagement natural',
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    dotColor: '#3b82f6'
  },
  {
    id: 'cotizaciones',
    title: 'Cotizaciones',
    description: 'Usa Value-Based Selling: descubre valor, personaliza solución, ancla precio y justifica inversión',
    color: 'bg-green-500',
    borderColor: 'border-green-500',
    dotColor: '#22c55e'
  },
  {
    id: 'agendar_citas',
    title: 'Agendar Citas',
    description: 'Sugiere horarios disponibles proactivamente, reduce fricción y personaliza confirmaciones',
    color: 'bg-sky-500',
    borderColor: 'border-sky-500',
    dotColor: '#0ea5e9'
  },
  {
    id: 'ventas',
    title: 'Ventas',
    description: 'Usa SPIN Selling, gatillos mentales (escasez, urgencia) y técnicas de cierre avanzadas',
    color: 'bg-orange-500',
    borderColor: 'border-orange-500',
    dotColor: '#f97316'
  },
  {
    id: 'soporte_cliente',
    title: 'Soporte al Cliente',
    description: 'Metodología HEARD: escucha, empatiza, disculpa, resuelve y diagnostica',
    color: 'bg-red-500',
    borderColor: 'border-red-500',
    dotColor: '#ef4444'
  },
  {
    id: 'captacion_leads',
    title: 'Captación de Leads',
    description: 'Cualifica con BANT, ofrece valor primero y clasifica prospectos en caliente/tibio/frío',
    color: 'bg-cyan-500',
    borderColor: 'border-cyan-500',
    dotColor: '#0ea5e9'
  }
];

const getObjectivesForIndustry = (industryId) => {
  const allObjectives = ['preguntas_frecuentes', 'cotizaciones', 'agendar_citas', 'ventas', 'soporte_cliente', 'captacion_leads'];
  switch (industryId) {
    case 'clinica':
    case 'belleza':
      return {
        list: allObjectives,
        recommendedId: 'agendar_citas'
      };
    case 'restaurante':
      return {
        list: allObjectives,
        recommendedId: 'agendar_citas'
      };
    case 'academia':
    case 'gimnasio':
    case 'inmobiliaria':
      return {
        list: allObjectives,
        recommendedId: 'captacion_leads'
      };
    case 'ecommerce':
      return {
        list: allObjectives,
        recommendedId: 'ventas'
      };
    case 'servicios':
      return {
        list: allObjectives,
        recommendedId: 'cotizaciones'
      };
    default:
      return {
        list: allObjectives,
        recommendedId: 'preguntas_frecuentes'
      };
  }
};

const AgentesIA = ({ user, onLogout }) => {
  const getMediaUrl = (url) => {
    if (!url) return '';
    const raw = String(url).trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    const cleanPath = raw.replace(/^[\/\\]*(uploads|media)?[\/\\]*/, '');
    return `${API_URL}/media/${cleanPath}`;
  };

  const cleanPhoneFromJid = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.split('@')[0].split(':')[0].replace(/\D/g, '') || raw;
  };

  const looksLikeTechnicalName = (value) => {
    const text = String(value || '').trim();
    if (!text) return true;
    const lower = text.toLowerCase();
    if (lower.includes('@lid') || lower.includes('@broadcast')) return true;
    if (lower.endsWith('@s.whatsapp.net') || lower.endsWith('@g.us')) return true;
    const digits = text.replace(/\D/g, '');
    return digits.length >= 6 && /^[\d\s+().-]+$/.test(text);
  };

  const GENERIC_PLACEHOLDERS = new Set([
    'grupo de whatsapp',
    'whatsapp group',
    'group',
    'sin nombre',
    'contacto de whatsapp',
    'none',
    'null',
    'undefined',
  ]);

  const isGenericPlaceholder = (value) => {
    const text = String(value || '').trim().toLowerCase();
    if (GENERIC_PLACEHOLDERS.has(text)) return true;
    if (/^grupo\s+\d+$/i.test(text)) return true;
    if (/^\d{10,}$/.test(text)) return true;
    return false;
  };

  const chatVisibleName = (contact) => {
    if (!contact) return 'Cargando...';
    const isGroup = contact.is_group || String(contact.jid || '').endsWith('@g.us');

    const candidates = [
      contact.subject,
      contact.group_subject,
      contact.nombre,
      contact.display_name,
      contact.push_name,
    ];

    const filteredCandidates = isGroup
      ? candidates.filter(c => c !== contact.push_name)
      : candidates;

    const realName = filteredCandidates.find(
      (value) => value && !looksLikeTechnicalName(value) && !isGenericPlaceholder(value)
    );

    if (realName) return String(realName).trim();
    if (isGroup) return 'Grupo de WhatsApp';

    return cleanPhoneFromJid(contact.telefono || contact.jid) || 'Contacto de WhatsApp';
  };

  const formatMessageText = (text) => {
    if (!text) return '';
    const str = String(text);
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const linkChunkRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;

    const renderLinkifiedText = (value, keyPrefix) =>
      value.split(linkRegex).map((chunk, chunkIndex) => {
        if (!chunk) return null;
        if (linkChunkRegex.test(chunk)) {
          const href = /^https?:\/\//i.test(chunk) ? chunk : `https://${chunk}`;
          return (
            <a
              key={`${keyPrefix}-link-${chunkIndex}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 font-semibold underline underline-offset-4 decoration-emerald-300 text-inherit hover:bg-white/25 hover:text-[#bae6fd] break-all transition-colors"
            >
              {chunk}
            </a>
          );
        }
        return <React.Fragment key={`${keyPrefix}-text-${chunkIndex}`}>{chunk}</React.Fragment>;
      });

    const parts = str.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g);

    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="font-bold">{renderLinkifiedText(part.slice(1, -1), `bold-${index}`)}</strong>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={index} className="italic">{renderLinkifiedText(part.slice(1, -1), `italic-${index}`)}</em>;
      }
      if (part.startsWith('~') && part.endsWith('~')) {
        return <s key={index} className="line-through opacity-70">{renderLinkifiedText(part.slice(1, -1), `strike-${index}`)}</s>;
      }
      return <React.Fragment key={`plain-${index}`}>{renderLinkifiedText(part, `plain-${index}`)}</React.Fragment>;
    });
  };

  const getAvatarInitial = (contact) => {
    const name = chatVisibleName(contact);
    if (!name) return 'C';
    const clean = name.replace(/[^a-zA-Z0-9]/g, '');
    return clean ? clean.charAt(0).toUpperCase() : 'C';
  };

  const [agents, setAgents] = useState([]);

  const getPlanBadge = (isDetail = false) => {
    const planName = dashboardData?.plan?.nombre || 'Starter';
    const planNameLower = planName.toLowerCase();

    if (planNameLower === 'starter') {
      return (
        <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
          {isDetail ? 'Máx 1MB' : 'Límite 1MB'}
        </span>
      );
    } else if (planNameLower === 'growth') {
      return (
        <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
          {isDetail ? 'Máx 10MB' : 'Límite 10MB'}
        </span>
      );
    } else {
      const formattedName = planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase();
      return (
        <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Sparkles size={10} className="text-purple-500 fill-purple-500" />
          {formattedName}
        </span>
      );
    }
  };

  const getBusinessNamePlaceholder = (industry) => {
    switch (industry) {
      case 'restaurante': return 'Restaurante el buen sabor';
      case 'clinica': return 'Clínica Médica San José';
      case 'ecommerce': return 'Tienda de ropa Express';
      case 'inmobiliaria': return 'Inmobiliaria Raíces Fuertes';
      case 'gimnasio': return 'Gimnasio Power Fit';
      case 'belleza': return 'Salón de Belleza Bella Donna';
      case 'servicios': return 'Despacho Jurádico Asociado';
      case 'academia': return 'Academia de Idiomas Smart';
      default: return 'Mi Negocio';
    }
  };

  const getBusinessDescriptionTemplate = (industry) => {
    switch (industry) {
      case 'restaurante':
        return 'Restaurante de [tipo de cocina]. Horarios: lunes a viernes de [X]am a [X]pm, fines de semana de [X]am a [X]pm. Ubicación: [dirección]. Capacidad: [X] personas. Reservaciones para grupos de más de [X] personas.';
      case 'clinica':
        return 'Clínica de especialidad [especialidad]. Doctores disponibles: [Nombres]. Horarios de atención: lunes a viernes de [X]am a [X]pm. Ubicación: [dirección]. Información para citas: requerimos [requisitos, ej: cédula o seguro].';
      case 'ecommerce':
        return 'Tienda online de [tipo de productos, ej: ropa, tecnología]. Horarios de soporte: [X]am a [X]pm. Métodos de pago: [tarjeta, transferencia, etc.]. Envíos a todo el país mediante [servicios de entrega]. Tiempos de entrega aproximados: [días].';
      case 'inmobiliaria':
        return 'Agencia inmobiliaria enfocada en [alquiler/venta] de propiedades en [zonas/ciudades]. Horarios de atención: [X]am a [X]pm. Ofrecemos visitas presenciales los días [días de visitas]. Contactar para requisitos de arriendo o compra.';
      case 'gimnasio':
        return 'Centro de entrenamiento fitness. Clases disponibles: [ej: Crossfit, Cardio, Yoga]. Planes mensuales desde $[X]. Horarios: lunes a sábado de [X]am a [X]pm. Dirección: [dirección]. Requisitos: ropa deportiva y toalla.';
      case 'belleza':
        return 'Salón de estética y spa. Servicios: [ej: cortes, manicura, masajes]. Promociones los días [días, ej: martes y miércoles]. Horario de atención: [X]am a [X]pm. Ubicación: [dirección]. Se requiere agendar cita previa.';
      case 'servicios':
        return 'Firma de servicios profesionales en [Área, ej: legal, contable, consultoría]. Consultas iniciales de [X] minutos. Horario de atención: lunes a viernes de [X]am a [X]pm. Ubicación: [dirección].';
      case 'academia':
        return 'Institución educativa de [cursos/carreras]. Cursos presenciales y online disponibles. Costo de matrícula: $[X]. Requisitos de inscripción: [requisitos]. Horarios de clases: [horarios]. Dirección: [dirección].';
      default:
        return '';
    }
  };
  const [advisors, setAdvisors] = useState(['Wendy Nicole Llivichuzca', 'Carlos López', 'María García', 'Juan Pérez']);
  const [stats, setStats] = useState({ total: 0, activos: 0, knowledge_base_mb: 0.0 });
  const [devices, setDevices] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos'); // Todos, Activos, Inactivos
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    nombre: true,
    descripcion: true,
    objective: true,
    estado: true
  });
  const [pageSize, setPageSize] = useState(10);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');

  // Resetear página al filtrar o buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Vista Detallada (Configurar Superagente Fullscreen)
  const [activeDetailAgent, setActiveDetailAgent] = useState(null);
  const [activeMenuTab, setActiveMenuTab] = useState('General');
  const [isEditingDetailName, setIsEditingDetailName] = useState(false);
  const [detailNameValue, setDetailNameValue] = useState('');

  // Auditoría (Asistente de Configuración)
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditStep, setAuditStep] = useState('landing'); // 'landing' o 'chat'
  const [auditMessages, setAuditMessages] = useState([]);
  const [auditInput, setAuditInput] = useState('');
  const [isApplyingAuditChanges, setIsApplyingAuditChanges] = useState(false);
  const [agentGaps, setAgentGaps] = useState([]);
  const [isGapsLoading, setIsGapsLoading] = useState(false);

  // Simulador de Pruebas (Probar Asistente)
  const [showTestDrawer, setShowTestDrawer] = useState(false);
  const [testMessages, setTestMessages] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [isTestTyping, setIsTestTyping] = useState(false);
  const [testMediaFile, setTestMediaFile] = useState(null);
  const [testMediaUploadLoading, setTestMediaUploadLoading] = useState(false);
  const testImageInputRef = useRef(null);
  const testAudioInputRef = useRef(null);

  // Tab Conversación / Pasos de Captura
  const [convSubTab, setConvSubTab] = useState('Pasos');
  const [captureSteps, setCaptureSteps] = useState([
    { id: 1, text: 'Solicita el nombre del cliente de forma natural y cálida', field: null, enabled: true },
    { id: 2, text: 'Pregunta el número de teléfono para confirmar la reservación', field: null, enabled: true }
  ]);
  const [skipExistingData, setSkipExistingData] = useState(false);
  const [quickActions, setQuickActions] = useState({ nombre: false, email: false });
  const [openFieldDropdownId, setOpenFieldDropdownId] = useState(null);
  const [fieldSearchTerm, setFieldSearchTerm] = useState('');
  const [auditApplyClicks, setAuditApplyClicks] = useState(0);

  // Tab Conversación / Seguimientos
  const [followUpMessages, setFollowUpMessages] = useState([
    { id: 1, text: '¡Hola! 😊 ¿Sigues por ahí? Quería saber si tienes alguna duda o si te puedo ayudar con algo más.', time: 30, unit: 'min' }
  ]);
  const [inactivityTimeout, setInactivityTimeout] = useState(30);
  const [inactivityUnit, setInactivityUnit] = useState('minutos');

  // Tab Conversación / Voz
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Sarah - Mature, Reassuring, Confident');
  const [voicePercentage, setVoicePercentage] = useState(50);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);

  // Tab Conversación / Comportamiento
  const [useEmojis, setUseEmojis] = useState(true);
  const [onlyBusinessTopics, setOnlyBusinessTopics] = useState(true);
  const [divideMessages, setDivideMessages] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [responseTime, setResponseTime] = useState('Inmediatamente');
  const [messageLimit, setMessageLimit] = useState(10);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(true);
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [showResponseTimeDropdown, setShowResponseTimeDropdown] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const getDynamicTimezones = () => {
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
        const zones = Intl.supportedValuesOf('timeZone');
        const grouped = {};
        zones.forEach(zone => {
          const parts = zone.split('/');
          if (parts.length > 1) {
            const continent = parts[0];
            if (!grouped[continent]) grouped[continent] = [];
            grouped[continent].push(zone);
          } else {
            if (!grouped['Otros']) grouped['Otros'] = [];
            grouped['Otros'].push(zone);
          }
        });
        return grouped;
      }
    } catch (e) {
      console.error("Error generating timezones:", e);
    }
    return {
      'America': ['America/Guayaquil', 'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Caracas', 'America/Buenos_Aires', 'America/Mexico_City', 'America/New_York', 'America/Chicago', 'America/Los_Angeles'],
      'Europe': ['Europe/Madrid', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome'],
      'Otros': ['UTC']
    };
  };
  const ALL_TIMEZONES = getDynamicTimezones();

  // Tab Conversación / Calendario
  const [calendarName, setCalendarName] = useState('Sofia - Calendario');
  const [calendarDesc, setCalendarDesc] = useState('');
  const [calTab, setCalTab] = useState('Agendas');
  const [calProvider, setCalProvider] = useState('Google Calendar');
  const [calGoogleMeet, setCalGoogleMeet] = useState(false);
  const [calConsultarHorarios, setCalConsultarHorarios] = useState(true);
  const [calAsunto, setCalAsunto] = useState('Reunion con {name}');
  const [calComApiKey, setCalComApiKey] = useState('');
  const [calComEventId, setCalComEventId] = useState('12345');

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Estados adicionales para la alineación del panel
  const [activeKTab, setActiveKTab] = useState('Texto');
  const [showUploadRecursoModal, setShowUploadRecursoModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showOptionCountDropdown, setShowOptionCountDropdown] = useState(false);
  const [showRecursoTypeDropdown, setShowRecursoTypeDropdown] = useState(false);
  const [newRecursoType, setNewRecursoType] = useState('Imagen');
  const [newRecursoDesc, setNewRecursoDesc] = useState('');
  const [newRecursoNotes, setNewRecursoNotes] = useState('');

  // Nuevos estados para los modales de Conocimiento
  const [showAddTextoModal, setShowAddTextoModal] = useState(false);
  const [textoTitle, setTextoTitle] = useState('');
  const [textoContent, setTextoContent] = useState('');

  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [urlImportType, setUrlImportType] = useState('pagina'); // 'pagina' o 'sitio'
  const [webPageUrl, setWebPageUrl] = useState('');
  const [webMaxPages, setWebMaxPages] = useState(50);
  const [webDesc, setWebDesc] = useState('');

  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLanguage, setVideoLanguage] = useState('Español');
  const [showVideoLanguageDropdown, setShowVideoLanguageDropdown] = useState(false);
  const [videoDesc, setVideoDesc] = useState('');

  // === ESTADOS PARA RECURSOS MULTIMEDIA ===
  const [recursosList, setRecursosList] = useState([]);
  const [recursosLoading, setRecursosLoading] = useState(false);
  const [selectedRecursoFile, setSelectedRecursoFile] = useState(null);
  const [isUploadingRecurso, setIsUploadingRecurso] = useState(false);
  const fileInputRef = useRef(null);

  // === ESTADOS PARA BASE DE CONOCIMIENTO ===
  const [conocimientoList, setConocimientoList] = useState([]);
  const [conocimientoLoading, setConocimientoLoading] = useState(false);
  const [isAddingConocimiento, setIsAddingConocimiento] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const docFileInputRef = useRef(null);

  const [calReunionDesc, setCalReunionDesc] = useState('');
  const [calProactiveSuggestions, setCalProactiveSuggestions] = useState(true);
  const [calOptionCount, setCalOptionCount] = useState('3 opciones');
  const [calConfirmationMsg, setCalConfirmationMsg] = useState(
    `¡Cita confirmada! 🎉

📅 Fecha: {{fecha}}
🕐 Hora: {{hora}}
👤 Nombre: {{nombre}}
📧 Email: {{email}}
📝 Motivo: {{motivo}}
⏱️ Duración: {{duracion}}`
  );
  const [calScheduleRestriction, setCalScheduleRestriction] = useState(false);
  const [calDistributionMode, setCalDistributionMode] = useState('secuencial');
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  const [calWorkingHours, setCalWorkingHours] = useState({
    lunes: { active: true, start: '09:00', end: '18:00' },
    martes: { active: true, start: '09:00', end: '18:00' },
    miercoles: { active: true, start: '09:00', end: '18:00' },
    jueves: { active: true, start: '09:00', end: '18:00' },
    viernes: { active: true, start: '09:00', end: '18:00' },
    sabado: { active: false, start: '09:00', end: '14:00' },
    domingo: { active: false, start: '09:00', end: '14:00' }
  });
  const [showServiciosModal, setShowServiciosModal] = useState(false);
  const [calServicios, setCalServicios] = useState([]);
  const [calGoogleConnected, setCalGoogleConnected] = useState(false);
  const [calGoogleEmail, setCalGoogleEmail] = useState('');
  const [calCalendlyConnected, setCalCalendlyConnected] = useState(false);
  const [calCalendlyEmail, setCalCalendlyEmail] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectModalType, setConnectModalType] = useState('Google Calendar');
  const [tempConnectEmail, setTempConnectEmail] = useState('');
  // Estados para el módulo de Acciones
  const [activeAccionesSubTab, setActiveAccionesSubTab] = useState('Transferencias');
  const [transferRules, setTransferRules] = useState([
    { id: 1, text: 'Transferir a humano cuando el cliente tenga una solicitud especial, una queja, o pida hablar con una persona', type: 'Humano', target: 'Elegir...' }
  ]);
  const [labelRules, setLabelRules] = useState([
    { id: 1, text: 'Nueva condición', action: 'Agregar', label: 'Vendor', color: '#a855f7' }
  ]);
  const [showDeleteRuleModal, setShowDeleteRuleModal] = useState(false);
  const [ruleToDeleteId, setRuleToDeleteId] = useState(null);
  const [ruleToDeleteType, setRuleToDeleteType] = useState('transferencia'); // 'transferencia' o 'etiquetado'

  const [openTransferTypeDropdownId, setOpenTransferTypeDropdownId] = useState(null);
  const [openTransferTargetDropdownId, setOpenTransferTargetDropdownId] = useState(null);
  const [openLabelActionDropdownId, setOpenLabelActionDropdownId] = useState(null);
  const [openLabelTagDropdownId, setOpenLabelTagDropdownId] = useState(null);
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [availableSuperagents, setAvailableSuperagents] = useState([]);
  const [availableFlows, setAvailableFlows] = useState([]);

  // Estados para los nuevos modales de General
  const [showChangeObjectiveModal, setShowChangeObjectiveModal] = useState(false);
  const [showObjectiveOverwriteWarning, setShowObjectiveOverwriteWarning] = useState(false);
  const [tempSelectedObjective, setTempSelectedObjective] = useState('');

  const [showEditInstructionsModal, setShowEditInstructionsModal] = useState(false);
  const [editInstTab, setEditInstTab] = useState('rol'); // 'rol', 'negocio', 'reglas'
  const [tempInstName, setTempInstName] = useState('');
  const [tempInstRol, setTempInstRol] = useState('');
  const [tempInstNegocio, setTempInstNegocio] = useState('');
  const [tempInstReglas, setTempInstReglas] = useState('');
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);

  // Estados para Auto-Tareas
  const [seguimientoInteligente, setSeguimientoInteligente] = useState(false);
  const [autoTareaFilter, setAutoTareaFilter] = useState('Todas');
  const [autoTareas, setAutoTareas] = useState([]);
  const [loadingAutoTareas, setLoadingAutoTareas] = useState(false);

  // Estados para Actividad
  const [actividadSubTab, setActividadSubTab] = useState('Metricas');
  const [metricsPeriod, setMetricsPeriod] = useState('7dias');
  const [conversacionFilter, setConversacionFilter] = useState('Todas');
  const [contactSearch, setContactSearch] = useState('');
  const messagesEndRef = useRef(null);
  const [activityStats, setActivityStats] = useState({
    conversations: 0,
    messages_sent: 0,
    pending_human: 0,
    transferred: 0,
    resolved: 0,
    resolution_rate: 0,
    timeline: []
  });
  const [loadingActivityStats, setLoadingActivityStats] = useState(false);
  const [activityConversations, setActivityConversations] = useState([]);
  const [loadingActivityConversations, setLoadingActivityConversations] = useState(false);
  const [selectedChatJid, setSelectedChatJid] = useState(null);
  const [selectedChatMessages, setSelectedChatMessages] = useState([]);
  const [loadingSelectedMessages, setLoadingSelectedMessages] = useState(false);

  // Menú "..." del detalle del agente
  const [showDetailMoreMenu, setShowDetailMoreMenu] = useState(false);


  const [modalStep, setModalStep] = useState(1); // Paso 1: Selección industria, Paso 2: Selección objetivo, Paso 3: Detalles del negocio
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    dispositivo_id: '',
    modelo: 'gpt-4',
    instrucciones: '',
    personalidad: '',
    activo: true,
    descripcion_negocio: '',
    industria: '',
    objetivo: ''
  });

  const getAuthToken = () => {
    const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
    return savedUser?.token || localStorage.getItem('geochat_token');
  };

  const fetchAgentsAndStats = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      // 1. Cargar agentes
      const agentsRes = await fetch(`${API_URL}/api/agentes-ia`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const agentsData = await agentsRes.json();
      if (agentsData.success) {
        setAgents(agentsData.data);
        if (activeDetailAgent) {
          const freshActive = agentsData.data.find(a => a.id === activeDetailAgent.id);
          if (freshActive) {
            setActiveDetailAgent(freshActive);
          }
        }
      }

      // 2. Cargar stats
      const statsRes = await fetch(`${API_URL}/api/agentes-ia/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats({
          total: statsData.total,
          activos: statsData.activos,
          knowledge_base_mb: parseFloat(statsData.knowledge_base_mb) || 0
        });
      }

      // 3. Cargar dispositivos (para el dropdown de asignación)
      const devicesRes = await fetch(`${API_URL}/api/dashboard/${user?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const devicesData = await devicesRes.json();
      if (devicesData.success && devicesData.dashboard && Array.isArray(devicesData.dashboard.dispositivos)) {
        setDevices(devicesData.dashboard.dispositivos);
      } else {
        setDevices([]);
      }
    } catch (err) {
      console.error('Error al cargar agentes o estadásticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisors = async () => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia/asesores`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success && data.advisors) {
        setAdvisors(data.advisors);
      }
    } catch (err) {
      console.error("Error fetching advisors:", err);
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/dashboard/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.dashboard);
      }
    } catch (err) {
      console.error("Error fetching dashboard details:", err);
    }
  };

  const fetchCustomFields = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${API_URL}/api/campos-customizados?user_id=${user.id}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        const fieldNames = data.map(f => f.nombre);
        setCustomFields(fieldNames);
      }
    } catch (err) {
      console.error("Error fetching custom fields:", err);
    }
  };

  useEffect(() => {
    fetchAgentsAndStats();
    fetchAdvisors();
    fetchDashboardData();
    fetchCustomFields();
  }, [user]);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (isCreatingAgent) return;
    if (!formData.nombre.trim()) {
      showNotification("Por favor escribe un nombre para tu superagente.", "error");
      return;
    }

    // Auto-asignar el primer dispositivo disponible si no hay ninguno seleccionado
    const dispositivoId = formData.dispositivo_id || devices[0]?.id || null;

    const industryTemplate = TEMPLATES.find(t => t.id === formData.industria);
    const objectiveTemplate = OBJECTIVES.find(o => o.id === formData.objetivo);

    // Si hay plantilla, usar sus instrucciones base
    let baseInstructions = industryTemplate ? industryTemplate.instructions : 'Eres un asistente virtual de atención al cliente.';
    let basePersonality = industryTemplate ? industryTemplate.personality : 'Educado, rápido, cordial y servicial.';

    // Si hay objetivo, agregar el prompt
    let objectiveInstructions = objectiveTemplate ? `Tu objetivo principal es: ${objectiveTemplate.title}. ${objectiveTemplate.description}.` : '';

    const finalInstructions = `${baseInstructions}\n\n${objectiveInstructions}`.trim();

    setIsCreatingAgent(true);
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dispositivo_id: dispositivoId ? parseInt(dispositivoId) : null,
          nombre: formData.nombre,
          modelo: formData.modelo,
          instrucciones: finalInstructions,
          personalidad: basePersonality,
          descripcion_negocio: formData.descripcion_negocio,
          industria: formData.industria,
          objetivo: formData.objetivo,
          activo: formData.activo
        })
      });
      const res = await response.json();
      if (res.success) {
        setShowCreateModal(false);
        resetForm();
        fetchAgentsAndStats();
        showNotification("Superagente creado con éxito.");
      } else {
        showNotification(res.message || "Error al crear el superagente.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error en la conexión con el servidor.", "error");
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const handleToggleDetailActive = () => {
    if (!activeDetailAgent) return;
    handleToggleActive(activeDetailAgent);
  };

  const handleSaveDetailName = async () => {
    if (!detailNameValue.trim() || !activeDetailAgent) return;
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: detailNameValue.trim() })
      });
      const res = await response.json();
      if (res.success) {
        setActiveDetailAgent(prev => ({ ...prev, nombre: detailNameValue.trim() }));
        setIsEditingDetailName(false);
        fetchAgentsAndStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // === FUNCIONES PARA GESTIONAR RECURSOS ===
  const fetchRecursos = async (agentId) => {
    if (!agentId) return;
    setRecursosLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/agentes-ia/${agentId}/recursos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setRecursosList(data.data || []);
      } else {
        showNotification(data.message || 'Error al obtener recursos', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error al conectar con el servidor', 'error');
    } finally {
      setRecursosLoading(false);
    }
  };

  const handleUploadRecurso = async () => {
    if (!selectedRecursoFile) {
      showNotification('Por favor, selecciona un archivo', 'error');
      return;
    }

    setIsUploadingRecurso(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedRecursoFile);
      formData.append('tipo', newRecursoType);
      formData.append('descripcion', newRecursoDesc);
      formData.append('notas_uso', newRecursoNotes);

      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/recursos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        showNotification('Recurso subido con éxito', 'success');
        setShowUploadRecursoModal(false);
        setSelectedRecursoFile(null);
        setNewRecursoDesc('');
        setNewRecursoNotes('');
        fetchRecursos(activeDetailAgent.id);
      } else {
        showNotification(data.message || 'Error al subir el recurso', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error al conectar con el servidor', 'error');
    } finally {
      setIsUploadingRecurso(false);
    }
  };

  const handleDeleteRecurso = async (recursoId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este recurso?')) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/recursos/${recursoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        showNotification('Recurso eliminado con éxito', 'success');
        fetchRecursos(activeDetailAgent.id);
      } else {
        showNotification(data.message || 'Error al eliminar el recurso', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error al conectar con el servidor', 'error');
    }
  };

  useEffect(() => {
    if (activeDetailAgent && convSubTab === 'Recursos') {
      fetchRecursos(activeDetailAgent.id);
    }
  }, [activeDetailAgent, convSubTab]);

  useEffect(() => {
    if (activeDetailAgent && activeDetailAgent.objetivo !== 'agendar_citas' && convSubTab === 'Calendario') {
      setConvSubTab('Pasos');
    }
  }, [activeDetailAgent?.objetivo, convSubTab]);

  // === FUNCIONES PARA GESTIONAR BASE DE CONOCIMIENTO ===
  const fetchConocimiento = async (agentId, tipo = null) => {
    if (!agentId) return;
    setConocimientoLoading(true);
    try {
      const token = getAuthToken();
      let url = `${API_URL}/api/agentes-ia/${agentId}/conocimiento`;
      if (tipo) {
        url += `?tipo=${tipo}`;
      }
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setConocimientoList(data.data || []);
      } else {
        showNotification(data.message || 'Error al obtener base de conocimiento', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error al conectar con el servidor', 'error');
    } finally {
      setConocimientoLoading(false);
    }
  };

  const handleAddConocimiento = async (tipo, fields) => {
    setIsAddingConocimiento(true);
    try {
      const token = getAuthToken();

      let res;
      if (tipo === 'Doc') {
        const formData = new FormData();
        formData.append('tipo', 'Doc');
        formData.append('titulo', fields.titulo);
        if (fields.file) {
          formData.append('file', fields.file);
        }
        if (fields.contenido) {
          formData.append('contenido', fields.contenido);
        }
        res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/conocimiento`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/conocimiento`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tipo,
            titulo: fields.titulo,
            contenido: fields.contenido,
            url: fields.url
          })
        });
      }

      const data = await res.json();
      if (data.success) {
        showNotification('Entrenamiento agregado con éxito', 'success');
        setShowAddTextoModal(false);
        setShowUploadDocModal(false);
        setShowAddUrlModal(false);
        setShowAddVideoModal(false);
        setSelectedDocFile(null);
        setTextoTitle('');
        setTextoContent('');
        setWebPageUrl('');
        setWebDesc('');
        setVideoUrl('');
        setVideoDesc('');
        fetchConocimiento(activeDetailAgent.id, activeKTab);
      } else {
        showNotification(data.message || 'Error al agregar entrenamiento', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error al conectar con el servidor', 'error');
    } finally {
      setIsAddingConocimiento(false);
    }
  };

  const handleDeleteConocimiento = async (itemId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este entrenamiento?')) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/conocimiento/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        showNotification('Entrenamiento eliminado con éxito', 'success');
        fetchConocimiento(activeDetailAgent.id, activeKTab);
      } else {
        showNotification(data.message || 'Error al eliminar entrenamiento', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error al conectar con el servidor', 'error');
    }
  };

  useEffect(() => {
    if (activeDetailAgent && activeMenuTab === 'Conocimiento') {
      fetchConocimiento(activeDetailAgent.id, activeKTab);
    }
  }, [activeDetailAgent, activeMenuTab, activeKTab]);

  // === INTEGRACIóN REAL CON GOOGLE DRIVE ===
  const loadGoogleScripts = () => {
    return new Promise((resolve) => {
      if (window.gapi && window.google) {
        resolve(true);
        return;
      }

      const scriptGapi = document.createElement('script');
      scriptGapi.src = 'https://apis.google.com/js/api.js';
      scriptGapi.async = true;
      scriptGapi.defer = true;
      document.body.appendChild(scriptGapi);

      const scriptGsi = document.createElement('script');
      scriptGsi.src = 'https://accounts.google.com/gsi/client';
      scriptGsi.async = true;
      scriptGsi.defer = true;
      document.body.appendChild(scriptGsi);

      let interval = setInterval(() => {
        if (window.gapi && window.google) {
          clearInterval(interval);
          resolve(true);
        }
      }, 300);
    });
  };

  const handleGoogleDriveImport = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/config/google`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const config = await res.json();
      if (!config.success || !config.client_id || !config.api_key) {
        showNotification('Faltan credenciales de Google en el servidor', 'error');
        return;
      }

      showNotification('Cargando selector de Google Drive...', 'info');
      await loadGoogleScripts();

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.client_id,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response) => {
          if (response.error !== undefined) {
            console.error(response);
            showNotification('Error de autorización con Google', 'error');
            return;
          }

          const accessToken = response.access_token;

          window.gapi.load('picker', () => {
            const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
              .setMimeTypes('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv');

            const picker = new window.google.picker.PickerBuilder()
              .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
              .setDeveloperKey(config.api_key)
              .setAppId(config.client_id.split('-')[0])
              .setOAuthToken(accessToken)
              .addView(view)
              .setCallback(async (data) => {
                if (data.action === window.google.picker.Action.PICKED) {
                  const doc = data.docs[0];
                  const fileId = doc.id;
                  const fileName = doc.name;

                  showNotification('Descargando archivo desde Google Drive...', 'info');
                  try {
                    const downloadRes = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/conocimiento/google-drive`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        file_id: fileId,
                        access_token: accessToken,
                        file_name: fileName
                      })
                    });
                    const downloadData = await downloadRes.json();
                    if (downloadData.success) {
                      showNotification('Documento de Google Drive importado con éxito', 'success');
                      fetchConocimiento(activeDetailAgent.id, activeKTab);
                    } else {
                      showNotification(downloadData.message || 'Error al importar desde Google Drive', 'error');
                    }
                  } catch (err) {
                    console.error(err);
                    showNotification('Error de conexión con el servidor', 'error');
                  }
                }
              })
              .build();
            picker.setVisible(true);
          });
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      console.error(e);
      showNotification('Error al iniciar la integración con Google Drive', 'error');
    }
  };


  const handleSaveDetailSettings = async (agentToSave = null, isAuto = true) => {
    const targetAgent = agentToSave || activeDetailAgent;
    if (!targetAgent) return;
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia/${targetAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: targetAgent.nombre,
          descripcion_negocio: targetAgent.descripcion_negocio,
          instrucciones: targetAgent.instrucciones,
          personalidad: targetAgent.personalidad,
          industria: targetAgent.industria,
          objetivo: targetAgent.objetivo,
          dispositivo_id: targetAgent.dispositivo_id,
          pasos_captura: JSON.stringify(captureSteps),
          skip_existing_data: skipExistingData ? 1 : 0,
          seguimientos: JSON.stringify(followUpMessages),
          reglas_transferencia: JSON.stringify(transferRules),
          reglas_etiquetado: JSON.stringify(labelRules),
          config_comportamiento: JSON.stringify({
            useEmojis,
            onlyBusinessTopics,
            divideMessages,
            responseTime,
            messageLimit,
            selectedTimezone,
            inactivityTimeout,
            inactivityUnit,
            voiceEnabled,
            selectedVoice,
            voicePercentage,
            calendarName,
            calendarDesc,
            calProvider,
            calGoogleMeet,
            calConsultarHorarios,
            calAsunto,
            calComApiKey,
            calComEventId,
            calReunionDesc,
            calProactiveSuggestions,
            calOptionCount,
            calConfirmationMsg,
            calScheduleRestriction,
            calDistributionMode,
            calWorkingHours,
            calServicios,
            calGoogleConnected,
            calGoogleEmail,
            calCalendlyConnected,
            calCalendlyEmail,
            seguimientoInteligente
          })
        })
      });
      const res = await response.json();
      if (res.success) {
        if (!isAuto) {
          showNotification("Configuración guardada con éxito.");
        }
        fetchAgentsAndStats();
      } else {
        if (!isAuto) {
          showNotification(res.message || "Error al guardar la configuración.", "error");
        }
      }
    } catch (err) {
      console.error(err);
      if (!isAuto) {
        showNotification("Error de conexión al guardar.", "error");
      }
    }
  };

  const saveAgentConfigurations = async (updatedFields = {}) => {
    if (!activeDetailAgent) return;
    const token = getAuthToken();

    const payload = {
      nombre: activeDetailAgent.nombre,
      descripcion_negocio: activeDetailAgent.descripcion_negocio,
      instrucciones: activeDetailAgent.instrucciones,
      dispositivo_id: activeDetailAgent.dispositivo_id,
      pasos_captura: JSON.stringify(updatedFields.captureSteps !== undefined ? updatedFields.captureSteps : captureSteps),
      skip_existing_data: updatedFields.skipExistingData !== undefined ? (updatedFields.skipExistingData ? 1 : 0) : (skipExistingData ? 1 : 0),
      seguimientos: JSON.stringify(updatedFields.followUpMessages !== undefined ? updatedFields.followUpMessages : followUpMessages),
      reglas_transferencia: JSON.stringify(updatedFields.transferRules !== undefined ? updatedFields.transferRules : transferRules),
      reglas_etiquetado: JSON.stringify(updatedFields.labelRules !== undefined ? updatedFields.labelRules : labelRules),
      config_comportamiento: JSON.stringify({
        useEmojis: updatedFields.useEmojis !== undefined ? updatedFields.useEmojis : useEmojis,
        onlyBusinessTopics: updatedFields.onlyBusinessTopics !== undefined ? updatedFields.onlyBusinessTopics : onlyBusinessTopics,
        divideMessages: updatedFields.divideMessages !== undefined ? updatedFields.divideMessages : divideMessages,
        responseTime: updatedFields.responseTime !== undefined ? updatedFields.responseTime : responseTime,
        messageLimit: updatedFields.messageLimit !== undefined ? updatedFields.messageLimit : messageLimit,
        selectedTimezone: updatedFields.selectedTimezone !== undefined ? updatedFields.selectedTimezone : selectedTimezone,
        inactivityTimeout: updatedFields.inactivityTimeout !== undefined ? updatedFields.inactivityTimeout : inactivityTimeout,
        inactivityUnit: updatedFields.inactivityUnit !== undefined ? updatedFields.inactivityUnit : inactivityUnit,
        voiceEnabled: updatedFields.voiceEnabled !== undefined ? updatedFields.voiceEnabled : voiceEnabled,
        selectedVoice: updatedFields.selectedVoice !== undefined ? updatedFields.selectedVoice : selectedVoice,
        voicePercentage: updatedFields.voicePercentage !== undefined ? updatedFields.voicePercentage : voicePercentage,
        calendarName: updatedFields.calendarName !== undefined ? updatedFields.calendarName : calendarName,
        calendarDesc: updatedFields.calendarDesc !== undefined ? updatedFields.calendarDesc : calendarDesc,
        calProvider: updatedFields.calProvider !== undefined ? updatedFields.calProvider : calProvider,
        calGoogleMeet: updatedFields.calGoogleMeet !== undefined ? updatedFields.calGoogleMeet : calGoogleMeet,
        calConsultarHorarios: updatedFields.calConsultarHorarios !== undefined ? updatedFields.calConsultarHorarios : calConsultarHorarios,
        calAsunto: updatedFields.calAsunto !== undefined ? updatedFields.calAsunto : calAsunto,
        calComApiKey: updatedFields.calComApiKey !== undefined ? updatedFields.calComApiKey : calComApiKey,
        calComEventId: updatedFields.calComEventId !== undefined ? updatedFields.calComEventId : calComEventId,
        calReunionDesc: updatedFields.calReunionDesc !== undefined ? updatedFields.calReunionDesc : calReunionDesc,
        calProactiveSuggestions: updatedFields.calProactiveSuggestions !== undefined ? updatedFields.calProactiveSuggestions : calProactiveSuggestions,
        calOptionCount: updatedFields.calOptionCount !== undefined ? updatedFields.calOptionCount : calOptionCount,
        calConfirmationMsg: updatedFields.calConfirmationMsg !== undefined ? updatedFields.calConfirmationMsg : calConfirmationMsg,
        calScheduleRestriction: updatedFields.calScheduleRestriction !== undefined ? updatedFields.calScheduleRestriction : calScheduleRestriction,
        calDistributionMode: updatedFields.calDistributionMode !== undefined ? updatedFields.calDistributionMode : calDistributionMode,
        calWorkingHours: updatedFields.calWorkingHours !== undefined ? updatedFields.calWorkingHours : calWorkingHours,
        calServicios: updatedFields.calServicios !== undefined ? updatedFields.calServicios : calServicios,
        calGoogleConnected: updatedFields.calGoogleConnected !== undefined ? updatedFields.calGoogleConnected : calGoogleConnected,
        calGoogleEmail: updatedFields.calGoogleEmail !== undefined ? updatedFields.calGoogleEmail : calGoogleEmail,
        calCalendlyConnected: updatedFields.calCalendlyConnected !== undefined ? updatedFields.calCalendlyConnected : calCalendlyConnected,
        calCalendlyEmail: updatedFields.calCalendlyEmail !== undefined ? updatedFields.calCalendlyEmail : calCalendlyEmail,
        seguimientoInteligente: updatedFields.seguimientoInteligente !== undefined ? updatedFields.seguimientoInteligente : seguimientoInteligente,
      }),
      ...updatedFields
    };

    try {
      const response = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const res = await response.json();
      if (res.success) {
        setActiveDetailAgent(prev => ({
          ...prev,
          ...payload
        }));
        fetchAgentsAndStats();
      }
    } catch (err) {
      console.error("Error al guardar configuraciones:", err);
    }
  };

  const handlePlayVoiceSample = () => {
    const samples = {
      'Sarah - Mature, Reassuring, Confident': 'Hola, soy Sarah. Estoy lista para ser la voz de tu negocio y contestar las llamadas de tus clientes.',
      'Fay - Clear, Expressive': 'Hola, soy Fay. Me encanta dar instrucciones claras y expresivas para ayudar a tus usuarios de manera rápida.',
      'Matilda - Knowledgable, Professional': 'Hola, soy Matilda. Brindo un tono suave, elegante y profesional para contextos de negocio refinados.',
      'River - Relaxed, Neutral, Informative': 'Hola, soy River. Mi tono es relajado, neutral e informativo, ideal para dar soporte directo.',
      'Roger - Laid-Back, Casual, Resonant': 'Hola, soy Roger. Ofrezco un tono masculino, serio y ejecutivo para generar confianza.',
      'Will - Relaxed Optimist': 'Hola, soy Will. Soy un optimista relajado, ideal para atención al cliente fresca y jovial.'
    };
    const text = samples[selectedVoice] || 'Hola, soy tu superagente de inteligencia artificial.';

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Simular voces configurando el tono (pitch) y la velocidad (rate)
    if (selectedVoice.includes('Roger')) {
      utterance.pitch = 0.75; // Tono más grave (masculino)
      utterance.rate = 0.9;
    } else if (selectedVoice.includes('Will')) {
      utterance.pitch = 0.85; // Tono ligeramente más grave
      utterance.rate = 1.15;  // Más rápido/jovial
    } else if (selectedVoice.includes('Matilda')) {
      utterance.pitch = 1.15; // Tono más agudo/elegante
      utterance.rate = 0.95;
    } else if (selectedVoice.includes('Fay')) {
      utterance.pitch = 1.25; // Femenina muy expresiva/aguda
      utterance.rate = 1.1;
    } else if (selectedVoice.includes('River')) {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    } else { // Sarah
      utterance.pitch = 1.05;
      utterance.rate = 0.95;
    }

    const esVoice = voices.find(v => v.lang.startsWith('es'));
    if (esVoice) utterance.voice = esVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Cargar configuraciones del agente seleccionado al detalle
  useEffect(() => {
    if (!activeDetailAgent) return;

    fetchAvailableTags();
    fetchAvailableSuperagents();
    fetchAvailableFlows();
    fetchAgentGaps();

    // Cargar pasos de captura
    let steps = [];
    if (activeDetailAgent.pasos_captura) {
      try {
        steps = JSON.parse(activeDetailAgent.pasos_captura);
        setCaptureSteps(steps);
      } catch (e) {
        console.error(e);
      }
    } else {
      steps = [
        { id: 1, text: 'Solicita el nombre del cliente de forma natural y cálida', field: null, enabled: true },
        { id: 2, text: 'Pregunta el número de teléfono para confirmar la reservación', field: null, enabled: true }
      ];
      setCaptureSteps(steps);
    }

    // Calcular acciones rápidas según los pasos cargados
    const hasNombre = steps.some(s => (s.field === 'nombre' || s.text.toLowerCase().includes('nombre')) && s.enabled);
    const hasEmail = steps.some(s => (s.field === 'email' || s.text.toLowerCase().includes('email')) && s.enabled);
    setQuickActions({ nombre: hasNombre, email: hasEmail });

    // Cargar saltar pasos
    setSkipExistingData(activeDetailAgent.skip_existing_data === 1);

    // Cargar seguimientos
    if (activeDetailAgent.seguimientos) {
      try {
        setFollowUpMessages(JSON.parse(activeDetailAgent.seguimientos));
      } catch (e) {
        console.error(e);
      }
    } else {
      const industryTemplateForFollowUp = TEMPLATES.find(t => t.id === activeDetailAgent.industria);
      const defaultFollowUp = industryTemplateForFollowUp?.followUp
        || '¿Sigues por ahí? Quería saber si tienes alguna duda o si te puedo ayudar con algo más.';
      setFollowUpMessages([
        { id: 1, text: `¡Hola! 😊 Soy ${activeDetailAgent.nombre || 'tu asistente'}. ${defaultFollowUp}`, time: 30, unit: 'min' }
      ]);
    }

    // Cargar reglas de transferencia
    if (activeDetailAgent.reglas_transferencia) {
      try {
        setTransferRules(JSON.parse(activeDetailAgent.reglas_transferencia));
      } catch (e) {
        console.error(e);
      }
    } else {
      setTransferRules([
        { id: 1, text: 'Transferir a humano cuando el cliente tenga una solicitud especial, una queja, o pida hablar con una persona', type: 'Humano', target: 'Elegir...' }
      ]);
    }

    // Cargar reglas de etiquetado
    if (activeDetailAgent.reglas_etiquetado) {
      try {
        setLabelRules(JSON.parse(activeDetailAgent.reglas_etiquetado));
      } catch (e) {
        console.error(e);
      }
    } else {
      setLabelRules([
        { id: 1, text: 'Nueva condición', action: 'Agregar', label: 'Vendor', color: '#a855f7' }
      ]);
    }

    // Cargar comportamiento
    if (activeDetailAgent.config_comportamiento) {
      try {
        const config = JSON.parse(activeDetailAgent.config_comportamiento);
        if (config.useEmojis !== undefined) setUseEmojis(config.useEmojis);
        if (config.onlyBusinessTopics !== undefined) setOnlyBusinessTopics(config.onlyBusinessTopics);
        if (config.divideMessages !== undefined) setDivideMessages(config.divideMessages);
        if (config.responseTime !== undefined) setResponseTime(config.responseTime);
        if (config.messageLimit !== undefined) setMessageLimit(config.messageLimit);
        if (config.selectedTimezone !== undefined) setSelectedTimezone(config.selectedTimezone);
        if (config.inactivityTimeout !== undefined) setInactivityTimeout(config.inactivityTimeout);
        if (config.inactivityUnit !== undefined) setInactivityUnit(config.inactivityUnit);
        if (config.voiceEnabled !== undefined) setVoiceEnabled(config.voiceEnabled);
        if (config.selectedVoice !== undefined) setSelectedVoice(config.selectedVoice);
        if (config.voicePercentage !== undefined) setVoicePercentage(config.voicePercentage);
        if (config.seguimientoInteligente !== undefined) setSeguimientoInteligente(config.seguimientoInteligente);

        // Cargar calendario
        setCalendarName(config.calendarName || 'Sofia - Calendario');
        setCalendarDesc(config.calendarDesc || '');
        setCalProvider(config.calProvider || 'Google Calendar');
        setCalGoogleMeet(config.calGoogleMeet !== undefined ? config.calGoogleMeet : false);
        setCalConsultarHorarios(config.calConsultarHorarios !== undefined ? config.calConsultarHorarios : true);
        setCalAsunto(config.calAsunto || 'Reunion con {name}');
        setCalComApiKey(config.calComApiKey || '');
        setCalComEventId(config.calComEventId || '12345');
        setCalReunionDesc(config.calReunionDesc || '');
        setCalProactiveSuggestions(config.calProactiveSuggestions !== undefined ? config.calProactiveSuggestions : true);
        setCalOptionCount(config.calOptionCount || '3 opciones');
        setCalConfirmationMsg(config.calConfirmationMsg || `¡Cita confirmada! 🎉\n\n📅 Fecha: {{fecha}}\n🕐 Hora: {{hora}}\n👤 Nombre: {{nombre}}\n📧 Email: {{email}}\n📝 Motivo: {{motivo}}\n⏱️ Duración: {{duracion}}`);
        setCalScheduleRestriction(config.calScheduleRestriction !== undefined ? config.calScheduleRestriction : false);
        setCalDistributionMode(config.calDistributionMode || 'secuencial');
        setCalGoogleConnected(config.calGoogleConnected !== undefined ? config.calGoogleConnected : false);
        setCalGoogleEmail(config.calGoogleEmail || '');
        setCalCalendlyConnected(config.calCalendlyConnected !== undefined ? config.calCalendlyConnected : false);
        setCalCalendlyEmail(config.calCalendlyEmail || '');
        setCalWorkingHours(config.calWorkingHours || {
          lunes: { active: true, start: '09:00', end: '18:00' },
          martes: { active: true, start: '09:00', end: '18:00' },
          miercoles: { active: true, start: '09:00', end: '18:00' },
          jueves: { active: true, start: '09:00', end: '18:00' },
          viernes: { active: true, start: '09:00', end: '18:00' },
          sabado: { active: false, start: '09:00', end: '14:00' },
          domingo: { active: false, start: '09:00', end: '14:00' }
        });
        setCalServicios(Array.isArray(config.calServicios) ? config.calServicios : []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setUseEmojis(true);
      setOnlyBusinessTopics(true);
      setDivideMessages(true);
      setResponseTime('Inmediatamente');
      setMessageLimit(10);
      setSelectedTimezone('');
      setInactivityTimeout(30);
      setInactivityUnit('minutos');
      setVoiceEnabled(true);
      setSelectedVoice('Sarah - Mature, Reassuring, Confident');
      setVoicePercentage(50);

      // Default calendario
      setCalendarName('Sofia - Calendario');
      setCalendarDesc('');
      setCalProvider('Google Calendar');
      setCalGoogleMeet(false);
      setCalConsultarHorarios(true);
      setCalAsunto('Reunion con {name}');
      setCalComApiKey('');
      setCalComEventId('12345');
      setCalReunionDesc('');
      setCalProactiveSuggestions(true);
      setCalOptionCount('3 opciones');
      setCalConfirmationMsg(`¡Cita confirmada! 🎉\n\n📅 Fecha: {{fecha}}\n🕐 Hora: {{hora}}\n👤 Nombre: {{nombre}}\n📧 Email: {{email}}\n📝 Motivo: {{motivo}}\n⏱️ Duración: {{duracion}}`);
      setCalScheduleRestriction(false);
      setCalDistributionMode('secuencial');
      setCalGoogleConnected(false);
      setCalGoogleEmail('');
      setCalCalendlyConnected(false);
      setCalCalendlyEmail('');
      setCalWorkingHours({
        lunes: { active: true, start: '09:00', end: '18:00' },
        martes: { active: true, start: '09:00', end: '18:00' },
        miercoles: { active: true, start: '09:00', end: '18:00' },
        jueves: { active: true, start: '09:00', end: '18:00' },
        viernes: { active: true, start: '09:00', end: '18:00' },
        sabado: { active: false, start: '09:00', end: '14:00' },
        domingo: { active: false, start: '09:00', end: '14:00' }
      });
      setCalServicios([]);
    }

  }, [activeDetailAgent?.id]);

  const fetchAutoTareas = async () => {
    if (!activeDetailAgent) return;
    const token = getAuthToken();
    const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
    const userId = savedUser?.id || activeDetailAgent.usuario_id;
    if (!userId) return;

    setLoadingAutoTareas(true);
    try {
      const res = await fetch(`${API_URL}/api/scheduled_messages?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log("[AutoTareas] Respuesta del servidor:", data);
      if (data.success) {
        const filtered = (data.data || []).filter(msg => {
          const nombre = (msg.nombre || '').toLowerCase();
          return nombre.includes('seguimiento inteligente') || nombre.includes('seguimiento secuencial') || nombre.includes('seguimiento') || nombre.includes('recordatorio');
        });
        console.log("[AutoTareas] Tareas filtradas:", filtered);
        setAutoTareas(filtered);
      }
    } catch (err) {
      console.error("Error al cargar auto-tareas:", err);
    } finally {
      setLoadingAutoTareas(false);
    }
  };

  const handleDeleteAutoTarea = async (tareaId) => {
    if (!window.confirm("¿Deseas eliminar esta auto-tarea programada?")) return;
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/api/scheduled_messages/${tareaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAutoTareas(prev => prev.filter(t => t.id !== tareaId));
      }
    } catch (err) {
      console.error("Error al eliminar auto-tarea:", err);
    }
  };

  const handleClearAllAutoTareas = async () => {
    if (!autoTareas.length) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar TODOS los recordatorios y auto-tareas?")) return;
    const token = getAuthToken();
    try {
      await Promise.all(autoTareas.map(t =>
        fetch(`${API_URL}/api/scheduled_messages/${t.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ));
      setAutoTareas([]);
    } catch (err) {
      console.error("Error al limpiar auto-tareas:", err);
    }
  };

  const getFilteredAutoTareas = () => {
    return autoTareas.filter(t => {
      if (autoTareaFilter === 'Todas') return true;
      if (autoTareaFilter === 'Pendientes') return t.status === 'Programado' || t.status === 'Enviando';
      if (autoTareaFilter === 'Enviadas') return t.status === 'Completado';
      if (autoTareaFilter === 'Fallidas') return t.status === 'Fallido';
      return true;
    });
  };

  const autoTareaCounts = {
    Todas: autoTareas.length,
    Pendientes: autoTareas.filter(t => t.status === 'Programado' || t.status === 'Enviando').length,
    Enviadas: autoTareas.filter(t => t.status === 'Completado').length,
    Fallidas: autoTareas.filter(t => t.status === 'Fallido').length
  };

  useEffect(() => {
    if (activeMenuTab === 'Auto-Tareas' && activeDetailAgent) {
      fetchAutoTareas();
    }
  }, [activeMenuTab, activeDetailAgent]);

  const fetchActivityStats = async () => {
    if (!activeDetailAgent) return;
    const token = getAuthToken();
    setLoadingActivityStats(true);
    try {
      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/activity/stats?period=${metricsPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActivityStats(data);
      }
    } catch (err) {
      console.error("Error al cargar estadísticas de actividad:", err);
    } finally {
      setLoadingActivityStats(false);
    }
  };

  const fetchActivityConversations = async () => {
    if (!activeDetailAgent) return;
    const token = getAuthToken();
    setLoadingActivityConversations(true);
    try {
      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/activity/conversations?filter=${conversacionFilter}&search=${encodeURIComponent(contactSearch)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActivityConversations(data.data || []);
      }
    } catch (err) {
      console.error("Error al cargar conversaciones de actividad:", err);
    } finally {
      setLoadingActivityConversations(false);
    }
  };

  const fetchConversationMessages = async (chatJid) => {
    if (!activeDetailAgent || !chatJid) return;
    const token = getAuthToken();
    setLoadingSelectedMessages(true);
    setSelectedChatJid(chatJid);
    try {
      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/activity/conversations/${chatJid}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedChatMessages(data.data || []);
      }
    } catch (err) {
      console.error("Error al cargar mensajes del chat:", err);
    } finally {
      setLoadingSelectedMessages(false);
    }
  };

  const fetchAgentGaps = async () => {
    if (!activeDetailAgent) return;
    const token = getAuthToken();
    setIsGapsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/audit-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAgentGaps(data.gaps || []);
      }
    } catch (err) {
      console.error("Error al cargar gaps de auditoría:", err);
    } finally {
      setIsGapsLoading(false);
    }
  };

  useEffect(() => {
    if (showAuditModal && activeDetailAgent) {
      fetchAgentGaps();
    }
  }, [showAuditModal, activeDetailAgent]);

  useEffect(() => {
    if (activeMenuTab === 'Actividad' && activeDetailAgent) {
      if (actividadSubTab === 'Metricas') {
        fetchActivityStats();
      } else {
        fetchActivityConversations();
        setSelectedChatJid(null);
        setSelectedChatMessages([]);
      }
    }
  }, [activeMenuTab, activeDetailAgent, actividadSubTab, metricsPeriod, conversacionFilter]);

  useEffect(() => {
    if (activeMenuTab === 'Actividad' && activeDetailAgent && actividadSubTab === 'Conversaciones') {
      const delayDebounceFn = setTimeout(() => {
        fetchActivityConversations();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [contactSearch]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (selectedChatJid && selectedChatMessages.length > 0) {
      scrollToBottom();
    }
  }, [selectedChatMessages, selectedChatJid]);

  // Escuchar parámetros de redirección OAuth de Google/Calendly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const provider = params.get('provider');

    if (success === 'true') {
      const provName = provider === 'google' ? 'Google Calendar' : 'Calendly';
      showNotification(`!${provName} conectado con éxito!`);
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    } else if (error) {
      showNotification(`Error al conectar la cuenta: ${error}`, "error");
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
  }, []);

  const handleToggleActive = async (agent) => {
    const token = getAuthToken();
    const nextStatus = agent.activo === 1 ? 0 : 1;
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activo: nextStatus })
      });
      const res = await response.json();
      if (res.success) {
        if (activeDetailAgent && activeDetailAgent.id === agent.id) {
          setActiveDetailAgent(prev => ({ ...prev, activo: nextStatus }));
        }
        fetchAgentsAndStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia/${selectedAgent.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (res.success) {
        setShowDeleteModal(false);
        fetchAgentsAndStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateAgent = async (agent) => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dispositivo_id: agent.dispositivo_id,
          nombre: `${agent.nombre} (Copia)`,
          modelo: agent.modelo || 'gpt-4',
          instrucciones: agent.instrucciones || '',
          personalidad: agent.personalidad || '',
          activo: false,
          descripcion_negocio: agent.descripcion_negocio || '',
          industria: agent.industria || '',
          objetivo: agent.objetivo || ''
        })
      });
      const res = await response.json();
      if (res.success) {
        fetchAgentsAndStats();
        showNotification("Agente duplicado con éxito.");
      } else {
        showNotification(res.message || "Error al duplicar el agente.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al duplicar.", "error");
    }
  };

  // Renderizar texto enriquecido en los chats (negritas, {{variables}}, emojis)
  const renderRichText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\{\{[^}]+\}\}|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
      } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      } else if (part.startsWith('{{') && part.endsWith('}}')) {
        return <code key={i} className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-[10px] font-mono font-bold">{part}</code>;
      } else if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px] font-mono">{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const confirmAndApplyAuditChanges = async () => {
    setIsApplyingAuditChanges(true);

    let currentInst = activeDetailAgent.instrucciones || '';
    const agentName = activeDetailAgent.nombre || 'el asistente';
    const transferRule = `[Regla de transferencia] Transferir a humano cuando el cliente mencione una solicitud especial, evento corporativo, queja, alergia alimentaria, o pida hablar con una persona del restaurante.`;
    const followUpMsg = `!Hola! ?? Soy ${agentName}, de Sabor & Brasa. ¿Sigues ahí? Estoy lista para ayudarte a reservar tu mesa ???`;
    const followUpRule = `[Seguimiento automático a los 30 min] ${followUpMsg}`;
    const newInstrucciones = `${currentInst}\n\n${transferRule}\n${followUpRule}`;

    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ instrucciones: newInstrucciones })
      });
      const res = await response.json();
      if (res.success) {
        setActiveDetailAgent(prev => ({ ...prev, instrucciones: newInstrucciones }));
        setAuditApplyClicks(1);

        setAuditMessages(prev => [
          ...prev.filter(m => !m.isConfirmation),
          {
            sender: 'assistant',
            text: `? !Listo! Apliqué los 4 cambios:\n\n**Goal** � ${agentName} ahora tiene un objetivo claro: confirmar reservaciones capturando nombre y teléfono.\n**Instrucciones** � El agente tiene personalidad, tono cálido, contexto completo del restaurante y sabe cómo manejar situaciones especiales. También usa el nombre del cliente automáticamente en la conversación.\n**Regla de transferencia** � Si un cliente menciona eventos, quejas, alergias o pide hablar con alguien, será transferido a un humano de inmediato.\n**Seguimiento automático** � Si el cliente no responde, ${agentName} le enviará un recordatorio a los 30 minutos.\n\n¿Quieres ajustar algo del tono de las instrucciones, agregar más seguimientos o configurar algo adicional?`,
            appliedBanner: true,
            time: getFormattedTime()
          }
        ]);
        fetchAgentsAndStats();
      } else {
        showNotification("Error al aplicar cambios: " + res.message, "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al aplicar los cambios.", "error");
    } finally {
      setIsApplyingAuditChanges(false);
    }
  };

  const applyAuditChanges = async () => {
    if (!activeDetailAgent) return;

    if (auditApplyClicks === 1) {
      setAuditMessages(prev => [
        ...prev,
        { sender: 'user', text: 'Aplicar los cambios sugeridos', time: getFormattedTime() }
      ]);
      setIsApplyingAuditChanges(true);
      setTimeout(() => {
        setIsApplyingAuditChanges(false);
        setAuditMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: `Parece que ya apliqué todos los cambios sugeridos en la sesión anterior. ??\nLa configuración de Sofía quedó así después de los ajustes:\n\n? **Goal** � Objetivo claro de reservaciones\n? **Instrucciones** � Prompt completo con personalidad y contexto del restaurante\n? **Regla de transferencia** � Escalamiento a humano para casos especiales\n? **Seguimiento automático** � Recordatorio a los 30 minutos de inactividad\n\n¿Hay algo especéfico que quieras cambiar o mejorar ahora? Por ejemplo:\n- Ajustar el tono de las instrucciones\n- Agregar más seguimientos automáticos\n- Configurar reglas de etiquetado para segmentar clientes\n- Revisar algún otro aspecto del agente`,
            time: getFormattedTime()
          }
        ]);
        setAuditApplyClicks(2);
      }, 800);
      return;
    }

    if (auditApplyClicks >= 2) {
      setAuditMessages(prev => [
        ...prev,
        { sender: 'user', text: 'Aplicar los cambios sugeridos', time: getFormattedTime() }
      ]);
      setIsApplyingAuditChanges(true);
      setTimeout(() => {
        setIsApplyingAuditChanges(false);
        setAuditMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: `No hay cambios pendientes por aplicar en este momento. ??\nTodos los ajustes sugeridos en el análisis inicial ya fueron aplicados en sesiones anteriores. Si quieres hacer algo nuevo, cuéntame qué tienes en mente � por ejemplo:\n\n¿Quieres ajustar las instrucciones? Dime qué cambiar y lo aplico.\n¿Quieres agregar más seguimientos? Dime el tiempo y el mensaje.\n¿Quieres crear reglas de etiquetado? Dime qué tipo de clientes quieres identificar.\n¿Tienes una nueva idea para el agente? Cuéntame y lo configuramos juntos.\n¿Qué necesitas?`,
            time: getFormattedTime()
          }
        ]);
      }, 800);
      return;
    }

    setIsApplyingAuditChanges(true);
    setAuditMessages(prev => [
      ...prev,
      { sender: 'user', text: 'Aplicar los cambios sugeridos', time: getFormattedTime() }
    ]);

    setTimeout(() => {
      setAuditMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Con gusto. Antes de aplicar todo, déjame confirmarte exactamente qué voy a cambiar para que no haya sorpresas:\n\n**Goal** ? Lo reemplazo por un objetivo claro de reservaciones\n**Instrucciones** ? Redacto un prompt completo con personalidad, tono y contexto del restaurante\n**Regla de transferencia** ? Creo una regla para escalar a humano en casos especiales\n**Seguimiento automático** ? Creo un mensaje de seguimiento a los 30 minutos\n\n?? **Lo que NO puedo aplicar automáticamente:** La variable {{contact_name}} ya quedará incluida en las instrucciones que voy a generar � eso sí se aplica. Pero si quieres ajustar el mensaje de seguimiento o agregar más seguimientos después, puedes hacerlo desde el panel.\n\n¿Confirmas que aplique estos 4 cambios?`,
          time: getFormattedTime(),
          isConfirmation: true
        }
      ]);
      setIsApplyingAuditChanges(false);
    }, 800);
  };

  const handleAuditAction = async (action) => {
    if (!activeDetailAgent) return;
    setAuditStep('chat');
    setAuditMessages([{ sender: 'assistant', text: '🔍 Analizando configuración...', time: getFormattedTime() }]);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/audit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          history: []
        })
      });
      const data = await res.json();
      if (data.success) {
        setAuditMessages([
          {
            sender: 'assistant',
            text: data.reply,
            time: getFormattedTime()
          }
        ]);
        if (action === 'resolver') {
          fetchAgentsAndStats();
          fetchAgentGaps();
        }
      } else {
        setAuditMessages([{ sender: 'assistant', text: `⚠️ Error: ${data.message}`, time: getFormattedTime() }]);
      }
    } catch (err) {
      console.error(err);
      setAuditMessages([{ sender: 'assistant', text: '⚠️ Error al conectar con el asistente de configuración.', time: getFormattedTime() }]);
    }
  };

  const handleSendAuditMessage = async (e) => {
    e.preventDefault();
    if (!auditInput.trim() || !activeDetailAgent) return;

    const userText = auditInput.trim();
    setAuditMessages(prev => [...prev, { sender: 'user', text: userText, time: getFormattedTime() }]);
    setAuditInput('');
    setIsApplyingAuditChanges(true);

    try {
      const token = getAuthToken();
      const historyPayload = auditMessages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/audit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'chat',
          message: userText,
          history: historyPayload
        })
      });
      const data = await res.json();
      setIsApplyingAuditChanges(false);
      if (data.success) {
        setAuditMessages(prev => [...prev, { sender: 'assistant', text: data.reply, time: getFormattedTime() }]);
      } else {
        setAuditMessages(prev => [...prev, { sender: 'assistant', text: `⚠️ Error: ${data.message}`, time: getFormattedTime() }]);
      }
    } catch (err) {
      setIsApplyingAuditChanges(false);
      console.error(err);
      setAuditMessages(prev => [...prev, { sender: 'assistant', text: '⚠️ Error al conectar con el servidor de auditoría.', time: getFormattedTime() }]);
    }
  };

  const handleOptimizePrompt = async (type) => {
    let draft = '';
    if (type === 'rol') draft = tempInstRol;
    else if (type === 'negocio') draft = tempInstNegocio;
    else if (type === 'reglas') draft = tempInstReglas;

    if (!draft.trim()) {
      showNotification("Por favor escribe algo primero para poder optimizarlo.", "error");
      return;
    }

    setIsOptimizingPrompt(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/api/agentes-ia/optimize-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ draft, type })
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'rol') setTempInstRol(data.optimized);
        else if (type === 'negocio') setTempInstNegocio(data.optimized);
        else if (type === 'reglas') setTempInstReglas(data.optimized);
        showNotification("!Instrucciones optimizadas con IA con éxito!");
      } else {
        showNotification(data.message || "Error al optimizar con IA.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error al conectar con el servidor de IA.", "error");
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  const sendTestMessageText = async (text, fileData = null) => {
    if (!text.trim() && !fileData && !activeDetailAgent) return;

    const userText = text.trim();

    const userMsgObj = {
      sender: 'user',
      text: userText,
      time: getFormattedTime()
    };
    if (fileData) {
      userMsgObj.tipo = fileData.type;
      userMsgObj.url_media = fileData.url;
      userMsgObj.nombre_archivo = fileData.name;
      userMsgObj.mime_media = fileData.mime;
    }

    setTestMessages(prev => [...prev, userMsgObj]);
    setIsTestTyping(true);

    setTestMessages(prev => prev.map(m => m.quickReply ? { ...m, quickReply: null } : m));

    try {
      const token = getAuthToken();
      const historyPayload = testMessages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const payload = {
        message: userText,
        history: historyPayload
      };
      if (fileData) {
        payload.url_media = fileData.url;
        payload.tipo_media = fileData.type;
        payload.nombre_archivo = fileData.name;
        payload.mime_media = fileData.mime;
      }

      const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      setIsTestTyping(false);
      if (data.success) {
        if (data.transcription) {
          setTestMessages(prev => {
            const copy = [...prev];
            const lastUserIdx = copy.map(m => m.sender).lastIndexOf('user');
            if (lastUserIdx !== -1) {
              copy[lastUserIdx].text = `🎤 [Audio transcrito: "${data.transcription}"]`;
            }
            return copy;
          });
        }

        if (data.notes && data.notes.length > 0) {
          data.notes.forEach(note => {
            setTestMessages(prev => [...prev, { sender: 'system', text: note, time: getFormattedTime() }]);
          });
        }

        if (data.url_media) {
          setTestMessages(prev => [...prev, {
            sender: 'agent',
            text: '',
            tipo: data.tipo_media || 'imagen',
            url_media: data.url_media,
            time: getFormattedTime()
          }]);
        }

        if (data.reply) {
          setTestMessages(prev => [...prev, { sender: 'agent', text: data.reply, time: getFormattedTime() }]);
        }
      } else {
        setTestMessages(prev => [...prev, { sender: 'system', text: `⚠️ Error de simulación: ${data.message}`, time: getFormattedTime() }]);
      }
    } catch (err) {
      setIsTestTyping(false);
      console.error(err);
      setTestMessages(prev => [...prev, { sender: 'system', text: '⚠️ Error al conectar con el servidor de pruebas.', time: getFormattedTime() }]);
    }
  };

  const handleSendTestMessage = (e) => {
    e.preventDefault();
    if (!testInput.trim() && !testMediaFile) return;
    sendTestMessageText(testInput, testMediaFile);
    setTestInput('');
    setTestMediaFile(null);
  };

  const handleTestFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTestMediaUploadLoading(true);
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/api/agentes-ia/test-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setTestMediaFile({
          url: data.url_media,
          name: data.nombre_archivo,
          type: data.tipo_media,
          mime: data.mime_media,
          preview: URL.createObjectURL(file)
        });
      } else {
        showNotification("Error al cargar archivo de prueba: " + data.message, "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de red al subir archivo de prueba.", "error");
    } finally {
      setTestMediaUploadLoading(false);
      e.target.value = '';
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      industria: template.id,
      nombre: template.id === 'restaurante' ? 'Sofia' : `Asistente ${template.title}`,
      instrucciones: template.instructions || '',
      personalidad: template.personality || '',
      descripcion_negocio: getBusinessDescriptionTemplate(template.id),
      objetivo: getObjectivesForIndustry(template.id).recommendedId
    }));
    setModalStep(2); // Avanzar a Paso 2 (Objetivo)
  };

  const handleConfigureManual = () => {
    setSelectedTemplate({ title: 'Personalizado' });
    setFormData(prev => ({
      ...prev,
      industria: 'manual',
      nombre: 'Superagente Personalizado',
      instrucciones: 'Eres un asistente virtual para responder chats de WhatsApp de manera profesional.',
      personalidad: 'Educado, rápido, cordial y servicial.',
      descripcion_negocio: '',
      objetivo: getObjectivesForIndustry('manual').recommendedId
    }));
    setModalStep(2);
  };

  const handleSelectObjective = (objective) => {
    const allowsAllObjectives = dashboardData?.plan?.features?.todos_objetivos_ia || false;
    const isObjDisabled = objective.id !== 'preguntas_frecuentes';

    if (!allowsAllObjectives && isObjDisabled) {
      showNotification("Este objetivo está bloqueado en tu plan actual. Mejora al Plan Advanced para desbloquearlo.", "error");
      return;
    }

    setFormData(prev => ({
      ...prev,
      objetivo: objective.id
    }));
  };

  const resetForm = () => {
    setSelectedAgent(null);
    setModalStep(1);
    setSelectedTemplate(null);
    setFormData({
      nombre: '',
      dispositivo_id: devices[0]?.id || '',
      modelo: 'gpt-4',
      instrucciones: '',
      personalidad: '',
      activo: true,
      descripcion_negocio: '',
      industria: '',
      objetivo: 'agendar_citas'
    });
  };

  // Inicializar dispositivo seleccionado cuando cargan los dispositivos
  useEffect(() => {
    if (devices.length > 0 && !formData.dispositivo_id) {
      setFormData(prev => ({ ...prev, dispositivo_id: devices[0].id }));
    }
  }, [devices]);

  // Filtrado, ordenamiento y paginación local
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.instrucciones || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.dispositivo_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'Activos') {
      return matchesSearch && agent.activo === 1;
    } else if (statusFilter === 'Inactivos') {
      return matchesSearch && agent.activo === 0;
    }
    return matchesSearch;
  });

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedAgents.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedAgents = sortedAgents.slice(startIndex, startIndex + pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // --- Available labels for Etiquetado Automático -------------------
  // Se usan como respaldo solo si el usuario todavía no ha creado tags propios.
  const DEFAULT_LABELS = [
    { name: 'Vendor', color: '#a855f7' },
    { name: 'Cliente Nuevo', color: '#22c55e' },
    { name: 'Interesado', color: '#3b82f6' },
    { name: 'Calificado', color: '#f97316' },
    { name: 'Cerrado', color: '#ef4444' },
    { name: 'Seguimiento', color: '#eab308' },
  ];
  const AVAILABLE_LABELS = availableTags.length > 0
    ? availableTags.map(t => ({ name: t.nombre, color: t.color || '#a855f7' }))
    : DEFAULT_LABELS;

  const fetchAvailableTags = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAvailableTags(data.tags || []);
    } catch (err) {
      console.error("Error cargando tags disponibles:", err);
    }
  };

  // --- Available transfer targets ------------------------------------
  // Respaldo solo por si el usuario todavía no tiene otros agentes/automatizaciones creados.
  const DEFAULT_TARGETS = {
    Humano: ['Wendy Nicole Llivichuzca', 'Carlos López', 'María García', 'Juan Pérez'],
    Superagente: ['Superagente Ventas', 'Superagente Soporte', 'Superagente Citas'],
    Flujo: ['Flujo de Bienvenida', 'Flujo de Cotización', 'Flujo de Seguimiento'],
  };
  const AVAILABLE_TARGETS = {
    Humano: DEFAULT_TARGETS.Humano,
    Superagente: availableSuperagents.length > 0 ? availableSuperagents : DEFAULT_TARGETS.Superagente,
    Flujo: availableFlows.length > 0 ? availableFlows : DEFAULT_TARGETS.Flujo,
  };

  const fetchAvailableSuperagents = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/agentes-ia`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const names = (data.data || [])
          .filter(a => a.id !== activeDetailAgent?.id)
          .map(a => a.nombre)
          .filter(Boolean);
        setAvailableSuperagents(names);
      }
    } catch (err) {
      console.error("Error cargando superagentes disponibles:", err);
    }
  };

  const fetchAvailableFlows = async () => {
    try {
      const token = getAuthToken();
      const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
      const userId = savedUser?.id || activeDetailAgent?.usuario_id;
      if (!userId) return;
      const res = await fetch(`${API_URL}/api/automatizaciones/overview?all=true&user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const names = (data.automations || []).map(a => a.nombre).filter(Boolean);
        setAvailableFlows(names);
      }
    } catch (err) {
      console.error("Error cargando flujos disponibles:", err);
    }
  };

  const renderAccionesView = () => (
    <div className="space-y-6 text-left flex flex-col flex-1">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="text-slate-800" size={18} />
          <h2 className="text-base font-black text-slate-800">Acciones</h2>
        </div>
        <p className="text-xs text-slate-400 font-semibold">
          Configura las acciones que el superagente ejecuta durante la interacción
        </p>
      </div>

      {/* 50/50 Sub-tab Toggle */}
      <div className="p-1 bg-slate-100/80 rounded-2xl flex gap-1 shrink-0">
        {[
          { id: 'Transferencias', label: 'Transferencias', icon: <RefreshCw size={14} /> },
          { id: 'Etiquetado', label: 'Etiquetado Automático', icon: <Tag size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveAccionesSubTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${activeAccionesSubTab === tab.id
              ? 'bg-white shadow text-slate-800'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* -- TRANSFERENCIAS PANEL -- */}
      {activeAccionesSubTab === 'Transferencias' && (
        <div className="border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col overflow-visible">
          {/* Card Header */}
          <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-50">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              <RefreshCw size={18} className="text-slate-400" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-black text-slate-800">Transferencias ({transferRules.length}/10)</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                Define cuándo escalar la conversación a un humano, superagente o flujo
              </p>
            </div>
          </div>

          {/* Rules list */}
          <div className="divide-y divide-slate-50">
            {transferRules.map((rule, idx) => (
              <div key={rule.id} className="flex items-start gap-3 px-5 py-4">
                {/* drag handle + number */}
                <GripVertical size={14} className="text-slate-300 cursor-grab shrink-0 mt-2.5" />
                <span className="text-[11px] font-black text-slate-400 shrink-0 mt-2.5">{idx + 1}.</span>

                {/* Condition text */}
                <textarea
                  value={rule.text}
                  onChange={e => setTransferRules(prev => prev.map(r => r.id === rule.id ? { ...r, text: e.target.value } : r))}
                  onBlur={() => saveAgentConfigurations()}
                  rows={2}
                  className="flex-1 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-[#059669] transition-all resize-none"
                />

                {/* Type dropdown */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenTransferTypeDropdownId(openTransferTypeDropdownId === rule.id ? null : rule.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm whitespace-nowrap"
                  >
                    {rule.type}
                    <ChevronsUpDown size={11} className="text-slate-400" />
                  </button>
                  {openTransferTypeDropdownId === rule.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenTransferTypeDropdownId(null)} />
                      <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl z-50 w-36 py-1.5 overflow-hidden">
                        {['Humano', 'Superagente', 'Flujo'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              const next = transferRules.map(r => r.id === rule.id ? { ...r, type: opt, target: 'Elegir...' } : r);
                              setTransferRules(next);
                              saveAgentConfigurations({ transferRules: next });
                              setOpenTransferTypeDropdownId(null);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left ${rule.type === opt ? 'text-[#059669] font-black' : 'text-slate-600'}`}
                          >
                            {opt}
                            {rule.type === opt && <Check size={12} className="text-[#059669]" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Target dropdown (searchable) */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => {
                      setOpenTransferTargetDropdownId(openTransferTargetDropdownId === rule.id ? null : rule.id);
                      setTargetSearchQuery('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-500 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm whitespace-nowrap max-w-[160px] truncate"
                  >
                    <span className="truncate">{rule.target}</span>
                    <ChevronsUpDown size={11} className="text-slate-400 shrink-0" />
                  </button>
                  {openTransferTargetDropdownId === rule.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenTransferTargetDropdownId(null)} />
                      <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl z-50 w-52 overflow-hidden">
                        <div className="p-2 border-b border-slate-50">
                          <div className="relative flex items-center">
                            <Search className="absolute left-3 text-slate-400 pointer-events-none" size={12} />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Buscar..."
                              value={targetSearchQuery}
                              onChange={e => setTargetSearchQuery(e.target.value)}
                              className="w-full text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto py-1">
                          {(rule.type === 'Humano' ? advisors : (AVAILABLE_TARGETS[rule.type] || []))
                            .filter(t => t.toLowerCase().includes(targetSearchQuery.toLowerCase()))
                            .map(target => (
                              <button
                                key={target}
                                onClick={() => {
                                  const next = transferRules.map(r => r.id === rule.id ? { ...r, target } : r);
                                  setTransferRules(next);
                                  saveAgentConfigurations({ transferRules: next });
                                  setOpenTransferTargetDropdownId(null);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left ${rule.target === target ? 'text-[#059669] font-black' : 'text-slate-600'}`}
                              >
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[9px] font-black text-slate-500">
                                  {target.charAt(0)}
                                </div>
                                <span className="truncate">{target}</span>
                                {rule.target === target && <Check size={11} className="text-[#059669] ml-auto shrink-0" />}
                              </button>
                            ))}
                          {(rule.type === 'Humano' ? advisors : (AVAILABLE_TARGETS[rule.type] || [])).filter(t => t.toLowerCase().includes(targetSearchQuery.toLowerCase())).length === 0 && (
                            <p className="text-[11px] text-slate-400 font-semibold text-center py-4">Sin resultados</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => { setRuleToDeleteId(rule.id); setRuleToDeleteType('transferencia'); setShowDeleteRuleModal(true); }}
                  className="mt-1.5 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add button */}
          {transferRules.length < 10 && (
            <div className="px-5 pb-5 pt-2">
              <button
                onClick={() => {
                  const next = [...transferRules, { id: Date.now(), text: 'Nueva condición de transferencia', type: 'Humano', target: 'Elegir...' }];
                  setTransferRules(next);
                  saveAgentConfigurations({ transferRules: next });
                }}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-[#059669] hover:text-[#059669] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Añadir transferencia
              </button>
            </div>
          )}
        </div>
      )}

      {/* -- ETIQUETADO AUTOMáTICO PANEL -- */}
      {activeAccionesSubTab === 'Etiquetado' && (
        <div className="border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col overflow-visible">
          {/* Card Header */}
          <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-50">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              <Tag size={18} className="text-slate-400" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-black text-slate-800">Etiquetado Automático</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                Define reglas para agregar o quitar etiquetas de los contactos automáticamente
              </p>
            </div>
          </div>

          {/* Rules list */}
          <div className="divide-y divide-slate-50">
            {labelRules.map((rule, idx) => (
              <div key={rule.id} className="flex items-center gap-3 px-5 py-4">
                {/* drag handle + number */}
                <GripVertical size={14} className="text-slate-300 cursor-grab shrink-0" />
                <span className="text-[11px] font-black text-slate-400 shrink-0">{idx + 1}.</span>

                {/* Condition text */}
                <input
                  type="text"
                  value={rule.text}
                  onChange={e => setLabelRules(prev => prev.map(r => r.id === rule.id ? { ...r, text: e.target.value } : r))}
                  onBlur={() => saveAgentConfigurations()}
                  className="flex-1 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-[#059669] transition-all min-w-0"
                />

                {/* Action dropdown (Agregar/Quitar) */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenLabelActionDropdownId(openLabelActionDropdownId === rule.id ? null : rule.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm whitespace-nowrap"
                  >
                    {rule.action}
                    <ChevronsUpDown size={11} className="text-slate-400" />
                  </button>
                  {openLabelActionDropdownId === rule.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenLabelActionDropdownId(null)} />
                      <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl z-50 w-32 py-1.5 overflow-hidden">
                        {['Agregar', 'Quitar'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => {
                              const next = labelRules.map(r => r.id === rule.id ? { ...r, action: opt } : r);
                              setLabelRules(next);
                              saveAgentConfigurations({ labelRules: next });
                              setOpenLabelActionDropdownId(null);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left ${rule.action === opt ? 'text-[#059669] font-black' : 'text-slate-600'}`}
                          >
                            {opt}
                            {rule.action === opt && <Check size={12} className="text-[#059669]" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Label pill dropdown */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenLabelTagDropdownId(openLabelTagDropdownId === rule.id ? null : rule.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm whitespace-nowrap"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rule.color }} />
                    <span className="text-slate-700">{rule.label}</span>
                    <ChevronsUpDown size={11} className="text-slate-400 shrink-0" />
                  </button>
                  {openLabelTagDropdownId === rule.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenLabelTagDropdownId(null)} />
                      <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl z-50 w-44 py-1.5 overflow-hidden">
                        {AVAILABLE_LABELS.map(lbl => (
                          <button
                            key={lbl.name}
                            onClick={() => {
                              const next = labelRules.map(r => r.id === rule.id ? { ...r, label: lbl.name, color: lbl.color } : r);
                              setLabelRules(next);
                              saveAgentConfigurations({ labelRules: next });
                              setOpenLabelTagDropdownId(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left ${rule.label === lbl.name ? 'bg-slate-50' : ''}`}
                          >
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lbl.color }} />
                            <span className="text-slate-700 flex-1">{lbl.name}</span>
                            {rule.label === lbl.name && <Check size={12} className="text-[#059669] shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => { setRuleToDeleteId(rule.id); setRuleToDeleteType('etiquetado'); setShowDeleteRuleModal(true); }}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add button */}
          <div className="px-5 pb-5 pt-2">
            <button
              onClick={() => {
                const next = [...labelRules, { id: Date.now(), text: 'Nueva condición', action: 'Agregar', label: 'Vendor', color: '#a855f7' }];
                setLabelRules(next);
                saveAgentConfigurations({ labelRules: next });
              }}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-[#059669] hover:text-[#059669] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Añadir regla
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderDetailView = () => {

    if (!activeDetailAgent) return null;

    // Calcular tamaño de la base de conocimiento localmente según caracteres
    const localSize = ((activeDetailAgent.instrucciones || '').length + (activeDetailAgent.personalidad || '').length);
    const sizeFormatted = localSize > 1024 ? `${(localSize / 1024).toFixed(1)} KB` : `${localSize} B`;

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Cabecera de Navegación Detalle */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveDetailAgent(null)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center justify-center cursor-pointer border-none bg-transparent"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-left">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Configurar Superagente</h1>
                <span className="bg-emerald-50 text-[#059669] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full tracking-wider">
                  BETA
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1.5 text-left">Personaliza el comportamiento y entrenamiento</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDetailMoreMenu(!showDetailMoreMenu)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2.5 hover:bg-slate-50 border border-transparent rounded-xl"
            >
              <MoreHorizontal size={18} />
            </button>
            {showDetailMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDetailMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-40 py-2 overflow-hidden">
                  <button
                    onClick={() => setShowDetailMoreMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Copy size={14} className="text-slate-400" />
                    Duplicar
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailMoreMenu(false);
                      setSelectedAgent(activeDetailAgent);
                      setShowDeleteModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <Trash2 size={14} className="text-red-400" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Tarjetas Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 shrink-0">
          {/* Tarjeta de Agente y Estado */}
          <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div
              onClick={() => {
                setAuditStep('landing');
                setAuditMessages([]);
                setShowAuditModal(true);
              }}
              className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-all select-none group"
            >
              {/* Icono de robot con insignia real del número de sugerencias pendientes de la auditoría */}
              <div className="relative w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-105 transition-all duration-300">
                <Bot size={22} className="text-slate-100" />
                {agentGaps.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                    {agentGaps.length}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isEditingDetailName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={detailNameValue}
                        onChange={(e) => setDetailNameValue(e.target.value)}
                        className="px-2.5 py-1 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#059669] focus:ring-4 focus:ring-emerald-50"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveDetailName}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => setIsEditingDetailName(false)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/name">
                      <h3 className="text-lg font-black text-slate-800 leading-tight">{activeDetailAgent.nombre}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailNameValue(activeDetailAgent.nombre);
                          setIsEditingDetailName(true);
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-all opacity-0 group-hover/name:opacity-100"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}

                  {activeDetailAgent.objetivo && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#f1f5f9] text-[#475569] border border-slate-200/50">
                      {OBJECTIVES.find(o => o.id === activeDetailAgent.objetivo)?.title || activeDetailAgent.objetivo}
                    </span>
                  )}

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${activeDetailAgent.activo === 1 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-slate-100 text-slate-400'
                    }`}>
                    {activeDetailAgent.activo === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Configura y entrena tu asistente
                </p>
              </div>
            </div>

            {/* Switch de activación a la derecha */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">Activo</span>
              <button
                onClick={handleToggleDetailActive}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${activeDetailAgent.activo === 1 ? 'bg-[#22c55e]' : 'bg-slate-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${activeDetailAgent.activo === 1 ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Tarjeta de Almacenamiento */}
          <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
              <Database size={22} className="text-slate-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[20px] font-black text-slate-800 leading-none">
                  {sizeFormatted}
                </span>
                {getPlanBadge(true)}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1.5">
                {(dashboardData?.plan?.nombre || 'Starter') === 'Starter'
                  ? 'Límite 1 MB por agente'
                  : (dashboardData?.plan?.nombre || 'Starter') === 'Growth'
                    ? 'Límite 10 MB por agente'
                    : 'Almacenamiento ilimitado'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Panel General: Sidebar izquierda y Configuración derecha */}
        <div className="flex-1 flex gap-8 min-h-0">
          {/* Menú lateral */}
          <div className="w-64 shrink-0 flex flex-col gap-1">
            {[
              { id: 'General', label: 'General', icon: <SlidersHorizontal size={16} /> },
              { id: 'Conversacion', label: 'Conversación', icon: <MessageSquare size={16} /> },
              { id: 'Conocimiento', label: 'Conocimiento', icon: <BookOpen size={16} /> },
              { id: 'Acciones', label: 'Acciones', icon: <Zap size={16} /> },
              { id: 'Auto-Tareas', label: 'Auto-Tareas', icon: <Calendar size={16} /> },
              { id: 'Actividad', label: 'Actividad', icon: <Activity size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMenuTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeMenuTab === tab.id
                  ? 'bg-slate-100 text-slate-800'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Formulario Principal de Configuración */}
          <div className="flex-1 border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col p-6 overflow-y-auto min-h-0">
            {activeMenuTab === 'General' ? (
              <div className="space-y-6 text-left">
                {/* 1. Tarjeta: Objetivo del asistente */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#059669]/10 text-[#059669] flex items-center justify-center shrink-0">
                      <HelpCircle size={20} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Objetivo del asistente</p>
                      <h4 className="text-base font-black text-slate-800 mt-1">
                        {OBJECTIVES.find(o => o.id === activeDetailAgent.objetivo)?.title || activeDetailAgent.objetivo || 'Preguntas Frecuentes'}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTempSelectedObjective(activeDetailAgent.objetivo || 'preguntas_frecuentes');
                      setShowChangeObjectiveModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer bg-white"
                  >
                    <Edit2 size={13} />
                    Cambiar
                  </button>
                </div>

                {/* 2. Tarjeta: Instrucciones del Asistente */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Instrucciones del Asistente</p>
                      <p className="text-xs text-slate-400 font-semibold mt-1">
                        Define cómo debe comportarse "{activeDetailAgent.nombre}"
                      </p>
                    </div>
                  </div>

                  {/* Visor Gris de Instrucciones */}
                  <div className="relative bg-slate-50 border border-slate-100 rounded-2xl p-5 max-h-60 overflow-y-auto text-xs font-semibold text-slate-600 leading-relaxed space-y-4 pr-3">
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">Tu rol es:</p>
                      <p className="bg-white/70 border border-slate-100/50 rounded-xl p-3 text-slate-600 font-medium">
                        {activeDetailAgent.personalidad || `Eres el asistente virtual de ${activeDetailAgent.nombre || 'el negocio'}.`}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">Contexto del negocio:</p>
                      <p className="bg-white/70 border border-slate-100/50 rounded-xl p-3 text-slate-600 font-medium">
                        {activeDetailAgent.descripcion_negocio || 'Sin información comercial asignada.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">Instrucciones:</p>
                      <p className="bg-white/70 border border-slate-100/50 rounded-xl p-3 text-slate-600 font-medium whitespace-pre-line">
                        {activeDetailAgent.instrucciones || 'Sin reglas de conversación especéficas.'}
                      </p>
                    </div>
                  </div>

                  {/* Botón Editar Instrucciones */}
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => {
                        setTempInstName(activeDetailAgent.nombre || '');
                        setTempInstRol(activeDetailAgent.personalidad || '');
                        setTempInstNegocio(activeDetailAgent.descripcion_negocio || '');
                        setTempInstReglas(activeDetailAgent.instrucciones || '');
                        setEditInstTab('rol');
                        setShowEditInstructionsModal(true);
                      }}
                      className="flex items-center gap-1.5 px-6 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-full transition-all active:scale-95 cursor-pointer bg-white"
                    >
                      <Edit2 size={13} />
                      Editar Instrucciones
                    </button>
                  </div>
                </div>


              </div>
            ) : activeMenuTab === 'Conversacion' ? (
              <div>
                {/* Cabecera Principal de Conversación */}
                <div className="flex items-center gap-2 mb-1.5 text-left">
                  <MessageSquare className="text-slate-800" size={20} />
                  <h2 className="text-lg font-black text-slate-800">Conversacion</h2>
                </div>
                <p className="text-xs text-slate-400 font-semibold mb-7 text-left">
                  Configura el flujo conversacional del superagente por secciones
                </p>

                {/* Sub-navegación */}
                <div className="flex gap-0 border-b border-slate-100 mb-10 -mx-6 px-6 overflow-x-auto">
                  {[
                    { id: 'Pasos', label: 'Pasos', icon: <FileText size={14} /> },
                    { id: 'Seguimientos', label: 'Seguimientos', icon: <Clock size={14} /> },
                    { id: 'Voz', label: 'Voz', icon: <Mic size={14} /> },
                    { id: 'Comportamiento', label: 'Comportamiento del Superagente', icon: <Info size={14} /> },
                    ...(activeDetailAgent?.objetivo === 'agendar_citas' ? [{ id: 'Calendario', label: 'Calendario', icon: <Calendar size={14} /> }] : []),
                    { id: 'Recursos', label: 'Recursos', icon: <Folder size={14} /> },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setConvSubTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${convSubTab === tab.id
                        ? 'border-[#059669] text-[#059669]'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {convSubTab === 'Pasos' ? (
                  <div className="space-y-6">
                    {/* Header Pasos de Captura */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">•</span>
                        <h3 className="text-sm font-black text-slate-800">Pasos de Captura ({captureSteps.length}/10)</h3>
                      </div>
                      <p className="text-[11px] text-[#059669] font-semibold">Define las instrucciones para recopilar información del contacto</p>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/40">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs">⚡</span>
                        <span className="text-xs font-black text-slate-700">Acciones Rápidas</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mb-3">Agrega campos estándar con un solo clic</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            const newNombre = !quickActions.nombre;
                            setQuickActions(prev => ({ ...prev, nombre: newNombre }));
                            if (newNombre && !captureSteps.find(s => s.text.toLowerCase().includes('nombre'))) {
                              const next = [{ id: Date.now(), text: 'Solicita el nombre del cliente de forma natural y cálida', field: 'nombre', enabled: true }, ...captureSteps];
                              setCaptureSteps(next);
                              saveAgentConfigurations({ captureSteps: next });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${quickActions.nombre
                            ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          Nombre
                        </button>
                        <button
                          onClick={() => {
                            const newEmail = !quickActions.email;
                            setQuickActions(prev => ({ ...prev, email: newEmail }));
                            if (newEmail && !captureSteps.find(s => s.text.toLowerCase().includes('email'))) {
                              const next = [...captureSteps, { id: Date.now(), text: 'Pregunta la dirección de correo electrónico del cliente', field: 'email', enabled: true }];
                              setCaptureSteps(next);
                              saveAgentConfigurations({ captureSteps: next });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${quickActions.email
                            ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          Email
                        </button>
                        {customFields
                          .filter(field => !['nombre', 'email', 'telefono'].includes(field.toLowerCase()))
                          .map(field => {
                            const isAdded = captureSteps.some(s => s.field === field && s.enabled);
                            return (
                              <button
                                key={field}
                                onClick={() => {
                                  if (!isAdded) {
                                    const next = [...captureSteps, {
                                      id: Date.now(),
                                      text: `Pregunta el/la ${field} del cliente para completar el registro`,
                                      field: field,
                                      enabled: true
                                    }];
                                    setCaptureSteps(next);
                                    saveAgentConfigurations({ captureSteps: next });
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isAdded
                                  ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/30'
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                  }`}
                              >
                                {field.charAt(0).toUpperCase() + field.slice(1)}
                              </button>
                            );
                          })
                        }
                      </div>
                    </div>

                    {/* Lista de pasos */}
                    <div className="space-y-2">
                      {captureSteps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm text-left">
                          <div className="flex items-center gap-2 text-slate-300 shrink-0">
                            <GripVertical size={14} className="cursor-grab" />
                            <span className="text-[11px] font-black text-slate-400">{idx + 1}.</span>
                          </div>
                          <input
                            type="text"
                            value={step.text}
                            onChange={(e) => setCaptureSteps(prev => prev.map(s => s.id === step.id ? { ...s, text: e.target.value } : s))}
                            onBlur={() => saveAgentConfigurations()}
                            className="flex-1 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none placeholder-slate-300"
                            placeholder="Describe este paso de captura..."
                          />
                          <div className="relative shrink-0">
                            <button
                              onClick={() => {
                                setOpenFieldDropdownId(openFieldDropdownId === step.id ? null : step.id);
                                setFieldSearchTerm('');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all select-none"
                            >
                              <Database size={11} className="text-slate-400" />
                              {step.field || 'No guardar'}
                              <ChevronsUpDown size={11} className="text-slate-400 shrink-0" />
                            </button>
                            {openFieldDropdownId === step.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-44 py-2 overflow-hidden">
                                <div className="px-3 pb-2 relative flex items-center">
                                  <Search className="absolute left-5 text-slate-400 pointer-events-none" size={11} />
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar campo..."
                                    value={fieldSearchTerm}
                                    onChange={(e) => setFieldSearchTerm(e.target.value)}
                                    className="w-full text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-xl pl-8 pr-3 py-2 outline-none"
                                  />
                                </div>
                                {['No guardar', 'nombre', 'telefono', 'email', ...customFields.filter(f => !['nombre', 'telefono', 'email'].includes(f))]
                                  .filter(opt => opt.toLowerCase().includes(fieldSearchTerm.toLowerCase()))
                                  .map(opt => (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        const next = captureSteps.map(s => s.id === step.id ? { ...s, field: opt === 'No guardar' ? null : opt } : s);
                                        setCaptureSteps(next);
                                        saveAgentConfigurations({ captureSteps: next });
                                        setOpenFieldDropdownId(null);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors ${(step.field || 'No guardar') === opt ? 'bg-slate-50' : ''
                                        }`}
                                    >
                                      {(step.field || 'No guardar') === opt && <Check size={11} className="text-[#059669] shrink-0" />}
                                      <Database size={10} className="text-slate-400 shrink-0" />
                                      {opt}
                                    </button>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const next = captureSteps.map(s => s.id === step.id ? { ...s, enabled: !s.enabled } : s);
                              setCaptureSteps(next);
                              saveAgentConfigurations({ captureSteps: next });
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${step.enabled ? 'bg-[#059669]' : 'bg-slate-200'
                              }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${step.enabled ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                          </button>

                          <button
                            onClick={() => {
                              const next = captureSteps.filter(s => s.id !== step.id);
                              setCaptureSteps(next);
                              const isNameStep = (step.text || '').toLowerCase().includes('nombre') || step.field === 'nombre';
                              const isEmailStep = (step.text || '').toLowerCase().includes('email') || step.field === 'email';
                              if (isNameStep) {
                                setQuickActions(prev => ({ ...prev, nombre: false }));
                              }
                              if (isEmailStep) {
                                setQuickActions(prev => ({ ...prev, email: false }));
                              }
                              saveAgentConfigurations({ captureSteps: next });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Añadir paso */}
                    <button
                      onClick={() => {
                        if (captureSteps.length < 10) {
                          const next = [...captureSteps, { id: Date.now(), text: '', field: null, enabled: true }];
                          setCaptureSteps(next);
                          saveAgentConfigurations({ captureSteps: next });
                        }
                      }}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-[#059669] hover:text-[#059669] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Añadir paso
                    </button>

                    {/* Toggle saltar pasos */}
                    <div className="flex items-start gap-3 pt-2">
                      <button
                        onClick={() => {
                          const nextVal = !skipExistingData;
                          setSkipExistingData(nextVal);
                          saveAgentConfigurations({ skipExistingData: nextVal });
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 mt-1.5 cursor-pointer rounded-full border-2 border-transparent transition-colors ${skipExistingData ? 'bg-[#059669]' : 'bg-slate-200'
                          }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${skipExistingData ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                      </button>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-bold text-slate-700">Saltar pasos cuyo dato ya está en el contacto</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Desactivado: cada paso vuelve a preguntar aunque el contacto tenga el dato</p>
                      </div>
                    </div>
                  </div>
                ) : convSubTab === 'Seguimientos' ? (
                  <div className="space-y-6 text-left">
                    {/* Header Seguimientos */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Clock className="text-slate-400" size={18} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-sm font-black text-slate-800">Seguimientos ({followUpMessages.length}/3)</h3>
                        <p className="text-[11px] text-slate-400 font-semibold">Mensajes automáticos cuando el contacto no responde</p>
                      </div>
                    </div>

                    {/* Barra de tiempo acumulado */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                        <span>Tiempo acumulado: {Math.ceil(followUpMessages.reduce((acc, m) => acc + (m.unit === 'hrs' ? m.time : m.time / 60), 0))} hrs</span>
                        <span>{(() => {
                          const usedMin = followUpMessages.reduce((acc, m) => acc + (m.unit === 'hrs' ? m.time * 60 : m.time), 0);
                          const remaining = Math.max(0, 24 * 60 - usedMin);
                          const h = Math.floor(remaining / 60);
                          const m = remaining % 60;
                          return m > 0 ? `${h} hrs ${m} min disponibles` : `${h} hrs disponibles`;
                        })()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#059669] rounded-full" style={{ width: `${Math.min((followUpMessages.reduce((acc, m) => acc + (m.unit === 'hrs' ? m.time * 60 : m.time), 0) / (24 * 60)) * 100, 100)}%` }} />
                      </div>
                    </div>

                    {/* Mensajes de seguimiento */}
                    <div className="space-y-3">
                      {followUpMessages.map((msg, idx) => (
                        <div key={msg.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                          <GripVertical size={14} className="text-slate-300 cursor-grab shrink-0" />
                          <span className="text-[11px] font-black text-slate-400 shrink-0">{idx + 1}.</span>
                          <input
                            type="text"
                            value={msg.text}
                            onChange={(e) => setFollowUpMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: e.target.value } : m))}
                            onBlur={() => saveAgentConfigurations()}
                            className="flex-1 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none"
                          />
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">Tiempo:</span>
                          <input
                            type="number"
                            min={1}
                            value={msg.time}
                            onChange={(e) => {
                              const next = followUpMessages.map(m => m.id === msg.id ? { ...m, time: Number(e.target.value) } : m);
                              setFollowUpMessages(next);
                              saveAgentConfigurations({ followUpMessages: next });
                            }}
                            className="w-14 text-center text-xs font-black text-slate-700 border border-slate-200 rounded-xl px-2 py-1.5 outline-none shadow-sm"
                          />
                          <select
                            value={msg.unit}
                            onChange={(e) => {
                              const next = followUpMessages.map(m => m.id === msg.id ? { ...m, unit: e.target.value } : m);
                              setFollowUpMessages(next);
                              saveAgentConfigurations({ followUpMessages: next });
                            }}
                            className="text-[10px] font-bold text-slate-500 border border-slate-200 rounded-xl px-2 py-1.5 outline-none bg-white shadow-sm"
                          >
                            <option value="min">min</option>
                            <option value="hrs">hrs</option>
                          </select>

                          <button
                            onClick={() => {
                              const next = followUpMessages.filter(m => m.id !== msg.id);
                              setFollowUpMessages(next);
                              saveAgentConfigurations({ followUpMessages: next });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Añadir seguimiento */}
                    {followUpMessages.length < 3 && (
                      <button
                        onClick={() => {
                          const next = [...followUpMessages, { id: Date.now(), text: '', time: 60, unit: 'min' }];
                          setFollowUpMessages(next);
                          saveAgentConfigurations({ followUpMessages: next });
                        }}
                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-[#059669] hover:text-[#059669] transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Añadir seguimiento
                      </button>
                    )}

                    {/* Tiempo de Inactividad */}
                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          <Clock className="text-slate-400" size={18} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-sm font-black text-slate-800">Tiempo de Inactividad</p>
                          <p className="text-[11px] text-slate-400 font-semibold">Configura cuándo cerrar una conversación por inactividad</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
                        <span className="text-xs font-bold text-slate-600">Cerrar conversación después de</span>
                        <input
                          type="number"
                          min={1}
                          value={inactivityTimeout}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setInactivityTimeout(val);
                            saveAgentConfigurations({ inactivityTimeout: val });
                          }}
                          className="w-16 text-center text-sm font-black text-slate-800 border border-slate-200 rounded-xl px-2 py-1.5 outline-none shadow-sm"
                        />
                        <select
                          value={inactivityUnit}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInactivityUnit(val);
                            saveAgentConfigurations({ inactivityUnit: val });
                          }}
                          className="text-xs font-bold text-slate-500 border border-slate-200 rounded-xl px-3 py-1.5 outline-none bg-white shadow-sm"
                        >
                          <option value="minutos">minutos</option>
                          <option value="horas">horas</option>
                        </select>
                        <span className="text-xs font-bold text-slate-400">sin respuesta</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold px-1">
                        {(() => {
                          const usedMin = followUpMessages.reduce((acc, m) => acc + (m.unit === 'hrs' ? m.time * 60 : m.time), 0);
                          const remaining = Math.max(0, 24 * 60 - usedMin);
                          const h = Math.floor(remaining / 60);
                          const m = remaining % 60;
                          const label = m > 0 ? `${h} hrs ${m} min` : `${h} hrs`;
                          return `Máximo disponible: ${label} (comparte el límite de 24 hrs con los seguimientos)`;
                        })()}
                      </p>
                    </div>
                  </div>

                ) : convSubTab === 'Voz' ? (
                  <div className="space-y-6 text-left">
                    {/* Respuestas de Voz */}
                    <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <Mic className="text-[#059669]" size={18} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-sm font-black text-slate-800">Respuestas de Voz</p>
                          <p className="text-[11px] text-slate-400 font-semibold">Permite que el asistente responda con audio</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !voiceEnabled;
                          setVoiceEnabled(nextVal);
                          saveAgentConfigurations({ voiceEnabled: nextVal });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${voiceEnabled ? 'bg-[#059669]' : 'bg-slate-200'
                          }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${voiceEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                      </button>
                    </div>

                    {voiceEnabled && (
                      <div className="space-y-5">
                        {/* Voz del Asistente */}
                        <div className="space-y-2">
                          <p className="text-xs font-black text-slate-700">Voz del Asistente</p>
                          <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                              <button
                                onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all text-left shadow-sm"
                              >
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs font-black text-slate-800">{selectedVoice}</p>
                                  <p className="text-[10px] text-[#059669] font-semibold mt-1.5">
                                    {{
                                      'Sarah - Mature, Reassuring, Confident': 'Cálida y profesional, ideal para presentaciones formales',
                                      'Fay - Clear, Expressive': 'Clara y expresiva, para instrucciones y tutoriales',
                                      'Matilda - Knowledgable, Professional': 'Suave y elegante, para contextos refinados',
                                      'River - Relaxed, Neutral, Informative': null,
                                      'Roger - Laid-Back, Casual, Resonant': 'Masculina y seria, para tono ejecutivo',
                                      'Will - Relaxed Optimist': null,
                                    }[selectedVoice]}
                                  </p>
                                </div>
                                <ChevronDown size={14} className="text-slate-400" />
                              </button>

                              {showVoiceDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                                  {[
                                    { name: 'Fay - Clear, Expressive', desc: 'Clara y expresiva, para instrucciones y tutoriales' },
                                    { name: 'Matilda - Knowledgable, Professional', desc: 'Suave y elegante, para contextos refinados' },
                                    { name: 'River - Relaxed, Neutral, Informative', desc: null },
                                    { name: 'Roger - Laid-Back, Casual, Resonant', desc: 'Masculina y seria, para tono ejecutivo' },
                                    { name: 'Sarah - Mature, Reassuring, Confident', desc: 'Cálida y profesional, ideal para presentaciones formales' },
                                    { name: 'Will - Relaxed Optimist', desc: null },
                                  ].map(v => (
                                    <button
                                      key={v.name}
                                      onClick={() => {
                                        setSelectedVoice(v.name);
                                        setShowVoiceDropdown(false);
                                        saveAgentConfigurations({ selectedVoice: v.name });
                                      }}
                                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${selectedVoice === v.name ? 'bg-slate-50' : ''
                                        }`}
                                    >
                                      <div className="text-left">
                                        <p className="text-xs font-black text-slate-800">{v.name}</p>
                                        {v.desc && <p className="text-[10px] text-slate-400 font-semibold mt-1.5">{v.desc}</p>}
                                      </div>
                                      {selectedVoice === v.name && <Check size={14} className="text-[#059669] shrink-0 ml-2" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={handlePlayVoiceSample}
                              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shrink-0 cursor-pointer active:scale-95"
                            >
                              <Play size={14} className="text-slate-800 fill-slate-800" />
                            </button>
                          </div>
                        </div>

                        {/* Porcentaje de respuestas en voz */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-slate-700">Porcentaje de respuestas en voz</p>
                            <span className="text-xs font-black text-[#059669] underline decoration-[#059669] decoration-2 underline-offset-2">{voicePercentage}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={10}
                            value={voicePercentage}
                            onChange={(e) => setVoicePercentage(Number(e.target.value))}
                            onMouseUp={(e) => saveAgentConfigurations({ voicePercentage: Number(e.target.value) })}
                            onTouchEnd={(e) => saveAgentConfigurations({ voicePercentage: Number(e.target.value) })}
                            className="w-full h-1.5 rounded-full outline-none cursor-pointer accent-[#059669]"
                          />
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            {voicePercentage < 25 ? 'El asistente responderá con voz ocasionalmente' :
                              voicePercentage < 75 ? 'El asistente responderá con voz frecuentemente' :
                                'El asistente responderá casi siempre con voz'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                ) : convSubTab === 'Comportamiento' ? (
                  <div className="space-y-6 text-left">
                    <div className="border border-slate-100 rounded-3xl p-6 bg-white space-y-4">
                      {/* Header Row */}
                      <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          <SlidersHorizontal size={18} className="text-slate-400" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <h4 className="text-sm font-black text-slate-800">Comportamiento del Asistente</h4>
                          <p className="text-[11px] text-slate-400 font-semibold mt-1.5">Configura cómo actúa tu asistente en las conversaciones</p>
                        </div>
                      </div>

                      {/* Toggle: Usar emojis */}
                      <div className="flex items-center justify-between py-4 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                            <Smile className="text-[#f97316]" size={16} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-xs font-black text-slate-800">Usar emojis en respuestas</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">El asistente puede usar emojis para un tono más cercano.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const nextVal = !useEmojis;
                            setUseEmojis(nextVal);
                            saveAgentConfigurations({ useEmojis: nextVal });
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${useEmojis ? 'bg-[#059669]' : 'bg-slate-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${useEmojis ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Toggle: Solo temas del negocio */}
                      <div className="flex items-center justify-between py-4 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Shield className="text-[#3b82f6]" size={16} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-xs font-black text-slate-800">Solo temas del negocio</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">El asistente solo habla sobre temas relacionados con tu negocio.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const nextVal = !onlyBusinessTopics;
                            setOnlyBusinessTopics(nextVal);
                            saveAgentConfigurations({ onlyBusinessTopics: nextVal });
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${onlyBusinessTopics ? 'bg-[#059669]' : 'bg-slate-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${onlyBusinessTopics ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Configuración avanzada */}
                      <div className="pt-2">
                        <button
                          onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                          className="flex items-center justify-between w-full py-2 text-xs font-black text-slate-500 uppercase tracking-widest outline-none border-none bg-transparent"
                        >
                          <div className="flex items-center gap-2">
                            <span>=</span> Configuración avanzada
                          </div>
                          <ChevronDown size={14} className={`transition-transform duration-200 ${showAdvancedConfig ? 'rotate-180' : ''}`} />
                        </button>

                        {showAdvancedConfig && (
                          <div className="space-y-0 mt-2">
                            {/* Dividir mensajes largos */}
                            <div className="flex items-center justify-between py-4 border-b border-slate-50">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                  <MessageSquare className="text-emerald-500" size={16} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs font-black text-slate-800">Dividir mensajes largos</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Las respuestas largas se separan en varios mensajes cortos.</p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const nextVal = !divideMessages;
                                  setDivideMessages(nextVal);
                                  saveAgentConfigurations({ divideMessages: nextVal });
                                }}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${divideMessages ? 'bg-[#059669]' : 'bg-slate-200'}`}
                              >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${divideMessages ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </div>

                            {/* Zona horaria */}
                            <div className="flex items-center justify-between py-4 border-b border-slate-50">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                  <Globe className="text-[#059669]" size={16} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs font-black text-slate-800">Zona horaria</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Zona horaria para fechas y horarios</p>
                                </div>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={() => { setShowTimezoneDropdown(!showTimezoneDropdown); setShowResponseTimeDropdown(false); }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm"
                                >
                                  {selectedTimezone || 'Selecciona zona horaria'}
                                  <ChevronsUpDown size={12} className="text-slate-400" />
                                </button>
                                {showTimezoneDropdown && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-72 max-h-64 overflow-y-auto">
                                    <div className="sticky top-0 bg-white px-3 py-2 border-b border-slate-50 z-10">
                                      <div className="relative flex items-center">
                                        <Search className="absolute left-3.5 text-slate-400 pointer-events-none" size={12} />
                                        <input
                                          autoFocus
                                          type="text"
                                          placeholder="Buscar zona horaria..."
                                          value={timezoneSearch}
                                          onChange={e => setTimezoneSearch(e.target.value)}
                                          className="w-full text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-xl pl-9 pr-3 py-2 outline-none"
                                        />
                                      </div>
                                    </div>
                                    {Object.entries(ALL_TIMEZONES).map(([continent, zones]) => {
                                      const filtered = zones.filter(z => z.toLowerCase().includes(timezoneSearch.toLowerCase()));
                                      if (filtered.length === 0) return null;
                                      return (
                                        <div key={continent}>
                                          <p className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 text-left">{continent}</p>
                                          {filtered.map(tz => (
                                            <button
                                              key={tz}
                                              onClick={() => {
                                                setSelectedTimezone(tz);
                                                setShowTimezoneDropdown(false);
                                                setTimezoneSearch('');
                                                saveAgentConfigurations({ selectedTimezone: tz });
                                              }}
                                              className={`w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors ${selectedTimezone === tz ? 'text-[#059669] font-black' : ''}`}
                                            >
                                              {tz}
                                            </button>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Tiempo de respuesta */}
                            <div className="flex items-center justify-between py-4 border-b border-slate-50">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                  <Clock className="text-amber-500" size={16} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs font-black text-slate-800">Tiempo de respuesta</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Pausa antes de responder (más natural)</p>
                                </div>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={() => { setShowResponseTimeDropdown(!showResponseTimeDropdown); setShowTimezoneDropdown(false); }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm"
                                >
                                  {responseTime} <ChevronsUpDown size={11} className="text-slate-400 shrink-0" />
                                </button>
                                {showResponseTimeDropdown && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-52 py-2">
                                    {['Inmediatamente', '5 segundos', '10 segundos', '30 segundos', '1 minuto', '2 minutos', 'Aleatorio (5-30s)'].map(opt => (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          setResponseTime(opt);
                                          setShowResponseTimeDropdown(false);
                                          saveAgentConfigurations({ responseTime: opt });
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors text-left ${responseTime === opt ? 'text-[#059669] font-black' : 'text-slate-700'}`}
                                      >
                                        {opt}
                                        {responseTime === opt && <Check size={12} className="text-[#059669] shrink-0" />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Límite de mensajes */}
                            <div className="flex items-center justify-between py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                                  <MessageSquare className="text-rose-500" size={16} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs font-black text-slate-800">Límite de mensajes</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Máximo de mensajes antes de pasar a humano</p>
                                </div>
                              </div>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={messageLimit}
                                onChange={(e) => setMessageLimit(Number(e.target.value))}
                                onBlur={() => saveAgentConfigurations()}
                                className="w-16 text-center text-sm font-black text-slate-800 border border-slate-200 rounded-xl px-2 py-1.5 outline-none shadow-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botón Guardar inline al final de la tarjeta */}
                      <div className="pt-6 border-t border-slate-50">
                        <button
                          onClick={() => handleSaveDetailSettings(activeDetailAgent, false)}
                          className="w-full py-3.5 bg-[#059669] hover:bg-emerald-700 text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Save size={16} /> Guardar Comportamiento
                        </button>
                      </div>
                    </div>
                  </div>

                ) : convSubTab === 'Calendario' ? (
                  <div className="space-y-7 pb-20 text-left">
                    {/* Header */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-sm font-black text-slate-800">Configuracion de Agenda</h3>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1.5">Configura como el superagente puede agendar reuniones</p>
                    </div>

                    {/* Nombre del calendario */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600">Nombre del calendario <span className="text-[#059669]">*</span></label>
                      <input
                        type="text"
                        value={calendarName}
                        onChange={e => setCalendarName(e.target.value)}
                        onBlur={() => saveAgentConfigurations({ calendarName })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-sm font-bold text-slate-700 shadow-sm"
                      />
                    </div>

                    {/* Descripcion */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600">Descripcion</label>
                      <input
                        type="text"
                        value={calendarDesc}
                        onChange={e => setCalendarDesc(e.target.value)}
                        onBlur={() => saveAgentConfigurations({ calendarDesc })}
                        placeholder="Describe el proposito de este calendario"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300 shadow-sm"
                      />
                    </div>

                    {/* Inner tabs: Agendas | Configuracion */}
                    <div className="flex border-b border-slate-100 -mx-6 mb-6">
                      {[
                        { id: 'Agendas', label: 'Agendas', icon: <Calendar size={13} /> },
                        { id: 'Configuracion', label: 'Configuracion', icon: <Settings size={13} /> }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setCalTab(t.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black transition-all border-b-2 -mb-px ${calTab === t.id
                            ? 'border-[#059669] text-[#059669]'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                          {t.icon}
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* === AGENDAS TAB === */}
                    {calTab === 'Agendas' ? (
                      <div className="space-y-4">
                        {/* Proveedor de calendario */}
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proveedor de calendario</p>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: 'Google Calendar', label: 'Google Calendar', sub: 'OAuth seguro', logo: '📅' },
                              { id: 'Calendly', label: 'Calendly', sub: 'OAuth seguro', logo: 'calendly' },
                              { id: 'Cal.com', label: 'Cal.com', sub: 'API Key', logo: 'cal.com' },
                            ].map(p => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setCalProvider(p.id);
                                  saveAgentConfigurations({ calProvider: p.id });
                                }}
                                className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left ${calProvider === p.id
                                  ? 'border-[#059669] bg-emerald-50/30'
                                  : 'border-slate-100 bg-white hover:border-slate-200'
                                  }`}
                              >
                                {calProvider === p.id && (
                                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#059669] flex items-center justify-center">
                                    <Check size={10} className="text-white" strokeWidth={3} />
                                  </span>
                                )}
                                <div className="h-8 flex items-center mb-1">
                                  {p.logo === '📅' ? (
                                    <span className="text-2xl">📅</span>
                                  ) : p.logo === 'calendly' ? (
                                    <div className="w-8 h-8 rounded-lg bg-[#006bff] flex items-center justify-center text-white font-black text-[15px] shadow-sm select-none">C</div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-[9px] shadow-sm select-none">cal</div>
                                  )}
                                </div>
                                <span className="text-xs font-black text-slate-800">{p.label}</span>
                                <span className="text-[10px] font-semibold text-slate-400">{p.sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Connection row depending on provider */}
                        {calProvider === 'Google Calendar' && (
                          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">📅</span>
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-800">Google Calendar</p>
                                <p className={`text-[10px] font-semibold ${calGoogleConnected ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {calGoogleConnected ? `Conectada - ${calGoogleEmail}` : 'No conectada - autoriza el acceso a tu Google Calendar'}
                                </p>
                              </div>
                            </div>
                            {calGoogleConnected ? (
                              <button
                                onClick={() => {
                                  setCalGoogleConnected(false);
                                  setCalGoogleEmail('');
                                  saveAgentConfigurations({ calGoogleConnected: false, calGoogleEmail: '' });
                                  showNotification("Google Calendar desconectado.");
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-black rounded-xl transition-all shadow-sm border border-red-100 cursor-pointer"
                              >
                                Desconectar
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  window.location.href = `${API_URL}/api/auth/google?agent_id=${activeDetailAgent.id}&token=${getAuthToken()}`;
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl transition-all shadow-sm cursor-pointer"
                              >
                                <span className="text-[12px] shrink-0">🔗</span>
                                Conectar
                              </button>
                            )}
                          </div>
                        )}

                        {calProvider === 'Calendly' && (
                          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#006bff] flex items-center justify-center text-white font-black text-[15px] shadow-sm">C</div>
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-800">Calendly</p>
                                <p className={`text-[10px] font-semibold ${calCalendlyConnected ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {calCalendlyConnected ? `Conectada - ${calCalendlyEmail}` : 'No conectada - autoriza el acceso a tu cuenta de Calendly'}
                                </p>
                              </div>
                            </div>
                            {calCalendlyConnected ? (
                              <button
                                onClick={() => {
                                  setCalCalendlyConnected(false);
                                  setCalCalendlyEmail('');
                                  saveAgentConfigurations({ calCalendlyConnected: false, calCalendlyEmail: '' });
                                  showNotification("Calendly desconectado.");
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-black rounded-xl transition-all shadow-sm border border-red-100 cursor-pointer"
                              >
                                Desconectar
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  window.location.href = `${API_URL}/api/auth/calendly?agent_id=${activeDetailAgent.id}&token=${getAuthToken()}`;
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl transition-all shadow-sm cursor-pointer"
                              >
                                <div className="w-4 h-4 rounded bg-[#006bff] flex items-center justify-center text-white font-black text-[9px] shrink-0">C</div>
                                Conectar
                              </button>
                            )}
                          </div>
                        )}

                        {calProvider === 'Cal.com' && (
                          <div className="space-y-4 bg-white border border-slate-100 rounded-3xl px-5 py-4 shadow-sm">
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Configuracion de Cal.com</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Conecta tu cuenta con API Key</p>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-600">API Key de Cal.com</label>
                              <input
                                type="text"
                                value={calComApiKey}
                                onChange={e => setCalComApiKey(e.target.value)}
                                onBlur={() => {
                                  if (!calComApiKey.trim()) {
                                    showNotification("La API Key de Cal.com no puede estar vacía.", "error");
                                    return;
                                  }
                                  saveAgentConfigurations({ calComApiKey });
                                }}
                                placeholder="Ingresa tu API Key de Cal.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-300 shadow-sm"
                              />
                              <p className="text-[9px] text-slate-400 font-semibold">Obtenlo en Cal.com &gt; Settings &gt; Developer &gt; API Keys</p>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-600">ID del Tipo de Evento</label>
                              <input
                                type="text"
                                value={calComEventId}
                                onChange={e => {
                                  const onlyNums = e.target.value.replace(/\D/g, '');
                                  setCalComEventId(onlyNums);
                                }}
                                onBlur={() => {
                                  if (!calComEventId.trim()) {
                                    showNotification("El ID del evento de Cal.com debe ser un número válido.", "error");
                                    return;
                                  }
                                  saveAgentConfigurations({ calComEventId });
                                }}
                                placeholder="Ej. 12345"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-300 shadow-sm"
                              />
                              <p className="text-[9px] text-slate-400 font-semibold">ID numérico del tipo de evento que quieres usar</p>
                            </div>
                          </div>
                        )}

                        {/* Horarios de atencion */}
                        <button
                          onClick={() => setShowWorkingHoursModal(true)}
                          className="w-full flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm hover:bg-slate-50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              <Clock className="text-slate-400" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Horarios de atencion</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Configura dias y horas disponibles</p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-400" />
                        </button>

                        {/* Servicios y duracion */}
                        <button
                          onClick={() => setShowServiciosModal(true)}
                          className="w-full flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm hover:bg-slate-50 transition-all mt-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              <Tag className="text-slate-400" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Servicios y duracion</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                                {calServicios.length > 0 ? `${calServicios.length} servicio(s) configurado(s)` : 'Define cuanto dura cada servicio'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-400" />
                        </button>
                      </div>

                    ) : (
                      /* === CONFIGURACION TAB === */
                      <div className="border border-slate-100 rounded-3xl p-6 bg-white space-y-4">
                        {/* Integracion con Google Meet */}
                        <div className="flex items-center justify-between py-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                              <Video className="text-[#3b82f6]" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Integracion con Google Meet</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Generar link del meet al hacer el agendamiento</p>
                            </div>
                          </div>
                          <button onClick={() => {
                            const nextVal = !calGoogleMeet;
                            setCalGoogleMeet(nextVal);
                            saveAgentConfigurations({ calGoogleMeet: nextVal });
                          }} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${calGoogleMeet ? 'bg-[#059669]' : 'bg-slate-200'}`}>
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${calGoogleMeet ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Consulta de horarios */}
                        <div className="flex items-center justify-between py-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              <Clock className="text-slate-400" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Consulta de horarios</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Superagente puede consultar horarios disponibles</p>
                            </div>
                          </div>
                          <button onClick={() => {
                            const nextVal = !calConsultarHorarios;
                            setCalConsultarHorarios(nextVal);
                            saveAgentConfigurations({ calConsultarHorarios: nextVal });
                          }} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${calConsultarHorarios ? 'bg-[#059669]' : 'bg-slate-200'}`}>
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${calConsultarHorarios ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Asunto de la reunion */}
                        <div className="py-4 space-y-2 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                              <FileText className="text-purple-500" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Asunto de la reunion</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Define el título del evento. Usa <span className="text-[#059669]">{'{name}'}</span> para el nombre del cliente</p>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={calAsunto}
                            onChange={e => setCalAsunto(e.target.value)}
                            onBlur={() => saveAgentConfigurations({ calAsunto })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm"
                          />
                          <p className="text-[10px] text-slate-400 font-semibold">Variables disponibles: <span className="text-slate-600">{'{name}'}, {'{email}'}, {'{company}'}</span></p>
                        </div>

                        {/* Descripcion de la reunion */}
                        <div className="py-4 space-y-2 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                              <FileText className="text-teal-500" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Descripcion de la reunion</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Informacion adicional que aparecera en el evento del calendario</p>
                            </div>
                          </div>
                          <textarea
                            value={calReunionDesc}
                            onChange={e => setCalReunionDesc(e.target.value)}
                            onBlur={() => saveAgentConfigurations({ calReunionDesc })}
                            placeholder="Ej: Reunion para discutir propuesta comercial con {name} de {company}"
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                          />
                          <p className="text-[10px] text-slate-400 font-semibold">Variables disponibles: <span className="text-slate-600">{'{name}'}, {'{email}'}, {'{company}'}</span></p>
                        </div>

                        {/* Sugerencias proactivas */}
                        <div className="py-4 border-b border-slate-50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                <Sparkles className="text-emerald-500" size={16} />
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-black text-slate-800">Sugerencias proactivas</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1.5">El superagente sugiere horarios disponibles en lugar de preguntar</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !calProactiveSuggestions;
                                setCalProactiveSuggestions(nextVal);
                                saveAgentConfigurations({ calProactiveSuggestions: nextVal });
                              }}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${calProactiveSuggestions ? 'bg-[#059669]' : 'bg-slate-200'}`}
                            >
                              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${calProactiveSuggestions ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {calProactiveSuggestions && (
                            <div className="space-y-1.5 pl-12">
                              <label className="text-xs font-bold text-slate-600">Cantidad de opciones a sugerir</label>
                              <div className="relative w-full max-w-xs">
                                <button
                                  type="button"
                                  onClick={() => setShowOptionCountDropdown(!showOptionCountDropdown)}
                                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm flex items-center justify-between cursor-pointer text-left"
                                >
                                  <span>{calOptionCount}</span>
                                  <ChevronDown size={14} className="text-slate-400" />
                                </button>

                                {showOptionCountDropdown && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setShowOptionCountDropdown(false)}
                                    />
                                    <div className="absolute top-full mt-1.5 left-0 w-full bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 space-y-0.5 z-50">
                                      {['2 opciones', '3 opciones', '4 opciones', '5 opciones'].map(opt => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => {
                                            setCalOptionCount(opt);
                                            setShowOptionCountDropdown(false);
                                            saveAgentConfigurations({ calOptionCount: opt });
                                          }}
                                          className="w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-all border-none bg-transparent outline-none text-left"
                                        >
                                          <span>{opt}</span>
                                          {calOptionCount === opt && (
                                            <Check size={14} className="text-[#059669]" strokeWidth={3} />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400 font-semibold">El superagente ofrecerá esta cantidad de horarios disponibles al cliente</p>
                            </div>
                          )}
                        </div>

                        {/* Mensaje de confirmacion */}
                        <div className="py-4 space-y-3 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                              <MessageSquare className="text-blue-500" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Mensaje de confirmacion</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Mensaje que el superagente envía al confirmar la cita</p>
                            </div>
                          </div>
                          <textarea
                            id="cal-confirmation-textarea"
                            value={calConfirmationMsg}
                            onChange={e => setCalConfirmationMsg(e.target.value)}
                            onBlur={() => saveAgentConfigurations({ calConfirmationMsg })}
                            rows={8}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-semibold text-slate-700 font-mono shadow-sm"
                          />
                          {/* Tags Pills */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {[
                              { label: '{{fecha}}', value: '{{fecha}}' },
                              { label: '{{hora}}', value: '{{hora}}' },
                              { label: '{{nombre}}', value: '{{nombre}}' },
                              { label: '{{email}}', value: '{{email}}' },
                              { label: '{{motivo}}', value: '{{motivo}}' },
                              { label: '{{duracion}}', value: '{{duracion}}' },
                              { label: '{{enlace}}', value: '{{enlace}}' }
                            ].map(pill => (
                              <button
                                key={pill.label}
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById('cal-confirmation-textarea');
                                  let nextVal = '';
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const after = text.substring(end, text.length);
                                    nextVal = before + pill.value + after;
                                    setCalConfirmationMsg(nextVal);
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.selectionStart = textarea.selectionEnd = start + pill.value.length;
                                    }, 0);
                                  } else {
                                    nextVal = calConfirmationMsg + pill.value;
                                    setCalConfirmationMsg(nextVal);
                                  }
                                  saveAgentConfigurations({ calConfirmationMsg: nextVal });
                                }}
                                className="px-2.5 py-1 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all rounded-lg text-[10px] font-black text-slate-500 shadow-sm"
                              >
                                {pill.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Restriccion de horarios */}
                        <div className="flex items-center justify-between py-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                              <Clock className="text-amber-500" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Restriccion de horarios</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Permitir apenas horarios en punto, ej: 09:00</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !calScheduleRestriction;
                              setCalScheduleRestriction(nextVal);
                              saveAgentConfigurations({ calScheduleRestriction: nextVal });
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${calScheduleRestriction ? 'bg-[#059669]' : 'bg-slate-200'}`}>
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${calScheduleRestriction ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Modo de distribucion */}
                        <div className="py-4 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] flex items-center justify-center shrink-0">
                              <Shield className="text-[#0369a1]" size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">Modo de distribucion</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Como los agendamientos seran divididos</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => {
                                setCalDistributionMode('secuencial');
                                saveAgentConfigurations({ calDistributionMode: 'secuencial' });
                              }}
                              className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${calDistributionMode === 'secuencial'
                                ? 'border-[#059669] bg-emerald-50/10'
                                : 'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                            >
                              <span className="text-xs font-black text-slate-800">Distribuir secuencial</span>
                              <span className="text-[10px] font-semibold text-slate-400 leading-relaxed">Los agendamientos se distribuyen alternando de manera secuencial.</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCalDistributionMode('inteligente');
                                saveAgentConfigurations({ calDistributionMode: 'inteligente' });
                              }}
                              className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${calDistributionMode === 'inteligente'
                                ? 'border-[#059669] bg-emerald-50/10'
                                : 'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                            >
                              <span className="text-xs font-black text-slate-800">Distribucion Inteligente</span>
                              <span className="text-[10px] font-semibold text-slate-400 leading-relaxed">Selecciona automáticamente la agenda más apropiada según la conversación.</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Guardar */}
                    <div className="pt-6 border-t border-slate-50">
                      <button
                        onClick={() => handleSaveDetailSettings(activeDetailAgent, false)}
                        className="w-full py-3.5 bg-[#059669] hover:bg-emerald-700 text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Save size={16} /> Guardar configuracion
                      </button>
                    </div>
                  </div>

                ) : convSubTab === 'Recursos' ? (
                  <div className="space-y-6 text-left flex flex-col flex-1 pb-10">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-sm font-black text-slate-800">Recursos</h3>
                        <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                          Gestiona imagenes, audio y videos para entrenar el superagente
                        </p>
                      </div>
                      <button
                        onClick={() => setShowUploadRecursoModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#059669] hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
                      >
                        <Upload size={14} />
                        Subir Recurso
                      </button>
                    </div>

                    {recursosLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                        <RefreshCw size={24} className="animate-spin text-[#059669] mb-3" />
                        <span className="text-xs font-bold">Cargando recursos...</span>
                      </div>
                    ) : recursosList.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-slate-50/20 border border-dashed border-slate-100 rounded-3xl">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4 shadow-inner">
                          <AlertCircle size={24} />
                        </div>
                        <h4 className="text-sm font-black text-slate-800">No hay recursos agregados</h4>
                        <p className="text-xs text-slate-400 max-w-xs font-semibold mt-1.5 leading-relaxed">
                          Sube tu primer recurso multimedia para comenzar
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recursosList.map((recurso) => (
                          <div
                            key={recurso.id}
                            className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
                          >
                            {/* Botón Eliminar */}
                            <button
                              onClick={() => handleDeleteRecurso(recurso.id)}
                              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer border-none bg-transparent outline-none opacity-0 group-hover:opacity-100 z-10"
                            >
                              <Trash2 size={14} />
                            </button>

                            <div className="space-y-3.5">
                              {/* Vista previa o Icono */}
                              <div className="w-full h-32 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center relative">
                                {recurso.tipo === 'Imagen' ? (
                                  recurso.nombre_archivo?.toLowerCase().endsWith('.pdf') ? (
                                    <div
                                      className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100/50 transition-all"
                                      onClick={() => window.open(recurso.archivo_url, '_blank')}
                                    >
                                      <FileText size={36} className="text-red-500" />
                                      <span className="text-[10px] font-black text-slate-400">Documento PDF</span>
                                    </div>
                                  ) : recurso.nombre_archivo?.toLowerCase().match(/\.(doc|docx|txt|csv|xls|xlsx)$/) ? (
                                    <div
                                      className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100/50 transition-all"
                                      onClick={() => window.open(recurso.archivo_url, '_blank')}
                                    >
                                      <FileText size={36} className="text-[#059669]" />
                                      <span className="text-[10px] font-black text-slate-400">Documento</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={recurso.archivo_url}
                                      alt={recurso.nombre_archivo}
                                      className="w-full h-full object-cover cursor-pointer"
                                      onClick={() => window.open(recurso.archivo_url, '_blank')}
                                    />
                                  )
                                ) : recurso.tipo === 'Documento' ? (
                                  <div
                                    className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100/50 transition-all"
                                    onClick={() => window.open(recurso.archivo_url, '_blank')}
                                  >
                                    <FileText size={36} className={recurso.nombre_archivo?.toLowerCase().endsWith('.pdf') ? 'text-red-500' : 'text-[#059669]'} />
                                    <span className="text-[10px] font-black text-slate-400">Documento</span>
                                  </div>
                                ) : recurso.tipo === 'Audio' ? (
                                  <div className="w-full px-4 flex flex-col items-center gap-2">
                                    <Mic size={24} className="text-slate-400" />
                                    <audio src={recurso.archivo_url} controls className="w-full h-8 scale-90" />
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <video src={recurso.archivo_url} controls className="w-full h-full object-contain" />
                                  </div>
                                )}

                                {/* Badge de Tipo */}
                                <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[9px] font-black text-white uppercase tracking-wider ${recurso.tipo === 'Imagen' ? 'bg-blue-500' :
                                  recurso.tipo === 'Documento' ? 'bg-amber-500' :
                                    recurso.tipo === 'Audio' ? 'bg-purple-500' :
                                      'bg-emerald-500'
                                  }`}>
                                  {recurso.tipo}
                                </span>
                              </div>

                              {/* Info */}
                              <div className="space-y-1">
                                <h4 className="text-xs font-black text-slate-800 truncate pr-6" title={recurso.nombre_archivo}>
                                  {recurso.nombre_archivo}
                                </h4>
                                {recurso.descripcion && (
                                  <p className="text-[10px] text-slate-500 font-semibold line-clamp-2 leading-relaxed">
                                    {recurso.descripcion}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Notas de uso */}
                            {recurso.notas_uso && (
                              <div className="mt-4 pt-3 border-t border-slate-50 flex items-start gap-1.5 bg-slate-50/50 p-2.5 rounded-xl">
                                <Info size={10} className="text-[#059669] shrink-0 mt-1.5" />
                                <div className="space-y-0.5">
                                  <p className="text-[8px] font-black text-[#059669] uppercase tracking-wider">Notas de uso</p>
                                  <p className="text-[9px] text-slate-600 font-bold leading-normal">
                                    {recurso.notas_uso}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4 shadow-inner">
                      <SlidersHorizontal size={22} />
                    </div>
                    <h4 className="text-sm font-black text-slate-800">Sección en desarrollo</h4>
                    <p className="text-xs text-slate-400 max-w-xs font-semibold mt-1.5 leading-relaxed">
                      Las funciones de esta sección estarán disponibles en la próxima versión.
                    </p>
                  </div>
                )}
              </div>
            ) : activeMenuTab === 'Conocimiento' ? (
              <div className="space-y-6 text-left flex flex-col flex-1">
                {/* Tabs de Conocimiento */}
                <div className="flex gap-0 border-b border-slate-100 -mx-6 px-6 overflow-x-auto">
                  {[
                    { id: 'Texto', label: 'Texto', icon: <FileText size={14} /> },
                    { id: 'Doc', label: 'Doc', icon: <File size={14} /> },
                    { id: 'Web', label: 'Web', icon: <Globe size={14} /> },
                    { id: 'Videos', label: 'Videos', icon: <Video size={14} /> },
                    { id: 'FAQ', label: 'FAQ', icon: <HelpCircle size={14} /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveKTab(tab.id)}
                      className={`flex items-center gap-1.5 px-6 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${activeKTab === tab.id
                        ? 'border-slate-800 text-slate-800'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Cabecera del Contenido de Conocimiento */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xl font-black text-slate-800">
                      {activeKTab === 'Texto' && 'Contenido de Texto'}
                      {activeKTab === 'Doc' && 'Documentos'}
                      {activeKTab === 'Web' && 'Importar desde Web'}
                      {activeKTab === 'Videos' && 'Videos Importados'}
                      {activeKTab === 'FAQ' && 'Preguntas Frecuentes (FAQ)'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {activeKTab === 'Texto' && 'Bloques de contenido de texto para entrenar el superagente'}
                      {activeKTab === 'Doc' && 'Carga PDF, Word o archivos de texto para entrenar el superagente'}
                      {activeKTab === 'Web' && 'Importa contenido desde sitios web para entrenar el superagente'}
                      {activeKTab === 'Videos' && 'Importa videos de YouTube para entrenar'}
                      {activeKTab === 'FAQ' && 'Preguntas y respuestas comunes para entrenar el superagente'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeKTab === 'Doc' && (
                      <button
                        onClick={handleGoogleDriveImport}
                        className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 bg-white"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19.43 12.98L15.39 6.01C15.19 5.67 14.83 5.46 14.44 5.46H6.36C5.97 5.46 5.61 5.67 5.41 6.01L1.37 12.98C1.17 13.32 1.17 13.73 1.37 14.07L5.41 21.04C5.61 21.38 5.97 21.59 6.36 21.59H14.44C14.83 21.59 15.19 21.38 15.39 21.04L19.43 14.07C19.63 13.73 19.63 13.32 19.43 12.98Z" fill="#FFF" />
                          <path d="M15.39 6.01C15.19 5.67 14.83 5.46 14.44 5.46H6.36C5.97 5.46 5.61 5.67 5.41 6.01L9.45 12.98H19.43L15.39 6.01Z" fill="#FFC107" />
                          <path d="M5.41 6.01L1.37 12.98C1.17 13.32 1.17 13.73 1.37 14.07L5.41 21.04C5.61 21.38 5.97 21.59 6.36 21.59L9.45 12.98L5.41 6.01Z" fill="#2196F3" />
                          <path d="M14.44 21.59H6.36C5.97 21.59 5.61 21.38 5.41 21.04L9.45 14.07H19.43L14.44 21.59Z" fill="#4CAF50" />
                        </svg>
                        Google Drive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (activeKTab === 'Texto' || activeKTab === 'FAQ') {
                          setTextoTitle('');
                          setTextoContent('');
                          setShowAddTextoModal(true);
                        } else if (activeKTab === 'Doc') {
                          setShowUploadDocModal(true);
                        } else if (activeKTab === 'Web') {
                          setWebPageUrl('');
                          setWebDesc('');
                          setUrlImportType('pagina');
                          setWebMaxPages(50);
                          setShowAddUrlModal(true);
                        } else if (activeKTab === 'Videos') {
                          setVideoUrl('');
                          setVideoDesc('');
                          setVideoLanguage('Español');
                          setShowVideoLanguageDropdown(false);
                          setShowAddVideoModal(true);
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                    >
                      <Plus size={14} />
                      {activeKTab === 'Texto' && 'Nuevo Contenido'}
                      {activeKTab === 'Doc' && 'Cargar Documento'}
                      {activeKTab === 'Web' && 'Agregar URL'}
                      {activeKTab === 'Videos' && 'Agregar Video'}
                      {activeKTab === 'FAQ' && 'Nuevo FAQ'}
                    </button>
                  </div>
                </div>

                {/* Ilustración de Estado Vacío */}
                {/* Lista de Contenido de Conocimiento */}
                {conocimientoLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-[#059669] mb-3" />
                    <span className="text-xs font-bold font-sans">Cargando base de conocimiento...</span>
                  </div>
                ) : conocimientoList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-28 bg-white select-none rounded-3xl border border-dashed border-slate-100">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 mb-4 shadow-inner">
                      {activeKTab === 'Texto' && <BookOpen size={24} />}
                      {activeKTab === 'Doc' && (
                        <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="9.5" y1="12.5" x2="14.5" y2="17.5" />
                          <line x1="14.5" y1="12.5" x2="9.5" y2="17.5" />
                        </svg>
                      )}
                      {activeKTab === 'Web' && (
                        <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      )}
                      {activeKTab === 'Videos' && (
                        <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="6 3 20 12 6 21 6 3" />
                        </svg>
                      )}
                      {activeKTab === 'FAQ' && (
                        <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          <path d="M10 2v8l3-2.5 3 2.5V2" />
                        </svg>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {activeKTab === 'Texto' && 'No hay entrenamientos agregados'}
                      {activeKTab === 'Doc' && 'No se encontraron documentos'}
                      {activeKTab === 'Web' && 'No hay URLs agregadas'}
                      {activeKTab === 'Videos' && 'No hay videos agregados'}
                      {activeKTab === 'FAQ' && 'No hay entrenamientos agregados'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs font-semibold mt-1.5 leading-relaxed bg-white">
                      {activeKTab === 'Texto' && 'Agrega tu primer contenido de texto para comenzar'}
                      {activeKTab === 'Doc' && 'Sube tu primer documento para comenzar'}
                      {activeKTab === 'Web' && 'Agrega tu primera URL de sitio web para comenzar'}
                      {activeKTab === 'Videos' && 'Agrega tu primer video de YouTube para comenzar'}
                      {activeKTab === 'FAQ' && 'Agrega tu primera pregunta frecuente para comenzar'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {conocimientoList.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between"
                      >
                        {/* Botón Eliminar */}
                        <button
                          onClick={() => handleDeleteConocimiento(item.id)}
                          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer border-none bg-transparent outline-none opacity-0 group-hover:opacity-100 z-10"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="flex items-start gap-4">
                          {/* Icono de Tipo */}
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${item.tipo === 'Texto' ? 'bg-blue-50 border-blue-100 text-blue-500' :
                            item.tipo === 'Doc' ? 'bg-amber-50 border-amber-100 text-amber-500' :
                              item.tipo === 'Web' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' :
                                item.tipo === 'Videos' ? 'bg-red-50 border-red-100 text-red-500' :
                                  'bg-purple-50 border-purple-100 text-purple-500'
                            }`}>
                            {item.tipo === 'Texto' && <FileText size={18} />}
                            {item.tipo === 'Doc' && <File size={18} />}
                            {item.tipo === 'Web' && <Globe size={18} />}
                            {item.tipo === 'Videos' && <Play size={18} />}
                            {item.tipo === 'FAQ' && <HelpCircle size={18} />}
                          </div>

                          <div className="flex-1 space-y-1.5">
                            <h4 className="text-xs font-black text-slate-800 pr-8">
                              {item.titulo}
                            </h4>

                            {/* Mostrar detalles según tipo */}
                            {item.tipo === 'FAQ' ? (
                              <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100 mt-2">
                                <div className="flex gap-1.5 items-start">
                                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-wide bg-purple-50 px-1.5 py-0.5 rounded-md shrink-0">Respuesta</span>
                                  <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                                    {item.contenido}
                                  </p>
                                </div>
                              </div>
                            ) : item.tipo === 'Texto' ? (
                              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                {item.contenido}
                              </p>
                            ) : item.tipo === 'Doc' ? (
                              <div className="flex items-center gap-2 mt-1">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-black text-[#059669] hover:underline flex items-center gap-1"
                                >
                                  <Link size={10} />
                                  Ver documento cargado
                                </a>
                              </div>
                            ) : (
                              /* Web o Videos */
                              <div className="space-y-1">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-[#059669] hover:underline break-all block"
                                >
                                  {item.url}
                                </a>
                                {item.contenido && (
                                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                    {item.contenido}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeMenuTab === 'Acciones' ? (
              renderAccionesView()
            ) : activeMenuTab === 'Auto-Tareas' ? (
              <div className="space-y-5 text-left flex flex-col flex-1">
                {/* Seguimiento Inteligente Toggle */}
                <div className="border border-slate-100 rounded-2xl bg-white shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800">
                        Seguimiento <span className="text-[#059669]">Inteligente</span>
                      </p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                        Detecta frases como "escríbeme mañana" y programa un mensaje automático.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !seguimientoInteligente;
                        setSeguimientoInteligente(nextVal);
                        saveAgentConfigurations({ seguimientoInteligente: nextVal });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-1.5 ${seguimientoInteligente ? 'bg-[#059669]' : 'bg-slate-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${seguimientoInteligente ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                    <Info size={13} className="text-slate-400 shrink-0 mt-1.5" />
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Si el usuario no especifica hora, el mensaje se programa 23.5 horas después (evita que cierre la ventana de WhatsApp de 24 h).
                    </p>
                  </div>
                </div>

                {/* Historial de Auto-Tareas */}
                <div className="border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-sm font-black text-slate-800">Historial de Auto-Tareas</h3>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1.5">{autoTareaCounts.Todas} tareas programadas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {autoTareas.length > 0 && (
                        <button
                          onClick={handleClearAllAutoTareas}
                          className="px-2.5 py-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5"
                          title="Eliminar todas las auto-tareas"
                        >
                          <Trash2 size={13} />
                          <span>Limpiar todo</span>
                        </button>
                      )}
                      <button
                        onClick={fetchAutoTareas}
                        disabled={loadingAutoTareas}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50"
                        title="Actualizar lista"
                      >
                        <RefreshCw size={14} className={loadingAutoTareas ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Filter pills */}
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-50">
                    {[
                      { id: 'Todas', label: 'Todas', count: autoTareaCounts.Todas },
                      { id: 'Pendientes', label: 'Pendientes', count: autoTareaCounts.Pendientes },
                      { id: 'Enviadas', label: 'Enviadas', count: autoTareaCounts.Enviadas },
                      { id: 'Fallidas', label: 'Fallidas', count: autoTareaCounts.Fallidas },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setAutoTareaFilter(f.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${autoTareaFilter === f.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:bg-slate-50/50'
                          }`}
                      >
                        <span>{f.label}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${autoTareaFilter === f.id
                          ? 'bg-white text-slate-900'
                          : 'bg-slate-100 text-slate-500'
                          }`}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* List or Loading or Empty state */}
                  {loadingAutoTareas ? (
                    <div className="flex-1 flex items-center justify-center py-16">
                      <RefreshCw size={24} className="text-slate-400 animate-spin" />
                    </div>
                  ) : getFilteredAutoTareas().length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                      <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                        <Clock size={28} className="text-slate-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-400">No hay tareas registradas</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50 min-h-[300px]">
                      {getFilteredAutoTareas().map(tarea => (
                        <div key={tarea.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                              <Clock size={16} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-black text-slate-800">{tarea.targetName || 'Cliente'}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">{tarea.targetId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[11px] font-bold text-slate-600">
                                {tarea.fecha ? `${tarea.fecha} ${tarea.hora || ''}` : 'Sin fecha'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Programada</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${tarea.status === 'Completado' ? 'bg-emerald-50 text-emerald-600' :
                              tarea.status === 'Fallido' ? 'bg-rose-50 text-rose-600' :
                                tarea.status === 'Enviando' ? 'bg-blue-50 text-blue-600' :
                                  'bg-amber-50 text-amber-600'
                              }`}>
                              {tarea.status === 'Programado' ? 'Pendiente' :
                                tarea.status === 'Completado' ? 'Enviada' :
                                  tarea.status === 'Fallido' ? 'Fallida' :
                                    tarea.status}
                            </span>
                            <button
                              onClick={() => handleDeleteAutoTarea(tarea.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar tarea"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            ) : activeMenuTab === 'Actividad' ? (
              <div className="space-y-4 text-left flex flex-col flex-1">
                {/* Sub-tabs: Métricas / Conversaciones */}
                <div className="flex mb-2 select-none">
                  <div className="bg-slate-100/60 border border-slate-200/50 rounded-2xl p-1 flex gap-1 w-fit">
                    {[
                      { id: 'Metricas', label: 'Métricas' },
                      { id: 'Conversaciones', label: 'Conversaciones' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActividadSubTab(tab.id)}
                        className={`px-5 py-2 text-xs font-bold rounded-xl transition-all border-none outline-none cursor-pointer ${actividadSubTab === tab.id
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'bg-transparent text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {actividadSubTab === 'Metricas' ? (
                  <div className="space-y-4 flex-1">
                    {/* Period selector */}
                    <div className="flex items-center gap-2">
                      {[
                        { id: 'hoy', label: 'Hoy' },
                        { id: '7dias', label: '7 días' },
                        { id: '30dias', label: '30 días' },
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setMetricsPeriod(p.id)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${metricsPeriod === p.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Metrics grid */}
                    {loadingActivityStats ? (
                      <div className="flex-1 flex items-center justify-center py-16">
                        <RefreshCw size={24} className="text-slate-400 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          {/* Tasa de Resolución - highlighted red */}
                          <div className="p-4 bg-red-50/60 border border-red-100/80 rounded-2xl">
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Tasa de Resolución</p>
                            <p className="text-xl font-black text-red-500">{activityStats.resolution_rate}%</p>
                          </div>
                          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Conversaciones</p>
                            <p className="text-xl font-black text-slate-800">{activityStats.conversations}</p>
                          </div>
                          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Mensajes enviados</p>
                            <p className="text-xl font-black text-slate-800">{activityStats.messages_sent}</p>
                          </div>
                          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Pendiente Humano</p>
                            <p className="text-xl font-black text-slate-800">{activityStats.pending_human}</p>
                          </div>
                          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Transferidas</p>
                            <p className="text-xl font-black text-slate-800">{activityStats.transferred}</p>
                          </div>
                          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Resueltas</p>
                            <p className="text-xl font-black text-slate-800">{activityStats.resolved}</p>
                          </div>
                        </div>

                        {/* Trend chart */}
                        <div className="border border-slate-100 rounded-2xl bg-white shadow-sm p-5">
                          <p className="text-xs font-black text-slate-700 mb-4">Tendencia diaria de conversaciones</p>
                          <div className="relative h-40 flex items-end gap-1.5 pt-4">
                            {activityStats.timeline && activityStats.timeline.length > 0 ? (
                              activityStats.timeline.map((t, idx) => {
                                const maxVal = Math.max(...activityStats.timeline.map(x => x.value), 1);
                                const percent = (t.value / maxVal) * 100;
                                return (
                                  <div key={idx} className="relative flex-1 h-full flex flex-col items-center justify-end group">
                                    <div className="text-[9px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 shadow-sm absolute -translate-y-6">
                                      {t.value}
                                    </div>
                                    <div
                                      className="w-full bg-[#059669]/20 group-hover:bg-[#059669] rounded-t-lg transition-all"
                                      style={{ height: `${Math.max(4, percent)}%` }}
                                    />
                                    <span className="text-[9px] font-bold text-slate-400 mt-2 select-none">{t.date}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                                No hay datos de actividad para este periodo
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Conversaciones panel */
                  <div className="flex flex-1 gap-0 min-h-0 border border-slate-100 rounded-2xl bg-white shadow-sm overflow-hidden" style={{ height: '460px' }}>
                    {/* Left: contact list */}
                    <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col h-full overflow-hidden">
                      {/* Filter pills */}
                      <div className="flex items-center justify-between p-3 border-b border-slate-50">
                        <div className="flex items-center gap-1.5">
                          {['Todas', 'Humano', 'Lagunas'].map(f => (
                            <button
                              key={f}
                              onClick={() => setConversacionFilter(f)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-none outline-none cursor-pointer ${conversacionFilter === f ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchActivityConversations()}
                          className="w-7 h-7 bg-slate-50 hover:bg-slate-100/85 border border-slate-150 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all border-none outline-none cursor-pointer active:scale-95 shrink-0"
                          title="Recargar conversaciones"
                        >
                          <RefreshCw size={12} className={loadingActivityConversations ? 'animate-spin text-[#059669]' : ''} />
                        </button>
                      </div>
                      {/* Search */}
                      <div className="px-3 py-2 border-b border-slate-50">
                        <input
                          type="text"
                          placeholder="Buscar contacto..."
                          value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)}
                          className="w-full text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 outline-none focus:border-[#059669] transition-all"
                        />
                      </div>
                      {/* List */}
                      {loadingActivityConversations ? (
                        <div className="flex-1 flex items-center justify-center">
                          <RefreshCw size={20} className="text-slate-400 animate-spin" />
                        </div>
                      ) : activityConversations.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-xs font-semibold text-slate-400">Sin contactos</p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                          {activityConversations.map(c => (
                            <button
                              key={c.jid}
                              onClick={() => fetchConversationMessages(c.jid)}
                              className={`w-full text-left px-4 py-3 flex gap-3 items-center border-none border-b border-slate-50 outline-none cursor-pointer transition-colors ${selectedChatJid === c.jid ? 'bg-slate-50' : 'bg-transparent hover:bg-slate-50/40'
                                }`}
                            >
                              {/* Avatar */}
                              <div className="relative shrink-0 select-none">
                                {c.foto_perfil ? (
                                  <img
                                    src={getMediaUrl(c.foto_perfil)}
                                    alt={chatVisibleName(c)}
                                    className="w-9 h-9 rounded-full object-cover border border-slate-200/60"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                  />
                                ) : null}
                                <div
                                  className="w-9 h-9 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-xs font-black text-[#059669] uppercase"
                                  style={{ display: c.foto_perfil ? 'none' : 'flex' }}
                                >
                                  {getAvatarInitial(c)}
                                </div>
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-slate-800 truncate max-w-[130px]">{chatVisibleName(c)}</span>
                                  <span className="text-[9px] text-slate-400 font-semibold">
                                    {c.actualizado_en ? new Date(c.actualizado_en).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : ''}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-semibold truncate mt-1.5">
                                  {c.ultimo_mensaje ? String(c.ultimo_mensaje).replace(/[*_~`]/g, '') : 'Sin mensajes'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${c.agente_asignado_id && c.agente_asignado_id !== activeDetailAgent.id
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                    {c.agente_asignado_id && c.agente_asignado_id !== activeDetailAgent.id ? 'Humano' : 'Bot'}
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: conversation pane */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/20">
                      {selectedChatJid ? (
                        loadingSelectedMessages ? (
                          <div className="flex-1 flex items-center justify-center">
                            <RefreshCw size={24} className="text-slate-400 animate-spin" />
                          </div>
                        ) : (() => {
                          const selectedContact = activityConversations.find(c => c.jid === selectedChatJid);
                          return (
                            <div className="flex-1 flex flex-col h-full overflow-hidden">
                              {/* Chat Header */}
                              <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                  {/* Avatar in header */}
                                  {selectedContact?.foto_perfil ? (
                                    <img
                                      src={getMediaUrl(selectedContact.foto_perfil)}
                                      alt="Chat Avatar"
                                      className="w-9 h-9 rounded-full object-cover border border-slate-200/60 shrink-0"
                                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                    />
                                  ) : null}
                                  <div
                                    className="w-9 h-9 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-xs font-black text-[#059669] uppercase shrink-0"
                                    style={{ display: selectedContact?.foto_perfil ? 'none' : 'flex' }}
                                  >
                                    {getAvatarInitial(selectedContact)}
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <h4 className="text-xs font-black text-slate-800">
                                      {chatVisibleName(selectedContact)}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 font-semibold">
                                      {cleanPhoneFromJid(selectedContact?.telefono || selectedChatJid)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => fetchConversationMessages(selectedChatJid)}
                                  className="w-7 h-7 bg-slate-50 hover:bg-slate-100/85 border border-slate-150 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all border-none outline-none cursor-pointer active:scale-95 shrink-0"
                                  title="Recargar conversación"
                                >
                                  <RefreshCw size={12} className={loadingSelectedMessages ? 'animate-spin text-[#059669]' : ''} />
                                </button>
                              </div>
                              {/* Chat Messages */}
                              <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                                {selectedChatMessages.map((m, idx) => {
                                  const isMedia = ['imagen', 'audio', 'video', 'documento', 'sticker'].includes(m.tipo) && m.url_media;
                                  const resolvedMediaUrl = isMedia ? getMediaUrl(m.url_media) : '';
                                  return (
                                    <div
                                      key={idx}
                                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs font-semibold leading-relaxed shadow-sm ${m.tipo === 'audio' ? 'min-w-[280px]' : ''
                                        } ${m.es_mio
                                          ? 'bg-[#059669] text-white self-end rounded-tr-none'
                                          : 'bg-white text-slate-800 self-start rounded-tl-none border border-slate-100'
                                        }`}
                                    >
                                      {isMedia && (
                                        <div className="mb-2 rounded-xl overflow-hidden bg-black/5 max-w-xs border border-slate-100">
                                          {['imagen', 'sticker'].includes(m.tipo) ? (
                                            <img
                                              src={resolvedMediaUrl}
                                              alt={m.tipo}
                                              className="w-full max-h-48 object-contain"
                                            />
                                          ) : m.tipo === 'video' ? (
                                            <video controls className="w-full max-h-48 block">
                                              <source src={resolvedMediaUrl} type={m.mime_media || 'video/mp4'} />
                                            </video>
                                          ) : m.tipo === 'audio' ? (
                                            <div className="p-2 bg-slate-50 rounded-xl">
                                              <audio controls className={`w-full h-8 ${m.es_mio ? 'invert brightness-150 grayscale' : ''}`}>
                                                <source src={resolvedMediaUrl} type={m.mime_media || 'audio/ogg'} />
                                              </audio>
                                            </div>
                                          ) : (
                                            <a
                                              href={resolvedMediaUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-3 flex items-center gap-2 hover:bg-slate-100/50 transition-colors text-emerald-600 no-underline"
                                            >
                                              <Paperclip size={14} />
                                              <span className="truncate text-[10px] font-bold">{m.nombre_archivo || 'Documento'}</span>
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      <p className="whitespace-pre-wrap break-words">{formatMessageText(m.texto)}</p>
                                      <span className={`text-[8px] font-black block text-right mt-1.5 ${m.es_mio ? 'text-zinc-400' : 'text-slate-400'}`}>
                                        {m.fecha_mensaje ? new Date(m.fecha_mensaje).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                    </div>
                                  );
                                })}
                                {selectedChatMessages.length === 0 && (
                                  <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-semibold">
                                    No hay mensajes registrados
                                  </div>
                                )}
                                <div ref={messagesEndRef} />
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-xs font-semibold text-slate-400">Selecciona un contacto para ver la conversación</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4 shadow-inner">
                  <SlidersHorizontal size={24} />
                </div>
                <h4 className="text-base font-black text-slate-800">Sección en desarrollo</h4>
                <p className="text-xs text-slate-400 max-w-sm font-semibold mt-1.5 leading-relaxed">
                  Las funciones de "{activeMenuTab}" estarán disponibles próximamente.
                </p>
              </div>
            )}

          </div>
        </div>


        {/* Botón flotante Probar Asistente (abajo derecha) */}
        {activeDetailAgent && !showTestDrawer && (
          <div className="fixed bottom-6 right-8 z-[100]">
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping pointer-events-none"></span>
            <button
              onClick={() => setShowTestDrawer(true)}
              className="relative flex items-center gap-2.5 h-14 pl-3 pr-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full shadow-[0_10px_35px_rgba(5,150,105,0.55)] transition-all active:scale-95"
            >
              <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Bot size={20} className="text-white" />
              </span>
              <span className="text-sm font-black whitespace-nowrap">Probar Asistente</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f5f5f6] font-sans selection:bg-emerald-200/50 overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex-1 ml-20 h-screen flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={onLogout} title="GeoChat" onRefresh={fetchAgentsAndStats} isLoading={loading} />

        <main className="p-3.5 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)]">

        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-w-0">

          {/* --- BLOQUEO DE MóDULO POR PLAN ---------------------------- */}
          {dashboardData !== null && !dashboardData?.plan?.features?.ia ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 select-none">
              {/* Icono con glow */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-purple-100 flex items-center justify-center shadow-lg shadow-emerald-100/60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                {/* Badge candado */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              </div>

              {/* Título */}
              <h2 className="text-2xl font-black text-slate-800 mb-2">Módulo de Superagentes IA</h2>
              <p className="text-sm text-slate-500 font-medium mb-1 max-w-sm">
                Automatiza tus conversaciones de WhatsApp con inteligencia artificial. Esta funcionalidad es exclusiva del Plan Advanced.
              </p>

              {/* Plan badge */}
              <div className="flex items-center gap-2 mt-4 mb-6">
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Plan {dashboardData?.plan?.nombre || 'Actual'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                <span className="bg-gradient-to-r from-emerald-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm shadow-emerald-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  Requiere Plan Advanced
                </span>
              </div>

              {/* Tarjetas de beneficios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mb-8">
                {[
                  { icon: '🤖', title: 'Superagentes con IA', desc: 'Crea bots inteligentes que responden 24/7 entrenados con tu contenido.' },
                  { icon: '🎯', title: 'Múltiples Objetivos', desc: 'Agendamiento de citas, ventas, captación de leads, soporte y más.' },
                  { icon: '📚', title: 'Base de Conocimiento', desc: 'Entrena al agente con tus PDFs, URLs, preguntas y respuestas propias.' },
                ].map((b) => (
                  <div key={b.title} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left shadow-sm">
                    <div className="text-2xl mb-2">{b.icon}</div>
                    <h4 className="text-xs font-black text-slate-800 mb-1">{b.title}</h4>
                    <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => window.open('https://geochat.corporativoqbank.com/pricing', '_blank')}
                className="bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-full text-sm font-black transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                Mejorar mi plan
              </button>
              <p className="text-[11px] text-slate-400 font-semibold mt-3">¿Tienes dudas? Contáctanos por WhatsApp</p>
            </div>
          ) : (
            <>
              {activeDetailAgent ? (
                renderDetailView()
              ) : (
                <>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Superagentes</h1>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full tracking-wider">
                          BETA
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 font-medium mt-1">Gestiona tus superagentes</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAgent(null);
                        resetForm();
                        setShowCreateModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm font-black transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-emerald-100"
                    >
                      <Plus size={16} strokeWidth={3} /> Crear Superagente
                    </button>
                  </div>

                  {/* Estadásticas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
                    {/* Stat 1 */}
                    <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                        <Bot size={22} />
                      </div>
                      <div className="text-left">
                        <p className="text-[24px] font-black text-slate-800 leading-none">{stats.total}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Total de superagentes</p>
                      </div>
                    </div>

                    {/* Stat 2 */}
                    <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                        <Check size={22} className="text-slate-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-[24px] font-black text-slate-800 leading-none">{stats.activos}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Superagentes activos</p>
                      </div>
                    </div>

                    {/* Stat 3 */}
                    <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                        <Database size={22} className="text-slate-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-[24px] font-black text-slate-800 leading-none">
                            {parseFloat(stats.knowledge_base_mb || 0).toFixed(2)} MB
                          </p>
                          {getPlanBadge(false)}
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1.5">Base de conocimiento</p>
                      </div>
                    </div>
                  </div>

                  {/* Filtros */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 shrink-0 relative z-10">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar superagentes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-full outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 transition-all font-medium text-slate-700 shadow-sm"
                      />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Filtro Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                          className="flex items-center justify-between gap-3 px-6 py-3 bg-white border border-slate-100 rounded-full text-slate-600 font-bold text-sm shadow-sm hover:bg-slate-50 transition-all min-w-[120px]"
                        >
                          <span>{statusFilter}</span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>

                        <AnimatePresence>
                          {showStatusDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute left-0 mt-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 py-3 animate-fade-in"
                              >
                                <div className="space-y-1">
                                  {['Todos', 'Activos', 'Inactivos'].map((option) => (
                                    <button
                                      key={option}
                                      onClick={() => {
                                        setStatusFilter(option);
                                        setShowStatusDropdown(false);
                                      }}
                                      className="flex items-center justify-between w-full text-left px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition-colors"
                                    >
                                      <span>{option}</span>
                                      {statusFilter === option && <Check size={14} className="text-slate-800 shrink-0 ml-2" />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Columnas Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-full text-slate-600 font-bold text-sm shadow-sm hover:bg-slate-50 transition-all"
                        >
                          Columnas <ChevronDown size={14} />
                        </button>

                        <AnimatePresence>
                          {showColumnsDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowColumnsDropdown(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 py-3"
                              >
                                <div className="space-y-1">
                                  <button
                                    onClick={() => setVisibleColumns({ ...visibleColumns, nombre: !visibleColumns.nombre })}
                                    className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition-colors"
                                  >
                                    <span className="w-4 flex items-center justify-center shrink-0">
                                      {visibleColumns.nombre && <Check size={14} className="text-slate-800" />}
                                    </span>
                                    Nombre
                                  </button>
                                  <button
                                    onClick={() => setVisibleColumns({ ...visibleColumns, descripcion: !visibleColumns.descripcion })}
                                    className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition-colors"
                                  >
                                    <span className="w-4 flex items-center justify-center shrink-0">
                                      {visibleColumns.descripcion && <Check size={14} className="text-slate-800" />}
                                    </span>
                                    Descripción
                                  </button>
                                  {agents && agents.length > 0 && (
                                    <button
                                      onClick={() => setVisibleColumns({ ...visibleColumns, objective: !visibleColumns.objective })}
                                      className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition-colors"
                                    >
                                      <span className="w-4 flex items-center justify-center shrink-0">
                                        {visibleColumns.objective && <Check size={14} className="text-slate-800" />}
                                      </span>
                                      Objetivo
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setVisibleColumns({ ...visibleColumns, estado: !visibleColumns.estado })}
                                    className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition-colors"
                                  >
                                    <span className="w-4 flex items-center justify-center shrink-0">
                                      {visibleColumns.estado && <Check size={14} className="text-slate-800" />}
                                    </span>
                                    Estado
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Tabla */}
                  <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col mb-4">
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/20">
                            {visibleColumns.nombre && (
                              <th
                                onClick={() => handleSort('nombre')}
                                className="px-6 py-4 text-xs font-bold text-slate-500 select-none cursor-pointer hover:bg-slate-100/50 transition-colors rounded-tl-xl"
                              >
                                NOMBRE <span className="text-slate-400 ml-1">{sortField === 'nombre' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}</span>
                              </th>
                            )}
                            {visibleColumns.descripcion && (
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 select-none">
                                DESCRIPCIÓN
                              </th>
                            )}
                            {visibleColumns.objective && agents.length > 0 && (
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 select-none">
                                OBJETIVO
                              </th>
                            )}
                            {visibleColumns.estado && (
                              <th
                                onClick={() => handleSort('activo')}
                                className="px-6 py-4 text-xs font-bold text-slate-500 select-none text-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                              >
                                ESTADO <span className="text-slate-400 ml-1">{sortField === 'activo' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}</span>
                              </th>
                            )}
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 select-none text-center rounded-tr-xl">
                              ACCIONES
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {loading ? (
                            Array.from({ length: 2 }).map((_, i) => (
                              <tr key={i} className="animate-pulse">
                                {visibleColumns.nombre && <td className="px-6 py-5"><div className="h-4 w-36 bg-slate-100 rounded" /></td>}
                                {visibleColumns.descripcion && <td className="px-6 py-5"><div className="h-4 w-64 bg-slate-100 rounded" /></td>}
                                {visibleColumns.objective && <td className="px-6 py-5"><div className="h-4 w-24 bg-slate-100 rounded" /></td>}
                                {visibleColumns.estado && <td className="px-6 py-5"><div className="h-6 w-12 bg-slate-100 rounded-full mx-auto" /></td>}
                                <td className="px-6 py-5"><div className="h-4 w-12 bg-slate-100 rounded mx-auto" /></td>
                              </tr>
                            ))
                          ) : paginatedAgents.length > 0 ? (
                            paginatedAgents.map((agent) => (
                              <tr key={agent.id} className="hover:bg-slate-50/20 transition-colors group">
                                {visibleColumns.nombre && (
                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs uppercase shrink-0">
                                        {agent.nombre ? agent.nombre.charAt(0) : 'S'}
                                      </div>
                                      <div
                                        onClick={() => {
                                          setActiveDetailAgent(agent);
                                          setActiveMenuTab('General');
                                          setIsEditingDetailName(false);
                                          setDetailNameValue(agent.nombre);
                                        }}
                                        className="cursor-pointer hover:underline"
                                      >
                                        <span className="font-bold text-slate-700 text-sm block">{agent.nombre}</span>
                                        <span className="text-[11px] text-slate-400 font-medium block mt-1.5">
                                          Modelo: {agent.modelo}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                )}
                                {visibleColumns.descripcion && (
                                  <td className="px-6 py-5">
                                    <span className="text-slate-400 text-sm font-medium block truncate max-w-sm">
                                      {agent.descripcion_negocio || agent.instrucciones || 'Sin instrucciones adicionales.'}
                                    </span>
                                  </td>
                                )}
                                {visibleColumns.objective && agents.length > 0 && (
                                  <td className="px-6 py-5">
                                    {agent.objetivo ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f1f5f9] text-[#475569] border border-slate-200/50">
                                        {OBJECTIVES.find(o => o.id === agent.objetivo)?.title || agent.objetivo}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-xs">-</span>
                                    )}
                                  </td>
                                )}
                                {visibleColumns.estado && (
                                  <td className="px-6 py-5 text-center">
                                    <button
                                      onClick={() => handleToggleActive(agent)}
                                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer hover:scale-105 active:scale-95 transition-all select-none bg-transparent outline-none ${agent.activo === 1
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50 hover:bg-emerald-100/30'
                                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100/50'
                                        }`}
                                    >
                                      {agent.activo === 1 ? 'Activo' : 'Inactivo'}
                                    </button>
                                  </td>
                                )}
                                <td className="px-6 py-5">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setActiveDetailAgent(agent);
                                        setActiveMenuTab('General');
                                        setIsEditingDetailName(false);
                                        setDetailNameValue(agent.nombre);
                                      }}
                                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <div className="relative group/dup">
                                      <button
                                        onClick={() => handleDuplicateAgent(agent)}
                                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer active:scale-95"
                                      >
                                        <Copy size={15} />
                                      </button>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/dup:opacity-100 transition-opacity pointer-events-none z-50 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-800 shadow-sm">
                                        Duplicar
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedAgent(agent);
                                        setShowDeleteModal(true);
                                      }}
                                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={
                                  Object.entries(visibleColumns).filter(([key, val]) => {
                                    if (key === 'objective') return val && agents.length > 0;
                                    return val;
                                  }).length + 1
                                }
                                className="px-6 py-20 text-center"
                              >
                                <span className="text-slate-500 font-semibold text-sm">
                                  No hay superagentes creados.
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación */}
                    <div className="mt-auto px-6 py-4 border-t border-slate-100 bg-slate-50/10 flex items-center justify-end gap-6">
                      <div className="flex items-center gap-4">
                        {/* Custom page size dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
                            className="flex items-center gap-1 pl-4 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[#0f172a] font-bold text-xs shadow-sm cursor-pointer outline-none hover:bg-slate-50 transition-all"
                          >
                            {pageSize}
                            <ChevronDown size={12} className="text-slate-400" />
                          </button>
                          {showPageSizeDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowPageSizeDropdown(false)} />
                              <div className="absolute left-0 bottom-full mb-1.5 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-24 py-1.5 overflow-hidden">
                                {[10, 20, 30, 40, 50].map(size => (
                                  <button
                                    key={size}
                                    onClick={() => { setPageSize(size); setShowPageSizeDropdown(false); }}
                                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold hover:bg-slate-50 transition-colors text-left text-slate-700"
                                  >
                                    {size}
                                    {pageSize === size && <Check size={12} className="text-slate-800" />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        <span className="text-xs text-slate-500 font-semibold select-none">
                          Página {validCurrentPage} de {totalPages}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCurrentPage(1)}
                            disabled={validCurrentPage === 1}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all font-bold text-xs"
                          >
                            &lt;&lt;s
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.max(1, validCurrentPage - 1))}
                            disabled={validCurrentPage === 1}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all font-bold text-xs"
                          >
                            &lt;
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, validCurrentPage + 1))}
                            disabled={validCurrentPage === totalPages}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all font-bold text-xs"
                          >
                            &gt;
                          </button>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={validCurrentPage === totalPages}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all font-bold text-xs"
                          >
                            &gt;&gt;
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>
        </div>
      </main>
      </div>

      {/* MODAL CONFIGURAR SUPERAGENTE */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >

              {/* Header */}
              <div className="px-8 pt-6 pb-5 flex flex-col border-b border-slate-100 shrink-0">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-400">
                    {selectedAgent ? 'Editar Superagente' : `Configurar Superagente • Paso ${modalStep} de 3`}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-xl shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Progress Bar (Only during creation) */}
                {!selectedAgent && (
                  <div className="flex gap-1.5 mt-3 mb-4">
                    <div className={`h-1 flex-1 rounded-full ${modalStep >= 1 ? 'bg-slate-800' : 'bg-slate-100'}`} />
                    <div className={`h-1 flex-1 rounded-full ${modalStep >= 2 ? 'bg-slate-800' : 'bg-slate-100'}`} />
                    <div className={`h-1 flex-1 rounded-full ${modalStep >= 3 ? 'bg-slate-800' : 'bg-slate-100'}`} />
                  </div>
                )}

                <div className="text-left mt-1">
                  <h3 className="font-extrabold text-slate-800 text-[20px] tracking-tight leading-tight">
                    {selectedAgent ? 'Editar Superagente' : (
                      modalStep === 1 ? 'Selecciona tu industria' :
                        modalStep === 2 ? 'Selecciona el objetivo principal' :
                          'Cuéntanos sobre tu negocio'
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1.5">
                    {selectedAgent ? 'Modifica los campos de tu asistente' : (
                      modalStep === 1 ? 'Selecciona una plantilla para configurar rápidamente tu asistente' :
                        modalStep === 2 ? 'Elige lo que quieres lograr con tu asistente' :
                          'Esta información ayudará a tu asistente a responder mejor'
                    )}
                  </p>
                  {modalStep === 2 && selectedTemplate && (
                    <p className="text-xs text-slate-400 font-semibold mt-1.5 select-none">
                      Basado en plantilla: <span className="font-extrabold text-slate-700">{selectedTemplate.title}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-8">
                {modalStep === 1 ? (
                  <div className="space-y-6">
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            onClick={() => handleSelectTemplate(tmpl)}
                            className="flex items-start gap-4 p-4 text-left border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/50 hover:bg-slate-50/10 transition-all group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all">
                              {tmpl.icon}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <p className="font-bold text-slate-800 text-sm">{tmpl.title}</p>
                              <p className="text-xs text-slate-400 font-semibold mt-1">{tmpl.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col items-center justify-center">
                      <button
                        onClick={handleConfigureManual}
                        className="text-sm font-bold text-[#059669] hover:text-emerald-700 transition-all hover:underline"
                      >
                        Mi industria no está aquí, configurar manualmente
                      </button>
                    </div>
                  </div>
                ) : modalStep === 2 ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {(() => {
                        const { list, recommendedId } = getObjectivesForIndustry(formData.industria);
                        const allowsAllObjectives = dashboardData?.plan?.features?.todos_objetivos_ia || false;
                        return OBJECTIVES
                          .filter(obj => list.includes(obj.id))
                          .map((obj) => {
                            const isSelected = formData.objetivo === obj.id;
                            const isRecommended = obj.id === recommendedId;
                            const isObjDisabled = obj.id !== 'preguntas_frecuentes';
                            const disabled = !allowsAllObjectives && isObjDisabled;
                            return (
                              <div
                                key={obj.id}
                                onClick={() => handleSelectObjective(obj)}
                                className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${disabled
                                  ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-slate-50/50 border-slate-300 shadow-sm'
                                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/20'
                                  }`}
                              >
                                <div className="flex items-center gap-4">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: obj.dotColor }}
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-black text-slate-800">{obj.title}</h4>
                                      {isRecommended && !disabled && (
                                        <span className="bg-orange-50 text-orange-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-orange-100/50 tracking-wide uppercase select-none">
                                          Recomendado
                                        </span>
                                      )}
                                      {disabled && (
                                        <span className="bg-amber-50 text-amber-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-100/50 tracking-wide uppercase select-none flex items-center gap-0.5">
                                          <Lock size={8} /> Pro
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-bold mt-1.5">{obj.description}</p>
                                  </div>
                                </div>

                                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                  {disabled ? (
                                    <Lock size={14} className="text-amber-500" />
                                  ) : isSelected ? (
                                    <Check size={16} className="text-slate-800" strokeWidth={3} />
                                  ) : null}
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>

                    {/* Botones de acción Paso 2 */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setModalStep(1)}
                        className="flex items-center gap-1 font-bold text-slate-500 hover:text-slate-700 text-sm transition-all bg-transparent border-none outline-none"
                      >
                        &lt; Atrás
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalStep(3)}
                        className="px-6 py-2.5 rounded-full bg-[#059669] hover:bg-emerald-700 text-white font-black text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-emerald-100"
                      >
                        Siguiente <ChevronRight size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateAgent} className="space-y-6">

                    {/* Nombre del Agente */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block text-left">
                        Nombre del negocio
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder={getBusinessNamePlaceholder(formData.industria)}
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>

                    {/* Información del negocio */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block text-left">
                        Información del negocio
                      </label>
                      <textarea
                        value={formData.descripcion_negocio}
                        onChange={(e) => setFormData({ ...formData, descripcion_negocio: e.target.value })}
                        rows={6}
                        placeholder={getBusinessDescriptionTemplate(formData.industria) || "Describe tu negocio, servicios, horarios, ubicación, etc."}
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all font-bold text-slate-700 text-sm resize-none"
                      />
                      <p className="text-[11px] text-slate-400 font-bold mt-1">
                        Tu asistente usará esta información para responder preguntas de clientes
                      </p>
                    </div>

                    {/* Botones de acción Paso 3 */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setModalStep(2)}
                        className="flex items-center gap-1 font-bold text-slate-500 hover:text-slate-700 text-sm transition-all bg-transparent border-none outline-none"
                      >
                        &lt; Atrás
                      </button>

                      <button
                        type="submit"
                        disabled={isCreatingAgent || !formData.nombre.trim() || !formData.descripcion_negocio.trim()}
                        className={`px-6 py-2.5 rounded-full font-black text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${(isCreatingAgent || !formData.nombre.trim() || !formData.descripcion_negocio.trim())
                          ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none'
                          : 'bg-[#059669] hover:bg-emerald-700 text-white shadow-emerald-100'
                          }`}
                      >
                        {isCreatingAgent ? (
                          <>Creando... <RefreshCw size={14} className="animate-spin text-slate-400" /></>
                        ) : (
                          <>Crear Asistente <Check size={16} strokeWidth={3} /></>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ELIMINAR SUPERAGENTE */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden p-6"
            >
              <div className="space-y-6">
                <div className="flex gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <AlertCircle className="text-rose-500 shrink-0" size={24} />
                  <p className="text-sm text-rose-700 leading-relaxed font-medium">
                    ¿Estás seguro de que deseas eliminar el superagente <span className="font-black">"{selectedAgent?.nombre}"</span>? Esta acción es irreversible y detendrá la automatización inteligente en su terminal.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-4 rounded-2xl border border-slate-100 font-black text-slate-400 text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteAgent}
                    className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 shadow-xl shadow-rose-100 cursor-pointer border-none"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CAMBIAR OBJETIVO DEL ASISTENTE */}
      <AnimatePresence>
        {showChangeObjectiveModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#f4f4f5] w-full max-w-[700px] rounded-[2rem] shadow-2xl flex flex-col relative p-8 text-left overflow-y-auto max-h-[90vh]"
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowChangeObjectiveModal(false)}
                className="absolute top-6 right-6 border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer bg-white shadow-sm"
              >
                <X size={14} />
              </button>

              {/* Encabezado */}
              <div className="mb-6 text-center select-none">
                <h3 className="text-base font-sans font-black text-slate-800">Cambiar objetivo del asistente</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Selecciona un nuevo objetivo. Se preconfigurará automáticamente para ese propósito.
                </p>
              </div>

              {/* Grid de Objetivos */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-3 flex-1 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {OBJECTIVES.map((obj) => {
                    const isSelected = tempSelectedObjective === obj.id;
                    const isActual = activeDetailAgent.objetivo === obj.id;
                    const allowsAllObjectives = dashboardData?.plan?.features?.todos_objetivos_ia || false;
                    const isObjDisabled = obj.id !== 'preguntas_frecuentes';
                    const disabled = !allowsAllObjectives && isObjDisabled;

                    return (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => {
                          if (disabled) {
                            showNotification("Este objetivo está bloqueado en tu plan actual. Mejora al Plan Advanced para desbloquearlo.", "error");
                            return;
                          }
                          setTempSelectedObjective(obj.id);
                        }}
                        className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${disabled
                          ? 'opacity-65 bg-slate-50 border-slate-150 cursor-not-allowed'
                          : isSelected
                            ? 'border-[#059669] bg-slate-50/20 shadow-sm'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                          }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: obj.dotColor }}
                        />
                        <div className="flex-1 pr-6">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-slate-800">{obj.title}</p>
                            {isActual && (
                              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-100/50 tracking-wider uppercase">
                                Actual
                              </span>
                            )}
                            {disabled && (
                              <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-100/50 tracking-wider uppercase flex items-center gap-0.5">
                                <Lock size={7} /> Pro
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-slate-400 leading-normal mt-1">{obj.description}</p>
                        </div>

                        {isSelected && (
                          <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-[#059669]/10 text-[#059669] flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Opción Personalizado */}
                  {(() => {
                    const isSelected = tempSelectedObjective === 'personalizado';
                    const isActual = activeDetailAgent.objetivo === 'personalizado';
                    return (
                      <button
                        type="button"
                        onClick={() => setTempSelectedObjective('personalizado')}
                        className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${isSelected
                          ? 'border-[#059669] bg-slate-50/20 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                          }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 bg-purple-500" />
                        <div className="flex-1 pr-6">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-slate-800">Personalizado</p>
                            {isActual && (
                              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-100/50 tracking-wider uppercase">
                                Actual
                              </span>
                            )}
                            <span className="bg-purple-50 text-purple-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-purple-100/50 tracking-wider uppercase">
                              Personalizable
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-400 leading-normal mt-1">Configura un objetivo a medida con tu propia metodología</p>
                        </div>

                        {isSelected && (
                          <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-[#059669]/10 text-[#059669] flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100/50">
                <button
                  type="button"
                  onClick={() => setShowChangeObjectiveModal(false)}
                  className="px-6 py-2.5 border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={tempSelectedObjective === activeDetailAgent.objetivo}
                  onClick={() => setShowObjectiveOverwriteWarning(true)}
                  className={`px-6 py-2.5 rounded-full text-xs font-black transition-all shadow-md active:scale-95 text-center border-none ${tempSelectedObjective === activeDetailAgent.objetivo
                    ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none'
                    : 'bg-[#059669] hover:bg-emerald-700 text-white cursor-pointer'
                    }`}
                >
                  Aplicar cambio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMAR SOBRESCRITURA DE ROL/REGLAS AL CAMBIAR OBJETIVO */}
      <AnimatePresence>
        {showObjectiveOverwriteWarning && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-[420px] rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <h3 className="text-base font-black text-slate-800 mb-1.5">
                ¿Cambiar el objetivo del asistente?
              </h3>
              <p className="text-xs text-slate-400 font-semibold mb-7">
                Esto reemplazará el <span className="font-black text-slate-600">Rol</span> y las <span className="font-black text-slate-600">Reglas</span> que tienes configuradas ahora mismo por una plantilla genérica del nuevo objetivo. Se perderá todo el texto personalizado que hayas escrito. Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowObjectiveOverwriteWarning(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const industryTemplate = TEMPLATES.find(t => t.id === activeDetailAgent.industria);
                    const objectiveTemplate = OBJECTIVES.find(o => o.id === tempSelectedObjective);

                    let baseInstructions = industryTemplate ? industryTemplate.instructions : 'Eres un asistente virtual de atención al cliente.';
                    let basePersonality = industryTemplate ? industryTemplate.personality : 'Educado, rápido, cordial y servicial.';
                    let objectiveInstructions = objectiveTemplate ? `Tu objetivo principal es: ${objectiveTemplate.title}. ${objectiveTemplate.description}.` : '';
                    const finalInstructions = `${baseInstructions}\n\n${objectiveInstructions}`.trim();

                    const updated = {
                      ...activeDetailAgent,
                      objetivo: tempSelectedObjective,
                      instrucciones: finalInstructions,
                      personalidad: basePersonality
                    };
                    setActiveDetailAgent(updated);
                    handleSaveDetailSettings(updated, false);
                    setShowObjectiveOverwriteWarning(false);
                    setShowChangeObjectiveModal(false);
                    showNotification("Objetivo e instrucciones actualizados con éxito.");
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-black transition-all shadow-md active:scale-95"
                >
                  Sí, reemplazar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDITAR INSTRUCCIONES DEL ASISTENTE */}
      <AnimatePresence>
        {showEditInstructionsModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#f4f4f5] w-full max-w-[850px] rounded-[2rem] shadow-2xl flex flex-col relative p-8 text-left overflow-hidden h-[90vh]"
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowEditInstructionsModal(false)}
                className="absolute top-6 right-6 border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer bg-white shadow-sm"
              >
                <X size={14} />
              </button>

              {/* Encabezado */}
              <div className="mb-6 text-center select-none shrink-0">
                <h3 className="text-base font-sans font-black text-slate-800">Editar Instrucciones</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Define quién es el asistente y cómo debe comportarse
                </p>
              </div>

              {/* Contenido Split-Pane */}
              <div className="flex-1 flex gap-6 min-h-0 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm overflow-hidden">

                {/* Lado Izquierdo: Vista previa */}
                <div className="w-2/5 border-r border-slate-100 pr-6 flex flex-col min-h-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 select-none">Vista previa compilada</p>

                  <div className="flex-1 bg-slate-50 rounded-2xl p-5 overflow-y-auto text-xs font-semibold text-slate-500 leading-relaxed pr-3 space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider mb-1">Tu rol es:</p>
                      <p className="bg-white/80 border border-slate-100/50 rounded-xl p-2.5 font-medium text-slate-600">
                        {tempInstRol || `Eres el asistente virtual de ${tempInstName || 'el negocio'}.`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider mb-1">Contexto del negocio:</p>
                      <p className="bg-white/80 border border-slate-100/50 rounded-xl p-2.5 font-medium text-slate-600">
                        {tempInstNegocio || 'Sin información comercial asignada.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider mb-1">Instrucciones / Reglas:</p>
                      <p className="bg-white/80 border border-slate-100/50 rounded-xl p-2.5 font-medium text-slate-600 whitespace-pre-line">
                        {tempInstReglas || 'Sin reglas de conversación especéficas.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lado Derecho: Editor con Pestañas */}
                <div className="flex-1 pl-2 flex flex-col min-h-0">
                  {/* Nombre del Asistente (Input Superior) */}
                  <div className="mb-4 space-y-1.5 shrink-0">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nombre del negocio</label>
                    <input
                      type="text"
                      value={tempInstName}
                      onChange={(e) => setTempInstName(e.target.value)}
                      placeholder="Ej: Restaurante el buen sabor"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm"
                    />
                  </div>

                  {/* Barra de Sub-pestañas */}
                  <div className="flex gap-2 border-b border-slate-100 mb-4 shrink-0">
                    {[
                      { id: 'rol', label: 'Rol', icon: <Smile size={16} /> },
                      { id: 'negocio', label: 'Negocio', icon: <Database size={16} /> },
                      { id: 'reglas', label: 'Reglas', icon: <Shield size={16} /> }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEditInstTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${editInstTab === tab.id
                          ? 'border-[#059669] text-[#059669]'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Editores según pestañaa activa */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    {editInstTab === 'rol' ? (
                      <div className="space-y-1.5 flex-1 flex flex-col">
                        <div className="flex justify-between items-center select-none">
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-xs font-bold text-slate-800">Rol</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Define quién es el asistente y cómo debe comportarse</p>
                          </div>
                          <button
                            type="button"
                            disabled={isOptimizingPrompt}
                            onClick={() => handleOptimizePrompt('rol')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/70 text-[#059669] text-[10px] font-black uppercase tracking-wider rounded-full transition-all active:scale-95 disabled:opacity-50 select-none cursor-pointer"
                          >
                            <Sparkles size={11} className={isOptimizingPrompt ? "animate-spin" : ""} />
                            {isOptimizingPrompt ? 'Optimizando...' : 'Pulir con IA'}
                          </button>
                        </div>
                        <textarea
                          value={tempInstRol}
                          onChange={(e) => setTempInstRol(e.target.value)}
                          placeholder="Ej: Eres el asistente virtual de Restaurante el buen sabor..."
                          className="flex-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                        />
                      </div>
                    ) : editInstTab === 'negocio' ? (
                      <div className="space-y-1.5 flex-1 flex flex-col">
                        <div className="flex justify-between items-center select-none">
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-xs font-bold text-slate-800">Información del negocio</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">El contexto comercial que el asistente usa para responder</p>
                          </div>
                          <button
                            type="button"
                            disabled={isOptimizingPrompt}
                            onClick={() => handleOptimizePrompt('negocio')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/70 text-[#059669] text-[10px] font-black uppercase tracking-wider rounded-full transition-all active:scale-95 disabled:opacity-50 select-none cursor-pointer"
                          >
                            <Sparkles size={11} className={isOptimizingPrompt ? "animate-spin" : ""} />
                            {isOptimizingPrompt ? 'Optimizando...' : 'Pulir con IA'}
                          </button>
                        </div>
                        <textarea
                          value={tempInstNegocio}
                          onChange={(e) => setTempInstNegocio(e.target.value)}
                          placeholder="Ej: Horarios de atención, dirección, servicios ofrecidos..."
                          className="flex-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex-1 flex flex-col">
                        <div className="flex justify-between items-center select-none">
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-xs font-bold text-slate-800">Reglas de conversación</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Instrucciones y restricciones específicas de comportamiento</p>
                          </div>
                          <button
                            type="button"
                            disabled={isOptimizingPrompt}
                            onClick={() => handleOptimizePrompt('reglas')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/70 text-[#059669] text-[10px] font-black uppercase tracking-wider rounded-full transition-all active:scale-95 disabled:opacity-50 select-none cursor-pointer"
                          >
                            <Sparkles size={11} className={isOptimizingPrompt ? "animate-spin" : ""} />
                            {isOptimizingPrompt ? 'Optimizando...' : 'Pulir con IA'}
                          </button>
                        </div>
                        <textarea
                          value={tempInstReglas}
                          onChange={(e) => setTempInstReglas(e.target.value)}
                          placeholder="Ej: Responder siempre con emojis, no mencionar la competencia..."
                          className="flex-1 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditInstructionsModal(false)}
                  className="px-6 py-2.5 border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...activeDetailAgent,
                      nombre: tempInstName.trim(),
                      personalidad: tempInstRol.trim(),
                      descripcion_negocio: tempInstNegocio.trim(),
                      instrucciones: tempInstReglas.trim()
                    };
                    setActiveDetailAgent(updated);
                    handleSaveDetailSettings(updated, false);
                    setShowEditInstructionsModal(false);
                    showNotification("Instrucciones actualizadas con éxito.");
                  }}
                  className="px-6 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white rounded-full text-xs font-black transition-all shadow-md active:scale-95 text-center cursor-pointer border-none"
                >
                  Guardar cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER PROBAR ASISTENTE */}
      <AnimatePresence>
        {showTestDrawer && (
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/10 backdrop-blur-[1px]" onClick={() => setShowTestDrawer(false)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl border-l border-slate-100 z-[120] flex flex-col"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Target size={18} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Probar Asistente</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Simula una conversación con texto, imagen o audio</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTestDrawer(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 flex flex-col min-h-0">
                {!activeDetailAgent ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 my-auto">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4 shadow-inner">
                      <Bot size={32} />
                    </div>
                    <h4 className="text-sm font-black text-slate-700">Ningún superagente seleccionado</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-2 leading-relaxed max-w-[240px]">
                      Por favor, selecciona un superagente desde la configuración para simular una conversación.
                    </p>
                  </div>
                ) : testMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 my-auto">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4 shadow-inner">
                      <Bot size={32} />
                    </div>
                    <h4 className="text-sm font-black text-slate-700">Envía un mensaje para probar</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1">Soporta texto, imágenes y audio</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    {testMessages.map((msg, i) => (
                      <div key={i} className="flex flex-col animate-fade-in">
                        {msg.sender === 'system' ? (
                          <div className="mx-auto my-1.5 bg-slate-100/80 text-slate-500 text-[10px] font-black px-3.5 py-1.5 rounded-2xl text-center border border-slate-200/40 shadow-sm max-w-[85%] leading-relaxed">
                            {msg.text}
                          </div>
                        ) : (
                          <>
                            <div className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {msg.sender !== 'user' && (
                                <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shrink-0 mb-1.5 shadow-sm">
                                  <Bot size={13} className="text-white" />
                                </div>
                              )}
                              <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed shadow-sm ${msg.tipo === 'audio' ? 'min-w-[280px]' : ''
                                  } ${msg.sender === 'user'
                                    ? 'bg-[#059669] text-white rounded-br-none text-left'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none text-left'
                                  }`}
                              >
                                {msg.url_media && (
                                  <div className="mb-2 rounded-xl overflow-hidden bg-black/5 max-w-xs border border-slate-100">
                                    {msg.tipo === 'imagen' || msg.tipo === 'image' ? (
                                      <img
                                        src={getMediaUrl(msg.url_media)}
                                        alt="Imagen de prueba"
                                        className="w-full max-h-40 object-contain animate-fade-in"
                                      />
                                    ) : msg.tipo === 'video' ? (
                                      <video controls className="w-full max-h-40 block">
                                        <source src={getMediaUrl(msg.url_media)} type={msg.mime_media || 'video/mp4'} />
                                      </video>
                                    ) : msg.tipo === 'audio' ? (
                                      <div className="p-2 bg-slate-50 rounded-xl">
                                        <audio controls className={`w-full h-8 ${msg.sender === 'user' ? 'invert brightness-150 grayscale' : ''}`}>
                                          <source src={getMediaUrl(msg.url_media)} type={msg.mime_media || 'audio/ogg'} />
                                        </audio>
                                      </div>
                                    ) : (
                                      <a
                                        href={getMediaUrl(msg.url_media)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 flex items-center gap-2 hover:bg-slate-100/50 transition-colors text-emerald-600 no-underline"
                                      >
                                        <Paperclip size={14} />
                                        <span className="truncate text-[10px] font-bold">{msg.nombre_archivo || 'Documento'}</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                                {msg.text && msg.text.split('\n').map((line, li) => (
                                  <p key={li} className={li > 0 ? 'mt-1.5' : ''}>
                                    {renderRichText(line)}
                                  </p>
                                ))}
                              </div>
                              {msg.sender === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mb-1.5 shadow-sm">
                                  <span className="text-[10px] font-black text-slate-500">U</span>
                                </div>
                              )}
                            </div>

                            {/* Timestamp */}
                            <span className={`text-[9px] text-slate-400 font-bold mt-1 block ${msg.sender === 'user' ? 'text-right pr-9' : 'text-left pl-9'}`}>
                              {msg.time || getFormattedTime()}
                            </span>

                            {/* Quick reply button */}
                            {msg.quickReply && (
                              <div className="mt-2 flex justify-start pl-9">
                                <button
                                  type="button"
                                  onClick={() => sendTestMessageText(msg.quickReply)}
                                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-[10px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer border-none"
                                >
                                  {msg.quickReply}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}

                    {isTestTyping && (
                      <div className="flex items-end gap-2 justify-start">
                        <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                          <Bot size={13} className="text-white" />
                        </div>
                        <div className="bg-white border border-slate-100 text-slate-500 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
                          <span className="text-[10px] font-bold text-slate-400 animate-pulse">{activeDetailAgent?.nombre || 'Sofia'} está respondiendo</span>
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={testImageInputRef}
                accept="image/*"
                onChange={handleTestFileChange}
                className="hidden"
              />
              <input
                type="file"
                ref={testAudioInputRef}
                accept="audio/*"
                onChange={handleTestFileChange}
                className="hidden"
              />

              {/* Uploading loading indicator */}
              {testMediaUploadLoading && (
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2.5 shrink-0 animate-pulse">
                  <RefreshCw size={12} className="text-[#059669] animate-spin" />
                  <span className="text-[10px] font-bold text-slate-500">Subiendo archivo de prueba...</span>
                </div>
              )}

              {/* Preview attached file */}
              {testMediaFile && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 animate-fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    {testMediaFile.type === 'imagen' ? (
                      <img
                        src={testMediaFile.preview}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                      />
                    ) : testMediaFile.type === 'audio' ? (
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#059669] shrink-0">
                        <Mic size={16} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        <Paperclip size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-800 truncate">{testMediaFile.name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase">{testMediaFile.type}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestMediaFile(null)}
                    className="p-1 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-none outline-none cursor-pointer bg-transparent"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendTestMessage} className="p-4 border-t border-slate-100 bg-white">
                <div className="flex items-center gap-2 bg-white">
                  <button
                    type="button"
                    disabled={!activeDetailAgent || testMediaUploadLoading}
                    onClick={() => testImageInputRef.current?.click()}
                    className="w-11 h-11 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer bg-white"
                  >
                    <Image size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={!activeDetailAgent || testMediaUploadLoading}
                    onClick={() => testAudioInputRef.current?.click()}
                    className="w-11 h-11 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer bg-white"
                  >
                    <Mic size={18} />
                  </button>
                  <div className={`flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 ${!activeDetailAgent ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="text"
                      placeholder={activeDetailAgent ? "Escribe un mensaje de prueba" : "Selecciona un agente para probar..."}
                      value={testInput}
                      disabled={!activeDetailAgent}
                      onChange={(e) => setTestInput(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-slate-700 placeholder-slate-400 py-1.5 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!activeDetailAgent || (!testInput.trim() && !testMediaFile) || testMediaUploadLoading}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 border-none outline-none ${(activeDetailAgent && (testInput.trim() || testMediaFile) && !testMediaUploadLoading)
                      ? 'bg-[#059669] text-white hover:bg-emerald-700 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL ASISTENTE DE CONFIGURACION */}
      <AnimatePresence>
        {showAuditModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="px-8 py-5 flex justify-between items-center border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Bot size={18} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight leading-tight">Asistente de Configuración</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Configura y optimiza tu asistente</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {auditStep === 'chat' && (
                    <button
                      onClick={() => {
                        setAuditStep('landing');
                        setAuditMessages([]);
                      }}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors bg-transparent border-none py-1.5 px-3 mr-1"
                    >
                      <RefreshCw size={12} /> Nuevo chat
                    </button>
                  )}
                  <button
                    onClick={() => setShowAuditModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-xl shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex flex-col min-h-0 bg-slate-50/20">
                {auditStep === 'landing' ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6">
                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 mb-4 shadow-inner">
                      <Sparkles size={26} strokeWidth={1.5} />
                    </div>

                    <h4 className="text-sm font-black text-slate-800 text-center">Asistente de Configuración</h4>

                    {isGapsLoading ? (
                      <p className="text-xs text-slate-400 font-bold text-center mt-1 animate-pulse">
                        Analizando la configuración de tu superagente...
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 font-bold text-center mt-1">
                        {agentGaps.length === 1
                          ? "Encontró 1 sugerencia de configuración."
                          : `Encontró ${agentGaps.length} sugerencias de configuración.`}
                      </p>
                    )}

                    {isGapsLoading ? (
                      <div className="w-full max-w-lg space-y-3 mt-6">
                        <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl animate-pulse flex flex-col gap-2">
                          <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
                          <div className="h-3.5 w-full bg-slate-200 rounded"></div>
                          <div className="h-3 w-5/6 bg-slate-200 rounded"></div>
                        </div>
                        <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl animate-pulse flex flex-col gap-2">
                          <div className="h-3 w-1/3 bg-slate-200 rounded"></div>
                          <div className="h-3.5 w-full bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    ) : agentGaps.length === 0 ? (
                      <div className="w-full max-w-lg p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center mt-6">
                        <p className="text-xs text-slate-600 font-black leading-relaxed">
                          ¡Felicidades! 🎉 No encontró ningún problema de configuración. Tu superagente está completamente listo para producción.
                        </p>
                      </div>
                    ) : (
                      <div className="w-full max-w-lg space-y-3 mt-6 text-left overflow-y-auto max-h-[40vh] pr-1">
                        {agentGaps.map((gap, index) => (
                          <div key={index} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col text-left">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border ${gap.type === 'Faltante'
                                ? 'bg-red-50 text-red-500 border-red-100'
                                : gap.type === 'Recomendado'
                                  ? 'bg-amber-50 text-amber-500 border-amber-100'
                                  : 'bg-blue-50 text-blue-500 border-blue-100'
                                }`}>
                                {gap.type}
                              </span>
                              <span className="text-xs font-black text-slate-800">{gap.title}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                              {gap.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-8 max-w-lg">
                      <button
                        onClick={() => handleAuditAction('resolver')}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-full text-slate-600 font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
                      >
                        Resolver estos problemas
                      </button>
                      <button
                        onClick={() => handleAuditAction('analizar')}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-full text-slate-600 font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
                      >
                        Analizar mi superagente
                      </button>
                      <button
                        onClick={() => handleAuditAction('instrucciones')}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-full text-slate-600 font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
                      >
                        Revisar mis instrucciones
                      </button>
                      <button
                        onClick={() => handleAuditAction('mejoras')}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-full text-slate-600 font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
                      >
                        Sugerir mejoras
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between min-h-0 space-y-4">
                    <div className="flex-1 overflow-y-auto space-y-4" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
                      {auditMessages.map((msg, idx) => {
                        if (msg.isBanner) {
                          return (
                            <div key={idx} className="w-full flex flex-col items-start gap-1">
                              <div className="w-full max-w-[95%] flex items-start gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-800 shadow-sm text-left">
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-1.5" />
                                <span className="text-[11px] font-semibold leading-relaxed text-emerald-800">
                                  {msg.text}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold ml-1 mb-2">{msg.time}</span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[90%] px-5 py-4 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${msg.sender === 'user'
                                ? 'bg-[#059669] text-white rounded-br-none animate-fade-in text-left'
                                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none animate-fade-in text-left'
                                }`}
                            >
                              {msg.text.split('\n').map((line, li) => (
                                <p key={li} className={li > 0 ? 'mt-1.5' : ''}>
                                  {renderRichText(line)}
                                </p>
                              ))}
                            </div>

                            {/* Timestamp */}
                            <span className={`text-[9px] text-slate-400 font-bold mt-1 px-1 block ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                              {msg.time || getFormattedTime()}
                            </span>

                            {msg.isConfirmation && (
                              <div className="mt-3 flex gap-2 justify-start">
                                <button
                                  type="button"
                                  onClick={() => confirmAndApplyAuditChanges()}
                                  className="px-4 py-2 bg-slate-950 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold shadow-sm transition-all cursor-pointer border-none"
                                >
                                  Confirmar y aplicar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAuditMessages(prev => [
                                      ...prev.map(m => m.isConfirmation ? { ...m, isConfirmation: false } : m),
                                      { sender: 'assistant', text: 'Entendido. No he aplicado ningún cambio.', time: getFormattedTime() }
                                    ]);
                                  }}
                                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold shadow-sm transition-all cursor-pointer border-none"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}

                            {msg.appliedBanner && (
                              <div className="w-full max-w-[90%] mt-3 flex items-start gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-800 shadow-sm animate-fade-in text-left">
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-1.5" />
                                <span className="text-[11px] font-semibold leading-relaxed text-emerald-800">
                                  Cambios aplicados: meta, instrucciones, transfer_rule:Transferir a humano cuando el cliente mencione una solicitud especial, evento corporativo, queja, alergia alimentaria, o pida hablar con una persona del restaurante, follow_up:!Hola! ?? Soy {activeDetailAgent?.nombre || 'Sofía'}, de Sabor &amp; Brasa. �S
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2 justify-start pt-2 shrink-0 border-t border-slate-100/50">
                      <button
                        onClick={async () => {
                          setAuditMessages(prev => [...prev, { sender: 'user', text: 'Aplicar los cambios sugeridos', time: getFormattedTime() }]);
                          setIsApplyingAuditChanges(true);
                          try {
                            const token = getAuthToken();
                            const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/audit`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                action: 'resolver',
                                history: []
                              })
                            });
                            const data = await res.json();
                            setIsApplyingAuditChanges(false);
                            if (data.success) {
                              setAuditMessages(prev => [...prev, { sender: 'assistant', text: data.reply, time: getFormattedTime() }]);
                              fetchAgentsAndStats();
                              fetchAgentGaps();
                            } else {
                              setAuditMessages(prev => [...prev, { sender: 'assistant', text: `⚠️ Error: ${data.message}`, time: getFormattedTime() }]);
                            }
                          } catch (err) {
                            setIsApplyingAuditChanges(false);
                            console.error(err);
                            setAuditMessages(prev => [...prev, { sender: 'assistant', text: '⚠️ Error al conectar con el servidor.', time: getFormattedTime() }]);
                          }
                        }}
                        disabled={isApplyingAuditChanges}
                        className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-full text-slate-700 bg-white hover:bg-slate-50 font-bold text-[10px] shadow-sm transition-all disabled:opacity-60"
                      >
                        {isApplyingAuditChanges ? 'Aplicando...' : 'Aplicar los cambios sugeridos'}
                      </button>
                      <button
                        onClick={() => {
                          setAuditMessages(prev => [
                            ...prev,
                            { sender: 'user', text: 'Mostrar las instrucciones' },
                            { sender: 'assistant', text: `Instrucciones actuales de comportamiento para **${activeDetailAgent?.nombre}**:\n\n\`\`\`\n${activeDetailAgent?.instrucciones}\n\`\`\`` }
                          ]);
                        }}
                        className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-full text-slate-700 bg-white hover:bg-slate-50 font-bold text-[10px] shadow-sm transition-all"
                      >
                        Mostrar las instrucciones
                      </button>
                      <button
                        onClick={async () => {
                          setAuditMessages(prev => [...prev, { sender: 'user', text: 'Revisar el comportamiento', time: getFormattedTime() }]);
                          setIsApplyingAuditChanges(true);
                          try {
                            const token = getAuthToken();
                            const res = await fetch(`${API_URL}/api/agentes-ia/${activeDetailAgent.id}/audit`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                action: 'mejoras',
                                history: []
                              })
                            });
                            const data = await res.json();
                            setIsApplyingAuditChanges(false);
                            if (data.success) {
                              setAuditMessages(prev => [...prev, { sender: 'assistant', text: data.reply, time: getFormattedTime() }]);
                            } else {
                              setAuditMessages(prev => [...prev, { sender: 'assistant', text: `⚠️ Error: ${data.message}`, time: getFormattedTime() }]);
                            }
                          } catch (err) {
                            setIsApplyingAuditChanges(false);
                            console.error(err);
                            setAuditMessages(prev => [...prev, { sender: 'assistant', text: '⚠️ Error al conectar con el servidor.', time: getFormattedTime() }]);
                          }
                        }}
                        disabled={isApplyingAuditChanges}
                        className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-full text-slate-700 bg-white hover:bg-slate-50 font-bold text-[10px] shadow-sm transition-all disabled:opacity-60"
                      >
                        Revisar el comportamiento
                      </button>
                    </div>

                    <form onSubmit={handleSendAuditMessage} className="border-t border-slate-100 pt-4 shrink-0 bg-white flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-2">
                        <input
                          type="text"
                          placeholder="Escribe un mensaje..."
                          value={auditInput}
                          onChange={(e) => setAuditInput(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder-slate-400 py-1.5"
                        />
                        <button
                          type="submit"
                          disabled={!auditInput.trim()}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${auditInput.trim()
                            ? 'bg-slate-950 text-white hover:bg-slate-900'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                        >
                          <Send size={12} />
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold text-center mt-1">Shift + Enter para nueva línea</span>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL SUBIR RECURSO */}
      <AnimatePresence>
        {showUploadRecursoModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-[550px] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col relative p-8 text-left overflow-y-auto max-h-[90vh]"
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowUploadRecursoModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-all cursor-pointer border-none bg-transparent outline-none"
              >
                <X size={20} />
              </button>

              {/* Encabezado */}
              <div className="mb-6 text-center">
                <h3 className="text-base font-black text-slate-800">Subir Recurso</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Carga un archivo (imagen, audio o video) para entrenar el superagente
                </p>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                {/* Tipo de Recurso */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Tipo de Recurso <span className="text-[#059669]">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowRecursoTypeDropdown(!showRecursoTypeDropdown)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm flex items-center justify-between cursor-pointer text-left"
                    >
                      <span className="flex items-center gap-2">
                        {newRecursoType === 'Imagen' && <Image size={14} className="text-slate-500" />}
                        {newRecursoType === 'Documento' && <FileText size={14} className="text-slate-500" />}
                        {newRecursoType === 'Audio' && <Mic size={14} className="text-slate-500" />}
                        {newRecursoType === 'Video' && <Play size={14} className="text-slate-500" />}
                        <span>{newRecursoType}</span>
                      </span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </button>

                    {showRecursoTypeDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowRecursoTypeDropdown(false)}
                        />
                        <div className="absolute top-full mt-1.5 left-0 w-full bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 space-y-0.5 z-50">
                          {[
                            { id: 'Imagen', label: 'Imagen', icon: <Image size={14} className="text-slate-500" /> },
                            { id: 'Documento', label: 'Documento', icon: <FileText size={14} className="text-slate-500" /> },
                            { id: 'Audio', label: 'Audio', icon: <Mic size={14} className="text-slate-500" /> },
                            { id: 'Video', label: 'Video', icon: <Play size={14} className="text-slate-500" /> }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setNewRecursoType(opt.id);
                                setShowRecursoTypeDropdown(false);
                              }}
                              className="w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-all border-none bg-transparent outline-none text-left"
                            >
                              <span className="flex items-center gap-2">
                                {opt.icon}
                                <span>{opt.label}</span>
                              </span>
                              {newRecursoType === opt.id && (
                                <Check size={14} className="text-[#059669]" strokeWidth={3} />
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Zona de Arrastre de Archivo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Archivo <span className="text-[#059669]">*</span>
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={
                      newRecursoType === 'Imagen' ? 'image/jpeg,image/png,image/jpg' :
                        newRecursoType === 'Documento' ? 'application/pdf,.pdf,.doc,.docx,.txt,.csv' :
                          newRecursoType === 'Audio' ? 'audio/mp3,audio/wav,audio/mpeg,audio/ogg' :
                            'video/mp4,video/avi,video/quicktime,video/x-msvideo'
                    }
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedRecursoFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setSelectedRecursoFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-slate-200 hover:border-[#059669] rounded-3xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/30 hover:bg-slate-50/50 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100/50 flex items-center justify-center text-slate-400 border border-slate-100 mb-2">
                      {newRecursoType === 'Imagen' && <Image size={24} />}
                      {newRecursoType === 'Documento' && <FileText size={24} />}
                      {newRecursoType === 'Audio' && <Mic size={24} />}
                      {newRecursoType === 'Video' && <Play size={24} />}
                    </div>
                    {selectedRecursoFile ? (
                      <div className="space-y-1">
                        <p className="font-bold text-[#059669] text-xs">!Archivo seleccionado!</p>
                        <p className="text-xs text-slate-600 font-bold truncate max-w-xs">{selectedRecursoFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{(selectedRecursoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-slate-700 text-xs">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          Máximo 5MB • Formatos: {
                            newRecursoType === 'Imagen' ? 'jpg, jpeg, png' :
                              newRecursoType === 'Documento' ? 'pdf, doc, docx, txt, csv' :
                                newRecursoType === 'Audio' ? 'mp3, wav, ogg' :
                                  'mp4, avi, mov'
                          }
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Descripción */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Descripción
                  </label>
                  <textarea
                    rows={2.5}
                    value={newRecursoDesc}
                    onChange={(e) => setNewRecursoDesc(e.target.value)}
                    placeholder="Describe qué contiene este recurso..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                  />
                  <p className="text-[9px] text-slate-400 font-semibold">Texto descriptivo del contenido del recurso</p>
                </div>

                {/* Notas de Uso */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Notas de Uso
                  </label>
                  <textarea
                    rows={2.5}
                    value={newRecursoNotes}
                    onChange={(e) => setNewRecursoNotes(e.target.value)}
                    placeholder="Cuándo y cómo usar este recurso..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                  />
                  <p className="text-[9px] text-slate-400 font-semibold">Instrucciones sobre cuándo usar este recurso</p>
                </div>

                {/* Botón de Carga */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleUploadRecurso}
                    disabled={!selectedRecursoFile || isUploadingRecurso}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm border-none outline-none transition-all ${selectedRecursoFile && !isUploadingRecurso
                      ? 'bg-slate-950 hover:bg-slate-900 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed'
                      }`}
                  >
                    {isUploadingRecurso ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload size={12} />
                        Subir Recurso
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CARGAR DOCUMENTO */}
      <AnimatePresence>
        {showUploadDocModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#f4f4f5] w-full max-w-[550px] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col relative p-8 text-left overflow-y-auto max-h-[90vh]"
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowUploadDocModal(false)}
                className="absolute top-6 right-6 border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer bg-white shadow-sm animate-fade-in"
              >
                <X size={14} />
              </button>

              {/* Encabezado */}
              <div className="mb-6 text-center select-none">
                <h3 className="text-base font-black text-slate-800 font-sans">Cargar Documento</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Sube PDFs, archivos de Word o texto para entrenar el superagente
                </p>
              </div>

              {/* Contenedor Interior (White Card) */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-5">
                {/* Cabecera del Formulario */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-xs font-black text-slate-800">Cargar Documento</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                      Sube documentos para enriquecer la base de conocimiento del superagente
                    </p>
                  </div>

                  {/* Progreso del Almacenamiento */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>Almacenamiento usado</span>
                      <span>
                        {parseFloat(stats?.knowledge_base_mb || 0).toFixed(2)} MB de {
                          (dashboardData?.plan?.nombre || 'Starter') === 'Starter'
                            ? '1.0 MB'
                            : (dashboardData?.plan?.nombre || 'Starter') === 'Growth'
                              ? '10.0 MB'
                              : 'Ilimitado'
                        }
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (parseFloat(stats?.knowledge_base_mb || 0) / (
                              (dashboardData?.plan?.nombre || 'Starter') === 'Starter'
                                ? 1.0
                                : (dashboardData?.plan?.nombre || 'Starter') === 'Growth'
                                  ? 10.0
                                  : 999.0
                            )) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Zona de Carga de Archivo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Archivo <span className="text-[#059669]">*</span>
                  </label>
                  <input
                    type="file"
                    ref={docFileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedDocFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div
                    onClick={() => docFileInputRef.current && docFileInputRef.current.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setSelectedDocFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border border-dashed border-slate-350 hover:border-[#059669] rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-white cursor-pointer hover:bg-slate-50/20 transition-all select-none"
                  >
                    <Upload className="text-slate-400 mb-3" size={28} />
                    {selectedDocFile ? (
                      <div className="space-y-1">
                        <p className="font-bold text-[#059669] text-xs">!Documento seleccionado!</p>
                        <p className="text-xs text-slate-600 font-bold truncate max-w-xs">{selectedDocFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{(selectedDocFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-slate-700 text-xs">Arrastra y suelta tu archivo aquí</p>
                        <p className="text-xs text-slate-400 font-semibold mt-1.5">o haz clic para seleccionar</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-2.5">
                          PDF, DOCX, TXT, CSV, XLS, XLSX • Máximo {
                            (dashboardData?.plan?.nombre || 'Starter') === 'Starter'
                              ? '1MB'
                              : (dashboardData?.plan?.nombre || 'Starter') === 'Growth'
                                ? '10MB'
                                : '5MB'
                          }
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Botón de Carga */}
                <div className="pt-2">
                  <button
                    onClick={() => handleAddConocimiento('Doc', { titulo: selectedDocFile.name, file: selectedDocFile })}
                    disabled={!selectedDocFile || isAddingConocimiento}
                    className={`w-full py-3 font-black text-sm rounded-full flex items-center justify-center gap-2 border-none outline-none transition-all shadow-md active:scale-95 ${selectedDocFile && !isAddingConocimiento
                      ? 'bg-[#059669] hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-[#a1a1aa] text-white cursor-not-allowed shadow-none'
                      }`}
                  >
                    {isAddingConocimiento ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Subir Documento
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CREAR ENTRENAMIENTO */}
      <AnimatePresence>
        {showAddTextoModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#f4f4f5] w-full max-w-[550px] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col relative p-8 text-left overflow-y-auto max-h-[90vh]"
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowAddTextoModal(false)}
                className="absolute top-6 right-6 border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer bg-white shadow-sm"
              >
                <X size={14} />
              </button>

              {/* Encabezado */}
              <div className="mb-6 text-center select-none">
                <h3 className="text-base font-black text-slate-800 font-sans">Crear Entrenamiento</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Crea un nuevo bloque de entrenamiento para el superagente
                </p>
              </div>

              {/* Contenedor Interior */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-4">
                {/* Título */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Título <span className="text-[#059669]">*</span>
                  </label>
                  <input
                    type="text"
                    value={textoTitle}
                    onChange={(e) => setTextoTitle(e.target.value)}
                    placeholder="Ej: Política de Devoluciones"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm"
                  />
                </div>

                {/* Contenido */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Contenido <span className="text-[#059669]">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={textoContent}
                    onChange={(e) => setTextoContent(e.target.value)}
                    placeholder="Describe el contenido del entrenamiento..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    Para FAQ: incluye preguntas y respuestas. Para Texto: describe el contenido en detalle.
                  </p>
                </div>

                {/* Botón */}
                <div className="pt-2">
                  <button
                    onClick={() => handleAddConocimiento(activeKTab, { titulo: textoTitle, contenido: textoContent })}
                    disabled={!textoTitle.trim() || !textoContent.trim() || isAddingConocimiento}
                    className={`w-full py-3 font-black text-sm rounded-full flex items-center justify-center gap-2 border-none outline-none transition-all shadow-md active:scale-95 ${textoTitle.trim() && textoContent.trim() && !isAddingConocimiento
                      ? 'bg-[#059669] hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-[#a1a1aa] text-white cursor-not-allowed shadow-none'
                      }`}
                  >
                    {isAddingConocimiento ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Crear Entrenamiento'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL IMPORTAR DESDE URL */}
      <AnimatePresence>
        {showAddUrlModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#f4f4f5] w-full max-w-[550px] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col relative p-8 text-left overflow-y-auto max-h-[90vh]"
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowAddUrlModal(false)}
                className="absolute top-6 right-6 border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer bg-white shadow-sm"
              >
                <X size={14} />
              </button>

              {/* Encabezado */}
              <div className="mb-6 text-center select-none">
                <h3 className="text-base font-black text-slate-800 font-sans">Importar desde URL</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Proporciona una URL de sitio web para que el superagente aprenda de él
                </p>
              </div>

              {/* Contenedor Interior */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-5">
                {/* Segmented Control */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUrlImportType('pagina');
                      setWebPageUrl('https://tusitio.com/preguntas-frecuentes');
                    }}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all ${urlImportType === 'pagina'
                      ? 'border-slate-200 bg-[#f4f4f5]/80 shadow-inner'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                  >
                    <FileText size={16} className="text-slate-500 shrink-0 mt-1.5" />
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-bold text-slate-800">Una página</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1.5">Importa una sola página web</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUrlImportType('sitio');
                      setWebPageUrl('https://tusitio.com');
                    }}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all ${urlImportType === 'sitio'
                      ? 'border-slate-200 bg-[#f4f4f5]/80 shadow-inner'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                  >
                    <Globe size={16} className="text-slate-500 shrink-0 mt-1.5" />
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-bold text-slate-800">Sitio completo</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1.5">Importa varias páginas de tu sitio</p>
                    </div>
                  </button>
                </div>

                {/* Dirección URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    {urlImportType === 'pagina' ? 'Dirección de la página' : 'Dirección de tu sitio web'} <span className="text-[#059669]">*</span>
                  </label>
                  <input
                    type="text"
                    value={webPageUrl}
                    onChange={(e) => setWebPageUrl(e.target.value)}
                    placeholder={urlImportType === 'pagina' ? 'https://tusitio.com/preguntas-frecuentes' : 'https://tusitio.com'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    {urlImportType === 'pagina'
                      ? 'Pega la dirección completa de la página que quieres que tu asistente aprenda'
                      : 'Importaremos automáticamente las páginas públicas de tu sitio'}
                  </p>
                </div>

                {/* Cantidad de Páginas (solo para sitio completo) */}
                {urlImportType === 'sitio' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Cantidad máxima de páginas
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={webMaxPages}
                      onChange={(e) => setWebMaxPages(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                      Limita cuántas páginas importar (máximo 500)
                    </p>
                  </div>
                )}

                {/* Descripción (opcional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Descripción <span className="text-slate-400 font-medium">(opcional)</span>
                  </label>
                  <textarea
                    rows={2.5}
                    value={webDesc}
                    onChange={(e) => setWebDesc(e.target.value)}
                    placeholder={urlImportType === 'pagina'
                      ? 'Ej: Página de preguntas frecuentes sobre envíos y devoluciones'
                      : 'Ej: Sitio web de mi tienda con información de productos y políticas'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                  />
                </div>

                {/* Botón */}
                <div className="pt-2">
                  <button
                    onClick={() => handleAddConocimiento('Web', { titulo: webDesc.trim() || webPageUrl.trim(), url: webPageUrl.trim(), contenido: urlImportType === 'sitio' ? `Sitio completo (Máx: ${webMaxPages} págs)` : 'Página individual' })}
                    disabled={!webPageUrl.trim() || isAddingConocimiento}
                    className={`w-full py-3 font-black text-sm rounded-full flex items-center justify-center gap-2 border-none outline-none transition-all shadow-md active:scale-95 ${webPageUrl.trim() && !isAddingConocimiento
                      ? 'bg-[#059669] hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-[#a1a1aa] text-white cursor-not-allowed shadow-none'
                      }`}
                  >
                    {isAddingConocimiento ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        {urlImportType === 'pagina' ? 'Importar página' : 'Importar sitio web'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL IMPORTAR VIDEO DE YOUTUBE */}
      <AnimatePresence>
        {showAddVideoModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#f4f4f5] w-full max-w-[550px] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col relative p-8 text-left overflow-y-auto max-h-[90vh]"
            >
              {/* Botón Cerrar */}
              <button
                onClick={() => setShowAddVideoModal(false)}
                className="absolute top-6 right-6 border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer bg-white shadow-sm"
              >
                <X size={14} />
              </button>

              {/* Encabezado */}
              <div className="mb-6 text-center select-none">
                <h3 className="text-base font-black text-slate-800 font-sans">Importar Video de YouTube</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Proporciona un enlace de YouTube para que el superagente aprenda de la transcripción
                </p>
              </div>

              {/* Contenedor Interior */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-4">
                {/* URL de YouTube */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    URL de YouTube <span className="text-[#059669]">*</span>
                  </label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                    Copia el enlace del video de YouTube que deseas procesar
                  </p>
                </div>

                {/* Idioma del Video Custom Dropdown */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Idioma del Video
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVideoLanguageDropdown(!showVideoLanguageDropdown)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm flex items-center justify-between cursor-pointer text-left"
                  >
                    <span>{videoLanguage}</span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {showVideoLanguageDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowVideoLanguageDropdown(false)}
                      />
                      <div className="absolute top-full mt-1.5 left-0 w-full bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 space-y-0.5 z-50">
                        {['Español', 'Inglés', 'Francés', 'Alemán', 'Portugués'].map(lang => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              setVideoLanguage(lang);
                              setShowVideoLanguageDropdown(false);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-all border-none bg-transparent outline-none text-left"
                          >
                            <span>{lang}</span>
                            {videoLanguage === lang && (
                              <Check size={14} className="text-[#059669]" strokeWidth={3} />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Descripción */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={videoDesc}
                    onChange={(e) => setVideoDesc(e.target.value)}
                    placeholder="Describe el contenido del video para categorización..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                    Opcional: Ayuda a categorizar el contenido del video
                  </p>
                </div>

                {/* Botón */}
                <div className="pt-2">
                  <button
                    onClick={() => handleAddConocimiento('Videos', { titulo: videoDesc.trim() || 'Video de YouTube', url: videoUrl.trim(), contenido: `Idioma: ${videoLanguage}` })}
                    disabled={!videoUrl.trim() || isAddingConocimiento}
                    className={`w-full py-3 font-black text-sm rounded-full flex items-center justify-center gap-2 border-none outline-none transition-all shadow-md active:scale-95 ${videoUrl.trim() && !isAddingConocimiento
                      ? 'bg-[#059669] hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-[#a1a1aa] text-white cursor-not-allowed shadow-none'
                      }`}
                  >
                    {isAddingConocimiento ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        Agregar Video
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ELIMINAR REGLA */}
      <AnimatePresence>
        {showDeleteRuleModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-[380px] rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <h3 className="text-base font-black text-slate-800 mb-1.5">
                {ruleToDeleteType === 'etiquetado' ? '¿Eliminar regla de etiquetado?' : '¿Eliminar regla de transferencia?'}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mb-7">
                Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteRuleModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (ruleToDeleteType === 'etiquetado') {
                      const next = labelRules.filter(r => r.id !== ruleToDeleteId);
                      setLabelRules(next);
                      saveAgentConfigurations({ labelRules: next });
                    } else {
                      const next = transferRules.filter(r => r.id !== ruleToDeleteId);
                      setTransferRules(next);
                      saveAgentConfigurations({ transferRules: next });
                    }
                    setShowDeleteRuleModal(false);
                    setRuleToDeleteId(null);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-black transition-all shadow-md active:scale-95"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIGURAR HORARIOS DE ATENCION */}
      <AnimatePresence>
        {showWorkingHoursModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-7 text-left flex flex-col max-h-[90vh]"
            >
              <div className="mb-4">
                <h3 className="text-base font-black text-slate-800">Horarios de atención</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1.5">
                  Configura los días y horas en los que tu superagente puede coordinar citas.
                </p>
              </div>

              {/* List of Days */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-2">
                {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dayKey => {
                  const dayData = calWorkingHours[dayKey] || { active: false, start: '09:00', end: '18:00' };
                  const capitalizedDay = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);

                  // Pre-generate hours from 00:00 to 23:30
                  const hoursList = Array.from({ length: 48 }, (_, idx) => {
                    const h = String(Math.floor(idx / 2)).padStart(2, '0');
                    const m = idx % 2 === 0 ? '00' : '30';
                    return `${h}:${m}`;
                  });

                  return (
                    <div key={dayKey} className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => {
                            setCalWorkingHours(prev => ({
                              ...prev,
                              [dayKey]: { ...dayData, active: !dayData.active }
                            }));
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${dayData.active ? 'bg-[#059669]' : 'bg-slate-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${dayData.active ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                        <span className="text-xs font-black text-slate-700 w-20">{capitalizedDay}</span>
                      </div>

                      {dayData.active ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Desde</span>
                          <select
                            value={dayData.start}
                            onChange={e => {
                              const val = e.target.value;
                              setCalWorkingHours(prev => ({
                                ...prev,
                                [dayKey]: { ...dayData, start: val }
                              }));
                            }}
                            className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-50 focus:border-[#059669]"
                          >
                            {hoursList.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>

                          <span className="text-[10px] text-slate-400 font-bold uppercase">Hasta</span>
                          <select
                            value={dayData.end}
                            onChange={e => {
                              const val = e.target.value;
                              setCalWorkingHours(prev => ({
                                ...prev,
                                [dayKey]: { ...dayData, end: val }
                              }));
                            }}
                            className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-50 focus:border-[#059669]"
                          >
                            {hoursList.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">No disponible</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-3">
                <button
                  type="button"
                  onClick={() => setShowWorkingHoursModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-full text-xs font-black text-slate-500 hover:bg-slate-50 transition-all text-center bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveAgentConfigurations({ calWorkingHours });
                    setShowWorkingHoursModal(false);
                    showNotification("Horarios de atención actualizados con éxito.");
                  }}
                  className="flex-1 py-3 bg-[#059669] hover:bg-emerald-700 text-white rounded-full text-xs font-black transition-all shadow-md active:scale-95 text-center cursor-pointer border-none"
                >
                  Guardar horarios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL SERVICIOS Y DURACION */}
      <AnimatePresence>
        {showServiciosModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-7 text-left flex flex-col max-h-[90vh]"
            >
              <div className="mb-4">
                <h3 className="text-base font-black text-slate-800">Servicios y duración</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1.5">
                  Define cada servicio que ofreces y cuánto se demora, para que el asistente agende cada cita con la duración real (y no ofrezca un espacio muy corto para un servicio largo).
                </p>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 my-2">
                {calServicios.length === 0 && (
                  <p className="text-xs text-slate-400 font-semibold italic text-center py-6">
                    Aún no has agregado ningún servicio. Agrega el primero abajo.
                  </p>
                )}
                {calServicios.map((servicio, idx) => (
                  <div key={servicio.id} className="flex items-center gap-2 p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <input
                      type="text"
                      value={servicio.nombre}
                      onChange={e => {
                        const val = e.target.value;
                        setCalServicios(prev => prev.map((s, i) => i === idx ? { ...s, nombre: val } : s));
                      }}
                      placeholder="Ej: Limpieza dental"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300"
                    />
                    <input
                      type="number"
                      min="1"
                      value={servicio.duracionMinutos}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setCalServicios(prev => prev.map((s, i) => i === idx ? { ...s, duracionMinutos: val } : s));
                      }}
                      placeholder="60"
                      className="w-20 shrink-0 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300"
                    />
                    <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">min</span>
                    <button
                      type="button"
                      onClick={() => setCalServicios(prev => prev.filter((_, i) => i !== idx))}
                      className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all bg-transparent cursor-pointer border-none"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setCalServicios(prev => [...prev, { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, nombre: '', duracionMinutos: '' }])}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-xs font-black text-slate-400 hover:text-[#059669] hover:border-[#059669] transition-all bg-transparent cursor-pointer"
                >
                  <Plus size={14} /> Agregar servicio
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-3">
                <button
                  type="button"
                  onClick={() => setShowServiciosModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-full text-xs font-black text-slate-500 hover:bg-slate-50 transition-all text-center bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const limpio = calServicios
                      .map(s => ({ ...s, nombre: (s.nombre || '').trim(), duracionMinutos: parseInt(s.duracionMinutos, 10) || 0 }))
                      .filter(s => s.nombre && s.duracionMinutos > 0);
                    setCalServicios(limpio);
                    saveAgentConfigurations({ calServicios: limpio });
                    setShowServiciosModal(false);
                    showNotification("Servicios y duración actualizados con éxito.");
                  }}
                  className="flex-1 py-3 bg-[#059669] hover:bg-emerald-700 text-white rounded-full text-xs font-black transition-all shadow-md active:scale-95 text-center cursor-pointer border-none"
                >
                  Guardar servicios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL VINCULAR CUENTA DE CALENDARIO */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-[420px] rounded-[2rem] shadow-2xl p-7 text-left"
            >
              <div className="flex items-center gap-3.5 mb-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${connectModalType === 'Google Calendar' ? 'bg-emerald-50 text-[#059669]' : 'bg-[#006bff]/10 text-[#006bff]'}`}>
                  {connectModalType === 'Google Calendar' ? (
                    <span className="text-xl">???</span>
                  ) : (
                    <span className="text-lg font-black font-sans text-[#006bff]">C</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-black text-slate-800">Conectar {connectModalType}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Sincroniza la agenda de tu superagente</p>
                </div>
              </div>

              <div className="space-y-4 my-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Dirección de correo electrónico <span className="text-[#059669]">*</span></label>
                  <input
                    type="email"
                    value={tempConnectEmail}
                    onChange={e => setTempConnectEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-emerald-50 focus:border-[#059669] transition-all text-xs font-bold text-slate-700 shadow-sm"
                  />
                  <p className="text-[9px] text-slate-400 font-semibold">Ingresa la cuenta de correo asociada a tu {connectModalType}.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-full text-xs font-black text-slate-500 hover:bg-slate-50 transition-all text-center bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    if (!tempConnectEmail.trim()) {
                      showNotification("El correo electrónico no puede estar vacío.", "error");
                      return;
                    }
                    if (!emailRegex.test(tempConnectEmail.trim())) {
                      showNotification("Por favor ingresa un correo electrónico válido. Ej: usuario@empresa.com", "error");
                      return;
                    }
                    if (connectModalType === 'Google Calendar') {
                      setCalGoogleConnected(true);
                      setCalGoogleEmail(tempConnectEmail);
                      saveAgentConfigurations({ calGoogleConnected: true, calGoogleEmail: tempConnectEmail });
                      showNotification("Google Calendar conectado con éxito.");
                    } else {
                      setCalCalendlyConnected(true);
                      setCalCalendlyEmail(tempConnectEmail);
                      saveAgentConfigurations({ calCalendlyConnected: true, calCalendlyEmail: tempConnectEmail });
                      showNotification("Calendly conectado con éxito.");
                    }
                    setShowConnectModal(false);
                  }}
                  className="flex-1 py-3 bg-[#059669] hover:bg-emerald-700 text-white rounded-full text-xs font-black transition-all shadow-md active:scale-95 text-center cursor-pointer border-none"
                >
                  Vincular cuenta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Elegant Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 bg-white/95 backdrop-blur-md text-slate-800 px-5 py-4 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex items-center gap-3.5 z-[9999] border border-slate-150 transition-all duration-300">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-50 text-[#059669]' : 'bg-rose-50 text-rose-500'}`}>
            {toast.type === 'success' ? (
              <Check size={16} strokeWidth={3} className="text-[#059669]" />
            ) : (
              <span className="text-sm font-black font-sans">!</span>
            )}
          </div>
          <div className="text-left pr-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{toast.type === 'success' ? 'éxito' : 'Error'}</p>
            <p className="text-xs font-black text-slate-800 mt-1.5">{toast.message}</p>
          </div>
        </div>
      )}
    </div>

  );
};

export default AgentesIA;
