// frontend/src/components/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import HeroStatus from './HeroStatus';
import AccountAnalytics from './AccountAnalytics';
import ConnectedDevices from './ConnectedDevices';
import WhatsAppConnector from './WhatsAppConnector';

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

export default function Dashboard({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [newDevice, setNewDevice] = useState(null);
  const [error, setError] = useState('');

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
        setNewDevice({ id: data.device_id, nombre: 'Nueva Terminal' });
        setIsConnectorOpen(true);
        loadDashboard();
      } else {
        setError(data.message || 'Error al desplegar nueva terminal.');
      }
    } catch {
      setError('Falla crítica en el despliegue de red.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.id]);

  const availableDeviceSlots = useMemo(() => {
    const max = Number(dashboard.plan?.limits?.dispositivos || 0);
    const used = Number(dashboard.usage?.dispositivos || 0);
    return Math.max(max - used, 0);
  }, [dashboard]);

  return (
    <div className="flex min-h-screen bg-[#F6F8FF] font-sans selection:bg-indigo-100/50">
      {/* Dark Premium Navigation Sidebar */}
      <Sidebar onLogout={onLogout} user={user} />

      {/* Main Panel Content Area with general 32px padding (p-8) */}
      <main className="flex-1 ml-[260px] p-8 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Superior Header panel */}
        <Topbar
          user={user}
          isLoading={isLoading}
          onLoadDashboard={loadDashboard}
        />

        {/* Dashboard Sections grid layout */}
        <div className="flex-1 space-y-10 max-w-[1800px] mx-auto w-full mt-4 pb-12">
          {/* Main Hero & system state card */}
          <HeroStatus user={user} />

          {/* Sync Error Messaging Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-5 flex items-center gap-3 text-sm font-bold shadow-sm"
              >
                <AlertCircle size={20} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Account Usage Metrics Section */}
          <AccountAnalytics
            dashboard={dashboard}
            isLoading={isLoading}
          />

          {/* Active Connectors and New slot action panels */}
          <ConnectedDevices
            devices={dashboard.devices}
            availableDeviceSlots={availableDeviceSlots}
            handleDeployNode={handleDeployNode}
            user={user}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* New Device QR Verification Overlay */}
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
