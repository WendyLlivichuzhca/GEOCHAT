import React from 'react';
import PublicLayout from './PublicLayout';

export default function SystemsPage() {
  return (
    <PublicLayout>
      <section style={{ 
        minHeight: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '6rem 1.5rem', 
        background: 'linear-gradient(155deg,#e6f6f0 0%,#ffffff 50%,#ffffff 100%)', 
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 800 }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#1e1b4b', letterSpacing: '-0.04em', marginBottom: '1rem' }}>
            Sistemas
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#475569', fontWeight: 500 }}>
            Sección en mantenimiento. Pronto estará disponible.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
