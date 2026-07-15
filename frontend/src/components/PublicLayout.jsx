import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight, Facebook, Instagram, Linkedin } from 'lucide-react';

// Logo GeoChat
const GeoChatLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#00D68F" />
    <path d="M22 12C22 10.8954 21.1046 10 20 10H12C10.8954 10 10 10.8954 10 12V18C10 19.1046 10.8954 20 12 20H18L22 23V12Z" fill="white" />
  </svg>
);

const NAV_LINKS = [
  { name: 'Inicio', path: '/' },
  { name: 'Cómo Funciona', path: '/sistemas' },
  { name: 'Para tu Negocio', path: '/casos-uso' },
  { name: 'Conexiones', path: '/integraciones' },
  { name: 'Precios', path: '/inversion' },
  { name: 'Ayuda', path: '/agencia' },
];

const Sparkle = ({ size = 24, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    style={{ 
      position: 'absolute', 
      pointerEvents: 'none', 
      filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))',
      zIndex: 0,
      ...style 
    }}
  >
    <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="white" opacity="0.8" />
  </svg>
);

export default function PublicLayout({ children }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div style={{ 
      fontFamily: "'Plus Jakarta Sans', sans-serif", 
      minHeight: '100vh', 
      position: 'relative', 
      overflowX: 'hidden',
      background: `
        radial-gradient(circle at 75% 20%, rgba(220, 212, 255, 0.5) 0%, transparent 40%),
        radial-gradient(circle at 20% 50%, rgba(210, 245, 235, 0.4) 0%, transparent 40%),
        radial-gradient(circle at 80% 85%, rgba(230, 242, 255, 0.4) 0%, transparent 50%),
        radial-gradient(circle at 50% 10%, rgba(254, 226, 226, 0.3) 0%, transparent 35%),
        #F4F8FB
      `
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shimmerSweep {
          0% { transform: translateX(-150%) skewX(-25deg); }
          50% { transform: translateX(150%) skewX(-25deg); }
          100% { transform: translateX(150%) skewX(-25deg); }
        }
        .nav-link {
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 600;
          color: #475569;
          transition: all 0.25s ease;
          padding: 6px 14px;
          border-radius: 100px;
        }
        .nav-link:hover {
          color: #00D68F;
          background: rgba(0, 214, 143, 0.08);
          transform: translateY(-1px);
        }
        .nav-link-active {
          color: #00D68F !important;
          font-weight: 800 !important;
        }
        .btn-shimmer {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transform: translateX(-150%) skewX(-25deg);
          animation: shimmerSweep 4s infinite ease-in-out;
        }
        .btn-shimmer:hover {
          background: #00B686 !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 214, 143, 0.35) !important;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          text-decoration: none;
          transition: transform 0.2s ease;
        }
        .logo-container:hover {
          transform: scale(1.03);
        }
      `}</style>

      {/* Sparkles en el fondo */}
      <Sparkle size={18} style={{ top: '15%', left: '10%', opacity: 0.6 }} />
      <Sparkle size={24} style={{ top: '8%', right: '15%', opacity: 0.8 }} />
      <Sparkle size={14} style={{ top: '45%', right: '8%', opacity: 0.5 }} />
      <Sparkle size={20} style={{ top: '75%', left: '12%', opacity: 0.7 }} />
      <Sparkle size={16} style={{ top: '85%', right: '22%', opacity: 0.6 }} />

      {/* ── HEADER PREMIUM GLASS ── */}
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          width: '100%',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.55)',
          boxShadow: '0 8px 32px 0 rgba(15, 23, 42, 0.015)',
          padding: '1.2rem 5%'
        }}>
        <div style={{
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>

          {/* Izquierda: Logo */}
          <Link to="/" className="logo-container">
            <img 
              src="/logo_geochat.png" 
              alt="GeoChat Logo" 
              style={{ width: '42px', height: '42px', objectFit: 'contain' }} 
            />
            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: '#0F172A', letterSpacing: '-0.02em' }}>GeoChat</span>
          </Link>

          {/* Centro: Links de navegación */}
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.6rem' }}>
            {NAV_LINKS.map(l => {
              const isActive = location.pathname === l.path;
              return (
                <div key={l.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  <Link to={l.path} className={`nav-link ${isActive ? 'nav-link-active' : ''}`}>
                    {l.name}
                  </Link>
                  {isActive && (
                    <div style={{ 
                      width: '18px', 
                      height: '3px', 
                      background: '#00D68F', 
                      borderRadius: '4px', 
                      position: 'absolute', 
                      bottom: '-2px',
                      boxShadow: '0 0 8px rgba(0, 214, 143, 0.8)'
                    }} />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Derecha: Botones de acceso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link to="/login" style={{ textDecoration: 'none', color: '#475569', fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#00D68F'} onMouseLeave={(e) => e.target.style.color = '#475569'}>
              Iniciar Sesión
            </Link>
            <Link to="/inversion" className="btn-shimmer" style={{
              textDecoration: 'none', 
              padding: '0.75rem 1.5rem',
              background: '#00D68F',
              color: '#fff', 
              borderRadius: '100px', 
              fontSize: '0.9rem', 
              fontWeight: 700,
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 20px rgba(0, 214, 143, 0.25)'
            }}>
              Crear mi Cuenta Gratis <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>

        </div>
      </motion.header>

      {/* Contenido Principal */}
      <main style={{ 
        zIndex: 1, 
        position: 'relative',
        paddingTop: location.pathname === '/' ? '0' : '5rem'
      }}>
        {children}
      </main>

      {/* FOOTER */}
      <footer style={{ padding: '0 5% 4rem', background: 'transparent', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div style={{
            background: '#FFFFFF', 
            borderRadius: '32px', 
            border: '1px solid rgba(226, 232, 240, 0.8)',
            padding: '4rem', 
            boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.04)', 
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(3, 1fr) 1.2fr', gap: '2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  <img 
                    src="/logo_geochat.png" 
                    alt="GeoChat Logo" 
                    style={{ width: '38px', height: '38px', objectFit: 'contain' }} 
                  />
                  <span style={{ fontWeight: 800, fontSize: '1.45rem', color: '#0F172A' }}>GeoChat</span>
                </div>
                <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 500, marginBottom: '2rem', maxWidth: '250px' }}>
                  La infraestructura conversacional de élite para negocios modernos.
                </p>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 14px', 
                  background: '#ECFDF5', 
                  border: '1px solid rgba(16, 185, 129, 0.2)', 
                  borderRadius: '100px', 
                  color: '#059669', 
                  fontSize: '0.8rem', 
                  fontWeight: 700 
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  Todos los sistemas online
                </div>
              </div>

              {[
                { title: 'Producto', links: [{ n: 'Cómo Funciona', p: '/sistemas' }, { n: 'Conexiones', p: '/integraciones' }, { n: 'Para tu Negocio', p: '/casos-uso' }] },
                { title: 'Empresa', links: [{ n: 'Ayuda', p: '/agencia' }, { n: 'Precios', p: '/inversion' }, { n: 'Contacto', p: '/agencia' }] },
                { title: 'Legal', links: [{ n: 'Privacidad', p: '/' }, { n: 'Términos', p: '/' }, { n: 'Seguridad', p: '/' }] },
              ].map(col => (
                <div key={col.title}>
                  <h4 style={{ fontWeight: 800, color: '#0F172A', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{col.title}</h4>
                  {col.links.map(l => <Link key={l.n} to={l.p} style={{ display: 'block', textDecoration: 'none', color: '#64748B', marginBottom: '0.8rem', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#00D68F'} onMouseOut={e => e.target.style.color = '#64748B'}>{l.n}</Link>)}
                </div>
              ))}

              <div>
                <h4 style={{ fontWeight: 800, color: '#0F172A', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Síguenos</h4>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #E2E8F0', color: '#64748B', transition: 'all 0.2s' }}><Facebook size={16} /></a>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #E2E8F0', color: '#64748B', transition: 'all 0.2s' }}><Instagram size={16} /></a>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #E2E8F0', color: '#64748B', transition: 'all 0.2s' }}><Linkedin size={16} /></a>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #E2E8F0', color: '#64748B', transition: 'all 0.2s' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 500, padding: '0 1rem' }}>
            <div>© 2024 GeoChat. Todos los derechos reservados.</div>
            <div>Hecho con <span style={{ color: '#EF4444' }}>❤️</span> para negocios modernos.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}