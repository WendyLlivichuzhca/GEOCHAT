  // frontend/src/components/Sidebar.jsx
  import React, { useState } from 'react';
  import { useLocation, useNavigate } from 'react-router-dom';
  import { 
    Home, User, Users, MessageCircle, Settings, 
    LogOut, ChevronLeft, Link2, Bot, Zap, Send, Layout, Wrench, PieChart,
    X, MessageSquare, Contact2, Link as LinkIcon
  } from 'lucide-react';

  const Sidebar = ({ onLogout, user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [openMenu, setOpenMenu] = useState(null); // 'user', 'groups', 'config', 'perfil', 'metricas'

    // Datos del perfil (para el formulario)
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
      { icon: <Zap size={18} />, label: 'Automatizaciones' },
      { icon: <Send size={18} />, label: 'Envío masivo' },
      { icon: <Bot size={18} />, label: 'Agentes de IA' }
    ];

    const gruposMenu = [
      { icon: <Users size={18} />, label: 'Grupos y comunidades' },
      { icon: <Send size={18} />, label: 'Campañas' },
      { icon: <MessageCircle size={18} />, label: 'Mensajes' }
    ];

    const configMenu = [  
      { icon: <Settings size={18} />, label: 'Tags' },
      { icon: <Settings size={18} />, label: 'Campos customizados' },
      { icon: <Users size={18} />, label: 'Agentes' },
      { icon: <Layout size={18} />, label: 'Plantillas' }
    ];

    const handleProfileChange = (e) => {
      setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = () => {
      console.log('Perfil guardado:', profileData);
      setOpenMenu(null);
      // Aquí puedes enviar los datos al backend si quieres
    };

    const navigateTo = (path) => {
      console.log("NAVEGANDO A:", path);
      navigate(path);
      setOpenMenu(null);
    };

    return (
      <>
        {/* Sidebar Isla Flotante GeoPulse */}
        <aside className="fixed top-4 left-4 bottom-4 w-20 lg:w-24 geopulse-glass rounded-[2rem] flex flex-col items-center py-8 gap-10 z-[60] shadow-2xl border-white/10">
          
          <nav className="flex flex-col gap-6 text-slate-400">
            {/* Home */}
            <button
              onClick={() => navigateTo('/')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 relative group ${
                location.pathname === '/' 
                ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' 
                : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Home size={22} className="relative z-10" />
              {location.pathname === '/' && <div className="absolute inset-0 rounded-2xl bg-indigo-600 blur-sm opacity-50"></div>}
            </button>
            
            {/* User - Interacciones */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                openMenu === 'user' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <User size={22}/>
            </button>
            
            {/* Users - Grupos */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'groups' ? null : 'groups')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                openMenu === 'groups' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Users size={22}/>
            </button>
            
            {/* Herramientas - Perfil */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'perfil' ? null : 'perfil')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                openMenu === 'perfil' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Wrench size={22}/>
            </button>
            
            {/* Estadísticas */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'metricas' ? null : 'metricas')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                openMenu === 'metricas' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <PieChart size={22}/>
            </button>
                      
            {/* Configuración */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'config' ? null : 'config')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                openMenu === 'config' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings size={22}/>
            </button>
          </nav>

          <div className="mt-auto pb-4">
            <button 
              onClick={onLogout}
              className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all hover:bg-red-500/20 text-red-400 hover:text-red-500"
            >
              <LogOut size={22}/>
            </button>
          </div>
        </aside>

        {/* ========== MENÚS LATERALES IZQUIERDOS ========== */}

        {/* Menú: Interacciones 1 a 1 */}
        {openMenu === 'user' && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 geopulse-glass rounded-[2rem] z-[100] animate-in slide-in-from-left duration-300 border-white/5 shadow-2xl flex flex-col overflow-hidden">
              <div className="p-5 flex justify-between items-center border-b border-white/5 bg-white/5">
                <h2 className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Interacciones</h2>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {interaccionesMenu.map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-4 px-4 py-4 text-slate-300 hover:bg-white/5 rounded-2xl transition-all group"
                    onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all border border-white/5">
                        {item.icon}
                    </div>
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Menú: Grupos y Comunidades */}
        {openMenu === 'groups' && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 geopulse-glass rounded-[2rem] z-[100] animate-in slide-in-from-left duration-300 border-white/5 shadow-2xl flex flex-col overflow-hidden">
              <div className="p-5 flex justify-between items-center border-b border-white/5 bg-white/5">
                <h2 className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Estrategia</h2>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {gruposMenu.map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-4 px-4 py-4 text-slate-300 hover:bg-white/5 rounded-2xl transition-all group"
                    onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-orange-400 group-hover:scale-110 group-hover:bg-orange-500/10 transition-all border border-white/5">
                        {item.icon}
                    </div>
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Menú: Configuración (Settings) */}
        {openMenu === 'config' && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-28 lg:left-32 top-4 bottom-4 w-64 geopulse-glass rounded-[2rem] z-[100] animate-in slide-in-from-left duration-300 border-white/5 shadow-2xl flex flex-col overflow-hidden">
              <div className="p-5 flex justify-between items-center border-b border-white/5 bg-white/5">
                <h2 className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Ajustes</h2>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {configMenu.map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 px-3 py-3 text-slate-300 hover:bg-white/5 rounded-xl transition-all group"
                    onClick={() => setOpenMenu(null)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:scale-110 group-hover:bg-white/10 transition-all border border-white/5">
                        {React.cloneElement(item.icon, { size: 16 })}
                    </div>
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Menú: Perfil (Herramientas) */}
        {openMenu === 'perfil' && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-28 lg:left-32 top-4 bottom-4 w-80 geopulse-glass rounded-[2.5rem] z-[100] animate-in slide-in-from-left duration-300 border-white/5 shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 pb-5 flex justify-between items-center border-b border-white/5 bg-white/5">
                <div>
                    <h2 className="font-black text-slate-100 text-base tracking-tight uppercase">Mi Cuenta</h2>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Configuración Geopulse</p>
                </div>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-1.5 rounded-xl">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Configuración de Terminal Maestra</p>
                
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex items-center gap-5">
                  <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-lg shadow-xl shadow-indigo-500/10">
                    {profileData.nombre.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-white text-sm tracking-tight truncate">{profileData.nombre}</h3>
                    <p className="text-[10px] font-bold text-slate-500 truncate">{profileData.correo}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Identificador</label>
                    <input type="text" name="nombre" value={profileData.nombre} onChange={handleProfileChange} className="w-full h-11 px-5 bg-white/[0.03] border border-white/5 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500/30 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input type="tel" name="whatsapp" value={profileData.whatsapp} onChange={handleProfileChange} className="w-full h-11 px-5 bg-white/[0.03] border border-white/5 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500/30 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Sincronización</label>
                    <select name="zonaHoraria" value={profileData.zonaHoraria} onChange={handleProfileChange} className="w-full h-11 px-5 bg-white/[0.03] border border-white/5 rounded-xl text-xs font-bold text-slate-300 outline-none focus:border-indigo-500/30 appearance-none cursor-pointer">
                      <option className="bg-[#12131a]">America/Guayaquil</option>
                      <option className="bg-[#12131a]">America/New_York</option>
                      <option className="bg-[#12131a]">Europe/Madrid</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-white/5 flex gap-3 bg-white/[0.01]">
                <button onClick={() => setOpenMenu(null)} className="flex-1 h-11 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/5 transition-all">Abortar</button>
                <button onClick={handleSaveProfile} className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-2xl shadow-indigo-500/20 transition-all active:scale-95">Confirmar</button>
              </div>
            </div>
          </>
        )}

        {/* Menú: Métricas y Estadísticas */}
        {openMenu === 'metricas' && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-28 lg:left-32 top-4 bottom-4 w-80 geopulse-glass rounded-[2rem] z-[100] animate-in slide-in-from-left duration-300 border-white/5 shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 pb-5 flex justify-between items-center border-b border-white/5 bg-white/5">
                <div>
                   <h2 className="font-black text-slate-100 text-base tracking-tight uppercase">Analítica GeoPulse</h2>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Centro de Mando de Datos</p>
                </div>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-1.5 rounded-xl">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mb-5 shadow-2xl shadow-indigo-500/10">
                  <PieChart size={28} className="text-indigo-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-3 tracking-tight">Panel GeoPulse</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-6 font-medium">
                  Visualiza las transmisiones de datos críticas.
                </p>
                <button className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-widest shadow-2xl shadow-indigo-500/20 active:scale-95">
                  + Inicializar Tablero
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  export default Sidebar;