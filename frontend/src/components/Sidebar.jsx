// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, User, Users, MessageCircle, Settings,
  LogOut, Link2, Bot, Zap, Send, Layout, Wrench, PieChart,
  X, MessageSquare, Contact2, Link as LinkIcon, Tag
} from 'lucide-react';

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
      <aside className="fixed top-4 left-4 bottom-4 w-20 lg:w-24 bg-white rounded-[2rem] flex flex-col items-center py-8 gap-10 z-[60] shadow-lg border border-[#d1fae5]">

        {/* Logo decorativo */}
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#0891b2] flex items-center justify-center shadow-md shadow-emerald-200">
          <div className="w-4 h-4 rounded-sm bg-white opacity-90" />
        </div>

        <nav className="flex flex-col gap-5 text-[#6b7280]">
          {/* Home */}
          <button
            onClick={() => navigateTo('/')}
            title="Dashboard"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 relative group ${
              isActive('/')
              ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-200'
              : 'hover:bg-[#f0fdf9] hover:text-[#10b981]'
            }`}
          >
            <Home size={22} className="relative z-10" />
          </button>

          {/* Interacciones */}
          <button
            onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
            title="Interacciones"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              openMenu === 'user'
              ? 'bg-[#d1fae5] text-[#059669] border border-[#6ee7b7]'
              : 'hover:bg-[#f0fdf9] hover:text-[#10b981]'
            }`}
          >
            <User size={22}/>
          </button>

          {/* Grupos */}
          <button
            onClick={() => setOpenMenu(openMenu === 'groups' ? null : 'groups')}
            title="Grupos y Comunidades"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              openMenu === 'groups'
              ? 'bg-[#d1fae5] text-[#059669] border border-[#6ee7b7]'
              : 'hover:bg-[#f0fdf9] hover:text-[#10b981]'
            }`}
          >
            <Users size={22}/>
          </button>

          {/* Herramientas - Perfil */}
          <button
            onClick={() => navigateTo('/perfil')}
            title="Mi Cuenta"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 relative group ${
              isActive('/perfil')
              ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-200'
              : 'hover:bg-[#f0fdf9] hover:text-[#10b981]'
            }`}
          >
            <Wrench size={22} className="relative z-10" />
          </button>

          {/* Estadísticas */}
          <button
            onClick={() => navigateTo('/metricas')}
            title="Métricas"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              isActive('/metricas')
              ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-200'
              : 'hover:bg-[#f0fdf9] hover:text-[#10b981]'
            }`}
          >
            <PieChart size={22}/>
          </button>

          {/* Configuración */}
          <button
            onClick={() => setOpenMenu(openMenu === 'config' ? null : 'config')}
            title="Ajustes"
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
              openMenu === 'config'
              ? 'bg-[#d1fae5] text-[#059669] border border-[#6ee7b7]'
              : 'hover:bg-[#f0fdf9] hover:text-[#10b981]'
            }`}
          >
            <Settings size={22}/>
          </button>
        </nav>

        <div className="mt-auto pb-4">
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all hover:bg-red-50 text-[#9ca3af] hover:text-red-500"
          >
            <LogOut size={22}/>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════ */}
      {/* MENÚS LATERALES                           */}
      {/* ══════════════════════════════════════════ */}

      {/* Overlay común */}
      {openMenu && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
          onClick={() => setOpenMenu(null)}
        />
      )}

      {/* ── Interacciones ── */}
      {openMenu === 'user' && (
        <div className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] animate-in slide-in-from-left duration-300 shadow-xl border border-[#d1fae5] flex flex-col overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-[#f0fdf9] bg-[#f0fdf9]">
            <h2 className="font-black text-[#059669] text-[9px] uppercase tracking-[0.2em]">Interacciones</h2>
            <button onClick={() => setOpenMenu(null)} className="text-[#9ca3af] hover:text-[#10b981] transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {interaccionesMenu.map((item, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-[#374151] hover:bg-[#f0fdf9] rounded-2xl transition-all group"
                onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
              >
                <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center text-[#10b981] group-hover:scale-105 group-hover:bg-[#d1fae5] transition-all border border-[#a7f3d0]">
                  {item.icon}
                </div>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Grupos y Comunidades ── */}
      {openMenu === 'groups' && (
        <div className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] animate-in slide-in-from-left duration-300 shadow-xl border border-[#d1fae5] flex flex-col overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-[#f0fdf9] bg-[#f0fdf9]">
            <h2 className="font-black text-[#059669] text-[9px] uppercase tracking-[0.2em]">Estrategia</h2>
            <button onClick={() => setOpenMenu(null)} className="text-[#9ca3af] hover:text-[#10b981] transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {gruposMenu.map((item, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-[#374151] hover:bg-[#f0fdf9] rounded-2xl transition-all group"
                onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
              >
                <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center text-[#0891b2] group-hover:scale-105 group-hover:bg-[#cffafe] transition-all border border-[#a5f3fc]">
                  {item.icon}
                </div>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Configuración ── */}
      {openMenu === 'config' && (
        <div className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 bg-white rounded-[2rem] z-[100] animate-in slide-in-from-left duration-300 shadow-xl border border-[#d1fae5] flex flex-col overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-[#f0fdf9] bg-[#f0fdf9]">
            <h2 className="font-black text-[#059669] text-[9px] uppercase tracking-[0.2em]">Ajustes</h2>
            <button onClick={() => setOpenMenu(null)} className="text-[#9ca3af] hover:text-[#10b981] transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {configMenu.map((item, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 px-3 py-3 text-[#374151] hover:bg-[#f0fdf9] rounded-xl transition-all group"
                onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
              >
                <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] flex items-center justify-center text-[#059669] group-hover:scale-105 group-hover:bg-[#d1fae5] transition-all border border-[#a7f3d0]">
                  {React.cloneElement(item.icon, { size: 16 })}
                </div>
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}


    </>
  );
};

export default Sidebar;
