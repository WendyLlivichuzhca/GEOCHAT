// frontend/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Perfil from './components/Perfil';
import Tableros from './components/Tableros';
import WhalinkConfig from './components/WhalinkConfig';
import WhalinkDetail from './components/WhalinkDetail';
import WhalinkList from './components/WhalinkList';
import Contactos from './components/Contactos';
import Chats from './components/Chats';
import Automatizaciones from './components/Automatizaciones';
import AutomationBuilder from './components/AutomationBuilder';
import CustomFields from './components/CustomFields';
import Tags from './components/Tags';
import MensajesProgramados from './components/MensajesProgramados';
import CrearMensaje from './components/CrearMensaje';
import Plantillas from './components/Plantillas';
import CrearPlantilla from './components/CrearPlantilla';
import GruposComunidades from './components/GruposComunidades';
import Metricas from './components/Metricas';
import PublicRoutes from './components/PublicRoutes';
import EnviosMasivos from './components/EnviosMasivos';
import CrearEnvioMasivo from './components/CrearEnvioMasivo';
import Campanas from './components/Campanas';
import CrearCampana from './components/CrearCampana';
import CampanaRedirect from './components/CampanaRedirect';
import WhalinkPublic from './components/WhalinkPublic';
import ChatbotWidget from './components/ChatbotWidget';
import AgentesIA from './components/AgentesIA';
import AgentesEquipo from './components/AgentesEquipo';


const USER_STORAGE_KEY = 'geochat_user';

// Interceptor global de fetch para manejar la expiración del token (error 401)
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  try {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      const urlString = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      // No interferir con credenciales inválidas en el login
      if (!urlString.includes('/api/login')) {
        localStorage.removeItem(USER_STORAGE_KEY);
        window.location.href = '/';
      }
    }
    return response;
  } catch (error) {
    throw error;
  }
};


/* ── Wrapper que anima cada cambio de ruta ── */
function AnimatedRoutes({ user, onLogout, onUpdateProfile }) {
  const location = useLocation();

  React.useEffect(() => {
    document.documentElement.classList.add('dashboard-active');
    document.body.classList.add('dashboard-active');
    return () => {
      document.documentElement.classList.remove('dashboard-active');
      document.body.classList.remove('dashboard-active');
    };
  }, []);

  const isAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';
  const isCollaborator = user?.rol === 'agente' || user?.rol === 'visor';

  return (
    <div key={location.pathname} className="page-enter" style={{ minHeight: '100vh' }}>
      <Routes location={location}>
        <Route path="/"                          element={<Dashboard      user={user} onLogout={onLogout} />} />
        <Route path="/chats"                     element={<Chats          user={user} onLogout={onLogout} />} />
        <Route path="/contactos"                 element={<Contactos      user={user} onLogout={onLogout} />} />
        <Route path="/campos"                    element={<CustomFields   user={user} onLogout={onLogout} />} />
        <Route path="/tableros"                  element={<Tableros       user={user} onLogout={onLogout} />} />
        <Route path="/tags"                      element={<Tags           user={user} onLogout={onLogout} />} />
        <Route path="/perfil"                    element={<Perfil         user={user} onLogout={onLogout} onUpdateProfile={onUpdateProfile} />} />
        <Route path="/metricas"                  element={<Metricas user={user} onLogout={onLogout} />} />
        {/* Rutas exclusivas de administrador */}
        <Route path="/mensajes"                  element={isCollaborator ? <Navigate to="/" /> : <MensajesProgramados user={user} onLogout={onLogout} />} />
        <Route path="/mensajes/crear"            element={isCollaborator ? <Navigate to="/" /> : <CrearMensaje user={user} onLogout={onLogout} />} />
        <Route path="/plantillas"               element={isCollaborator ? <Navigate to="/" /> : <Plantillas user={user} onLogout={onLogout} />} />
        <Route path="/plantillas/crear"         element={isCollaborator ? <Navigate to="/" /> : <CrearPlantilla user={user} onLogout={onLogout} />} />
        <Route path="/plantillas/editar/:id"    element={isCollaborator ? <Navigate to="/" /> : <CrearPlantilla user={user} onLogout={onLogout} />} />
        <Route path="/grupos"                    element={isCollaborator ? <Navigate to="/" /> : <GruposComunidades user={user} onLogout={onLogout} />} />
        <Route path="/campanas"                  element={isCollaborator ? <Navigate to="/" /> : <Campanas user={user} onLogout={onLogout} />} />
        <Route path="/campanas/crear"            element={isCollaborator ? <Navigate to="/" /> : <CrearCampana user={user} onLogout={onLogout} />} />
        <Route path="/automatizaciones"          element={isCollaborator ? <Navigate to="/" /> : <Automatizaciones user={user} onLogout={onLogout} />} />
        <Route path="/automatizaciones/crear"    element={isCollaborator ? <Navigate to="/" /> : <AutomationBuilder user={user} onLogout={onLogout} />} />
        <Route path="/automatizaciones/editar/:id" element={isCollaborator ? <Navigate to="/" /> : <AutomationBuilder user={user} onLogout={onLogout} />} />
        <Route path="/whalink"                   element={isCollaborator ? <Navigate to="/" /> : <WhalinkList    user={user} onLogout={onLogout} />} />
        <Route path="/whalink/crear"             element={isCollaborator ? <Navigate to="/" /> : <WhalinkConfig  user={user} onLogout={onLogout} />} />
        <Route path="/whalink/:id/editar"        element={isCollaborator ? <Navigate to="/" /> : <WhalinkConfig  user={user} onLogout={onLogout} />} />
        <Route path="/whalink/:id"               element={isCollaborator ? <Navigate to="/" /> : <WhalinkDetail  user={user} onLogout={onLogout} />} />
        <Route path="/envios-masivos"            element={isCollaborator ? <Navigate to="/" /> : <EnviosMasivos  user={user} onLogout={onLogout} />} />
        <Route path="/envios-masivos/crear"      element={isCollaborator ? <Navigate to="/" /> : <CrearEnvioMasivo user={user} onLogout={onLogout} />} />
        <Route path="/agentes-ia"                element={isCollaborator ? <Navigate to="/" /> : <AgentesIA user={user} onLogout={onLogout} />} />
        <Route path="/agentes"                   element={isAdmin ? <AgentesEquipo user={user} onLogout={onLogout} /> : <Navigate to="/" />} />
        <Route path="*"                          element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  const handleUpdateProfile = (updatedData) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updatedData };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      return nextUser;
    });
  };

  React.useEffect(() => {
    if (user?.id) {
      const API_URL = import.meta.env.VITE_API_URL || '';
      fetch(`${API_URL}/api/dispositivos/ensure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      .then(res => res.json())
      .then(data => {
        console.log('Bridge iniciado automaticamente al arranque:', data);
      })
      .catch(err => {
        console.error('Error al intentar levantar el bridge al arranque:', err);
      });
    }
  }, [user?.id]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/c/:shortCode" element={<CampanaRedirect />} />
        <Route path="/l/:shortCode" element={<WhalinkPublic />} />
        <Route path="*" element={
          user ? (
            <>
              <AnimatedRoutes
                user={user}
                onLogout={handleLogout}
                onUpdateProfile={handleUpdateProfile}
              />
              <ChatbotWidget user={user} />
            </>
          ) : (
            <PublicRoutes onLoginSuccess={handleLoginSuccess} />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
