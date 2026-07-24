// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, MessageCircle, Settings,
  LogOut, Link2, Bot, Zap, Send, Layout, Wrench, PieChart,
  X, Tag, ChevronRight, Headphones, ChevronDown
} from 'lucide-react';

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
const NavBtn = ({ icon, label, sublabel, isActive, isOpen, onClick, hasSubmenu }) => {
  const active = isActive || isOpen;
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-colors group ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {/* Icono */}
      <div className={`shrink-0 transition-colors ${active ? 'text-emerald-700' : 'text-slate-500 group-hover:text-slate-700'}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon, { size: 20 }) : icon}
      </div>

      {/* Nombre y Sublabel */}
      <div className="flex-1 text-left min-w-0">
        <div className={`text-sm font-medium truncate ${active ? 'text-emerald-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
          {label}
        </div>
        {sublabel && <div className="text-xs text-slate-400 font-normal leading-none mt-0.5">{sublabel}</div>}
      </div>

      {/* Flecha si tiene submenú */}
      {hasSubmenu && (
        <ChevronRight
          size={14}
          className={`shrink-0 transition-all duration-200 ${active ? 'text-emerald-600 rotate-90' : 'text-slate-400 group-hover:text-slate-500'
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
      {/* ── Sidebar Docked del Mockup ── */}
      <aside className="fixed top-0 left-0 bottom-0 w-80 bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-6 z-[100] overflow-y-auto">
        <div>
          {/* Logo del Mockup */}
          <div
            onClick={() => navigateTo('/')}
            className="flex items-center gap-3 px-2 mb-10 cursor-pointer group"
          >
            <div className="w-12 h-12 overflow-hidden shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
              <img
                src="/logo_geochat.png"
                alt="GeoChat Logo"
                className="w-full h-full object-cover scale-[1.48] origin-top translate-y-[4%]"
              />
            </div>
            <span className="text-[22px] font-bold text-slate-900 tracking-tight">GeoChat</span>
          </div>

          {/* Navegación */}
          <nav className="space-y-4">
            <NavBtn
              icon={<Home size={18} />}
              label="Inicio"
              isActive={isActive('/')}
              onClick={() => navigateTo('/')}
            />

            <NavBtn
              icon={<MessageCircle size={18} />}
              label="Interacciones"
              sublabel="1 a 1"
              isOpen={openMenu === 'user'}
              onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
              hasSubmenu
            />

            {!isCollaborator && (
              <NavBtn
                icon={<Users size={18} />}
                label="Grupos y comunidades"
                isOpen={openMenu === 'groups'}
                onClick={() => setOpenMenu(openMenu === 'groups' ? null : 'groups')}
                hasSubmenu
              />
            )}

            <NavBtn
              icon={<Wrench size={18} />}
              label="Perfil"
              isActive={isActive('/perfil')}
              onClick={() => navigateTo('/perfil')}
            />

            <NavBtn
              icon={<PieChart size={18} />}
              label="Métricas"
              isActive={isActive('/metricas')}
              onClick={() => navigateTo('/metricas')}
            />

            <NavBtn
              icon={<Settings size={18} />}
              label="Configuraciones"
              isOpen={openMenu === 'config'}
              onClick={() => setOpenMenu(openMenu === 'config' ? null : 'config')}
              hasSubmenu
            />
          </nav>
        </div>

        {/* Sección inferior de Soporte + Perfil */}
        <div className="space-y-8">
          {/* Tarjeta "¿Necesitas ayuda?" */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-700 font-medium text-sm mb-1">
              <Headphones size={16} />
              <span>¿Necesitas ayuda?</span>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-normal">
              Nuestro equipo está aquí para apoyarte
            </p>
            <button
              onClick={() => window.open('https://wa.me/593986130956', '_blank')}
              className="w-full text-xs font-semibold text-emerald-600 border border-emerald-200 rounded-lg py-2 hover:bg-emerald-50 transition-colors bg-white shadow-sm"
            >
              Contactar soporte
            </button>
          </div>

          {/* Perfil del Usuario */}
          {user && (
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold uppercase shrink-0">
                  {user?.nombre?.charAt(0) || 'W'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate leading-none mb-0.5">{user?.nombre || 'Wendy L.'}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user?.rol || 'ADMIN'}</div>
                </div>
              </div>
              <ChevronDown size={16} className="text-slate-400 shrink-0" />
            </div>
          )}

          {/* Cerrar Sesión */}
          <div
            onClick={onLogout}
            className="flex items-center gap-2 px-2 text-rose-500 hover:text-rose-600 text-sm font-medium cursor-pointer transition-colors"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </div>
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
            className="fixed left-80 top-0 bottom-0 w-64 bg-white z-[102] shadow-2xl border-r border-slate-100 flex flex-col overflow-hidden"
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
            className="fixed left-80 top-0 bottom-0 w-64 bg-white z-[102] shadow-2xl border-r border-slate-100 flex flex-col overflow-hidden"
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
            className="fixed left-80 top-0 bottom-0 w-64 bg-white z-[102] shadow-2xl border-r border-slate-100 flex flex-col overflow-hidden"
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
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {configMenu.map((item, i) => (
                <motion.button
                  key={i} custom={i} variants={itemVariants} initial="hidden" animate="visible"
                  whileHover={{ x: 5 }} whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-slate-700 hover:bg-emerald-50/50 rounded-xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-50/50 flex items-center justify-center text-emerald-750 group-hover:scale-105 group-hover:bg-emerald-100/50 transition-all border border-emerald-100 text-emerald-600">
                    {React.cloneElement(item.icon, { size: 16 })}
                  </div>
                  <span className="text-xs font-semibold">{item.label}</span>
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
