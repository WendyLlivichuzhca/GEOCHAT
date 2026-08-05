import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

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
    color: device?.color || 'qr',
  };
}

// Retorna la metadata del tipo de WhatsApp según el campo color
function getWaTypeInfo(color) {
  const type = String(color || 'qr').toLowerCase();
  if (type === 'business') {
    return {
      label: 'WhatsApp Business',
      appName: 'WhatsApp Business',
      shortLabel: 'BUSINESS',
      badgeBg: '#128C7E',
      badgeContent: 'B',
      isBusiness: true,
    };
  }
  return {
    label: 'WhatsApp Messenger',
    appName: 'WhatsApp',
    shortLabel: 'MESSENGER',
    badgeBg: '#25d366',
    badgeContent: null, // usa el SVG de WA
    isBusiness: false,
  };
}

export default function WhatsAppConnector({ userId, device, isOpen = false, onClose }) {
  const [deviceState, setDeviceState] = useState(() => normalizeDevice(device));
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');
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

      // Preservar el color (tipo) actual si el backend no lo devuelve en esta respuesta.
      // Esto evita que "WhatsApp Business" se resetee a "WhatsApp Messenger" durante el polling.
      const nextDevice = normalizeDevice({
        ...data.device,
        color: data.device?.color || deviceState.color,
      });
      setDeviceState(nextDevice);

      if (nextDevice.estado === 'conectado' && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Tipo incorrecto o número en uso: detener polling y mostrar error
      if ((nextDevice.estado === 'tipo_incorrecto' || nextDevice.estado === 'numero_en_uso') && intervalRef.current) {
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
    if (!userId || !deviceState.id || deviceState.estado === 'conectado' || deviceState.estado === 'tipo_incorrecto' || deviceState.estado === 'numero_en_uso') {
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
    const waType = getWaTypeInfo(deviceState.color);
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl flex flex-col items-center text-center">
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={() => onClose && onClose(deviceState.estado === 'conectado')}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {deviceState.estado === 'conectado' ? (
            // Vista de Vinculado con éxito
            <div className="flex flex-col items-center py-6 w-full">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-200 shadow-sm mb-5 text-[#22c55e]">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-black text-[#0f172a] tracking-tight uppercase">
                !Dispositivo Vinculado!
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">
                {deviceState.nombre}
              </p>
              {/* Badge de tipo en pantalla de éxito */}
              <span
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                style={{ backgroundColor: waType.badgeBg }}
              >
                {waType.isBusiness ? (
                  <span className="text-white font-black text-xs">B</span>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.012 2C6.486 2 2.01 6.48 2.01 12c0 1.91.5 3.702 1.383 5.243L2 22l4.907-1.285A9.92 9.92 0 0012.013 22c5.526 0 10.002-4.48 10.002-10S17.538 2 12.012 2zm5.46 12.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.47-.148-.669.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                )}
                {waType.shortLabel}
              </span>
              <p className="text-sm text-slate-600 font-medium mt-6 leading-relaxed">
                La terminal ha sido vinculada exitosamente y está lista para operar.
              </p>
              <button
                type="button"
                onClick={() => onClose && onClose(true)}
                className="w-full mt-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
              >
                Comenzar
              </button>
            </div>
          ) : deviceState.estado === 'tipo_incorrecto' ? (
            // Vista de error: tipo de cuenta incorrecto
            <div className="flex flex-col items-center py-6 w-full">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border-2 border-red-200 shadow-sm mb-5 text-red-500">
                <AlertCircle size={36} />
              </div>

              <h3 className="text-lg font-black text-[#0f172a] tracking-tight uppercase leading-tight text-center">
                Tipo de cuenta incorrecto
              </h3>

              <div className="mt-4 w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">
                  ¿Qué pasó?
                </p>
                <p className="text-[12px] font-semibold text-red-700 leading-relaxed">
                  Seleccionaste <strong>{waType.label}</strong> pero escaneaste con la cuenta incorrecta.
                </p>
                <p className="text-[11px] text-red-500 mt-1">
                  El sistema rechazo la conexión para proteger tu configuración.
                </p>
              </div>

              <div className="mt-3 w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  ¿Cómo solucionarlo?
                </p>
                <p className="text-[12px] font-semibold text-slate-600 leading-relaxed">
                  Cierra este diálogo e intenta de nuevo. En tu teléfono, asegúrate de abrir:
                </p>
                <div
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-[11px] font-black uppercase tracking-wider"
                  style={{ backgroundColor: waType.badgeBg }}
                >
                  {waType.isBusiness ? (
                    <span className="font-black text-sm leading-none">B</span>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.012 2C6.486 2 2.01 6.48 2.01 12c0 1.91.5 3.702 1.383 5.243L2 22l4.907-1.285A9.92 9.92 0 0012.013 22c5.526 0 10.002-4.48 10.002-10S17.538 2 12.012 2zm5.46 12.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.47-.148-.669.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                    </svg>
                  )}
                  {waType.appName}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-6 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : deviceState.estado === 'numero_en_uso' ? (
            // Vista de error: número en uso por otra cuenta activa
            <div className="flex flex-col items-center py-6 w-full">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border-2 border-amber-200 shadow-sm mb-5 text-amber-600">
                <AlertCircle size={36} />
              </div>

              <h3 className="text-lg font-black text-[#0f172a] tracking-tight uppercase leading-tight text-center">
                Número ya vinculado
              </h3>

              <div className="mt-4 w-full bg-amber-50 border border-amber-200/60 rounded-2xl px-4 py-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
                  ¿Qué ocurrió?
                </p>
                <p className="text-[12px] font-semibold text-amber-900 leading-relaxed">
                  Este número de WhatsApp ya se encuentra vinculado a <strong>otra cuenta activa</strong> en la plataforma.
                </p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Por seguridad, no es posible usar el mismo número en dos cuentas activas simultáneamente.
                </p>
              </div>

              <div className="mt-3 w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  ¿Qué puedes hacer?
                </p>
                <ul className="text-[12px] font-medium text-slate-600 space-y-1 list-disc list-inside">
                  <li>Desvincular el número de la otra cuenta activa.</li>
                  <li>Escanear con una línea de WhatsApp diferente.</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-6 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
              >
                Entendido
              </button>
            </div>
          ) : (
            // Vista de Escaneo QR con instrucciones específicas por tipo
            <div className="flex flex-col items-center w-full">

              {/* Badge de tipo en la parte superior */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: waType.badgeBg }}
                >
                  {waType.isBusiness ? (
                    <span className="text-white font-black text-sm leading-none">B</span>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.012 2C6.486 2 2.01 6.48 2.01 12c0 1.91.5 3.702 1.383 5.243L2 22l4.907-1.285A9.92 9.92 0 0012.013 22c5.526 0 10.002-4.48 10.002-10S17.538 2 12.012 2zm5.46 12.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.47-.148-.669.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: waType.badgeBg }}>
                  {waType.label}
                </span>
              </div>

              <h3 className="text-[17px] font-black text-[#0f172a] tracking-tight leading-tight max-w-[280px]">
                Conecta tu {waType.appName} escaneando el QR
              </h3>

              <div className="mt-8 mb-6 flex flex-col items-center justify-center">
                {deviceState.estado === 'conectando' && deviceState.codigo_qr ? (
                  <div className="bg-white rounded-3xl p-4 shadow-lg border border-[#e2e8f0]">
                    <QRCodeSVG value={deviceState.codigo_qr} size={200} level="H" includeMargin={false} />
                  </div>
                ) : (
                  <div className="w-[234px] h-[234px] rounded-3xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="text-[#0ea5e9] animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Generando QR...
                    </p>
                  </div>
                )}
              </div>

              {/* Instrucciones específicas según tipo */}
              <div className="w-full text-left bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 mb-4 space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Pasos para vincular:
                </p>
                <p className="text-[11px] font-bold text-slate-600 flex items-start gap-2">
                  <span className="w-4 h-4 bg-sky-50 text-[#0ea5e9] rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 mt-0.5">1</span>
                  Abre <strong>{waType.appName}</strong> en tu teléfono
                </p>
                <p className="text-[11px] font-bold text-slate-600 flex items-start gap-2">
                  <span className="w-4 h-4 bg-sky-50 text-[#0ea5e9] rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 mt-0.5">2</span>
                  {waType.isBusiness
                    ? 'Ve a Más opciones → Dispositivos vinculados → Vincular dispositivo'
                    : 'Ve a Menú → Dispositivos vinculados → Vincular un dispositivo'}
                </p>
                <p className="text-[11px] font-bold text-slate-600 flex items-start gap-2">
                  <span className="w-4 h-4 bg-sky-50 text-[#0ea5e9] rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 mt-0.5">3</span>
                  Apunta la cámara hacia este código QR
                </p>
              </div>

              {/* Pie de página Problemas para conectar */}
              <div className="mt-6 w-full text-center">
                <a
                  href={`https://wa.me/593997864354?text=${encodeURIComponent(`Hola, tengo problemas para vincular mi ${waType.label} a GeoChat.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#0f172a] hover:text-[#0ea5e9] hover:underline transition-colors"
                >
                  ¿Problemas para conectar?
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

