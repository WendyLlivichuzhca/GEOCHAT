import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicLayout from './PublicLayout';

const T = { primary:'#0C4A6E', electric:'#0EA5E9', bg:'#F8FAFF', glass:'rgba(255,255,255,0.72)', border:'rgba(224,242,254,0.9)', radius:28 };

const fadeUp = { hidden:{ opacity:0, y:30 }, visible:{ opacity:1, y:0 } };
const stagger = { visible:{ transition:{ staggerChildren:.1 } } };

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
  { q:'¿Hay permanencia mínima?', a:'No. Puedes cancelar en cualquier momento sin penalización alguna.' },
  { q:'¿Cómo recibo soporte técnico?', a:'Según tu plan: chat en vivo, tickets o Account Manager dedicado 24/7.' },
  { q:'¿Puedo cambiar de plan?', a:'Sí, en cualquier momento. El ajuste se prorratea en tu próximo ciclo.' },
  { q:'¿Ofrecen período de prueba?', a:'15 días de satisfacción garantizada. Devolvemos tu inversión sin preguntas.' },
];

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const plans = PLANS[billing];

  return (
    <PublicLayout>
      <style>{`
        @keyframes glowBorder {
          0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,0), 0 32px 80px rgba(2,132,199,.28); }
          50% { box-shadow: 0 0 0 4px rgba(14,165,233,.35), 0 32px 80px rgba(2,132,199,.4); }
        }
        .featured-glow { animation: glowBorder 2.8s ease-in-out infinite; }
        @media(max-width:900px){ .pri-grid{grid-template-columns:1fr!important} .pri-featured{transform:none!important} }
      `}</style>
      {/* Hero */}
      <section style={{ padding:'6rem 2rem 4rem', background:'linear-gradient(135deg,#F0F9FF,#E0F2FE)', textAlign:'center' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.span variants={fadeUp} style={{ display:'inline-block', background:'rgba(14,165,233,.1)', color:'#0284C7', padding:'.45rem 1rem', borderRadius:'100px', fontWeight:700, fontSize:'.8rem', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:'1.5rem' }}>
            INVERSIÓN ESTRATÉGICA
          </motion.span>
          <motion.h1 variants={fadeUp} style={{ fontSize:'clamp(2.5rem,5vw,4rem)', fontWeight:800, color:'#0C4A6E', letterSpacing:'-.04em', marginBottom:'1.25rem' }}>
            Planes que escalan{' '}
            <span style={{ background:'linear-gradient(135deg,#0EA5E9,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>contigo.</span>
          </motion.h1>

          {/* Billing Switch */}
          <motion.div variants={fadeUp} style={{ display:'inline-flex', alignItems:'center', gap:'1rem', background:'rgba(255,255,255,.8)', backdropFilter:'blur(12px)', padding:'.5rem', borderRadius:'100px', border:'1px solid #E0F2FE', marginTop:'2rem', boxShadow:'0 4px 16px rgba(14,165,233,.08)' }}>
            {['monthly','annual'].map(b=>(
              <button key={b} onClick={()=>setBilling(b)}
                style={{ padding:'.6rem 1.5rem', borderRadius:'100px', border:'none', cursor:'pointer', fontWeight:700, fontSize:'.88rem', transition:'all .3s',
                  background: billing===b ? 'linear-gradient(135deg,#0EA5E9,#0284C7)' : 'transparent',
                  color: billing===b ? '#fff' : '#64748B',
                  boxShadow: billing===b ? '0 4px 14px rgba(14,165,233,.3)' : 'none' }}>
                {b==='monthly' ? 'Mensual' : 'Anual'} {b==='annual' && <span style={{ fontSize:'.75rem', background:'rgba(255,255,255,.25)', padding:'.15rem .5rem', borderRadius:'100px', marginLeft:'.4rem' }}>Ahorra 2 meses</span>}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Plans */}
      <section className="py-12 px-4 md:px-6 bg-white">
        <div className="max-w-[1140px] mx-auto">
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once:true }} 
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
                cardClass = "bg-white rounded-[2rem] p-5 border-2 border-[#22c55e] shadow-[0_0_22px_rgba(34,197,94,0.15)] flex flex-col justify-between text-left relative overflow-hidden transform lg:-translate-y-2 transition-all duration-300 hover:shadow-[0_0_28px_rgba(34,197,94,0.22)]";
              } else if (isCustom) {
                cardClass = "bg-gradient-to-br from-[#f1f5f9] via-[#cbd5e1] to-[#94a3b8] rounded-[2rem] p-5 border border-slate-300 flex flex-col justify-between text-left relative overflow-hidden shadow-md shadow-slate-400/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] transition-all duration-300";
              } else {
                // Starter y Growth
                cardClass = "bg-white rounded-[2rem] p-5 border border-slate-100 flex flex-col justify-between text-left relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]";
              }

              return (
                <motion.div 
                  key={p.name} 
                  variants={fadeUp} 
                  layout 
                  className={cardClass}
                  whileHover={{ y: isAdvanced ? -12 : -8 }}
                >
                  {/* Listón Más Popular para Advanced */}
                  {isAdvanced && (
                    <div className="absolute top-0 right-0 overflow-hidden w-28 h-28">
                      <div className="bg-gradient-to-r from-[#94a3b8] to-[#cbd5e1] text-slate-800 font-extrabold text-[8px] uppercase tracking-widest text-center py-1.5 absolute top-4 -right-8 w-32 rotate-45 shadow-[0_2px_5px_rgba(0,0,0,0.15)] border-y border-slate-300">
                        Más Popular
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col justify-between h-full">
                    <div>
                      {/* Badge verde o similar */}
                      <div className={`inline-block px-3 py-1 rounded-full border text-[9px] font-black tracking-widest uppercase ${
                        isCustom 
                          ? 'border-slate-450 bg-white/40 text-slate-800' 
                          : 'border-[#22c55e]/25 bg-white text-[#22c55e]'
                      }`}>
                        {isCustom ? 'A MEDIDA' : '+ PLAN CON IA'}
                      </div>

                      <span className={`text-[9px] font-bold uppercase tracking-widest block mt-3 ${
                        isCustom ? 'text-slate-700' : 'text-[#22c55e]'
                      }`}>
                        {isCustom ? 'A MEDIDA' : (billing === 'monthly' ? 'MENSUAL' : 'ANUAL')}
                      </span>

                      <h4 className="text-lg font-black text-[#1e1b4b] mt-0.5">{p.name}</h4>
                      
                      <p className={`text-[11px] font-semibold mt-0.5 leading-snug min-h-[44px] ${
                        isCustom ? 'text-slate-800' : 'text-slate-450'
                      }`}>
                        {p.desc}
                      </p>

                      <div className="mt-4 flex items-baseline gap-1">
                        <span className={`text-2xl font-black ${
                          isCustom ? 'text-[#1e1b4b]' : (isAdvanced ? 'text-[#22c55e]' : 'text-[#1e1b4b]')
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
                          className="w-full mt-4 py-2 bg-white text-[#22c55e] border-2 border-[#22c55e] hover:bg-[#22c55e] hover:text-white rounded-full font-black text-[11px] uppercase tracking-wider text-center block text-decoration-none shadow-[0_2px_10px_rgba(34,197,94,0.05)] transition-all"
                        >
                          {p.btn}
                        </a>
                      ) : (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-4 py-2 bg-gradient-to-r from-[#22c55e] to-[#10b981] text-white hover:from-[#15803d] hover:to-[#047857] rounded-full font-black text-[11px] uppercase tracking-wider text-center block text-decoration-none shadow-[0_4px_12px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_18px_rgba(34,197,94,0.45)] transition-all duration-350 transform hover:-translate-y-0.5"
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

                            return (
                              <li key={idx} className="flex items-start gap-1.5 text-[11px] font-semibold leading-normal">
                                {isExcluded ? (
                                  <>
                                    <span className="text-red-500 shrink-0 mt-0.5">✕</span>
                                    <span className={`${isCustom ? 'text-slate-600' : 'text-slate-400'} line-through`}>{cleanText}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[#22c55e] shrink-0 mt-0.5">✓</span>
                                    <span className={isCustom ? 'text-slate-800' : 'text-slate-600'}>{cleanText}</span>
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

      {/* FAQ */}
      <section style={{ padding:'5rem 2rem 6rem', background:'linear-gradient(135deg,#F0F9FF,#E0F2FE)' }}>
        <div style={{ maxWidth:780, margin:'0 auto' }}>
          <h2 style={{ fontSize:'2.5rem', fontWeight:800, color:'#0C4A6E', textAlign:'center', marginBottom:'3rem' }}>Preguntas Frecuentes.</h2>
          {FAQS.map((f,i)=>(
            <div key={i} style={{ marginBottom:'1rem' }}>
              <button onClick={()=>setOpenFaq(openFaq===i?null:i)}
                style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1.4rem 1.5rem', background: openFaq===i ? '#F0F9FF' : '#fff', borderRadius:'16px', border:`1px solid ${openFaq===i ? '#BAE6FD' : '#E0F2FE'}`, cursor:'pointer', textAlign:'left', transition:'all .3s' }}>
                <span style={{ fontWeight:700, color:'#0C4A6E', fontSize:'1rem' }}>{f.q}</span>
                <motion.div animate={{ rotate: openFaq===i ? 180 : 0 }} transition={{ duration:.3 }}>
                  <ChevronDown size={19} color="#0EA5E9"/>
                </motion.div>
              </button>
              <AnimatePresence>
                {openFaq===i && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                    style={{ overflow:'hidden', padding:'0 1.5rem', background:'#F0F9FF', borderRadius:'0 0 16px 16px', border:'1px solid #BAE6FD', borderTop:'none' }}>
                    <p style={{ padding:'1.2rem 0', color:'#475569', lineHeight:1.7 }}>{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
