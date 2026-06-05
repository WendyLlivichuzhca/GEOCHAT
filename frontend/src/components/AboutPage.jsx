import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Shield, Zap, Heart, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicLayout from './PublicLayout';

const T = { primary:'#0C4A6E', electric:'#0EA5E9', bg:'#F8FAFF', glass:'rgba(255,255,255,0.72)', border:'rgba(224,242,254,0.9)', radius:28 };
const fadeLeft  = { hidden:{ opacity:0, x:-50 }, visible:{ opacity:1, x:0, transition:{ duration:.6, ease:[.25,.46,.45,.94] } } };
const fadeRight = { hidden:{ opacity:0, x:50 },  visible:{ opacity:1, x:0, transition:{ duration:.6, ease:[.25,.46,.45,.94] } } };
const fadeUp    = { hidden:{ opacity:0, y:30 },  visible:{ opacity:1, y:0, transition:{ duration:.55, ease:[.25,.46,.45,.94] } } };
const stagger   = { visible:{ transition:{ staggerChildren:.1 } } };

const AnimIcon = ({ icon, color, size=64, bg }) => (
  <motion.div whileHover={{ scale:1.14, rotate:6 }} transition={{ type:'spring', stiffness:280, damping:12 }}
    style={{ width:size, height:size, borderRadius:20, background:bg||`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', color, marginBottom:'1.75rem' }}>
    {icon}
  </motion.div>
);

const VALUES = [
  { icon:<Shield size={22}/>, title:'Privacidad', desc:'Encriptación de grado bancario en todo momento.', color:'#10B981' },
  { icon:<Zap size={22}/>, title:'Innovación', desc:'Actualizaciones semanales sin costo adicional.', color:T.electric },
  { icon:<Heart size={22}/>, title:'Pasión', desc:'Tu éxito es nuestra métrica más importante.', color:'#EF4444' },
  { icon:<Globe size={22}/>, title:'Impacto', desc:'Soluciones reales para negocios en todo el mundo.', color:'#8B5CF6' },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <style>{`@media(max-width:780px){.zrow-a{grid-template-columns:1fr!important}}`}</style>

      {/* Hero */}
      <section style={{ padding:'6rem 1.5rem 4rem', background:'linear-gradient(135deg,#EFF9FF,#E0F2FE)', textAlign:'center' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.span variants={fadeUp} style={{ display:'inline-block', background:'rgba(14,165,233,.1)', color:'#0284C7', padding:'.45rem 1rem', borderRadius:100, fontWeight:700, fontSize:'.78rem', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:'1.5rem' }}>
            NUESTRA HISTORIA
          </motion.span>
          <motion.h1 variants={fadeUp} style={{ fontSize:'clamp(2.4rem,5vw,4rem)', fontWeight:800, color:T.primary, letterSpacing:'-.04em', marginBottom:'1.25rem' }}>
            Tecnología con{' '}
            <span style={{ background:'linear-gradient(135deg,#0EA5E9,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>alma humana.</span>
          </motion.h1>
          <motion.p variants={fadeUp} style={{ color:'#64748B', fontSize:'1.1rem', maxWidth:660, margin:'0 auto' }}>
            GeoChat nació con una visión clara: eliminar el caos de la comunicación empresarial y permitir que las marcas conecten de verdad con sus clientes.
          </motion.p>
        </motion.div>
      </section>

      {/* Z-Pattern – Mission */}
      <section style={{ padding:'5rem 1.5rem', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', flexDirection:'column', gap:'5rem' }}>

          {/* Row 1 – Misión (text left, visual right) */}
          <motion.div className="zrow-a" initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-60px' }}
            style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4rem', alignItems:'center' }}>
            <motion.div variants={fadeLeft}>
              <AnimIcon icon={<Target size={30}/>} color={T.electric} />
              <h2 style={{ fontSize:'2rem', fontWeight:800, color:T.primary, marginBottom:'1rem' }}>Nuestra Misión.</h2>
              <p style={{ color:'#64748B', lineHeight:1.8, fontSize:'1.05rem' }}>
                Proveer a los negocios de la infraestructura necesaria para escalar sus ventas de forma ética, rápida y automatizada, sin perder el toque personal que fideliza clientes.
              </p>
            </motion.div>
            <motion.div variants={fadeRight}>
              <div style={{ background:'linear-gradient(135deg,rgba(14,165,233,.08),rgba(14,165,233,.02))', borderRadius:T.radius, padding:'3rem', border:`1px solid rgba(14,165,233,.12)`, display:'flex', flexDirection:'column', gap:'1.5rem' }}>
                {[['Empresas transformadas','+500'],['Tasa de retención','94%'],['NPS promedio','78']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem', background:'rgba(255,255,255,.7)', backdropFilter:'blur(8px)', borderRadius:16, border:`1px solid ${T.border}` }}>
                    <span style={{ fontWeight:600, color:'#475569', fontSize:'.9rem' }}>{k}</span>
                    <span style={{ fontWeight:800, color:T.electric, fontSize:'1.2rem' }}>{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Row 2 – Visión (visual left, text right) */}
          <motion.div className="zrow-a" initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-60px' }}
            style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4rem', alignItems:'center' }}>
            <motion.div variants={fadeLeft} style={{ order:2 }}>
              <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,.07),rgba(124,58,237,.02))', borderRadius:T.radius, padding:'3rem', border:'1px solid rgba(124,58,237,.12)', textAlign:'center' }}>
                <div style={{ fontSize:'4rem', fontWeight:800, background:'linear-gradient(135deg,#7C3AED,#0EA5E9)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'1rem', lineHeight:1 }}>2026</div>
                <p style={{ color:'#64748B', fontWeight:600 }}>Líderes del mercado conversacional</p>
                <div style={{ marginTop:'2rem', display:'flex', justifyContent:'center', gap:'1rem' }}>
                  {['🌎','🚀','💡'].map(e=>(
                    <span key={e} style={{ fontSize:'1.75rem' }}>{e}</span>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeRight} style={{ order:1 }}>
              <AnimIcon icon={<Eye size={30}/>} color="#7C3AED" />
              <h2 style={{ fontSize:'2rem', fontWeight:800, color:T.primary, marginBottom:'1rem' }}>Nuestra Visión.</h2>
              <p style={{ color:'#64748B', lineHeight:1.8, fontSize:'1.05rem' }}>
                Convertirnos en el estándar global de comunicación inteligente, donde cada interacción sea una oportunidad de valor impulsada por la IA más avanzada del mercado.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding:'5rem 1.5rem', background:'linear-gradient(135deg,#F0F9FF,#E0F2FE)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger}>
            <motion.div variants={fadeUp} style={{ textAlign:'center', marginBottom:'3.5rem' }}>
              <span style={{ color:T.electric, fontWeight:700, fontSize:'.8rem', letterSpacing:'.15em', textTransform:'uppercase' }}>VALORES CORE</span>
              <h2 style={{ fontSize:'2.5rem', fontWeight:800, color:T.primary, marginTop:'.6rem' }}>Lo que nos define.</h2>
            </motion.div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1.5rem' }}>
              {VALUES.map(v=>(
                <motion.div key={v.title} variants={fadeUp}
                  style={{ background:T.glass, backdropFilter:'blur(14px)', borderRadius:T.radius, padding:'2.5rem 2rem', textAlign:'center', border:`1px solid ${T.border}` }}
                  whileHover={{ scale:1.04, boxShadow:`0 20px 50px ${v.color}18`, y:-8 }}>
                  <AnimIcon icon={v.icon} color={v.color} size={58} />
                  <h4 style={{ fontSize:'1.2rem', fontWeight:800, color:T.primary, marginBottom:'.65rem' }}>{v.title}</h4>
                  <p style={{ color:'#64748B', fontSize:'.88rem', lineHeight:1.6 }}>{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'5rem 1.5rem 6rem', background:'#fff' }}>
        <motion.div initial={{ opacity:0, scale:.95 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true }}
          style={{ maxWidth:860, margin:'0 auto', background:`linear-gradient(135deg,${T.primary},#0284C7)`, borderRadius:40, padding:'5rem 2.5rem', textAlign:'center', boxShadow:'0 40px 100px rgba(14,165,233,.25)', color:'#fff' }}>
          <h2 style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:800, marginBottom:'1.25rem' }}>Únete a la revolución.</h2>
          <p style={{ opacity:.74, fontSize:'1.05rem', marginBottom:'2.75rem', maxWidth:480, margin:'0 auto 2.75rem' }}>Cientos de empresas ya están transformando su comunicación con GeoChat. Es tu turno.</p>
          <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:'.75rem', textDecoration:'none', padding:'1.1rem 2.8rem', background:'#fff', color:'#0284C7', borderRadius:16, fontWeight:800, fontSize:'1.05rem', boxShadow:'0 8px 28px rgba(0,0,0,.15)', transition:'all .3s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            Desplegar GeoChat <ArrowRight size={20}/>
          </Link>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
