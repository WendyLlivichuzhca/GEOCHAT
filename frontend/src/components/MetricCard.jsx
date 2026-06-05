import React from 'react';
import { motion } from 'framer-motion';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-EC');
}

function formatLimit(value) {
  const number = Number(value || 0);
  if (number >= 999999) return 'Ilimitado';
  return formatNumber(number);
}

export default function MetricCard({
  label,
  desc,
  current,
  limit,
  growth,
  icon: Icon,
  iconBg,
  iconColor,
  iconBorder,
  barColor,
  pctColor,
  sparklineData,
  delay = 0,
}) {
  const percent = Math.round(Math.min((current / (limit || 1)) * 100, 100)) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 22px 50px rgba(15, 23, 42, 0.12)" }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="p-6 rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl hover:border-indigo-500/20 transition-colors duration-300 min-h-[210px] flex flex-col justify-between text-left group select-none"
    >
      <div>
        {/* Top Header: Icon + Label */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-2xl ${iconBg} ${iconColor} border ${iconBorder} group-hover:scale-105 transition-transform duration-300 shrink-0`}>
            <Icon size={18} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
            {label}
          </p>
        </div>

        {/* Value Display */}
        <div className="flex items-baseline gap-1.5">
          <p className="text-3xl font-black text-[#1e1b4b] tracking-tighter">
            {formatNumber(current)}
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase">
            / {formatLimit(limit)}
          </p>
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
          {desc}
        </p>
      </div>

      {/* Progress Bar & Trend */}
      <div className="space-y-3 mt-4">
        {/* Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className={`${barColor} h-full rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 1, delay: delay + 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className={`text-[10px] font-extrabold ${pctColor} tracking-tight shrink-0`}>
            {percent}%
          </span>
        </div>

        {/* Growth details and sparkline */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 mt-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-[#10b981]">{growth}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
              vs. mes anterior
            </span>
          </div>
          <div className="w-12 h-5 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 50 20" fill="none">
              <path
                d={sparklineData}
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
