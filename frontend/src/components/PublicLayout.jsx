import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageSquare, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_LINKS = [
  { name: 'Inicio', path: '/' },
  { name: 'Planes', path: '/inversion' },
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
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", background: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        /* Menú superior con subrayado verde minimalista idéntico a la captura */
        .nav-link { 
          text-decoration: none; 
          padding: .5rem .1rem; 
          margin: 0 .85rem; 
          font-size: .88rem; 
          font-weight: 600; 
          color: #64748b; 
          transition: all .25s; 
          border-bottom: 2px solid transparent; 
        }
        .nav-link:hover { 
          color: #2d9d78; 
        }
        .nav-link.active { 
          color: #2d9d78; 
          border-bottom: 2px solid #2d9d78; 
          font-weight: 700;
        }

        /* Enlaces del Footer */
        .footer-link { 
          display: block; 
          text-decoration: none; 
          color: #64748b; 
          margin-bottom: .85rem; 
          font-size: .85rem; 
          font-weight: 500; 
          transition: color .2s; 
        }
        .footer-link:hover { 
          color: #2d9d78; 
        }
      `}</style>

      {/* ── NAVBAR EXTENDIDA DE EXTREMO A EXTREMO ── */}
      <motion.header
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: .65, ease: 'easeOut' }}
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000, 
          background: scrolled ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid rgba(241,245,249,0.5)',
          boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.02)' : 'none',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: scrolled ? '0.75rem 2rem' : '1.1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s ease-in-out' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '.6rem', textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2d9d78', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(45,157,120,.15)' }}>
              <MessageSquare size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1e1b4b', letterSpacing: '-0.02em' }}>GeoChat</span>
          </Link>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center' }} className="hidden lg:flex">
            {NAV_LINKS.map(l => (
              <Link key={l.path} to={l.path} className={clsx('nav-link', location.pathname === l.path && 'active')}>{l.name}</Link>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <Link to="/login" style={{ textDecoration: 'none', padding: '.55rem 1.35rem', background: '#2d9d78', color: '#fff', borderRadius: '100px', fontSize: '.82rem', fontWeight: 750, boxShadow: '0 4px 12px rgba(45,157,120,.2)', transition: 'all .3s', display: 'flex', alignItems: 'center', gap: '.25rem' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              Acceder <ChevronRight size={13} />
            </Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e1b4b', padding: '4px' }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem 1.5rem', boxShadow: '0 10px 20px rgba(0,0,0,0.02)' }}>
              {NAV_LINKS.map(l => (
                <Link key={l.path} to={l.path} style={{ display: 'block', padding: '.8rem 0', textDecoration: 'none', fontWeight: 600, color: location.pathname === l.path ? '#2d9d78' : '#475569', borderBottom: '1px solid #f1f5f9' }}>
                  {l.name}
                </Link>
              ))}
              <Link to="/login" style={{ display: 'block', marginTop: '1rem', padding: '.875rem', textAlign: 'center', borderRadius: '100px', textDecoration: 'none', background: '#2d9d78', color: '#fff', fontWeight: 700 }}>
                Acceder al Sistema
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main style={{ paddingTop: scrolled ? '4.5rem' : '5rem', transition: 'padding .4s' }}>{children}</main>

      {/* ── FOOTER (Rediseñado con diseño y colores idénticos a la captura) ── */}
      <footer style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '4.5rem 2rem 2.5rem' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '3rem', marginBottom: '4rem' }}>
            {/* Brand Column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.2rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#2d9d78', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(45,157,120,.15)' }}>
                  <MessageSquare size={15} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e1b4b' }}>GeoChat</span>
              </div>
              <p style={{ color: '#475569', fontSize: '.85rem', lineHeight: 1.7, maxWidth: 240, fontWeight: 500 }}>
                La infraestructura conversacional de élite para negocios modernos.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: '#e6f6f0', padding: '.45rem .9rem', borderRadius: '100px', border: '1px solid rgba(45,157,120,.15)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2d9d78', display: 'inline-block' }} />
                <span style={{ fontSize: '.75rem', fontWeight: 755, color: '#2d9d78' }}>Todos los sistemas online</span>
              </div>
            </div>

            {/* Links Columns */}
            {[
              { title: 'Menú', links: [{ n: 'Inicio', p: '/' }, { n: 'Planes', p: '/inversion' }] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontWeight: 800, color: '#1e1b4b', marginBottom: '1.25rem', fontSize: '.9rem', letterSpacing: '0.01em' }}>{col.title}</h4>
                {col.links.map(l => (
                  <Link key={l.n} to={l.p} className="footer-link">
                    {l.n}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.2rem', alignItems: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '.82rem', fontWeight: 500 }}>© 2024 GeoChat. Todos los derechos reservados.</p>
            <p style={{ color: '#64748b', fontSize: '.82rem', fontWeight: 500 }}>Hecho con ❤️ para negocios modernos.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
