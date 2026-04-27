// frontend/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
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

const USER_STORAGE_KEY = 'geochat_user';

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
        <Route path="/automatizaciones"          element={<Automatizaciones user={user} onLogout={onLogout} />} />
        <Route path="/automatizaciones/crear"    element={<AutomationBuilder user={user} onLogout={onLogout} />} />
        <Route path="/automatizaciones/editar/:id" element={<AutomationBuilder user={user} onLogout={onLogout} />} />
        <Route path="/perfil"                    element={<Perfil         user={user} onUpdateProfile={onUpdateProfile} />} />
        <Route path="/whalink"                   element={<WhalinkList    user={user} onLogout={onLogout} />} />
        <Route path="/whalink/crear"             element={<WhalinkConfig  user={user} onLogout={onLogout} />} />
        <Route path="/whalink/:id/editar"        element={<WhalinkConfig  user={user} onLogout={onLogout} />} />
        <Route path="/whalink/:id"               element={<WhalinkDetail  user={user} onLogout={onLogout} />} />
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

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <AnimatedRoutes
        user={user}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
      />
    </BrowserRouter>
  );
}

export default App;
