// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, User, Users, Settings, LogOut, Link2, Bot, Zap, Smartphone,
  PieChart, X, MessageSquare, Tag, HelpCircle
} from 'lucide-react';

/* ── Animaciones del submenú lateral (flyout) ── */
const flyoutVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.96 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0, x: -15, scale: 0.96,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: [0.22, 1, 0.36, 1] }
  })
};

const Sidebar = ({ onLogout, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  const roleLabel = user?.rol || 'admin';

  const configMenu = [
    { icon: <Tag size={16} />, label: 'Tags', path: '/tags' },
    { icon: <Settings size={16} />, label: 'Campos customizados', path: '/campos' },
    { icon: <Users size={16} />, label: 'Agentes', path: '/perfil' },
  ];

  const navigateTo = (path) => {
    navigate(path);
    setOpenMenu(null);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { id: 'inicio', label: 'Inicio', path: '/', icon: Home },
    { id: 'directorio', label: 'Directorio', path: '/contactos', icon: Users },
    { id: 'operadores', label: 'Operadores', path: '/perfil', icon: User },
    { id: 'terminales', label: 'Terminales', path: '/', icon: Smartphone },
    { id: 'dispositivos', label: 'Dispositivos', path: '/whalink', icon: Link2 },
    { id: 'estadisticas', label: 'Estadísticas', path: '/metricas', icon: PieChart },
    { id: 'automatizaciones', label: 'Automatizaciones', path: '/automatizaciones', icon: Bot },
    { id: 'configuracion', label: 'Configuración', icon: Settings, isToggle: 'config' },
  ];

  return (
    <>
      {/* ── Sidebar Oscuro Premium ── */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 h-screen w-[260px] rounded-r-[32px] bg-gradient-to-b from-[#050B2E] via-[#0B1248] to-[#111C5C] p-5 text-white shadow-[18px_0_50px_rgba(15,23,42,0.22)] z-[60] flex flex-col justify-between border-r border-[#1e2a78]/20 select-none"
      >
        {/* Top Section: Logo */}
        <div>
          <div className="flex items-center gap-3.5 mb-8 mt-2 px-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.6)] border border-white/10">
              <MessageSquare size={20} className="text-white" />
            </div>
            <span className="text-lg font-black tracking-[0.15em] bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
              GEOCHAT
            </span>
          </div>

          {/* Menú Principal */}
          <nav className="flex flex-col gap-2.5">
            {menuItems.map((item) => {
              const active = item.isToggle ? openMenu === item.isToggle : isActive(item.path);

              const content = (
                <>
                  <item.icon size={18} className={`shrink-0 ${active ? 'text-white' : 'text-indigo-300/70 group-hover:text-white transition-colors'}`} />
                  <span className="font-extrabold text-xs tracking-wider uppercase">{item.label}</span>
                </>
              );

              const btnClass = `w-full flex items-center gap-4 px-4.5 py-3.5 rounded-2xl transition-all duration-300 group ${
                active
                  ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-[0_0_28px_rgba(99,102,241,0.55)] border border-white/10'
                  : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
              }`;

              if (item.isToggle) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setOpenMenu(openMenu === item.isToggle ? null : item.isToggle)}
                    className={btnClass}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.path)}
                  className={btnClass}
                >
                  {content}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="space-y-4">
          
          {/* Tarjeta Centro de Ayuda */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 text-left relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-1">
              ¿Necesitas ayuda?
            </span>
            <h5 className="text-xs font-black text-white leading-snug">
              Centro de ayuda
            </h5>
            <p className="text-[10px] text-indigo-200/50 mt-1 font-bold leading-normal">
              Preguntas, tutoriales y soporte de red.
            </p>
          </div>

          {/* Perfil del Usuario al Final */}
          <div className="flex items-center gap-3.5 border-t border-white/10 pt-4 w-full">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 border border-white/10">
              {user?.nombre?.charAt(0) || 'W'}
            </div>
            <div className="flex flex-col text-left flex-1 min-w-0">
              <span className="font-extrabold text-xs text-white leading-none mb-1.5 truncate">
                {user?.nombre || 'Wendy'}
              </span>
              <span className="text-[9px] text-indigo-300/60 font-black uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
            
            <button
              onClick={onLogout}
              className="p-2 text-indigo-300/50 hover:text-red-400 rounded-xl hover:bg-white/5 transition-colors shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ── Overlay común ── */}
      <AnimatePresence>
        {openMenu && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90]"
            onClick={() => setOpenMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Flyout de Configuración ── */}
      <AnimatePresence>
        {openMenu === 'config' && (
          <motion.div
            key="flyout-config"
            variants={flyoutVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-[260px] top-0 bottom-0 w-64 bg-white z-[100] shadow-2xl border-l border-slate-100 flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-slate-100 bg-slate-50">
              <h2 className="font-black text-indigo-900 text-[10px] uppercase tracking-[0.2em]">Configuración</h2>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setOpenMenu(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {configMenu.map((item, i) => (
                <motion.button
                  key={i}
                  custom={i}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-slate-700 hover:bg-indigo-50/50 rounded-2xl transition-all group text-left"
                  onClick={() => navigateTo(item.path)}
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-[#5b5cfb] group-hover:scale-105 group-hover:bg-indigo-100/50 transition-all border border-indigo-100/30">
                    {item.icon}
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;