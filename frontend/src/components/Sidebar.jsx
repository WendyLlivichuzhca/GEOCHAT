// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, MessageCircle, Settings,
  LogOut, Link2, Bot, Zap, Send, Layout, Wrench, PieChart,
  X, Tag, ChevronRight, HelpCircle, ChevronDown, Megaphone
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

/* ── Variantes de animación ── */
const flyoutVariants = {
  hidden: { opacity: 0, x: -24, scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -20, scale: 0.97, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.055, duration: 0.22, ease: [0.22, 1, 0.36, 1] }
  })
};

/* ── Botón de navegación estilo mockup ── */
const NavBtn = ({ icon, label, sublabel, isActive, isOpen, onClick, hasSubmenu, compact = false }) => {
  const active = isActive || isOpen;
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: active ? 1 : 1.05 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onClick}
      title={compact ? label : undefined}
      className={`w-full flex items-center rounded-xl cursor-pointer transition-colors duration-150 group ${
        compact ? 'h-12 justify-center px-0 py-0' : 'gap-3 px-4 py-3.5'
      } ${active ? 'bg-emerald-500 text-white shadow-[0_3px_12px_-2px_rgba(16,185,129,0.45)]' : 'text-slate-600 hover:bg-slate-50'}`}
    >
      {/* Icono */}
      <div className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon, { size: 20 }) : icon}
      </div>

      {/* Nombre y Sublabel */}
      {!compact && (
        <div className="flex-1 text-left min-w-0">
          <div className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>
            {label}
          </div>
          {sublabel && <div className={`text-xs font-normal leading-none mt-0.5 ${active ? 'text-emerald-50/80' : 'text-slate-400'}`}>{sublabel}</div>}
        </div>
      )}

      {/* Flecha si tiene submenú */}
      {hasSubmenu && !compact && (
        <ChevronRight
          size={14}
          className={`shrink-0 transition-all duration-200 ${active ? 'text-white rotate-90' : 'text-slate-400 group-hover:text-slate-500'
            }`}
        />
      )}
    </motion.button>
  );
};

const Sidebar = ({ onLogout, user, compact = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const flyoutLeftClass = compact ? 'left-20' : 'left-80';
  const profilePhotoUrl = user?.foto_perfil
    ? (String(user.foto_perfil).startsWith('http') ? user.foto_perfil : `${API_URL}${user.foto_perfil}`)
    : '';

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
    ...(user?.rol === 'superadmin' ? [{ icon: <Megaphone size={18} />, label: 'Difusión (Superadmin)', path: '/admin/difusion' }] : []),
  ];

  const navigateTo = (path) => {
    navigate(path);
    setOpenMenu(null);
  };

  const isActive = (path) => location.pathname === path;
  const isMenuActive = (items) => items.some((item) => item.path && isActive(item.path));

  return (
    <>
      {/* ── Sidebar Docked del Mockup ── */}
      <aside className={`fixed top-0 left-0 bottom-0 ${compact ? 'w-20 px-3' : 'w-80 px-6'} bg-white flex flex-col justify-between pt-3.5 pb-6 z-[100] overflow-y-auto transition-[width,padding] duration-200`}>
        <div>
          {/* Logo del Mockup */}
          <div
            onClick={() => navigateTo('/')}
            className={`relative flex items-center ${compact ? 'justify-center px-0 mb-8' : 'gap-3 px-2 mb-10'} cursor-pointer group`}
            title={compact ? 'GeoChat' : undefined}
          >
            <div className={`relative ${compact ? 'w-11 h-11' : 'w-12 h-12'} overflow-hidden shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center`}>
              {/* Brillo ambiental pulsante, contenido dentro del propio círculo del logo */}
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-full bg-emerald-400/40 blur-md pointer-events-none"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src="/logo_geochat.png"
                alt="GeoChat Logo"
                className="w-full h-full object-cover scale-[1.48] origin-top translate-y-[4%]"
              />
            </div>
            {!compact && <span className="relative text-[22px] font-bold text-slate-900 tracking-tight">GeoChat</span>}
          </div>

          {/* Navegación */}
          <nav className={compact ? 'space-y-2' : 'space-y-4'}>
            <NavBtn
              icon={<Home size={18} />}
              label="Inicio"
              isActive={isActive('/')}
              onClick={() => navigateTo('/')}
              compact={compact}
            />

            <NavBtn
              icon={<MessageCircle size={18} />}
              label="Interacciones"
              sublabel="1 a 1"
              isActive={isMenuActive(interaccionesMenu)}
              isOpen={openMenu === 'user'}
              onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
              hasSubmenu
              compact={compact}
            />

            {!isCollaborator && (
              <NavBtn
                icon={<Users size={18} />}
                label="Grupos y comunidades"
                isActive={isMenuActive(gruposMenu)}
                isOpen={openMenu === 'groups'}
                onClick={() => setOpenMenu(openMenu === 'groups' ? null : 'groups')}
                hasSubmenu
                compact={compact}
              />
            )}

            <NavBtn
              icon={<Wrench size={18} />}
              label="Perfil"
              isActive={isActive('/perfil')}
              onClick={() => navigateTo('/perfil')}
              compact={compact}
            />

            <NavBtn
              icon={<PieChart size={18} />}
              label="Métricas"
              isActive={isActive('/metricas')}
              onClick={() => navigateTo('/metricas')}
              compact={compact}
            />

            <NavBtn
              icon={<Settings size={18} />}
              label="Configuraciones"
              isActive={isMenuActive(configMenu)}
              isOpen={openMenu === 'config'}
              onClick={() => setOpenMenu(openMenu === 'config' ? null : 'config')}
              hasSubmenu
              compact={compact}
            />
          </nav>
        </div>

        {/* Sección inferior de Soporte + Perfil */}
        <div className={compact ? 'space-y-4' : 'space-y-8'}>
          {/* Tarjeta "¿Necesitas ayuda?" */}
          {!compact && <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-700 font-medium text-sm mb-1">
              <HelpCircle size={16} />
              <span>¿Necesitas ayuda?</span>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-normal">
              Nuestro equipo está aquí para apoyarte
            </p>
            <button
              onClick={() => window.open('https://wa.me/593997864354', '_blank')}
              className="w-full text-xs font-semibold text-emerald-600 border border-emerald-200 rounded-lg py-2 hover:bg-emerald-50 transition-colors bg-white shadow-sm"
            >
              Contactar soporte
            </button>
          </div>}

          {/* ¿Necesitas ayuda? (soporte directo por WhatsApp) */}
          <button
            type="button"
            onClick={() => window.open(`https://wa.me/593997864354?text=${encodeURIComponent('Hola, necesito ayuda con GeoChat')}`, '_blank')}
            title="¿Necesitas ayuda? Escríbenos por WhatsApp"
            className={`flex items-center ${compact ? 'justify-center px-0' : 'gap-3 px-2'} w-full bg-transparent border-none cursor-pointer group`}
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-all shrink-0">
              <HelpCircle size={20} strokeWidth={2.2} />
            </div>
            {!compact && (
              <div className="text-left min-w-0">
                <div className="text-sm font-semibold text-slate-800 leading-none">¿Necesitas ayuda?</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Escríbenos por WhatsApp</div>
              </div>
            )}
          </button>
        </div>
      </aside>

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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[101]"
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
            className={`fixed ${flyoutLeftClass} top-0 bottom-0 w-64 bg-white z-[102] shadow-2xl border-r border-slate-100 flex flex-col overflow-hidden`}
          >
            <div className="p-5 flex justify-between items-center border-b border-emerald-50 bg-gradient-to-r from-emerald-50/30 to-white">
              <div>
                <h2 className="font-bold text-emerald-700 text-[10px] uppercase tracking-widest">Interacciones</h2>
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
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-slate-700 hover:bg-emerald-50/50 rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50/50 flex items-center justify-center text-emerald-750 group-hover:scale-105 group-hover:bg-emerald-100/50 transition-all border border-emerald-100 text-emerald-600">
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold">{item.label}</span>
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
            className={`fixed ${flyoutLeftClass} top-0 bottom-0 w-64 bg-white z-[102] shadow-2xl border-r border-slate-100 flex flex-col overflow-hidden`}
          >
            <div className="p-5 flex justify-between items-center border-b border-emerald-50 bg-gradient-to-r from-emerald-50/30 to-white">
              <div>
                <h2 className="font-bold text-emerald-700 text-[10px] uppercase tracking-widest">Grupos</h2>
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
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-slate-700 hover:bg-emerald-50/50 rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50/50 flex items-center justify-center text-emerald-750 group-hover:scale-105 group-hover:bg-emerald-100/50 transition-all border border-emerald-100 text-emerald-600">
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold">{item.label}</span>
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
            className={`fixed ${flyoutLeftClass} top-0 bottom-0 w-64 bg-white z-[102] shadow-2xl border-r border-slate-100 flex flex-col overflow-hidden`}
          >
            <div className="p-5 flex justify-between items-center border-b border-emerald-50 bg-gradient-to-r from-emerald-50/30 to-white">
              <div>
                <h2 className="font-bold text-emerald-700 text-[10px] uppercase tracking-widest">Configuraciones</h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Ajustes del sistema</p>
              </div>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {configMenu.map((item, i) => (
                <motion.button
                  key={i} custom={i} variants={itemVariants} initial="hidden" animate="visible"
                  whileHover={{ x: 5 }} whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-slate-700 hover:bg-emerald-50/50 rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50/50 flex items-center justify-center text-emerald-750 group-hover:scale-105 group-hover:bg-emerald-100/50 transition-all border border-emerald-100 text-emerald-600">
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold">{item.label}</span>
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
