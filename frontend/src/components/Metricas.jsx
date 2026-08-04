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
import Header from './Header';

const API_URL = import.meta.env.VITE_API_URL || '';

// Componente para selects estilizados
const StyledSelect = ({ label, value, onChange, options, placeholder, required, error }) => {
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

  const displayValue = options.find(opt =>
    (typeof opt === 'string' ? opt : opt.id.toString()) === value.toString()
  );

  const getLabel = (opt) => typeof opt === 'string' ? opt : opt.nombre;
  const getValue = (opt) => typeof opt === 'string' ? opt : opt.id;

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-2.5 rounded-xl bg-white border outline-none flex items-center justify-between transition-all cursor-pointer ${error
              ? 'border-rose-500 ring-2 ring-rose-100'
              : isOpen
                ? 'border-emerald-500 ring-2 ring-emerald-100'
                : 'border-slate-200'
            }`}
        >
          <span className={`text-xs font-bold ${value ? 'text-slate-800' : 'text-slate-400'}`}>
            {displayValue ? getLabel(displayValue) : placeholder}
          </span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 4 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[150] overflow-hidden"
            >
              <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(getValue(opt));
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                  >
                    {getLabel(opt)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-[10px] font-bold text-rose-500 mt-1">{error}</p>}
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
      { id: 'distribucion', label: 'Distribución de contactos por país', type: 'pie', desc: 'Observa la proporción de contactos segín su país...' },
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
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
    let total = data.reduce((acc, d) => acc + (d.value || 0), 0);
    if (total === 0) return <div className="text-slate-300 text-[10px] font-bold uppercase">Sin datos registrados</div>;
    let cumulative = 0;

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full p-3">
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
      <svg viewBox="0 0 100 60" className="w-full h-full p-3 overflow-visible">
        {[0, 15, 30, 45, 60].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
        ))}
        {type === 'area' && <path d={areaD} fill="#ecfdf5" opacity="0.8" />}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#10b981" />
        ))}
      </svg>
    );
  }

  if (type === 'bar') {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

    return (
      <div className="w-full h-full flex items-end gap-1.5 p-4">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md transition-all hover:opacity-80"
            style={{
              height: `${(d.value / max) * 100}%`,
              backgroundColor: colors[i % colors.length],
              minHeight: '4px'
            }}
            title={`${d.label || d.date}: ${d.value}`}
          />
        ))}
      </div>
    );
  }

  if (type === 'heatmap') {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="w-full h-full p-3 flex flex-col gap-1 overflow-hidden">
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
                    className="flex-1 h-2.5 rounded-xs bg-emerald-500"
                    style={{ opacity: opacity || 0.08 }}
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
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-emerald-500 rounded-full"
          />
          <div className="relative w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="text-center">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {(data?.[0]?.value || 0).toLocaleString()}
          </span>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">LIVE ACTIVITY</p>
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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-all group relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-[#00a8ec] flex items-center justify-center shrink-0">
            {card.type === 'stat' ? <LayoutDashboard size={18} /> : <TrendingUp size={18} />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs leading-tight">{card.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{card.period}</p>
          </div>
        </div>
        <button
          onClick={() => onDelete(card.id)}
          className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer p-1"
        >
          <X size={16} />
        </button>
      </div>

      <div className="h-36 bg-slate-50/60 rounded-xl border border-slate-100 flex items-center justify-center relative overflow-hidden">
        {loading ? (
          <Loader2 className="text-[#00a8ec] animate-spin" size={20} />
        ) : error ? (
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider px-2 text-center">{error}</p>
        ) : card.type === 'stat' ? (
          <div className="text-center">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{data.total.toLocaleString()}</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Registrado</p>
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
  const [errors, setErrors] = useState({});

  // Metadata for selects
  const [metadata, setMetadata] = useState({ tags: [], groups: [] });

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

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const config = categoryConfig[activeCategory];

  const handleCategorySelect = (key) => {
    setActiveCategory(key);
    const catObj = categoryConfig[key];
    const defaultCard = catObj.cards[0];
    setSelectedCard(defaultCard?.id || '');
    resetForm();
  };

  const handleAddCard = async () => {
    const newErrors = {};
    if (!graphName.trim()) {
      newErrors.graphName = 'El nombre del gráfico es obligatorio';
    }
    if (config.showEntitySelect && !selectedEntity) {
      newErrors.entity = `Debes seleccionar ${mode === 'campanas' ? 'una campaña' : 'un grupo o tag'}`;
    }
    if (config.showFilter && !selectedFilter) {
      newErrors.filter = 'Debes seleccionar una opción de filtro';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const newCard = {
      id: Date.now(),
      category: activeCategory,
      chartId: selectedCard,
      name: graphName.trim(),
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
    setErrors({});
  };

  const getEntityOptions = () => {
    if (config.entityType === 'tags') return metadata.tags;
    if (config.entityType === 'groups') return metadata.groups;
    return [];
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-emerald-200/50">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="ml-20 flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={onLogout} title="GeoChat" onRefresh={loadDashboard} isLoading={loading} />

        <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] border border-slate-100">

        {/* Header Dashboard (Shown when cards exist) */}
        {dashboardCards.length > 0 && (
          <header className="px-7 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Analítica</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Centro de control de métricas</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-100 cursor-pointer"
            >
              <Plus size={15} />
              Nueva tarjeta
            </button>
          </header>
        )}

        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col min-w-0 custom-scrollbar">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="text-emerald-500 animate-spin" size={36} />
            </div>
          ) : dashboardCards.length === 0 ? (
            /* EMPTY STATE MATCHING SCREENSHOT 1 WITH BRAND EMERALD THEME */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-full bg-emerald-50/80 border border-emerald-100 flex items-center justify-center mb-6 text-emerald-600 shadow-2xs">
                <PieChart size={38} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
                Crea tu primer panel de métricas personalizado
              </h2>
              <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                Organiza y visualiza tus datos más importantes en un solo lugar. Personaliza tu tablero según las necesidades de tu negocio.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-emerald-100 cursor-pointer"
              >
                <Plus size={15} />
                Empieza ahora
              </button>
            </div>
          ) : (
            /* POPULATED DASHBOARD GRID MATCHING SCREENSHOT 3 */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dashboardCards.map(card => (
                <MetricCard key={card.id} card={card} onDelete={handleDeleteCard} token={user?.token} />
              ))}
            </div>
          )}
        </div>
        </div>
        </div>
      </main>

      {/* Modal - Añadir Tarjeta (MATCHING SCREENSHOT 2 WITH BRAND EMERALD THEME) */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center lg:pl-[21rem] pr-5 p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-[960px] bg-white rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[88vh] border border-slate-100 z-10"
            >
              {/* Sidebar del Modal */}
              <div className="w-full lg:w-[280px] bg-slate-50/70 border-r border-slate-100 p-6 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                <div className="mb-6">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Añadir tarjeta</h2>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    Selecciona la opción que mejor se adapte a tus necesidades.
                  </p>
                </div>

                <div className="space-y-6">
                  {categories.map(cat => (
                    <div key={cat.group}>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{cat.group}</h3>
                      <div className="space-y-1">
                        {cat.items.map(item => (
                          <button
                            key={item.key}
                            onClick={() => handleCategorySelect(item.key)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${activeCategory === item.key
                                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-bold'
                                : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                              }`}
                          >
                            <span className={activeCategory === item.key ? 'text-emerald-600' : 'text-slate-400'}>
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
              <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col bg-white custom-scrollbar">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">{config.title}</h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{config.description}</p>
                  </div>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Previsualización de Gráficos (Opciones seleccionables) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {config.cards.map(card => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCard(card.id)}
                      className={`relative rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${selectedCard === card.id
                          ? 'border-emerald-500 bg-white shadow-xs ring-2 ring-emerald-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                      {selectedCard === card.id && (
                        <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs z-10">
                          <CircleDot size={10} />
                        </div>
                      )}

                      <div className="h-32 bg-slate-50/60 rounded-xl border border-slate-100 flex items-center justify-center mb-3 overflow-hidden">
                        {card.type === 'stat' ? (
                          <div className="text-center">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">1.384</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Registrado</p>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MiniChart type={card.type} data={[{ value: 10 }, { value: 20 }, { value: 15 }, { value: 25 }]} />
                          </div>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">{card.label}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                        {card.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Formulario de Configuración */}
                <div className="space-y-5 max-w-2xl">
                  {/* Nombre del Gráfico */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      NOMBRE DEL GRÁFICO <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ingresa el nombre del gráfico"
                      value={graphName}
                      onChange={(e) => {
                        setGraphName(e.target.value);
                        if (errors.graphName) setErrors(prev => ({ ...prev, graphName: null }));
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl bg-white border outline-none text-xs font-bold text-slate-800 transition-all shadow-2xs placeholder:text-slate-400 ${errors.graphName ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 focus:border-emerald-500'
                        }`}
                    />
                    <div className="flex justify-between items-center px-0.5">
                      {errors.graphName ? (
                        <p className="text-[10px] font-bold text-rose-500">{errors.graphName}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{graphName.length}/60 CARACTERES</p>
                      )}
                    </div>
                  </div>

                  {/* Selector de Modo (Campañas / Grupos) */}
                  {config.showModeSelector && (
                    <div className="flex items-center gap-6 py-1">
                      <button
                        type="button"
                        onClick={() => setMode('campanas')}
                        className="flex items-center gap-2 group outline-none cursor-pointer"
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${mode === 'campanas' ? 'border-emerald-500' : 'border-slate-300'}`}>
                          {mode === 'campanas' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        </div>
                        <span className={`text-xs font-bold transition-all ${mode === 'campanas' ? 'text-slate-900' : 'text-slate-400'}`}>Campañas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('grupos')}
                        className="flex items-center gap-2 group outline-none cursor-pointer"
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${mode === 'grupos' ? 'border-emerald-500' : 'border-slate-300'}`}>
                          {mode === 'grupos' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        </div>
                        <span className={`text-xs font-bold transition-all ${mode === 'grupos' ? 'text-slate-900' : 'text-slate-400'}`}>Grupos o comunidades</span>
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
                      onChange={(val) => {
                        setSelectedEntity(val);
                        if (errors.entity) setErrors(prev => ({ ...prev, entity: null }));
                      }}
                      options={getEntityOptions()}
                      error={errors.entity}
                    />
                  )}

                  {/* Selección de Filtro */}
                  {config.showFilter && (
                    <StyledSelect
                      label={config.filterLabel}
                      required
                      placeholder="Selecciona una opción"
                      value={selectedFilter}
                      onChange={(val) => {
                        setSelectedFilter(val);
                        if (errors.filter) setErrors(prev => ({ ...prev, filter: null }));
                      }}
                      options={config.filterOptions}
                      error={errors.filter}
                    />
                  )}

                  {/* Selección de Periodo */}
                  <StyledSelect
                    label="SELECCIONA EL PERIODO A ANALIZAR"
                    placeholder="Selecciona el periodo"
                    value={selectedPeriod}
                    onChange={setSelectedPeriod}
                    options={periodOptions}
                  />
                </div>

                <div className="mt-8 pt-6 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCard}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-100 active:scale-95 cursor-pointer"
                  >
                    AGREGAR TARJETA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{
        __html: `
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
