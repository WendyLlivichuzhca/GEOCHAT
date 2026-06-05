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
      <div className="bg-white rounded-[2.5rem] p-8 border border-[#d1fae5] shadow-sm flex flex-col items-center text-center relative overflow-hidden hover:shadow-md transition-all group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-[#ecfdf5] rounded-full -mr-10 -mt-10" />
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-[#ecfdf5] rounded-full flex items-center justify-center border-2 border-[#a7f3d0] shadow-sm group-hover:scale-105 transition-transform">
            <CheckCircle2 size={40} className="text-[#10b981]" />
          </div>
        </div>
        <h4 className="font-black text-[#134e4a] text-[14px] uppercase tracking-wide leading-tight">
          WhatsApp Vinculado
        </h4>
        <p className="text-[11px] text-[#0d9488] font-bold mt-2 uppercase tracking-wide">
          {deviceState.numero_telefono || deviceState.nombre}
        </p>
        <div className="mt-5 px-5 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669]">
          En línea · Activo
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-[#d1fae5] shadow-sm flex flex-col items-center text-center relative min-h-[320px] hover:shadow-md transition-all group">
      <div className="w-14 h-14 bg-[#ecfdf5] rounded-2xl mb-5 flex items-center justify-center text-[#10b981] border border-[#a7f3d0] group-hover:scale-105 transition-transform">
        {deviceState.estado === 'conectando' ? (
          <RefreshCw size={26} className="animate-spin" />
        ) : (
          <Smartphone size={26} />
        )}
      </div>

      <h4 className="font-black text-[#134e4a] text-[13px] uppercase tracking-wide">
        {deviceState.nombre}
      </h4>
      <p className="text-[10px] text-[#9ca3af] font-bold mt-1.5 uppercase tracking-wide">
        {deviceState.numero_telefono || 'Pendiente de vinculación'}
      </p>

      <div className={`text-[9px] px-5 py-1.5 rounded-full font-bold my-4 uppercase tracking-widest border ${
        deviceState.estado === 'conectando'
        ? 'bg-amber-50 text-amber-600 border-amber-200'
        : 'bg-slate-50 text-slate-500 border-slate-200'
      }`}>
        {deviceState.estado}
      </div>

      {error && (
        <div className="w-full rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] font-bold px-4 py-3 flex items-center gap-2 mb-4">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {deviceState.estado === 'conectando' && deviceState.codigo_qr ? (
        <div className="bg-white rounded-2xl p-4 shadow-md border border-[#d1fae5]">
          <QRCodeSVG value={deviceState.codigo_qr} size={170} level="H" includeMargin={false} />
        </div>
      ) : (
        <div className="w-full h-40 rounded-2xl border-2 border-dashed border-[#a7f3d0] bg-[#f0fdf9] flex flex-col items-center justify-center gap-3">
          <WifiOff size={28} className="text-[#a7f3d0]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">
            {deviceState.estado === 'conectando' ? 'Generando QR...' : 'Sin conexión'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => loadQrState()}
        className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#10b981] hover:text-[#059669] transition-all hover:scale-105"
      >
        <RefreshCw size={13} className={isPolling ? 'animate-spin' : ''} />
        Sincronizar
      </button>
    </div>
  );
}
