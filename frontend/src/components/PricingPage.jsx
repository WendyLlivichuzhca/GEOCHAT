import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, ChevronDown, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicLayout from './PublicLayout';

const PLANS = {
  monthly: [
    {
      name: 'Plan Starter',
      price: 49,
      desc: 'Ideal para emprendedores que quieren iniciar con WhatsApp profesional.',
      features: [
        'Hasta 3,500 Contactos Activos Mensuales (MAC)',
        'Base de datos ilimitada en el CRM',
        '1 Número de WhatsApp Business',
        '1 número WhatsApp Cloud API',
        '1 acceso multiagente',
        'Agentes IA ilimitados',
        'Objetivos Agentes IA: FAQ',
        'Base de conocimiento: 1 MB por agente',
        'Automatizaciones ilimitadas',
        '✕ Automatizaciones con IA',
        'Envíos Masivos ilimitados',
        'Grupos y Comunidades ilimitados',
        'Gestión de grupos y comunidades',
        '✕ Funciones IA de Grupos y Comunidades',
        'SOPORTE STANDARD',
        'Sesión Inicial INCLUIDA $100 USD',
        'Chat y WhatsApp – lunes a domingo y festivos',
        'Reuniones en Zoom y Meet diarias',
        '✕ Grupo de Soporte Personalizado',
        '✕ Key Account Manager',
        '✕ 3 Sesiones Personalizadas'
      ],
      btn: 'PRUEBA 7 DÍAS GRATIS',
      color: '#00D68F',
      link: 'https://pay.hotmart.com/R106596298C?off=pd4r0i5v',
      styleType: 'starter'
    },
    {
      name: 'Plan Growth',
      price: 99,
      desc: 'Ideal para negocios con equipos de trabajo que priorizan su atención al cliente por WhatsApp.',
      features: [
        'Hasta 8,000 Contactos Activos Mensuales (MAC)',
        'Base de datos ilimitada en el CRM',
        '2 Números de WhatsApp Business',
        '1 número WhatsApp Cloud API',
        '3 accesos multiagente',
        'Agentes IA ilimitados',
        'Objetivos Agentes IA: FAQ',
        'Base de conocimiento: 10 MB por agente',
        'Automatizaciones ilimitadas',
        '✕ Automatizaciones con IA',
        'Envíos Masivos ilimitados',
        'Grupos y Comunidades ilimitados',
        'Gestión de grupos y comunidades',
        '✕ Funciones IA de Grupos y Comunidades',
        'SOPORTE STANDARD',
        'Sesión Inicial INCLUIDA $100 USD',
        'Chat y WhatsApp – lunes a domingo y festivos',
        'Reuniones en Zoom y Meet diarias',
        '✕ Grupo de Soporte Personalizado',
        '✕ Key Account Manager',
        '✕ 3 Sesiones Personalizadas'
      ],
      btn: 'Adquirir Plan',
      color: '#00D68F',
      link: 'https://pay.hotmart.com/R106596298C?off=64u6unlw',
      styleType: 'growth'
    },
    {
      name: 'Plan Advanced',
      price: 199,
      desc: 'Ideal para negocios con equipos de trabajo que requieren integraciones adicionales, funciones avanzadas y soporte premium.',
      features: [
        'Hasta 30,000 Contactos Activos Mensuales (MAC)',
        'Base de datos ilimitada en el CRM',
        '3 Números de WhatsApp Business',
        '1 número WhatsApp Cloud API',
        '5 accesos multiagente',
        'Agentes IA ilimitados',
        'Objetivos Agentes IA: TODOS',
        'Base de conocimiento ilimitada por agente',
        'Automatizaciones ilimitadas',
        'Automatizaciones con IA',
        'Envíos Masivos ilimitados',
        'Grupos y Comunidades ilimitados',
        'Gestión de grupos y comunidades',
        'Funciones IA de Grupos y Comunidades',
        'SOPORTE PREMIUM',
        'Sesión Inicial INCLUIDA $100 USD',
        'Chat y WhatsApp – lunes a domingo y festivos',
        'Reuniones en Zoom y Meet diarias',
        'Grupo de Soporte Personalizado',
        'Key Account Manager',
        '✕ 3 Sesiones Personalizadas'
      ],
      btn: 'Adquirir Plan',
      color: '#00D68F',
      link: 'https://pay.hotmart.com/R106596298C?off=lm0y2fn6',
      styleType: 'advanced'
    },
    {
      name: 'Personalizado',
      price: 'A convenir',
      desc: 'Soluciones personalizadas para negocios con grandes equipos de trabajo que requieren más, para escalar aún más.',
      features: [
        'Todas las características del Plan Advanced incluidas',
        'Planes Semestrales y Anuales',
        'Consultorías Personalizadas 1 a 1',
        'Sesiones de Activación Rápida (Setup Completo)',
        'Configuración completa con Integraciones'
      ],
      btn: 'Contactarme con ventas',
      color: '#00D68F',
      link: 'https://wa.me/593986130956?text=Hola!%20Quiero%20saber%20más%20información%20sobre%20el%20Plan%20Personalizado%20a%20medida%20de%20GeoChat.',
      styleType: 'custom'
    }
  ],
  annual: [
    {
      name: 'Plan Starter',
      price: 41,
      desc: 'Ideal para emprendedores que quieren iniciar con WhatsApp profesional.',
      features: [
        'Hasta 3,500 Contactos Activos Mensuales (MAC)',
        'Base de datos ilimitada en el CRM',
        '1 Número de WhatsApp Business',
        '1 número WhatsApp Cloud API',
        '1 acceso multiagente',
        'Agentes IA ilimitados',
        'Objetivos Agentes IA: FAQ',
        'Base de conocimiento: 1 MB por agente',
        'Automatizaciones ilimitadas',
        '✕ Automatizaciones con IA',
        'Envíos Masivos ilimitados',
        'Grupos y Comunidades ilimitados',
        'Gestión de grupos y comunidades',
        '✕ Funciones IA de Grupos y Comunidades',
        'SOPORTE STANDARD',
        'Sesión Inicial INCLUIDA $100 USD',
        'Chat y WhatsApp – lunes a domingo y festivos',
        'Reuniones en Zoom y Meet diarias',
        '✕ Grupo de Soporte Personalizado',
        '✕ Key Account Manager',
        '✕ 3 Sesiones Personalizadas'
      ],
      btn: 'PRUEBA 7 DÍAS GRATIS',
      color: '#00D68F',
      link: 'https://pay.hotmart.com/R106596298C?off=dgd5b1no',
      styleType: 'starter'
    },
    {
      name: 'Plan Growth',
      price: 83,
      desc: 'Ideal para negocios con equipos de trabajo que priorizan su atención al cliente por WhatsApp.',
      features: [
        'Hasta 8,000 Contactos Activos Mensuales (MAC)',
        'Base de datos ilimitada en el CRM',
        '2 Números de WhatsApp Business',
        '1 número WhatsApp Cloud API',
        '3 accesos multiagente',
        'Agentes IA ilimitados',
        'Objetivos Agentes IA: FAQ',
        'Base de conocimiento: 10 MB por agente',
        'Automatizaciones ilimitadas',
        '✕ Automatizaciones con IA',
        'Envíos Masivos ilimitados',
        'Grupos y Comunidades ilimitados',
        'Gestión de grupos y comunidades',
        '✕ Funciones IA de Grupos y Comunidades',
        'SOPORTE STANDARD',
        'Sesión Inicial INCLUIDA $100 USD',
        'Chat y WhatsApp – lunes a domingo y festivos',
        'Reuniones en Zoom y Meet diarias',
        '✕ Grupo de Soporte Personalizado',
        '✕ Key Account Manager',
        '✕ 3 Sesiones Personalizadas'
      ],
      btn: 'Adquirir Plan',
      color: '#00D68F',
      link: 'https://pay.hotmart.com/R106596298C?off=3gmrcrs9',
      styleType: 'growth'
    },
    {
      name: 'Plan Advanced',
      price: 166,
      desc: 'Ideal para negocios con equipos de trabajo que requieren integraciones adicionales, funciones avanzadas y soporte premium.',
      features: [
        'Hasta 30,000 Contactos Activos Mensuales (MAC)',
        'Base de datos ilimitada en el CRM',
        '3 Números de WhatsApp Business',
        '1 número WhatsApp Cloud API',
        '5 accesos multiagente',
        'Agentes IA ilimitados',
        'Objetivos Agentes IA: TODOS',
        'Base de conocimiento ilimitada por agente',
        'Automatizaciones ilimitadas',
        'Automatizaciones con IA',
        'Envíos Masivos ilimitados',
        'Grupos y Comunidades ilimitados',
        'Gestión de grupos y comunidades',
        'Funciones IA de Grupos y Comunidades',
        'SOPORTE PREMIUM',
        'Sesión Inicial INCLUIDA $100 USD',
        'Chat y WhatsApp – lunes a domingo y festivos',
        'Reuniones en Zoom y Meet diarias',
        'Grupo de Soporte Personalizado',
        'Key Account Manager',
        '✕ 3 Sesiones Personalizadas'
      ],
      btn: 'Adquirir Plan',
      color: '#00D68F',
      link: 'https://pay.hotmart.com/R106596298C?off=nvqrsqom',
      styleType: 'advanced'
    },
    {
      name: 'Personalizado',
      price: 'A convenir',
      desc: 'Soluciones personalizadas para negocios con grandes equipos de trabajo que requieren más, para escalar aún más.',
      features: [
        'Todas las características del Plan Advanced incluidas',
        'Planes Semestrales y Anuales',
        'Consultorías Personalizadas 1 a 1',
        'Sesiones de Activación Rápida (Setup Completo)',
        'Configuración completa con Integraciones'
      ],
      btn: 'Contactarme con ventas',
      color: '#00D68F',
      link: 'https://wa.me/593986130956?text=Hola!%20Quiero%20saber%20más%20información%20sobre%20el%20Plan%20Personalizado%20a%20medida%20de%20GeoChat.',
      styleType: 'custom'
    }
  ],
};

const FAQS = [
  { q: '¿Hay permanencia mínima?', a: 'No. Puedes cancelar tu suscripción en cualquier momento sin penalizaciones ni contratos a largo plazo.' },
  { q: '¿Cómo recibo soporte técnico?', a: 'Según tu plan: chat de soporte prioritario, canales dedicados de WhatsApp, correo, o un Key Account Manager dedicado 24/7.' },
  { q: '¿Puedo cambiar de plan cuando lo necesite?', a: 'Sí, totalmente. Puedes hacer un upgrade o downgrade en cualquier momento desde tu panel. El cargo se prorrateará en tu siguiente facturación.' },
  { q: '¿Ofrecen garantía de devolución?', a: 'Sí. Contamos con una garantía de satisfacción total de 15 días. Si el producto no es lo que esperabas, te reembolsamos tu dinero al 100%.' },
];

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: .1 } } };

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const plans = PLANS[billing];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <PublicLayout>
      <style>{`
        .btn-price-action {
          width: 100%; padding: 12px 24px; border-radius: 100px; font-weight: 800;
          font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;
          text-align: center; display: block; text-decoration: none; transition: all 0.3s ease;
        }
        .btn-price-green {
          background: #00D68F; color: white; border: none;
          box-shadow: 0 8px 20px -4px rgba(0, 214, 143, 0.35);
        }
        .btn-price-green:hover {
          background: #00B686;
          transform: translateY(-2px);
          box-shadow: 0 10px 24px -4px rgba(0, 214, 143, 0.45);
        }
        .btn-price-outline {
          background: transparent; color: #00D68F; border: 2px solid #00D68F;
        }
        .btn-price-outline:hover {
          background: #00D68F; color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(0, 214, 143, 0.35);
        }
        .glass-pricing-card {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.75);
          border-radius: 32px;
          padding: 2.2rem 2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .glass-pricing-card:hover {
          transform: translateY(-6px);
          background: rgba(255, 255, 255, 0.75);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
        }
        .glass-pricing-card-featured {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(20px);
          border: 2px solid #00D68F;
          border-radius: 32px;
          padding: 2.2rem 2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px -10px rgba(0, 214, 143, 0.12);
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .glass-pricing-card-featured:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 24px 48px -10px rgba(0, 214, 143, 0.22);
        }
        .faq-pricing-card {
          background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 20px; overflow: hidden; transition: all 0.3s ease;
        }
        .faq-pricing-card:hover {
          background: rgba(255, 255, 255, 0.65);
          border-color: #00D68F;
        }
        .features-list::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* ── 1. HÉROE COMERCIAL ── */}
      <section style={{ padding: '11rem 5% 4rem', position: 'relative', textAlign: 'center' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0, 214, 143, 0.08)', border: '1px solid rgba(0, 214, 143, 0.2)', borderRadius: '100px', color: '#00A87B', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <span>💰</span> Inversión Inteligente
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)', fontWeight: 900, lineHeight: 1.1, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 1.5rem' }}>
            Planes diseñados para<br />
            <span style={{ color: '#00D68F' }}>escalar tus ventas.</span>
          </h1>

          <p style={{ fontSize: '1.15rem', color: '#475569', fontWeight: 500, maxWidth: '650px', margin: '0 auto 3rem' }}>
            Elige la escala ideal para tu equipo. Cambia de plan o cancela en cualquier momento con un solo clic.
          </p>

          {/* Billing Switch */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.45)', border: '1px solid rgba(255,255,255,0.7)', padding: '6px', borderRadius: '100px', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)' }}>
            <button 
              onClick={() => setBilling('monthly')}
              style={{
                padding: '10px 24px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', transition: 'all 0.3s',
                background: billing === 'monthly' ? '#00D68F' : 'transparent',
                color: billing === 'monthly' ? '#white' : '#64748B'
              }}
            >
              Pago Mensual
            </button>
            <button 
              onClick={() => setBilling('annual')}
              style={{
                padding: '10px 24px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', transition: 'all 0.3s',
                background: billing === 'annual' ? '#00D68F' : 'transparent',
                color: billing === 'annual' ? 'white' : '#64748B'
              }}
            >
              Pago Anual
            </button>
          </div>

          {billing === 'annual' && (
            <div style={{ marginTop: '1rem' }}>
              <span style={{ display: 'inline-block', fontSize: '0.72rem', background: '#ECFDF5', border: '1px solid rgba(0, 214, 143, 0.2)', color: '#00A87B', padding: '4px 12px', borderRadius: '100px', fontWeight: 800 }}>
                🎁 Ahorra 2 meses de facturación
              </span>
            </div>
          )}

        </div>
      </section>

      {/* ── 2. PLANES DE INVERSIÓN ── */}
      <section style={{ padding: '2rem 5% 5rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
            {plans.map(p => {
              const isAdvanced = p.styleType === 'advanced';
              const isCustom = p.styleType === 'custom';

              return (
                <div 
                  key={p.name} 
                  className={isAdvanced ? 'glass-pricing-card-featured' : 'glass-pricing-card'}
                >
                  {/* Badge de Popularidad */}
                  {isAdvanced && (
                    <div style={{ 
                      position: 'absolute', top: '16px', right: '-32px', transform: 'rotate(45deg)',
                      background: '#00D68F', color: 'white', fontSize: '0.65rem', fontWeight: 900,
                      padding: '4px 32px', textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      Popular
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    
                    <div>
                      {/* Badge Plan */}
                      <span style={{ 
                        display: 'inline-block', padding: '4px 10px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 800,
                        background: isCustom ? 'rgba(15, 23, 42, 0.05)' : 'rgba(0, 214, 143, 0.08)',
                        color: isCustom ? '#475569' : '#00A87B',
                        textTransform: 'uppercase', letterSpacing: '0.03em'
                      }}>
                        {isCustom ? 'A Medida' : 'Acceso Ilimitado'}
                      </span>

                      <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', margin: '0.8rem 0 0.4rem' }}>{p.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4, fontWeight: 500, minHeight: '40px', margin: '0 0 1.5rem' }}>
                        {p.desc}
                      </p>

                      {/* Precio */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '1.8rem' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 900, color: isAdvanced ? '#00D68F' : '#0F172A', letterSpacing: '-0.04em' }}>
                          {typeof p.price === 'number' ? `$${p.price}` : p.price}
                        </span>
                        {typeof p.price === 'number' && (
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700 }}>USD/mes</span>
                        )}
                      </div>

                      {/* Botón de Pago */}
                      <div style={{ marginBottom: '2rem' }}>
                        <a 
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={isCustom ? 'btn-price-action btn-price-outline' : 'btn-price-action btn-price-green'}
                        >
                          {p.btn}
                        </a>
                      </div>

                      {/* Divisor */}
                      <hr style={{ border: 'none', borderBottom: '1px solid rgba(15, 23, 42, 0.06)', marginBottom: '1.8rem' }} />

                      {/* Lista de características */}
                      <div className="features-list" style={{ overflowY: 'auto', maxHeight: '230px', paddingRight: '4px' }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          {p.features.map((f, idx) => {
                            const isHeader = f === 'SOPORTE STANDARD' || f === 'SOPORTE PREMIUM';
                            const isExcluded = f.startsWith('✕');
                            const cleanText = isExcluded ? f.substring(2) : f;

                            if (isHeader) {
                              return (
                                <li key={idx} style={{ paddingTop: '8px', paddingBottom: '2px' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {f}
                                  </span>
                                </li>
                              );
                            }

                            const cleanTextLower = cleanText.toLowerCase();
                            const hasTooltip = cleanTextLower.includes('contactos activos') || 
                                               cleanTextLower.includes('número de whatsapp') || 
                                               cleanTextLower.includes('acceso multiagente') || 
                                               cleanTextLower.includes('objetivos agentes ia') || 
                                               cleanTextLower.includes('reuniones en zoom') || 
                                               cleanTextLower.includes('funciones ia de grupos') ||
                                               cleanTextLower.includes('base de conocimiento');

                            const getTooltipMsg = (text) => {
                              const lText = text.toLowerCase();
                              if (lText.includes('contactos activos')) return "Contactos únicos a los que les envías o de los que recibes mensajes en el ciclo de facturación.";
                              if (lText.includes('número de whatsapp')) return "Cantidad de líneas o números telefónicos diferentes que puedes conectar a GeoChat.";
                              if (lText.includes('acceso multiagente')) return "Vendedores o miembros de equipo que pueden responder al mismo tiempo.";
                              if (lText.includes('objetivos agentes ia')) {
                                if (lText.includes('faq')) return "La IA responde preguntas frecuentes de tus catálogos o archivos.";
                                return "La IA puede agendar citas, derivar a asesores y calificar variables completas.";
                              }
                              if (lText.includes('reuniones en zoom')) return "Sesiones diarias de soporte por videollamada para configurar o guiar a tu equipo.";
                              if (lText.includes('funciones ia de grupos')) return "Análisis inteligente, resúmenes y filtrado de conversaciones grupales.";
                              if (lText.includes('base de conocimiento')) return "Espacio para entrenar a cada agente con tus documentos, FAQs y páginas web.";
                              return "Info";
                            };

                            const tooltipText = getTooltipMsg(cleanText);

                            return (
                              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', fontWeight: 600, color: isExcluded ? '#94A3B8' : '#334155' }}>
                                {isExcluded ? (
                                  <X size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                                ) : (
                                  <Check size={14} color="#00D68F" style={{ flexShrink: 0, marginTop: '2px' }} />
                                )}

                                <span style={{ textDecoration: isExcluded ? 'line-through' : 'none', lineHeight: 1.4 }}>
                                  {cleanText}
                                  {hasTooltip && (
                                    <span className="group relative inline-flex ml-1" style={{ cursor: 'help', verticalAlign: 'middle', transform: 'translateY(-1px)' }}>
                                      <Info size={11} color="#94A3B8" />
                                      <span className="absolute bottom-full right-0 mb-1 w-48 p-2 bg-slate-800 text-white text-[0.68rem] font-normal rounded-lg shadow-lg text-center opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 leading-tight">
                                        {tooltipText}
                                      </span>
                                    </span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── 3. PREGUNTAS FRECUENTES (FAQs) ── */}
      <section style={{ padding: '5rem 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Preguntas sobre la Inversión
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', fontWeight: 500 }}>
              Resolvemos tus dudas sobre facturación, permanencia y pasarelas de pago.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="faq-pricing-card">
                  <div 
                    onClick={() => toggleFaq(i)}
                    style={{ 
                      padding: '20px 24px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: isOpen ? '#00D68F' : '#0F172A', margin: 0, transition: 'color 0.2s' }}>
                      {f.q}
                    </h3>
                    <ChevronDown 
                      size={20} 
                      color={isOpen ? '#00D68F' : '#64748B'} 
                      style={{ 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', 
                        transition: 'transform 0.3s ease' 
                      }} 
                    />
                  </div>
                  
                  <div style={{ 
                    maxHeight: isOpen ? '300px' : '0', 
                    overflow: 'hidden', 
                    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
                  }}>
                    <div style={{ padding: '0 24px 20px', color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 500 }}>
                      {f.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Garantía Hotmart */}
          <div style={{
            marginTop: '5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Procesado de forma segura por:</span>
              <span style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 900, background: '#F1F5F9', padding: '4px 16px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>Hotmart®</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', maxWidth: '450px', fontWeight: 500 }}>
              Tus transacciones están encriptadas con seguridad SSL de nivel bancario. Tienes 15 días de satisfacción 100% garantizada.
            </p>
          </div>

        </div>
      </section>

    </PublicLayout>
  );
}
