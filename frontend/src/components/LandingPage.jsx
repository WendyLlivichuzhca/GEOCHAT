import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare, Clock, ShieldCheck, Sparkles } from 'lucide-react';
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
      <style>{`
        @media(max-width:900px){
          .hero-container { padding: 4rem 1.5rem!important; }
          .offers-grid { grid-template-columns: 1fr!important; }
        }
      `}</style>

      {/* ══ SECCIÓN PRINCIPAL (HERO) ══ */}
      <section className="hero-container" style={{ 
        minHeight: '75vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '7rem 1.5rem 5rem', 
        background: 'linear-gradient(155deg,#e6f6f0 0%,#ffffff 50%,#ffffff 100%)', 
        position: 'relative', 
        overflow: 'hidden',
        textAlign: 'center'
      }}>
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: -140, right: -140, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle,rgba(45,157,120,.08),transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -200, left: -100, width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle,rgba(30,27,75,.03),transparent 68%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 850, position: 'relative', zIndex: 1 }}>
          
          {/* Badge superior no técnico */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'rgba(45,157,120,0.08)', border: '1px solid rgba(45,157,120,0.2)', padding: '.45rem 1.1rem', borderRadius: 100, fontSize: '.76rem', fontWeight: 800, color: T.emerald, marginBottom: '2rem', letterSpacing: '.03em' }}>
            🚀 LA FORMA MÁS FÁCIL DE VENDER POR WHATSAPP
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)', fontWeight: 900, lineHeight: 1.1, color: T.primary, letterSpacing: '-0.04em', marginBottom: '1.5rem' }}>
            Multiplica tus ventas por WhatsApp<br />
            <span style={{ background: `linear-gradient(135deg,${T.emerald},#1b5e48,#1e1b4b)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              sin perder ningún cliente.
            </span>
          </h1>

          <p style={{ fontSize: '1.08rem', color: T.secondary, lineHeight: 1.6, marginBottom: '3rem', maxWidth: 620, margin: '0 auto 3rem', fontWeight: 500 }}>
            Conecta a todos tus vendedores a un solo número de WhatsApp. Deja que un asistente virtual inteligente atienda las dudas de tus clientes al instante las 24 horas y organice tus chats automáticamente.
          </p>

          {/* Botones clave */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
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

          {/* Beneficios directos */}
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', fontWeight: 700, color: T.secondary }}>
              ✓ Cero configuraciones difíciles
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', fontWeight: 700, color: T.secondary }}>
              ✓ Atiende en equipo desde PC o celular
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', fontWeight: 700, color: T.secondary }}>
              ✓ Asistente inteligente 24/7
            </div>
          </div>
        </div>
      </section>

      {/* ══ QUÉ OFRECEMOS (EXPLICADO PARA CLIENTES) ══ */}
      <section style={{ padding: '5rem 1.5rem', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          
          <div style={{ marginBottom: '4.5rem' }}>
            <span style={{ color: T.emerald, fontWeight: 850, fontSize: '.78rem', letterSpacing: '.15em', textTransform: 'uppercase' }}>¿QUÉ HACE GEUCHAT POR TU NEGOCIO?</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, color: T.primary, marginTop: '.5rem', letterSpacing: '-0.02em' }}>
              Todo lo que necesitas para vender más por WhatsApp
            </h2>
          </div>

          <div className="offers-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
            
            {/* Beneficio 1 */}
            <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(45,157,120,0.08)', color: T.emerald, width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', marginLeft: 'auto', marginRight: 'auto' }}>
                <MessageSquare size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: T.primary, marginBottom: '.75rem' }}>Un solo número de WhatsApp para todos</h3>
              <p style={{ fontSize: '.85rem', color: T.secondary, lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                Conecta a todos tus vendedores al mismo número de WhatsApp de tu empresa. Atiendan juntos desde sus computadoras o celulares, organicen chats y compartan la carga de trabajo de forma ordenada.
              </p>
            </div>

            {/* Beneficio 2 */}
            <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(45,157,120,0.08)', color: T.emerald, width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', marginLeft: 'auto', marginRight: 'auto' }}>
                <Clock size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: T.primary, marginBottom: '.75rem' }}>Respuestas al instante día y noche</h3>
              <p style={{ fontSize: '.85rem', color: T.secondary, lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                Tu asistente virtual responde de forma automática preguntas comunes sobre tus precios, horarios, ubicaciones o servicios. Funciona las 24 horas del día, incluso los fines de semana.
              </p>
            </div>

            {/* Beneficio 3 */}
            <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(45,157,120,0.08)', color: T.emerald, width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', marginLeft: 'auto', marginRight: 'auto' }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: T.primary, marginBottom: '.75rem' }}>Cero pérdida de prospectos</h3>
              <p style={{ fontSize: '.85rem', color: T.secondary, lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                El asistente guarda automáticamente los datos clave del cliente (como su nombre, interés o presupuesto) directamente en su ficha para que tus vendedores no pierdan tiempo buscando información.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ══ LLAMADO A LA ACCIÓN FINAL ══ */}
      <section style={{ padding: '3rem 1.5rem 5rem', background: '#ffffff' }}>
        <div style={{ 
          maxWidth: 860, 
          margin: '0 auto', 
          textAlign: 'center', 
          background: `linear-gradient(135deg, ${T.primary}, #070914)`, 
          borderRadius: 32, 
          padding: '4.5rem 2.5rem', 
          boxShadow: '0 30px 80px rgba(15,23,42,0.12)' 
        }}>
          <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.3rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Empieza a automatizar tu WhatsApp hoy mismo
          </h2>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '.95rem', marginBottom: '2.5rem', maxWidth: 450, margin: '0 auto 2.5rem', lineHeight: 1.5 }}>
            Únete a los negocios que atienden a sus clientes al instante y multiplican sus ventas sin esfuerzo.
          </p>
          <Link to="/inversion" style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem', textDecoration: 'none', padding: '1.05rem 2.5rem', background: '#ffffff', color: T.emerald, borderRadius: 100, fontWeight: 800, fontSize: '.92rem', boxShadow: '0 8px 24px rgba(0,0,0,.15)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ffffff'; }}>
            Comenzar Prueba Gratis <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
