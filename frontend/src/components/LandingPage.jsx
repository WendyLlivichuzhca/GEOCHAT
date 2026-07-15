import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicLayout from './PublicLayout';

const T = {
  primary: '#1e1b4b',
  secondary: '#475569',
  emerald: '#2d9d78',
  emeraldHover: '#237a5d',
  border: 'rgba(226,232,240,0.8)',
};

export default function LandingPage() {
  return (
    <PublicLayout>
      <section style={{ 
        minHeight: '80vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '6rem 1.5rem', 
        background: 'linear-gradient(155deg,#e6f6f0 0%,#ffffff 50%,#ffffff 100%)', 
        position: 'relative', 
        overflow: 'hidden',
        textAlign: 'center'
      }}>
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: -140, right: -140, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle,rgba(45,157,120,.08),transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -200, left: -100, width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle,rgba(30,27,75,.03),transparent 68%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 800, position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, color: T.primary, letterSpacing: '-0.04em', marginBottom: '1.5rem' }}>
            Tus ventas en WhatsApp,<br />
            <span style={{ background: `linear-gradient(135deg,${T.emerald},#1b5e48,#1e1b4b)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              automatizadas con IA.
            </span>
          </h1>

          <p style={{ fontSize: '1.1rem', color: T.secondary, lineHeight: 1.6, marginBottom: '3rem', maxWidth: 580, margin: '0 auto 3rem', fontWeight: 500 }}>
            Conecta tu equipo a un solo número de WhatsApp. Deja que nuestro Agente de IA califique clientes, responda preguntas usando tus propios PDFs y guarde datos estructurados directamente en tu CRM.
          </p>

          {/* Botones clave */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/inversion" style={{ textDecoration: 'none', padding: '1.05rem 2.4rem', background: T.emerald, color: '#fff', borderRadius: 100, fontWeight: 800, fontSize: '.95rem', display: 'inline-flex', alignItems: 'center', gap: '.5rem', transition: 'all 0.25s', boxShadow: '0 4px 14px rgba(45,157,120,.25)' }}
              onMouseEnter={e => e.currentTarget.style.background = T.emeraldHover}
              onMouseLeave={e => e.currentTarget.style.background = T.emerald}>
              Prueba Gratis de 7 Días <ArrowRight size={16} />
            </Link>
            <Link to="/sistemas" style={{ textDecoration: 'none', padding: '1.05rem 2.2rem', background: '#ffffff', color: T.primary, borderRadius: 100, fontWeight: 800, border: '1px solid #e2e8f0', fontSize: '.95rem', transition: 'all 0.25s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
              Ver Sistemas
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
