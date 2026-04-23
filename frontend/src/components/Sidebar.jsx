  // frontend/src/components/Sidebar.jsx
  import React, { useState } from 'react';
  import { useLocation, useNavigate } from 'react-router-dom';
  import { 
    Home, User, Users, MessageCircle, Settings, 
    LogOut, ChevronLeft, Link2, Bot, Zap, Send, Layout, Wrench, PieChart
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
        {/* Sidebar principal (izquierdo) */}
        <aside className="w-20 lg:w-24 bg-[#1e1e2d] flex flex-col items-center py-6 gap-6 fixed h-full z-30 border-r border-white/5">
          {/* Sidebar minimalista sin logo invasivo */}
          
          <nav className="flex flex-col gap-4 text-slate-400">
            {/* Home */}
            <button
              onClick={() => navigateTo('/')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl shadow-lg transition-all hover:bg-indigo-600 ${
                location.pathname === '/' ? 'bg-[#3f405a] text-white' : 'hover:bg-[#3f405a] hover:text-white'
              }`}
            >
              <Home size={22}/>
            </button>
            
            {/* User - Interacciones */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                openMenu === 'user' ? 'bg-indigo-600 text-white' : 'hover:bg-[#3f405a] hover:text-white'
              }`}
            >
              <User size={22}/>
            </button>
            
            {/* Users - Grupos */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'groups' ? null : 'groups')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                openMenu === 'groups' ? 'bg-indigo-600 text-white' : 'hover:bg-[#3f405a] hover:text-white'
              }`}
            >
              <Users size={22}/>
            </button>
            
            {/* Herramientas - Perfil (menú izquierdo) */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'perfil' ? null : 'perfil')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-[#3f405a] hover:text-white ${
                openMenu === 'perfil' ? 'bg-indigo-600 text-white' : ''
              }`}
            >
              <Wrench size={22}/>
            </button>
            
            {/* Estadísticas - Métricas (menú izquierdo) */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'metricas' ? null : 'metricas')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-[#3f405a] hover:text-white ${
                openMenu === 'metricas' ? 'bg-indigo-600 text-white' : ''
              }`}
            >
              <PieChart size={22}/>
            </button>
                      
            {/* Configuración - Settings (menú izquierdo) */}
            <button 
              onClick={() => setOpenMenu(openMenu === 'config' ? null : 'config')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-[#3f405a} hover:text-white ${
                openMenu === 'config' ? 'bg-indigo-600 text-white' : ''
              }`}
            >
              <Settings size={22}/>
            </button>
          </nav>

          <div className="flex flex-col gap-4 mt-auto">
            <button 
              onClick={onLogout}
              className="w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-red-500/20 text-red-400"
            >
              <LogOut size={22}/>
            </button>
          </div>
        </aside>

        {/* ========== MENÚS LATERALES IZQUIERDOS ========== */}

        {/* Menú: Interacciones 1 a 1 */}
        {openMenu === 'user' && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-20 lg:left-24 top-0 h-full w-64 bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200">
              <div className="p-5 flex justify-between items-center border-b">
                <h2 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Interacciones 1 a 1</h2>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronLeft size={18} />
                </button>
              </div>
              <div className="p-2">
                {interaccionesMenu.map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all group"
                    onClick={() => item.path ? navigateTo(item.path) : setOpenMenu(null)}
                  >
                    <span className="text-slate-400 group-hover:text-indigo-500">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Menú: Grupos y Comunidades */}
        {openMenu === 'groups' && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-20 lg:left-24 top-0 h-full w-64 bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200">
              <div className="p-5 flex justify-between items-center border-b">
                <h2 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Grupos y Comunidades</h2>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronLeft size={18} />
                </button>
              </div>
              <div className="p-2">
                {gruposMenu.map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all group"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="text-slate-400 group-hover:text-indigo-500">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Menú: Configuración (Settings) */}
        {openMenu === 'config' && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-20 lg:left-24 top-0 h-full w-64 bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200">
              <div className="p-5 flex justify-between items-center border-b">
                <h2 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Configuración</h2>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronLeft size={18} />
                </button>
              </div>
              <div className="p-2">
                {configMenu.map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all group"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="text-slate-400 group-hover:text-indigo-500">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Menú: Perfil (Herramientas) */}
        {openMenu === 'perfil' && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-20 lg:left-24 top-0 h-full w-96 bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200 flex flex-col">
              <div className="p-5 flex justify-between items-center border-b">
                <h2 className="font-bold text-slate-800 text-lg">Configuración de perfil</h2>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronLeft size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <p className="text-sm text-slate-500">Actualiza tus datos personales y configuraciones de tu cuenta.</p>
                <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {profileData.nombre.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{profileData.nombre}</h3>
                    <p className="text-sm text-slate-500">{profileData.correo}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre *</label>
                    <input type="text" name="nombre" value={profileData.nombre} onChange={handleProfileChange} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Correo electrónico</label>
                    <input type="email" name="correo" value={profileData.correo} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50" disabled />
                    <p className="text-xs text-slate-400 mt-1">El correo no se puede cambiar</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp personal</label>
                    <input type="tel" name="whatsapp" value={profileData.whatsapp} onChange={handleProfileChange} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Zona horaria</label>
                    <select name="zonaHoraria" value={profileData.zonaHoraria} onChange={handleProfileChange} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none">
                      <option>America/Guayaquil</option>
                      <option>America/New_York</option>
                      <option>Europe/Madrid</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setOpenMenu(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSaveProfile} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Guardar cambios</button>
              </div>
            </div>
          </>
        )}

        {/* Menú: Métricas y Estadísticas */}
        {openMenu === 'metricas' && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpenMenu(null)} />
            <div className="fixed left-20 lg:left-24 top-0 h-full w-96 bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200 flex flex-col">
              <div className="p-5 flex justify-between items-center border-b">
                <h2 className="font-bold text-slate-800 text-lg">Métricas y Estadísticas</h2>
                <button onClick={() => setOpenMenu(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronLeft size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                  <PieChart size={40} className="text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Crea tu primer panel de métricas personalizado</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Organiza y visualiza tus datos más importantes en un solo lugar. Personaliza tu tablero según las necesidades de tu negocio.
                </p>
                <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium">
                  + Empieza ahora
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  export default Sidebar;