import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicLayout from './PublicLayout';

const T = { primary: '#0C4A6E', electric: '#0EA5E9', bg: '#F8FAFF', glass: 'rgba(255,255,255,0.72)', border: 'rgba(224,242,254,0.9)', radius: 28 };

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: .1 } } };

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
      color: '#22c55e',
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
      color: '#22c55e',
      link: 'https://wa.me/593986130956?text=Hola!%20Quiero%20más%20información%20sobre%20el%20Plan%20Growth%20de%20GeoChat.',
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
      color: '#22c55e',
      link: 'https://wa.me/593986130956?text=Hola!%20Quiero%20más%20información%20sobre%20el%20Plan%20Advanced%20de%20GeoChat.',
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
      color: '#22c55e',
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
      color: '#22c55e',
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
      color: '#22c55e',
      link: 'https://wa.me/593986130956?text=Hola!%20Quiero%20más%20información%20sobre%20el%20Plan%20Growth%20Anual%20de%20GeoChat.',
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
      color: '#22c55e',
      link: 'https://wa.me/593986130956?text=Hola!%20Quiero%20más%20información%20sobre%20el%20Plan%20Advanced%20Anual%20de%20GeoChat.',
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
      color: '#22c55e',
      link: 'https://wa.me/593986130956?text=Hola!%20Quiero%20saber%20más%20información%20sobre%20el%20Plan%20Personalizado%20a%20medida%20de%20GeoChat.',
      styleType: 'custom'
    }
  ],
};

const FAQS = [
  { q: '¿Hay permanencia mínima?', a: 'No. Puedes cancelar en cualquier momento sin penalización alguna.' },
  { q: '¿Cómo recibo soporte técnico?', a: 'Según tu plan: chat en vivo, tickets o Account Manager dedicado 24/7.' },
  { q: '¿Puedo cambiar de plan?', a: 'Sí, en cualquier momento. El ajuste se prorratea en tu próximo ciclo.' },
  { q: '¿Ofrecen período de prueba?', a: '15 días de satisfacción garantizada. Devolvemos tu inversión sin preguntas.' },
];

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const plans = PLANS[billing];

  return (
    <PublicLayout>
      <style>{`
        .featured-glow { box-shadow: 0 0 22px rgba(45,157,120,0.15); }
        @media(max-width:900px){ .pri-grid{grid-template-columns:1fr!important} }
      `}</style>
      {/* Hero */}
      <section style={{ padding: '5rem 2rem 3rem', background: '#f8fafc', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2.5rem,5vw,3.5rem)', fontWeight: 900, color: '#1e1b4b', letterSpacing: '-.03em', marginBottom: '0.75rem' }}>
            Planes que escalan <span style={{ color: '#2d9d78' }}>contigo.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-slate-500 font-semibold text-[13px] md:text-sm max-w-xl mx-auto mb-6">
            Elige el plan ideal para tu negocio y escala sin límites.
          </motion.p>

          {/* Billing Switch */}
          <motion.div variants={fadeUp} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: '#f1f5f9', padding: '.4rem', borderRadius: '100px', border: '1px solid #e2e8f0', marginTop: '1rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
            {['monthly', 'annual'].map(b => (
              <button key={b} onClick={() => setBilling(b)}
                style={{
                  padding: '.55rem 1.4rem', borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '.8rem', transition: 'all .3s',
                  background: billing === b ? '#2d9d78' : 'transparent',
                  color: billing === b ? '#fff' : '#64748B',
                  boxShadow: billing === b ? '0 2px 8px rgba(45,157,120,.25)' : 'none'
                }}>
                {b === 'monthly' ? 'Mensual' : 'Anual'}
              </button>
            ))}
          </motion.div>
          {billing === 'annual' && (
            <span style={{ display: 'inline-block', fontSize: '.7rem', background: '#e6f6f0', color: '#2d9d78', padding: '.2rem .6rem', borderRadius: '100px', fontWeight: 800, marginLeft: '.75rem', verticalAlign: 'middle' }}>
              Ahorra 2 meses
            </span>
          )}
        </motion.div>
      </section>

      {/* Plans */}
      <section className="py-16 px-4 md:px-6 bg-[#f8fafc]">
        <div className="max-w-[1180px] mx-auto">
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }} 
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch"
          >
            {plans.map(p => {
              const isStarter = p.styleType === 'starter';
              const isGrowth = p.styleType === 'growth';
              const isAdvanced = p.styleType === 'advanced';
              const isCustom = p.styleType === 'custom';

              // Clases del contenedor de la tarjeta según el tipo
              let cardClass = "";
              if (isAdvanced) {
                cardClass = "bg-white rounded-[2rem] p-5 border-2 border-[#2d9d78] shadow-[0_0_24px_rgba(45,157,120,0.12)] flex flex-col justify-between text-left relative overflow-hidden transform lg:-translate-y-2.5 transition-all duration-300 hover:shadow-[0_0_32px_rgba(45,157,120,0.22)]";
              } else {
                // Starter, Growth y Custom tienen fondo blanco y borde slate simple
                cardClass = "bg-white rounded-[2rem] p-5 border border-slate-100 flex flex-col justify-between text-left relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]";
              }

              return (
                <motion.div 
                  key={p.name} 
                  variants={fadeUp} 
                  layout 
                  className={cardClass}
                  whileHover={{ y: isAdvanced ? -12 : -8 }}
                >
                  {/* Listón Más Popular para Advanced en verde GeoChat */}
                  {isAdvanced && (
                    <div className="absolute top-0 right-0 overflow-hidden w-28 h-28">
                      <div className="bg-[#2d9d78] text-white font-extrabold text-[8px] uppercase tracking-widest text-center py-1.5 absolute top-4 -right-8 w-32 rotate-45 shadow-[0_2px_5px_rgba(0,0,0,0.12)] border-y border-[#258564]/30">
                        Más Popular
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col justify-between h-full">
                    <div>
                      {/* Badge verde o similar */}
                      <div className={`inline-block px-3 py-1 rounded-full border text-[9px] font-black tracking-widest uppercase ${
                        isCustom 
                          ? 'border-slate-300 bg-slate-50 text-slate-700' 
                          : 'border-[#2d9d78]/25 bg-[#e6f6f0] text-[#2d9d78]'
                      }`}>
                        {isCustom ? 'A MEDIDA' : '+ PLAN CON IA'}
                      </div>

                      <span className={`text-[9px] font-bold uppercase tracking-widest block mt-3 ${
                        isCustom ? 'text-slate-500' : 'text-[#2d9d78]'
                      }`}>
                        {isCustom ? 'A MEDIDA' : (billing === 'monthly' ? 'MENSUAL' : 'ANUAL')}
                      </span>

                      <h4 className="text-lg font-black text-[#1e1b4b] mt-0.5">{p.name}</h4>
                      
                      <p className="text-[11px] font-semibold mt-0.5 leading-snug min-h-[44px] text-slate-500">
                        {p.desc}
                      </p>

                      <div className="mt-4 flex items-baseline gap-1">
                        <span className={`text-2xl font-black ${
                          isCustom ? 'text-[#1e1b4b]' : (isAdvanced ? 'text-[#2d9d78]' : 'text-[#1e1b4b]')
                        }`}>
                          {typeof p.price === 'number' ? `$${p.price}` : p.price}
                        </span>
                        {typeof p.price === 'number' && (
                          <span className="text-xs font-bold text-slate-400">USD/mes</span>
                        )}
                      </div>

                      {/* Botón de acción */}
                      {isCustom ? (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-4 py-2 bg-white text-[#2d9d78] border-2 border-[#2d9d78] hover:bg-[#2d9d78] hover:text-white rounded-full font-black text-[11px] uppercase tracking-wider text-center block text-decoration-none shadow-[0_2px_8px_rgba(45,157,120,0.05)] transition-all duration-300"
                        >
                          {p.btn}
                        </a>
                      ) : (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-4 py-2 bg-[#2d9d78] text-white hover:bg-[#258564] rounded-full font-black text-[11px] uppercase tracking-wider text-center block text-decoration-none shadow-[0_4px_12px_rgba(45,157,120,0.2)] hover:shadow-[0_6px_18px_rgba(45,157,120,0.35)] transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                          {p.btn}
                        </a>
                      )}

                      {/* Features list (scroll interno discreto) */}
                      <div className="overflow-y-auto max-h-[190px] xl:max-h-[220px] mt-4 pr-1 text-left" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <ul className="space-y-1.5">
                          {p.features.map((f, idx) => {
                            const isHeader = f === 'SOPORTE STANDARD' || f === 'SOPORTE PREMIUM';
                            const isExcluded = f.startsWith('✕');
                            const cleanText = isExcluded ? f.substring(2) : f;

                            if (isHeader) {
                              return (
                                <li key={idx} className="pt-2 pb-0.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                    {f}
                                  </span>
                                </li>
                              );
                            }

                            const cleanTextLower = cleanText.toLowerCase();
                            const hasInfoIcon = cleanTextLower.includes('contactos activos') || 
                                                cleanTextLower.includes('número de whatsapp business') || 
                                                cleanTextLower.includes('números de whatsapp business') || 
                                                cleanTextLower.includes('acceso multiagente') || 
                                                cleanTextLower.includes('accesos multiagente') || 
                                                cleanTextLower.includes('objetivos agentes ia') || 
                                                cleanTextLower.includes('reuniones en zoom') || 
                                                cleanTextLower.includes('funciones ia de grupos');

                            return (
                              <li key={idx} className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                                {isExcluded ? (
                                  <>
                                    <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                                    <span className="text-slate-400 line-through">{cleanText}</span>
                                    {hasInfoIcon && (
                                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[8px] font-bold text-slate-400 border border-slate-400 rounded-full ml-1 select-none cursor-help" style={{ verticalAlign: 'middle', transform: 'translateY(-1.5px)' }} title="Info">i</span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[#2d9d78] shrink-0 mt-0.5">✓</span>
                                    <span className="text-slate-650">
                                      {cleanText}
                                      {hasInfoIcon && (
                                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[8px] font-bold text-slate-400 border border-slate-400 rounded-full ml-1 select-none cursor-help" style={{ verticalAlign: 'middle', transform: 'translateY(-1.5px)' }} title="Info">i</span>
                                      )}
                                    </span>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
