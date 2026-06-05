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
      } else { setError(data.message || 'Error al desplegar nueva terminal.'); }
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
      current: dashboard.usage?.contactos,
      limit: dashboard.plan?.limits?.contactos,
      icon: Users,
      iconBg: 'bg-[#eef2ff]',
      iconColor: 'text-[#6366f1]',
      iconBorder: 'border-[#a5b4fc]',
      barColor: 'bg-[#6366f1]',
      pctColor: 'text-[#4f46e5]',
    },
    {
      label: 'Operadores',
      current: dashboard.usage?.agentes,
      limit: dashboard.plan?.limits?.agentes,
      icon: User,
      iconBg: 'bg-[#e0e7ff]',
      iconColor: 'text-[#38bdf8]',
      iconBorder: 'border-[#bae6fd]',
      barColor: 'bg-[#38bdf8]',
      pctColor: 'text-[#38bdf8]',
    },
    {
      label: 'Terminales',
      current: dashboard.usage?.dispositivos,
      limit: dashboard.plan?.limits?.dispositivos,
      icon: Smartphone,
      iconBg: 'bg-[#eef2ff]',
      iconColor: 'text-[#818cf8]',
      iconBorder: 'border-[#c7d2fe]',
      barColor: 'bg-[#818cf8]',
      pctColor: 'text-[#818cf8]',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#eef2ff] font-sans selection:bg-[#c7d2fe]/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0 h-[calc(100vh-32px)] overflow-hidden">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="h-[72px] bg-white rounded-3xl border border-[#c7d2fe] shadow-sm flex items-center justify-between px-8 z-50 mb-6 shrink-0"
        >
          <div className="flex items-center gap-4">
            <div className="bg-[#eef2ff] rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-[#a5b4fc] shrink-0">
              <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={loadDashboard}
              className="text-[#9ca3af] hover:text-[#6366f1] transition-colors"
              title="Actualizar dashboard"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin text-[#6366f1]' : ''} />
            </button>
            <Bell size={18} className="text-[#9ca3af] cursor-pointer hover:text-[#6366f1] transition-colors" />
            <div className="flex items-center gap-3 border-l border-[#c7d2fe] pl-5">
              <div className="w-9 h-9 bg-gradient-to-br from-[#6366f1] to-[#38bdf8] rounded-full flex items-center justify-center font-bold text-white text-xs uppercase shadow-sm">
                {user?.nombre?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-[#1e1b4b] leading-none mb-0.5">{user?.nombre || 'Usuario'}</span>
                <span className="text-[10px] text-[#9ca3af] font-medium uppercase">{roleLabel}</span>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="flex-1 overflow-y-auto pr-1 pb-10">
          <div className="relative space-y-10 max-w-[1800px] mx-auto w-full">

            {/* ── Welcome ── */}
            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="animate-in fade-in slide-in-from-top-4 duration-700"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-[#c7d2fe] p-8 rounded-[2.5rem] shadow-sm">
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-[#1e1b4b] tracking-tighter leading-none">
                    ¡Hola, <span className="geopulse-text-gradient">{user?.nombre || 'Usuario'}</span>!
                  </h1>
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#9ca3af] mt-3">
                    Panel de control · GeoChat
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-[#6366f1] uppercase tracking-widest leading-none mb-1">Estado del Sistema</span>
                    <span className="text-xs font-bold text-[#1e1b4b] uppercase tracking-tight">Óptimo · En línea</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#eef2ff] flex items-center justify-center border border-[#a5b4fc]">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1] animate-pulse shadow-[0_0_8px_#6366f1]" />
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
                  <div className="w-1 h-6 bg-[#6366f1] rounded-full" />
                  <h3 className="text-base font-black text-[#1e1b4b] tracking-tight uppercase">Análisis de cuenta</h3>
                </div>
                <span className="text-[9px] font-black text-[#6b7280] uppercase tracking-[0.25em] bg-white px-4 py-2 rounded-full border border-[#c7d2fe] shadow-sm">
                  {isLoading ? 'Sincronizando...' : planStatusLabel(dashboard.plan?.estado)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                {/* ── Skeleton mientras carga ── */}
                {isLoading && Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonStatCard key={i} />
                ))}

                {/* Plan Card */}
                {!isLoading && <motion.div variants={cardPop} initial="hidden" animate="visible" custom={0.15} className="bg-gradient-to-br from-[#6366f1] to-[#38bdf8] p-6 rounded-[2rem] flex flex-col justify-between shadow-xl shadow-indigo-300/40 min-h-[200px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-black text-white/70 text-[9px] tracking-[0.25em] uppercase">Suscripción</span>
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-white" />
                      </div>
                    </div>
                    <h4 className="text-2xl font-black text-white tracking-tighter mb-1">
                      {dashboard.plan?.nombre || 'Sin plan'}
                    </h4>
                    <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">Plan Premium Activo</span>
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide">
                      <span className="text-white/60">Vencimiento</span>
                      <span className="text-white">{formatDate(dashboard.plan?.fecha_vencimiento)}</span>
                    </div>
                    <div className="w-full bg-white/20 h-1.5 rounded-full">
                      <div className="w-full h-full bg-white/80 rounded-full" />
                    </div>
                  </div>
                </motion.div>}

                {/* Stat Cards — con stagger */}
                {!isLoading && statCards.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    variants={cardPop}
                    initial="hidden"
                    animate="visible"
                    custom={(idx + 1) * 0.09 + 0.15}
                    className="bg-white p-6 rounded-[2rem] border border-[#c7d2fe] shadow-sm hover:shadow-md hover:border-[#6366f1] transition-all duration-300 group min-h-[200px]"
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`p-3 rounded-xl ${stat.iconBg} ${stat.iconColor} border ${stat.iconBorder} group-hover:scale-105 transition-transform`}>
                        <stat.icon size={20} />
                      </div>
                      <p className="text-[9px] font-black text-[#9ca3af] uppercase tracking-[0.25em]">{stat.label}</p>
                    </div>
                    <div className="flex items-baseline gap-2 mb-5">
                      <p className="text-3xl font-black text-[#1e1b4b] tracking-tighter">
                        {formatNumber(stat.current)}
                      </p>
                      <p className="text-[10px] font-black text-[#9ca3af] uppercase">/ {formatLimit(stat.limit)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-[#f5f3ff] h-1.5 rounded-full overflow-hidden border border-[#e0e7ff]">
                        {/* Barra animada con Framer Motion — mantiene el className y el valor */}
                        <motion.div
                          className={`${stat.barColor} h-full rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((stat.current / (stat.limit || 1)) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: (idx + 1) * 0.09 + 0.4, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className={`text-[9px] font-black ${stat.pctColor} tracking-widest`}>
                        {Math.round(Math.min((stat.current / (stat.limit || 1)) * 100, 100))}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── Dispositivos ── */}
            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.3}
              className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150"
            >
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-[#38bdf8] rounded-full" />
                  <h3 className="text-base font-black text-[#1e1b4b] tracking-tight uppercase">Dispositivos conectados</h3>
                </div>
                <span className="text-[9px] font-black text-[#38bdf8] uppercase tracking-[0.25em] bg-[#e0e7ff] px-4 py-2 rounded-full border border-[#bae6fd]">
                  {formatNumber(dashboard.usage?.dispositivos_conectados)} en línea
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Skeleton dispositivos */}
                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-[2rem] p-8 border border-[#c7d2fe] flex flex-col items-center gap-4 shadow-sm">
                    <div className="skeleton w-20 h-20 rounded-full" />
                    <div className="skeleton h-4 w-28 rounded-full" />
                    <div className="skeleton h-3 w-20 rounded-full" />
                    <div className="skeleton h-6 w-24 rounded-full" />
                    <div className="skeleton h-3 w-32 rounded-full" />
                  </div>
                ))}

                {!isLoading && dashboard.devices?.map((device, idx) => (
                  <motion.div
                    key={device.id}
                    variants={cardPop}
                    initial="hidden"
                    animate="visible"
                    custom={idx * 0.1 + 0.35}
                  >
                    <WhatsAppConnector userId={user?.id} device={device} />
                  </motion.div>
                ))}

                {dashboard.devices?.length === 0 && !isLoading && (
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0.35}
                    className="bg-white border border-dashed border-[#a5b4fc] rounded-[2.5rem] p-14 flex flex-col items-center justify-center text-center opacity-60"
                  >
                    <WifiOff size={48} className="mb-5 text-[#a5b4fc]" />
                    <h4 className="text-[11px] font-black text-[#9ca3af] uppercase tracking-[0.4em]">Sin dispositivos</h4>
                  </motion.div>
                )}

                {availableDeviceSlots > 0 && (
                  <motion.div
                    variants={cardPop}
                    initial="hidden"
                    animate="visible"
                    custom={0.45}
                    onClick={handleDeployNode}
                    className="bg-[#f0f9ff] border-2 border-dashed border-[#6366f1] rounded-[2.5rem] p-14 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#eef2ff] hover:border-solid transition-all duration-300 group"
                  >
                    <div className="w-16 h-16 bg-white rounded-full mb-5 flex items-center justify-center border border-[#a5b4fc] text-[#6366f1] group-hover:scale-110 transition-transform shadow-sm">
                      <Plus size={32} />
                    </div>
                    <h4 className="text-[11px] font-black text-[#6366f1] uppercase tracking-[0.4em]">Nueva Terminal</h4>
                    <p className="text-[10px] text-[#818cf8] font-bold mt-2 uppercase tracking-tight">
                      {availableDeviceSlots} disponibles
                    </p>
                  </motion.div>
                )}
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
