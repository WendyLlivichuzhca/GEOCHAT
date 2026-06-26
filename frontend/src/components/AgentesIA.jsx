// frontend/src/components/AgentesIA.jsx
import React, { useState, useEffect } from 'react';
import { 
  Bot, Plus, Search, ChevronDown, Check, Trash2, Edit2, Info,
  AlertCircle, Server, Database, Activity, Stethoscope, 
  Utensils, ShoppingBag, Home, Dumbbell, Sparkles, Briefcase, 
  GraduationCap, X, SlidersHorizontal, ArrowLeft, MoreHorizontal,
  ChevronRight, MessageSquare, BookOpen, Zap, Calendar,
  Mic, Image, Send, RefreshCw, CheckCircle2, Paperclip, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

// Plantillas de industrias
const TEMPLATES = [
  {
    id: 'restaurante',
    title: 'Restaurante',
    description: 'Perfecto para reservaciones, menú y horarios',
    icon: <Utensils size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres un recepcionista de un restaurante. Ayudas a los clientes a reservar mesas, explicas el menú de comidas y bebidas, indicas los precios y detallas los horarios de atención y la ubicación.',
    personality: 'Amigable, servicial, entusiasta y detallista con los antojos de los comensales.'
  },
  {
    id: 'clinica',
    title: 'Clínica / Consultorio',
    description: 'Ideal para agendar citas médicas',
    icon: <Stethoscope size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres un asistente médico para una clínica. Tu objetivo principal es ayudar a los pacientes a agendar, reprogramar o cancelar citas médicas. Proporcionas información sobre especialidades disponibles, doctores y horarios.',
    personality: 'Empático, paciente, profesional, calmado y muy organizado.'
  },
  {
    id: 'ecommerce',
    title: 'Tienda / E-commerce',
    description: 'Para ventas y atención al cliente',
    icon: <ShoppingBag size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres un agente de soporte de una tienda online. Ayudas a los clientes a encontrar productos en el catálogo, explicas los métodos de pago y de envío, y resuelves dudas comunes de postventa o estado de pedidos.',
    personality: 'Persuasivo, rápido, resolutivo y siempre orientado a concretar la venta.'
  },
  {
    id: 'inmobiliaria',
    title: 'Inmobiliaria',
    description: 'Para captar leads y agendar visitas',
    icon: <Home size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres un asesor inmobiliario virtual. Tu tarea es atender a personas interesadas en comprar, vender o alquilar inmuebles. Filtras el presupuesto, zonas de interés, captas sus datos de contacto y agendas visitas a propiedades.',
    personality: 'Formal, persuasivo, conocedor y generador de confianza.'
  },
  {
    id: 'gimnasio',
    title: 'Gimnasio / Fitness',
    description: 'Para membresías y clases',
    icon: <Dumbbell size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres el asistente virtual de un gimnasio. Brindas detalles sobre planes de membresía, precios, promociones vigentes, horarios de clases grupales y reservas con entrenadores personales.',
    personality: 'Energético, motivador, saludable y muy claro al explicar las reglas del club.'
  },
  {
    id: 'belleza',
    title: 'Salón de Belleza / Spa',
    description: 'Para citas y servicios de belleza',
    icon: <Sparkles size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres el asistente de recepción de un salón de belleza y spa. Agendas citas para cortes, tinte, manicura, masajes y faciales. Recomiendas combos especiales y das consejos rápidos de cuidado personal.',
    personality: 'Cálido, elegante, conversador y atento a las preferencias estéticas del cliente.'
  },
  {
    id: 'servicios',
    title: 'Servicios Profesionales',
    description: 'Abogados, contadores, consultores',
    icon: <Briefcase size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres el asistente de un despacho de servicios profesionales. Filtras las consultas iniciales de clientes potenciales, explicas el alcance general de las asesorías y programas videollamadas de diagnóstico técnico.',
    personality: 'Muy profesional, discreto, preciso y estructurado.'
  },
  {
    id: 'academia',
    title: 'Escuela / Academia',
    description: 'Para inscripciones y cursos',
    icon: <GraduationCap size={20} className="text-slate-600" />,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-100',
    instructions: 'Eres el asistente virtual de una escuela o academia. Brindas información sobre cursos disponibles, costos de inscripción, requisitos de admisión y horarios de clases.',
    personality: 'Paciente, formal, motivador y muy informativo.'
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
    color: 'bg-indigo-500',
    borderColor: 'border-indigo-500',
    dotColor: '#6366f1'
  },
  {
    id: 'ventas',
    title: 'Ventas',
    description: 'Usa SPIN Selling, gatillos mentales (escasez, urgencia) y técnicas de cierre avanzadas',
    color: 'bg-orange-500',
    borderColor: 'border-orange-500',
    dotColor: '#f97316'
  }
];

const AgentesIA = ({ user, onLogout }) => {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({ total: 0, activos: 0, knowledge_base_mb: 0.0 });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDesignBanner, setShowNewDesignBanner] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos'); // Todos, Activos, Inactivos
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    nombre: true,
    descripcion: true,
    estado: true
  });
  
  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Simulador de Pruebas (Probar Asistente)
  const [showTestDrawer, setShowTestDrawer] = useState(false);
  const [testMessages, setTestMessages] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [isTestTyping, setIsTestTyping] = useState(false);

  // Tab Conversación — Pasos de Captura
  const [convSubTab, setConvSubTab] = useState('Pasos');
  const [captureSteps, setCaptureSteps] = useState([
    { id: 1, text: 'Solicita el nombre del cliente de forma natural y cálida', field: null, enabled: true },
    { id: 2, text: 'Pregunta el número de teléfono para confirmar la reservación', field: null, enabled: true }
  ]);
  const [skipExistingData, setSkipExistingData] = useState(false);
  const [quickActions, setQuickActions] = useState({ nombre: true, email: false });
  const [openFieldDropdownId, setOpenFieldDropdownId] = useState(null);

  // Tab Conversación — Seguimientos
  const [followUpMessages, setFollowUpMessages] = useState([
    { id: 1, text: '¡Hola! 😊 Soy Sofía, de Sabor & Brasa. ¿Sigues por ahí? Estoy lista para ayudarte a reservar tu mesa. ¡Te esperamos con los mejores cortes y una experiencia única! 🍽️', time: 30, unit: 'min' }
  ]);
  const [inactivityTimeout, setInactivityTimeout] = useState(30);
  const [inactivityUnit, setInactivityUnit] = useState('minutos');

  // Tab Conversación — Voz
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Sarah - Mature, Reassuring, Confident');
  const [voicePercentage, setVoicePercentage] = useState(50);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);

  // Tab Conversación — Comportamiento
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
  const ALL_TIMEZONES = {
    'África': ['Abidjan (GMT)', 'Accra (GMT)', 'Addis Ababa (GMT+3)', 'Algiers (GMT+1)', 'Asmera (GMT+3)', 'Bamako (GMT)', 'Bangui (GMT+1)', 'Banjul (GMT)', 'Bissau (GMT)', 'Cairo (GMT+2)', 'Lagos (GMT+1)', 'Nairobi (GMT+3)'],
    'América': ['Bogota (GMT-5)', 'Buenos Aires (GMT-3)', 'Caracas (GMT-4)', 'Chicago (GMT-6)', 'Ciudad de México (GMT-6)', 'Lima (GMT-5)', 'New York (GMT-5)', 'Santiago (GMT-4)', 'São Paulo (GMT-3)'],
    'Europa': ['Amsterdam (GMT+2)', 'Berlin (GMT+2)', 'London (GMT+1)', 'Madrid (GMT+2)', 'Paris (GMT+2)', 'Rome (GMT+2)'],
    'Asia': ['Dubai (GMT+4)', 'Hong Kong (GMT+8)', 'Mumbai (GMT+5:30)', 'Shanghai (GMT+8)', 'Tokyo (GMT+9)'],
  };

  // Tab Conversación — Calendario
  const [calendarName, setCalendarName] = useState('Sofía - Calendario');
  const [calendarDesc, setCalendarDesc] = useState('');
  const [calTab, setCalTab] = useState('Agendas');
  const [calProvider, setCalProvider] = useState('Google Calendar');
  const [calGoogleMeet, setCalGoogleMeet] = useState(false);
  const [calConsultarHorarios, setCalConsultarHorarios] = useState(true);
  const [calAsunto, setCalAsunto] = useState('Reunion con {name}');
  const [calComApiKey, setCalComApiKey] = useState('');
  const [calComEventId, setCalComEventId] = useState('12345');
  
  // Form de creación (Pasos)
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
      const devicesRes = await fetch(`${API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const devicesData = await devicesRes.json();
      if (Array.isArray(devicesData)) {
        setDevices(devicesData);
      } else if (devicesData.success && Array.isArray(devicesData.data)) {
        setDevices(devicesData.data);
      } else {
        // Fallback si retorna otro formato
        setDevices([]);
      }
    } catch (err) {
      console.error('Error al cargar agentes o estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentsAndStats();
  }, []);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert("Por favor escribe un nombre para tu superagente.");
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
      } else {
        alert(res.message || "Error al crear el superagente.");
      }
    } catch (err) {
      console.error(err);
      alert("Error en la conexión con el servidor.");
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
          dispositivo_id: targetAgent.dispositivo_id
        })
      });
      const res = await response.json();
      if (res.success) {
        if (!isAuto) {
          alert("Configuración guardada con éxito.");
        }
        fetchAgentsAndStats();
      } else {
        if (!isAuto) {
          alert(res.message || "Error al guardar la configuración.");
        }
      }
    } catch (err) {
      console.error(err);
      if (!isAuto) {
        alert("Error de conexión al guardar.");
      }
    }
  };

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

  // Renderizar texto enriquecido en los chats (negritas, {{variables}}, emojis)
  const renderRichText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*|\{\{[^}]+\}\}|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('{{') && part.endsWith('}}')) {
        return <code key={i} className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-[10px] font-mono font-bold">{part}</code>;
      } else if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px] font-mono">{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const applyAuditChanges = async () => {
    if (!activeDetailAgent) return;
    setIsApplyingAuditChanges(true);

    // Añadir burbuja de usuario primero (simula click del usuario)
    setAuditMessages(prev => [
      ...prev,
      { sender: 'user', text: 'Aplicar los cambios sugeridos' }
    ]);

    // Mostrar confirmación de lo que se va a aplicar
    setTimeout(() => {
      setAuditMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Con gusto. Antes de aplicar todo, déjame confirmarte exactamente qué voy a cambiar para que no haya sorpresas:\n\n**Goal** ➜ Lo reemplazo por un objetivo claro de reservaciones\n**Instrucciones** ➜ Redacto un prompt completo con personalidad, tono y contexto del restaurante\n**Regla de transferencia** ➜ Creo una regla para escalar a humano en casos especiales\n**Seguimiento automático** ➜ Creo un mensaje de seguimiento a los 30 minutos\n\n⚠️ **Lo que NO puedo aplicar automáticamente:** La variable {{contact_name}} ya quedará incluida en las instrucciones que voy a generar — eso sí se aplica. Pero si quieres ajustar el mensaje de seguimiento o agregar más seguimientos después, puedes hacerlo desde el panel.\n\n¿Confirmas que aplique estos 4 cambios?`
        }
      ]);
    }, 800);

    let currentInst = activeDetailAgent.instrucciones || '';
    const agentName = activeDetailAgent.nombre || 'el asistente';
    const transferRule = `[Regla de transferencia] Transferir a humano cuando el cliente mencione una solicitud especial, evento corporativo, queja, alergia alimentaria, o pida hablar con una persona del restaurante.`;
    const followUpMsg = `¡Hola! 😊 Soy ${agentName}, de Sabor & Brasa. ¿Sigues ahí? Estoy lista para ayudarte a reservar tu mesa 🍽️`;
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
        
        setTimeout(() => {
          setAuditMessages(prev => [
            ...prev,
            { 
              sender: 'assistant', 
              text: `✅ ¡Listo! Apliqué los 4 cambios:\n\n**Goal** — ${agentName} ahora tiene un objetivo claro: confirmar reservaciones capturando nombre y teléfono.\n**Instrucciones** — El agente tiene personalidad, tono cálido, contexto completo del restaurante y sabe cómo manejar situaciones especiales. También usa el nombre del cliente automáticamente en la conversación.\n**Regla de transferencia** — Si un cliente menciona eventos, quejas, alergias o pide hablar con alguien, será transferido a un humano de inmediato.\n**Seguimiento automático** — Si el cliente no responde, ${agentName} le enviará un recordatorio a los 30 minutos.\n\n¿Quieres ajustar algo del tono de las instrucciones, agregar más seguimientos o configurar algo adicional?\n\n**Cambios aplicados:**\nmeta, instrucciones, transfer_rule: Transferir a humano cuando el cliente mencione una solicitud especial, evento corporativo, queja, alergia alimentaria, o pida hablar con una persona del restaurante, follow_up: ${followUpMsg}`,
              appliedBanner: true 
            }
          ]);
        }, 1800);
        
        fetchAgentsAndStats();
      } else {
        alert("Error al aplicar cambios: " + res.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al aplicar los cambios.");
    } finally {
      setIsApplyingAuditChanges(false);
    }
  };

  const handleAuditAction = (action) => {
    setAuditStep('chat');
    if (action === 'resolver') {
      setAuditMessages([
        { 
          sender: 'assistant', 
          text: `Encontré **2 problemas** de configuración en **${activeDetailAgent?.nombre}**:

* **Faltante**: No hay reglas de transferencia — si el agente no puede resolver, no podrá escalar a un humano.
* **Faltante**: No hay seguimientos automáticos configurados para cuando el cliente deje de responder.

¿Confirmas que aplique estos cambios para corregir tu superagente?` 
        }
      ]);
    } else if (action === 'analizar') {
      setAuditMessages([
        { 
          sender: 'assistant', 
          text: `### Auditoría de Configuración para **${activeDetailAgent?.nombre}** 🔍

⚡ **Sugerencia:** Ve al menú lateral ➜ **Reglas de transferencia** ➜ **Añadir regla** ➜ crea una condición como: *"Cuando el cliente mencione un evento, queja, solicitud especial o pida hablar con alguien"* ➜ tipo de destino: **Humano**.

🟡 **Gap:** Sin seguimientos automáticos de inactividad. El agente tiene configurado solo el auto-cierre, pero no hay mensajes de seguimiento antes de cerrar.

⚡ **Sugerencia:** Ve al menú lateral ➜ **Seguimientos** ➜ **Añadir seguimiento** ➜ configura al menos uno (ej. a los 30 minutos con un mensaje como: *"¡Hola! ¿Sigues por ahí? Estoy listo para ayudarte a reservar tu mesa 🍽️"*).

🔵 **Mejora:** El agente no usa personalización automática en los pasos de captura.
Los pasos de captura están bien configurados (nombre primero, luego teléfono ✅), pero una vez que el agente captura el nombre del cliente, podría usarlo automáticamente en los mensajes siguientes con la variable \`{{contact_name}}\`.

⚡ **Sugerencia:** Ve al menú lateral ➜ **Instrucciones** ➜ cuando redactes el prompt, incluye \`{{contact_name}}\` en frases como: *"Perfecto, {{contact_name}}, déjame revisar la disponibilidad para ti."*

Lo que sí está bien configurado ✅: el modelo **gpt-4** es una excelente elección para agendamiento, la temperatura de 0.3 es ideal para respuestas consistentes, y los pasos de captura están en el orden correcto.` 
        }
      ]);
    } else if (action === 'instrucciones') {
      setAuditMessages([
        { 
          sender: 'assistant', 
          text: `Revisé las instrucciones de comportamiento de **${activeDetailAgent?.nombre}**.

El tono es correcto, pero se puede mejorar la precisión de las respuestas incluyendo reglas específicas de negocio. ¿Deseas que te ayude a redactar una versión optimizada?` 
        }
      ]);
    } else if (action === 'mejoras') {
      setAuditMessages([
        { 
          sender: 'assistant', 
          text: `### Sugerencias de Optimización para **${activeDetailAgent?.nombre}** 🚀

1. Incorporar variables dinámicas como \`{{contact_name}}\` en los saludos.
2. Definir una instrucción explícita de fallback para derivar a humano ante dudas complejas.
3. Estructurar mejor el menú de opciones para que el usuario responda de manera más natural.

¿Quieres que redacte y aplique estas mejoras en las instrucciones?` 
        }
      ]);
    }
  };

  const handleSendAuditMessage = (e) => {
    e.preventDefault();
    if (!auditInput.trim()) return;
    
    const userText = auditInput.trim();
    setAuditMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setAuditInput('');
    
    setTimeout(() => {
      const textLower = userText.toLowerCase();
      let replyText = '';
      
      if (textLower.includes('aplicar') || textLower.includes('si') || textLower.includes('confirm') || textLower.includes('claro') || textLower.includes('de acuerdo') || textLower.includes('resolver')) {
        applyAuditChanges();
        return;
      } else if (textLower.includes('regla') || textLower.includes('transferir')) {
        replyText = `Las reglas de transferencia le permiten al agente escalar el chat a un asesor humano cuando se detecta frustración o peticiones de ayuda humana. ¿Quieres que lo configure?`;
      } else if (textLower.includes('seguimiento') || textLower.includes('inactivo')) {
        replyText = `El seguimiento de inactividad envía un recordatorio automático a los 30 minutos si el cliente deja de responder. ¿Deseas configurarlo?`;
      } else {
        replyText = `Puedo ayudarte a optimizar cualquier aspecto de tu superagente. Escribe *"aplicar cambios"* o haz clic en los botones para proceder.`;
      }
      
      setAuditMessages(prev => [...prev, { sender: 'assistant', text: replyText }]);
    }, 1000);
  };

  const handleSendTestMessage = (e) => {
    e.preventDefault();
    if (!testInput.trim() || !activeDetailAgent) return;
    
    const userText = testInput.trim();
    setTestMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setTestInput('');
    setIsTestTyping(true);
    
    setTimeout(() => {
      setIsTestTyping(false);
      let agentReply = '';
      const textLower = userText.toLowerCase();
      const bizDesc = (activeDetailAgent.descripcion_negocio || '').toLowerCase();
      const name = activeDetailAgent.nombre || 'Asistente';
      
      if (textLower.includes('hola') || textLower.includes('buenos') || textLower.includes('buenas') || textLower.includes('saludos')) {
        agentReply = `¡Hola! 😊 Soy **${name}**, tu asistente virtual. ¿En qué puedo ayudarte hoy?`;
      } else if (textLower.includes('ubicacion') || textLower.includes('donde') || textLower.includes('direccion') || textLower.includes('como llegar') || textLower.includes('calle')) {
        if (bizDesc.includes('calle') || bizDesc.includes('cuenca') || bizDesc.includes('ubicación')) {
          const lines = activeDetailAgent.descripcion_negocio.split('\n');
          const ubiLine = lines.find(l => l.toLowerCase().includes('ubicación') || l.toLowerCase().includes('calle') || l.toLowerCase().includes('cuenca'));
          agentReply = ubiLine ? ubiLine.replace(/"/g, '') : `Nuestra ubicación es: Calle Las Orquídeas 456, sector financiero, Cuenca.`;
        } else {
          agentReply = `Estamos ubicados en nuestra sucursal principal. ¿Te gustaría que te brinde detalles de cómo llegar?`;
        }
      } else if (textLower.includes('horario') || textLower.includes('abierto') || textLower.includes('horas') || textLower.includes('cierra')) {
        if (bizDesc.includes('horario') || bizDesc.includes('lunes a') || bizDesc.includes('12:00')) {
          const lines = activeDetailAgent.descripcion_negocio.split('\n');
          const horLine = lines.find(l => l.toLowerCase().includes('horario') || l.toLowerCase().includes('lunes a') || l.toLowerCase().includes('abierto'));
          agentReply = horLine ? horLine.replace(/"/g, '') : `Atendemos de lunes a jueves de 12:00 a 22:00. Viernes y sábados de 12:00 a 23:30. Domingos de 11:00 a 17:00.`;
        } else {
          agentReply = `Atendemos todos los días en horario comercial. ¿Qué día planeas visitarnos?`;
        }
      } else if (textLower.includes('reserva') || textLower.includes('cita') || textLower.includes('agendar') || textLower.includes('reservar')) {
        agentReply = `Con gusto. Para agendar, ¿me podrías indicar tu **nombre completo** y el **número de personas** o servicio que deseas reservar?`;
      } else if (textLower.includes('menu') || textLower.includes('carta') || textLower.includes('comida') || textLower.includes('plato') || textLower.includes('vino')) {
        agentReply = `Ofrecemos cocina fusión, cortes de carne premium a la parrilla, opciones veganas y una selecta carta de vinos. ¿Deseas reservar una mesa?`;
      } else if (textLower.includes('delivery') || textLower.includes('domicilio') || textLower.includes('entregar')) {
        agentReply = `Sí, realizamos delivery directo por WhatsApp y plataformas asociadas. ¿Deseas consultar nuestra carta de envíos?`;
      } else {
        agentReply = `Tomo nota de tu consulta. Como el asistente inteligente de **${name}**, responderé tus dudas basadas en nuestro negocio. ¿Deseas hacer alguna pregunta sobre nuestro menú, horarios, ubicación o agendar una cita?`;
      }
      
      setTestMessages(prev => [...prev, { sender: 'agent', text: agentReply }]);
    }, 1200);
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      industria: template.id,
      nombre: `Asistente ${template.title}`,
      instrucciones: template.instructions || '',
      personalidad: template.personality || '',
      descripcion_negocio: ''
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
      descripcion_negocio: ''
    }));
    setModalStep(2);
  };

  const handleSelectObjective = (objective) => {
    setFormData(prev => ({
      ...prev,
      objetivo: objective.id
    }));
  };

  const resetForm = () => {
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

  // Filtrado local
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

  const renderDetailView = () => {
    if (!activeDetailAgent) return null;
    
    // Calcular tamaño de la base de conocimiento localmente según caracteres
    const localSize = ((activeDetailAgent.instrucciones || '').length + (activeDetailAgent.personalidad || '').length);
    const sizeFormatted = localSize > 1024 ? `${(localSize / 1024).toFixed(1)} KB` : `${localSize} B`;

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Cabecera de Navegación Detalle */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setActiveDetailAgent(null);
                fetchAgentsAndStats();
              }}
              className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors flex items-center justify-center border border-slate-100 bg-white shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-black tracking-tight text-slate-800">Configurar Superagente</h1>
                <span className="bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Beta
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Personaliza el comportamiento y entrenamiento</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors p-2.5 hover:bg-slate-50 border border-transparent rounded-xl">
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Tarjetas Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 shrink-0">
          {/* Tarjeta de Agente y Estado */}
          <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              {/* Icono de robot en fondo oscuro con insignia de notificación roja "2" */}
              <div className="relative w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bot size={22} className="text-slate-100" />
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                  2
                </span>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  {isEditingDetailName ? (
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        value={detailNameValue}
                        onChange={(e) => setDetailNameValue(e.target.value)}
                        className="px-2.5 py-1 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-indigo-50"
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
                        onClick={() => {
                          setDetailNameValue(activeDetailAgent.nombre);
                          setIsEditingDetailName(true);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-all opacity-0 group-hover/name:opacity-100"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}
                  
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    activeDetailAgent.activo === 1 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {activeDetailAgent.activo === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                  Configura y entrena tu asistente
                </p>
              </div>
            </div>

            {/* Switch de activación a la derecha */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">Activo</span>
              <button
                onClick={handleToggleDetailActive}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  activeDetailAgent.activo === 1 ? 'bg-[#22c55e]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    activeDetailAgent.activo === 1 ? 'translate-x-5' : 'translate-x-0'
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
                <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  Business <Sparkles size={10} className="text-purple-500" />
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                Almacenamiento ilimitado
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeMenuTab === tab.id 
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-800 leading-tight">Configuración del Superagente</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Las instrucciones se generan automáticamente según el objetivo seleccionado
                  </p>
                </div>

                {/* Banner Informativo 1 */}
                <div className="flex gap-3 p-4 bg-blue-50/40 border border-blue-100/50 rounded-2xl text-blue-800">
                  <Info size={18} className="shrink-0 text-blue-500 mt-0.5" />
                  <p className="text-xs font-semibold leading-relaxed">
                    Tu asistente usa instrucciones optimizadas por el sistema. Solo necesitas describir tu negocio y agregar reglas específicas si las tienes.
                  </p>
                </div>

                {/* Selección del dispositivo vinculado */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                    Dispositivo de WhatsApp vinculado
                  </label>
                  <div className="relative">
                    <select
                      value={activeDetailAgent.dispositivo_id || ''}
                      onChange={(e) => {
                        const newId = parseInt(e.target.value);
                        setActiveDetailAgent(prev => {
                          const updated = { ...prev, dispositivo_id: newId };
                          handleSaveDetailSettings(updated, true);
                          return updated;
                        });
                      }}
                      className="w-full appearance-none px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all font-bold text-slate-700 text-sm cursor-pointer"
                    >
                      {devices.length === 0 ? (
                        <option value="">No hay terminales conectadas</option>
                      ) : (
                        devices.map(dev => (
                          <option key={dev.id} value={dev.id}>
                            {dev.nombre} ({dev.correo || 'WhatsApp'})
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>

                {/* Descripción del negocio */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                    Descripción del negocio
                  </label>
                  <textarea 
                    value={activeDetailAgent.descripcion_negocio || ''}
                    onChange={(e) => setActiveDetailAgent({ ...activeDetailAgent, descripcion_negocio: e.target.value })}
                    onBlur={() => handleSaveDetailSettings(activeDetailAgent, true)}
                    rows={6}
                    placeholder="Describe tu negocio, servicios, horarios, ubicación, etc."
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all font-bold text-slate-700 text-sm resize-none"
                  />
                  <p className="text-[11px] text-slate-400 font-bold mt-1">
                    El contexto del negocio que el asistente usa para responder
                  </p>
                </div>

                {/* Instrucciones del Superagente */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                    Instrucciones para el superagente
                  </label>
                  <textarea 
                    value={activeDetailAgent.instrucciones || ''}
                    onChange={(e) => setActiveDetailAgent({ ...activeDetailAgent, instrucciones: e.target.value })}
                    onBlur={() => handleSaveDetailSettings(activeDetailAgent, true)}
                    rows={8}
                    placeholder="Escribe las instrucciones and reglas específicas de comportamiento..."
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all font-bold text-slate-700 text-sm resize-none"
                  />
                </div>

                {/* Banner Informativo 2 */}
                <div className="flex gap-3 p-4 bg-blue-50/40 border border-blue-100/50 rounded-2xl text-blue-800">
                  <Info size={18} className="shrink-0 text-blue-500 mt-0.5" />
                  <p className="text-xs font-semibold leading-relaxed">
                    Cada instrucción debe llevar la conversación hacia el siguiente paso útil o brindar la información esperada por el usuario.
                  </p>
                </div>
              </div>
            ) : activeMenuTab === 'Conversacion' ? (
              <div className="space-y-0">
                {/* Sub-navegación */}
                <div className="flex gap-0 border-b border-slate-100 mb-6 -mx-6 px-6 overflow-x-auto">
                  {[
                    { id: 'Pasos', label: 'Pasos', icon: '📋' },
                    { id: 'Seguimientos', label: 'Seguimientos', icon: '⏰' },
                    { id: 'Voz', label: 'Voz', icon: '🎙️' },
                    { id: 'Comportamiento', label: 'Comportamiento del Superagente', icon: 'ℹ️' },
                    { id: 'Calendario', label: 'Calendario', icon: '📅' },
                    { id: 'Recursos', label: 'Recursos', icon: '📁' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setConvSubTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                        convSubTab === tab.id
                          ? 'border-[#6366f1] text-[#6366f1]'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <span>{tab.icon}</span> {tab.label}
                    </button>
                  ))}
                </div>

                {convSubTab === 'Pasos' ? (
                  <div className="space-y-4">
                    {/* Header Pasos de Captura */}
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-slate-400">📋</span>
                        <h3 className="text-sm font-black text-slate-800">Pasos de Captura ({captureSteps.length}/10)</h3>
                      </div>
                      <p className="text-[11px] text-[#6366f1] font-semibold">Define las instrucciones para recopilar información del contacto</p>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs">📋</span>
                        <span className="text-xs font-black text-slate-700">Acciones Rápidas</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mb-3">Agrega campos estándar con un solo clic</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newNombre = !quickActions.nombre;
                            setQuickActions(prev => ({ ...prev, nombre: newNombre }));
                            if (newNombre && !captureSteps.find(s => s.text.toLowerCase().includes('nombre'))) {
                              setCaptureSteps(prev => [{ id: Date.now(), text: 'Solicita el nombre del cliente de forma natural y cálida', field: 'nombre', enabled: true }, ...prev]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            quickActions.nombre
                              ? 'bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/30'
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Nombre
                        </button>
                        <button
                          onClick={() => setQuickActions(prev => ({ ...prev, email: !prev.email }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            quickActions.email
                              ? 'bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/30'
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Email
                        </button>
                      </div>
                    </div>

                    {/* Lista de pasos */}
                    <div className="space-y-2">
                      {captureSteps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2 text-slate-300 shrink-0">
                            <span className="cursor-grab select-none text-sm leading-none">⠿⠿</span>
                            <span className="text-[11px] font-black text-slate-400">{idx + 1}.</span>
                          </div>
                          <input
                            type="text"
                            value={step.text}
                            onChange={(e) => setCaptureSteps(prev => prev.map(s => s.id === step.id ? { ...s, text: e.target.value } : s))}
                            className="flex-1 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none placeholder-slate-300"
                            placeholder="Describe este paso de captura..."
                          />
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setOpenFieldDropdownId(openFieldDropdownId === step.id ? null : step.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all"
                            >
                              <Database size={11} className="text-slate-400" />
                              {step.field || 'No guardar'}
                              <ChevronDown size={10} className="text-slate-400" />
                            </button>
                            {openFieldDropdownId === step.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-44 py-2 overflow-hidden">
                                <div className="px-3 pb-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar campo..."
                                    className="w-full text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                                  />
                                </div>
                                {['No guardar', 'nombre', 'telefono', 'email', 'empresa', 'ciudad'].map(opt => (
                                  <button
                                    key={opt}
                                    onClick={() => {
                                      setCaptureSteps(prev => prev.map(s => s.id === step.id ? { ...s, field: opt === 'No guardar' ? null : opt } : s));
                                      setOpenFieldDropdownId(null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors ${
                                      (step.field || 'No guardar') === opt ? 'bg-slate-50' : ''
                                    }`}
                                  >
                                    {(step.field || 'No guardar') === opt && <Check size={11} className="text-[#6366f1] shrink-0" />}
                                    <Database size={10} className="text-slate-400 shrink-0" />
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setCaptureSteps(prev => prev.map(s => s.id === step.id ? { ...s, enabled: !s.enabled } : s))}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                              step.enabled ? 'bg-[#18181b]' : 'bg-slate-200'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                              step.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Añadir paso */}
                    <button
                      onClick={() => {
                        if (captureSteps.length < 10) {
                          setCaptureSteps(prev => [...prev, { id: Date.now(), text: '', field: null, enabled: true }]);
                        }
                      }}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-[#6366f1] hover:text-[#6366f1] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Añadir paso
                    </button>

                    {/* Toggle saltar pasos */}
                    <div className="flex items-start gap-3 pt-2">
                      <button
                        onClick={() => setSkipExistingData(!skipExistingData)}
                        className={`relative inline-flex h-5 w-9 shrink-0 mt-0.5 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          skipExistingData ? 'bg-[#6366f1]' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                          skipExistingData ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Saltar pasos cuyo dato ya esté en el contacto</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Desactivado: cada paso vuelve a preguntar aunque el contacto tenga el dato</p>
                      </div>
                    </div>
                  </div>
                ) : convSubTab === 'Seguimientos' ? (
                  <div className="space-y-6">
                    {/* Header Seguimientos */}
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-slate-500">⏰</span>
                        <h3 className="text-sm font-black text-slate-800">Seguimientos ({followUpMessages.length}/3)</h3>
                      </div>
                      <p className="text-[11px] text-[#6366f1] font-semibold">Mensajes automáticos cuando el contacto no responde</p>
                    </div>

                    {/* Barra de tiempo acumulado */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                        <span>Tiempo acumulado: {followUpMessages.reduce((acc, m) => acc + (m.unit === 'hrs' ? m.time * 60 : m.time), 0)} min</span>
                        <span>23 hrs disponibles</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#6366f1] rounded-full" style={{ width: `${Math.min((followUpMessages.reduce((acc, m) => acc + (m.unit === 'hrs' ? m.time * 60 : m.time), 0) / (23 * 60)) * 100, 100)}%` }} />
                      </div>
                    </div>

                    {/* Mensajes de seguimiento */}
                    <div className="space-y-3">
                      {followUpMessages.map((msg, idx) => (
                        <div key={msg.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                          <span className="text-slate-300 cursor-grab text-sm shrink-0">⠿⠿</span>
                          <span className="text-[11px] font-black text-slate-400 shrink-0">{idx + 1}.</span>
                          <input
                            type="text"
                            value={msg.text}
                            onChange={(e) => setFollowUpMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: e.target.value } : m))}
                            className="flex-1 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none"
                          />
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">Tiempo:</span>
                          <input
                            type="number"
                            min={1}
                            value={msg.time}
                            onChange={(e) => setFollowUpMessages(prev => prev.map(m => m.id === msg.id ? { ...m, time: Number(e.target.value) } : m))}
                            className="w-14 text-center text-xs font-black text-slate-700 border border-slate-200 rounded-xl px-2 py-1.5 outline-none"
                          />
                          <select
                            value={msg.unit}
                            onChange={(e) => setFollowUpMessages(prev => prev.map(m => m.id === msg.id ? { ...m, unit: e.target.value } : m))}
                            className="text-[10px] font-bold text-slate-500 border border-slate-200 rounded-xl px-2 py-1.5 outline-none bg-white"
                          >
                            <option value="min">min</option>
                            <option value="hrs">hrs</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Añadir seguimiento */}
                    {followUpMessages.length < 3 && (
                      <button
                        onClick={() => setFollowUpMessages(prev => [...prev, { id: Date.now(), text: '', time: 60, unit: 'min' }])}
                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-[#6366f1] hover:text-[#6366f1] transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Añadir seguimiento
                      </button>
                    )}

                    {/* Tiempo de Inactividad */}
                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">⏰</span>
                        <div>
                          <p className="text-sm font-black text-slate-800">Tiempo de Inactividad</p>
                          <p className="text-[11px] text-[#6366f1] font-semibold">Configura cuando cerrar una conversación por inactividad</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
                        <span className="text-xs font-bold text-slate-600">Cerrar conversación después de</span>
                        <input
                          type="number"
                          min={1}
                          value={inactivityTimeout}
                          onChange={(e) => setInactivityTimeout(Number(e.target.value))}
                          className="w-16 text-center text-sm font-black text-slate-800 border border-slate-200 rounded-xl px-2 py-1.5 outline-none"
                        />
                        <select
                          value={inactivityUnit}
                          onChange={(e) => setInactivityUnit(e.target.value)}
                          className="text-xs font-bold text-slate-500 border border-slate-200 rounded-xl px-3 py-1.5 outline-none bg-white"
                        >
                          <option value="minutos">minutos</option>
                          <option value="horas">horas</option>
                        </select>
                        <span className="text-xs font-bold text-slate-400">sin respuesta</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold px-1">
                        Máximo disponible: 23 hrs 30 min (comparte el límite de 24 hrs con los seguimientos)
                      </p>
                    </div>
                  </div>

                ) : convSubTab === 'Voz' ? (
                  <div className="space-y-6">
                    {/* Respuestas de Voz */}
                    <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <span className="text-lg">🔊</span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">Respuestas de Voz</p>
                          <p className="text-[11px] text-slate-400 font-semibold">Permite que el asistente responda con audio</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          voiceEnabled ? 'bg-[#18181b]' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                          voiceEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {voiceEnabled && (
                      <div className="space-y-5">
                        {/* Voz del Asistente */}
                        <div className="space-y-2">
                          <p className="text-xs font-black text-slate-700">Voz del Asistente</p>
                          <div className="relative">
                            <button
                              onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                              className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all"
                            >
                              <div className="text-left">
                                <p className="text-sm font-black text-slate-800">{selectedVoice}</p>
                                <p className="text-[10px] text-[#6366f1] font-semibold mt-0.5">
                                  {{
                                    'Sarah - Mature, Reassuring, Confident': 'Cálida y profesional, ideal para presentaciones formales',
                                    'Fay - Clear, Expressive': 'Clara y expresiva, para instrucciones y tutoriales',
                                    'Matilda - Knowledgable, Professional': 'Suave y elegante, para contextos refinados',
                                    'River - Relaxed, Neutral, Informative': 'Neutra y relajada, para información general',
                                    'Roger - Laid-Back, Casual, Resonant': 'Masculino y sereno, para tono ejecutivo',
                                    'Will - Relaxed Optimist': 'Optimista y amigable, para atención al cliente',
                                  }[selectedVoice] || 'Selecciona una voz'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <ChevronDown size={16} className="text-slate-400" />
                                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                  <span className="text-sm">▶️</span>
                                </button>
                              </div>
                            </button>

                            {showVoiceDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                                {[
                                  { name: 'Fay - Clear, Expressive', desc: 'Clara y expresiva, para instrucciones y tutoriales' },
                                  { name: 'Matilda - Knowledgable, Professional', desc: 'Suave y elegante, para contextos refinados' },
                                  { name: 'River - Relaxed, Neutral, Informative', desc: 'Neutra y relajada, para información general' },
                                  { name: 'Roger - Laid-Back, Casual, Resonant', desc: 'Masculino y sereno, para tono ejecutivo' },
                                  { name: 'Sarah - Mature, Reassuring, Confident', desc: 'Cálida y profesional, para presentaciones formales' },
                                  { name: 'Will - Relaxed Optimist', desc: 'Optimista y amigable, para atención al cliente' },
                                ].map(v => (
                                  <button
                                    key={v.name}
                                    onClick={() => { setSelectedVoice(v.name); setShowVoiceDropdown(false); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                                      selectedVoice === v.name ? 'bg-slate-50' : ''
                                    }`}
                                  >
                                    <div className="text-left">
                                      <p className="text-xs font-black text-slate-800">{v.name}</p>
                                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{v.desc}</p>
                                    </div>
                                    {selectedVoice === v.name && <Check size={14} className="text-[#6366f1] shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Porcentaje de respuestas en voz */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-slate-700">Porcentaje de respuestas en voz</p>
                            <span className="text-sm font-black text-[#6366f1]">{voicePercentage}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={10}
                            value={voicePercentage}
                            onChange={(e) => setVoicePercentage(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full outline-none cursor-pointer accent-[#6366f1]"
                          />
                          <p className="text-[10px] text-[#6366f1] font-semibold">
                            {voicePercentage < 25 ? 'El asistente responderá con voz ocasionalmente' :
                             voicePercentage < 75 ? 'El asistente responderá con voz frecuentemente' :
                             'El asistente responderá casi siempre con voz'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                ) : convSubTab === 'Comportamiento' ? (
                  <div className="space-y-0 pb-20">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-5">
                      <span className="text-slate-500">🔀</span>
                      <div>
                        <p className="text-sm font-black text-slate-800">Comportamiento del Asistente</p>
                        <p className="text-[11px] text-slate-400 font-semibold">Configura cómo actúa tu asistente en las conversaciones</p>
                      </div>
                    </div>

                    {/* Toggle: Usar emojis */}
                    <div className="flex items-center justify-between py-4 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🙂</span>
                        <div>
                          <p className="text-xs font-black text-slate-800">Usar emojis en respuestas</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">El asistente puede usar emojis para un tono más cercano.</p>
                        </div>
                      </div>
                      <button onClick={() => setUseEmojis(!useEmojis)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${useEmojis ? 'bg-[#18181b]' : 'bg-slate-200'}`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${useEmojis ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle: Solo temas del negocio */}
                    <div className="flex items-center justify-between py-4 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🛡️</span>
                        <div>
                          <p className="text-xs font-black text-slate-800">Solo temas del negocio</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">El asistente solo habla sobre temas relacionados con tu negocio.</p>
                        </div>
                      </div>
                      <button onClick={() => setOnlyBusinessTopics(!onlyBusinessTopics)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${onlyBusinessTopics ? 'bg-[#18181b]' : 'bg-slate-200'}`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${onlyBusinessTopics ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Configuración avanzada */}
                    <div className="pt-4">
                      <button
                        onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                        className="flex items-center justify-between w-full py-2 text-xs font-black text-slate-500 uppercase tracking-widest"
                      >
                        <div className="flex items-center gap-2">
                          <span>≡</span> Configuración avanzada
                        </div>
                        <ChevronDown size={14} className={`transition-transform ${showAdvancedConfig ? 'rotate-180' : ''}`} />
                      </button>

                      {showAdvancedConfig && (
                        <div className="space-y-0 mt-2">
                          {/* Dividir mensajes largos */}
                          <div className="flex items-center justify-between py-4 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">💬</span>
                              <div>
                                <p className="text-xs font-black text-slate-800">Dividir mensajes largos</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Los respuestas largas se separan en varios mensajes cortos.</p>
                              </div>
                            </div>
                            <button onClick={() => setDivideMessages(!divideMessages)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${divideMessages ? 'bg-[#18181b]' : 'bg-slate-200'}`}>
                              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${divideMessages ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {/* Zona horaria */}
                          <div className="flex items-center justify-between py-4 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🌐</span>
                              <div>
                                <p className="text-xs font-black text-slate-800">Zona horaria</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Zona horaria para fechas y horarios</p>
                              </div>
                            </div>
                            <div className="relative">
                              <button
                                onClick={() => { setShowTimezoneDropdown(!showTimezoneDropdown); setShowResponseTimeDropdown(false); }}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all"
                              >
                                {selectedTimezone || 'Selecciona zona horaria'}
                                <ChevronDown size={12} className="text-slate-400" />
                              </button>
                              {showTimezoneDropdown && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-72 max-h-64 overflow-y-auto">
                                  <div className="sticky top-0 bg-white px-3 py-2 border-b border-slate-50">
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="Buscar zona horaria..."
                                      value={timezoneSearch}
                                      onChange={e => setTimezoneSearch(e.target.value)}
                                      className="w-full text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                                    />
                                  </div>
                                  {Object.entries(ALL_TIMEZONES).map(([continent, zones]) => {
                                    const filtered = zones.filter(z => z.toLowerCase().includes(timezoneSearch.toLowerCase()));
                                    if (filtered.length === 0) return null;
                                    return (
                                      <div key={continent}>
                                        <p className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">{continent}</p>
                                        {filtered.map(tz => (
                                          <button
                                            key={tz}
                                            onClick={() => { setSelectedTimezone(tz); setShowTimezoneDropdown(false); setTimezoneSearch(''); }}
                                            className={`w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors ${selectedTimezone === tz ? 'text-[#6366f1] font-black' : ''}`}
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
                              <span className="text-xl">⏱️</span>
                              <div>
                                <p className="text-xs font-black text-slate-800">Tiempo de respuesta</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Pausa antes de responder (más natural)</p>
                              </div>
                            </div>
                            <div className="relative">
                              <button
                                onClick={() => { setShowResponseTimeDropdown(!showResponseTimeDropdown); setShowTimezoneDropdown(false); }}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all"
                              >
                                {responseTime} <ChevronDown size={12} className="text-slate-400" />
                              </button>
                              {showResponseTimeDropdown && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 w-52 py-2">
                                  {['Inmediatamente', '5 segundos', '10 segundos', '30 segundos', '1 minuto', '2 minutos', 'Aleatorio (5-30s)'].map(opt => (
                                    <button
                                      key={opt}
                                      onClick={() => { setResponseTime(opt); setShowResponseTimeDropdown(false); }}
                                      className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors ${responseTime === opt ? 'text-[#6366f1] font-black' : 'text-slate-700'}`}
                                    >
                                      {opt}
                                      {responseTime === opt && <Check size={12} className="text-[#6366f1]" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Límite de mensajes */}
                          <div className="flex items-center justify-between py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">💬</span>
                              <div>
                                <p className="text-xs font-black text-slate-800">Límite de mensajes</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Máximo de mensajes antes de pasar a humano</p>
                              </div>
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={messageLimit}
                              onChange={(e) => setMessageLimit(Number(e.target.value))}
                              className="w-16 text-center text-sm font-black text-slate-800 border border-slate-200 rounded-xl px-2 py-1.5 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botón Guardar */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-10" style={{ left: '120px' }}>
                      <button className="w-full py-3.5 bg-[#18181b] hover:bg-zinc-800 text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg">
                        💾 Guardar Comportamiento
                      </button>
                    </div>
                  </div>

                ) : convSubTab === 'Calendario' ? (
                  <div className="space-y-5 pb-20">
                    {/* Header */}
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Configuracion de Agenda</h3>
                      <p className="text-[11px] text-[#6366f1] font-semibold mt-0.5">Configura como el superagente puede agendar reuniones</p>
                    </div>

                    {/* Nombre del calendario */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600">Nombre del calendario <span className="text-[#6366f1]">*</span></label>
                      <input
                        type="text"
                        value={calendarName}
                        onChange={e => setCalendarName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all text-sm font-bold text-slate-700"
                      />
                    </div>

                    {/* Descripcion */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600">Descripcion</label>
                      <input
                        type="text"
                        value={calendarDesc}
                        onChange={e => setCalendarDesc(e.target.value)}
                        placeholder="Describe el proposito de este calendario"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300"
                      />
                    </div>

                    {/* Inner tabs: Agendas | Configuracion */}
                    <div className="flex border-b border-slate-100 -mx-1">
                      {[{id:'Agendas',icon:'📅'},{id:'Configuracion',icon:'⚙️'}].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setCalTab(t.id)}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all border-b-2 -mb-px ${
                            calTab === t.id
                              ? 'border-[#6366f1] text-[#6366f1]'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <span>{t.icon}</span> {t.id}
                        </button>
                      ))}
                    </div>

                    {/* === AGENDAS TAB === */}
                    {calTab === 'Agendas' ? (
                      <div className="space-y-4">
                        {/* Proveedor de calendario */}
                        <div className="space-y-3">
                          <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Proveedor de calendario</p>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: 'Google Calendar', label: 'Google Calendar', sub: 'OAuth seguro', icon: '🗓️', color: 'text-red-500' },
                              { id: 'Calendly', label: 'Calendly', sub: 'OAuth seguro', icon: '🔵', color: 'text-blue-500' },
                              { id: 'Cal.com', label: 'Cal.com', sub: 'API Key', icon: '⬛', color: 'text-slate-800' },
                            ].map(p => (
                              <button
                                key={p.id}
                                onClick={() => setCalProvider(p.id)}
                                className={`relative flex flex-col items-start gap-1 p-3 rounded-2xl border-2 transition-all text-left ${
                                  calProvider === p.id
                                    ? 'border-[#6366f1] bg-indigo-50/30'
                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                              >
                                {calProvider === p.id && (
                                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#6366f1] flex items-center justify-center">
                                    <Check size={10} className="text-white" />
                                  </span>
                                )}
                                <span className="text-2xl">
                                  {p.id === 'Google Calendar' ? '🗓️' : p.id === 'Calendly' ? '🔵' : '📆'}
                                </span>
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
                              <span className="text-xl">🗓️</span>
                              <div>
                                <p className="text-xs font-black text-slate-800">Google Calendar</p>
                                <p className="text-[10px] text-slate-400 font-semibold">No conectado — autoriza el acceso a tu Google Calendar</p>
                              </div>
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-2 bg-[#18181b] hover:bg-zinc-700 text-white text-[11px] font-black rounded-xl transition-all">
                              🔗 Conectar
                            </button>
                          </div>
                        )}

                        {calProvider === 'Calendly' && (
                          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🔵</span>
                              <div>
                                <p className="text-xs font-black text-slate-800">Calendly</p>
                                <p className="text-[10px] text-slate-400 font-semibold">No conectado — autoriza el acceso a tu cuenta de Calendly</p>
                              </div>
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-2 bg-[#6366f1] hover:bg-indigo-600 text-white text-[11px] font-black rounded-xl transition-all">
                              🔗 Conectar
                            </button>
                          </div>
                        )}

                        {calProvider === 'Cal.com' && (
                          <div className="space-y-4 bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
                            <div>
                              <p className="text-xs font-black text-slate-800">⚙️ Configuracion de Cal.com</p>
                              <p className="text-[10px] text-[#6366f1] font-semibold">Conecta tu cuenta por API Key</p>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black text-slate-600">API Key de Cal.com</label>
                              <input
                                type="text"
                                value={calComApiKey}
                                onChange={e => setCalComApiKey(e.target.value)}
                                placeholder="Ingresa tu API Key de Cal.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-300"
                              />
                              <p className="text-[9px] text-slate-400 font-semibold">Dato en Calendar &gt; Settings &gt; Developer &gt; API Keys</p>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black text-slate-600">ID del Tipo de Evento</label>
                              <input
                                type="text"
                                value={calComEventId}
                                onChange={e => setCalComEventId(e.target.value)}
                                placeholder="12345"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-300"
                              />
                              <p className="text-[9px] text-slate-400 font-semibold">El ID del tipo de evento tipo (calendar link)</p>
                            </div>
                          </div>
                        )}

                        {/* Horarios de atencion */}
                        <button className="w-full flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm hover:bg-slate-50 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">⏰</span>
                            <div className="text-left">
                              <p className="text-xs font-black text-slate-800">Horarios de atencion</p>
                              <p className="text-[10px] text-[#6366f1] font-semibold">Configura días y horas disponibles</p>
                            </div>
                          </div>
                          <ChevronDown size={14} className="text-slate-400 -rotate-90" />
                        </button>
                      </div>

                    ) : (
                      /* === CONFIGURACION TAB === */
                      <div className="space-y-0">
                        {/* Integracion con Google Meet */}
                        <div className="flex items-center justify-between py-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">📹</span>
                            <div>
                              <p className="text-xs font-black text-slate-800">Integracion con Google Meet</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Generar link del meet al hacer el agendamiento</p>
                            </div>
                          </div>
                          <button onClick={() => setCalGoogleMeet(!calGoogleMeet)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${calGoogleMeet ? 'bg-[#18181b]' : 'bg-slate-200'}`}>
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${calGoogleMeet ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Consulta de horarios */}
                        <div className="flex items-center justify-between py-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">⏰</span>
                            <div>
                              <p className="text-xs font-black text-slate-800">Consulta de horarios</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Superagente puede consultar horarios disponibles</p>
                            </div>
                          </div>
                          <button onClick={() => setCalConsultarHorarios(!calConsultarHorarios)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${calConsultarHorarios ? 'bg-[#18181b]' : 'bg-slate-200'}`}>
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${calConsultarHorarios ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Asunto de la reunion */}
                        <div className="py-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📝</span>
                            <div>
                              <p className="text-xs font-black text-slate-800">Asunto de la reunion</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Define el título del evento. Usa <span className="text-[#6366f1]">{'{name}'}</span> para el nombre del cliente</p>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={calAsunto}
                            onChange={e => setCalAsunto(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all text-sm font-bold text-slate-700"
                          />
                          <p className="text-[10px] text-slate-400 font-semibold">Variables disponibles: <span className="text-slate-600">{'{name}'}, {'{email}'}, {'{company}'}</span></p>
                        </div>
                      </div>
                    )}

                    {/* Guardar */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-10" style={{ left: '120px' }}>
                      <button className="w-full py-3.5 bg-[#18181b] hover:bg-zinc-800 text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg">
                        💾 Guardar configuracion
                      </button>
                    </div>
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

        {/* Botón flotante Asistente de Configuración (abajo derecha) */}
        <button
          onClick={() => {
            setAuditStep('landing');
            setAuditMessages([]);
            setShowAuditModal(true);
          }}
          className="fixed bottom-6 right-8 w-12 h-12 bg-[#18181b] hover:bg-zinc-800 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 z-[100]"
        >
          <Bot size={20} className="text-white" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f5f5f6] font-sans selection:bg-indigo-200/50 overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        {showNewDesignBanner && (
          <div className="bg-[#6366f1] px-8 py-3 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <SlidersHorizontal size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  ✓ Nuevo diseño activado
                </p>
                <p className="text-[11px] text-indigo-100 font-semibold mt-0.5">
                  ¿Prefieres la versión anterior? Puedes volver en cualquier momento.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setShowNewDesignBanner(false)}
                className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-indigo-950/40 focus:outline-none"
              >
                <span className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-4" />
              </button>
              <span className="text-xs font-bold text-white">Volver a diseño anterior</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-w-0">
          
          {activeDetailAgent ? (
            renderDetailView()
          ) : (
            <>
              {/* Header */}
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-[26px] font-black tracking-tight text-slate-800">Superagentes</h1>
                    <span className="bg-indigo-50 text-[#6366f1] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full tracking-wider">
                      BETA
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 font-medium mt-1">Gestiona tus superagentes</p>
                </div>
                
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="bg-[#18181b] hover:bg-zinc-800 text-white px-6 py-3 rounded-full text-sm font-black transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-zinc-200"
                >
                  <Plus size={16} strokeWidth={3} /> Crear Superagente
                </button>
              </div>
 
              {/* Estadísticas */}
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
                      <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        BUSINESS <Crown size={10} className="text-[#6366f1] fill-[#6366f1]" />
                      </span>
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
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-full outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-medium text-slate-700 shadow-sm"
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
                                onClick={() => setVisibleColumns({...visibleColumns, nombre: !visibleColumns.nombre})}
                                className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition-colors"
                              >
                                <span className="w-4 flex items-center justify-center shrink-0">
                                  {visibleColumns.nombre && <Check size={14} className="text-slate-800" />}
                                </span>
                                Nombre
                              </button>
                              <button 
                                onClick={() => setVisibleColumns({...visibleColumns, descripcion: !visibleColumns.descripcion})}
                                className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs transition-colors"
                              >
                                <span className="w-4 flex items-center justify-center shrink-0">
                                  {visibleColumns.descripcion && <Check size={14} className="text-slate-800" />}
                                </span>
                                Descripción
                              </button>
                              <button 
                                onClick={() => setVisibleColumns({...visibleColumns, estado: !visibleColumns.estado})}
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
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 select-none">
                            Nombre <span className="text-slate-400 ml-1">↑↓</span>
                          </th>
                        )}
                        {visibleColumns.descripcion && (
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 select-none">
                            DESCRIPCIÓN
                          </th>
                        )}
                        {visibleColumns.estado && (
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 select-none text-center">
                            Estado <span className="text-slate-400 ml-1">↑↓</span>
                          </th>
                        )}
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 select-none text-center">
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
                            {visibleColumns.estado && <td className="px-6 py-5"><div className="h-6 w-12 bg-slate-100 rounded-full mx-auto" /></td>}
                            <td className="px-6 py-5"><div className="h-4 w-12 bg-slate-100 rounded mx-auto" /></td>
                          </tr>
                        ))
                      ) : filteredAgents.length > 0 ? (
                        filteredAgents.map((agent) => (
                          <tr key={agent.id} className="hover:bg-slate-50/20 transition-colors group">
                            {visibleColumns.nombre && (
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    <Bot size={18} />
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
                                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                                      Línea: {agent.dispositivo_nombre || `Terminal ${agent.dispositivo_id}`} ({agent.modelo})
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
                            {visibleColumns.estado && (
                              <td className="px-6 py-5 text-center">
                                <button
                                  onClick={() => handleToggleActive(agent)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    agent.activo === 1 ? 'bg-[#22c55e]' : 'bg-slate-200'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      agent.activo === 1 ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </td>
                            )}
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setActiveDetailAgent(agent);
                                    setActiveMenuTab('General');
                                    setIsEditingDetailName(false);
                                    setDetailNameValue(agent.nombre);
                                  }}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                >
                                  <Edit2 size={15} />
                                </button>
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
                          <td colSpan={4} className="px-6 py-20 text-center">
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
                    <div className="relative">
                      <select className="appearance-none pl-4 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-[#1e1b4b] font-bold text-xs shadow-sm cursor-pointer outline-none hover:bg-slate-50">
                        <option>10</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                    </div>
                    
                    <span className="text-xs text-slate-500 font-semibold">
                      Página 1 de 0
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        disabled 
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                      >
                        &lt;&lt;
                      </button>
                      <button 
                        disabled 
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                      >
                        &lt;
                      </button>
                      <button 
                        disabled 
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                      >
                        &gt;
                      </button>
                      <button 
                        disabled 
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                      >
                        &gt;&gt;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
        </div>
      </main>

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
              <div className="px-8 pt-6 pb-4 flex flex-col border-b border-slate-100 shrink-0">
                <div className="flex justify-between items-start">
                  <div className="text-left">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      {selectedAgent ? 'Editar Superagente' : `Configurar Superagente · Paso ${modalStep} de 3`}
                    </p>
                    <h3 className="font-extrabold text-slate-800 text-xl tracking-tight leading-tight">
                      {selectedAgent ? 'Editar Superagente' : (
                        modalStep === 1 ? 'Selecciona tu industria' :
                        modalStep === 2 ? 'Selecciona el objetivo principal' : 
                        'Cuéntanos sobre tu negocio'
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      {selectedAgent ? 'Modifica los campos de tu asistente' : (
                        modalStep === 1 ? 'Selecciona una plantilla para configurar rápidamente tu asistente' :
                        modalStep === 2 ? 'Elige lo que quieres lograr con tu asistente' :
                        'Esta información ayudará a tu asistente a responder mejor'
                      )}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-xl shrink-0"
                  >
                    <X size={20}/>
                  </button>
                </div>

                {/* Progress Bar (Only during creation) */}
                {!selectedAgent && (
                  <div className="flex gap-1.5 mt-4">
                    <div className={`h-1 flex-1 rounded-full ${modalStep >= 1 ? 'bg-slate-800' : 'bg-slate-100'}`} />
                    <div className={`h-1 flex-1 rounded-full ${modalStep >= 2 ? 'bg-slate-800' : 'bg-slate-100'}`} />
                    <div className={`h-1 flex-1 rounded-full ${modalStep >= 3 ? 'bg-slate-800' : 'bg-slate-100'}`} />
                  </div>
                )}
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
                            <div>
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
                        className="text-sm font-bold text-[#6366f1] hover:text-indigo-700 transition-all hover:underline"
                      >
                        Mi industria no está aquí, configurar manualmente
                      </button>
                    </div>
                  </div>
                ) : modalStep === 2 ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {OBJECTIVES.map((obj) => {
                        const isSelected = formData.objetivo === obj.id;
                        return (
                          <div
                            key={obj.id}
                            onClick={() => handleSelectObjective(obj)}
                            className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
                              isSelected 
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
                                <h4 className="text-sm font-black text-slate-800">{obj.title}</h4>
                                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{obj.description}</p>
                              </div>
                            </div>
                            
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                              {isSelected && <Check size={16} className="text-indigo-600" strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
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
                        className="px-6 py-2.5 rounded-full bg-[#18181b] hover:bg-zinc-800 text-white font-black text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-zinc-200"
                      >
                        Siguiente <ChevronRight size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateAgent} className="space-y-6">
                    
                    {/* Nombre del Agente */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                        Nombre del superagente
                      </label>
                      <input 
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        placeholder="Sofia"
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>

                    {/* Descripción breve del negocio */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                        Descripción breve del negocio
                      </label>
                      <textarea 
                        value={formData.descripcion_negocio}
                        onChange={(e) => setFormData({...formData, descripcion_negocio: e.target.value})}
                        rows={6}
                        placeholder="Describe tu negocio, servicios, horarios, ubicación, etc."
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-[#6366f1] transition-all font-bold text-slate-700 text-sm resize-none"
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
                        disabled={!formData.nombre.trim() || !formData.descripcion_negocio.trim()}
                        className={`px-6 py-2.5 rounded-full font-black text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                          (!formData.nombre.trim() || !formData.descripcion_negocio.trim())
                            ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none'
                            : 'bg-[#18181b] hover:bg-zinc-800 text-white shadow-zinc-200'
                        }`}
                      >
                        Crear Asistente <Check size={16} strokeWidth={3} />
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
                    className="flex-1 py-4 rounded-2xl border border-slate-100 font-black text-slate-400 text-sm hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDeleteAgent}
                    className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 shadow-xl shadow-rose-100"
                  >
                    Eliminar
                  </button>
                </div>
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
                    <Bot size={18} />
                  </div>
                  <div>
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
                      <div 
                        key={i} 
                        className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender !== 'user' && (
                          <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shrink-0 mb-0.5">
                            <Bot size={13} className="text-white" />
                          </div>
                        )}
                        <div 
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed shadow-sm ${
                            msg.sender === 'user' 
                              ? 'bg-[#18181b] text-white rounded-br-none' 
                              : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                        {msg.sender === 'user' && (
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mb-0.5">
                            <span className="text-[10px] font-black text-slate-500">U</span>
                          </div>
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
 
              <form onSubmit={handleSendTestMessage} className="p-4 border-t border-slate-100 bg-white">
                <div className={`flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 ${!activeDetailAgent ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <button 
                    type="button" 
                    disabled={!activeDetailAgent}
                    className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Paperclip size={16} />
                  </button>
                  <button 
                    type="button" 
                    disabled={!activeDetailAgent}
                    className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Mic size={16} />
                  </button>
                  <input
                    type="text"
                    placeholder={activeDetailAgent ? "Escribe un mensaje de prueba" : "Selecciona un agente para probar..."}
                    value={testInput}
                    disabled={!activeDetailAgent}
                    onChange={(e) => setTestInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-slate-700 placeholder-slate-400 py-1.5 disabled:cursor-not-allowed"
                  />
                  <button 
                    type="submit" 
                    disabled={!activeDetailAgent || !testInput.trim()}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      (activeDetailAgent && testInput.trim()) 
                        ? 'bg-[#18181b] text-white hover:bg-zinc-800' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Send size={13} />
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
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight leading-tight">Asistente de Configuración</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Configura y optimiza tu asistente</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {auditStep === 'chat' && (
                    <button 
                      onClick={() => {
                        setAuditStep('landing');
                        setAuditMessages([]);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all shadow-sm bg-white"
                    >
                      <RefreshCw size={12} /> Nuevo chat
                    </button>
                  )}
                  <button 
                    onClick={() => setShowAuditModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-xl shrink-0"
                  >
                    <X size={18}/>
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
                    <p className="text-xs text-slate-400 font-bold text-center mt-1">Encontré 2 problemas de configuración.</p>

                    <div className="w-full max-w-lg space-y-3 mt-6">
                      <div className="p-4 bg-white border border-orange-100 rounded-2xl flex flex-col shadow-sm">
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-full w-fit border border-orange-100">Faltante</span>
                        <p className="text-xs text-slate-600 font-semibold mt-2">
                          No hay reglas de transferencia — si el agente no puede resolver, no podrá escalar a un humano
                        </p>
                      </div>

                      <div className="p-4 bg-white border border-orange-100 rounded-2xl flex flex-col shadow-sm">
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-full w-fit border border-orange-100">Faltante</span>
                        <p className="text-xs text-slate-600 font-semibold mt-2">
                          No hay seguimientos automáticos configurados para cuando el cliente deje de responder
                        </p>
                      </div>
                    </div>

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
                      {auditMessages.map((msg, idx) => (
                        <div 
                          key={idx}
                          className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          <div 
                            className={`max-w-[90%] px-5 py-4 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                              msg.sender === 'user'
                                ? 'bg-[#18181b] text-white rounded-br-none animate-fade-in'
                                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none animate-fade-in'
                            }`}
                          >
                            {msg.text.split('\n').map((line, li) => (
                              <p key={li} className={li > 0 ? 'mt-1.5' : ''}>
                                {renderRichText(line)}
                              </p>
                            ))}
                          </div>

                          {msg.appliedBanner && (
                            <div className="w-full max-w-[90%] mt-3 flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 shadow-sm animate-fade-in">
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Cambios aplicados</p>
                                <p className="text-[11px] font-semibold mt-1.5 leading-relaxed text-emerald-800">
                                  ✅ meta, instrucciones, transfer_rule: Transferir a humano cuando el cliente mencione una solicitud especial, evento corporativo, queja, alergia alimentaria, o pida hablar con una persona del restaurante, follow_up: ¡Hola! 😊 Soy {activeDetailAgent?.nombre}, de Sabor &amp; Brasa. ¿Sigues ahí?
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 justify-start pt-2 shrink-0 border-t border-slate-100/50">
                      <button 
                        onClick={applyAuditChanges}
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
                        onClick={() => {
                          setAuditMessages(prev => [
                            ...prev,
                            { sender: 'user', text: 'Revisar el comportamiento' },
                            { sender: 'assistant', text: `El superagente tiene configurado un comportamiento comercial para ${activeDetailAgent?.nombre}. Responderá cordialmente las consultas sobre el menú, horarios y ubicación, y derivará a un asesor en caso de reclamos. Puedes simular una conversación usando el panel lateral de pruebas en la esquina inferior izquierda.` }
                          ]);
                        }}
                        className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-full text-slate-700 bg-white hover:bg-slate-50 font-bold text-[10px] shadow-sm transition-all"
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            auditInput.trim()
                              ? 'bg-slate-950 text-white hover:bg-slate-900'
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <Send size={12} />
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold px-2">Shift + Enter para nueva línea</span>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentesIA;
