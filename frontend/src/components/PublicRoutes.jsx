import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './LandingPage';
import SystemsPage from './SystemsPage';
import PricingPage from './PricingPage';
import AboutPage from './AboutPage';
import IntegrationsPage from './IntegrationsPage';
import UseCasesPage from './UseCasesPage';
import Login from './Login';

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);

export default function PublicRoutes({ onLoginSuccess }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/sistemas" element={<PageTransition><SystemsPage /></PageTransition>} />
        <Route path="/integraciones" element={<PageTransition><IntegrationsPage /></PageTransition>} />
        <Route path="/casos-uso" element={<PageTransition><UseCasesPage /></PageTransition>} />
        <Route path="/inversion" element={<PageTransition><PricingPage /></PageTransition>} />
        <Route path="/agencia" element={<PageTransition><AboutPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login onLoginSuccess={onLoginSuccess} /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
