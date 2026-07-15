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
  Video,
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

      // Tipo incorrecto: detener polling y mostrar error
      if (nextDevice.estado === 'tipo_incorrecto' && intervalRef.current) {
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
    if (!userId || !deviceState.id || deviceState.estado === 'conectado' || deviceState.estado === 'tipo_incorrecto') {
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
            onClick={onClose}
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
                ¡Dispositivo Vinculado!
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
                onClick={onClose}
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
                  El sistema rechazó la conexión para proteger tu configuración.
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
                    ? 'Ve a Más opciones (⋮) → Dispositivos vinculados → Vincular dispositivo'
                    : 'Ve a Menú (⋮) → Dispositivos vinculados → Vincular un dispositivo'}
                </p>
                <p className="text-[11px] font-bold text-slate-600 flex items-start gap-2">
                  <span className="w-4 h-4 bg-sky-50 text-[#0ea5e9] rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 mt-0.5">3</span>
                  Apunta la cámara hacia este código QR
                </p>
              </div>

              {/* Botón Ver video instructivo */}
              <button
                type="button"
                onClick={() => alert(`Para conectar tu cuenta de ${waType.appName}:\n1. Abre ${waType.appName} en tu celular.\n2. Toca Menú o Configuración y selecciona Dispositivos vinculados.\n3. Toca Vincular un dispositivo.\n4. Apunta tu celular hacia esta pantalla para escanear el código QR.`)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0ea5e9] hover:underline transition-colors select-none"
              >
                <Video size={14} className="text-[#0ea5e9]" />
                Ver video instructivo
              </button>

              {/* Pie de página Problemas para conectar */}
              <div className="mt-6 w-full text-center">
                <span className="text-xs font-bold text-[#0f172a]">
                  ¿Problemas para conectar?
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render inline en el Dashboard
  if (deviceState.estado === 'conectado') {
    return (
      <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col justify-between group">
        
        {/* Fila Superior */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            
            {/* Concentric circles avatar */}
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full border border-emerald-100 bg-[#f0fdf4]/30" />
              <div className="absolute inset-2 rounded-full border border-emerald-200" />
              <div className="relative w-14 h-14 bg-[#25d366] rounded-full flex items-center justify-center shadow-lg shadow-emerald-100 z-10 group-hover:scale-105 transition-transform">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white z-20 shadow-md">
                <Check size={11} strokeWidth={3} />
              </div>
            </div>

            {/* Info Text */}
            <div className="flex flex-col text-left">
              <h4 className="font-extrabold text-[#0f172a] text-[13px] uppercase tracking-wider leading-none mb-1.5">
                WHATSAPP VINCULADO
              </h4>
              <p className="text-sm font-bold text-gray-500 tracking-tight">
                {deviceState.numero_telefono || 'Sin número registrado'}
              </p>
              
              <div className="flex items-center gap-3 mt-3">
                <span className="flex items-center gap-1.5 bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <Check size={10} strokeWidth={3} className="text-[#059669]" />
                  EN LÍNEA
                </span>
                <span className="flex items-center gap-1.5 text-[#047857] text-[9px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ACTIVO
                </span>
              </div>
            </div>
          </div>

          {/* Menú de 3 puntos */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-2xl shadow-lg py-2 z-30 text-left">
                <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-50 mb-1">
                  Opciones
                </div>
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); alert("Para desconectar o reiniciar, por favor contacta a soporte técnico."); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Reiniciar Conexión
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-[#e2e8f0]/60 my-5 w-full" />

        {/* Fila Inferior con Métrica */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {/* Actividad */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
              <Clock size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Última actividad</span>
              <span className="text-xs font-extrabold text-slate-700">Hace 2 min</span>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
              <MessageSquare size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Mensajes hoy</span>
              <span className="text-xs font-extrabold text-slate-700">342</span>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Estado</span>
              <span className="text-xs font-extrabold text-emerald-600">Conectado</span>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // Render inline en el Dashboard para Connecting o Disconnected
  return (
    <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col justify-between group">
      
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
            <h4 className="font-extrabold text-[#0f172a] text-[13px] uppercase tracking-wider leading-none mb-1.5">
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
          className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 hover:text-[#0ea5e9] rounded-2xl hover:bg-slate-100 transition-colors shadow-sm self-start"
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
              <span className="w-4.5 h-4.5 bg-sky-50 text-[#0ea5e9] rounded-full flex items-center justify-center text-[9px] font-black">1</span>
              Abre WhatsApp en tu teléfono
            </p>
            <p className="text-xs font-bold text-slate-600 flex gap-2">
              <span className="w-4.5 h-4.5 bg-sky-50 text-[#0ea5e9] rounded-full flex items-center justify-center text-[9px] font-black">2</span>
              Ve a Dispositivos vinculados y presiona Vincular
            </p>
            <p className="text-xs font-bold text-slate-600 flex gap-2">
              <span className="w-4.5 h-4.5 bg-sky-50 text-[#0ea5e9] rounded-full flex items-center justify-center text-[9px] font-black">3</span>
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

