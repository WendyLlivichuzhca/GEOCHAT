// frontend/src/components/Header.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Bell, CheckCheck, User, LogOut, ChevronDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Header({
  user,
  onLogout,
  title = 'GeoChat',
  subtitle = 'Resumen de tu negocio',
  onRefresh,
  isLoading = false,
  extraActions = null,
  showConfigurarNegocio = true,
  onOpenOnboarding
}) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] = useState('general');
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const roleLabel = user?.rol || 'admin';
  const profilePhotoUrl = user?.foto_perfil
    ? (String(user.foto_perfil).startsWith('http') ? user.foto_perfil : `${API_URL}${user.foto_perfil}`)
    : '';

  const handleConfigurarNegocio = () => {
    if (onOpenOnboarding) {
      onOpenOnboarding();
    } else {
      const doneKey = `geochat_onboarding_done_${user?.id}`;
      localStorage.removeItem(doneKey);
      navigate('/?onboarding=1');
    }
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-white border-b border-slate-100 px-8 h-[73px] flex items-center justify-between shrink-0 text-left">
      <div className="flex flex-col justify-center">
        <h1 className="text-2xl font-extrabold text-slate-900 leading-none tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs font-medium text-slate-400 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {extraActions}

        {showConfigurarNegocio && !(user?.rol === 'agente' || user?.rol === 'visor') && (
          <button
            type="button"
            onClick={handleConfigurarNegocio}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition-all uppercase tracking-wider"
          >
            CONFIGURAR NEGOCIO
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 bg-white shadow-sm transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
          </button>
        )}

        {/* Notification Bell */}
        <div className="relative z-50">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 bg-white shadow-sm transition-colors"
          >
            <Bell size={16} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 text-left flex flex-col z-50 transform origin-top-right transition-all">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#0f172a] text-sm tracking-tight">
                  Notificaciones
                </span>
              </div>

              <div className="flex items-center justify-between mt-4 border-b border-slate-100 pb-1">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveNotificationTab('general')}
                    className={`text-xs font-semibold pb-1.5 border-b-2 transition-all ${
                      activeNotificationTab === 'general'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNotificationTab('unread')}
                    className={`text-xs font-semibold pb-1.5 border-b-2 transition-all ${
                      activeNotificationTab === 'unread'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    No leídos
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setUnreadNotificationsCount(0)}
                  className="p-1.5 hover:bg-slate-50 rounded-lg text-emerald-600 transition-colors"
                  title="Marcar todo como leído"
                >
                  <CheckCheck size={16} />
                </button>
              </div>

              <div className="py-8 flex flex-col items-center justify-center text-center min-h-[120px]">
                <span className="text-xs font-normal text-slate-400">
                  No hay notificaciones
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu */}
        <div className="relative z-50">
          <button
            type="button"
            onClick={() => setShowProfileMenu((open) => !open)}
            className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all select-none"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold uppercase overflow-hidden border border-slate-100 shadow-sm">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={user?.nombre || 'Usuario'}
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.nombre?.charAt(0) || 'W'
              )}
            </div>
            <div className="hidden xl:block text-left max-w-[150px]">
              <div className="text-sm font-semibold text-slate-800 leading-none mb-0.5 truncate">{user?.nombre || 'Wendy L.'}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{roleLabel}</div>
            </div>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl text-left">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/perfil');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User size={16} className="text-slate-500" />
                Editar perfil
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
