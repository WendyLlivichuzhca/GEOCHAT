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
    { name:'Core Node', price:29, desc:'Para negocios que inician su transformación.', features:['3 Agentes Activos','Central de Chats','Whalinks Ilimitados','Soporte 12/5'], btn:'Activar Core', color:'#0EA5E9' },
    { name:'Elite Engine', price:79, desc:'Para equipos que necesitan escalar rápido.', features:['10 Agentes Activos','Motor de IA Generativa','Pipeline de Ventas','API de Integración','Soporte Prioritario'], btn:'Desplegar Elite', featured:true, color:'#0284C7' },
    { name:'Hyper Scale', price:129, desc:'Infraestructura dedicada para alto volumen.', features:['Agentes Ilimitados','Instancia Dedicada','API Full Access','Account Manager','SLA 99.9%'], btn:'Consultar', color:'#7C3AED' },
  ],
  annual: [
    { name:'Core Node', price:23, desc:'Para negocios que inician su transformación.', features:['3 Agentes Activos','Central de Chats','Whalinks Ilimitados','Soporte 12/5'], btn:'Activar Core', color:'#0EA5E9' },
    { name:'Elite Engine', price:63, desc:'Para equipos que necesitan escalar rápido.', features:['10 Agentes Activos','Motor de IA Generativa','Pipeline de Ventas','API de Integración','Soporte Prioritario'], btn:'Desplegar Elite', featured:true, color:'#0284C7' },
    { name:'Hyper Scale', price:103, desc:'Infraestructura dedicada para alto volumen.', features:['Agentes Ilimitados','Instancia Dedicada','API Full Access','Account Manager','SLA 99.9%'], btn:'Consultar', color:'#7C3AED' },
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
                {b==='monthly' ? 'Mensual' : 'Anual'} {b==='annual' && <span style={{ fontSize:'.75rem', background:'rgba(255,255,255,.25)', padding:'.15rem .5rem', borderRadius:'100px', marginLeft:'.4rem' }}>-20%</span>}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Plans */}
      <section style={{ padding:'3rem 2rem 6rem', background:'#fff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger}
            className="pri-grid"
            style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1.5rem', alignItems:'start' }}>
            {plans.map(p=>(
              <motion.div key={p.name} variants={fadeUp} layout
                className={p.featured ? 'featured-glow pri-featured' : ''}
                style={{ background: p.featured ? 'linear-gradient(180deg,#0C4A6E,#0284C7)' : '#F8FAFF', borderRadius:'32px', padding: p.featured ? '3.5rem 3rem' : '3rem', border: p.featured ? 'none' : '1px solid #E0F2FE', position:'relative', transform: p.featured ? 'scale(1.04)' : 'scale(1)' }}
                whileHover={{ scale: p.featured ? 1.06 : 1.02, y:-6 }}>
                {p.featured && <div style={{ position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)', background:'#10B981', color:'#fff', padding:'.45rem 1.5rem', borderRadius:'100px', fontSize:'.75rem', fontWeight:800, boxShadow:'0 4px 14px rgba(16,185,129,.4)' }}>⭐ Recomendado</div>}
                <p style={{ fontWeight:800, fontSize:'.85rem', letterSpacing:'.1em', textTransform:'uppercase', color: p.featured ? '#38BDF8' : p.color, marginBottom:'1.25rem' }}>{p.name}</p>

                {/* Animated price */}
                <AnimatePresence mode="wait">
                  <motion.div key={`${billing}-${p.price}`}
                    initial={{ opacity:0, y:-20, scale:.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:20, scale:.9 }}
                    transition={{ type:'spring', stiffness:300, damping:22 }}
                    style={{ fontSize:'3.5rem', fontWeight:800, letterSpacing:'-.04em', color: p.featured ? '#fff' : '#0C4A6E', marginBottom:'.5rem' }}>
                    ${p.price} <span style={{ fontSize:'1rem', opacity:.45, fontWeight:500 }}>/ mes</span>
                  </motion.div>
                </AnimatePresence>

                <p style={{ fontSize:'.92rem', color: p.featured ? 'rgba(255,255,255,.7)' : '#64748B', marginBottom:'2rem' }}>{p.desc}</p>
                <div style={{ marginBottom:'2.5rem' }}>
                  {p.features.map(f=>(
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'.875rem', fontWeight:600, fontSize:'.9rem', color: p.featured ? 'rgba(255,255,255,.85)' : '#334155' }}>
                      <Check size={16} color={p.featured ? '#38BDF8' : '#10B981'}/> {f}
                    </div>
                  ))}
                </div>
                <Link to="/login" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem', textDecoration:'none', padding:'1rem', background: p.featured ? '#fff' : `${p.color}12`, color: p.featured ? '#0284C7' : p.color, borderRadius:'16px', fontWeight:700, transition:'all .3s' }}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                  {p.btn} <ArrowRight size={15}/>
                </Link>
              </motion.div>
            ))}
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
