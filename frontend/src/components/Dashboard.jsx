// frontend/src/components/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
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

const API_URL = import.meta.env.VITE_API_URL || '';
const emptyDashboard = {
  plan: {
    nombre: 'Cargando...',
    estado: '',
    periodo: '',
    fecha_inicio: null,
    fecha_vencimiento: null,
    limits: {
      contactos: 0,
      dispositivos: 0,
      agentes: 0,
    },
  },
  usage: {
    contactos: 0,
    dispositivos: 0,
    dispositivos_conectados: 0,
    agentes: 0,
  },
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
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function statusStyles(status) {
  if (status === 'conectado') {
    return 'bg-green-100 text-green-700 border-green-200';
  }
  if (status === 'conectando') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  return 'bg-slate-50 text-slate-500 border-slate-100';
}

function planStatusLabel(status) {
  const labels = {
    activa: 'Activa',
    prueba: 'Prueba',
    vencida: 'Vencida',
    cancelada: 'Cancelada',
    sin_suscripcion: 'Sin suscripcion',
  };
  return labels[status] || status || 'Sin estado';
}

function UsageCard({ icon: Icon, label, current, limit }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
      <div className="p-4 bg-slate-50 rounded-xl text-slate-300">
        <Icon size={26} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tighter">
          {formatNumber(current)} / {formatLimit(limit)}
        </p>
      </div>
    </div>
  );
}

function DeviceCard({ device }) {
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 flex flex-col items-center shadow-sm hover:shadow-xl transition-all group">
      <div className="w-24 h-24 bg-indigo-50 rounded-full mb-5 flex items-center justify-center border-4 border-white shadow-md">
        <Smartphone size={44} className="text-indigo-500" />
      </div>

      <h4 className="font-bold text-sm uppercase tracking-tighter text-slate-800 text-center">
        {device.nombre || 'Mi WhatsApp'}
      </h4>
      <p className="text-xs text-indigo-500 font-bold mt-1">
        {device.numero_telefono || device.dispositivo_id || 'Sin numero asignado'}
      </p>

      <div className={`text-[10px] px-8 py-2 rounded-full font-bold my-6 uppercase tracking-widest border ${statusStyles(device.estado)}`}>
        {device.estado || 'desconectado'}
      </div>

      <p className="text-[11px] text-slate-400 font-medium text-center">
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
    if (!user?.id) {
      setError('No se encontro el usuario activo.');
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
      setError('Error de conexion al cargar el dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeployNode = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/dispositivos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          nombre: `Terminal ${Number(dashboard.usage?.dispositivos || 0) + 1}`
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setNewDevice(data.device);
        setIsConnectorOpen(true);
        loadDashboard();
      } else {
        setError(data.message || 'Error al desplegar nueva terminal.');
      }
    } catch (err) {
      setError('Falla critica en el despliegue de red.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.id]);

  const availableDeviceSlots = useMemo(() => {
    const maxDevices = Number(dashboard.plan?.limits?.dispositivos || 0);
    const usedDevices = Number(dashboard.usage?.dispositivos || 0);
    return Math.max(maxDevices - usedDevices, 0);
  }, [dashboard]);

  const roleLabel = user?.rol || 'admin';

  return (
    <div className="flex min-h-screen bg-[#0a0b10] font-sans text-slate-100 selection:bg-indigo-500/30">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0 h-[calc(100vh-32px)] overflow-hidden">
        <header className="h-[72px] geopulse-glass rounded-3xl text-white flex items-center justify-between px-8 z-50 mb-6 shadow-indigo-500/5 shrink-0">
          <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-white/10 shrink-0">
                  <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
              </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={loadDashboard}
              className="text-white/70 hover:text-white transition-colors"
              title="Actualizar dashboard"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <Bell size={18} className="opacity-70 cursor-pointer hover:opacity-100" />
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-white text-xs uppercase">
                {user?.nombre?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs leading-none mb-0.5">
                  {user?.nombre || 'Usuario'}
                </span>
                <span className="text-[10px] opacity-50 font-medium uppercase">{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
            {/* --- ATMOSFERA VISUAL (Glow Blobs) --- */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full rotate-12"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full -rotate-12"></div>
            </div>

            <div className="relative space-y-12 max-w-[1800px] mx-auto w-full">
          {/* WELCOME SECTION */}
          <section className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/[0.01] border border-white/5 p-8 rounded-[3rem] geopulse-shimmer">
                <div>
                   <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none">
                      ¡Hola, <span className="geopulse-text-gradient">{user?.nombre || 'Usuario'}</span>!
                   </h1>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-3 opacity-70">
                      Estás al mando del Centro de Operaciones GeoPulse
                   </p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Estado del Sistema</span>
                      <span className="text-xs font-black text-white uppercase tracking-tighter">Latencia 0.04ms • Óptimo</span>
                   </div>
                   <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 geopulse-glow-emerald">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                   </div>
                </div>
             </div>
          </section>

          {error && (
            <div className="geopulse-glass border-red-500/20 text-red-400 rounded-3xl p-6 flex items-center gap-4 text-sm font-black uppercase tracking-widest shadow-2xl">
              <AlertCircle size={24} />
              {error}
            </div>
          )}

          <section>
            <div className="flex items-center justify-between mb-6 px-4">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                 <h3 className="text-lg font-black text-white tracking-tighter uppercase">Análisis de mi cuenta</h3>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-indigo-500/30 transition-colors cursor-default">
                {isLoading ? 'SINCRO EN CURSO...' : planStatusLabel(dashboard.plan?.estado)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* PLAN CARD */}
              <div className="geopulse-glass p-6 rounded-[2rem] flex flex-col justify-between group geopulse-shimmer relative overflow-hidden border-white/5 hover:border-indigo-500/30 transition-all duration-500 min-h-[210px]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div>
                   <div className="flex items-center justify-between mb-4">
                     <span className="font-black text-slate-500 text-[9px] tracking-[0.3em] uppercase">Suscripción</span>
                     <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={16} />
                     </div>
                   </div>
                   <h4 className="text-2xl font-black text-white tracking-tighter mb-1">
                     {dashboard.plan?.nombre || 'Sin plan'}
                   </h4>
                   <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Plan Premium Activo</span>
                </div>
                <div className="mt-6 space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-600 italic">Vencimiento</span>
                       <span className="text-slate-300">{formatDate(dashboard.plan?.fecha_vencimiento)}</span>
                   </div>
                   <div className="w-full bg-white/5 h-1 rounded-full">
                       <div className="w-full h-full bg-indigo-500 rounded-full shadow-[0_0_8px_#6366f1]"></div>
                   </div>
                </div>
              </div>

              {/* STAT CARDS */}
              {[
                { label: 'Directorio', current: dashboard.usage?.contactos, limit: dashboard.plan?.limits?.contactos, icon: Users, color: 'indigo' },
                { label: 'Operadores', current: dashboard.usage?.agentes, limit: dashboard.plan?.limits?.agentes, icon: User, color: 'cyan' },
                { label: 'Terminales', current: dashboard.usage?.dispositivos, limit: dashboard.plan?.limits?.dispositivos, icon: Smartphone, color: 'emerald' }
              ].map((stat, idx) => (
                <div key={idx} className={`geopulse-glass p-6 rounded-[2rem] group hover:border-${stat.color}-500/30 transition-all duration-500 min-h-[210px] relative overflow-hidden geopulse-glow-${stat.color}`}>
                   <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                   <div className="flex items-center gap-4 mb-6">
                       <div className={`p-3.5 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-400 border border-${stat.color}-500/20 group-hover:scale-110 transition-transform duration-500`}>
                           <stat.icon size={20} />
                       </div>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{stat.label}</p>
                   </div>
                   <div className="flex items-baseline gap-2">
                       <p className="text-3xl font-black text-white tracking-tighter">
                           {formatNumber(stat.current)}
                       </p>
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                           / {formatLimit(stat.limit)}
                       </p>
                   </div>
                   {/* PROGRESS CIRCLE (Simulado con barra tech) */}
                   <div className="mt-6 flex items-center gap-3">
                      <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                         <div 
                            className={`bg-${stat.color}-500 h-full rounded-full shadow-[0_0_8px_-2px_currentColor] transition-all duration-1000`} 
                            style={{ width: `${Math.min((stat.current / (stat.limit || 1)) * 100, 100)}%` }}
                         ></div>
                      </div>
                      <span className={`text-[9px] font-black text-${stat.color}-400/70 tracking-widest`}>
                         {Math.round(Math.min((stat.current / (stat.limit || 1)) * 100, 100))}%
                      </span>
                   </div>
                </div>
              ))}
            </div>
          </section>

          {/* NODOS DE CONEXIÓN SECTION */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            <div className="flex items-center justify-between mb-6 px-4">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                 <h3 className="text-lg font-black text-white tracking-tighter uppercase">Nodos de Conexión</h3>
              </div>
              <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.3em] bg-emerald-500/5 px-4 py-2 rounded-full border border-emerald-500/10">
                {formatNumber(dashboard.usage?.dispositivos_conectados)} Terminales en Línea
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {dashboard.devices?.map((device) => (
                <WhatsAppConnector key={device.id} userId={user?.id} device={device} />
              ))}

              {dashboard.devices?.length === 0 && !isLoading && (
                <div className="geopulse-glass border-dashed border-white/5 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center opacity-40">
                  <WifiOff size={56} className="mb-6 text-slate-700" />
                  <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Frecuencia Inactiva</h4>
                </div>
              )}

              {availableDeviceSlots > 0 && (
                <div 
                  onClick={handleDeployNode}
                  className="geopulse-glass border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center p-10 cursor-pointer hover:border-indigo-500/40 hover:bg-white/[0.03] transition-all duration-500 group min-h-[360px] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-indigo-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 border border-white/5 group-hover:border-indigo-500/50 shadow-2xl relative z-10">
                    <Plus size={44} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="mt-8 text-center relative z-10">
                     <span className="block text-[11px] font-black text-white uppercase tracking-[0.4em] mb-2">Desplegar Nodo</span>
                     <span className="text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.2em]">
                        {availableDeviceSlots} Slots de Energía Libres
                     </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* MODAL DE CONEXIÓN WHATSAPP */}
          {isConnectorOpen && newDevice && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-12">
               <div 
                 className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" 
                 onClick={() => setIsConnectorOpen(false)}
               />
               <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3.5rem] geopulse-glow-indigo animate-in zoom-in-95 duration-500">
                  <div className="absolute top-8 right-8 z-[210]">
                     <button 
                       onClick={() => setIsConnectorOpen(false)}
                       className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all border border-white/10 backdrop-blur-md"
                     >
                        <Plus size={24} className="rotate-45" />
                     </button>
                  </div>
                  <div className="bg-[#0a0b10] h-full overflow-y-auto custom-scrollbar">
                    <WhatsAppConnector userId={user?.id} device={newDevice} onConnected={() => {
                        setIsConnectorOpen(false);
                        loadDashboard();
                    }} />
                  </div>
               </div>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
