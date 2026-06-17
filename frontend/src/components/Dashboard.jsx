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
  Check,
  X,
  CreditCard,
  Zap,
  Globe,
  Loader2,
  ArrowRight,
  Shield,
  HelpCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import Sidebar from './Sidebar';
import WhatsAppConnector from './WhatsAppConnector';

/* ── Animaciones ── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }
  })
};

const cardPop = {
  hidden: { opacity: 0, scale: 0.94, y: 14 },
  visible: (delay = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }
  })
};

const API_URL = import.meta.env.VITE_API_URL || '';
const emptyDashboard = {
  plan: {
    nombre: 'PLAN PRO',
    estado: 'activa',
    periodo: 'mensual',
    fecha_inicio: null,
    fecha_vencimiento: null,
    limits: { contactos: 5000, dispositivos: 3, agentes: 5 },
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
  if (!value) return '30 de junio, 2026';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function getStatusPillStyles(status) {
  if (status === 'conectado') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'conectando') return 'bg-amber-55 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-500 border-slate-200';
}

function planStatusLabel(status) {
  const labels = {
    activa: 'Activa',
    prueba: 'Prueba',
    vencida: 'Vencida',
    cancelada: 'Cancelada',
    sin_suscripcion: 'Sin suscripción',
  };
  return labels[status] || status || 'Sin estado';
}

export default function Dashboard({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [newDevice, setNewDevice] = useState(null);
  const [error, setError] = useState('');

  // Estados para nuevos Modales y Alertas
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedConnectType, setSelectedConnectType] = useState('qr'); // 'qr', 'cloud', 'external'
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('mensual'); // 'mensual' o 'anual'
  const [upgradeSuccessMessage, setUpgradeSuccessMessage] = useState('');

  const loadDashboard = async () => {
    if (!user?.id) {
      setError('No se encontró el usuario activo.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/dashboard/${user.id}`);
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'No se pudo cargar el dashboard.');
        return;
      }
      setDashboard(data.dashboard || emptyDashboard);
    } catch {
      setError('Error de conexión al cargar el dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeployNode = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/dispositivos/ensure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        setNewDevice({ id: data.device_id, nombre: 'Terminal WhatsApp' });
        setIsConnectorOpen(true);
        loadDashboard();
      } else {
        setError(data.message || 'Error al desplegar nueva terminal.');
      }
    } catch {
      setError('Falla crítica en el despliegue del bridge de WhatsApp.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectDevice = async (deviceId) => {
    if (!window.confirm('¿Estás seguro de que deseas desconectar esta línea de WhatsApp? El bot y los envíos programados se detendrán.')) {
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/dispositivos/${deviceId}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        loadDashboard();
      } else {
        setError(data.message || 'No se pudo desconectar el dispositivo.');
      }
    } catch {
      setError('Error de red al intentar desconectar el dispositivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradePlan = (planName) => {
    let limits = { contactos: 1000, dispositivos: 1, agentes: 2 };
    if (planName === 'Plan Pro') {
      limits = { contactos: 5000, dispositivos: 3, agentes: 5 };
    } else if (planName === 'Plan Enterprise') {
      limits = { contactos: 20000, dispositivos: 10, agentes: 15 };
    }

    setDashboard((prev) => ({
      ...prev,
      plan: {
        ...prev.plan,
        nombre: planName,
        limits,
      },
    }));

    setUpgradeSuccessMessage(`¡Felicidades! Te has suscrito al ${planName} con éxito. Tus límites se han ampliado.`);
    setShowPlansModal(false);
    setTimeout(() => {
      setUpgradeSuccessMessage('');
    }, 6000);
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.id]);

  const maxDevices = Number(dashboard.plan?.limits?.dispositivos || 1);
  const currentDevicesCount = dashboard.devices?.length || 0;
  const emptySlotsCount = Math.max(maxDevices - currentDevicesCount, 0);

  const roleLabel = user?.rol || 'admin';

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans selection:bg-indigo-100/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-8 my-6 flex flex-col min-w-0 h-[calc(100vh-48px)] overflow-hidden">
        {/* ── Header superior ── */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="h-16 flex items-center justify-end gap-6 px-4 z-40 shrink-0"
        >
          <div className="flex items-center gap-6 text-gray-500">
            <button
              type="button"
              onClick={loadDashboard}
              className="hover:text-indigo-600 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin text-[#5d5fef]' : ''} />
            </button>

            {/* Notification Bell */}
            <div className="relative cursor-pointer hover:text-indigo-600 transition-colors">
              <Bell size={18} />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#5d5fef] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                1
              </span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
              <div className="w-9 h-9 bg-[#5d5fef] text-white rounded-full flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                {user?.nombre?.charAt(0) || 'W'}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-xs text-[#1e1b4b] leading-none mb-0.5">
                  {user?.nombre || 'Wendy'}
                </span>
                <span className="text-[10px] text-[#9ca3af] font-semibold uppercase">{roleLabel}</span>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="flex-1 overflow-y-auto pr-1 pb-10">
          <div className="relative space-y-8 max-w-[1800px] mx-auto w-full">
            {/* ── Upgrade Plan Banner de Éxito ── */}
            <AnimatePresence>
              {upgradeSuccessMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-xl text-white">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm uppercase tracking-wide">¡Actualización Exitosa!</p>
                      <p className="text-xs text-emerald-600 font-semibold">{upgradeSuccessMessage}</p>
                    </div>
                  </div>
                  <button onClick={() => setUpgradeSuccessMessage('')} className="text-emerald-400 hover:text-emerald-600">
                    <X size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Error Banner ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-5 flex items-center gap-3 text-sm font-bold shadow-sm"
                >
                  <AlertCircle size={20} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Cabecera "Detalles del plan" ── */}
            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="bg-white border border-[#e2e8f0] p-6 lg:p-8 rounded-[2.5rem] shadow-sm flex flex-col xl:flex-row items-stretch justify-between gap-8 text-left"
            >
              <div className="flex flex-col justify-center min-w-[280px]">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-[#5d5fef] uppercase tracking-[0.2em]">PLAN GEOCHAT</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                    {planStatusLabel(dashboard.plan?.estado)}
                  </span>
                </div>
                <h1 className="text-3xl font-black text-[#1e1b4b] tracking-tight mt-2 uppercase">
                  {dashboard.plan?.nombre || 'PLAN PRO'}
                </h1>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
                  Vence: {formatDate(dashboard.plan?.fecha_vencimiento)}
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="inline-flex items-center gap-2 bg-[#5d5fef]/10 text-[#5d5fef] hover:bg-[#5d5fef] hover:text-white px-5 py-2 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all duration-200"
                  >
                    <CreditCard size={14} />
                    Mejorar Plan
                  </button>
                </div>
              </div>

              {/* Contadores horizontales con barra de progreso verde */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Metrica: Contactos */}
                <div className="bg-[#f8fafc] rounded-2xl p-5 border border-slate-100 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Users size={16} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Contactos</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-2xl font-black text-[#1e1b4b]">
                        {formatNumber(dashboard.usage?.contactos)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        / {formatLimit(dashboard.plan?.limits?.contactos)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#22c55e] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (Number(dashboard.usage?.contactos || 0) /
                              (Number(dashboard.plan?.limits?.contactos) || 1)) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold text-right">
                      {Math.round(
                        Math.min(
                          (Number(dashboard.usage?.contactos || 0) /
                            (Number(dashboard.plan?.limits?.contactos) || 1)) *
                            100,
                          100
                        )
                      )}
                      % en uso
                    </p>
                  </div>
                </div>

                {/* Metrica: Agentes */}
                <div className="bg-[#f8fafc] rounded-2xl p-5 border border-slate-100 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <User size={16} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Agentes</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-2xl font-black text-[#1e1b4b]">
                        {formatNumber(dashboard.usage?.agentes)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        / {formatLimit(dashboard.plan?.limits?.agentes)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#22c55e] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (Number(dashboard.usage?.agentes || 0) /
                              (Number(dashboard.plan?.limits?.agentes) || 1)) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold text-right">
                      {Math.round(
                        Math.min(
                          (Number(dashboard.usage?.agentes || 0) /
                            (Number(dashboard.plan?.limits?.agentes) || 1)) *
                            100,
                          100
                        )
                      )}
                      % en uso
                    </p>
                  </div>
                </div>

                {/* Metrica: Dispositivos */}
                <div className="bg-[#f8fafc] rounded-2xl p-5 border border-slate-100 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Smartphone size={16} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Dispositivos</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-2xl font-black text-[#1e1b4b]">
                        {formatNumber(dashboard.usage?.dispositivos)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        / {formatLimit(dashboard.plan?.limits?.dispositivos)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#22c55e] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (Number(dashboard.usage?.dispositivos || 0) /
                              (Number(dashboard.plan?.limits?.dispositivos) || 1)) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold text-right">
                      {Math.round(
                        Math.min(
                          (Number(dashboard.usage?.dispositivos || 0) /
                            (Number(dashboard.plan?.limits?.dispositivos) || 1)) *
                            100,
                          100
                        )
                      )}
                      % en uso
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* ── Sección de Conexiones ── */}
            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.1}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-[#5d5fef] rounded-full" />
                  <h3 className="text-lg font-black text-[#1e1b4b] tracking-tight uppercase">Conexiones Activas</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#22c55e] uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  {formatNumber(dashboard.usage?.dispositivos_conectados)} En línea
                </span>
              </div>

              {/* Grid Responsivo de Tarjetas de Conexión */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Skeletons mientras carga */}
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm animate-pulse min-h-[340px] flex flex-col justify-between items-center"
                    >
                      <div className="w-full flex flex-col items-center">
                        <div className="w-24 h-24 bg-slate-200 rounded-full mb-4" />
                        <div className="h-5 w-32 bg-slate-200 rounded-full mb-2" />
                        <div className="h-4 w-40 bg-slate-200 rounded-full mb-4" />
                        <div className="h-6 w-24 bg-slate-200 rounded-full" />
                      </div>
                      <div className="w-full space-y-2">
                        <div className="h-3 w-28 bg-slate-100 rounded-full mx-auto" />
                        <div className="h-10 w-full bg-slate-200 rounded-2xl" />
                      </div>
                    </div>
                  ))}

                {/* Tarjetas de Dispositivos del Plan */}
                {!isLoading &&
                  dashboard.devices?.map((device) => (
                    <motion.div
                      key={device.id}
                      variants={cardPop}
                      initial="hidden"
                      animate="visible"
                      className="bg-white rounded-[2rem] p-6 border border-[#c7d2fe]/60 shadow-sm hover:shadow-xl hover:border-[#5d5fef]/40 transition-all duration-300 flex flex-col items-center text-center relative group min-h-[340px] justify-between"
                    >
                      <div className="w-full flex flex-col items-center">
                        {/* Concentric Circles WhatsApp Avatar */}
                        {device.estado === 'conectado' ? (
                          <div className="relative w-24 h-24 flex items-center justify-center shrink-0 mb-4">
                            <div className="absolute inset-0 rounded-full border border-emerald-100 bg-[#f0fdf4]/50 animate-pulse" />
                            <div className="absolute inset-2.5 rounded-full border border-emerald-200" />
                            <div className="relative w-16 h-16 bg-[#25d366] rounded-full flex items-center justify-center shadow-lg shadow-emerald-100/50 z-10 group-hover:scale-105 transition-transform duration-300">
                              <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </div>
                            <div className="absolute bottom-1 right-2 bg-emerald-500 text-white rounded-full p-1 border-2 border-white z-20 shadow-md">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          </div>
                        ) : device.estado === 'conectando' ? (
                          <div className="relative w-24 h-24 flex items-center justify-center shrink-0 mb-4">
                            <div className="absolute inset-0 rounded-full border border-amber-100 bg-[#fffbeb]/50 animate-pulse" />
                            <div className="absolute inset-2.5 rounded-full border border-amber-200" />
                            <div className="relative w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-100/50 z-10 animate-spin">
                              <RefreshCw size={28} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-24 h-24 flex items-center justify-center shrink-0 mb-4">
                            <div className="absolute inset-0 rounded-full border border-slate-100 bg-[#f8fafc]/50" />
                            <div className="absolute inset-2.5 rounded-full border border-slate-200" />
                            <div className="relative w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center shadow-lg shadow-slate-100 z-10">
                              <Smartphone size={28} className="text-white" />
                            </div>
                          </div>
                        )}

                        <h4 className="font-extrabold text-[#1e1b4b] text-base leading-tight uppercase tracking-wide">
                          {device.nombre || 'Mi WhatsApp'}
                        </h4>
                        <p className="text-xs font-bold text-[#5d5fef] mt-1">
                          {device.numero_telefono || 'Pendiente de vinculación'}
                        </p>

                        <div
                          className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest mt-4 border ${getStatusPillStyles(
                            device.estado
                          )}`}
                        >
                          {device.estado === 'conectado'
                            ? 'Conectado'
                            : device.estado === 'conectando'
                            ? 'Conectando'
                            : 'Sin uso'}
                        </div>
                      </div>

                      <div className="w-full mt-6 space-y-3">
                        <p className="text-[11px] text-[#9ca3af] font-bold">
                          {device.conectado_en
                            ? `Conectado: ${formatDate(device.conectado_en)}`
                            : `Creado: ${formatDate(device.creado_en)}`}
                        </p>

                        {device.estado === 'conectado' || device.estado === 'conectando' ? (
                          <button
                            type="button"
                            onClick={() => handleDisconnectDevice(device.id)}
                            className="w-full py-2.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                          >
                            Desconectar número
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewDevice(device);
                              setIsConnectorOpen(true);
                            }}
                            className="w-full py-2.5 bg-[#5d5fef] hover:bg-[#4b4ded] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md hover:shadow-lg"
                          >
                            Vincular número
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                {/* Espacios Vacíos del Plan */}
                {!isLoading &&
                  Array.from({ length: emptySlotsCount }).map((_, idx) => (
                    <motion.div
                      key={`empty-${idx}`}
                      variants={cardPop}
                      initial="hidden"
                      animate="visible"
                      onClick={() => setShowConnectModal(true)}
                      className="bg-white border-2 border-dashed border-slate-200 hover:border-[#5d5fef] rounded-[2rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl transition-all duration-300 min-h-[340px] group"
                    >
                      <div className="relative w-20 h-20 flex items-center justify-center shrink-0 mb-4">
                        <div className="absolute inset-0 rounded-full border border-dashed border-slate-200 group-hover:border-[#5d5fef]/50 bg-slate-50/50 group-hover:bg-indigo-50/20" />
                        <div className="relative w-14 h-14 bg-slate-100 group-hover:bg-[#5d5fef] rounded-full flex items-center justify-center text-slate-400 group-hover:text-white shadow-sm transition-all duration-300">
                          <Plus size={28} />
                        </div>
                      </div>

                      <h4 className="font-extrabold text-slate-600 group-hover:text-[#1e1b4b] text-base uppercase tracking-wider transition-colors">
                        Conectar número
                      </h4>
                      <p className="text-xs text-slate-400 group-hover:text-[#5d5fef] font-bold mt-1 uppercase tracking-tight transition-colors">
                        Ranura Disponible
                      </p>
                      <p className="text-xs text-slate-400 mt-4 max-w-[180px] font-medium">
                        Haz clic para vincular una nueva línea de WhatsApp a tu cuenta.
                      </p>
                    </motion.div>
                  ))}

                {/* Tarjeta de Upgrade del Plan */}
                {!isLoading && (
                  <motion.div
                    variants={cardPop}
                    initial="hidden"
                    animate="visible"
                    onClick={() => setShowPlansModal(true)}
                    className="bg-white border-2 border-dashed border-slate-200 hover:border-[#5d5fef] rounded-[2rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl transition-all duration-300 min-h-[340px] group"
                  >
                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0 mb-4">
                      <div className="absolute inset-0 rounded-full border border-dashed border-slate-200 group-hover:border-[#5d5fef]/50 bg-slate-50/50 group-hover:bg-indigo-50/20" />
                      <div className="relative w-14 h-14 bg-indigo-50 group-hover:bg-[#5d5fef] rounded-full flex items-center justify-center text-[#5d5fef] group-hover:text-white shadow-sm transition-all duration-300">
                        <Plus size={28} />
                      </div>
                    </div>

                    <h4 className="font-extrabold text-slate-600 group-hover:text-[#1e1b4b] text-base uppercase tracking-wider transition-colors">
                      Mejorar plan
                    </h4>
                    <p className="text-xs text-slate-400 group-hover:text-[#5d5fef] font-bold mt-1 uppercase tracking-tight transition-colors">
                      Añadir más ranuras
                    </p>
                    <p className="text-xs text-slate-400 mt-4 max-w-[180px] font-medium">
                      Aumenta tu capacidad de líneas, agentes y contactos activos.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.section>
          </div>
        </div>
      </main>

      {/* ── MODAL: Números extras y API ── */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl flex flex-col text-left"
            >
              {/* Botón cerrar */}
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-[#1e1b4b] tracking-tight uppercase">Conectar nuevo canal</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                Selecciona la tecnología de conexión de WhatsApp
              </p>

              <div className="mt-6 space-y-4">
                {/* Opción 1: WhatsApp Messenger / Business QR */}
                <div
                  onClick={() => setSelectedConnectType('qr')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedConnectType === 'qr'
                      ? 'border-[#5d5fef] bg-indigo-50/30'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="connectType"
                      checked={selectedConnectType === 'qr'}
                      onChange={() => setSelectedConnectType('qr')}
                      className="text-[#5d5fef] focus:ring-[#5d5fef]"
                    />
                    <div className="flex-1">
                      <p className="font-extrabold text-sm text-[#1e1b4b]">WhatsApp Messenger / Business (QR)</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        Sincronización rápida y directa de tu móvil escaneando el código QR en pantalla.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Opción 2: WhatsApp Cloud API */}
                <div
                  onClick={() => setSelectedConnectType('cloud')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedConnectType === 'cloud'
                      ? 'border-[#5d5fef] bg-indigo-50/30'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="connectType"
                      checked={selectedConnectType === 'cloud'}
                      onChange={() => setSelectedConnectType('cloud')}
                      className="text-[#5d5fef] focus:ring-[#5d5fef]"
                    />
                    <div className="flex-1">
                      <p className="font-extrabold text-sm text-[#1e1b4b]">WhatsApp Cloud API (Oficial)</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        Utiliza la API de Meta Oficial para campañas masivas seguras sin riesgo de bloqueo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Opción 3: API Externa */}
                <div
                  onClick={() => setSelectedConnectType('external')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedConnectType === 'external'
                      ? 'border-[#5d5fef] bg-indigo-50/30'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="connectType"
                      checked={selectedConnectType === 'external'}
                      onChange={() => setSelectedConnectType('external')}
                      className="text-[#5d5fef] focus:ring-[#5d5fef]"
                    />
                    <div className="flex-1">
                      <p className="font-extrabold text-sm text-[#1e1b4b]">API Externa o Custom Bridge</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        Vincula tus propios servidores locales o infraestructuras de mensajería webhook.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedConnectType !== 'qr' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] text-amber-800 font-bold leading-normal">
                    Nota: Los canales de tipo Cloud API y Puentes personalizados requieren configuración previa.
                    Por favor, ponte en contacto con soporte técnico para activar estas opciones.
                  </p>
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedConnectType === 'qr') {
                      setShowConnectModal(false);
                      handleDeployNode();
                    } else {
                      alert('Este canal está en fase beta. Por favor contacta con soporte para activarlo.');
                    }
                  }}
                  className="px-6 py-3 bg-[#5d5fef] hover:bg-[#4b4ded] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Planes GeoCHAT ── */}
      <AnimatePresence>
        {showPlansModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl bg-[#f8fafc] rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-2xl flex flex-col text-center max-h-[90vh] overflow-y-auto"
            >
              {/* Botón cerrar */}
              <button
                type="button"
                onClick={() => setShowPlansModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={22} />
              </button>

              <span className="text-[10px] font-black text-[#5d5fef] uppercase tracking-[0.25em]">Suscripciones</span>
              <h3 className="text-2xl md:text-3xl font-black text-[#1e1b4b] tracking-tight uppercase mt-2">
                Escala tu negocio con Planes GeoCHAT
              </h3>
              <p className="text-xs md:text-sm text-slate-500 font-semibold max-w-xl mx-auto mt-2 leading-relaxed">
                Obtén más terminales de WhatsApp, amplía tu equipo de operadores y chatea de forma masiva sin límites.
              </p>

              {/* Toggle de facturación */}
              <div className="mt-8 flex justify-center">
                <div className="bg-slate-200/60 p-1.5 rounded-2xl flex items-center border border-slate-200">
                  <button
                    onClick={() => setBillingPeriod('mensual')}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      billingPeriod === 'mensual'
                        ? 'bg-white text-[#1e1b4b] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setBillingPeriod('anual')}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      billingPeriod === 'anual'
                        ? 'bg-[#5d5fef] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Anual
                    <span className="bg-white/25 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                      -20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Tarjetas de Precios */}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Plan Starter */}
                <div className="bg-white rounded-3xl p-8 border border-slate-150 shadow-sm flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[10px] font-black text-[#5d5fef] uppercase tracking-wider">Básico</span>
                    <h4 className="text-xl font-black text-[#1e1b4b] mt-1">Plan Starter</h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      Ideal para emprendedores y pequeños negocios.
                    </p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[#1e1b4b]">
                        ${billingPeriod === 'mensual' ? '29' : '23'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ mes</span>
                    </div>

                    <div className="border-t border-slate-100 my-6" />

                    <ul className="space-y-3">
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        1 Terminal de WhatsApp
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        2 Agentes de atención
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        1,000 Contactos activos
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        Automatizaciones básicas
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgradePlan('Plan Starter')}
                    className="w-full mt-8 py-3.5 border border-[#5d5fef] text-[#5d5fef] hover:bg-[#5d5fef] hover:text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                  >
                    Seleccionar Starter
                  </button>
                </div>

                {/* Plan Pro (Destacado) */}
                <div className="bg-white rounded-3xl p-8 border-2 border-[#5d5fef] shadow-md flex flex-col justify-between text-left relative overflow-hidden transform md:-translate-y-2">
                  <div className="absolute top-0 right-0 bg-[#5d5fef] text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                    Popular
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-[#5d5fef] uppercase tracking-wider">Completo</span>
                    <h4 className="text-xl font-black text-[#1e1b4b] mt-1">Plan Pro</h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      El plan definitivo para automatizar y escalar.
                    </p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[#1e1b4b]">
                        ${billingPeriod === 'mensual' ? '49' : '39'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ mes</span>
                    </div>

                    <div className="border-t border-slate-100 my-6" />

                    <ul className="space-y-3">
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-[#5d5fef] shrink-0" />
                        3 Terminales de WhatsApp
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-[#5d5fef] shrink-0" />
                        5 Agentes de atención
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-[#5d5fef] shrink-0" />
                        5,000 Contactos activos
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-[#5d5fef] shrink-0" />
                        Automatizaciones ilimitadas
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-[#5d5fef] shrink-0" />
                        Soporte técnico prioritario
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgradePlan('Plan Pro')}
                    className="w-full mt-8 py-3.5 bg-[#5d5fef] hover:bg-[#4b4ded] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg"
                  >
                    Seleccionar Pro
                  </button>
                </div>

                {/* Plan Enterprise */}
                <div className="bg-white rounded-3xl p-8 border border-slate-150 shadow-sm flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[10px] font-black text-[#5d5fef] uppercase tracking-wider">Corporativo</span>
                    <h4 className="text-xl font-black text-[#1e1b4b] mt-1">Plan Enterprise</h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      Para grandes equipos e infraestructuras masivas.
                    </p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[#1e1b4b]">
                        ${billingPeriod === 'mensual' ? '99' : '79'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ mes</span>
                    </div>

                    <div className="border-t border-slate-100 my-6" />

                    <ul className="space-y-3">
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        10 Terminales de WhatsApp
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        15 Agentes de atención
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        20,000 Contactos activos
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        Asistente de IA GPT-4 integrado
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgradePlan('Plan Enterprise')}
                    className="w-full mt-8 py-3.5 border border-[#5d5fef] text-[#5d5fef] hover:bg-[#5d5fef] hover:text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                  >
                    Seleccionar Enterprise
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal Conector QR (WhatsAppConnector de backend) ── */}
      {newDevice && (
        <WhatsAppConnector
          isOpen={isConnectorOpen}
          onClose={() => {
            setIsConnectorOpen(false);
            setNewDevice(null);
            loadDashboard();
          }}
          device={newDevice}
          userId={user?.id}
        />
      )}
    </div>
  );
}
