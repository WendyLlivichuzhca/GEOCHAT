import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageSquare, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_LINKS = [
  { name: 'Inicio', path: '/' },
  { name: 'Sistemas', path: '/sistemas' },
  { name: 'Integraciones', path: '/integraciones' },
  { name: 'Casos de Uso', path: '/casos-uso' },
  { name: 'Inversión', path: '/inversion' },
  { name: 'Agencia', path: '/agencia' },
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
    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'#F8FAFF', minHeight:'100vh', overflowX:'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        .nav-link { text-decoration:none; padding:.5rem .875rem; border-radius:12px; font-size:.88rem; font-weight:600; color:#475569; transition:all .25s; }
        .nav-link:hover { color:#0EA5E9; background:rgba(14,165,233,.06); }
        .nav-link.active { color:#0EA5E9; background:rgba(14,165,233,.08); }
        .footer-link { display:block; text-decoration:none; color:rgba(255,255,255,.5); margin-bottom:.7rem; font-size:.88rem; font-weight:500; transition:color .2s; }
        .footer-link:hover { color:#38BDF8; }
      `}</style>

      {/* ── FLOATING GLASS NAVBAR ── */}
      <motion.header
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: .65, ease: 'easeOut' }}
        style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000, padding: scrolled ? '.75rem 1.5rem' : '1.25rem 1.5rem', transition:'padding .4s' }}
      >
        <div style={{ maxWidth:1360, margin:'0 auto' }}>
          <div style={{
            background: scrolled ? 'rgba(255,255,255,.88)' : 'rgba(255,255,255,.6)',
            backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
            border:'1px solid rgba(224,242,254,.9)',
            borderRadius:'20px',
            boxShadow: scrolled
              ? '0 8px 32px rgba(14,165,233,.1), 0 0 0 1px rgba(14,165,233,.06)'
              : '0 2px 12px rgba(14,165,233,.04)',
            padding:'.7rem 1.25rem',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            transition:'all .4s',
          }}>
            {/* Logo */}
            <Link to="/" style={{ display:'flex', alignItems:'center', gap:'.7rem', textDecoration:'none' }}>
              <div style={{ width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,#0EA5E9,#38BDF8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(14,165,233,.3)' }}>
                <MessageSquare size={18} color="white" />
              </div>
              <span style={{ fontWeight:800, fontSize:'1.2rem', color:'#0C4A6E', letterSpacing:'-0.02em' }}>GeoChat</span>
            </Link>

            {/* Desktop Nav */}
            <nav style={{ display:'flex', gap:'.25rem', alignItems:'center' }} className="hidden lg:flex">
              {NAV_LINKS.map(l => (
                <Link key={l.path} to={l.path} className={clsx('nav-link', location.pathname === l.path && 'active')}>{l.name}</Link>
              ))}
            </nav>

            {/* CTA */}
            <div style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
              <Link to="/login" style={{ textDecoration:'none', padding:'.6rem 1.4rem', background:'linear-gradient(135deg,#0EA5E9,#0284C7)', color:'#fff', borderRadius:'100px', fontSize:'.85rem', fontWeight:700, boxShadow:'0 4px 14px rgba(14,165,233,.3)', transition:'all .3s', display:'flex', alignItems:'center', gap:'.3rem' }}
                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                Acceder <ChevronRight size={13}/>
              </Link>
              <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden"
                style={{ background:'none', border:'none', cursor:'pointer', color:'#0C4A6E', padding:'4px' }}>
                {mobileOpen ? <X size={22}/> : <Menu size={22}/>}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
              style={{ margin:'.5rem 1.5rem', background:'rgba(255,255,255,.97)', backdropFilter:'blur(24px)', borderRadius:'18px', padding:'1.25rem', border:'1px solid rgba(224,242,254,.9)', boxShadow:'0 12px 40px rgba(14,165,233,.12)' }}>
              {NAV_LINKS.map(l => (
                <Link key={l.path} to={l.path} style={{ display:'block', padding:'.8rem 1rem', borderRadius:'12px', textDecoration:'none', fontWeight:600, color: location.pathname === l.path ? '#0EA5E9' : '#334155', background: location.pathname === l.path ? 'rgba(14,165,233,.07)' : 'transparent', marginBottom:'.2rem' }}>
                  {l.name}
                </Link>
              ))}
              <Link to="/login" style={{ display:'block', marginTop:'1rem', padding:'.875rem', textAlign:'center', borderRadius:'14px', textDecoration:'none', background:'linear-gradient(135deg,#0EA5E9,#0284C7)', color:'#fff', fontWeight:700 }}>
                Acceder al Sistema
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main style={{ paddingTop:'5rem' }}>{children}</main>

      {/* ── FOOTER with gradient fusion ── */}
      <footer style={{ background:'linear-gradient(180deg,#F0F9FF 0%,#0C4A6E 18%)', paddingTop:'4rem' }}>
        <div style={{ background:'#0C4A6E', padding:'4rem 2rem 2rem' }}>
          <div style={{ maxWidth:1280, margin:'0 auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'3rem', marginBottom:'3.5rem' }}>
              {/* Brand */}
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'.7rem', marginBottom:'1rem' }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <MessageSquare size={16} color="white"/>
                  </div>
                  <span style={{ fontWeight:800, fontSize:'1.1rem', color:'#fff' }}>GeoChat</span>
                </div>
                <p style={{ color:'rgba(255,255,255,.55)', fontSize:'.88rem', lineHeight:1.7, maxWidth:220 }}>
                  La infraestructura conversacional de élite para negocios modernos.
                </p>
                <div style={{ marginTop:'1.25rem', display:'inline-flex', alignItems:'center', gap:'.5rem', background:'rgba(16,185,129,.15)', padding:'.4rem .875rem', borderRadius:'100px', border:'1px solid rgba(16,185,129,.25)' }}>
                  <span style={{ width:7,height:7,borderRadius:'50%',background:'#10B981',display:'inline-block' }}/>
                  <span style={{ fontSize:'.75rem',fontWeight:700,color:'#10B981' }}>Todos los sistemas online</span>
                </div>
              </div>
              {/* Links */}
              {[
                { title:'Producto', links:[{n:'Sistemas',p:'/sistemas'},{n:'Integraciones',p:'/integraciones'},{n:'Casos de Uso',p:'/casos-uso'}] },
                { title:'Empresa', links:[{n:'Agencia',p:'/agencia'},{n:'Inversión',p:'/inversion'},{n:'Contacto',p:'/'}] },
                { title:'Legal', links:[{n:'Privacidad',p:'/'},{n:'Términos',p:'/'},{n:'Seguridad',p:'/'}] },
              ].map(col=>(
                <div key={col.title}>
                  <h4 style={{ fontWeight:700,color:'rgba(255,255,255,.85)',marginBottom:'1.1rem',fontSize:'.95rem' }}>{col.title}</h4>
                  {col.links.map(l=><Link key={l.n} to={l.p} className="footer-link">{l.n}</Link>)}
                </div>
              ))}
            </div>
            <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:'2rem', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
              <p style={{ color:'rgba(255,255,255,.35)', fontSize:'.82rem' }}>© 2026 GeoChat. Todos los derechos reservados.</p>
              <p style={{ color:'rgba(255,255,255,.35)', fontSize:'.82rem' }}>Hecho con ❤️ para negocios modernos.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
