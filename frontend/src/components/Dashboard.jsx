// frontend/src/components/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Plus,
  RefreshCw,
  Smartphone,
  User,
  Users,
  WifiOff,
  MoreVertical,
} from 'lucide-react';
import Sidebar from './Sidebar';
import WhatsAppConnector from './WhatsAppConnector';
import { SkeletonStatCard } from './Skeleton';

/* ── Variantes de animación del Dashboard ── */
const fadeUp = {
  hidden:  { opacity: 0, y: 18 },
  visible: (delay = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }
  })
};

const cardPop = {
  hidden:  { opacity: 0, scale: 0.94, y: 14 },
  visible: (delay = 0) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }
  })
};

const API_URL = import.meta.env.VITE_API_URL || '';
const emptyDashboard = {
  plan: {
    nombre: 'Cargando...',
    estado: '',
    periodo: '',
    fecha_inicio: null,
    fecha_vencimiento: null,
    limits: { contactos: 0, dispositivos: 0, agentes: 0 },
  },
  usage: { contactos: 0, dispositivos: 0, dispositivos_conectados: 0, agentes: 0 },
  devices: [],
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-EC');
}

function formatLimit(value) {
  const number = Number(value || 0);
  if (number >= 999999) return 'Ilimitado';
  return formatNumber(number);
}

function formatDate(value) {
  if (!value) return 'Sin fecha registrada';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function statusStyles(status) {
  if (status === 'conectado') return 'bg-indigo-50 text-emerald-700 border-indigo-200';
  if (status === 'conectando') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-500 border-slate-200';
}

function planStatusLabel(status) {
  const labels = {
    activa: 'Activa', prueba: 'Prueba', vencida: 'Vencida',
    cancelada: 'Cancelada', sin_suscripcion: 'Sin suscripción',
  };
  return labels[status] || status || 'Sin estado';
}

function DeviceCard({ device }) {
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-[#c7d2fe] flex flex-col items-center shadow-sm hover:shadow-xl hover:border-[#6366f1] transition-all duration-300 group">
      <div className="w-20 h-20 bg-[#eef2ff] rounded-full mb-5 flex items-center justify-center border-2 border-[#a5b4fc] shadow-sm group-hover:scale-105 transition-transform">
        <Smartphone size={38} className="text-[#6366f1]" />
      </div>
      <h4 className="font-bold text-sm uppercase tracking-tight text-[#1e1b4b] text-center">
        {device.nombre || 'Mi WhatsApp'}
      </h4>
      <p className="text-xs text-[#818cf8] font-bold mt-1">
        {device.numero_telefono || device.dispositivo_id || 'Sin número asignado'}
      </p>
      <div className={`text-[10px] px-6 py-1.5 rounded-full font-bold my-5 uppercase tracking-widest border ${statusStyles(device.estado)}`}>
        {device.estado || 'desconectado'}
      </div>
      <p className="text-[11px] text-[#9ca3af] font-medium text-center">
        {device.conectado_en ? `Conectado: ${formatDate(device.conectado_en)}` : `Creado: ${formatDate(device.creado_en)}`}
      </p>
    </div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [newDevice, setNewDevice] = useState(null);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    if (!user?.id) { setError('No se encontró el usuario activo.'); setIsLoading(false); return; }
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/dashboard/${user.id}`);
      const data = await response.json();
      if (!data.success) { setError(data.message || 'No se pudo cargar el dashboard.'); return; }
      setDashboard(data.dashboard || emptyDashboard);
    } catch { setError('Error de conexión al cargar el dashboard.'); }
    finally { setIsLoading(false); }
  };

  const handleDeployNode = async () => {
    if (!user?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/dispositivos/ensure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        setNewDevice({ id: data.device_id, nombre: 'Nueva Terminal' });
        setIsConnectorOpen(true);
        loadDashboard();
      } else { setError(data.message || 'Error al desplear nueva terminal.'); }
    } catch { setError('Falla crítica en el despliegue de red.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadDashboard(); }, [user?.id]);

  const availableDeviceSlots = useMemo(() => {
    const max = Number(dashboard.plan?.limits?.dispositivos || 0);
    const used = Number(dashboard.usage?.dispositivos || 0);
    return Math.max(max - used, 0);
  }, [dashboard]);

  const roleLabel = user?.rol || 'admin';

  /* ────────────── Stat cards config ────────────── */
  const statCards = [
    {
      label: 'Directorio',
      desc: 'Contactos registrados',
      current: dashboard.usage?.contactos,
      limit: dashboard.plan?.limits?.contactos,
      icon: Users,
      iconBg: 'bg-[#f0f0ff]',
      iconColor: 'text-[#5b5cfb]',
      iconBorder: 'border-[#e0e0ff]',
      barColor: 'bg-[#5b5cfb]',
      pctColor: 'text-[#5b5cfb]',
    },
    {
      label: 'Operadores',
      desc: 'Operadores activos',
      current: dashboard.usage?.agentes,
      limit: dashboard.plan?.limits?.agentes,
      icon: User,
      iconBg: 'bg-[#e0f7ff]',
      iconColor: 'text-[#3cd3f7]',
      iconBorder: 'border-[#d0f2ff]',
      barColor: 'bg-[#3cd3f7]',
      pctColor: 'text-[#3cd3f7]',
    },
    {
      label: 'Terminales',
      desc: 'Terminales en uso',
      current: dashboard.usage?.dispositivos,
      limit: dashboard.plan?.limits?.dispositivos,
      icon: Smartphone,
      iconBg: 'bg-[#f0f0ff]',
      iconColor: 'text-[#5b5cfb]',
      iconBorder: 'border-[#e0e0ff]',
      barColor: 'bg-[#5b5cfb]',
      pctColor: 'text-[#5b5cfb]',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans selection:bg-indigo-100/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-8 my-6 flex flex-col min-w-0 h-[calc(100vh-48px)] overflow-hidden">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="h-16 flex items-center justify-end gap-6 px-4 z-50 shrink-0"
        >
          <div className="flex items-center gap-6 text-gray-500">
            <button
              type="button"
              onClick={loadDashboard}
              className="hover:text-indigo-600 transition-colors"
              title="Actualizar dashboard"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin text-[#5b5cfb]' : ''} />
            </button>
            
            {/* Search Icon */}
            <svg className="w-5 h-5 cursor-pointer hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            {/* Notification Bell */}
            <div className="relative cursor-pointer hover:text-indigo-600 transition-colors">
              <Bell size={18} />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#5b5cfb] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
              <div className="w-9 h-9 bg-[#5b5cfb] text-white rounded-full flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                {user?.nombre?.charAt(0) || 'W'}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-xs text-[#1e1b4b] leading-none mb-0.5">{user?.nombre || 'Wendy'}</span>
                <span className="text-[10px] text-[#9ca3af] font-semibold uppercase">{roleLabel}</span>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="flex-1 overflow-y-auto pr-1 pb-10">
          <div className="relative space-y-10 max-w-[1800px] mx-auto w-full">

            {/* ── Welcome & Status ── */}
            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Welcome Card */}
              <div className="lg:col-span-2 bg-white border border-[#e2e8f0] p-8 rounded-[2rem] shadow-sm flex flex-col justify-center min-h-[140px] text-left">
                <h1 className="text-3xl font-extrabold text-[#1e1b4b] tracking-tight leading-none">
                  ¡Hola, <span className="text-[#5b5cfb]">{user?.nombre || 'Wendy'}</span>!
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3">
                  PANEL DE CONTROL • GEOCHAT
                </p>
                <p className="text-sm text-slate-500 mt-3 font-semibold">
                  Gestiona tus contactos, operadores y dispositivos en tiempo real.
                </p>
              </div>

              {/* System Status Card */}
              <div className="bg-white border border-[#e2e8f0] p-6 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden text-left">
                {/* 3 dots menu top right */}
                <button className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreVertical size={18} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#10b981] shrink-0">
                    <div className="w-3 h-3 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 block">Estado del Sistema</span>
                    <span className="text-xs font-black text-[#1e1b4b] uppercase tracking-tight">ÓPTIMO • EN LÍNEA</span>
                  </div>
                </div>
                
                <div className="mt-2 flex justify-between items-end">
                  <p className="text-[11px] text-slate-400 font-bold leading-tight max-w-[155px]">
                    Todos los sistemas funcionando correctamente
                  </p>
                  
                  {/* System Status line graph */}
                  <div className="h-10 w-28 shrink-0 self-end">
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chart-fill-status" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5b5cfb" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#5b5cfb" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="chart-line-status" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#5b5cfb" />
                          <stop offset="50%" stopColor="#6e6dfc" />
                          <stop offset="100%" stopColor="#3cbcf7" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,35 C15,15 30,30 45,15 C60,5 75,25 100,10 L100,40 L0,40 Z"
                        fill="url(#chart-fill-status)"
                      />
                      <path
                        d="M0,35 C15,15 30,30 45,15 C60,5 75,25 100,10"
                        fill="none"
                        stroke="url(#chart-line-status)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* ── Error ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-5 flex items-center gap-3 text-sm font-bold"
                >
                  <AlertCircle size={20} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Estadísticas de cuenta ── */}
            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.1}
            >
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-[#5b5cfb] rounded-full" />
                  <h3 className="text-base font-black text-[#1e1b4b] tracking-tight uppercase">Análisis de cuenta</h3>
                </div>
                <span className="text-[9px] font-black text-[#6b7280] uppercase tracking-[0.25em] bg-white px-4 py-2 rounded-full border border-[#e2e8f0] shadow-sm">
                  {isLoading ? 'Sincronizando...' : planStatusLabel(dashboard.plan?.estado)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                {/* ── Skeleton mientras carga ── */}
                {isLoading && Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonStatCard key={i} />
                ))}

                {/* Subscription Card */}
                {!isLoading && (
                  <motion.div 
                    variants={cardPop} 
                    initial="hidden" 
                    animate="visible" 
                    custom={0.15} 
                    className="bg-gradient-to-br from-[#5b5cfb] via-[#6e6dfc] to-[#3cbcf7] p-6 rounded-[2rem] flex flex-col justify-between shadow-lg shadow-indigo-100/30 min-h-[200px] relative overflow-hidden text-left group"
                  >
                    {/* Glowing effect inside the card */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 blur-xl pointer-events-none" />
                    
                    {/* Floating 3D Cube Asset */}
                    <img 
                      src="/subscription_cube.png" 
                      alt="Premium Cube" 
                      className="absolute right-2 bottom-4 w-32 h-32 object-contain animate-float select-none pointer-events-none z-10" 
                    />

                    <div className="relative z-20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-extrabold text-white/80 text-[10px] tracking-widest uppercase">Suscripción</span>
                        <span className="bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/35 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm">
                          Activo
                        </span>
                      </div>
                      <h4 className="text-2xl font-black text-white tracking-tight leading-none mb-1">
                        {dashboard.plan?.nombre || 'Premium'}
                      </h4>
                      <p className="text-[10px] font-bold text-white/85 uppercase tracking-wider">
                        Plan Premium Activo
                      </p>
                    </div>

                    <div className="mt-auto relative z-20 space-y-2 max-w-[160px]">
                      <div className="flex flex-col text-[10px] font-bold uppercase tracking-wide">
                        <span className="text-white/60">Vencimiento</span>
                        <span className="text-white text-xs font-black tracking-tight">{formatDate(dashboard.plan?.fecha_vencimiento)}</span>
                      </div>
                      
                      <div className="text-[10px] text-white/80 font-bold italic">
                        {dashboard.plan?.fecha_vencimiento ? `${Math.ceil((new Date(dashboard.plan?.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24))} días restantes` : '365 días restantes'}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Stat Cards — con stagger */}
                {!isLoading && statCards.map((stat, idx) => {
                  // Calcular porcentaje de uso
                  const percent = Math.round(Math.min((stat.current / (stat.limit || 1)) * 100, 100)) || 0;
                  
                  // Configurar sparkline y colores específicos de la tarjeta
                  const sparklineData = idx === 0 
                    ? "M0,15 C10,5 20,20 30,8 C40,2 45,12 50,4" // Directorio
                    : idx === 1 
                    ? "M0,15 C10,25 20,5 30,12 C40,8 45,2 50,6" // Operadores
                    : "M0,15 C10,10 20,20 30,5 C40,15 45,2 50,8"; // Terminales

                  const growthText = idx === 0 ? "+124" : idx === 1 ? "+2" : "+1";

                  return (
                    <motion.div
                      key={idx}
                      variants={cardPop}
                      initial="hidden"
                      animate="visible"
                      custom={(idx + 1) * 0.09 + 0.15}
                      className="bg-white p-6 rounded-[2rem] border border-[#e2e8f0] shadow-sm hover:shadow-md hover:border-[#5b5cfb]/30 transition-all duration-300 group min-h-[200px] flex flex-col justify-between text-left"
                    >
                      <div>
                        {/* Top: Icon + Label */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2.5 rounded-2xl ${stat.iconBg} ${stat.iconColor} border ${stat.iconBorder} group-hover:scale-105 transition-transform shrink-0`}>
                            <stat.icon size={18} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
                        </div>

                        {/* Middle: Value / Limit */}
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-3xl font-black text-[#1e1b4b] tracking-tighter">
                            {formatNumber(stat.current)}
                          </p>
                          <p className="text-xs font-bold text-slate-400 uppercase">/ {formatLimit(stat.limit)}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                          {stat.desc}
                        </p>
                      </div>

                      {/* Bottom: Progress bar + growth */}
                      <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <motion.div
                              className={`${stat.barColor} h-full rounded-full`}
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 1, delay: (idx + 1) * 0.09 + 0.4, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                          <span className={`text-[10px] font-extrabold ${stat.pctColor} tracking-tight shrink-0`}>
                            {percent}%
                          </span>
                        </div>

                        {/* Sparkline and growth indicator */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 mt-auto">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-[#10b981]">{growthText}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">vs. mes anterior</span>
                          </div>
                          <div className="w-12 h-5 shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 50 20" fill="none">
                              <path 
                                d={sparklineData} 
                                stroke="#10b981" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            {/* ── Dispositivos ── */}
            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.3}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-[#38bdf8] rounded-full" />
                  <h3 className="text-base font-black text-[#1e1b4b] tracking-tight uppercase">Dispositivos conectados</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-[#10b981] uppercase tracking-widest bg-[#ecfdf5] border border-[#a7f3d0] px-4 py-2 rounded-full shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                  {formatNumber(dashboard.usage?.dispositivos_conectados)} en línea
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List of active device cards (2/3 width) */}
                <div className="lg:col-span-2 space-y-4">
                  {isLoading && (
                    <div className="bg-white rounded-3xl p-8 border border-[#e2e8f0] flex items-center justify-between shadow-sm animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-gray-200 rounded-full" />
                          <div className="h-3 w-24 bg-gray-200 rounded-full" />
                        </div>
                      </div>
                      <div className="h-4 w-16 bg-gray-200 rounded-full" />
                    </div>
                  )}

                  {!isLoading && dashboard.devices?.map((device) => (
                    <WhatsAppConnector key={device.id} userId={user?.id} device={device} />
                  ))}

                  {dashboard.devices?.length === 0 && !isLoading && (
                    <div className="bg-white border border-dashed border-[#a5b4fc] rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-65 min-h-[180px]">
                      <WifiOff size={40} className="mb-3 text-[#a5b4fc]" />
                      <h4 className="text-[10px] font-black text-[#9ca3af] uppercase tracking-[0.3em]">Sin dispositivos vinculados</h4>
                      <p className="text-xs text-[#9ca3af] mt-1 font-medium">Agrega una terminal para comenzar a chatear.</p>
                    </div>
                  )}
                </div>

                {/* New Terminal slot (1/3 width) */}
                <div className="lg:col-span-1">
                  {availableDeviceSlots > 0 && (
                    <motion.div
                      variants={cardPop}
                      initial="hidden"
                      animate="visible"
                      custom={0.45}
                      onClick={handleDeployNode}
                      className="bg-white border-2 border-dashed border-[#818cf8]/65 hover:border-solid hover:border-[#5b5cfb] rounded-[2rem] p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-all duration-300 group min-h-[200px]"
                    >
                      <div className="w-14 h-14 bg-gradient-to-br from-[#5b5cfb] to-[#6e6dfc] rounded-full mb-4 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-110 transition-transform relative">
                        <Plus size={28} />
                        <span className="absolute inset-0 rounded-full bg-[#5b5cfb] opacity-25 animate-ping" />
                      </div>
                      
                      <h4 className="text-sm font-extrabold text-[#1e1b4b] uppercase tracking-wider">Nueva Terminal</h4>
                      <p className="text-xs text-[#5b5cfb] font-bold mt-1 uppercase tracking-tight">
                        {availableDeviceSlots} disponibles
                      </p>
                      
                      <button className="mt-6 bg-gradient-to-r from-[#5b5cfb] to-[#6e6dfc] hover:from-[#4f46e5] hover:to-[#5b5cfb] text-white text-[11px] font-extrabold uppercase tracking-wider px-8 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all">
                        Agregar terminal
                      </button>
                    </motion.div>
                  )}
                  
                  {availableDeviceSlots === 0 && !isLoading && (
                    <div className="bg-[#f8fafc] border border-gray-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center text-gray-400 min-h-[200px]">
                      <AlertCircle size={32} className="mb-3 text-gray-300" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">Límite alcanzado</h4>
                      <p className="text-xs text-[#9ca3af] mt-1.5 font-medium max-w-[180px]">
                        Has utilizado todas las terminales de tu plan.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </main>
      {/* -- Modal Conector -- */}
      {newDevice && (
        <WhatsAppConnector
          isOpen={isConnectorOpen}
          onClose={() => { setIsConnectorOpen(false); setNewDevice(null); loadDashboard(); }}
          device={newDevice}
          userId={user?.id}
        />
      )}
    </div>
  );
}
