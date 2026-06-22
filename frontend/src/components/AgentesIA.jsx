// frontend/src/components/AgentesIA.jsx
import React, { useState, useEffect } from 'react';
import { 
  Bot, Plus, Search, ChevronDown, Check, Trash2, Edit2, 
  AlertCircle, Server, Database, Activity, Stethoscope, 
  Utensils, ShoppingBag, Home, Dumbbell, Sparkles, Briefcase, 
  GraduationCap, X, SlidersHorizontal
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
    icon: <Utensils size={24} className="text-orange-500" />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
    instructions: 'Eres un recepcionista de un restaurante. Ayudas a los clientes a reservar mesas, explicas el menú de comidas y bebidas, indicas los precios y detallas los horarios de atención y la ubicación.',
    personality: 'Amigable, servicial, entusiasta y detallista con los antojos de los comensales.'
  },
  {
    id: 'clinica',
    title: 'Clínica / Consultorio',
    description: 'Ideal para agendar citas médicas',
    icon: <Stethoscope size={24} className="text-teal-500" />,
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-100',
    instructions: 'Eres un asistente médico para una clínica. Tu objetivo principal es ayudar a los pacientes a agendar, reprogramar o cancelar citas médicas. Proporcionas información sobre especialidades disponibles, doctores y horarios.',
    personality: 'Empático, paciente, profesional, calmado y muy organizado.'
  },
  {
    id: 'ecommerce',
    title: 'Tienda / E-commerce',
    description: 'Para ventas y atención al cliente',
    icon: <ShoppingBag size={24} className="text-indigo-500" />,
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-100',
    instructions: 'Eres un agente de soporte de una tienda online. Ayudas a los clientes a encontrar productos en el catálogo, explicas los métodos de pago y de envío, y resuelves dudas comunes de postventa o estado de pedidos.',
    personality: 'Persuasivo, rápido, resolutivo y siempre orientado a concretar la venta.'
  },
  {
    id: 'inmobiliaria',
    title: 'Inmobiliaria',
    description: 'Para captar leads y agendar visitas',
    icon: <Home size={24} className="text-emerald-500" />,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    instructions: 'Eres un asesor inmobiliario virtual. Tu tarea es atender a personas interesadas en comprar, vender o alquilar inmuebles. Filtras el presupuesto, zonas de interés, captas sus datos de contacto y agendas visitas a propiedades.',
    personality: 'Formal, persuasivo, conocedor y generador de confianza.'
  },
  {
    id: 'gimnasio',
    title: 'Gimnasio / Fitness',
    description: 'Para membresías y clases',
    icon: <Dumbbell size={24} className="text-rose-500" />,
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    instructions: 'Eres el asistente virtual de un gimnasio. Brindas detalles sobre planes de membresía, precios, promociones vigentes, horarios de clases grupales y reservas con entrenadores personales.',
    personality: 'Energético, motivador, saludable y muy claro al explicar las reglas del club.'
  },
  {
    id: 'belleza',
    title: 'Salón de Belleza / Spa',
    description: 'Para citas y servicios de belleza',
    icon: <Sparkles size={24} className="text-pink-500" />,
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-100',
    instructions: 'Eres el asistente de recepción de un salón de belleza y spa. Agendas citas para cortes, tinte, manicura, masajes y faciales. Recomiendas combos especiales y das consejos rápidos de cuidado personal.',
    personality: 'Cálido, elegante, conversador y atento a las preferencias estéticas del cliente.'
  },
  {
    id: 'servicios',
    title: 'Servicios Profesionales',
    description: 'Abogados, contadores, consultores',
    icon: <Briefcase size={24} className="text-amber-500" />,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    instructions: 'Eres el asistente de un despacho de servicios profesionales. Filtras las consultas iniciales de clientes potenciales, explicas el alcance general de las asesorías y programas videollamadas de diagnóstico técnico.',
    personality: 'Muy profesional, discreto, preciso y estructurado.'
  },
  {
    id: 'escuela',
    title: 'Escuela / Academia',
    description: 'Para inscripciones y cursos',
    icon: <GraduationCap size={24} className="text-sky-500" />,
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-100',
    instructions: 'Eres un asesor de admisiones para cursos e inscripciones. Ayudas a los estudiantes a conocer el plan de estudios, los costos de matrícula, fechas de inicio y requisitos de aprobación.',
    personality: 'Didáctico, paciente, inspirador y muy informativo.'
  }
];

const AgentesIA = ({ user, onLogout }) => {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({ total: 0, activos: 0, knowledge_base_mb: 0.0 });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos'); // Todos, Activos, Inactivos
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
  
  // Form de creación (Pasos)
  const [modalStep, setModalStep] = useState(1); // Paso 1: Selección industria, Paso 2: Detalles del agente
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    dispositivo_id: '',
    modelo: 'gpt-4',
    instrucciones: '',
    personalidad: '',
    activo: true
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
          knowledge_base_mb: statsData.knowledge_base_mb
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
    if (!formData.dispositivo_id) {
      alert("Por favor selecciona un dispositivo de WhatsApp para vincular al agente.");
      return;
    }

    const token = getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/agentes-ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dispositivo_id: parseInt(formData.dispositivo_id),
          nombre: formData.nombre,
          modelo: formData.modelo,
          instrucciones: formData.instrucciones,
          personalidad: formData.personalidad,
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

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      nombre: `Asistente ${template.title}`,
      instrucciones: template.instructions,
      personalidad: template.personality
    }));
    setModalStep(2); // Avanzar a configurar detalles
  };

  const handleConfigureManual = () => {
    setSelectedTemplate({ title: 'Personalizado' });
    setFormData(prev => ({
      ...prev,
      nombre: '',
      instrucciones: 'Eres un asistente virtual para responder chats de WhatsApp de manera profesional.',
      personalidad: 'Educado, rápido, cordial y servicial.'
    }));
    setModalStep(2);
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
      activo: true
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

  return (
    <div className="flex h-screen bg-[#f5f5f6] font-sans selection:bg-indigo-200/50 overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-w-0">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[26px] font-black tracking-tight text-slate-800">Superagentes</h1>
                <span className="bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Beta
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium mt-1">Gestiona tus superagentes</p>
            </div>
            
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-[#18181b] hover:bg-zinc-800 text-white px-5 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-zinc-200"
            >
              <Plus size={16} strokeWidth={3} /> Crear Superagente
            </button>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
            {/* Stat 1 */}
            <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Bot size={24} />
              </div>
              <div>
                <p className="text-[24px] font-black text-slate-800 leading-none">{stats.total}</p>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Total de superagentes</p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                <Check size={24} />
              </div>
              <div>
                <p className="text-[24px] font-black text-emerald-500 leading-none">{stats.activos}</p>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Superagentes activos</p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Database size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[24px] font-black text-slate-800 leading-none">
                    {stats.knowledge_base_mb.toFixed(2)} MB
                  </p>
                  <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                    <SlidersHorizontal size={8} /> Business
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Base de conocimiento</p>
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
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-medium text-slate-700 shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Filtro Dropdown */}
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 bg-white border border-slate-100 rounded-2xl text-slate-600 font-bold text-sm shadow-sm outline-none focus:ring-4 focus:ring-indigo-50 hover:bg-slate-50 cursor-pointer"
                >
                  <option>Todos</option>
                  <option>Activos</option>
                  <option>Inactivos</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>

              {/* Columnas Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-slate-600 font-bold text-sm shadow-sm hover:bg-slate-50 transition-all"
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
                          <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer text-slate-600 font-bold text-xs">
                            <input 
                              type="checkbox" 
                              checked={visibleColumns.nombre} 
                              onChange={(e) => setVisibleColumns({...visibleColumns, nombre: e.target.checked})}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                            />
                            Nombre
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer text-slate-600 font-bold text-xs">
                            <input 
                              type="checkbox" 
                              checked={visibleColumns.descripcion} 
                              onChange={(e) => setVisibleColumns({...visibleColumns, descripcion: e.target.checked})}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                            />
                            Descripción
                          </label>
                          <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer text-slate-600 font-bold text-xs">
                            <input 
                              type="checkbox" 
                              checked={visibleColumns.estado} 
                              onChange={(e) => setVisibleColumns({...visibleColumns, estado: e.target.checked})}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                            />
                            Estado
                          </label>
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
                  <tr className="border-b border-slate-50 bg-slate-50/20">
                    {visibleColumns.nombre && (
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Nombre
                      </th>
                    )}
                    {visibleColumns.descripcion && (
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Descripción
                      </th>
                    )}
                    {visibleColumns.estado && (
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Estado
                      </th>
                    )}
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Acciones
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
                              <div>
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
                              {agent.instrucciones || 'Sin instrucciones adicionales.'}
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
                                setSelectedAgent(agent);
                                setSelectedTemplate({ title: 'Editar Agente' });
                                setFormData({
                                  nombre: agent.nombre,
                                  dispositivo_id: agent.dispositivo_id,
                                  modelo: agent.modelo || 'gpt-4',
                                  instrucciones: agent.instrucciones || '',
                                  personalidad: agent.personalidad || '',
                                  activo: agent.activo === 1
                                });
                                setModalStep(2);
                                setShowCreateModal(true);
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
                      <td colSpan="4" className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                            <Bot size={32} />
                          </div>
                          <h3 className="font-black text-slate-800 text-base">No hay superagentes creados.</h3>
                          <p className="text-slate-400 text-sm font-medium mt-1">Crea tu primer asistente de IA para automatizar tus líneas de WhatsApp.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="mt-auto px-6 py-4 border-t border-slate-50 bg-slate-50/10 flex items-center justify-between">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Mostrando {filteredAgents.length} de {agents.length} superagentes
              </p>
              
              <div className="flex items-center gap-2">
                <select className="px-2 py-1.5 bg-white border border-slate-100 rounded-xl text-slate-400 font-bold text-[11px] shadow-sm pointer-events-none">
                  <option>10 por página</option>
                </select>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-xl text-slate-300 pointer-events-none" disabled>&lt;&lt;</button>
                  <button className="p-2 rounded-xl text-slate-300 pointer-events-none" disabled>&lt;</button>
                  <span className="text-xs text-slate-500 font-bold px-3">Página 1 de 1</span>
                  <button className="p-2 rounded-xl text-slate-300 pointer-events-none" disabled>&gt;</button>
                  <button className="p-2 rounded-xl text-slate-300 pointer-events-none" disabled>&gt;&gt;</button>
                </div>
              </div>
            </div>
          </div>
          
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
              <div className="px-8 py-6 flex justify-between items-center border-b border-slate-50">
                <div>
                  <h3 className="font-black text-slate-800 text-lg tracking-tight">
                    {selectedAgent ? 'Editar Superagente' : `Configurar Superagente - Paso ${modalStep} de 3`}
                  </h3>
                  {modalStep === 1 && (
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Selecciona una plantilla para configurar rápidamente tu asistente.
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-xl"
                >
                  <X size={20}/>
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-8">
                {modalStep === 1 ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                        Selecciona tu industria
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            onClick={() => handleSelectTemplate(tmpl)}
                            className="flex items-start gap-4 p-4 text-left border border-slate-100 rounded-2xl hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/50 hover:bg-slate-50/20 transition-all group"
                          >
                            <div className={`w-12 h-12 rounded-xl ${tmpl.bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-all`}>
                              {tmpl.icon}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{tmpl.title}</p>
                              <p className="text-xs text-slate-400 font-medium mt-1">{tmpl.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex flex-col items-center justify-center">
                      <button 
                        onClick={handleConfigureManual}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-all hover:underline"
                      >
                        Mi industria no está aquí, configurar manualmente
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={selectedAgent ? async (e) => {
                    e.preventDefault();
                    const token = getAuthToken();
                    try {
                      const response = await fetch(`${API_URL}/api/agentes-ia/${selectedAgent.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          dispositivo_id: parseInt(formData.dispositivo_id),
                          nombre: formData.nombre,
                          modelo: formData.modelo,
                          instrucciones: formData.instrucciones,
                          personalidad: formData.personalidad,
                          activo: formData.activo
                        })
                      });
                      const res = await response.json();
                      if (res.success) {
                        setShowCreateModal(false);
                        fetchAgentsAndStats();
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  } : handleCreateAgent} className="space-y-6">
                    
                    {/* Dispositivo de WhatsApp */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                        Línea / Dispositivo de WhatsApp vinculada
                      </label>
                      <div className="relative">
                        <select
                          value={formData.dispositivo_id}
                          onChange={(e) => setFormData({...formData, dispositivo_id: e.target.value})}
                          className="w-full appearance-none px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-bold text-slate-700 text-sm cursor-pointer"
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
                      {devices.length === 0 && (
                        <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle size={12} /> Debes escanear un dispositivo en la sección de conexiones antes de asignarle un agente.
                        </p>
                      )}
                    </div>

                    {/* Nombre del Agente */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                        Nombre del Superagente
                      </label>
                      <input 
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        placeholder="Ej. Recepcionista Restaurante"
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>

                    {/* Modelo LLM */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                        Modelo de Inteligencia Artificial
                      </label>
                      <div className="relative">
                        <select
                          value={formData.modelo}
                          onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                          className="w-full appearance-none px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-bold text-slate-700 text-sm cursor-pointer"
                        >
                          <option value="gpt-4">GPT-4 (Recomendado - Mayor precisión)</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Veloz - Menor coste)</option>
                          <option value="gemini-pro">Gemini Pro (Excelente razonamiento)</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      </div>
                    </div>

                    {/* Instrucciones */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                        Instrucciones de Comportamiento / Rol
                      </label>
                      <textarea 
                        value={formData.instrucciones}
                        onChange={(e) => setFormData({...formData, instrucciones: e.target.value})}
                        rows={4}
                        placeholder="Escribe qué rol debe cumplir el agente, qué información maneja, etc."
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-bold text-slate-700 text-sm resize-none"
                      />
                    </div>

                    {/* Personalidad */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                        Personalidad / Tono de Voz
                      </label>
                      <textarea 
                        value={formData.personalidad}
                        onChange={(e) => setFormData({...formData, personalidad: e.target.value})}
                        rows={2}
                        placeholder="Ej. Educado, cercano, divertido, etc."
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-bold text-slate-700 text-sm resize-none"
                      />
                    </div>

                    {/* Activo switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-700">Activar agente inmediatamente</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">El agente responderá los mensajes entrantes automáticamente.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, activo: !formData.activo})}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.activo ? 'bg-[#22c55e]' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.activo ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          if (selectedAgent) {
                            setShowCreateModal(false);
                          } else {
                            setModalStep(1);
                          }
                        }}
                        className="flex-1 py-4 rounded-2xl border border-slate-100 font-black text-slate-400 text-sm hover:bg-slate-50 transition-all"
                      >
                        Atrás
                      </button>
                      <button 
                        type="submit"
                        disabled={devices.length === 0}
                        className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedAgent ? 'Guardar Cambios' : 'Finalizar Configuración'}
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
    </div>
  );
};

export default AgentesIA;
