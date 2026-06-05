import React from 'react';
import { motion } from 'framer-motion';

export default function SubscriptionCard({ plan }) {
  // Expiration date (defaults to "27 DE ABRIL DE 2027" as per user requirements)
  const expirationText = "27 DE ABRIL DE 2027";

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.25)" }}
      className="bg-gradient-to-br from-[#050B2E] via-[#0B1248] to-[#111C5C] border border-[#1e2a78]/40 p-6 rounded-[28px] flex flex-col justify-between shadow-[0_18px_45px_rgba(15,23,42,0.15)] min-h-[210px] relative overflow-hidden text-left group select-none"
    >
      {/* Dynamic Glow effects in the background */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full -translate-y-8 translate-x-8 blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />
      <div className="absolute -left-10 -bottom-10 w-28 h-28 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Floating 3D Cube Asset with levitation animation */}
      <motion.img
        src="/subscription_cube.png"
        alt="Premium 3D Crystal Cube"
        className="absolute right-1 bottom-3 w-32 h-32 object-contain select-none pointer-events-none z-10"
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* SVG Sparkles (Shining stars) */}
      <div className="absolute top-12 right-28 pointer-events-none z-0">
        <svg className="w-4 h-4 text-violet-300 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </div>
      <div className="absolute bottom-10 right-32 pointer-events-none z-0">
        <svg className="w-3.5 h-3.5 text-blue-300 animate-pulse delay-700" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </div>

      <div className="relative z-20">
        <div className="flex items-center justify-between mb-3">
          <span className="font-extrabold text-indigo-300/80 text-[10px] tracking-widest uppercase">
            Suscripción
          </span>
          <span className="bg-[#10b981]/20 text-[#10b981] border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.15)] backdrop-blur-md">
            Activo
          </span>
        </div>
        <h4 className="text-2xl font-black text-white tracking-tight leading-none mb-1">
          {plan?.nombre || 'Premium'}
        </h4>
        <p className="text-[10px] font-bold text-indigo-200/80 uppercase tracking-wider">
          Plan Premium Activo
        </p>
      </div>

      <div className="mt-auto relative z-20 space-y-1.5 max-w-[170px]">
        <div className="flex flex-col text-[10px] font-bold uppercase tracking-wide">
          <span className="text-indigo-300/50">Vencimiento</span>
          <span className="text-white text-xs font-black tracking-tight mt-0.5">
            {expirationText}
          </span>
        </div>

        <div className="text-[9px] text-indigo-300/70 font-semibold uppercase tracking-wider">
          365 días restantes
        </div>
      </div>
    </motion.div>
  );
}
