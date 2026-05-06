import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, 
  CircleDot, 
  X, 
  LayoutDashboard, 
  Plus, 
  BarChart3, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Globe, 
  Tag, 
  ChevronDown,
  LineChart as LineChartIcon,
  Search,
  Loader2,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

// Componente para selects estilizados como en las fotos
const StyledSelect = ({ label, value, onChange, options, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalizar opciones (pueden ser strings o objetos {id, nombre})
  const displayValue = options.find(opt => 
    (typeof opt === 'string' ? opt : opt.id.toString()) === value.toString()
  );

  const getLabel = (opt) => typeof opt === 'string' ? opt : opt.nombre;
  const getValue = (opt) => typeof opt === 'string' ? opt : opt.id;

  return (
    <div className="space-y-3" ref={containerRef}>
      {label && (
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          {label} {required && <span className="text-rose-500 text-lg">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-14 px-6 rounded-2xl bg-white border outline-none flex items-center justify-between transition-all ${
            isOpen ? 'border-[#6366f1] ring-4 ring-indigo-50/50' : 'border-slate-200'
          }`}
        >
          <span className={`text-[13px] font-bold ${value ? 'text-slate-700' : 'text-slate-400'}`}>
            {displayValue ? getLabel(displayValue) : placeholder}
          </span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 4 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[150] overflow-hidden"
            >
              <div className="max-h-[240px] overflow-y-auto py-2 custom-scrollbar">
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(getValue(opt));
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-6 py-3.5 text-[13px] font-bold text-[#6366f1] hover:bg-[#f1f5f9] transition-all"
                  >
                    {getLabel(opt)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const categoryConfig = {
  contactos_nuevos: {
    title: 'Contactos nuevos',
    description: 'Visualiza cuántos contactos nuevos se agregaron en el periodo seleccionado.',
    cards: [
      { id: 'evolucion', label: 'Evolución diaria', type: 'area', desc: 'Visualiza cómo varía el registro de nuevos contactos.' },
      { id: 'total', label: 'Total registrado', type: 'stat', desc: 'Muestra la suma total de contactos registrados en el...' }
    ],
    showEntitySelect: false,
    showModeSelector: false,
    showFilter: false,
  },
  contactos_tag: {
    title: 'Contactos por tag',
    description: 'Mide y compara cuántos contactos tiene cada tag en el periodo seleccionado.',
    cards: [
      { id: 'distribucion', label: 'Distribución de contactos por tag', type: 'pie', desc: 'Visualiza la proporción de contactos que tiene cada...' },
      { id: 'comparativo', label: 'Comparativo de contactos por tag', type: 'bar', desc: 'Compara fácilmente la cantidad de contactos asignados a cada...' }
    ],
    showEntitySelect: true,
    entityLabel: 'Selecciona los tags a analizar',
    entityType: 'tags',
    showModeSelector: false,
    showFilter: false,
  },
  contactos_pais: {
    title: 'Contactos por país',
    description: 'Mide y analiza cuántos contactos tienes por país en el periodo elegido.',
    cards: [
      { id: 'distribucion', label: 'Distribución de contactos por país', type: 'pie', desc: 'Observa la proporción de contactos según su país...' },
      { id: 'comparativo', label: 'Comparativo de contactos por país', type: 'bar', desc: 'Compara fácilmente la cantidad total de contactos...' }
    ],
    showEntitySelect: false,
    showModeSelector: false,
    showFilter: false,
  },
  mensajes_recibidos: {
    title: 'Mensajes recibidos',
    description: 'Mide y analiza la cantidad de mensajes recibidos en el periodo seleccionado.',
    cards: [
      { id: 'tendencia', label: 'Tendencia de mensajes recibidos', type: 'area', desc: 'Visualiza la evolución diaria de los mensajes recibi...' },
      { id: 'total', label: 'Total registrado', type: 'stat', desc: 'Muestra la suma total de mensajes recibidos en el...' }
    ],
    showEntitySelect: false,
    showModeSelector: false,
    showFilter: false,
  },
  cantidad_participantes: {
    title: 'Cantidad de participantes',
    description: 'Mide y analiza la cantidad de participantes según campañas, grupo/comunidad en el periodo seleccionado.',
    cards: [
      { id: 'distribucion', label: 'Distribución de participantes por grupo/comunidad o campaña', type: 'pie', desc: 'Compara la proporción de participantes activos e i...' },
      { id: 'total', label: 'Total registrado', type: 'stat', desc: 'Consulta la cantidad total de participantes en el periodo elegido. Puedes filtrar por grupo/comunidad, campaña o estatus.' }
    ],
    showEntitySelect: true,
    entityLabel: 'Selecciona el grupo/comunidad o campaña a analizar',
    entityType: 'groups',
    showModeSelector: true,
    showFilter: true,
    filterLabel: 'Filtra por participantes activos o inactivos',
    filterOptions: ['Participantes activos', 'Participantes inactivos', 'Ambas'],
  },
  insights_ia: {
    title: 'Insights con IA',
    description: 'Análisis predictivo y de sentimiento basado en el comportamiento de tus chats.',
    cards: [
      { id: 'sentimiento', label: 'Análisis de Sentimiento', type: 'pie', desc: 'Detecta el tono predominante (Positivo, Neutro, Negativo) en tus conversaciones.' },
      { id: 'temperatura', label: 'Temperatura de Leads', type: 'bar', desc: 'Identifica los grupos o contactos con mayor probabilidad de conversión.' },
      { id: 'prediccion', label: 'Predicción de Crecimiento', type: 'area', desc: 'Estima el crecimiento de tus contactos en los próximos 30 días.' }
    ],
    showEntitySelect: true,
    entityLabel: 'Selecciona el grupo o tag para el análisis',
    entityType: 'groups',
    showModeSelector: true,
    showFilter: false,
  },
  heatmap_actividad: {
    title: 'Mapa de Calor de Actividad',
    description: 'Descubre los días y horas con mayor tráfico de mensajes.',
    cards: [
      { id: 'densidad', label: 'Densidad de mensajes', type: 'heatmap', desc: 'Visualiza los picos de actividad por hora y día de la semana.' },
      { id: 'mejor_hora', label: 'Mejor hora para envío', type: 'stat', desc: 'Identifica el momento exacto con mayor tasa de apertura histórica.' }
    ],
    showEntitySelect: false,
    showModeSelector: false,
    showFilter: false,
  },
  monitor_pulse: {
    title: 'Monitor Live "Pulse"',
    description: 'Visualización en tiempo real del flujo de tu plataforma.',
    cards: [
      { id: 'live_counter', label: 'Contador en tiempo real', type: 'pulse', desc: 'Observa cómo crecen tus mensajes y contactos segundo a segundo.' }
    ],
    showEntitySelect: false,
    showModeSelector: false,
    showFilter: false,
  },
  ranking_agentes: {
    title: 'Ranking de Agentes',
    description: 'Compara el desempeño de tus agentes de IA o humanos.',
    cards: [
      { id: 'eficiencia', label: 'Top Agentes por Conversión', type: 'bar', desc: 'Ranking de agentes con más clics o cierres generados.' },
      { id: 'respuesta', label: 'Tiempo de respuesta', type: 'area', desc: 'Evolución del tiempo promedio de respuesta por agente.' }
    ],
    showEntitySelect: false,
    showModeSelector: false,
    showFilter: false,
  },
  cantidad_ingresos_salidas: {
    title: 'Cantidad de ingresos y salidas',
    description: 'Visualiza la cantidad de ingresos y salidas en tu grupo/comunidad o campaña durante el periodo seleccionado.',
    cards: [
      { id: 'distribucion', label: 'Distribución de ingresos y salidas', type: 'pie', desc: 'Visualiza la proporción de ingresos y salidas dentr...' },
      { id: 'tendencia', label: 'Tendencia acumulada', type: 'area', desc: 'Observa la tendencia acumulada de ingresos y sali...' },
      { id: 'evolucion', label: 'Evolución diaria', type: 'line', desc: 'Analiza la variación diaria de ingresos y salidas per...' },
      { id: 'total', label: 'Total registrado', type: 'stat', desc: 'Muestra el total de ingresos o salidas según el filtr...' }
    ],
    showEntitySelect: true,
    entityLabel: 'Selecciona el grupo/comunidad o campaña a analizar',
    entityType: 'groups',
    showModeSelector: true,
    showFilter: true,
    filterLabel: 'Selecciona si deseas ver ingresos o salidas',
    filterOptions: ['Ingresos', 'Salidas', 'Ambos'],
  },
  cantidad_clics: {
    title: 'Cantidad de clics',
    description: 'Consulta y analiza cuántos clics se registraron en tu grupo/comunidad o campaña durante el periodo seleccionado.',
    cards: [
      { id: 'evolucion', label: 'Evolución de clics', type: 'area', desc: 'Visualiza la tendencia de clics por grupo/comunida...' },
      { id: 'total', label: 'Total registrado', type: 'stat', desc: 'Muestra el total de clics registrados en el grupo/ca...' }
    ],
    showEntitySelect: true,
    entityLabel: 'Selecciona el grupo/comunidad o campaña a analizar',
    entityType: 'groups',
    showModeSelector: true,
    showFilter: false,
  },
  cantidad_grupos: {
    title: 'Cantidad de grupos/comunidades',
    description: 'Consulta cómo crece y varía el número de grupos/comunidades durante el periodo seleccionado.',
    cards: [
      { id: 'tendencia', label: 'Evolución de grupos/comunidades', type: 'area', desc: 'Muestra el cambio en el total de grupos/comunida...' },
      { id: 'total', label: 'Total registrado', type: 'stat', desc: 'Total de grupos/comunidades existentes en el per...' }
    ],
    showEntitySelect: false,
    showModeSelector: false,
    showFilter: false,
  }
};

const categories = [
  {
    group: 'INNOVACIÓN IA',
    items: [
      { key: 'insights_ia', label: 'Insights con IA', icon: <Bot size={16} /> },
      { key: 'heatmap_actividad', label: 'Mapa de Calor', icon: <Globe size={16} /> },
      { key: 'monitor_pulse', label: 'Monitor Pulse', icon: <TrendingUp size={16} /> },
      { key: 'ranking_agentes', label: 'Ranking Agentes', icon: <Users size={16} /> }
    ]
  },
  {
    group: 'INTERACCIONES 1 A 1',
    items: [
      { key: 'contactos_nuevos', label: 'Contactos nuevos', icon: <Users size={16} /> },
      { key: 'contactos_tag', label: 'Contactos por tag', icon: <Tag size={16} /> },
      { key: 'contactos_pais', label: 'Contactos por país', icon: <Globe size={16} /> },
      { key: 'mensajes_recibidos', label: 'Mensajes recibidos', icon: <MessageSquare size={16} /> }
    ]
  },
  {
    group: 'GRUPOS Y COMUNIDADES',
    items: [
      { key: 'cantidad_participantes', label: 'Cantidad de participantes', icon: <Users size={16} /> },
      { key: 'cantidad_ingresos_salidas', label: 'Cantidad de ingresos y salidas', icon: <TrendingUp size={16} /> },
      { key: 'cantidad_clics', label: 'Cantidad de clics', icon: <LayoutDashboard size={16} /> },
      { key: 'cantidad_grupos', label: 'Cantidad de grupos/comunidades', icon: <Users size={16} /> }
    ]
  }
];

const periodOptions = ['Hoy', 'Últimos 3 días', 'Últimos 7 días', 'Últimos 30 días', 'Últimos 90 días', 'Personalizado'];

const MiniChart = ({ type, data }) => {
  if (type === 'pie') {
    if (!data || data.length === 0) return <div className="text-slate-300 text-[10px] font-bold uppercase">Sin datos</div>;
    const colors = ['#ff5a8e', '#3b82f6', '#ffb84d', '#ff8c42', '#10b981'];
    let total = data.reduce((acc, d) => acc + d.value, 0);
    if (total === 0) return <div className="text-slate-300 text-[10px] font-bold uppercase">Sin datos registrados</div>;
    let cumulative = 0;

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full p-4">
        {data.map((d, i) => {
          const startAngle = (cumulative / total) * 360;
          const endAngle = ((cumulative + d.value) / total) * 360;
          cumulative += d.value;
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;
          const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
          const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
          const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
          const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);

          return (
            <path 
              key={i}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`} 
              fill={colors[i % colors.length]} 
            />
          );
        })}
      </svg>
    );
  }
  
  if (type === 'area' || type === 'line') {
    if (!data || data.length < 2) return <div className="text-slate-300 text-[10px] font-bold uppercase">Sin datos suficientes</div>;
    const max = Math.max(...data.map(d => d.value), 1);
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 60 - (d.value / max) * 45
    }));

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const areaD = `${pathD} V 60 H 0 Z`;

    return (
      <svg viewBox="0 0 100 60" className="w-full h-full p-4 overflow-visible">
        {[0, 15, 30, 45, 60].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
        ))}
        {type === 'area' && <path d={areaD} fill="#eef2ff" opacity="0.8" />}
        <path d={pathD} fill="none" stroke={type === 'area' ? '#6366f1' : '#ff5a8e'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={type === 'area' ? '#6366f1' : '#ff5a8e'} />
        ))}
      </svg>
    );
  }

  if (type === 'bar') {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    const colors = ['#ffb84d', '#ff5a8e', '#3b82f6', '#ff8c42', '#10b981'];

    return (
      <div className="w-full h-full flex items-end gap-2 p-6">
        {data.map((d, i) => (
          <div 
            key={i} 
            className="flex-1 rounded-t-lg transition-all hover:opacity-80" 
            style={{ 
              height: `${(d.value / max) * 100}%`, 
              backgroundColor: colors[i % colors.length],
              minHeight: '4px'
            }} 
            title={`${d.label}: ${d.value}`}
          />
        ))}
      </div>
    );
  }

  if (type === 'heatmap') {
    // 7 days x 24 hours
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const hours = Array.from({length: 24}, (_, i) => i);
    
    return (
      <div className="w-full h-full p-4 flex flex-col gap-1 overflow-hidden">
        <div className="flex gap-1 ml-4">
          {[0, 6, 12, 18].map(h => (
            <span key={h} className="flex-1 text-[8px] text-slate-400 font-bold">{h}h</span>
          ))}
        </div>
        {days.map((day, di) => (
          <div key={day} className="flex gap-1 items-center">
            <span className="w-3 text-[8px] text-slate-400 font-bold">{day}</span>
            <div className="flex-1 flex gap-0.5">
              {hours.map(h => {
                const val = data?.find(d => d.day === di && d.hour === h)?.value || 0;
                const opacity = Math.min(val / 10, 1);
                return (
                  <div 
                    key={h}
                    className="flex-1 h-3 rounded-sm bg-[#6366f1]"
                    style={{ opacity: opacity || 0.05 }}
                    title={`${day} ${h}h: ${val} mensajes`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-[#6366f1] rounded-full"
          />
          <div className="relative w-20 h-20 bg-[#6366f1] rounded-full flex items-center justify-center text-white shadow-xl">
             <TrendingUp size={32} />
          </div>
        </div>
        <div className="text-center">
           <span className="text-3xl font-black text-slate-800 tracking-tighter">
             {(data?.[0]?.value || 0).toLocaleString()}
           </span>
           <p className="text-[10px] font-black text-[#6366f1] uppercase tracking-[0.2em] mt-1">Live Activity</p>
        </div>
      </div>
    );
  }
  return null;
};

const MetricCard = ({ card, onDelete, token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const periodMap = {
          'Hoy': '24h',
          'Últimos 3 días': '3d',
          'Últimos 7 días': '7d',
          'Últimos 30 días': '30d',
          'Últimos 90 días': '90d'
        };

        const response = await fetch(`${API_URL}/api/metrics/stats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            category: card.category,
            period: periodMap[card.period] || '7d',
            tags: card.category === 'contactos_tag' ? (card.entity ? [card.entity] : []) : [],
            participants: card.category === 'cantidad_participantes' ? (card.entity ? [card.entity] : []) : []
          })
        });
        const result = await response.json();
        if (result.success) {
          setData(result);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError('Error al conectar con el servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [card, token]);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#6366f1]">
            {card.type === 'stat' ? <LayoutDashboard size={22} /> : <TrendingUp size={22} />}
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm leading-tight">{card.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{card.period}</p>
          </div>
        </div>
        <button 
           onClick={() => onDelete(card.id)}
           className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="h-48 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex items-center justify-center mb-6 relative">
        {loading ? (
          <Loader2 className="text-[#6366f1] animate-spin" size={24} />
        ) : error ? (
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{error}</p>
        ) : card.type === 'stat' ? (
          <div className="text-center">
            <span className="text-4xl font-black text-slate-800 tracking-tight">{data.total.toLocaleString()}</span>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Total Registrado</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
             <MiniChart type={card.type} data={data.data} />
          </div>
        )}
      </div>
    </div>
  );
};

const Metricas = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [activeCategory, setActiveCategory] = useState('contactos_nuevos');
  const [selectedCard, setSelectedCard] = useState('evolucion');
  const [graphName, setGraphName] = useState('');
  const [mode, setMode] = useState('grupos');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('Hoy');
  const [dashboardCards, setDashboardCards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Metadata for selects
  const [metadata, setMetadata] = useState({ tags: [], groups: [] });

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.token) return;
      setLoading(true);
      try {
        const token = user.token;
        // Load Cards
        const dashRes = await fetch(`${API_URL}/api/metrics/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dashData = await dashRes.json();
        if (dashData.success) setDashboardCards(dashData.cards);

        // Load Metadata
        const metaRes = await fetch(`${API_URL}/api/metrics/entities`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const metaData = await metaRes.json();
        if (metaData.success) setMetadata(metaData);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const config = categoryConfig[activeCategory];

  const handleCategorySelect = (key) => {
    setActiveCategory(key);
    const defaultCard = categoryConfig[key].cards[0]?.id || '';
    setSelectedCard(defaultCard);
    resetForm();
  };

  const handleAddCard = async () => {
    const newCard = {
      id: Date.now(),
      category: activeCategory,
      chartId: selectedCard,
      name: graphName || config.title,
      mode,
      entity: selectedEntity,
      filter: selectedFilter,
      period: selectedPeriod,
      type: config.cards.find(c => c.id === selectedCard)?.type
    };
    
    const updatedCards = [...dashboardCards, newCard];
    setDashboardCards(updatedCards);
    setIsCreating(false);
    resetForm();

    // Persist to backend
    try {
      const token = user?.token;
      if (!token) return;
      await fetch(`${API_URL}/api/metrics/dashboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cards: updatedCards })
      });
    } catch (err) {
      console.error('Error saving dashboard:', err);
    }
  };

  const handleDeleteCard = async (id) => {
    const updatedCards = dashboardCards.filter(c => c.id !== id);
    setDashboardCards(updatedCards);
    
    try {
      const token = user?.token;
      if (!token) return;
      await fetch(`${API_URL}/api/metrics/dashboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cards: updatedCards })
      });
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  const resetForm = () => {
    setGraphName('');
    setSelectedEntity('');
    setSelectedFilter('');
    setSelectedPeriod('Hoy');
  };

  const getEntityOptions = () => {
    if (config.entityType === 'tags') return metadata.tags;
    if (config.entityType === 'groups') return metadata.groups;
    return [];
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} />
      
      <div className="flex-1 ml-28 lg:ml-32 h-screen overflow-y-auto flex flex-col custom-scrollbar">
        {/* Header Dashboard */}
        {dashboardCards.length > 0 && (
          <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-40">
            <div>
              <h1 className="text-[22px] font-black text-slate-800 tracking-tight">Analítica</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Centro de control de métricas</p>
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="h-11 px-6 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
            >
              <Plus size={18} />
              Nueva tarjeta
            </button>
          </header>
        )}

        <main className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="text-[#6366f1] animate-spin" size={48} />
            </div>
          ) : dashboardCards.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10">
              <div className="relative w-32 h-32 mb-10">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#6366f1] opacity-60">
                   <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" />
                   <path d="M50 5 L50 50 L95 50" fill="none" stroke="currentColor" strokeWidth="1.5" />
                   <path d="M50 50 L20 80" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <h2 className="text-[26px] font-black text-[#0f172a] mb-5 tracking-tight text-center">
                Crea tu primer panel de métricas personalizado
              </h2>
              <p className="text-slate-400 text-[13px] font-medium max-w-lg text-center mb-10 leading-[1.8]">
                Organiza y visualiza tus datos más importantes en un solo lugar. Personaliza tu tablero según las necesidades de tu negocio.
              </p>
              <button 
                onClick={() => setIsCreating(true)}
                className="h-14 px-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl shadow-indigo-50"
              >
                <Plus size={18} />
                Empieza ahora
              </button>
            </div>
          ) : (
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {dashboardCards.map(card => (
                <MetricCard key={card.id} card={card} onDelete={handleDeleteCard} token={user?.token} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal - Añadir Tarjeta */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 lg:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[1240px] bg-white rounded-[3rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[90vh]"
            >
              {/* Sidebar del Modal */}
              <div className="w-full lg:w-[320px] bg-white border-r border-slate-100 p-10 flex flex-col gap-10 shrink-0 overflow-y-auto">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Añadir tarjeta</h2>
                  <p className="text-[13px] text-slate-500 font-medium leading-relaxed mt-4">
                    Selecciona la opción que mejor se adapte a tus necesidades.
                  </p>
                </div>

                <div className="space-y-10">
                  {categories.map(cat => (
                    <div key={cat.group}>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">{cat.group}</h3>
                      <div className="space-y-1">
                        {cat.items.map(item => (
                          <button
                            key={item.key}
                            onClick={() => handleCategorySelect(item.key)}
                            className={`w-full text-left px-5 py-4 rounded-2xl text-[13px] font-bold transition-all flex items-center gap-3 ${
                              activeCategory === item.key 
                              ? 'bg-[#f1f5f9] text-[#0f172a]' 
                              : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <span className={activeCategory === item.key ? 'text-[#6366f1]' : 'text-slate-300'}>
                              {item.icon}
                            </span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="flex-1 p-10 lg:p-12 overflow-y-auto flex flex-col bg-white">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{config.title}</h2>
                    <p className="text-sm text-slate-500 mt-2 font-medium">{config.description}</p>
                  </div>
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="w-12 h-12 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Previsualización de Gráficos */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                  {config.cards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCard(card.id)}
                      className={`relative rounded-[2.3rem] border-2 p-5 text-left transition-all ${
                        selectedCard === card.id 
                        ? 'border-[#7c3aed] bg-white shadow-xl shadow-indigo-50' 
                        : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      {selectedCard === card.id && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shadow-lg z-10">
                          <CircleDot size={12} />
                        </div>
                      )}
                      
                      <div className="h-44 bg-white rounded-[1.8rem] border border-slate-100 flex items-center justify-center mb-5 overflow-hidden">
                        {card.type === 'stat' ? (
                          <div className="text-center">
                            <span className="text-[44px] font-black text-[#0f172a] tracking-tighter">1.384</span>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Registrado</p>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                             <MiniChart type={card.type} data={[{value: 10}, {value: 20}, {value: 15}, {value: 25}]} />
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest leading-relaxed">{card.label}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">
                        {card.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Formulario de Configuración */}
                <div className="space-y-8 max-w-4xl">
                  {/* Nombre del Gráfico */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Nombre del gráfico <span className="text-rose-500 text-lg">*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="Ingresa el nombre del gráfico"
                      value={graphName}
                      onChange={(e) => setGraphName(e.target.value)}
                      className="w-full h-14 px-6 rounded-2xl bg-white border border-slate-200 outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-indigo-50/50 text-[13px] font-bold text-slate-700 transition-all"
                    />
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{graphName.length}/60 CARACTERES</p>
                    </div>
                  </div>

                  {/* Selector de Modo (Campañas / Grupos) */}
                  {config.showModeSelector && (
                    <div className="flex items-center gap-8">
                      <button 
                        onClick={() => setMode('campanas')}
                        className="flex items-center gap-3 group outline-none"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${mode === 'campanas' ? 'border-[#6366f1]' : 'border-slate-200 group-hover:border-slate-300'}`}>
                          {mode === 'campanas' && <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />}
                        </div>
                        <span className={`text-[13px] font-bold transition-all ${mode === 'campanas' ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-500'}`}>Campañas</span>
                      </button>
                      <button 
                        onClick={() => setMode('grupos')}
                        className="flex items-center gap-3 group outline-none"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${mode === 'grupos' ? 'border-[#6366f1]' : 'border-slate-200 group-hover:border-slate-300'}`}>
                          {mode === 'grupos' && <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />}
                        </div>
                        <span className={`text-[13px] font-bold transition-all ${mode === 'grupos' ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-500'}`}>Grupos o comunidades</span>
                      </button>
                    </div>
                  )}

                  {/* Selección de Entidad */}
                  {config.showEntitySelect && (
                    <StyledSelect 
                      label={config.entityLabel}
                      required
                      placeholder={`Seleccionar ${mode === 'campanas' ? 'campañas' : 'grupos'}`}
                      value={selectedEntity}
                      onChange={setSelectedEntity}
                      options={getEntityOptions()}
                    />
                  )}

                  {/* Selección de Filtro */}
                  {config.showFilter && (
                    <StyledSelect 
                      label={config.filterLabel}
                      required
                      placeholder="Selecciona una opción"
                      value={selectedFilter}
                      onChange={setSelectedFilter}
                      options={config.filterOptions}
                    />
                  )}

                  {/* Selección de Periodo */}
                  <StyledSelect 
                    label="Selecciona el periodo a analizar"
                    placeholder="Selecciona el periodo"
                    value={selectedPeriod}
                    onChange={setSelectedPeriod}
                    options={periodOptions}
                  />
                </div>

                <div className="mt-auto pt-10 flex items-center justify-end gap-4 border-t border-slate-50">
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="h-14 px-10 rounded-2xl border border-slate-200 text-[#6366f1] font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAddCard}
                    className="h-14 px-10 rounded-2xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-100"
                  >
                    Agregar tarjeta
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

export default Metricas;
