import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smile, Zap, Briefcase, Brain, ChevronRight, ChevronLeft, MoreVertical } from 'lucide-react';
import PublicLayout from './PublicLayout';

export default function LandingPage() {
  return (
    <PublicLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900&display=swap');

        /* ══ Keyframe Animations ══ */
        @keyframes floatA {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-9px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(7px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-6px) translateX(4px); }
        }
        @keyframes floatPhone {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes blink1 {
          0%, 100% { opacity: 0.25; transform: scale(0.75); }
          30% { opacity: 1; transform: scale(1); }
        }
        @keyframes blink2 {
          0%, 30%, 100% { opacity: 0.25; transform: scale(0.75); }
          60% { opacity: 1; transform: scale(1); }
        }
        @keyframes blink3 {
          0%, 60%, 100% { opacity: 0.25; transform: scale(0.75); }
          90% { opacity: 1; transform: scale(1); }
        }

        .fa { animation: floatA 5.5s ease-in-out infinite; }
        .fb { animation: floatB 7s ease-in-out infinite; }
        .fc { animation: floatC 8.5s ease-in-out infinite; }
        .fp { animation: floatPhone 9s ease-in-out infinite; }
        .b1 { animation: blink1 1.5s ease-in-out infinite; }
        .b2 { animation: blink2 1.5s ease-in-out infinite; }
        .b3 { animation: blink3 1.5s ease-in-out infinite; }

        /* Pill tag */
        .hero-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 14px;
          border-radius: 100px;
          border: 1px solid rgba(0, 214, 143, 0.22);
          background: rgba(0, 214, 143, 0.05);
          color: #009e68;
          font-size: 0.78rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          letter-spacing: 0.005em;
          white-space: nowrap;
        }

        /* Primary button */
        .cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 26px;
          border-radius: 100px;
          background: linear-gradient(135deg, #00D68F 0%, #00B8D9 100%);
          color: #fff;
          font-weight: 800;
          font-size: 0.88rem;
          text-decoration: none;
          box-shadow: 0 5px 20px rgba(0, 214, 143, 0.28);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          border: none;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
        }
        .cta-primary:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 28px rgba(0, 194, 255, 0.38);
        }

        /* Secondary button - plain text */
        .cta-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 13px 22px;
          border-radius: 100px;
          background: transparent;
          color: #1A1F36;
          font-weight: 700;
          font-size: 0.88rem;
          text-decoration: none;
          transition: all 0.22s ease;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
        }
        .cta-secondary:hover {
          color: #00D68F;
        }

        /* Bottom stat pills */
        .stat-row-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 15px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.80);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(229, 231, 235, 0.65);
          box-shadow: 0 2px 12px rgba(26, 31, 54, 0.03);
          transition: all 0.22s ease;
        }
        .stat-row-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(26, 31, 54, 0.05);
        }

        /* Floating stat cards */
        .float-card {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border: 1px solid rgba(229, 231, 235, 0.60);
          border-radius: 18px;
          padding: 15px 18px;
          box-shadow: 0 6px 28px rgba(26, 31, 54, 0.07);
          text-align: left;
          min-width: 168px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-section-grid {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
          }
          .right-section {
            justify-content: center !important;
          }
          .phone-badge-group {
            justify-content: center !important;
          }
        }
        @media (max-width: 640px) {
          .bottom-pills-row {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════
          HERO SECTION  
      ═══════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        paddingTop: '6rem',
        paddingBottom: '4rem',
        paddingLeft: '2rem',
        paddingRight: '2rem',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        /* Aurora gradient — strong lavender at top-center exactly like reference */
        background: `
          radial-gradient(ellipse 100% 70% at 50% -8%, rgba(200, 215, 255, 0.75) 0%, rgba(180, 200, 255, 0.35) 40%, transparent 68%),
          radial-gradient(ellipse 55% 50% at 88% 42%, rgba(0, 194, 255, 0.08) 0%, transparent 55%),
          radial-gradient(ellipse 40% 40% at 12% 72%, rgba(0, 214, 143, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse 55% 45% at 72% 95%, rgba(150, 120, 255, 0.06) 0%, transparent 60%),
          #FBFEFF
        `,
      }}>

        {/* Floating decorative dots */}
        {[
          { top: '17%', left: '9%',  s: 5,  o: 0.22 },
          { top: '34%', left: '4%',  s: 4,  o: 0.16 },
          { top: '60%', left: '7%',  s: 6,  o: 0.18 },
          { top: '80%', left: '12%', s: 4,  o: 0.12 },
          { top: '13%', right: '6%', s: 5,  o: 0.18 },
          { top: '42%', right: '3%', s: 4,  o: 0.13 },
          { top: '70%', right: '8%', s: 6,  o: 0.16 },
        ].map((d, i) => (
          <div key={i} style={{
            position: 'absolute', top: d.top, left: d.left, right: d.right,
            width: d.s, height: d.s, borderRadius: '50%',
            background: '#8B9AB5', opacity: d.o, pointerEvents: 'none',
          }}/>
        ))}

        {/* Main content container */}
        <div className="hero-section-grid" style={{
          maxWidth: 1160,
          width: '100%',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: '2.5rem',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* ──────────── LEFT COLUMN ──────────── */}
          <div style={{ textAlign: 'left' }}>

            {/* Pill tag */}
            <div className="hero-pill-tag">
              <span style={{ fontSize: '0.8rem' }}>✨</span>
              IA + WhatsApp + Automatización
            </div>

            {/* H1 */}
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(2.1rem, 4.2vw, 3.5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              color: '#0F172A',
              letterSpacing: '-0.04em',
              margin: '0 0 1.25rem',
            }}>
              Tus ventas en WhatsApp,<br />
              <span style={{
                background: 'linear-gradient(100deg, #00D68F 0%, #00C2FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                automatizadas con IA.
              </span>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '1.02rem',
              lineHeight: 1.72,
              color: '#5A677D',
              fontWeight: 500,
              maxWidth: 460,
              margin: '0 0 2.25rem',
            }}>
              Conecta tu equipo a un solo número de WhatsApp. Deja que nuestro Agente de IA califique clientes, responda preguntas y guarde datos directamente en tu CRM.
            </p>

            {/* CTA Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              marginBottom: '3.5rem',
            }}>
              <Link to="/inversion" className="cta-primary">
                Prueba Gratis de 7 Días <ArrowRight size={15} />
              </Link>
              <Link to="/sistemas" className="cta-secondary">
                Ver Sistemas
              </Link>
            </div>

            {/* ── 4 Stat pills row ── */}
            <div className="bottom-pills-row" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
            }}>

              {/* +98% Satisfacción */}
              <div className="stat-row-pill">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Smile size={19} color="#00D68F" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, fontFamily: 'inherit' }}>+98%</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', fontFamily: 'inherit' }}>Satisfacción</div>
                </div>
              </div>

              {/* 24/7 Automatización */}
              <div className="stat-row-pill">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Zap size={19} color="#00C2FF" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, fontFamily: 'inherit' }}>24/7</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', fontFamily: 'inherit' }}>Automatización</div>
                </div>
              </div>

              {/* +10K Negocios */}
              <div className="stat-row-pill">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Briefcase size={18} color="#00D68F" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, fontFamily: 'inherit' }}>+10K</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', fontFamily: 'inherit' }}>Negocios</div>
                </div>
              </div>

              {/* IA Avanzada */}
              <div className="stat-row-pill">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Brain size={19} color="#8B5CF6" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, fontFamily: 'inherit' }}>IA Avanzada</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', fontFamily: 'inherit' }}>Siempre Aprende</div>
                </div>
              </div>

            </div>
          </div>

          {/* ──────────── RIGHT COLUMN ──────────── */}
          {/* Horizontal layout: [WA Badge gap] [Phone] [gap] [Stat Cards] */}
          <div className="right-section" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '18px',
            position: 'relative',
          }}>

            {/* ── WhatsApp Badge group (absolute, floating left of phone) ── */}
            {/* We use a relative wrapper for phone + badge together */}
            <div style={{ position: 'relative', flexShrink: 0 }}>

              {/* WhatsApp Badge — floats to the LEFT of the phone */}
              <div className="fc" style={{
                position: 'absolute',
                /* Position it to the LEFT, centered vertically at 38% from top */
                left: '-74px',
                top: '38%',
                transform: 'translateY(-50%)',
                zIndex: 20,
              }}>
                <div style={{
                  width: 62,
                  height: 62,
                  borderRadius: '18px',
                  background: 'linear-gradient(145deg, #2DD36F 0%, #25D366 55%, #128C7E 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 14px 38px rgba(37, 211, 102, 0.52), 0 3px 10px rgba(37, 211, 102, 0.22)',
                }}>
                  {/* Official WhatsApp logo path */}
                  <svg width="33" height="33" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
              </div>

              {/* ── Phone Mockup ── */}
              <div className="fp" style={{
                width: 252,
                height: 504,
                borderRadius: '38px',
                /* Very thin light-gray frame like in reference screenshot */
                border: '6px solid #C8CDD6',
                background: '#F8FAFF',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 32px 72px -18px rgba(26, 31, 54, 0.16), 0 8px 24px -8px rgba(26, 31, 54, 0.06), 0 0 0 1px rgba(200, 210, 230, 0.3)',
                position: 'relative',
              }}>

                {/* ── Status bar ── */}
                <div style={{
                  height: 26,
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  flexShrink: 0,
                  position: 'relative',
                }}>
                  {/* Time on left */}
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#1A1F36', fontFamily: 'inherit' }}>9:41</span>
                  {/* Pill notch in center */}
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 68,
                    height: 14,
                    borderRadius: '7px',
                    background: '#1A1F36',
                  }}/>
                  {/* Icons on right */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {/* Signal bars */}
                    <svg width="13" height="9" viewBox="0 0 13 9">
                      <rect x="0" y="6" width="2.5" height="3" rx="0.5" fill="#1A1F36" opacity="0.7"/>
                      <rect x="3.5" y="4" width="2.5" height="5" rx="0.5" fill="#1A1F36" opacity="0.7"/>
                      <rect x="7" y="2" width="2.5" height="7" rx="0.5" fill="#1A1F36" opacity="0.7"/>
                      <rect x="10.5" y="0" width="2.5" height="9" rx="0.5" fill="#1A1F36" opacity="0.7"/>
                    </svg>
                    {/* Battery */}
                    <svg width="17" height="9" viewBox="0 0 17 9">
                      <rect x="0" y="1" width="14" height="7" rx="1.5" stroke="#1A1F36" strokeWidth="1" fill="none" opacity="0.7"/>
                      <rect x="14.5" y="3" width="2" height="3" rx="0.5" fill="#1A1F36" opacity="0.7"/>
                      <rect x="1.2" y="2.2" width="8" height="4.6" rx="0.7" fill="#1A1F36" opacity="0.7"/>
                    </svg>
                  </div>
                </div>

                {/* ── Chat Header ── */}
                <div style={{
                  background: '#FFFFFF',
                  padding: '6px 10px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  borderBottom: '1px solid #F1F5FF',
                  flexShrink: 0,
                }}>
                  <ChevronLeft size={15} color="#0F172A" strokeWidth={2.5} style={{ flexShrink: 0 }}/>
                  {/* Avatar with WhatsApp icon */}
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00D68F, #00C2FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0F172A', fontFamily: 'inherit', lineHeight: 1.2 }}>GeoChat IA</div>
                    <div style={{ fontSize: '0.57rem', color: '#00D68F', fontWeight: 700, fontFamily: 'inherit' }}>En línea</div>
                  </div>
                  <MoreVertical size={13} color="#94A3B8" style={{ flexShrink: 0 }}/>
                </div>

                {/* ── Messages area ── */}
                <div style={{
                  flex: 1,
                  padding: '10px 9px',
                  background: '#F0F4FF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '9px',
                  overflowY: 'hidden',
                }}>

                  {/* Client bubble — right side, turquoise */}
                  <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(0, 214, 143, 0.14), rgba(0, 194, 255, 0.16))',
                      border: '1px solid rgba(0, 194, 255, 0.18)',
                      borderRadius: '14px 14px 4px 14px',
                      padding: '7px 10px 5px',
                      textAlign: 'left',
                    }}>
                      <p style={{ fontSize: '0.64rem', fontWeight: 600, color: '#0F172A', lineHeight: 1.45, margin: 0, fontFamily: 'inherit' }}>
                        Hola, quiero más<br/>información sobre los planes
                      </p>
                      {/* Time + ticks */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                        <span style={{ fontSize: '0.52rem', color: '#94A3B8', fontFamily: 'inherit' }}>10:00 AM</span>
                        <svg width="15" height="8" viewBox="0 0 15 8" fill="none">
                          <path d="M1 4L3.5 6.5L7.5 1" stroke="#00C2FF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 4L9.5 6.5L13.5 1" stroke="#00C2FF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* AI bubble — left side, white */}
                  <div style={{ alignSelf: 'flex-start', maxWidth: '82%' }}>
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(26, 31, 54, 0.05)',
                      borderRadius: '14px 14px 14px 4px',
                      padding: '7px 10px 5px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      textAlign: 'left',
                    }}>
                      <p style={{ fontSize: '0.64rem', fontWeight: 600, color: '#0F172A', lineHeight: 1.45, margin: 0, fontFamily: 'inherit' }}>
                        ¡Hola! Claro, te envío<br/>la información completa<br/>de nuestros planes.
                      </p>
                      <div style={{ marginTop: '3px' }}>
                        <span style={{ fontSize: '0.52rem', color: '#94A3B8', fontFamily: 'inherit' }}>10:30 AM</span>
                        {/* Single gray tick */}
                        <svg width="9" height="6" viewBox="0 0 9 6" style={{ marginLeft: '3px' }}>
                          <path d="M1 3L3 5L8 1" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Typing dots */}
                  <div style={{ alignSelf: 'flex-start' }}>
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(26, 31, 54, 0.05)',
                      borderRadius: '12px 12px 12px 4px',
                      padding: '8px 12px',
                      display: 'inline-flex',
                      gap: '4px',
                      alignItems: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    }}>
                      <span className="b1" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00D68F', display: 'inline-block' }}/>
                      <span className="b2" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C2FF', display: 'inline-block' }}/>
                      <span className="b3" style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', display: 'inline-block' }}/>
                    </div>
                  </div>

                </div>

                {/* ── Input bar ── */}
                <div style={{
                  background: '#FFFFFF',
                  padding: '7px 10px',
                  borderTop: '1px solid #F1F5FF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}>
                  <div style={{
                    flex: 1,
                    background: '#F5F7FF',
                    border: '1px solid #EEF2FF',
                    borderRadius: '20px',
                    padding: '6px 11px',
                    fontSize: '0.6rem',
                    color: '#C0C8D8',
                    fontWeight: 500,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}>
                    Escribe tu mensaje...
                  </div>
                  <div style={{
                    width: 27, height: 27,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00D68F, #00C2FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 3px 10px rgba(0, 214, 143, 0.35)',
                    flexShrink: 0,
                  }}>
                    <ChevronRight size={14} color="#fff" strokeWidth={2.5}/>
                  </div>
                </div>

              </div>
              {/* end phone */}

            </div>
            {/* end phone + badge wrapper */}

            {/* ── Stat Cards Column (right of phone) ── */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '11px',
              flexShrink: 0,
            }}>

              {/* Card 1: Conversaciones */}
              <div className="float-card fa">
                <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#94A3B8', marginBottom: '5px', fontFamily: 'inherit' }}>Conversaciones</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '1.28rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.035em', fontFamily: 'inherit' }}>+2,549</span>
                  <span style={{
                    fontSize: '0.64rem', fontWeight: 700, color: '#00C67A',
                    background: 'rgba(0, 198, 122, 0.08)',
                    padding: '2px 7px', borderRadius: '100px', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: '2px',
                  }}>↑ 34%</span>
                </div>
                <div style={{ fontSize: '0.61rem', fontWeight: 500, color: '#C0C8D8', fontFamily: 'inherit' }}>Este mes</div>
              </div>

              {/* Card 2: Ventas Generadas */}
              <div className="float-card fb">
                <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#94A3B8', marginBottom: '5px', fontFamily: 'inherit' }}>Ventas Generadas</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '1.28rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.035em', fontFamily: 'inherit' }}>$45,680</span>
                  <span style={{
                    fontSize: '0.64rem', fontWeight: 700, color: '#00C67A',
                    background: 'rgba(0, 198, 122, 0.08)',
                    padding: '2px 7px', borderRadius: '100px', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: '2px',
                  }}>↑ 27%</span>
                </div>
                <div style={{ fontSize: '0.61rem', fontWeight: 500, color: '#C0C8D8', fontFamily: 'inherit' }}>Este mes</div>
              </div>

              {/* Card 3: Calificación de Leads */}
              <div className="float-card fc">
                <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#94A3B8', marginBottom: '5px', fontFamily: 'inherit' }}>Calificación de Leads</div>
                <div style={{ fontSize: '1.28rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.035em', marginBottom: '8px', fontFamily: 'inherit' }}>98%</div>

                {/* Sparkline area chart */}
                <svg width="100%" height="40" viewBox="0 0 148 40" fill="none" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sl-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00D68F"/>
                      <stop offset="100%" stopColor="#00C2FF"/>
                    </linearGradient>
                    <linearGradient id="sl-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D68F" stopOpacity="0.20"/>
                      <stop offset="100%" stopColor="#00C2FF" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d="M0 36 C18 34, 32 32, 52 26 C72 20, 88 16, 104 10 C116 6, 130 4, 148 2 L148 40 L0 40 Z"
                    fill="url(#sl-fill)"
                  />
                  {/* Line */}
                  <path
                    d="M0 36 C18 34, 32 32, 52 26 C72 20, 88 16, 104 10 C116 6, 130 4, 148 2"
                    stroke="url(#sl-line)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* End dot */}
                  <circle cx="148" cy="2" r="3.5" fill="#00C2FF"/>
                  <circle cx="148" cy="2" r="2" fill="#fff"/>
                </svg>
              </div>

            </div>
            {/* end stat cards */}

          </div>
          {/* end right column */}

        </div>
        {/* end grid */}

      </section>

    </PublicLayout>
  );
}
