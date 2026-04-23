// frontend/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Perfil from './components/Perfil';
import Tableros from './components/Tableros'; 
import WhalinkConfig from './components/WhalinkConfig';
import WhalinkDetail from './components/WhalinkDetail';
import WhalinkList from './components/WhalinkList';
import Contactos from './components/Contactos';
import Chats from './components/Chats';
const USER_STORAGE_KEY = 'geochat_user';

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
      <Routes>
        <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
        <Route path="/chats" element={<Chats user={user} onLogout={handleLogout} />} />
        <Route path="/contactos" element={<Contactos user={user} onLogout={handleLogout} />} />
        <Route path="/tableros" element={<Tableros user={user} onLogout={handleLogout} />} />        
        <Route path="/perfil" element={<Perfil user={user} onUpdateProfile={handleUpdateProfile} />} />
        <Route path="/whalink" element={<WhalinkList user={user} onLogout={handleLogout} />} />
        <Route path="/whalink/crear" element={<WhalinkConfig user={user} onLogout={handleLogout} />} />
        <Route path="/whalink/:id/editar" element={<WhalinkConfig user={user} onLogout={handleLogout} />} />
        <Route path="/whalink/:id" element={<WhalinkDetail user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;