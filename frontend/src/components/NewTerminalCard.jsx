import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function NewTerminalCard({ availableDeviceSlots, handleDeployNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{
        y: -4,
        boxShadow: "0 22px 50px rgba(99, 102, 241, 0.15)",
        borderColor: "rgba(99, 102, 241, 0.8)",
      }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleDeployNode}
      className="border-2 border-dashed border-[#5b5cfb]/50 hover:border-solid hover:border-[#5b5cfb] rounded-[28px] bg-gradient-to-b from-white/90 to-slate-50/50 p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-[0_18px_45px_rgba(15,23,42,0.06)] hover:shadow-[0_22px_50px_rgba(99,102,241,0.12)] transition-all duration-300 group min-h-[200px] select-none"
    >
      {/* Concentric rings add button */}
      <div className="w-14 h-14 bg-gradient-to-br from-[#5b5cfb] to-[#6e6dfc] rounded-full mb-4 flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300 relative">
        <Plus size={28} />
        <span className="absolute inset-0 rounded-full bg-[#5b5cfb]/30 animate-ping" />
      </div>

      <h4 className="text-sm font-extrabold text-[#1e1b4b] uppercase tracking-wider">
        Nueva Terminal
      </h4>
      <p className="text-xs text-[#5b5cfb] font-bold mt-1 uppercase tracking-tight">
        {availableDeviceSlots} disponibles
      </p>

      {/* Button with scale-103 on hover, plus the user's specific premium button class list */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(79,70,229,0.45)] text-[11px] font-extrabold uppercase tracking-widest leading-none"
      >
        Agregar terminal
      </motion.button>
    </motion.div>
  );
}
