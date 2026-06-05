import React from 'react';
import { motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';

export default function HeroStatus({ user }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Welcome Card */}
      <div className="lg:col-span-2 p-8 rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl flex flex-col justify-center min-h-[140px] text-left">
        <h1 className="text-3xl font-extrabold text-[#1e1b4b] tracking-tight leading-none">
          ¡Hola, <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">{user?.nombre || 'Wendy'}</span>!
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3">
          PANEL DE CONTROL · GEOCHAT
        </p>
        <p className="text-sm text-slate-500 mt-3 font-semibold">
          Gestiona tus contactos, operadores y dispositivos en tiempo real.
        </p>
      </div>

      {/* System Status Card */}
      <div className="p-6 rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl flex flex-col justify-between min-h-[140px] relative overflow-hidden text-left">
        <button className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
          <MoreVertical size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 block">
              Estado del Sistema
            </span>
            <span className="text-xs font-black text-[#1e1b4b] uppercase tracking-tight">
              ÓPTIMO · EN LÍNEA
            </span>
          </div>
        </div>

        <div className="mt-2 flex justify-between items-end gap-2">
          <p className="text-[11px] text-slate-400 font-bold leading-tight max-w-[155px]">
            Todos los sistemas funcionando correctamente
          </p>

          {/* System Status sparkline in blue/violet */}
          <div className="h-10 w-28 shrink-0 self-end">
            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-fill-status" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b5cfb" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#5b5cfb" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chart-line-status" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <path
                d="M0,35 C15,15 30,30 45,15 C60,5 75,25 100,10 L100,40 L0,40 Z"
                fill="url(#chart-fill-status)"
              />
              <path
                d="M0,35 C15,15 30,30 45,15 C60,5 75,25 100,10"
                fill="none"
                stroke="url(#chart-line-status)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
