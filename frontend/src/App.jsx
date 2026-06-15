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

  return (
    <div key={location.pathname} className="page-enter" style={{ minHeight: '100vh' }}>
      <Routes location={location}>
        <Route path="/"                          element={<Dashboard      user={user} onLogout={onLogout} />} />
        <Route path="/chats"                     element={<Chats          user={user} onLogout={onLogout} />} />
        <Route path="/contactos"                 element={<Contactos      user={user} onLogout={onLogout} />} />
        <Route path="/campos"                    element={<CustomFields   user={user} onLogout={onLogout} />} />
        <Route path="/tableros"                  element={<Tableros       user={user} onLogout={onLogout} />} />
        <Route path="/tags"                      element={<Tags           user={user} onLogout={onLogout} />} />
        <Route path="/mensajes"                  element={<MensajesProgramados user={user} onLogout={onLogout} />} />
        <Route path="/mensajes/crear"            element={<CrearMensaje user={user} onLogout={onLogout} />} />
        <Route path="/plantillas"               element={<Plantillas user={user} onLogout={onLogout} />} />
        <Route path="/plantillas/crear"         element={<CrearPlantilla user={user} onLogout={onLogout} />} />
        <Route path="/plantillas/editar/:id"    element={<CrearPlantilla user={user} onLogout={onLogout} />} />
        <Route path="/grupos"                    element={<GruposComunidades user={user} onLogout={onLogout} />} />
        <Route path="/metricas"                  element={<Metricas user={user} onLogout={onLogout} />} />
        <Route path="/automatizaciones"          element={<Automatizaciones user={user} onLogout={onLogout} />} />
        <Route path="/automatizaciones/crear"    element={<AutomationBuilder user={user} onLogout={onLogout} />} />
        <Route path="/automatizaciones/editar/:id" element={<AutomationBuilder user={user} onLogout={onLogout} />} />
        <Route path="/perfil"                    element={<Perfil         user={user} onUpdateProfile={onUpdateProfile} />} />
        <Route path="/whalink"                   element={<WhalinkList    user={user} onLogout={onLogout} />} />
        <Route path="/whalink/crear"             element={<WhalinkConfig  user={user} onLogout={onLogout} />} />
        <Route path="/whalink/:id/editar"        element={<WhalinkConfig  user={user} onLogout={onLogout} />} />
        <Route path="/whalink/:id"               element={<WhalinkDetail  user={user} onLogout={onLogout} />} />
        <Route path="/envios-masivos"            element={<EnviosMasivos  user={user} onLogout={onLogout} />} />
        <Route path="/envios-masivos/crear"      element={<CrearEnvioMasivo user={user} onLogout={onLogout} />} />
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
      {user ? (
        <AnimatedRoutes
          user={user}
          onLogout={handleLogout}
          onUpdateProfile={handleUpdateProfile}
        />
      ) : (
        <PublicRoutes onLoginSuccess={handleLoginSuccess} />
      )}
    </BrowserRouter>
  );
}

export default App;
