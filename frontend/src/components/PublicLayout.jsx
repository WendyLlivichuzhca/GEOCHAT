import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageSquare, ChevronRight, Facebook, Instagram, Linkedin, MessageCircle } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_LINKS = [
  { name: 'Inicio', path: '/' },
  { name: 'Cómo Funciona', path: '/sistemas' },
  { name: 'Para tu Negocio', path: '/casos-uso' },
  { name: 'Conexiones', path: '/integraciones' },
  { name: 'Precios', path: '/inversion' },
  { name: 'Ayuda', path: '/agencia' },
];

export default function PublicLayout({ children }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ 
      fontFamily: "'Plus Jakarta Sans', sans-serif", 
      background: '#FBFEFF', 
      minHeight: '100vh', 
      overflowX: 'hidden',
      position: 'relative'
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      
      {/* Aurora Radial Glow Background Effects */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '25%',
        transform: 'translate(-50%, -50%)',
        width: '60vw',
        height: '60vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 214, 143, 0.04) 0%, rgba(0, 194, 255, 0.04) 40%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        top: '60%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(238, 236, 255, 0.6) 0%, rgba(0, 194, 255, 0.02) 50%, transparent 80%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <style>{`
        .nav-link { 
          text-decoration: none; 
          padding: .4rem .2rem; 
          margin: 0 .85rem; 
          font-size: .88rem; 
          font-weight: 600; 
          color: rgba(26, 31, 54, 0.65); 
          transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1); 
          border-bottom: 2px solid transparent; 
        }
        .nav-link:hover { 
          color: #00D68F; 
        }
        .nav-link.active { 
          color: #00D68F; 
          border-bottom: 2px solid #00D68F; 
          font-weight: 700;
        }

        .footer-link { 
          display: block; 
          text-decoration: none; 
          color: #64748b; 
          margin-bottom: .85rem; 
          font-size: .85rem; 
          font-weight: 500; 
          transition: color 200ms ease; 
        }
        .footer-link:hover { 
          color: #00D68F; 
        }
      `}</style>

      {/* ── NAVBAR HEADER ── */}
      <motion.header
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: .65, ease: [0.16, 1, 0.3, 1] }}
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000, 
          background: scrolled ? 'rgba(251, 254, 255, 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none', 
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(229, 231, 235, 0.5)' : '1px solid transparent',
          boxShadow: scrolled ? '0 4px 30px rgba(26, 31, 54, 0.02)' : 'none',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <div style={{ 
          maxWidth: 1140,
          margin: '0 auto',
          padding: scrolled ? '0.75rem 2rem' : '1.1rem 2rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          transition: 'all 0.3s ease' 
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '.6rem', textDecoration: 'none' }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 10, 
              background: 'linear-gradient(135deg, #00D68F, #00C2FF)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0 4px 12px rgba(0, 214, 143, 0.25)' 
            }}>
              <MessageSquare size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1A1F36', letterSpacing: '-0.02em' }}>GeoChat</span>
          </Link>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center' }} className="hidden lg:flex">
            {NAV_LINKS.map(l => (
              <Link key={l.path} to={l.path} className={clsx('nav-link', location.pathname === l.path && 'active')}>{l.name}</Link>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <Link to="/login" style={{ 
              textDecoration: 'none', 
              color: 'rgba(26, 31, 54, 0.75)', 
              fontSize: '.88rem', 
              fontWeight: 605, 
              marginRight: '.65rem', 
              transition: 'color 200ms ease' 
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#00D68F'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(26, 31, 54, 0.75)'}>
              Iniciar Sesión
            </Link>
            <Link to="/inversion" style={{ 
              textDecoration: 'none', 
              padding: '.55rem 1.35rem', 
              background: 'linear-gradient(135deg, #00D68F, #00C2FF)', 
              color: '#fff', 
              borderRadius: '100px', 
              fontSize: '.82rem', 
              fontWeight: 750, 
              boxShadow: '0 4px 14px rgba(0, 214, 143, 0.2)', 
              transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '.25rem' 
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 194, 255, 0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 214, 143, 0.2)'; }}>
              Crear mi Cuenta Gratis <ChevronRight size={13} />
            </Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A1F36', padding: '4px' }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ 
                background: 'rgba(251, 254, 255, 0.95)', 
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                margin: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                padding: '1rem 2rem 1.5rem', 
                boxShadow: '0 10px 30px rgba(26,31,54,0.05)' 
              }}>
              {NAV_LINKS.map(l => (
                <Link key={l.path} to={l.path} style={{ display: 'block', padding: '.8rem 0', textDecoration: 'none', fontWeight: 600, color: location.pathname === l.path ? '#00D68F' : '#64748b', borderBottom: '1px solid rgba(229, 231, 235, 0.5)' }}>
                  {l.name}
                </Link>
              ))}
              <Link to="/login" style={{ display: 'block', marginTop: '1rem', padding: '.875rem', textAlign: 'center', borderRadius: '100px', textDecoration: 'none', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                Iniciar Sesión
              </Link>
              <Link to="/inversion" style={{ display: 'block', marginTop: '0.5rem', padding: '.875rem', textAlign: 'center', borderRadius: '100px', textDecoration: 'none', background: 'linear-gradient(135deg, #00D68F, #00C2FF)', color: '#fff', fontWeight: 700 }}>
                Crear mi Cuenta Gratis
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Content wrapper */}
      <main style={{ zIndex: 1, position: 'relative' }}>{children}</main>

      {/* ── FOOTER MINIMALISTA CON MUCHO ESPACIO Y DISEÑO PREMIUM ── */}
      <footer style={{ 
        background: '#FBFEFF', 
        padding: '6rem 2rem 3rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Soft bottom aurora glow */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: '15%',
          width: '40vw',
          height: '40vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 194, 255, 0.02) 0%, rgba(238, 236, 255, 0.2) 60%, transparent 90%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: -1
        }} />

        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          
          {/* Rounded Footer Panel Container matching the user's mockup layout */}
          <div style={{
            background: 'linear-gradient(135deg, #FBFEFF, #F8FAFC)',
            borderRadius: '24px',
            border: '1px solid rgba(229, 231, 235, 0.7)',
            padding: '3.5rem 3rem',
            boxShadow: '0 8px 30px rgba(26, 31, 54, 0.01)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '3rem' }}>
              {/* Brand Column */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    width: 34, 
                    height: 34, 
                    borderRadius: 9, 
                    background: 'linear-gradient(135deg, #00D68F, #00C2FF)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: '0 3px 10px rgba(0, 214, 143, 0.2)' 
                  }}>
                    <MessageSquare size={15} color="white" />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1A1F36' }}>GeoChat</span>
                </div>
                <p style={{ color: '#64748B', fontSize: '.88rem', lineHeight: 1.8, maxWidth: 280, fontWeight: 500, marginBottom: '2rem' }}>
                  La infraestructura conversacional de élite para negocios modernos.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: '#EEF2FF', padding: '.5rem 1rem', borderRadius: '100px', border: '1px solid rgba(26, 31, 54, 0.05)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00D68F', display: 'inline-block' }} />
                  <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#00D68F' }}>Todos los sistemas online</span>
                </div>
              </div>

              {/* Links Columns */}
              {[
                { title: 'Producto', links: [{ n: 'Cómo Funciona', p: '/sistemas' }, { n: 'Conexiones', p: '/integraciones' }, { n: 'Para tu Negocio', p: '/casos-uso' }] },
                { title: 'Empresa', links: [{ n: 'Ayuda', p: '/agencia' }, { n: 'Precios', p: '/inversion' }, { n: 'Contacto', p: '/' }] },
                { title: 'Legal', links: [{ n: 'Privacidad', p: '/' }, { n: 'Términos', p: '/' }, { n: 'Seguridad', p: '/' }] },
              ].map(col => (
                <div key={col.title}>
                  <h4 style={{ fontWeight: 800, color: '#1A1F36', marginBottom: '1.5rem', fontSize: '.9rem', letterSpacing: '0.02em' }}>{col.title}</h4>
                  {col.links.map(l => (
                    <Link key={l.n} to={col.title === 'Empresa' && l.n === 'Precios' ? '/inversion' : l.p} className="footer-link">
                      {col.title === 'Empresa' && l.n === 'Precios' ? 'Precios' : l.n}
                    </Link>
                  ))}
                </div>
              ))}

              {/* Síguenos Column */}
              <div>
                <h4 style={{ fontWeight: 800, color: '#1A1F36', marginBottom: '1.5rem', fontSize: '.9rem', letterSpacing: '0.02em' }}>Síguenos</h4>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {[
                    { icon: <Facebook size={16} />, href: '#' },
                    { icon: <Instagram size={16} />, href: '#' },
                    { icon: <Linkedin size={16} />, href: '#' },
                    { icon: <MessageCircle size={16} />, href: '#' }
                  ].map((social, i) => (
                    <a key={i} href={social.href} style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748B',
                      background: '#ffffff',
                      transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 2px 6px rgba(26, 31, 54, 0.02)'
                    }}
                    onMouseEnter={e => { 
                      e.currentTarget.style.color = '#00D68F'; 
                      e.currentTarget.style.borderColor = '#00D68F'; 
                      e.currentTarget.style.transform = 'translateY(-3px)'; 
                      e.currentTarget.style.boxShadow = '0 6px 14px rgba(0, 214, 143, 0.15)';
                    }}
                    onMouseLeave={e => { 
                      e.currentTarget.style.color = '#64748B'; 
                      e.currentTarget.style.borderColor = '#E5E7EB'; 
                      e.currentTarget.style.transform = 'translateY(0)'; 
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(26, 31, 54, 0.02)';
                    }}>
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Copyright Row below the card-panel */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '1.2rem', 
            alignItems: 'center',
            padding: '0 1rem'
          }}>
            <p style={{ color: '#94A3B8', fontSize: '.82rem', fontWeight: 500 }}>© 2024 GeoChat. Todos los derechos reservados.</p>
            <p style={{ color: '#94A3B8', fontSize: '.82rem', fontWeight: 500 }}>Hecho con ❤️ para negocios modernos.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
