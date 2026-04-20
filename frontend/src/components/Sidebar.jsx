// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { 
  Home, User, Users, MessageCircle, Settings, 
  LogOut, ChevronLeft, ChevronRight, Link2, Bot, Zap, Send, Layout, Wrench, PieChart
} from 'lucide-react';

const Sidebar = ({ onLogout, user }) => {
  const [openMenu, setOpenMenu] = useState(null); // 'user' o 'groups'
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  // Datos del perfil
  const [profileData, setProfileData] = useState({
    nombre: user?.nombre || 'Angel Oswaldo Espinoza Veintimilla',
    correo: user?.correo || 'geodiinnovate@gmail.com',
    whatsapp: '+593 986 130 956',
    zonaHoraria: 'America/Guayaquil'
  });

  const interaccionesMenu = [
    { icon: <MessageCircle size={18} />, label: 'Chat' },
    { icon: <Users size={18} />, label: 'Contactos' },
    { icon: <Layout size={18} />, label: 'Tableros' },
    { icon: <Link2 size={18} />, label: 'Whalink' },
    { icon: <Zap size={18} />, label: 'Automatizaciones' },
    { icon: <Send size={18} />, label: 'Envío masivo' },
    { icon: <Bot size={18} />, label: 'Agentes de IA' }
  ];

  const gruposMenu = [
    { icon: <Users size={18} />, label: 'Grupos y comunidades' },
    { icon: <Send size={18} />, label: 'Campañas' },
    { icon: <MessageCircle size={18} />, label: 'Mensajes' }
  ];

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = () => {
    console.log('Perfil guardado:', profileData);
    setIsProfileOpen(false);
  };

  return (
    <>
      {/* Sidebar principal (izquierdo) */}
      <aside className="w-20 lg:w-24 bg-[#1e1e2d] flex flex-col items-center py-6 gap-6 fixed h-full z-30 border-r border-white/5">
        {/* Logo */}
        <div className="flex flex-col gap-1 mb-4">
          <div className="w-8 h-2 bg-[#4CAF50] rounded-full transform -skew-x-12"></div>
          <div className="w-6 h-2 bg-[#4CAF50] rounded-full transform -skew-x-12 opacity-60"></div>
        </div>
        
        <nav className="flex flex-col gap-4 text-slate-400">
          {/* Home */}
          <button className="w-12 h-12 flex items-center justify-center bg-[#3f405a] text-white rounded-xl shadow-lg transition-all hover:bg-indigo-600">
            <Home size={22}/>
          </button>
          
          {/* User - Interacciones */}
          <button 
            onClick={() => {
              setOpenMenu(openMenu === 'user' ? null : 'user');
              setIsProfileOpen(false);
              setIsMetricsOpen(false);
            }}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
              openMenu === 'user' ? 'bg-indigo-600 text-white' : 'hover:bg-[#3f405a] hover:text-white'
            }`}
          >
            <User size={22}/>
          </button>
          
          {/* Users - Grupos */}
          <button 
            onClick={() => {
              setOpenMenu(openMenu === 'groups' ? null : 'groups');
              setIsProfileOpen(false);
              setIsMetricsOpen(false);
            }}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
              openMenu === 'groups' ? 'bg-indigo-600 text-white' : 'hover:bg-[#3f405a] hover:text-white'
            }`}
          >
            <Users size={22}/>
          </button>
          
          {/* Herramientas - Perfil */}
          <button 
            onClick={() => {
              setIsProfileOpen(true);
              setOpenMenu(null);
              setIsMetricsOpen(false);
            }}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-[#3f405a] hover:text-white ${
              isProfileOpen ? 'bg-indigo-600 text-white' : ''
            }`}
          >
            <Wrench size={22}/>
          </button>
          
          {/* Estadísticas - Métricas */}
          <button 
            onClick={() => {
              setIsMetricsOpen(true);
              setOpenMenu(null);
              setIsProfileOpen(false);
            }}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-[#3f405a] hover:text-white ${
              isMetricsOpen ? 'bg-indigo-600 text-white' : ''
            }`}
          >
            <PieChart size={22}/>
          </button>
        </nav>

        {/* Botones inferiores */}
        <div className="flex flex-col gap-4 mt-auto">
          <button className="w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-[#3f405a] hover:text-white">
            <Settings size={22}/>
          </button>
          <button 
            onClick={onLogout}
            className="w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-red-500/20 text-red-400"
          >
            <LogOut size={22}/>
          </button>
        </div>
      </aside>

      {/* MENÚ IZQUIERDO: Interacciones 1 a 1 */}
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

      {/* MENÚ IZQUIERDO: Grupos y Comunidades */}
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

      {/* DRAWER DERECHO: Configuración de perfil */}
      {isProfileOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsProfileOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-200 flex flex-col">
            <div className="p-5 flex justify-between items-center border-b">
              <h2 className="font-bold text-slate-800 text-lg">Configuración de perfil</h2>
              <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-slate-600">
                <ChevronRight size={20} />
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
              <button onClick={() => setIsProfileOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSaveProfile} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Guardar cambios</button>
            </div>
          </div>
        </>
      )}

      {/* DRAWER DERECHO: Métricas / Estadísticas */}
      {isMetricsOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsMetricsOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-200 flex flex-col">
            <div className="p-5 flex justify-between items-center border-b">
              <h2 className="font-bold text-slate-800 text-lg">Métricas y Estadísticas</h2>
              <button onClick={() => setIsMetricsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <ChevronRight size={20} />
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