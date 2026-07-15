// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, User, Users, MessageCircle, Settings,
  LogOut, Link2, Bot, Zap, Send, Layout, Wrench, PieChart,
  X, Tag
} from 'lucide-react';

/* ── Variantes de animación compartidas ── */
const flyoutVariants = {
  hidden: { opacity: 0, x: -24, scale: 0.97 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0, x: -20, scale: 0.97,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.055, duration: 0.22, ease: [0.22, 1, 0.36, 1] }
  })
};

/* ── Componente de botón de nav con icono + etiqueta ── */
const NavBtn = ({ icon, label, isActive, isOpen, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.88 }}
    whileHover={{ scale: 1.05 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    onClick={onClick}
    title={label}
    className={`flex flex-col items-center justify-center gap-1 w-16 py-2.5 rounded-2xl transition-all duration-300 ${
      isActive || isOpen
        ? 'bg-[#00D68F] text-white shadow-lg shadow-emerald-200'
        : 'text-slate-400 hover:bg-emerald-50 hover:text-[#00D68F]'
    }`}
  >
    <span className="flex items-center justify-center">{icon}</span>
    <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{label}</span>
  </motion.button>
);

const Sidebar = ({ onLogout, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  const isAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';
  const isCollaborator = user?.rol === 'agente' || user?.rol === 'visor';

  const interaccionesMenu = [
    { icon: <MessageCircle size={18} />, label: 'Chat', path: '/chats' },
    { icon: <Users size={18} />, label: 'Contactos', path: '/contactos' },
    { icon: <Layout size={18} />, label: 'Tableros', path: '/tableros' },
    ...(!isCollaborator ? [
      { icon: <Link2 size={18} />, label: 'Whalink', path: '/whalink' },
      { icon: <Zap size={18} />, label: 'Automatizaciones', path: '/automatizaciones' },
      { icon: <Send size={18} />, label: 'Envío masivo', path: '/envios-masivos' },
      { icon: <Bot size={18} />, label: 'Agentes de IA', path: '/agentes-ia' },
    ] : []),
  ];

  const gruposMenu = [
    ...(!isCollaborator ? [
      { icon: <Users size={18} />, label: 'Grupos y comunidades', path: '/grupos' },
      { icon: <Send size={18} />, label: 'Campañas', path: '/campanas' },
      { icon: <MessageCircle size={18} />, label: 'Mensajes', path: '/mensajes' },
    ] : []),
  ];

  const configMenu = [
    { icon: <Tag size={18} />, label: 'Tags', path: '/tags' },
    { icon: <Settings size={18} />, label: 'Campos customizados', path: '/campos' },
    ...(isAdmin ? [{ icon: <Users size={18} />, label: 'Agentes', path: '/agentes' }] : []),
    ...(!isCollaborator ? [{ icon: <Layout size={18} />, label: 'Plantillas', path: '/plantillas' }] : []),
  ];

  const navigateTo = (path) => {
    navigate(path);
    setOpenMenu(null);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* ── Sidebar isla flotante ── */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-4 bottom-4 w-[76px] bg-white rounded-[2rem] flex flex-col items-center py-6 gap-3 z-[60] shadow-xl border border-slate-100"
      >
        {/* Logo oficial */}
        <button
          onClick={() => navigateTo('/')}
          className="w-11 h-11 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 mb-2"
          title="Volver al Inicio"
        >
          <img src="/logo_geochat.png" alt="GeoChat" className="w-11 h-11 object-contain" />
        </button>

        {/* Divisor */}
        <div className="w-10 h-px bg-slate-100 mb-1" />

        {/* Navegación principal */}
        <nav className="flex flex-col gap-1 items-center w-full px-2">

          {/* Dashboard */}
          <NavBtn
            icon={<Home size={20} />}
            label="Inicio"
            isActive={isActive('/')}
            onClick={() => navigateTo('/')}
          />

          {/* Interacciones */}
          <NavBtn
            icon={<User size={20} />}
            label="Chats"
            isOpen={openMenu === 'user'}
            onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
          />

          {/* Grupos — solo admin/superadmin */}
          {!isCollaborator && (
            <NavBtn
              icon={<Users size={20} />}
              label="Grupos"
              isOpen={openMenu === 'groups'}
              onClick={() => setOpenMenu(openMenu === 'groups' ? null : 'groups')}
            />
          )}

          {/* Perfil */}
          <NavBtn
            icon={<Wrench size={20} />}
            label="Perfil"
            isActive={isActive('/perfil')}
            onClick={() => navigateTo('/perfil')}
          />

          {/* Métricas */}
          <NavBtn
            icon={<PieChart size={20} />}
            label="Métricas"
            isActive={isActive('/metricas')}
            onClick={() => navigateTo('/metricas')}
          />

          {/* Configuración */}
          <NavBtn
            icon={<Settings size={20} />}
            label="Ajustes"
            isOpen={openMenu === 'config'}
            onClick={() => setOpenMenu(openMenu === 'config' ? null : 'config')}
          />
        </nav>

        {/* Cerrar sesión */}
        <div className="mt-auto pb-2 px-2 w-full">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={onLogout}
            title="Cerrar sesión"
            className="flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-2xl transition-all text-slate-400 hover:bg-red-50 hover:text-red-400"
          >
            <LogOut size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Salir</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* ══════════════════════════════════════════ */}
      {/* MENÚS LATERALES (flyouts)                 */}
      {/* ══════════════════════════════════════════ */}

      {/* Overlay común */}
      <AnimatePresence>
        {openMenu && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
            onClick={() => setOpenMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Interacciones ── */}
      <AnimatePresence>
        {openMenu === 'user' && (
          <motion.div
            key="flyout-user"
            variants={flyoutVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-[92px] top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] shadow-xl border border-emerald-100 flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-emerald-50 bg-emerald-50">
              <h2 className="font-black text-[#00D68F] text-[9px] uppercase tracking-[0.2em]">Interacciones</h2>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setOpenMenu(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {interaccionesMenu.map((item, i) => (
                <motion.button
                  key={i}
                  custom={i}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-[#374151] hover:bg-emerald-50 rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00D68F] group-hover:scale-105 group-hover:bg-emerald-100 transition-all border border-emerald-200">
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grupos y Comunidades ── */}
      <AnimatePresence>
        {openMenu === 'groups' && (
          <motion.div
            key="flyout-groups"
            variants={flyoutVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-[92px] top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] shadow-xl border border-sky-100 flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-sky-50 bg-sky-50">
              <h2 className="font-black text-[#0369a1] text-[9px] uppercase tracking-[0.2em]">Estrategia</h2>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setOpenMenu(null)}
                className="text-slate-400 hover:text-[#0284c7] transition-colors"
              >
                <X size={16} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {gruposMenu.map((item, i) => (
                <motion.button
                  key={i}
                  custom={i}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-[#374151] hover:bg-sky-50 rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-[#0284c7] group-hover:scale-105 group-hover:bg-sky-100 transition-all border border-sky-200">
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Configuración ── */}
      <AnimatePresence>
        {openMenu === 'config' && (
          <motion.div
            key="flyout-config"
            variants={flyoutVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-[92px] top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] shadow-xl border border-teal-100 flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-teal-50 bg-teal-50">
              <h2 className="font-black text-[#0f766e] text-[9px] uppercase tracking-[0.2em]">Ajustes</h2>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setOpenMenu(null)}
                className="text-slate-400 hover:text-[#0d9488] transition-colors"
              >
                <X size={16} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {configMenu.map((item, i) => (
                <motion.button
                  key={i}
                  custom={i}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-[#374151] hover:bg-teal-50 rounded-xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-[#0f766e] group-hover:scale-105 group-hover:bg-teal-100 transition-all border border-teal-200">
                    {React.cloneElement(item.icon, { size: 16 })}
                  </div>
                  <span className="text-xs font-bold">{item.label}</span>
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
