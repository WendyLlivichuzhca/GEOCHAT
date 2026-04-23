import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Smartphone,
  WifiOff,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';
const POLLING_INTERVAL = 3000;

function statusBadge(status) {
  if (status === 'conectado') {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  if (status === 'conectando') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }

  return 'bg-slate-100 text-slate-600 border-slate-200';
}

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

export default function WhatsAppConnector({ userId, device }) {
  const [deviceState, setDeviceState] = useState(() => normalizeDevice(device));
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const loadQrState = async ({ silent = false } = {}) => {
    if (!userId || !deviceState.id) {
      setError('No se encontro el usuario o dispositivo activo.');
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
        setError('Error de conexion al consultar el estado de WhatsApp.');
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

  if (deviceState.estado === 'conectado') {
    return (
      <div className="geopulse-glass rounded-[2.5rem] p-10 border-white/5 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
        
        <div className="relative mb-8">
            <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity animate-pulse"></div>
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={46} className="text-emerald-400" />
            </div>
        </div>

        <h4 className="font-black text-white text-[15px] uppercase tracking-widest leading-tight drop-shadow-md">
          WhatsApp Vinculado
        </h4>
        <p className="text-[12px] text-emerald-400/80 font-black mt-3 uppercase tracking-[0.2em]">
          {deviceState.numero_telefono || deviceState.nombre}
        </p>

        <div className="mt-8 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.3em] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          En línea • Activo
        </div>
      </div>
    );
  }

  return (
    <div className="geopulse-glass rounded-[2.5rem] p-10 border-white/5 flex flex-col items-center text-center shadow-2xl relative min-h-[360px] group">
      <div className="w-16 h-16 bg-white/5 rounded-2xl mb-6 flex items-center justify-center text-indigo-400 border border-white/10 group-hover:scale-110 transition-transform">
        {deviceState.estado === 'conectando' ? (
          <RefreshCw size={30} className="animate-spin" />
        ) : (
          <Smartphone size={30} />
        )}
      </div>

      <h4 className="font-black text-white text-[13px] uppercase tracking-widest">
        {deviceState.nombre}
      </h4>
      <p className="text-[10px] text-slate-500 font-black mt-2 uppercase tracking-[0.2em]">
        {deviceState.numero_telefono || 'Pendiente de vinculación'}
      </p>

      <div className={`text-[9px] px-6 py-2 rounded-full font-black my-6 uppercase tracking-[0.3em] border ${
        deviceState.estado === 'conectando' 
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
        : 'bg-white/5 text-slate-500 border-white/10'
      }`}>
        {deviceState.estado}
      </div>

      {error && (
        <div className="w-full rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold px-4 py-3 flex items-center gap-3 mb-6">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {deviceState.estado === 'conectando' && deviceState.codigo_qr ? (
        <div className="bg-white rounded-3xl p-5 shadow-2xl shadow-black/50 border-4 border-indigo-500/20">
          <QRCodeSVG value={deviceState.codigo_qr} size={180} level="H" includeMargin={false} />
        </div>
      ) : (
        <div className="w-full h-44 rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.02] text-slate-600 flex flex-col items-center justify-center gap-3">
          <WifiOff size={32} className="opacity-20" />
          <p className="text-[11px] font-black uppercase tracking-widest opacity-50">
            {deviceState.estado === 'conectando' ? 'Generando QR Prism...' : 'Fuera de línea'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => loadQrState()}
        className="mt-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 hover:text-white transition-all hover:scale-105"
      >
        <RefreshCw size={14} className={isPolling ? 'animate-spin' : ''} />
        Sincronizar Nodo
      </button>
    </div>
  );
}
