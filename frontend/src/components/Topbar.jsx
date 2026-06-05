import React from 'react';
import { RefreshCw, Search, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Topbar({ user, isLoading, onLoadDashboard }) {
  const roleLabel = user?.rol || 'admin';

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="h-16 flex items-center justify-end gap-6 px-4 z-50 shrink-0 select-none"
    >
      <div className="flex items-center gap-6 text-slate-500">
        {/* Refresh Button */}
        <button
          type="button"
          onClick={onLoadDashboard}
          className="hover:text-indigo-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100"
          title="Actualizar dashboard"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin text-[#5b5cfb]' : 'text-slate-400 hover:text-indigo-600'} />
        </button>

        {/* Search Icon */}
        <button className="hover:text-indigo-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100">
          <Search size={18} className="text-slate-400" />
        </button>

        {/* Notification Bell */}
        <div className="relative cursor-pointer hover:text-indigo-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100">
          <Bell size={18} className="text-slate-400" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white shadow-[0_0_8px_rgba(99,102,241,0.5)]">
            3
          </span>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
          {/* Wendy Avatar with gradient border */}
          <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-600 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xs uppercase border border-slate-950">
              {user?.nombre?.charAt(0) || 'W'}
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-xs text-[#1e1b4b] leading-none mb-0.5">
              {user?.nombre || 'Wendy'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
