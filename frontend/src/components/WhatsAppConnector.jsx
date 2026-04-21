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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
      <div className="bg-green-50 rounded-[2rem] p-8 border border-green-200 flex flex-col items-center text-center shadow-sm min-h-[300px]">
        <div className="w-24 h-24 bg-green-100 rounded-full mb-5 flex items-center justify-center border-4 border-white shadow-md">
          <CheckCircle2 size={46} className="text-green-600" />
        </div>
        <h4 className="font-black text-green-800 text-base uppercase tracking-tight">
          WhatsApp Vinculado Exitosamente
        </h4>
        <p className="text-sm text-green-700 font-semibold mt-2">
          {deviceState.numero_telefono || deviceState.nombre}
        </p>
        <div className={`text-[10px] px-8 py-2 rounded-full font-bold my-6 uppercase tracking-widest border ${statusBadge(deviceState.estado)}`}>
          {deviceState.estado}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 flex flex-col items-center text-center shadow-sm min-h-[300px]">
      <div className="w-16 h-16 bg-indigo-50 rounded-full mb-5 flex items-center justify-center text-indigo-500 border-4 border-white shadow-md">
        {deviceState.estado === 'conectando' ? (
          <Loader2 size={32} className="animate-spin" />
        ) : (
          <Smartphone size={32} />
        )}
      </div>

      <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">
        {deviceState.nombre}
      </h4>
      <p className="text-xs text-slate-400 font-semibold mt-1">
        {deviceState.numero_telefono || 'Pendiente de vinculacion'}
      </p>

      <div className={`text-[10px] px-8 py-2 rounded-full font-bold my-5 uppercase tracking-widest border ${statusBadge(deviceState.estado)}`}>
        {deviceState.estado}
      </div>

      {error && (
        <div className="w-full rounded-xl border border-red-100 bg-red-50 text-red-700 text-xs font-semibold px-4 py-3 flex items-center gap-2 mb-4 text-left">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {deviceState.estado === 'conectando' && deviceState.codigo_qr ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-inner">
          <QRCodeSVG value={deviceState.codigo_qr} size={176} level="M" includeMargin />
        </div>
      ) : (
        <div className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-slate-500 flex flex-col items-center gap-3">
          <WifiOff size={28} className="text-slate-300" />
          <p className="text-sm font-bold">
            {deviceState.estado === 'conectando' ? 'Esperando codigo QR...' : 'Dispositivo desconectado'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => loadQrState()}
        className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
      >
        <RefreshCw size={15} className={isPolling ? 'animate-spin' : ''} />
        Actualizar estado
      </button>
    </div>
  );
}
