import React, { useState } from 'react';
import { Clock, MessageSquare, CheckCircle2, Check, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WhatsAppCard({ device, onDisconnect }) {
  const [showMenu, setShowMenu] = useState(false);

  const phone = device?.numero_telefono || '593 986 038 755';
  const name = device?.nombre || 'WHATSAPP VINCULADO';

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 22px 50px rgba(15, 23, 42, 0.1)" }}
      className="rounded-[28px] border border-emerald-500/20 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl p-6 lg:p-8 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)] transition-all duration-300 relative flex flex-col justify-between group select-none"
    >
      {/* Top Section */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-6">
          {/* Concentric circles avatar */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-full border border-emerald-100 bg-[#f0fdf4]/50 animate-pulse" />
            <div className="absolute inset-2.5 rounded-full border border-emerald-200" />
            <div className="relative w-12 h-12 bg-[#25d366] rounded-full flex items-center justify-center shadow-lg shadow-emerald-100/50 z-10 group-hover:scale-105 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div className="absolute bottom-2 right-2 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white z-20 shadow-md">
              <Check size={9} strokeWidth={3.5} />
            </div>
          </div>

          {/* Info Text */}
          <div className="flex flex-col text-left">
            <h4 className="font-extrabold text-[#1e1b4b] text-[13px] uppercase tracking-wider leading-none mb-1.5">
              {name === 'Nueva Terminal' ? 'WHATSAPP VINCULADO' : name.toUpperCase()}
            </h4>
            <p className="text-sm font-bold text-slate-500 tracking-tight">
              {phone}
            </p>

            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-[#047857] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                <Check size={9} strokeWidth={3} className="text-[#059669]" />
                EN LÍNEA
              </span>
              <span className="flex items-center gap-1.5 text-[#047857] text-[9px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                ACTIVO
              </span>
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
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
                onClick={() => {
                  setShowMenu(false);
                  if (onDisconnect) {
                    onDisconnect();
                  } else {
                    alert("Para desconectar o reiniciar, por favor contacta a soporte técnico.");
                  }
                }}
                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Reiniciar Conexión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-slate-100 my-5 w-full" />

      {/* Footer Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {/* Actividad */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            <Clock size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Última actividad</span>
            <span className="text-xs font-extrabold text-slate-700">Hace 2 min</span>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            <MessageSquare size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Mensajes hoy</span>
            <span className="text-xs font-extrabold text-slate-700">342</span>
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Estado</span>
            <span className="text-xs font-extrabold text-emerald-600">Conectado</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
