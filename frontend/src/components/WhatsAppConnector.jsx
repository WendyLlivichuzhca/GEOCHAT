import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Smartphone,
  WifiOff,
  MoreVertical,
  Clock,
  MessageSquare,
  Check,
} from 'lucide-react';
import WhatsAppCard from './WhatsAppCard';

const API_URL = import.meta.env.VITE_API_URL || '';
const POLLING_INTERVAL = 3000;

function normalizeDevice(device) {
  return {
    id: device?.id,
    nombre: device?.nombre || 'Mi WhatsApp',
    estado: device?.estado || 'desconectado',
    codigo_qr: device?.codigo_qr || '',
    numero_telefono: device?.numero_telefono || '',
    conectado_en: device?.conectado_en || null,
    creado_en: device?.creado_en || null,
  };
}

export default function WhatsAppConnector({ userId, device, isOpen = false, onClose }) {
  const [deviceState, setDeviceState] = useState(() => normalizeDevice(device));
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const loadQrState = async ({ silent = false } = {}) => {
    if (!userId || !deviceState.id) {
      setError('No se encontró el usuario o dispositivo activo.');
      return;
    }

    if (!silent) setIsPolling(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/dispositivos/${deviceState.id}/qr?user_id=${userId}`);
      const data = await response.json();

      if (!isMountedRef.current) return;

      if (!data.success) {
        setError(data.message || 'No se pudo consultar el QR.');
        return;
      }

      const nextDevice = normalizeDevice(data.device);
      setDeviceState(nextDevice);

      if (nextDevice.estado === 'conectado' && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      if (isMountedRef.current) {
        setError('Error de conexión al consultar el estado de WhatsApp.');
      }
    } finally {
      if (isMountedRef.current && !silent) setIsPolling(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    setDeviceState(normalizeDevice(device));

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [device?.id]);

  useEffect(() => {
    if (!userId || !deviceState.id || deviceState.estado === 'conectado') {
      return undefined;
    }

    loadQrState();
    intervalRef.current = setInterval(() => {
      loadQrState({ silent: true });
    }, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, deviceState.id, deviceState.estado]);

  // Render para vista modal (cuando se crea un nuevo dispositivo)
  if (isOpen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-white rounded-[28px] p-8 border border-slate-100 shadow-2xl flex flex-col items-center text-center">
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icono de estado */}
          <div className="relative w-20 h-20 flex items-center justify-center mb-5">
            {deviceState.estado === 'conectado' ? (
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-200 shadow-sm">
                <CheckCircle2 size={36} className="text-emerald-500" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
                {deviceState.estado === 'conectando' ? (
                  <RefreshCw size={28} className="text-amber-500 animate-spin" />
                ) : (
                  <Smartphone size={28} className="text-amber-500" />
                )}
              </div>
            )}
          </div>

          <h3 className="text-lg font-black text-[#1e1b4b] tracking-tight uppercase">
            {deviceState.estado === 'conectado' ? '¡Dispositivo Vinculado!' : 'Vincular terminal'}
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">
            {deviceState.nombre}
          </p>

          {error && (
            <div className="w-full rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] font-bold px-4 py-3 flex items-center gap-2 mt-4">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {deviceState.estado === 'conectado' ? (
            <div className="mt-6 space-y-4 w-full">
              <p className="text-sm text-slate-600 font-medium">
                La terminal ha sido vinculada exitosamente y está lista para operar.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
              >
                Cerrar panel
              </button>
            </div>
          ) : (
            <div className="mt-6 w-full flex flex-col items-center">
              {deviceState.estado === 'conectando' && deviceState.codigo_qr ? (
                <>
                  <div className="bg-white rounded-3xl p-4 shadow-md border border-[#e2e8f0] mb-5">
                    <QRCodeSVG value={deviceState.codigo_qr} size={180} level="H" includeMargin={false} />
                  </div>
                  <div className="text-left w-full space-y-2.5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Pasos para conectar:</span>
                    <p className="text-xs font-semibold text-slate-600 flex gap-2">
                      <span className="w-4.5 h-4.5 bg-indigo-100 text-[#6366f1] rounded-full flex items-center justify-center text-[9px] font-black">1</span>
                      Abre WhatsApp en tu teléfono
                    </p>
                    <p className="text-xs font-semibold text-slate-600 flex gap-2">
                      <span className="w-4.5 h-4.5 bg-indigo-100 text-[#6366f1] rounded-full flex items-center justify-center text-[9px] font-black">2</span>
                      Ve a Dispositivos vinculados
                    </p>
                    <p className="text-xs font-semibold text-slate-600 flex gap-2">
                      <span className="w-4.5 h-4.5 bg-indigo-100 text-[#6366f1] rounded-full flex items-center justify-center text-[9px] font-black">3</span>
                      Selecciona Vincular y escanea el código
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full h-44 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-3 mb-5">
                  <Loader2 size={32} className="text-slate-400 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Generando código QR...
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => loadQrState()}
                className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#6366f1] hover:text-[#4f46e5] transition-all hover:scale-105"
              >
                <RefreshCw size={14} className={isPolling ? 'animate-spin' : ''} />
                Actualizar estado
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render inline en el Dashboard
  if (deviceState.estado === 'conectado') {
    return (
      <WhatsAppCard
        device={deviceState}
        onDisconnect={() => {
          setShowMenu(false);
          alert("Para desconectar o reiniciar, por favor contacta a soporte técnico.");
        }}
      />
    );
  }

  // Render inline en el Dashboard para Connecting o Disconnected
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl p-6 lg:p-8 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)] transition-all duration-300 relative flex flex-col justify-between group">
      
      {/* Fila Superior */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-6">
          
          {/* Concentric circles avatar */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-full border border-amber-100 bg-[#fffbeb]/30" />
            <div className="absolute inset-2 rounded-full border border-amber-200" />
            <div className="relative w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200 z-10">
              {deviceState.estado === 'conectando' ? (
                <RefreshCw size={26} className="text-amber-500 animate-spin" />
              ) : (
                <Smartphone size={26} className="text-slate-400" />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col text-left">
            <h4 className="font-extrabold text-[#1e1b4b] text-[13px] uppercase tracking-wider leading-none mb-1.5">
              {deviceState.nombre}
            </h4>
            <p className="text-sm font-bold text-gray-500 tracking-tight">
              {deviceState.numero_telefono || 'Pendiente de vinculación'}
            </p>
            
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                deviceState.estado === 'conectando'
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {deviceState.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Botón sincronizar */}
        <button
          type="button"
          onClick={() => loadQrState()}
          className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 hover:text-[#6366f1] rounded-2xl hover:bg-slate-100 transition-colors shadow-sm self-start"
          title="Actualizar estado"
        >
          <RefreshCw size={16} className={isPolling ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="w-full rounded-2xl bg-red-50 border border-red-200 text-red-600 text-[11px] font-bold px-4 py-3 flex items-center gap-2 mt-4">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Separador */}
      <div className="border-t border-[#e2e8f0]/60 my-5 w-full" />

      {/* Sincronización QR Horizontal */}
      {deviceState.estado === 'conectando' && deviceState.codigo_qr ? (
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between w-full">
          <div className="text-left flex-1 space-y-2 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Para vincular GeoChat a tu WhatsApp:
            </span>
            <p className="text-xs font-bold text-slate-600 flex gap-2">
              <span className="w-4.5 h-4.5 bg-indigo-50 text-[#6366f1] rounded-full flex items-center justify-center text-[9px] font-black">1</span>
              Abre WhatsApp en tu teléfono
            </p>
            <p className="text-xs font-bold text-slate-600 flex gap-2">
              <span className="w-4.5 h-4.5 bg-indigo-50 text-[#6366f1] rounded-full flex items-center justify-center text-[9px] font-black">2</span>
              Ve a Dispositivos vinculados y presiona Vincular
            </p>
            <p className="text-xs font-bold text-slate-600 flex gap-2">
              <span className="w-4.5 h-4.5 bg-indigo-50 text-[#6366f1] rounded-full flex items-center justify-center text-[9px] font-black">3</span>
              Apunta la cámara de tu teléfono hacia este código
            </p>
          </div>
          <div className="bg-white rounded-3xl p-3.5 shadow-md border border-[#e2e8f0] shrink-0">
            <QRCodeSVG value={deviceState.codigo_qr} size={130} level="H" includeMargin={false} />
          </div>
        </div>
      ) : (
        <div className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2">
          {deviceState.estado === 'conectando' ? (
            <>
              <Loader2 size={24} className="text-amber-400 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Generando código QR...
              </p>
            </>
          ) : (
            <>
              <WifiOff size={24} className="text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Sincronización inactiva
              </p>
            </>
          )}
        </div>
      )}

    </div>
  );
}
