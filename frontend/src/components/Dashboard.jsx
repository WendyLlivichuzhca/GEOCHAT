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
  ChevronDown,
  Info,
  Activity,
  Flag,
  CheckCheck,
  Settings,
  Lock
} from 'lucide-react';
import Sidebar from './Sidebar';
import WhatsAppConnector from './WhatsAppConnector';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

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

const colorsList = [
  { value: 'Mostaza', label: 'Mostaza', hex: '#eab308' },
  { value: 'Amarillo', label: 'Amarillo', hex: '#facc15' },
  { value: 'Naranja', label: 'Naranja', hex: '#f97316' },
  { value: 'Magenta', label: 'Magenta', hex: '#ec4899' },
  { value: 'Lila', label: 'Lila', hex: '#a855f7' }
];

const colorHexes = {
  Mostaza: '#eab308',
  Amarillo: '#facc15',
  Naranja: '#f97316',
  Magenta: '#ec4899',
  Lila: '#a855f7',
  qr: '#22c55e',
  business: '#22c55e',
  cloud: '#22c55e'
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-EC');
}

function formatLimit(value) {
  if (value === null || value === undefined || value === -1 || value === '-1' || Number(value) < 0) return 'Ilimitado';
  const number = Number(value || 0);
  if (number >= 999999) return 'Ilimitado';
  return formatNumber(number);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}


function formatHistoryDate(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${strTime}`;
}

function getStatusPillStyles(device) {
  const status = device.estado;
  if (status === 'conectado') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'conectando') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (device.numero_telefono || device.nombre) return 'bg-rose-50 text-rose-700 border-rose-200';
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

function getChannelBadge(color) {
  const normColor = String(color || '').toLowerCase();
  const isBusiness = normColor === 'business' || normColor === 'lila';
  const isCloud = normColor === 'cloud';

  return (
    <div className="absolute top-0 right-0 w-6 h-6 bg-[#25d366] rounded-full border border-white flex items-center justify-center text-white shadow-sm z-20">
      {isCloud ? (
        <Settings size={12} className="text-white" />
      ) : isBusiness ? (
        <span className="text-[10px] font-black leading-none select-none">B</span>
      ) : (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.012 2C6.486 2 2.01 6.48 2.01 12c0 1.91.5 3.702 1.383 5.243L2 22l4.907-1.285A9.92 9.92 0 0012.013 22c5.526 0 10.002-4.48 10.002-10S17.538 2 12.012 2zm5.46 12.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.47-.148-.669.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
        </svg>
      )}
    </div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [newDevice, setNewDevice] = useState(null);
  const [error, setError] = useState('');
  const [reconnectingDevice, setReconnectingDevice] = useState(null);

  // Modales y Flujos
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedConnectType, setSelectedConnectType] = useState(null); // null, 'qr', 'business'
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('mensual');
  const [upgradeSuccessMessage, setUpgradeSuccessMessage] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Estados para historial de conexión, capacitación y menú desplegable
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDevice, setHistoryDevice] = useState(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [activeDropdownDeviceId, setActiveDropdownDeviceId] = useState(null);

  // Notificaciones
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(1);
  const [activeNotificationTab, setActiveNotificationTab] = useState('general'); // 'general', 'unread'

  // Edición de Dispositivo
  const [editingDevice, setEditingDevice] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(null);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);

  // Onboarding Wizard
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [bizName, setBizName] = useState('GEO');
  const [bizUrl, setBizUrl] = useState('');
  const [bizType, setBizType] = useState('Agencia de Marketing Digital');
  const [bizRev, setBizRev] = useState('Menos de 100 USD / mes');
  const [bizSize, setBizSize] = useState('1-10');
  const [bizRole, setBizRole] = useState('');
  const [bizTools, setBizTools] = useState([]);

  // Paso 3 y 4 de Onboarding específicos de Funnelchat
  const [onboardingExp, setOnboardingExp] = useState('');
  const [onboardingObjective, setOnboardingObjective] = useState('');
  const [onboardingObjCustom, setOnboardingObjCustom] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');

  const loadDashboard = async (silent = false) => {
    if (!user?.id) {
      setError('No se encontró el usuario activo.');
      setIsLoading(false);
      return;
    }
    if (!silent) {
      setIsLoading(true);
    }
    setError('');
    try {
      // Limpieza automática silenciosa: elimina dispositivos "fantasma" sin número ni conexión
      await fetch(`${API_URL}/api/dispositivos/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      }).catch(() => { }); // silencioso: no interrumpir si falla

      const response = await fetch(`${API_URL}/api/dashboard/${user.id}`);
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'No se pudo cargar el dashboard.');
        return;
      }
      setDashboard(data.dashboard || emptyDashboard);

      // Comprobar onboarding
      const doneKey = `geochat_onboarding_done_${user.id}`;
      const dbDashboard = data.dashboard || {};
      const hasOnboarding = dbDashboard.onboarding_json;

      if (hasOnboarding) {
        localStorage.setItem(doneKey, 'true');

        // Pre-llenar estados de onboarding
        if (dbDashboard.nombre_negocio) setBizName(dbDashboard.nombre_negocio);
        if (dbDashboard.whatsapp_personal) setOnboardingPhone(dbDashboard.whatsapp_personal);

        const parsed = dbDashboard.onboarding_json;
        if (parsed.bizUrl) setBizUrl(parsed.bizUrl);
        if (parsed.bizType) setBizType(parsed.bizType);
        if (parsed.bizRev) setBizRev(parsed.bizRev);
        if (parsed.bizSize) setBizSize(parsed.bizSize);
        if (parsed.bizRole) setBizRole(parsed.bizRole);
        if (parsed.bizTools) setBizTools(parsed.bizTools || []);
        if (parsed.onboardingExp) setOnboardingExp(parsed.onboardingExp);
        if (parsed.onboardingObjective) setOnboardingObjective(parsed.onboardingObjective);
        if (parsed.onboardingObjCustom) setOnboardingObjCustom(parsed.onboardingObjCustom || '');
      }

      if (!localStorage.getItem(doneKey) && !hasOnboarding) {
        setShowOnboarding(true);
      } else {
        const trainingDismissedKey = `geochat_training_dismissed_${user.id}`;
        if (!localStorage.getItem(trainingDismissedKey)) {
          setShowTrainingModal(true);
        }
      }
    } catch {
      setError('Error de conexión al cargar el dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeployNode = async (connectionType) => {
    if (!user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/dispositivos/ensure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, create: true, tipo: connectionType }),
      });
      const data = await response.json();
      if (data.success) {
        // Guardar silenciosamente el tipo de conexión en el campo color de la base de datos
        await fetch(`${API_URL}/api/dispositivos/${data.device_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            nombre: 'Terminal WhatsApp',
            color: connectionType
          })
        }).catch(() => { });

        if (connectionType === 'cloud') {
          // Cloud API se considera conectada de forma simulada
          loadDashboard();
        } else {
          setNewDevice({ id: data.device_id, nombre: 'Terminal WhatsApp', color: connectionType });
          setIsConnectorOpen(true);
        }
      } else {
        setError(data.message || 'Error al desplegar nueva terminal.');
      }
    } catch {
      setError('Falla crítica en el despliegue del bridge de WhatsApp.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnectDevice = async (device, connectionType) => {
    if (!user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      // 1. Apagar el bridge anterior por seguridad
      await fetch(`${API_URL}/api/dispositivos/${device.id}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      }).catch(() => { });

      // 2. Actualizar el color (tipo) en la base de datos
      const response = await fetch(`${API_URL}/api/dispositivos/${device.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          nombre: device.nombre || 'Terminal WhatsApp',
          color: connectionType
        })
      });
      const data = await response.json();
      if (data.success) {
        if (connectionType === 'cloud') {
          setReconnectingDevice(null);
          loadDashboard();
        } else {
          // Abrir el conector QR con el nuevo tipo
          setNewDevice({ id: device.id, nombre: device.nombre || 'Terminal WhatsApp', color: connectionType });
          setIsConnectorOpen(true);
          setReconnectingDevice(null);
        }
      } else {
        setError(data.message || 'Error al re-conectar terminal.');
        setReconnectingDevice(null);
      }
    } catch (err) {
      console.error("Error reconnecting device:", err);
      setError('Error al re-conectar la terminal.');
      setReconnectingDevice(null);
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

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este dispositivo y liberar la ranura? Se perderá el nombre y configuración asignados.')) {
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/dispositivos/${deviceId}?user_id=${user.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        loadDashboard();
      } else {
        setError(data.message || 'No se pudo eliminar el dispositivo.');
      }
    } catch {
      setError('Error de red al intentar eliminar el dispositivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDeviceDetails = async () => {
    if (!editingDevice || !user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/dispositivos/${editingDevice.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          nombre: editName,
          color: editColor?.value || null
        })
      });
      const data = await response.json();
      if (data.success) {
        setEditingDevice(null);
        loadDashboard();
      } else {
        setError(data.message || 'No se pudo actualizar el dispositivo.');
      }
    } catch {
      setError('Error de red al guardar los cambios del dispositivo.');
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

  const handleToggleTool = (tool) => {
    if (bizTools.includes(tool)) {
      setBizTools(bizTools.filter(t => t !== tool));
    } else {
      setBizTools([...bizTools, tool]);
    }
  };

  const handleFinishOnboarding = async () => {
    // 1. Guardar en backend
    const onboarding_json = {
      bizUrl,
      bizType,
      bizRev,
      bizSize,
      bizRole,
      bizTools,
      onboardingExp,
      onboardingObjective,
      onboardingObjCustom
    };

    try {
      const response = await fetch(`${API_URL}/api/onboarding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          nombre_negocio: bizName,
          whatsapp_personal: onboardingPhone || null,
          onboarding_json
        })
      });

      const data = await response.json();
      if (data.success && data.user) {
        // Actualizar el estado global del usuario para que se reflejen los cambios
        if (onUpdateProfile) {
          onUpdateProfile({
            ...user,
            ...data.user
          });
        }
      }
    } catch (err) {
      console.error("Error al guardar el onboarding:", err);
    }

    localStorage.setItem(`geochat_onboarding_done_${user?.id}`, 'true');
    setShowOnboarding(false);

    // Mostrar Toast de éxito por 6 segundos
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 6000);

    // Abrir modal de capacitación personalizada
    setShowTrainingModal(true);
  };

  useEffect(() => {
    loadDashboard(false);

    const handleFocus = () => {
      loadDashboard(true);
    };

    window.addEventListener('focus', handleFocus);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboard(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  const maxQrDevices = Number(dashboard.plan?.limits?.dispositivos || 1);
  const allowsCloud = dashboard.plan?.features?.cloud_api || false;
  const maxDevices = maxQrDevices + (allowsCloud ? 1 : 0);
  const currentDevicesCount = dashboard.devices?.length || 0;
  // Solo mostrar 1 ranura vacía si hay capacidad en el plan, nunca más
  const emptySlotsCount = currentDevicesCount < maxDevices ? 1 : 0;

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
              onClick={() => {
                const doneKey = `geochat_onboarding_done_${user?.id}`;
                localStorage.removeItem(doneKey);
                setOnboardingStep(1);
                setShowOnboarding(true);
              }}
              className="text-xs font-black uppercase tracking-wider text-[#5d5fef] bg-[#5d5fef]/10 px-4 py-2 rounded-xl hover:bg-[#5d5fef] hover:text-white transition-colors"
              title="Iniciar asistente de negocio"
            >
              Configurar Negocio
            </button>

            <button
              type="button"
              onClick={loadDashboard}
              className="hover:text-indigo-600 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin text-[#5d5fef]' : ''} />
            </button>

            {/* Notification Bell with Popover (según captura 3) */}
            <div className="relative z-50">
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative cursor-pointer hover:text-indigo-600 transition-colors text-slate-500"
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#5d5fef] text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </div>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 text-left flex flex-col z-50 transform origin-top-right transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#1e1b4b] text-sm tracking-tight">
                      Notificaciones
                    </span>
                  </div>

                  {/* Pestañas y doble check */}
                  <div className="flex items-center justify-between mt-4 border-b border-slate-100 pb-1">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setActiveNotificationTab('general')}
                        className={`text-xs font-semibold pb-1.5 border-b-2 transition-all ${activeNotificationTab === 'general'
                          ? 'border-[#5d5fef] text-[#5d5fef]'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        General
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveNotificationTab('unread')}
                        className={`text-xs font-semibold pb-1.5 border-b-2 transition-all ${activeNotificationTab === 'unread'
                          ? 'border-[#5d5fef] text-[#5d5fef]'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        No leídos
                      </button>
                    </div>

                    {/* Botón Marcar todo como leído */}
                    <button
                      type="button"
                      onClick={() => setUnreadNotificationsCount(0)}
                      className="p-1.5 hover:bg-slate-50 rounded-lg text-[#5d5fef] transition-colors"
                      title="Marcar todo como leído"
                    >
                      <CheckCheck size={16} />
                    </button>
                  </div>

                  {/* Cuerpo de notificaciones */}
                  <div className="py-8 flex flex-col items-center justify-center text-center min-h-[120px]">
                    <span className="text-xs font-normal text-slate-400">
                      No hay notificaciones
                    </span>
                  </div>
                </div>
              )}
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
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-[#1e1b4b] tracking-tight">
                    {dashboard.plan?.nombre
                      ? (dashboard.plan.nombre === dashboard.plan.nombre.toUpperCase()
                        ? dashboard.plan.nombre.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                        : dashboard.plan.nombre)
                      : 'Plan Pro'}
                  </h1>
                  <CheckCircle2 size={18} className="text-[#22c55e] shrink-0" />
                  {dashboard.plan?.estado === 'prueba' && (
                    <span className="bg-sky-50 text-[#0284c7] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-sky-100 uppercase tracking-wider shrink-0">
                      Prueba Gratis
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-3 font-semibold">
                  {dashboard.plan?.estado === 'prueba' ? 'Inicio de prueba:' : 'Último pago:'} {formatDate(dashboard.plan?.fecha_inicio) || '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  Vence: {formatDate(dashboard.plan?.fecha_vencimiento) || '—'}
                </p>
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
                          width: `${
                            Number(dashboard.plan?.limits?.agentes) < 0
                              ? 0
                              : Math.min(
                                  (Number(dashboard.usage?.agentes || 0) /
                                    (Number(dashboard.plan?.limits?.agentes) || 1)) *
                                  100,
                                  100
                                )
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold text-right">
                      {Math.round(
                        Number(dashboard.plan?.limits?.agentes) < 0
                          ? 0
                          : Math.min(
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
                        / {formatLimit(maxDevices)}
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
                              (maxDevices || 1)) *
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
                            (maxDevices || 1)) *
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
                      {/* Fila superior de la tarjeta: contador y menú */}
                      <div className="w-full flex items-center justify-between text-slate-400 px-1 select-none">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742h.008v.008h-.008v-.008zm.37 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0h.008v.008h-.008v-.008zm.371 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.372m-3-1.125h.008v.008h-.008v-.008zm.371 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.372m6-2.25h.008v.008h-.008v-.008zm.371 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.372m-9 9.75h.008v.008h-.008v-.008zm.371 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H5.25m12 0h.008v.008h-.008v-.008zm.371 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.372" />
                          </svg>
                          <span>0</span>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownDeviceId(activeDropdownDeviceId === device.id ? null : device.id);
                            }}
                            className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeDropdownDeviceId === device.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-[1.25rem] shadow-xl py-2 z-30 text-left">
                              <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-50 mb-1">
                                Opciones
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownDeviceId(null);
                                  setEditingDevice(device);
                                  setEditName(device.nombre || '');
                                  const match = colorsList.find(c => c.value === device.color);
                                  setEditColor(match || null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Editar dispositivo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownDeviceId(null);
                                  setHistoryDevice(device);
                                  setShowHistoryModal(true);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Ver historial de conexión
                              </button>
                            </div>
                          )}
                        </div>
                      </div>                      <div className="w-full flex flex-col items-center mt-2">
                        {/* Concentric Circles WhatsApp Avatar with Custom Border */}
                        {device.estado === 'conectado' || device.numero_telefono || device.nombre ? (
                          <div className="relative w-24 h-24 flex items-center justify-center shrink-0 mb-4">
                            <div className={`absolute inset-0 rounded-full border ${device.estado === 'conectado'
                              ? 'border-emerald-100 bg-[#f0fdf4]/50 animate-pulse'
                              : 'border-rose-100 bg-rose-50/30'
                              }`} />
                            <div className={`absolute inset-2.5 rounded-full border ${device.estado === 'conectado' ? 'border-emerald-200' : 'border-rose-200'
                              }`} />

                            {/* Círculo del Avatar */}
                            <div
                              className={`relative w-16 h-16 rounded-full flex items-center justify-center z-10 overflow-hidden bg-slate-100 shadow-lg ${device.estado === 'conectado' ? 'shadow-emerald-100/50' : 'shadow-rose-100/50'
                                }`}
                              style={{
                                border: device.estado === 'conectado'
                                  ? (device.color ? `4px solid ${colorHexes[device.color] || '#25d366'}` : '4px solid #25d366')
                                  : '4px solid #f43f5e'
                              }}
                            >
                              {device.foto_perfil ? (
                                <img src={device.foto_perfil} alt={device.nombre} className="w-full h-full object-cover" />
                              ) : String(device.color).toLowerCase() === 'cloud' ? (
                                <div className="w-full h-full bg-gradient-to-br from-[#6366f1] to-[#38bdf8] flex items-center justify-center">
                                  <div className="w-4 h-4 rounded-sm bg-white opacity-90" />
                                </div>
                              ) : (
                                <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-[#5d5fef] font-bold text-lg">
                                  {device.nombre?.charAt(0) || 'W'}
                                </div>
                              )}
                            </div>
                            {getChannelBadge(device.color)}
                          </div>
                        ) : (
                          // Dispositivo desconectado / Sin uso (Avatar de Robot gris según captura 1)
                          <div className="relative w-24 h-24 flex items-center justify-center shrink-0 mb-4">
                            <div className="absolute inset-0 rounded-full border border-slate-100 bg-slate-50/50" />
                            <div className="absolute inset-2.5 rounded-full border border-slate-200" />
                            <div className="relative w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border-2 border-slate-200 shadow-inner z-10">
                              <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h.01M15 11h.01M12 15h.01" />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Nombre del dispositivo con lápiz de edición */}
                        <div className="flex items-center gap-1.5 justify-center mt-1">
                          <h4 className="font-extrabold text-[#1e1b4b] text-sm uppercase tracking-wide">
                            {device.nombre || (device.estado === 'conectado' ? 'Terminal' : 'Sin asignar')}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDevice(device);
                              setEditName(device.nombre || '');
                              const match = colorsList.find(c => c.value === device.color);
                              setEditColor(match || null);
                            }}
                            className="text-[#5d5fef] hover:text-[#4b4ded] p-0.5 rounded transition-colors"
                            title="Editar dispositivo"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                        </div>

                        <p className="text-xs font-bold text-slate-400 mt-1 select-none">
                          {device.numero_telefono ? (
                            <>
                              -{' '}
                              <span
                                onClick={() => {
                                  setHistoryDevice(device);
                                  setShowHistoryModal(true);
                                }}
                                className="text-[#5d5fef] hover:underline cursor-pointer"
                                title="Ver historial de conexión"
                              >
                                {device.numero_telefono}
                              </span>
                            </>
                          ) : (
                            'Sin registro'
                          )}
                        </p>

                        <div
                          className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest mt-4 border ${getStatusPillStyles(
                            device
                          )}`}
                        >
                          {device.estado === 'conectado'
                            ? 'Conectado'
                            : (device.numero_telefono || device.nombre)
                              ? 'Desconectado'
                              : 'Sin uso'}
                        </div>
                      </div>

                      <div className="w-full mt-6 space-y-3">
                        <p className="text-[10px] text-[#9ca3af] font-bold">
                          {device.conectado_en
                            ? `Conectado: ${formatDate(device.conectado_en)}`
                            : `Creado: ${formatDate(device.creado_en)}`}
                        </p>

                        {device.estado === 'conectado' ? (
                          <button
                            type="button"
                            onClick={() => handleDisconnectDevice(device.id)}
                            className="w-full py-2.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                          >
                            Desconectar número
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {/* Botón de Conectar Número con icono de teléfono (según captura 1) */}
                            <button
                              type="button"
                              onClick={() => {
                                setReconnectingDevice(device);
                                setSelectedConnectType(null);
                                setShowConnectModal(true);
                              }}
                              className="w-full py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-sm inline-flex items-center justify-center gap-2"
                            >
                              <Smartphone size={14} className="text-slate-400" />
                              Conectar número
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDevice(device.id)}
                              className="w-full py-2 text-red-500 hover:bg-red-50 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-colors"
                            >
                              Eliminar dispositivo
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                {/* Espacios Vacíos del Plan */}
                {Array.from({ length: emptySlotsCount }).map((_, idx) => (
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
                {(
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

      {/* ── MODAL: Editar dispositivo ── */}
      <AnimatePresence>
        {editingDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] p-8 border border-slate-100 shadow-2xl flex flex-col text-left"
            >
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-[#1e1b4b] tracking-tight uppercase">Editar dispositivo</h3>

              <div className="mt-6 space-y-5">
                {/* Input: Nombre */}
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Nombre del dispositivo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Escribe el nombre"
                    className="w-full mt-2 p-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5d5fef] text-sm font-semibold"
                  />
                </div>

                {/* Dropdown: Color selector */}
                <div className="relative">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Selecciona el color para identificar tu dispositivo</label>
                  <div
                    onClick={() => setColorDropdownOpen(!colorDropdownOpen)}
                    className="w-full mt-2 p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer text-sm font-semibold select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      {editColor ? (
                        <>
                          <Flag className="w-4 h-4 fill-current shrink-0" style={{ color: editColor.hex, fill: editColor.hex }} />
                          <span>{editColor.label}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Selecciona un color</span>
                      )}
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 transform transition-transform ${colorDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {colorDropdownOpen && (
                    <div className="absolute w-full mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-lg py-2 z-30 max-h-48 overflow-y-auto">
                      {colorsList.map((c) => (
                        <div
                          key={c.value}
                          onClick={() => {
                            setEditColor(c);
                            setColorDropdownOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm font-semibold"
                        >
                          <Flag className="w-4 h-4 fill-current shrink-0" style={{ color: c.hex, fill: c.hex }} />
                          <span>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!editName.trim()}
                  onClick={handleSaveDeviceDetails}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md ${editName.trim()
                    ? 'bg-[#5d5fef] hover:bg-[#4b4ded] text-white cursor-pointer'
                    : 'bg-[#e2e8f0] text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                >
                  Guardar cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Números extras y API ── */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-2xl flex flex-col text-left"
            >
              {/* Botón cerrar */}
              <button
                type="button"
                onClick={() => { setShowConnectModal(false); setReconnectingDevice(null); }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-[#1e1b4b] tracking-tight uppercase">Números extras y API</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                Selecciona la opción que mejor se adapte a tus necesidades.
              </p>

              {/* Grid Horizontal de Canales dinámico */}
              {(() => {
                const planNameLower = String(dashboard.plan?.nombre || '').toLowerCase();
                const isProExtra = planNameLower.includes('pro x 100') || planNameLower.includes('100 + 3') || planNameLower.includes('agentes extras');
                const showOnlyCloud = isProExtra && (dashboard.devices?.length >= 3);

                const isReconnectingQr = reconnectingDevice && String(reconnectingDevice.color).toLowerCase() !== 'cloud';
                const isReconnectingCloud = reconnectingDevice && String(reconnectingDevice.color).toLowerCase() === 'cloud';

                const qrDevicesCount = (dashboard.devices?.filter(d => String(d.color).toLowerCase() !== 'cloud').length || 0) - (isReconnectingQr ? 1 : 0);
                const cloudDevicesCount = (dashboard.devices?.filter(d => String(d.color).toLowerCase() === 'cloud').length || 0) - (isReconnectingCloud ? 1 : 0);
                
                const maxQrDevices = dashboard.plan?.limits?.dispositivos || 1;
                const allowsCloud = dashboard.plan?.features?.cloud_api || false;

                const isQrLimitReached = qrDevicesCount >= maxQrDevices;
                const isCloudLimitReached = cloudDevicesCount >= 1;

                const qrDisabled = isQrLimitReached;
                const cloudDisabled = !allowsCloud || isCloudLimitReached;

                return (
                  <>
                    <div className={`mt-8 grid gap-6 ${showOnlyCloud ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-3'}`}>
                      {/* Opción 1: WhatsApp Messenger */}
                      {!showOnlyCloud && (
                        <div
                          onClick={() => {
                            if (qrDisabled) {
                              alert("Límite de dispositivos QR alcanzado para tu plan actual. Por favor, mejora tu plan.");
                            } else {
                              setSelectedConnectType('qr');
                            }
                          }}
                          className={`p-6 rounded-[1.5rem] border-2 flex flex-col items-center text-center transition-all ${qrDisabled
                            ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                            : selectedConnectType === 'qr'
                              ? 'border-[#25d366] bg-[#e8fbe8]/45 shadow-sm cursor-pointer'
                              : 'border-slate-150 hover:border-slate-200 bg-white hover:shadow-sm cursor-pointer'
                            }`}
                        >
                          <div className="w-14 h-14 bg-[#25d366] rounded-full flex items-center justify-center text-white shadow-md relative">
                            {qrDisabled && (
                              <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                                <Lock size={10} strokeWidth={3} />
                              </div>
                            )}
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.012 2C6.486 2 2.01 6.48 2.01 12c0 1.91.5 3.702 1.383 5.243L2 22l4.907-1.285A9.92 9.92 0 0012.013 22c5.526 0 10.002-4.48 10.002-10S17.538 2 12.012 2zm5.46 12.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.47-.148-.669.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                            </svg>
                          </div>
                          <span className="font-extrabold text-[11px] text-[#1e1b4b] mt-4 uppercase tracking-wide">WhatsApp Messenger</span>
                          {qrDisabled && (
                            <span className="text-[9px] text-amber-600 font-bold mt-1">Límite alcanzado</span>
                          )}
                        </div>
                      )}

                      {/* Opción 2: WhatsApp Business */}
                      {!showOnlyCloud && (
                        <div
                          onClick={() => {
                            if (qrDisabled) {
                              alert("Límite de dispositivos QR alcanzado para tu plan actual. Por favor, mejora tu plan.");
                            } else {
                              setSelectedConnectType('business');
                            }
                          }}
                          className={`p-6 rounded-[1.5rem] border-2 flex flex-col items-center text-center transition-all ${qrDisabled
                            ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                            : selectedConnectType === 'business'
                              ? 'border-[#25d366] bg-[#e8fbe8]/45 shadow-sm cursor-pointer'
                              : 'border-slate-150 hover:border-slate-200 bg-white hover:shadow-sm cursor-pointer'
                            }`}
                        >
                          <div className="w-14 h-14 bg-[#25d366] rounded-full flex items-center justify-center text-white shadow-md font-black text-lg select-none relative">
                            {qrDisabled && (
                              <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                                <Lock size={10} strokeWidth={3} />
                              </div>
                            )}
                            B
                          </div>
                          <span className="font-extrabold text-[11px] text-[#1e1b4b] mt-4 uppercase tracking-wide">WhatsApp Business</span>
                          {qrDisabled && (
                            <span className="text-[9px] text-amber-600 font-bold mt-1">Límite alcanzado</span>
                          )}
                        </div>
                      )}

                      {/* Opción 3: WhatsApp Cloud API */}
                      <div
                        onClick={() => {
                          if (!allowsCloud) {
                            alert("WhatsApp Cloud API no está disponible en tu plan actual. Por favor, mejora tu plan.");
                          } else if (isCloudLimitReached) {
                            alert("Límite de líneas Cloud API alcanzado (Máximo 1).");
                          } else {
                            setSelectedConnectType('cloud');
                          }
                        }}
                        className={`p-6 rounded-[1.5rem] border-2 flex flex-col items-center text-center transition-all ${cloudDisabled
                          ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : selectedConnectType === 'cloud'
                            ? 'border-[#25d366] bg-[#e8fbe8]/45 shadow-sm cursor-pointer'
                            : 'border-slate-150 hover:border-slate-200 bg-white hover:shadow-sm cursor-pointer'
                          }`}
                      >
                        <div className="w-14 h-14 bg-[#25d366] rounded-full flex items-center justify-center text-white shadow-md relative">
                          {cloudDisabled && (
                              <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                                <Lock size={10} strokeWidth={3} />
                              </div>
                          )}
                          <Settings size={22} className="text-white" />
                        </div>
                        <span className="font-extrabold text-[11px] text-[#1e1b4b] mt-4 uppercase tracking-wide">WhatsApp Cloud API</span>
                        {cloudDisabled && (
                          <span className="text-[9px] text-amber-600 font-bold mt-1">
                            {!allowsCloud ? 'No disponible en tu plan' : 'Límite alcanzado'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => { setSelectedConnectType(null); setShowConnectModal(false); setReconnectingDevice(null); }}
                        className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!selectedConnectType}
                        onClick={() => {
                          if (selectedConnectType) {
                            setShowConnectModal(false);
                            if (reconnectingDevice) {
                              handleReconnectDevice(reconnectingDevice, selectedConnectType);
                            } else {
                              handleDeployNode(selectedConnectType);
                            }
                          }
                        }}
                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${selectedConnectType
                          ? 'bg-[#5d5fef] hover:bg-[#4b4ded] text-white cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                          }`}
                      >
                        Continuar
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Onboarding Wizard (Asistente de Bienvenida de Funnelchat) ── */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-2xl flex flex-col text-left"
            >
              {/* Barra de Progreso Superior */}
              <div className="w-full flex items-center justify-between text-[11px] font-black text-[#5d5fef] uppercase tracking-widest mb-3">
                <span>Paso {onboardingStep} de 4</span>
                <span className="text-slate-400">Configuración</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mb-8 overflow-hidden">
                <div
                  className="bg-[#22c55e] h-full rounded-full transition-all duration-300"
                  style={{ width: `${(onboardingStep / 4) * 100}%` }}
                />
              </div>

              {/* Paso 1: Cuéntanos más sobre tu negocio */}
              {onboardingStep === 1 && (
                <div className="space-y-5 flex-1">
                  <h3 className="text-2xl font-black text-[#1e1b4b] uppercase tracking-tight leading-none mb-1">
                    ¡Bienvenido a Funnelchat!
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Cuéntanos más sobre tu negocio
                  </p>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
                        Nombre de tu negocio <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        placeholder="Ej: GEO"
                        className="w-full mt-2 p-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5d5fef] text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
                        Sitio web / Instagram
                      </label>
                      <input
                        type="text"
                        value={bizUrl}
                        onChange={(e) => setBizUrl(e.target.value)}
                        placeholder="Escribe el sitio web o Instagram"
                        className="w-full mt-2 p-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5d5fef] text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
                        ¿Qué tipo de negocio tienes?
                      </label>
                      <select
                        value={bizType}
                        onChange={(e) => setBizType(e.target.value)}
                        className="w-full mt-2 p-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5d5fef] text-sm font-semibold"
                      >
                        <option>Agencia de Marketing Digital</option>
                        <option>E-commerce</option>
                        <option>Educación / Cursos</option>
                        <option>Freelancer / Consultor</option>
                        <option>Servicios Profesionales</option>
                        <option>Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-3">
                        ¿Cuál es el nivel de facturación mensual del negocio? <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2.5">
                        {[
                          'Más de 10000 USD / mes',
                          'Entre 5000 USD y 10000 USD / mes',
                          'Entre 1000 USD y 5000 USD / mes',
                          'Entre 100 USD y 1000 USD / mes',
                          'Menos de 100 USD / mes',
                        ].map((rev) => (
                          <label key={rev} className="flex items-center gap-3 cursor-pointer text-xs font-bold text-slate-600">
                            <input
                              type="radio"
                              name="bizRev"
                              value={rev}
                              checked={bizRev === rev}
                              onChange={(e) => setBizRev(e.target.value)}
                              className="rounded-full text-[#5d5fef] border-slate-350 focus:ring-[#5d5fef] w-4 h-4 cursor-pointer"
                            />
                            <span>{rev}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 2: Ayúdanos a conocer tu negocio */}
              {onboardingStep === 2 && (
                <div className="space-y-5 flex-1">
                  <h3 className="text-2xl font-black text-[#1e1b4b] uppercase tracking-tight leading-none mb-1">
                    Ayúdanos a conocer tu negocio
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Conozcamos más detalles
                  </p>

                  <div className="space-y-5 pt-2">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-3">
                        ¿Cuántas personas trabajan en tu negocio?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['1-10', '11-20', '21-50', '51-200', '201-1.000', 'Más de 1.000'].map((size) => (
                          <label
                            key={size}
                            className={`p-3 border rounded-2xl flex items-center justify-center cursor-pointer font-bold text-xs transition-all ${bizSize === size
                              ? 'border-[#5d5fef] bg-indigo-50/20 text-[#5d5fef]'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                              }`}
                          >
                            <input
                              type="radio"
                              name="bizSize"
                              value={size}
                              checked={bizSize === size}
                              onChange={(e) => setBizSize(e.target.value)}
                              className="sr-only"
                            />
                            <span>{size}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
                        ¿Cuál de las siguientes opciones describe mejor tu rol? <span className="text-red-500">*</span>
                      </label>
                      <div className="relative mt-2">
                        <select
                          value={bizRole}
                          onChange={(e) => setBizRole(e.target.value)}
                          className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5d5fef] text-sm font-semibold appearance-none pr-10"
                        >
                          <option value="">Selecciona opción</option>
                          <option>Fundador / Dueño</option>
                          <option>Director de Ventas / Marketing</option>
                          <option>Agente de Soporte / Ventas</option>
                          <option>Desarrollador / TI</option>
                          <option>Otro</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-3">
                        ¿Cuáles son las herramientas principales que utilizas para la gestión de tu negocio?
                      </label>
                      <div className="flex flex-col gap-2.5 max-h-44 overflow-y-auto pr-1 mt-2">
                        {[
                          'Active Campaign',
                          'HubSpot',
                          'Salesforce',
                          'Mailchimp',
                          'Make',
                          'Shopify',
                          'WooCommerce',
                          'Hotmart',
                          'GetResponse',
                          'Calendly',
                          'Otro',
                        ].map((tool) => (
                          <label
                            key={tool}
                            className="flex items-center gap-3 cursor-pointer text-xs font-bold text-slate-600 select-none py-0.5"
                          >
                            <input
                              type="checkbox"
                              checked={bizTools.includes(tool)}
                              onChange={() => handleToggleTool(tool)}
                              className="rounded-full text-[#5d5fef] border-slate-350 focus:ring-[#5d5fef] w-4 h-4 cursor-pointer"
                            />
                            <span>{tool}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 3: Experiencia y Objetivo de automatizaciones (según captura 2) */}
              {onboardingStep === 3 && (
                <div className="space-y-5 flex-1">
                  <h3 className="text-2xl font-black text-[#1e1b4b] uppercase tracking-tight leading-none mb-1">
                    Creemos la mejor experiencia para ti
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Automatizaciones de WhatsApp
                  </p>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">
                        ¿Qué nivel de experiencia tienes con las automatizaciones en WhatsApp? <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2.5">
                        {[
                          'Soy principiante',
                          'Tengo algo de experiencia',
                          'Soy avanzado'
                        ].map((exp) => (
                          <label key={exp} className="flex items-center gap-3 cursor-pointer text-xs font-bold text-slate-600">
                            <input
                              type="radio"
                              name="onboardingExp"
                              value={exp}
                              checked={onboardingExp === exp}
                              onChange={(e) => setOnboardingExp(e.target.value)}
                              className="rounded-full text-[#5d5fef] border-slate-350 focus:ring-[#5d5fef] w-4 h-4 cursor-pointer"
                            />
                            <span>{exp}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">
                        ¿Cuál es tu principal objetivo con Funnelchat? <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {[
                          'Organizar Chats',
                          'Administrar múltiples asesores',
                          'Optimizar la gestión de grupos / comunidades',
                          'Disparar mensajes masivos',
                          'Segmentar contactos',
                          'Crear flujos automáticos',
                          'Otro'
                        ].map((obj) => (
                          <label key={obj} className="flex items-center gap-3 cursor-pointer text-xs font-bold text-slate-600">
                            <input
                              type="radio"
                              name="onboardingObjective"
                              value={obj}
                              checked={onboardingObjective === obj}
                              onChange={(e) => setOnboardingObjective(e.target.value)}
                              className="rounded-full text-[#5d5fef] border-slate-350 focus:ring-[#5d5fef] w-4 h-4 cursor-pointer"
                            />
                            <span>{obj}</span>
                          </label>
                        ))}
                      </div>

                      {onboardingObjective === 'Otro' && (
                        <input
                          type="text"
                          value={onboardingObjCustom}
                          onChange={(e) => setOnboardingObjCustom(e.target.value)}
                          placeholder="Escribe tu respuesta"
                          className="w-full mt-3.5 p-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5d5fef] text-sm font-semibold"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 4: Configuremos tu perfil (según captura 4) */}
              {onboardingStep === 4 && (
                <div className="space-y-5 flex-1">
                  <h3 className="text-2xl font-black text-[#1e1b4b] uppercase tracking-tight leading-none mb-1">
                    Configuremos tu perfil
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Contacto de seguridad
                  </p>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
                        Número de WhatsApp personal <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-2 phone-input-container">
                        <PhoneInput
                          country={'ec'}
                          preferredCountries={['ec', 'co', 'pe', 'mx', 'ar', 'es', 'us']}
                          value={onboardingPhone}
                          onChange={(phone) => setOnboardingPhone(phone)}
                          inputStyle={{
                            width: '100%',
                            height: '52px',
                            borderRadius: '1rem',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            fontWeight: '600',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            paddingLeft: '58px'
                          }}
                          buttonStyle={{
                            border: '1px solid #cbd5e1',
                            borderTopLeftRadius: '1rem',
                            borderBottomLeftRadius: '1rem',
                            backgroundColor: '#f8fafc',
                            paddingLeft: '6px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Nota de privacidad lila */}
                    <div className="p-4 bg-[#f3f0ff] border border-[#e9e3ff] rounded-2xl text-[#6d28d9] text-[11px] font-bold leading-normal">
                      NOTA: Allí te notificaremos por temas importantes sobre tu cuenta. No compartiremos esta información con nadie.
                    </div>
                  </div>
                </div>
              )}

              {/* Fila de Botones del Wizard */}
              <div className="mt-8 flex justify-between pt-4 border-t border-slate-100">
                {onboardingStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(onboardingStep - 1)}
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors"
                  >
                    Regresar
                  </button>
                ) : (
                  <div />
                )}

                {onboardingStep < 4 ? (
                  <button
                    type="button"
                    disabled={
                      (onboardingStep === 1 && !bizName.trim()) ||
                      (onboardingStep === 2 && !bizRole) ||
                      (onboardingStep === 3 && (!onboardingExp || !onboardingObjective || (onboardingObjective === 'Otro' && !onboardingObjCustom.trim())))
                    }
                    onClick={() => {
                      setOnboardingStep(onboardingStep + 1);
                    }}
                    className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md ml-auto ${(
                      (onboardingStep === 1 && bizName.trim()) ||
                      (onboardingStep === 2 && bizRole) ||
                      (onboardingStep === 3 && onboardingExp && onboardingObjective && (onboardingObjective !== 'Otro' || onboardingObjCustom.trim()))
                    )
                      ? 'bg-[#5d5fef] hover:bg-[#4b4ded] text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!onboardingPhone.trim()}
                    onClick={() => {
                      handleFinishOnboarding();
                    }}
                    className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md ml-auto ${onboardingPhone.trim()
                      ? 'bg-[#5d5fef] hover:bg-[#4b4ded] text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                  >
                    Guardar
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toast de confirmación de éxito flotante (según captura 5) ── */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-6 right-6 z-50 bg-[#e8fbe8] border border-emerald-250 text-emerald-800 rounded-2xl px-5 py-4 shadow-xl flex items-center gap-3 font-bold text-sm"
          >
            <div className="w-5 h-5 bg-[#22c55e] text-white rounded-full flex items-center justify-center">
              <Check size={13} strokeWidth={3} />
            </div>
            <span>Información actualizada, muchas gracias.</span>
            <button onClick={() => setShowSuccessToast(false)} className="text-emerald-400 hover:text-emerald-600 ml-4">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Planes Funnelchat ── */}
      <AnimatePresence>
        {showPlansModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ zoom: '80%' }}
              className="relative w-full max-w-[1400px] bg-white text-[#1e1b4b] rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-2xl flex flex-col text-center max-h-[96vh] overflow-y-auto"
            >
              {/* Botón cerrar */}
              <button
                type="button"
                onClick={() => setShowPlansModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X size={22} />
              </button>

              <h3 className="text-3xl font-black text-[#1e1b4b] tracking-tight uppercase">
                Nuestros planes
              </h3>
              <p className="text-xs md:text-sm text-slate-500 font-semibold max-w-xl mx-auto mt-1 leading-relaxed">
                Obtén hasta <span className="text-[#22c55e]">2 MESES GRATIS</span> y Reuniones Personalizadas con nuestro equipo con la suscripción anual.
              </p>

              {/* Selector de periodo de facturación */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <span className={`text-xs font-black uppercase tracking-wider transition-colors ${billingPeriod === 'mensual' ? 'text-[#1e1b4b]' : 'text-slate-400'}`}>Mensual</span>
                <button
                  onClick={() => setBillingPeriod(billingPeriod === 'mensual' ? 'anual' : 'mensual')}
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-100 transition-colors mx-2 focus:outline-none"
                >
                  <span
                    className={`${billingPeriod === 'anual' ? 'translate-x-6 bg-[#22c55e]' : 'translate-x-1 bg-slate-350'
                      } inline-block h-4 w-4 transform rounded-full transition-transform`}
                  />
                </button>
                <div className="relative inline-flex items-center">
                  <span className={`text-xs font-black uppercase tracking-wider transition-colors ${billingPeriod === 'anual' ? 'text-[#1e1b4b]' : 'text-slate-400'}`}>Anual</span>
                  {/* Floating badge */}
                  <div className="absolute -top-7 -right-14 bg-[#22c55e] text-white text-[9px] font-black px-2 py-0.5 rounded-full select-none shadow-sm whitespace-nowrap animate-pulse">
                    Ahorra 2 meses
                  </div>
                </div>
              </div>

              {/* Tarjetas de Precios */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 flex-1 text-left">
                {/* Plan Starter */}
                <div className="bg-[#f8fafc] rounded-[2rem] p-6 border border-slate-100 flex flex-col justify-between text-left">
                  <div>
                    <div className="inline-block px-3 py-1 rounded-full border border-slate-200 bg-white text-[9px] font-black tracking-widest text-[#22c55e] uppercase">
                      + PLAN CON IA
                    </div>
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block mt-3">
                      {billingPeriod === 'mensual' ? 'MENSUAL' : 'ANUAL'}
                    </span>
                    <h4 className="text-lg font-black text-[#1e1b4b] mt-0.5">Plan Starter</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-snug">
                      Ideal para emprendedores que quieren iniciar con WhatsApp profesional.
                    </p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#1e1b4b]">
                        {billingPeriod === 'mensual' ? '$49' : '$41'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">USD/mes</span>
                    </div>

                    <button
                      onClick={() => handleUpgradePlan('Plan Starter')}
                      className="w-full mt-4 py-2 border-2 border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-white rounded-full font-black text-[11px] uppercase tracking-wider transition-all text-center block"
                    >
                      Prueba 7 días GRATIS
                    </button>

                    {/* Features list */}
                    <ul className="space-y-1.5 mt-4">
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Hasta <span className="font-extrabold text-[#1e1b4b]">3,500</span> Contactos Activos Mensuales (MAC)</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Base de datos ilimitada en el CRM</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">1</span> Número de WhatsApp Business</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">1</span> número WhatsApp Cloud API</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">1</span> acceso multiagente</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Agentes IA ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Objetivos Agentes IA: FAQ</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Automatizaciones ilimitadas</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">Automatizaciones con IA</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Envíos Masivos ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Grupos y Comunidades ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Gestión de grupos y comunidades</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">Funciones IA de Grupos y Comunidades</span>
                      </li>

                      {/* Soporte */}
                      <li className="pt-2 pb-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                          SOPORTE STANDARD
                        </span>
                      </li>

                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Sesión Inicial <span className="text-[#22c55e] font-black">INCLUIDA</span> $100 USD</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Chat y WhatsApp – lunes a domingo y festivos</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Reuniones en Zoom y Meet diarias</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">Grupo de Soporte Personalizado</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">Key Account Manager</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">3 Sesiones Personalizadas</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Plan Growth */}
                <div className="bg-[#f8fafc] rounded-[2rem] p-6 border border-slate-100 flex flex-col justify-between text-left">
                  <div>
                    <div className="inline-block px-3 py-1 rounded-full border border-slate-200 bg-white text-[9px] font-black tracking-widest text-[#22c55e] uppercase">
                      + PLAN CON IA
                    </div>
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block mt-3">
                      {billingPeriod === 'mensual' ? 'MENSUAL' : 'ANUAL'}
                    </span>
                    <h4 className="text-lg font-black text-[#1e1b4b] mt-0.5">Plan Growth</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-snug">
                      Ideal para negocios con equipos de trabajo que priorizan su atención al cliente por WhatsApp.
                    </p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#1e1b4b]">
                        {billingPeriod === 'mensual' ? '$99' : '$82'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">USD/mes</span>
                    </div>

                    <button
                      onClick={() => handleUpgradePlan('Plan Growth')}
                      className="w-full mt-4 py-2 border-2 border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-white rounded-full font-black text-[11px] uppercase tracking-wider transition-all text-center block"
                    >
                      Prueba 7 días GRATIS
                    </button>

                    {/* Features list */}
                    <ul className="space-y-1.5 mt-4">
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Hasta <span className="font-extrabold text-[#1e1b4b]">8,000</span> Contactos Activos Mensuales (MAC)</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Base de datos ilimitada en el CRM</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">2</span> Números de WhatsApp Business</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">1</span> número WhatsApp Cloud API</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">3</span> accesos multiagente</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Agentes IA ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Objetivos Agentes IA: FAQ</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Automatizaciones ilimitadas</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">Automatizaciones con IA</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Envíos Masivos ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Grupos y Comunidades ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Gestión de grupos y comunidades</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">Funciones IA de Grupos y Comunidades</span>
                      </li>

                      {/* Soporte */}
                      <li className="pt-2 pb-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                          SOPORTE STANDARD
                        </span>
                      </li>

                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Sesión Inicial <span className="text-[#22c55e] font-black">INCLUIDA</span> $100 USD</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Chat y WhatsApp – lunes a domingo y festivos</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Reuniones en Zoom y Meet diarias</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">Grupo de Soporte Personalizado</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">Key Account Manager</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">3 Sesiones Personalizadas</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Plan Advanced (Más Popular, borde brillante) */}
                <div className="bg-[#e8fbe8]/15 rounded-[2rem] p-6 border-2 border-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.12)] flex flex-col justify-between text-left relative overflow-hidden transform lg:-translate-y-2">
                  <div className="absolute top-0 right-0 overflow-hidden w-28 h-28">
                    <div className="bg-[#22c55e] text-white font-extrabold text-[9px] uppercase tracking-widest text-center py-1.5 absolute top-4 -right-8 w-32 rotate-45 shadow-sm">
                      Más Popular
                    </div>
                  </div>

                  <div>
                    <div className="inline-block px-3 py-1 rounded-full border border-[#22c55e]/25 bg-white text-[9px] font-black tracking-widest text-[#22c55e] uppercase">
                      + PLAN CON IA
                    </div>
                    <span className="text-[9px] font-bold text-[#22c55e] uppercase tracking-widest block mt-3">
                      {billingPeriod === 'mensual' ? 'MENSUAL' : 'ANUAL'}
                    </span>
                    <h4 className="text-lg font-black text-[#1e1b4b] mt-0.5">Plan Advanced</h4>
                    <p className="text-[11px] text-slate-450 font-semibold mt-0.5 leading-snug pr-6">
                      Ideal para negocios con equipos de trabajo que requieren integraciones adicionales, funciones avanzadas y soporte premium.
                    </p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#22c55e]">
                        {billingPeriod === 'mensual' ? '$199' : '$165'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">USD/mes</span>
                    </div>

                    <button
                      onClick={() => handleUpgradePlan('Plan Advanced')}
                      className="w-full mt-4 py-2 bg-[#22c55e] text-white hover:bg-[#1db954] rounded-full font-black text-[11px] uppercase tracking-wider transition-all text-center block shadow-[0_4px_10px_rgba(34,197,94,0.3)]"
                    >
                      Prueba 7 días GRATIS
                    </button>

                    {/* Features list */}
                    <ul className="space-y-1.5 mt-4">
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Hasta <span className="font-extrabold text-[#1e1b4b]">30,000</span> Contactos Activos Mensuales (MAC)</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Base de datos ilimitada en el CRM</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">3</span> Números de WhatsApp Business</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">1</span> número WhatsApp Cloud API</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600"><span className="font-extrabold text-[#1e1b4b]">5</span> accesos multiagente</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Agentes IA ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Objetivos Agentes IA: <span className="font-extrabold text-[#1e1b4b]">TODOS</span></span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Automatizaciones ilimitadas</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Automatizaciones con IA</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Envíos Masivos ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Grupos y Comunidades ilimitados</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Gestión de grupos y comunidades</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Funciones IA de Grupos y Comunidades</span>
                      </li>

                      {/* Soporte */}
                      <li className="pt-2 pb-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                          SOPORTE PREMIUM
                        </span>
                      </li>

                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Sesión Inicial <span className="text-[#22c55e] font-black">INCLUIDA</span> $100 USD</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Chat y WhatsApp – lunes a domingo y festivos</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Reuniones en Zoom y Meet diarias</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Grupo de Soporte Personalizado</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Key Account Manager</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                        <span className="text-slate-400 line-through">3 Sesiones Personalizadas</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Personalizado */}
                <div className="bg-[#f8fafc] rounded-[2rem] p-6 border border-slate-100 flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block mt-3">
                      A MEDIDA
                    </span>
                    <h4 className="text-lg font-black text-[#1e1b4b] mt-0.5">Personalizado</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-snug">
                      Soluciones personalizadas para negocios con grandes equipos de trabajo que requieren más, para escalar aún más.
                    </p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#1e1b4b]">A convenir</span>
                    </div>

                    <button
                      onClick={() => alert('Contactando con el equipo de ventas...')}
                      className="w-full mt-4 py-2 border-2 border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-white rounded-full font-black text-[11px] uppercase tracking-wider transition-all text-center block"
                    >
                      Contactarme con ventas
                    </button>

                    {/* Features list */}
                    <ul className="space-y-1.5 mt-4">
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Todas las características del Plan Advanced incluidas</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Planes Semestrales y Anuales</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Consultorías Personalizadas 1 a 1</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Sesiones de Activación Rápida (Setup Completo)</span>
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                        <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-600">Configuración completa con Integraciones</span>
                      </li>
                    </ul>
                  </div>
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

      {/* ── MODAL: Historial de conexión del dispositivo (según captura 3) ── */}
      <AnimatePresence>
        {showHistoryModal && historyDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-2xl flex flex-col text-left"
            >
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryDevice(null);
                }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-[#1e1b4b] tracking-tight uppercase">
                Historial de conexión del dispositivo
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                Verifica el estado de conexión de tu dispositivo.
              </p>

              <div className="mt-6 overflow-hidden border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4">Acción</th>
                      <th className="px-6 py-4">Número de teléfono</th>
                      <th className="px-6 py-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-xs font-semibold text-slate-700 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center bg-[#e8fbe8] border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Conectado
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-600">
                        {historyDevice.numero_telefono || '593959709519'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-bold">
                        {formatHistoryDate(historyDevice.conectado_en || historyDevice.creado_en)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Sesión de capacitación personalizada (según captura 5) ── */}
      <AnimatePresence>
        {showTrainingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] p-0 border border-slate-150 shadow-2xl flex flex-col text-left overflow-hidden"
            >
              {/* Botón cerrar */}
              <button
                type="button"
                onClick={() => setShowTrainingModal(false)}
                className="absolute top-6 right-6 p-2 text-white/75 hover:text-white rounded-full bg-slate-800/40 hover:bg-slate-800/60 transition-colors z-20"
              >
                <X size={20} />
              </button>

              {/* Banner superior (diseño oscuro premium de Funnelchat) */}
              <div className="bg-[#1e1b4b] text-white p-8 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                {/* Decoración geométrica */}
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none select-none">
                  <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
                  </svg>
                </div>

                <div className="z-10 flex items-center justify-between gap-4">
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-emerald-500 text-white px-2.5 py-1 rounded-md">
                      Funnelchat
                    </span>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight max-w-[320px] leading-tight">
                      Sesión de capacitación personalizada
                    </h3>
                    <p className="text-[11px] text-slate-300 font-semibold max-w-[340px] leading-relaxed">
                      Da tus primeros pasos, resuelve tus dudas y aprende a usar la plataforma de forma más efectiva.
                    </p>
                  </div>

                  {/* Avatar de soporte circular premium */}
                  <div className="w-24 h-24 rounded-full border-4 border-emerald-400 overflow-hidden bg-slate-100 shadow-lg shrink-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Contenido inferior */}
              <div className="p-8 flex flex-col items-center text-center">
                {/* Barra verde de llamada a la acción */}
                <div className="w-full bg-[#22c55e] text-white text-[11px] font-black py-2.5 px-4 rounded-xl uppercase tracking-wider mb-6 select-none shadow-sm">
                  HAZ CLIC Y AGENTA TU SESIÓN GRATIS. ¡CUPOS LIMITADOS!
                </div>

                <p className="text-sm text-slate-600 font-bold mb-8">
                  ¿Necesitas ayuda con tus primeros pasos? ¡Estamos aquí para ayudarte!
                </p>

                {/* Botones de acción */}
                <div className="w-full flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      window.open('https://calendly.com', '_blank');
                      setShowTrainingModal(false);
                    }}
                    className="w-full py-4 bg-[#5d5fef] hover:bg-[#4b4ded] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md hover:shadow-lg"
                  >
                    Quiero participar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem(`geochat_training_dismissed_${user?.id}`, 'true');
                      setShowTrainingModal(false);
                    }}
                    className="w-full py-2 text-slate-400 hover:text-slate-600 font-extrabold text-[11px] uppercase tracking-wider transition-colors"
                  >
                    No volver a mostrar esta novedad
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
