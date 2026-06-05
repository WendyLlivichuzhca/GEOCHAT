import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, AlertCircle } from 'lucide-react';
import WhatsAppConnector from './WhatsAppConnector';
import NewTerminalCard from './NewTerminalCard';

export default function ConnectedDevices({
  devices = [],
  availableDeviceSlots,
  handleDeployNode,
  user,
  isLoading,
}) {
  // Count devices in connected state
  const connectedCount = devices.filter((d) => d.estado === 'conectado').length;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6"
    >
      {/* Title Header with blue line indicator & Active Connection Count Badge */}
      <div className="flex items-center justify-between mb-4 px-1 select-none">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-violet-600 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
          <h3 className="text-base font-black text-[#1e1b4b] tracking-tight uppercase">
            Dispositivos conectados
          </h3>
        </div>

        <span className="inline-flex items-center gap-2 text-[9px] font-black text-[#10b981] uppercase tracking-widest bg-[#ecfdf5] border border-[#a7f3d0] px-4 py-2 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.08)]">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          {connectedCount} en línea
        </span>
      </div>

      {/* Main Grid: 2/3 and 1/3 layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device connectors list (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 flex items-center justify-between shadow-sm animate-pulse">
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

          {!isLoading && devices.map((device) => (
            <WhatsAppConnector
              key={device.id}
              userId={user?.id}
              device={device}
            />
          ))}

          {!isLoading && devices.length === 0 && (
            <div className="rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl p-10 flex flex-col items-center justify-center text-center opacity-70 min-h-[200px]">
              <WifiOff size={40} className="mb-3 text-[#5b5cfb]/80" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Sin dispositivos vinculados
              </h4>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Agrega una terminal para comenzar a chatear.
              </p>
            </div>
          )}
        </div>

        {/* New Terminal slot (1/3 width) */}
        <div className="lg:col-span-1">
          {availableDeviceSlots > 0 ? (
            <NewTerminalCard
              availableDeviceSlots={availableDeviceSlots}
              handleDeployNode={handleDeployNode}
            />
          ) : (
            !isLoading && (
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/50 p-8 flex flex-col items-center justify-center text-center text-slate-400 min-h-[200px] select-none">
                <AlertCircle size={32} className="mb-3 text-slate-300" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Límite alcanzado
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 font-medium max-w-[180px]">
                  Has utilizado todas las terminales de tu plan.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </motion.section>
  );
}
