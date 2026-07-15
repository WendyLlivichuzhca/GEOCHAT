import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smile, Zap, Briefcase, Brain, MessageSquare, ChevronRight, TrendingUp } from 'lucide-react';
import PublicLayout from './PublicLayout';

const T = {
  primary: '#1A1F36',     // Azul Oscuro
  secondary: '#475569',   // Gris Azulado
  auroraGreen: '#00D68F', // Verde Aurora
  turquoise: '#00C2FF',   // Turquesa
  lavender: '#EEF2FF',    // Lavanda Suave
  bg: '#FBFEFF',          // Fondo
  border: 'rgba(255, 255, 255, 0.55)',
};

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* CSS Keyframes and Classes for Micro-animations & Glows */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes float-delay {
          0% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes float-side {
          0% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-5px) translateX(5px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
        @keyframes aurora-pulse {
          0% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.8; transform: scale(1); }
        }

        .float-card-1 {
          animation: float 6s ease-in-out infinite;
        }
        .float-card-2 {
          animation: float-delay 7s ease-in-out infinite;
        }
        .float-card-3 {
          animation: float-side 8s ease-in-out infinite;
        }
        .phone-element {
          animation: float 9s ease-in-out infinite;
        }

        .hero-pill {
          background: rgba(0, 214, 143, 0.05);
          border: 1px solid rgba(0, 214, 143, 0.15);
          color: #00D68F;
          padding: 0.5rem 1.25rem;
          border-radius: 100px;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0, 214, 143, 0.02);
        }

        .btn-aurora {
          text-decoration: none;
          padding: 1.05rem 2.4rem;
          background: linear-gradient(135deg, #00D68F, #00C2FF);
          color: #fff;
          border-radius: 100px;
          font-weight: 800;
          font-size: 0.95rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 18px rgba(0, 214, 143, 0.25);
          transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-aurora:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 24px rgba(0, 194, 255, 0.4);
        }

        .btn-outline {
          text-decoration: none;
          padding: 1.05rem 2.2rem;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          color: #1A1F36;
          border-radius: 100px;
          font-weight: 800;
          border: 1px solid rgba(229, 231, 235, 0.8);
          font-size: 0.95rem;
          transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-flex;
          align-items: center;
        }
        .btn-outline:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(26, 31, 54, 0.04);
        }

        .bottom-pill-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 20px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          box-shadow: 0 4px 18px rgba(26, 31, 54, 0.02);
          transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bottom-pill-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(26, 31, 54, 0.05);
          border-color: rgba(0, 214, 143, 0.15);
        }

        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 4rem !important;
          }
          .right-side-visuals {
            justify-content: center !important;
          }
        }
      `}</style>

      {/* ── MAIN HERO SECTION ── */}
      <section style={{ 
        minHeight: '90vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '8rem 2rem 5rem', 
        position: 'relative', 
        overflow: 'hidden'
      }}>
        {/* Subtle Background Lighting (Aurora effect behind content) */}
        <div style={{ 
          position: 'absolute', 
          top: '25%', 
          right: '5%', 
          width: '50vw', 
          height: '50vw', 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(0, 194, 255, 0.04) 0%, rgba(0, 214, 143, 0.03) 40%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'aurora-pulse 8s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div className="hero-grid" style={{ 
          maxWidth: 1200, 
          width: '100%',
          margin: '0 auto', 
          display: 'grid', 
          gridTemplateColumns: '1.2fr 0.8fr', 
          gap: '2rem',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1 
        }}>
          
          {/* LEFT SIDE: Hero copy & CTAs */}
          <div style={{ textAlign: 'left' }}>
            <div className="hero-pill">
              <span>✨</span> IA + WhatsApp + Automatización
            </div>

            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 5.5vw, 4rem)', 
              fontWeight: 800, 
              lineHeight: 1.1, 
              color: T.primary, 
              letterSpacing: '-0.04em', 
              marginBottom: '1.5rem' 
            }}>
              Tus ventas en WhatsApp,<br />
              <span style={{ 
                background: `linear-gradient(135deg, ${T.auroraGreen}, ${T.turquoise})`, 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                automatizadas con IA.
              </span>
            </h1>

            <p style={{ 
              fontSize: '1.15rem', 
              color: T.secondary, 
              lineHeight: 1.6, 
              marginBottom: '3rem', 
              maxWidth: 560, 
              fontWeight: 500 
            }}>
              Conecta tu equipo a un solo número de WhatsApp. Deja que nuestro Agente de IA califique clientes, responda preguntas usando tus propios PDFs y guarde datos estructurados directamente en tu CRM.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '4.5rem' }}>
              <Link to="/inversion" className="btn-aurora">
                Prueba Gratis de 7 Días <ArrowRight size={16} />
              </Link>
              <Link to="/sistemas" className="btn-outline">
                Ver Sistemas
              </Link>
            </div>

            {/* Four lower highlight pill cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', 
              gap: '1rem' 
            }}>
              <div className="bottom-pill-card">
                <div style={{ color: T.auroraGreen, display: 'flex', alignItems: 'center' }}>
                  <Smile size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: T.primary, lineHeight: 1.2 }}>+98%</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: T.secondary }}>Satisfacción</div>
                </div>
              </div>

              <div className="bottom-pill-card">
                <div style={{ color: T.turquoise, display: 'flex', alignItems: 'center' }}>
                  <Zap size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: T.primary, lineHeight: 1.2 }}>24/7</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: T.secondary }}>Automatización</div>
                </div>
              </div>

              <div className="bottom-pill-card">
                <div style={{ color: T.auroraGreen, display: 'flex', alignItems: 'center' }}>
                  <Briefcase size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: T.primary, lineHeight: 1.2 }}>+10K</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: T.secondary }}>Negocios</div>
                </div>
              </div>

              <div className="bottom-pill-card">
                <div style={{ color: '#8B5CF6', display: 'flex', alignItems: 'center' }}>
                  <Brain size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: T.primary, lineHeight: 1.2 }}>IA Avanzada</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: T.secondary }}>Siempre Aprende</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Phone Mockup & Floating Cards */}
          <div className="right-side-visuals" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            justifyContent: 'flex-end',
            position: 'relative'
          }}>
            {/* Visual glow background strictly behind phone */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '40%',
              transform: 'translate(-50%, -50%)',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 194, 255, 0.08) 0%, transparent 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
              zIndex: 0
            }} />

            {/* Smart Phone Mockup */}
            <div className="phone-element" style={{ 
              width: '270px', 
              height: '530px', 
              borderRadius: '38px', 
              border: `10px solid ${T.primary}`, 
              background: '#FBFEFF', 
              boxShadow: '0 25px 60px -15px rgba(26, 31, 54, 0.16)', 
              position: 'relative', 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              zIndex: 1
            }}>
              {/* Dynamic Island / Notch */}
              <div style={{ 
                position: 'absolute', 
                top: '8px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                width: '80px', 
                height: '18px', 
                borderRadius: '10px', 
                background: T.primary, 
                zIndex: 10 
              }} />

              {/* Chat Header */}
              <div style={{ 
                padding: '24px 12px 10px', 
                background: '#ffffff', 
                borderBottom: '1px solid #EEF2FF', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem' 
              }}>
                <div style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #00D68F, #00C2FF)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.65rem'
                }}>
                  G
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: T.primary }}>GeoChat IA</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.auroraGreen, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, color: T.auroraGreen }}>En línea</span>
                  </div>
                </div>
              </div>

              {/* Chat Area (Simulated conversation) */}
              <div style={{ 
                flex: 1, 
                padding: '12px', 
                background: '#EEF2FF', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px',
                justifyContent: 'flex-start'
              }}>
                {/* Client incoming query */}
                <div style={{ 
                  alignSelf: 'flex-end', 
                  background: 'rgba(0, 194, 255, 0.1)', 
                  border: '1px solid rgba(0, 194, 255, 0.15)',
                  color: T.primary, 
                  padding: '8px 12px', 
                  borderRadius: '16px 16px 2px 16px', 
                  maxWidth: '85%', 
                  fontSize: '0.72rem', 
                  fontWeight: 600,
                  lineHeight: 1.4,
                  textAlign: 'left',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}>
                  Hola, quiero más información sobre los planes
                </div>

                {/* AI outgoing reply */}
                <div style={{ 
                  alignSelf: 'flex-start', 
                  background: '#ffffff', 
                  border: '1px solid rgba(26, 31, 54, 0.04)',
                  color: T.primary, 
                  padding: '8px 12px', 
                  borderRadius: '16px 16px 16px 2px', 
                  maxWidth: '85%', 
                  fontSize: '0.72rem', 
                  fontWeight: 600,
                  lineHeight: 1.4,
                  textAlign: 'left',
                  boxShadow: '0 2px 8px rgba(26, 31, 54, 0.03)'
                }}>
                  ¡Hola! Claro, te envío la información completa de nuestros planes.
                </div>

                {/* AI typing bubble indicator */}
                <div style={{ 
                  alignSelf: 'flex-start', 
                  background: '#ffffff', 
                  border: '1px solid rgba(26, 31, 54, 0.04)',
                  padding: '6px 10px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  gap: '3px',
                  alignItems: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.auroraGreen, display: 'inline-block', opacity: 0.6 }} />
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.turquoise, display: 'inline-block', opacity: 0.8 }} />
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.primary, display: 'inline-block', opacity: 0.5 }} />
                </div>
              </div>
            </div>

            {/* Vertical Stack of Floating Stats Cards */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              zIndex: 2 
            }}>
              {/* Card 1: Conversaciones */}
              <div className="float-card-1" style={{ 
                background: 'rgba(255, 255, 255, 0.72)', 
                backdropFilter: 'blur(16px)', 
                borderRadius: '24px', 
                border: `1px solid ${T.border}`, 
                boxShadow: '0 12px 30px rgba(26, 31, 54, 0.05)', 
                padding: '1.1rem 1.25rem', 
                width: '185px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.secondary, marginBottom: '0.2rem' }}>Conversaciones</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: T.primary }}>+2,549</span>
                  <span style={{ 
                    fontSize: '0.68rem', 
                    fontWeight: 700, 
                    color: T.auroraGreen, 
                    background: 'rgba(0, 214, 143, 0.08)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '100px'
                  }}>↑ 34%</span>
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', marginTop: '0.2rem' }}>Este mes</div>
              </div>

              {/* Card 2: Ventas Generadas */}
              <div className="float-card-2" style={{ 
                background: 'rgba(255, 255, 255, 0.72)', 
                backdropFilter: 'blur(16px)', 
                borderRadius: '24px', 
                border: `1px solid ${T.border}`, 
                boxShadow: '0 12px 30px rgba(26, 31, 54, 0.05)', 
                padding: '1.1rem 1.25rem', 
                width: '185px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.secondary, marginBottom: '0.2rem' }}>Ventas Generadas</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: T.primary }}>$45,680</span>
                  <span style={{ 
                    fontSize: '0.68rem', 
                    fontWeight: 700, 
                    color: T.auroraGreen, 
                    background: 'rgba(0, 214, 143, 0.08)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '100px'
                  }}>↑ 27%</span>
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', marginTop: '0.2rem' }}>Este mes</div>
              </div>

              {/* Card 3: Calificación de Leads */}
              <div className="float-card-3" style={{ 
                background: 'rgba(255, 255, 255, 0.72)', 
                backdropFilter: 'blur(16px)', 
                borderRadius: '24px', 
                border: `1px solid ${T.border}`, 
                boxShadow: '0 12px 30px rgba(26, 31, 54, 0.05)', 
                padding: '1.1rem 1.25rem', 
                width: '185px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.secondary, marginBottom: '0.2rem' }}>Calificación de Leads</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: T.primary }}>98%</div>
                
                {/* Micro SVG Sparkline Chart */}
                <div style={{ marginTop: '0.4rem', height: '24px', overflow: 'hidden' }}>
                  <svg width="100%" height="24" viewBox="0 0 100 24" fill="none" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D68F" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00C2FF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M0 20 C20 18, 40 22, 60 10 C80 2, 90 6, 100 2" 
                      stroke="url(#sparklineGrad)" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                    <path 
                      d="M0 20 C20 18, 40 22, 60 10 C80 2, 90 6, 100 2 L100 24 L0 24 Z" 
                      fill="url(#sparklineGrad)"
                    />
                  </svg>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>
    </PublicLayout>
  );
}
