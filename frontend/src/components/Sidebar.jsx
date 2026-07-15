// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, MessageCircle, Settings,
  LogOut, Link2, Bot, Zap, Send, Layout, Wrench, PieChart,
  X, Tag, ChevronRight
} from 'lucide-react';

/* ── Variantes de animación ── */
const flyoutVariants = {
  hidden: { opacity: 0, x: -24, scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, x: -20, scale: 0.97, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.055, duration: 0.22, ease: [0.22, 1, 0.36, 1] }
  })
};

/* ── Botón de navegación: icono destacado + nombre al lado ── */
const NavBtn = ({ icon, label, isActive, isOpen, onClick, iconBg, iconColor, hasSubmenu }) => {
  const active = isActive || isOpen;
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ x: 3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-200 group ${
        active
          ? 'bg-[#00D68F] shadow-lg shadow-emerald-200/60'
          : 'hover:bg-slate-50'
      }`}
    >
      {/* Icono con fondo colorido */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
        active
          ? 'bg-white/25 text-white'
          : `${iconBg} ${iconColor} group-hover:scale-110`
      }`}>
        {icon}
      </div>

      {/* Nombre */}
      <span className={`text-[12px] font-bold leading-tight flex-1 text-left transition-colors ${
        active ? 'text-white' : 'text-slate-600 group-hover:text-slate-900'
      }`}>
        {label}
      </span>

      {/* Flecha si tiene submenú */}
      {hasSubmenu && (
        <ChevronRight
          size={14}
          className={`transition-all duration-200 ${
            active ? 'text-white/70 rotate-90' : 'text-slate-300 group-hover:text-slate-500'
          }`}
        />
      )}
    </motion.button>
  );
};

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
      {/* ── Sidebar expandido ── */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-4 bottom-4 w-56 bg-white rounded-[2rem] flex flex-col z-[60] shadow-xl border border-slate-100 overflow-hidden"
      >
        {/* Logo + nombre marca */}
        <div className="px-4 pt-6 pb-4">
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-3 w-full cursor-pointer group"
            title="Ir al Dashboard"
          >
            <img src="/logo_geochat.png" alt="GeoChat" className="w-10 h-10 object-contain shrink-0 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col text-left">
              <span className="text-[13px] font-black text-slate-800 leading-none">GeoChat</span>
              <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Dashboard</span>
            </div>
          </button>
        </div>

        {/* Divisor */}
        <div className="mx-4 h-px bg-slate-100 mb-3" />

        {/* Navegación */}
        <nav className="flex flex-col gap-3 px-3 flex-1 overflow-y-auto py-2">

          {/* Inicio */}
          <NavBtn
            icon={<Home size={18} />}
            label="Inicio"
            isActive={isActive('/')}
            onClick={() => navigateTo('/')}
            iconBg="bg-emerald-100"
            iconColor="text-[#00D68F]"
          />

          {/* Interacciones 1 a 1 */}
          <NavBtn
            icon={<MessageCircle size={18} />}
            label="Interacciones 1 a 1"
            isOpen={openMenu === 'user'}
            onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
            iconBg="bg-sky-100"
            iconColor="text-sky-500"
            hasSubmenu
          />

          {/* Grupos y comunidades */}
          {!isCollaborator && (
            <NavBtn
              icon={<Users size={18} />}
              label="Grupos y comunidades"
              isOpen={openMenu === 'groups'}
              onClick={() => setOpenMenu(openMenu === 'groups' ? null : 'groups')}
              iconBg="bg-violet-100"
              iconColor="text-violet-500"
              hasSubmenu
            />
          )}

          {/* Perfil */}
          <NavBtn
            icon={<Wrench size={18} />}
            label="Perfil"
            isActive={isActive('/perfil')}
            onClick={() => navigateTo('/perfil')}
            iconBg="bg-orange-100"
            iconColor="text-orange-500"
          />

          {/* Métricas */}
          <NavBtn
            icon={<PieChart size={18} />}
            label="Métricas"
            isActive={isActive('/metricas')}
            onClick={() => navigateTo('/metricas')}
            iconBg="bg-pink-100"
            iconColor="text-pink-500"
          />

          {/* Configuraciones */}
          <NavBtn
            icon={<Settings size={18} />}
            label="Configuraciones"
            isOpen={openMenu === 'config'}
            onClick={() => setOpenMenu(openMenu === 'config' ? null : 'config')}
            iconBg="bg-teal-100"
            iconColor="text-teal-600"
            hasSubmenu
          />
        </nav>

        {/* Divisor inferior */}
        <div className="mx-4 h-px bg-slate-100 mt-3" />

        {/* Usuario + Cerrar sesión */}
        <div className="px-3 py-4">
          {/* Avatar del usuario */}
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#0ea5e9] text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                {user?.nombre?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-slate-700 leading-none truncate">{user?.nombre || 'Usuario'}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">{user?.rol || 'admin'}</span>
              </div>
            </div>
          )}

          {/* Botón salir */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ x: 3 }}
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all hover:bg-red-50 group"
          >
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-400 flex items-center justify-center group-hover:bg-red-200 transition-colors">
              <LogOut size={18} />
            </div>
            <span className="text-[12px] font-bold text-slate-500 group-hover:text-red-500 transition-colors">Cerrar sesión</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* ══════════════════════════════════════════ */}
      {/* FLYOUTS LATERALES                         */}
      {/* ══════════════════════════════════════════ */}

      {/* Overlay */}
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

      {/* ── Interacciones 1 a 1 ── */}
      <AnimatePresence>
        {openMenu === 'user' && (
          <motion.div
            key="flyout-user"
            variants={flyoutVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-[244px] top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] shadow-xl border border-sky-100 flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-sky-50 bg-gradient-to-r from-sky-50 to-white">
              <div>
                <h2 className="font-black text-sky-600 text-[10px] uppercase tracking-widest">Interacciones</h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">1 a 1</p>
              </div>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {interaccionesMenu.map((item, i) => (
                <motion.button
                  key={i} custom={i} variants={itemVariants} initial="hidden" animate="visible"
                  whileHover={{ x: 5 }} whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-slate-700 hover:bg-sky-50 rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 group-hover:scale-105 group-hover:bg-sky-100 transition-all border border-sky-200">
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
            className="fixed left-[244px] top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] shadow-xl border border-violet-100 flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-violet-50 bg-gradient-to-r from-violet-50 to-white">
              <div>
                <h2 className="font-black text-violet-600 text-[10px] uppercase tracking-widest">Grupos</h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">y comunidades</p>
              </div>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {gruposMenu.map((item, i) => (
                <motion.button
                  key={i} custom={i} variants={itemVariants} initial="hidden" animate="visible"
                  whileHover={{ x: 5 }} whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-slate-700 hover:bg-violet-50 rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 group-hover:scale-105 group-hover:bg-violet-100 transition-all border border-violet-200">
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Configuraciones ── */}
      <AnimatePresence>
        {openMenu === 'config' && (
          <motion.div
            key="flyout-config"
            variants={flyoutVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-[244px] top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] shadow-xl border border-teal-100 flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-teal-50 bg-gradient-to-r from-teal-50 to-white">
              <div>
                <h2 className="font-black text-teal-700 text-[10px] uppercase tracking-widest">Configuraciones</h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Ajustes del sistema</p>
              </div>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {configMenu.map((item, i) => (
                <motion.button
                  key={i} custom={i} variants={itemVariants} initial="hidden" animate="visible"
                  whileHover={{ x: 5 }} whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-slate-700 hover:bg-teal-50 rounded-xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-105 group-hover:bg-teal-100 transition-all border border-teal-200">
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
