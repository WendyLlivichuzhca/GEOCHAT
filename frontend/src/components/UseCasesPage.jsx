import React from 'react';
import { motion } from 'framer-motion';
import { Home, ShoppingCart, HeartPulse, GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicLayout from './PublicLayout';

const T = { primary:'#0C4A6E', electric:'#0EA5E9', bg:'#F8FAFF', glass:'rgba(255,255,255,0.72)', border:'rgba(224,242,254,0.9)', radius:28 };
const fadeLeft  = { hidden:{ opacity:0, x:-50 }, visible:{ opacity:1, x:0, transition:{ duration:.6, ease:[.25,.46,.45,.94] } } };
const fadeRight = { hidden:{ opacity:0, x:50 },  visible:{ opacity:1, x:0, transition:{ duration:.6, ease:[.25,.46,.45,.94] } } };
const fadeUp    = { hidden:{ opacity:0, y:30 },  visible:{ opacity:1, y:0, transition:{ duration:.55, ease:[.25,.46,.45,.94] } } };
const stagger   = { visible:{ transition:{ staggerChildren:.1 } } };

const AnimIcon = ({ icon, color, size=70 }) => (
  <motion.div whileHover={{ scale:1.12, rotate:5 }} transition={{ type:'spring', stiffness:280, damping:12 }}
    style={{ width:size, height:size, borderRadius:22, background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center', color, marginBottom:'2rem' }}>
    {icon}
  </motion.div>
);

const CASES = [
  { title:'Real Estate', desc:'Automatiza la calificación de prospectos y agenda visitas sin intervención humana las 24 horas.', icon:<Home size={30}/>, benefits:['Calificación automática de leads','Agenda de visitas 24/7','Envío de catálogos PDF'], color:'#0EA5E9' },
  { title:'E-commerce & Retail', desc:'Resuelve dudas de preventa, rastrea pedidos y recupera carritos abandonados de forma masiva.', icon:<ShoppingCart size={30}/>, benefits:['Status de pedido en tiempo real','Recuperación de ventas','Soporte post-compra'], color:'#10B981' },
  { title:'Salud & Clínicas', desc:'Gestiona citas, envía recordatorios preventivos y organiza expedientes directamente por WhatsApp.', icon:<HeartPulse size={30}/>, benefits:['Agendamiento inteligente','Recordatorios automáticos','Triaje inicial por IA'], color:'#EF4444' },
  { title:'Educación & Academias', desc:'Escala tus inscripciones y ofrece soporte académico centralizado para miles de estudiantes.', icon:<GraduationCap size={30}/>, benefits:['Admisiones masivas','FAQ automatizado','Difusión de eventos'], color:'#8B5CF6' },
];

export default function UseCasesPage() {
  return (
    <PublicLayout>
      <style>{`@media(max-width:780px){.zrow{grid-template-columns:1fr!important}}`}</style>

      {/* Hero */}
      <section style={{ padding:'6rem 1.5rem 4rem', background:'linear-gradient(135deg,#EFF9FF,#E0F2FE)', textAlign:'center' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.span variants={fadeUp} style={{ display:'inline-block', background:'rgba(14,165,233,.1)', color:'#0284C7', padding:'.45rem 1rem', borderRadius:100, fontWeight:700, fontSize:'.78rem', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:'1.5rem' }}>
            CASOS DE ÉXITO
          </motion.span>
          <motion.h1 variants={fadeUp} style={{ fontSize:'clamp(2.4rem,5vw,4rem)', fontWeight:800, color:T.primary, letterSpacing:'-.04em', marginBottom:'1.25rem' }}>
            Soluciones para{' '}
            <span style={{ background:'linear-gradient(135deg,#0EA5E9,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>cada industria.</span>
          </motion.h1>
          <motion.p variants={fadeUp} style={{ color:'#64748B', fontSize:'1.1rem', maxWidth:600, margin:'0 auto' }}>
            Descubre cómo GeoChat se adapta a la naturaleza de tu negocio para maximizar resultados.
          </motion.p>
        </motion.div>
      </section>

      {/* Z-Pattern Layout */}
      <section style={{ padding:'5rem 1.5rem 6rem', background:'#fff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', flexDirection:'column', gap:'5rem' }}>
          {CASES.map((c, i) => {
            const isEven = i % 2 === 0;
            return (
              <motion.div key={c.title} className="zrow"
                initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-80px' }}
                style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4rem', alignItems:'center', direction: isEven ? 'ltr' : 'rtl' }}>

                {/* Text side */}
                <motion.div variants={isEven ? fadeLeft : fadeRight} style={{ direction:'ltr' }}>
                  <AnimIcon icon={c.icon} color={c.color} />
                  <h2 style={{ fontSize:'2rem', fontWeight:800, color:T.primary, marginBottom:'1rem' }}>{c.title}</h2>
                  <p style={{ color:'#64748B', lineHeight:1.75, fontSize:'1rem', marginBottom:'2rem' }}>{c.desc}</p>
                  <div style={{ marginBottom:'2.25rem' }}>
                    {c.benefits.map(b=>(
                      <div key={b} style={{ display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'.875rem', fontWeight:600, color:'#334155' }}>
                        <CheckCircle2 size={17} color={c.color} /> {b}
                      </div>
                    ))}
                  </div>
                  <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:'.5rem', color:c.color, fontWeight:700, textDecoration:'none', fontSize:'.95rem' }}
                    onMouseEnter={e=>e.currentTarget.style.gap='1rem'}
                    onMouseLeave={e=>e.currentTarget.style.gap='.5rem'}>
                    Ver demo del sector <ArrowRight size={18}/>
                  </Link>
                </motion.div>

                {/* Visual side */}
                <motion.div variants={isEven ? fadeRight : fadeLeft} style={{ direction:'ltr' }}>
                  <div style={{ background:`linear-gradient(135deg,${c.color}10,${c.color}05)`, borderRadius:T.radius, padding:'3rem', border:`1px solid ${c.color}20`, minHeight:260, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:'1.5rem' }}>
                    <div style={{ width:90, height:90, borderRadius:28, background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', color:c.color }}>
                      {React.cloneElement(c.icon, { size:42 })}
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:'2rem', fontWeight:800, color:c.color }}>+{(i+1)*12}%</p>
                      <p style={{ color:'#64748B', fontSize:'.9rem', fontWeight:600 }}>Mejora promedio en conversión</p>
                    </div>
                    <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap', justifyContent:'center' }}>
                      {c.benefits.map(b=>(
                        <span key={b} style={{ background:'rgba(255,255,255,.8)', backdropFilter:'blur(8px)', padding:'.3rem .75rem', borderRadius:100, fontSize:'.72rem', fontWeight:700, color:c.color, border:`1px solid ${c.color}25` }}>{b}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'4rem 1.5rem 6rem', background:'linear-gradient(135deg,#F0F9FF,#E0F2FE)' }}>
        <motion.div initial={{ opacity:0, scale:.95 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true }}
          style={{ maxWidth:860, margin:'0 auto', background:`linear-gradient(135deg,${T.primary},#0284C7)`, borderRadius:40, padding:'4.5rem 2.5rem', textAlign:'center', color:'#fff', boxShadow:'0 40px 100px rgba(14,165,233,.25)' }}>
          <h2 style={{ fontSize:'2.5rem', fontWeight:800, marginBottom:'1.25rem' }}>¿Tu sector es diferente?</h2>
          <p style={{ opacity:.78, fontSize:'1.05rem', maxWidth:480, margin:'0 auto 2.5rem' }}>GeoChat es tan flexible que puede adaptarse a cualquier operación. Cuéntanos tu reto.</p>
          <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:'.75rem', textDecoration:'none', padding:'1.1rem 2.5rem', background:'#fff', color:'#0284C7', borderRadius:16, fontWeight:800, boxShadow:'0 8px 28px rgba(0,0,0,.15)', transition:'all .3s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            Hablar con un Consultor <ArrowRight size={18}/>
          </Link>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
