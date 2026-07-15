import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import PublicLayout from './PublicLayout';

const IconSmile = ({ color = "#00D68F" }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path></svg>;
const IconZap = ({ color = "#00C2FF" }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const IconBriefcase = ({ color = "#00D68F" }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>;
const IconBrain = ({ color = "#8B5CF6" }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path></svg>;
const WhatsAppLogoSVG = ({ size = 32, color = "#fff" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>;

export default function LandingPage() {
  return (
    <PublicLayout>
      <style>{`
        @keyframes floatSlow { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes floatMed { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(8px); } }
        .anim-float-1 { animation: floatSlow 6s ease-in-out infinite; }
        .anim-float-2 { animation: floatMed 7s ease-in-out infinite; }
        
        .btn-green {
          background: #00D68F; color: white; padding: 15px 32px; border-radius: 100px;
          font-weight: 700; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px;
          text-decoration: none; box-shadow: 0 10px 25px -5px rgba(0, 214, 143, 0.4); transition: all 0.3s ease;
        }
        .btn-green:hover {
          background: #00B686;
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -5px rgba(0, 214, 143, 0.5);
        }
        .btn-white {
          background: #FFFFFF; color: #0F172A; padding: 15px 32px; border-radius: 100px;
          font-weight: 700; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px;
          text-decoration: none; border: 1px solid #E2E8F0; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03); transition: all 0.3s ease;
        }
        .btn-white:hover {
          background: #F8FAFC;
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
        }
        .stat-pill {
          background: rgba(255, 255, 255, 0.65); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 20px;
          padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04);
          backdrop-filter: blur(10px);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px); border-radius: 24px; padding: 24px; 
          border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.05); width: 250px;
        }
        
        .glass-card-pilar {
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .glass-card-pilar:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.1);
          background: rgba(255, 255, 255, 0.75) !important;
          border-color: #00D68F !important;
        }

        .glass-card-feature {
          transition: all 0.3s ease;
        }
        .glass-card-feature:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.6) !important;
          border-color: #00D68F !important;
          box-shadow: 0 15px 30px rgba(15, 23, 42, 0.05);
        }
      `}</style>

      {/* ── SECCIÓN HERO CON FONDO DIRECTO ── */}
      <section style={{
        padding: '11rem 5% 6rem',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative'
      }}>

        <div style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '3rem', alignItems: 'center' }}>

          {/* ── LADO IZQUIERDO ── */}
          <div style={{ paddingRight: '1rem' }}>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0, 214, 143, 0.08)', border: '1px solid rgba(0, 214, 143, 0.2)', borderRadius: '100px', color: '#00A87B', fontSize: '0.85rem', fontWeight: 700, marginBottom: '2rem' }}>
              <span>⚡</span> IA + WhatsApp + Automatización
            </div>

            <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)', fontWeight: 900, lineHeight: 1.1, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 1.5rem' }}>
              Tus ventas en WhatsApp,<br />
              <span style={{ color: '#00D68F' }}>automatizadas</span> con IA.
            </h1>

            <p style={{ fontSize: '1.1rem', lineHeight: 1.65, color: '#475569', fontWeight: 500, maxWidth: '520px', margin: '0 0 3.5rem' }}>
              Conecta tu equipo a un solo número de WhatsApp. Deja que nuestro Agente de IA califique clientes, responda preguntas y guarde datos directamente en tu CRM.
            </p>

            <div style={{ display: 'flex', gap: '1.2rem', marginBottom: '4.5rem', flexWrap: 'wrap' }}>
              <Link to="/inversion" className="btn-green">Prueba Gratis de 7 Días <ArrowRight size={18} /></Link>
              <Link to="/sistemas" className="btn-white">Ver Sistemas</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.2rem' }}>
              <div className="stat-pill">
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconSmile /></div>
                <div><div style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.1rem' }}>+98%</div><div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>Satisfacción</div></div>
              </div>
              <div className="stat-pill">
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconZap /></div>
                <div><div style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.1rem' }}>24/7</div><div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>Automatización</div></div>
              </div>
              <div className="stat-pill">
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconBriefcase /></div>
                <div><div style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.1rem' }}>+10K</div><div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>Negocios</div></div>
              </div>
              <div className="stat-pill">
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconBrain /></div>
                <div><div style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.1rem' }}>IA Avanzada</div><div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>Siempre Aprende</div></div>
              </div>
            </div>
          </div>

          {/* ── LADO DERECHO (CON TARJETA DE CRISTAL DE FONDO) ── */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '2rem', 
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            borderRadius: '42px',
            padding: '2.5rem 2rem',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.02)'
          }}>

            {/* Logo WA Flotante en el Bisel */}
            <div className="anim-float-2" style={{
              position: 'absolute', 
              left: '-25px', 
              top: '25%', 
              zIndex: 10,
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', 
              width: '60px', 
              height: '60px', 
              borderRadius: '18px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 12px 24px rgba(37, 211, 102, 0.3)', 
              border: '3px solid #FFFFFF'
            }}>
              <WhatsAppLogoSVG size={30} />
            </div>

            {/* CELULAR - ARREGLADO CON BORDER SÓLIDO Y NOTCH */}
            <div className="anim-float-1" style={{
              width: '310px', 
              height: '620px',
              background: '#F8FAFC', 
              borderRadius: '45px', 
              border: '12px solid #FFFFFF', 
              boxShadow: '0 0 0 1px #E2E8F0, 0 30px 60px -15px rgba(15, 23, 42, 0.12)', 
              display: 'flex', 
              flexDirection: 'column', 
              position: 'relative', 
              flexShrink: 0, 
              overflow: 'hidden'
            }}>

              {/* Notch */}
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '110px', height: '20px', backgroundColor: '#FFFFFF', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px', zIndex: 5, boxShadow: '0 0 0 1px #F1F5F9' }} />

              {/* Status Bar Indicators (Time & icons) */}
              <div style={{ padding: '8px 24px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#1E293B', zIndex: 4 }}>
                <span>9:41</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22h20V2z"/></svg>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21l-12-12c5.5-5.5 14.5-5.5 20 0z"/></svg>
                  <svg width="12" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="18" height="16" rx="2"/><rect x="22" y="8" width="2" height="8"/></svg>
                </div>
              </div>

              {/* Header Chat */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '16px 16px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1 }}>
                <ChevronLeft size={18} color="#64748B" />
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#00D68F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WhatsAppLogoSVG size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.85rem' }}>GeoChat IA</div>
                  <div style={{ color: '#00D68F', fontSize: '0.7rem', fontWeight: 600 }}>En línea</div>
                </div>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </div>
              </div>

              {/* Área Mensajes */}
              <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ alignSelf: 'flex-end', maxWidth: '85%', padding: '10px 14px', background: '#ECFDF5', border: '1px solid rgba(0, 214, 143, 0.1)', borderRadius: '16px 16px 4px 16px', color: '#008460', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4 }}>
                  Hola, quiero más información sobre los planes
                  <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#00A87B', marginTop: '4px' }}>10:30 AM ✓✓</div>
                </div>
                <div style={{ alignSelf: 'flex-start', maxWidth: '85%', padding: '10px 14px', background: '#FFFFFF', borderRadius: '16px 16px 16px 4px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)', color: '#0F172A', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4 }}>
                  ¡Hola! Claro, te envío la información completa de nuestros planes.
                  <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#94A3B8', marginTop: '4px' }}>10:30 AM ✓✓</div>
                </div>
                {/* Typing bubble */}
                <div style={{ alignSelf: 'flex-start', padding: '10px 16px', background: '#FFFFFF', borderRadius: '16px 16px 16px 4px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8', display: 'inline-block', animation: 'pulse-soft 1s infinite alternate' }} />
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8', display: 'inline-block', animation: 'pulse-soft 1s infinite alternate', animationDelay: '0.2s' }} />
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8', display: 'inline-block', animation: 'pulse-soft 1s infinite alternate', animationDelay: '0.4s' }} />
                </div>
              </div>

              {/* Input Area */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '12px 16px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, background: '#F8FAFC', padding: '10px 16px', borderRadius: '100px', color: '#94A3B8', fontSize: '0.8rem', border: '1px solid #F1F5F9' }}>Escribe tu mensaje...</div>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#00D68F', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0, 214, 143, 0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </div>
              </div>
            </div>

            {/* ── TARJETAS DERECHA ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="glass-card anim-float-2">
                <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>Conversaciones</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>+2,549</div>
                  <div style={{ background: '#ECFDF5', color: '#10B981', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="18 15 12 9 6 15"/></svg> 34%
                  </div>
                </div>
                <div style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 500 }}>Este mes</div>
              </div>

              <div className="glass-card anim-float-1" style={{ animationDelay: '1s' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>Ventas Generadas</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>$45,680</div>
                  <div style={{ background: '#ECFDF5', color: '#10B981', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="18 15 12 9 6 15"/></svg> 27%
                  </div>
                </div>
                <div style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 500 }}>Este mes</div>
              </div>

              <div className="glass-card anim-float-2" style={{ paddingBottom: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>Calificación de Leads</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: '10px' }}>98%</div>
                <svg width="100%" height="60" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ display: 'block', margin: '0 -24px' }}>
                  <defs>
                    <linearGradient id="curveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#00D68F', stopOpacity: 0.25 }} />
                      <stop offset="100%" style={{ stopColor: '#00D68F', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  <path d="M0 35 C 20 15, 30 35, 50 18 C 70 8, 85 28, 100 12 L 100 40 L 0 40 Z" fill="url(#curveGrad)" />
                  <path d="M0 35 C 20 15, 30 35, 50 18 C 70 8, 85 28, 100 12" fill="none" stroke="#00D68F" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECCIÓN 2: PILARES DE VALOR ── */}
      <section style={{ padding: '6rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Todo lo que necesitas para vender más en un solo lugar
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Olvídate de malabarear con múltiples herramientas. Con GeoChat automatizas, escalas y gestionas tus ventas de inicio a fin.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Pilar 1 */}
            <div className="glass-card-pilar" style={{
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              padding: '2.5rem',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem'
            }}>
              <div style={{ width: 50, height: 50, borderRadius: '16px', background: 'rgba(0, 214, 143, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D68F' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>Agentes de IA Autónomos</h3>
              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Entrena a tu agente virtual para que atienda a tus clientes al instante. Califica prospectos, resuelve dudas sobre tus servicios y almacena datos clave automáticamente en tu pipeline.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="glass-card-pilar" style={{
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              padding: '2.5rem',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem'
            }}>
              <div style={{ width: 50, height: 50, borderRadius: '16px', background: 'rgba(0, 194, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C2FF' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>Constructor Visual de Flujos</h3>
              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Crea flujos de conversación interactivos y menús guiados arrastrando y soltando bloques. Configura respuestas automáticas y derivaciones inteligentes sin escribir una sola línea de código.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="glass-card-pilar" style={{
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              padding: '2.5rem',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem'
            }}>
              <div style={{ width: 50, height: 50, borderRadius: '16px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>Bandeja Multiagente Organizada</h3>
              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Conecta a todo tu equipo comercial a una sola línea de WhatsApp. Asigna conversaciones de manera automática o manual, añade etiquetas personalizadas y colabora internamente en tiempo real.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECCIÓN 3: CÓMO FUNCIONA ── */}
      <section style={{ padding: '6rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Pon a funcionar tu máquina de ventas en 3 pasos
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Sin complicaciones técnicas. Conectas, configuras y empiezas a recibir leads calificados de inmediato.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', position: 'relative' }}>
            
            {/* Paso 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #00D68F 0%, #00B686 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 900,
                boxShadow: '0 8px 20px rgba(0, 214, 143, 0.3)'
              }}>
                1
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Escanea y Conecta</h3>
              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Escanea el código QR desde tu celular para vincular tu WhatsApp Web con nuestra plataforma segura. No requiere procesos de aprobación complejos ni APIs externas.
              </p>
            </div>

            {/* Paso 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C2FF 0%, #0099FF 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 900,
                boxShadow: '0 8px 20px rgba(0, 194, 255, 0.3)'
              }}>
                2
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Personaliza tus Flujos e IA</h3>
              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Crea respuestas preestablecidas o activa a tus Agentes de IA. Enséñales tus catálogos, horarios de atención y objeciones comunes para que hablen tal como lo haría tu mejor vendedor.
              </p>
            </div>

            {/* Paso 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 900,
                boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)'
              }}>
                3
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Vende en Piloto Automático</h3>
              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Tus clientes son atendidos al instante. Los leads interesados se califican y se guardan automáticamente en tu CRM Kanban, listos para que tu equipo los cierre con un clic.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECCIÓN 4: CARACTERÍSTICAS DE ÉLITE ── */}
      <section style={{ padding: '6rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Funcionalidades potentes diseñadas para vender
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Cada herramienta está optimizada para que tu flujo de trabajo sea impecable y tu tasa de conversión aumente.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            
            {/* Feature 1 */}
            <div className="glass-card-feature" style={{
              background: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '20px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ color: '#00D68F' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Embudo CRM Kanban</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, fontWeight: 500 }}>
                Visualiza el estado de tus clientes y arrástralos por tus fases de venta (Pipeline) para que ningún prospecto se pierda en el camino.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card-feature" style={{
              background: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '20px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ color: '#00C2FF' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Envíos Masivos e Inteligentes</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, fontWeight: 500 }}>
                Envía campañas y mensajes masivos a tus listas segmentadas de forma segura y controlada para proteger tu número de bloqueos.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card-feature" style={{
              background: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '20px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ color: '#8B5CF6' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Generador Whalink</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, fontWeight: 500 }}>
                Crea enlaces personalizados con mensajes predeterminados para tus anuncios y mide qué campañas te traen más clientes.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card-feature" style={{
              background: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '20px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ color: '#F59E0B' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Métricas y Reportes</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, fontWeight: 500 }}>
                Conoce la velocidad de atención, cantidad de conversaciones diarias y el desempeño individual de cada agente de ventas.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECCIÓN 5: LLAMADO A LA ACCIÓN FINAL ── */}
      <section style={{ padding: '6rem 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.5) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            borderRadius: '32px',
            padding: '4rem 3rem',
            textAlign: 'center',
            boxShadow: '0 30px 60px -20px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2rem'
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0, 214, 143, 0.08)', border: '1px solid rgba(0, 214, 143, 0.2)', borderRadius: '100px', color: '#00A87B', fontSize: '0.85rem', fontWeight: 700
            }}>
              <span>📈</span> Multiplica tus Resultados
            </div>
            
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '700px' }}>
              ¿Listo para transformar la forma en que vendes por WhatsApp?
            </h2>
            
            <p style={{ fontSize: '1.1rem', color: '#475569', fontWeight: 500, maxWidth: '600px', lineHeight: 1.6 }}>
              Únete a las empresas que ya utilizan GeoChat para automatizar su atención, organizar su equipo y disparar sus ingresos.
            </p>

            <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
              <Link to="/inversion" className="btn-green">Comenzar Prueba Gratis de 7 Días <ArrowRight size={18} /></Link>
            </div>
          </div>

        </div>
      </section>
    </PublicLayout>
  );
}