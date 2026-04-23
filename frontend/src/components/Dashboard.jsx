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
    <div className="flex min-h-screen bg-[#f8f9fd] font-sans">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-20 lg:ml-24">
        <header className="h-[72px] bg-[#1e1e2d] text-white flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
              <div className="bg-white/95 rounded-full p-2 w-11 h-11 flex items-center justify-center shadow-lg shadow-black/30 shrink-0">
                  <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[20px] font-black tracking-tight uppercase leading-none text-white/95">GeoCHAT</span>
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

        <div className="p-8 space-y-10 max-w-7xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Detalles del plan</h3>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                {isLoading ? 'Cargando...' : planStatusLabel(dashboard.plan?.estado)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-slate-800 text-sm tracking-tight uppercase">
                    {dashboard.plan?.nombre || 'Sin plan'}
                  </span>
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>
                <div className="text-[11px] text-slate-400 font-medium space-y-1">
                  <p>Periodo: {dashboard.plan?.periodo || 'mensual'}</p>
                  <p className="text-indigo-500 font-bold">
                    Vencimiento: {formatDate(dashboard.plan?.fecha_vencimiento)}
                  </p>
                </div>
              </div>

              <UsageCard
                icon={Users}
                label="Contactos"
                current={dashboard.usage?.contactos}
                limit={dashboard.plan?.limits?.contactos}
              />
              <UsageCard
                icon={User}
                label="Total agentes"
                current={dashboard.usage?.agentes}
                limit={dashboard.plan?.limits?.agentes}
              />
              <UsageCard
                icon={Smartphone}
                label="Dispositivos"
                current={dashboard.usage?.dispositivos}
                limit={dashboard.plan?.limits?.dispositivos}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Mis Conexiones</h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {formatNumber(dashboard.usage?.dispositivos_conectados)} conectados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dashboard.devices?.map((device) => (
                <WhatsAppConnector key={device.id} userId={user?.id} device={device} />
              ))}

              {dashboard.devices?.length === 0 && !isLoading && (
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 flex flex-col items-center shadow-sm">
                  <div className="w-24 h-24 bg-slate-100 rounded-full mb-5 flex items-center justify-center text-slate-300">
                    <Smartphone size={44} />
                  </div>
                  <h4 className="font-bold text-sm uppercase tracking-tighter text-slate-800">Sin dispositivos</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-2 text-center">
                    Todavia no tienes conexiones registradas.
                  </p>
                </div>
              )}

              {availableDeviceSlots > 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-8 cursor-pointer hover:border-indigo-300 hover:bg-white transition-all group min-h-[300px]">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm group-hover:bg-indigo-50">
                    <Plus size={36} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 mt-5 uppercase tracking-[0.25em] group-hover:text-indigo-600 transition-colors text-center">
                    {availableDeviceSlots} cupo disponible
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
