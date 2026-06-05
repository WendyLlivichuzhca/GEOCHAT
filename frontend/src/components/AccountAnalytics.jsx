import React from 'react';
import { motion } from 'framer-motion';
import { Users, User, Smartphone } from 'lucide-react';
import SubscriptionCard from './SubscriptionCard';
import MetricCard from './MetricCard';
import { SkeletonStatCard } from './Skeleton';

export default function AccountAnalytics({ dashboard, isLoading }) {
  const statCards = [
    {
      label: 'Directorio',
      desc: 'Contactos registrados',
      current: dashboard.usage?.contactos || 1248, // Fallback to mockup data if empty
      limit: dashboard.plan?.limits?.contactos || 100000,
      growth: '+124',
      icon: Users,
      iconBg: 'bg-[#f0f0ff]',
      iconColor: 'text-[#5b5cfb]',
      iconBorder: 'border-[#e0e0ff]',
      barColor: 'bg-[#5b5cfb]',
      pctColor: 'text-[#5b5cfb]',
      sparklineData: 'M0,15 C10,5 20,20 30,8 C40,2 45,12 50,4',
    },
    {
      label: 'Operadores',
      desc: 'Operadores activos',
      current: dashboard.usage?.agentes || 8, // Fallback to mockup data if empty
      limit: dashboard.plan?.limits?.agentes || 10,
      growth: '+2',
      icon: User,
      iconBg: 'bg-[#e0f7ff]',
      iconColor: 'text-[#3cd3f7]',
      iconBorder: 'border-[#d0f2ff]',
      barColor: 'bg-[#3cd3f7]',
      pctColor: 'text-[#3cd3f7]',
      sparklineData: 'M0,15 C10,25 20,5 30,12 C40,8 45,2 50,6',
    },
    {
      label: 'Terminales',
      desc: 'Terminales en uso',
      current: dashboard.usage?.dispositivos || 3, // Fallback to mockup data if empty
      limit: dashboard.plan?.limits?.dispositivos || 10,
      growth: '+1',
      icon: Smartphone,
      iconBg: 'bg-[#f0f0ff]',
      iconColor: 'text-[#5b5cfb]',
      iconBorder: 'border-[#e0e0ff]',
      barColor: 'bg-[#5b5cfb]',
      pctColor: 'text-[#5b5cfb]',
      sparklineData: 'M0,15 C10,10 20,20 30,5 C40,15 45,2 50,8',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Title Header with blue line indicator */}
      <div className="flex items-center justify-between mb-6 px-1 select-none">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-violet-600 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
          <h3 className="text-base font-black text-[#1e1b4b] tracking-tight uppercase">
            Análisis de cuenta
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <select className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-[#e6eaf5] shadow-[0_4px_12px_rgba(15,23,42,0.03)] focus:outline-none focus:border-indigo-500 cursor-pointer">
            <option>Este mes</option>
            <option>Mes anterior</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Loading Skeletons */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            {/* Subscription Premium Card */}
            <SubscriptionCard plan={dashboard.plan} />

            {/* Reusable Stat Cards */}
            {statCards.map((stat, idx) => (
              <MetricCard
                key={idx}
                {...stat}
                delay={(idx + 1) * 0.08 + 0.15}
              />
            ))}
          </>
        )}
      </div>
    </motion.section>
  );
}
