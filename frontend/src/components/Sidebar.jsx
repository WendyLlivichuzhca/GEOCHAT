// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, User, Users, MessageCircle, Settings,
  LogOut, Link2, Bot, Zap, Send, Layout, Wrench, PieChart,
  X, MessageSquare, Contact2, Link as LinkIcon, Tag
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
  hidden:  { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.055, duration: 0.22, ease: [0.22, 1, 0.36, 1] }
  })
};

const Sidebar = ({ onLogout, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  const [profileData, setProfileData] = useState({
    nombre: user?.nombre || 'Angel Oswaldo Espinoza Veintimilla',
    correo: user?.correo || 'geodiinnovate@gmail.com',
    whatsapp: '+593 986 130 956',
    zonaHoraria: 'America/Guayaquil'
  });

  const interaccionesMenu = [
    { icon: <MessageCircle size={18} />, label: 'Chat', path: '/chats' },
    { icon: <Users size={18} />, label: 'Contactos', path: '/contactos' },
    { icon: <Layout size={18} />, label: 'Tableros', path: '/tableros' },
    { icon: <Link2 size={18} />, label: 'Whalink', path: '/whalink' },
    { icon: <Zap size={18} />, label: 'Automatizaciones', path: '/automatizaciones' },
    { icon: <Send size={18} />, label: 'Envío masivo' },
    { icon: <Bot size={18} />, label: 'Agentes de IA' }
  ];

  const gruposMenu = [
    { icon: <Users size={18} />, label: 'Grupos y comunidades', path: '/grupos' },
    { icon: <Send size={18} />, label: 'Campañas' },
    { icon: <MessageCircle size={18} />, label: 'Mensajes', path: '/mensajes' }
  ];

  const configMenu = [
    { icon: <Tag size={18} />, label: 'Tags', path: '/tags' },
    { icon: <Settings size={18} />, label: 'Campos customizados', path: '/campos' },
    { icon: <Users size={18} />, label: 'Agentes' },
    { icon: <Layout size={18} />, label: 'Plantillas' }
  ];

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = () => {
    console.log('Perfil guardado:', profileData);
    setOpenMenu(null);
  };

  const navigateTo = (path) => {
    navigate(path);
    setOpenMenu(null);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* ── Sidebar isla flotante Ocean Sage ── */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-4 bottom-4 w-20 lg:w-24 bg-[#1e1b4b] rounded-[2rem] flex flex-col items-center py-8 gap-10 z-[60] shadow-xl border border-[#312e81]"
      >

        {/* Logo decorativo */}
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#38bdf8] flex items-center justify-center shadow-md shadow-indigo-900">
          <div className="w-4 h-4 rounded-sm bg-white opacity-90" />
        </div>

        <nav className="flex flex-col gap-5 text-[#818cf8]">
          {/* Home */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => navigateTo('/')}
            title="Dashboard"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 relative group ${
              isActive('/')
              ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-200'
              : 'hover:bg-[#312e81] hover:text-[#a5b4fc]'
            }`}
          >
            <Home size={22} className="relative z-10" />
          </motion.button>

          {/* Interacciones */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
            title="Interacciones"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              openMenu === 'user'
              ? 'bg-[#312e81] text-[#a5b4fc] border border-[#4338ca]'
              : 'hover:bg-[#312e81] hover:text-[#a5b4fc]'
            }`}
          >
            <User size={22}/>
          </motion.button>

          {/* Grupos */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setOpenMenu(openMenu === 'groups' ? null : 'groups')}
            title="Grupos y Comunidades"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              openMenu === 'groups'
              ? 'bg-[#312e81] text-[#a5b4fc] border border-[#4338ca]'
              : 'hover:bg-[#312e81] hover:text-[#a5b4fc]'
            }`}
          >
            <Users size={22}/>
          </motion.button>

          {/* Herramientas - Perfil */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => navigateTo('/perfil')}
            title="Mi Cuenta"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 relative group ${
              isActive('/perfil')
              ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-200'
              : 'hover:bg-[#312e81] hover:text-[#a5b4fc]'
            }`}
          >
            <Wrench size={22} className="relative z-10" />
          </motion.button>

          {/* Estadísticas */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => navigateTo('/metricas')}
            title="Métricas"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              isActive('/metricas')
              ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-200'
              : 'hover:bg-[#312e81] hover:text-[#a5b4fc]'
            }`}
          >
            <PieChart size={22}/>
          </motion.button>

          {/* Configuración */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setOpenMenu(openMenu === 'config' ? null : 'config')}
            title="Ajustes"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              openMenu === 'config'
              ? 'bg-[#312e81] text-[#a5b4fc] border border-[#4338ca]'
              : 'hover:bg-[#312e81] hover:text-[#a5b4fc]'
            }`}
          >
            <Settings size={22}/>
          </motion.button>
        </nav>

        <div className="mt-auto pb-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1, rotate: -8 }}
            onClick={onLogout}
            title="Cerrar sesión"
            className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all hover:bg-red-900/30 text-[#818cf8] hover:text-red-400"
          >
            <LogOut size={22}/>
          </motion.button>
        </div>
      </motion.aside>

      {/* ══════════════════════════════════════════ */}
      {/* MENÚS LATERALES                           */}
      {/* ══════════════════════════════════════════ */}

      {/* Overlay común — con fade in/out */}
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
            className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] animate-in slide-in-from-left duration-300 shadow-xl border border-[#c7d2fe] flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-[#eef2ff] bg-[#eef2ff]">
              <h2 className="font-black text-[#4f46e5] text-[9px] uppercase tracking-[0.2em]">Interacciones</h2>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setOpenMenu(null)}
                className="text-[#9ca3af] hover:text-[#6366f1] transition-colors"
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
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-[#374151] hover:bg-[#eef2ff] rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#eef2ff] flex items-center justify-center text-[#6366f1] group-hover:scale-105 group-hover:bg-[#c7d2fe] transition-all border border-[#a5b4fc]">
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
            className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] shadow-xl border border-[#bae6fd] flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-[#f0f9ff] bg-[#f0f9ff]">
              <h2 className="font-black text-[#0369a1] text-[9px] uppercase tracking-[0.2em]">Estrategia</h2>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setOpenMenu(null)}
                className="text-[#9ca3af] hover:text-[#0284c7] transition-colors"
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
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-[#374151] hover:bg-[#f0f9ff] rounded-2xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center text-[#0284c7] group-hover:scale-105 group-hover:bg-[#bae6fd] transition-all border border-[#7dd3fc]">
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
            className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] shadow-xl border border-[#ccfbf1] flex flex-col overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-[#f0fdfa] bg-[#f0fdfa]">
              <h2 className="font-black text-[#0f766e] text-[9px] uppercase tracking-[0.2em]">Ajustes</h2>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setOpenMenu(null)}
                className="text-[#9ca3af] hover:text-[#0d9488] transition-colors"
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
                  className="w-full flex items-center gap-3 px-3 py-3 text-[#374151] hover:bg-[#f0fdfa] rounded-xl transition-all group"
                  onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#ccfbf1] flex items-center justify-center text-[#0f766e] group-hover:scale-105 group-hover:bg-[#99f6e4] transition-all border border-[#5eead4]">
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
          