import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smile, Zap, Briefcase, Brain, ChevronRight, ChevronLeft, MoreVertical, TrendingUp } from 'lucide-react';
import PublicLayout from './PublicLayout';

export default function LandingPage() {
  return (
    <PublicLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        /* ── Keyframes ── */
        @keyframes floatA {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-6px) translateX(5px); }
        }
        @keyframes floatPhone {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes dotPulse1 {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          33% { opacity: 1; transform: scale(1); }
        }
        @keyframes dotPulse2 {
          0%, 33%, 100% { opacity: 0.3; transform: scale(0.8); }
          66% { opacity: 1; transform: scale(1); }
        }
        @keyframes dotPulse3 {
          0%, 66%, 100% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }

        .float-a { animation: floatA 6s ease-in-out infinite; }
        .float-b { animation: floatB 7.5s ease-in-out infinite; }
        .float-c { animation: floatC 8s ease-in-out infinite; }
        .float-phone { animation: floatPhone 9s ease-in-out infinite; }

        .dot1 { animation: dotPulse1 1.4s ease-in-out infinite; }
        .dot2 { animation: dotPulse2 1.4s ease-in-out infinite; }
        .dot3 { animation: dotPulse3 1.4s ease-in-out infinite; }

        /* ── Pill Tag ── */
        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 100px;
          border: 1px solid rgba(0, 214, 143, 0.2);
          background: rgba(0, 214, 143, 0.06);
          color: #00B87A;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 1.75rem;
          letter-spacing: 0.01em;
        }

        /* ── Primary CTA Button ── */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          border-radius: 100px;
          background: linear-gradient(135deg, #00D68F 0%, #00C2FF 100%);
          color: #fff;
          font-weight: 800;
          font-size: 0.9rem;
          text-decoration: none;
          box-shadow: 0 6px 24px rgba(0, 214, 143, 0.3);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
        }
        .btn-primary:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 30px rgba(0, 194, 255, 0.4);
        }

        /* ── Secondary CTA Button ── */
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 14px 24px;
          border-radius: 100px;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(12px);
          color: #1A1F36;
          font-weight: 700;
          font-size: 0.9rem;
          text-decoration: none;
          border: 1px solid #E5E7EB;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
        }
        .btn-secondary:hover {
          background: #fff;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(26, 31, 54, 0.06);
        }

        /* ── Stats Pills ── */
        .stat-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 18px;
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 4px 16px rgba(26, 31, 54, 0.03);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-pill:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(26, 31, 54, 0.06);
          border-color: rgba(0, 214, 143, 0.12);
        }

        /* ── Floating Stat Cards ── */
        .stat-card {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 20px;
          padding: 16px 20px;
          box-shadow: 0 8px 30px rgba(26, 31, 54, 0.06);
          text-align: left;
          min-width: 172px;
        }

        /* ── Hero grid responsive ── */
        @media (max-width: 960px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .right-col {
            justify-content: center !important;
            align-items: center !important;
          }
        }
        @media (max-width: 600px) {
          .stat-pills-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '9rem 2rem 5rem',
        /* Exact Aurora mesh gradient from the screenshot */
        background: `
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(180, 195, 255, 0.55) 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 90% 50%, rgba(0, 194, 255, 0.10) 0%, transparent 55%),
          radial-gradient(ellipse 40% 40% at 10% 80%, rgba(0, 214, 143, 0.07) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 75% 90%, rgba(167, 139, 250, 0.08) 0%, transparent 60%),
          #FBFEFF
        `,
      }}>

        {/* Decorative floating dots like in the screenshot */}
        {[
          { top: '18%', left: '12%', size: 6, opacity: 0.25 },
          { top: '32%', left: '5%', size: 4, opacity: 0.18 },
          { top: '65%', left: '8%', size: 5, opacity: 0.2 },
          { top: '15%', right: '8%', size: 5, opacity: 0.2 },
          { top: '45%', right: '5%', size: 4, opacity: 0.15 },
          { top: '72%', right: '10%', size: 6, opacity: 0.18 },
        ].map((dot, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: dot.top,
            left: dot.left,
            right: dot.right,
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            background: '#1A1F36',
            opacity: dot.opacity,
            pointerEvents: 'none',
          }} />
        ))}

        {/* ── Content Container ── */}
        <div className="hero-grid" style={{
          maxWidth: 1140,
          width: '100%',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* ─────────────── LEFT COLUMN ─────────────── */}
          <div style={{ textAlign: 'left' }}>

            {/* Pill tag */}
            <div className="hero-tag">
              <span>✨</span> IA + WhatsApp + Automatización
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              color: '#1A1F36',
              letterSpacing: '-0.04em',
              marginBottom: '1.4rem',
              margin: '0 0 1.4rem',
            }}>
              Tus ventas en WhatsApp,<br />
              <span style={{
                background: 'linear-gradient(135deg, #00D68F 0%, #00C2FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                automatizadas con IA.
              </span>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.7,
              color: '#64748B',
              fontWeight: 500,
              maxWidth: 490,
              marginBottom: '2.5rem',
            }}>
              Conecta tu equipo a un solo número de WhatsApp. Deja que nuestro
              Agente de IA califique clientes, responda preguntas y guarde datos
              directamente en tu CRM.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '4rem' }}>
              <Link to="/inversion" className="btn-primary">
                Prueba Gratis de 7 Días <ArrowRight size={16} />
              </Link>
              <Link to="/sistemas" className="btn-secondary">
                Ver Sistemas
              </Link>
            </div>

            {/* 4 Stat Pills */}
            <div className="stat-pills-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, auto)',
              gap: '10px',
              justifyContent: 'start',
            }}>

              <div className="stat-pill">
                <div style={{
                  width: 34, height: 34, borderRadius: '10px',
                  background: 'rgba(0, 214, 143, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Smile size={17} color="#00D68F" />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1A1F36', lineHeight: 1.2 }}>+98%</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8' }}>Satisfacción</div>
                </div>
              </div>

              <div className="stat-pill">
                <div style={{
                  width: 34, height: 34, borderRadius: '10px',
                  background: 'rgba(0, 194, 255, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Zap size={17} color="#00C2FF" />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1A1F36', lineHeight: 1.2 }}>24/7</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8' }}>Automatización</div>
                </div>
              </div>

              <div className="stat-pill">
                <div style={{
                  width: 34, height: 34, borderRadius: '10px',
                  background: 'rgba(0, 214, 143, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Briefcase size={17} color="#00D68F" />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1A1F36', lineHeight: 1.2 }}>+10K</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8' }}>Negocios</div>
                </div>
              </div>

              <div className="stat-pill">
                <div style={{
                  width: 34, height: 34, borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Brain size={17} color="#8B5CF6" />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1A1F36', lineHeight: 1.2 }}>IA Avanzada</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8' }}>Siempre Aprende</div>
                </div>
              </div>

            </div>
          </div>

          {/* ─────────────── RIGHT COLUMN ─────────────── */}
          <div className="right-col" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
            position: 'relative',
          }}>

            {/* ── Floating WhatsApp Badge (left of phone, overlapping) ── */}
            <div className="float-c" style={{
              position: 'absolute',
              left: '-10px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 32px rgba(37, 211, 102, 0.45)',
              }}>
                {/* WhatsApp SVG icon */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
            </div>

            {/* ── Phone Mockup ── */}
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div className="float-phone" style={{
                width: 255,
                height: 510,
                borderRadius: '36px',
                /* Light silver/gray frame like real iPhone in the screenshot */
                border: '8px solid #D1D5DB',
                background: '#FAFBFF',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 30px 70px -20px rgba(26, 31, 54, 0.18), 0 0 0 1px rgba(255,255,255,0.5)',
                position: 'relative',
              }}>

                {/* Status bar / notch area */}
                <div style={{
                  height: '28px',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  {/* Pill notch */}
                  <div style={{
                    width: 70,
                    height: 14,
                    borderRadius: '7px',
                    background: '#1A1F36',
                  }} />
                  {/* Signal icons right side */}
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}>
                    <div style={{ width: 12, height: 6, background: '#1A1F36', borderRadius: '2px', opacity: 0.7, fontSize: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                      ▐
                    </div>
                  </div>
                </div>

                {/* Chat Header — matching the screenshot: back arrow, avatar, name+status, menu */}
                <div style={{
                  background: '#FFFFFF',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: '1px solid #F0F4FF',
                  flexShrink: 0,
                }}>
                  {/* Back chevron */}
                  <ChevronLeft size={16} color="#1A1F36" strokeWidth={2.5} />

                  {/* Avatar */}
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00D68F, #00C2FF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>

                  {/* Name & status */}
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1A1F36', lineHeight: 1.2 }}>GeoChat IA</div>
                    <div style={{ fontSize: '0.58rem', color: '#00D68F', fontWeight: 600 }}>En línea</div>
                  </div>

                  {/* Menu dots */}
                  <MoreVertical size={14} color="#94A3B8" />
                </div>

                {/* ── Chat Messages ── */}
                <div style={{
                  flex: 1,
                  padding: '10px 8px',
                  background: '#F5F7FF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'hidden',
                }}>

                  {/* Client message (right) — turquoise/blue tint */}
                  <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(0,214,143,0.12), rgba(0,194,255,0.12))',
                      border: '1px solid rgba(0, 194, 255, 0.15)',
                      borderRadius: '14px 14px 3px 14px',
                      padding: '7px 10px',
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      color: '#1A1F36',
                      lineHeight: 1.45,
                      textAlign: 'left',
                    }}>
                      Hola, quiero más<br />información sobre los planes
                    </div>
                    {/* Time + read ticks */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '3px',
                      marginTop: '2px',
                    }}>
                      <span style={{ fontSize: '0.55rem', color: '#94A3B8' }}>10:00 AM</span>
                      {/* Double check ticks (blue = read) */}
                      <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                        <path d="M1 4L4 7L8 1" stroke="#00C2FF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 4L9 7L13 1" stroke="#00C2FF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* AI response (left) — white bubble */}
                  <div style={{ alignSelf: 'flex-start', maxWidth: '82%' }}>
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(26, 31, 54, 0.06)',
                      borderRadius: '14px 14px 14px 3px',
                      padding: '7px 10px',
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      color: '#1A1F36',
                      lineHeight: 1.45,
                      textAlign: 'left',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      ¡Hola! Claro, te envío<br />la información completa<br />de nuestros planes.
                    </div>
                    <div style={{ marginTop: '2px', paddingLeft: '2px' }}>
                      <span style={{ fontSize: '0.55rem', color: '#94A3B8' }}>10:30 AM</span>
                    </div>
                  </div>

                  {/* Typing indicator dots */}
                  <div style={{ alignSelf: 'flex-start' }}>
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(26, 31, 54, 0.06)',
                      borderRadius: '12px 12px 12px 3px',
                      padding: '8px 12px',
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      <span className="dot1" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00D68F', display: 'inline-block' }} />
                      <span className="dot2" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C2FF', display: 'inline-block' }} />
                      <span className="dot3" style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', display: 'inline-block' }} />
                    </div>
                  </div>

                </div>

                {/* ── Input Bar ── */}
                <div style={{
                  background: '#FFFFFF',
                  padding: '8px 10px',
                  borderTop: '1px solid #F0F4FF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}>
                  <div style={{
                    flex: 1,
                    background: '#F5F7FF',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '0.62rem',
                    color: '#CBD5E1',
                    fontWeight: 500,
                    textAlign: 'left',
                    border: '1px solid #EEF2FF',
                  }}>
                    Escribe tu mensaje...
                  </div>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00D68F, #00C2FF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 8px rgba(0,214,143,0.3)',
                    flexShrink: 0,
                  }}>
                    <ChevronRight size={13} color="#fff" strokeWidth={2.5} />
                  </div>
                </div>

              </div>
            </div>

            {/* ── Vertical stack of Floating Stat Cards (right of phone) ── */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 10,
            }}>

              {/* Card: Conversaciones */}
              <div className="stat-card float-a">
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>Conversaciones</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1F36', letterSpacing: '-0.03em' }}>+2,549</span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#00D68F',
                    background: 'rgba(0,214,143,0.08)',
                    padding: '1px 6px',
                    borderRadius: '100px',
                  }}>↑ 34%</span>
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#CBD5E1' }}>Este mes</div>
              </div>

              {/* Card: Ventas Generadas */}
              <div className="stat-card float-b">
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>Ventas Generadas</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1F36', letterSpacing: '-0.03em' }}>$45,680</span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#00D68F',
                    background: 'rgba(0,214,143,0.08)',
                    padding: '1px 6px',
                    borderRadius: '100px',
                  }}>↑ 27%</span>
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#CBD5E1' }}>Este mes</div>
              </div>

              {/* Card: Calificación de Leads */}
              <div className="stat-card float-c">
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>Calificación de Leads</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1F36', letterSpacing: '-0.03em', marginBottom: '6px' }}>98%</div>
                {/* Sparkline Chart — teal/green gradient line */}
                <svg width="100%" height="36" viewBox="0 0 140 36" fill="none" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00D68F" />
                      <stop offset="100%" stopColor="#00C2FF" />
                    </linearGradient>
                    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D68F" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#00C2FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d="M0 32 C20 30, 35 28, 55 20 C75 12, 95 8, 110 5 C120 4, 130 3, 140 2 L140 36 L0 36 Z"
                    fill="url(#fillGrad)"
                  />
                  {/* Line */}
                  <path
                    d="M0 32 C20 30, 35 28, 55 20 C75 12, 95 8, 110 5 C120 4, 130 3, 140 2"
                    stroke="url(#lineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* End dot */}
                  <circle cx="140" cy="2" r="3" fill="#00C2FF" />
                </svg>
              </div>

            </div>

          </div>
          {/* end right col */}

        </div>
        {/* end hero grid */}

      </section>
    </PublicLayout>
  );
}
