import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, MessageSquare, Zap, Users, Bot, Workflow,
  TrendingUp, CheckCircle2, Star, Shield, Headphones,
} from 'lucide-react';
import PublicLayout from './PublicLayout';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': '69420' };

/* ─── Design Tokens ─── */
const T = {
  primary: '#0C4A6E',
  electric: '#0EA5E9',
  bg: '#F8FAFF',
  glass: 'rgba(255,255,255,0.72)',
  border: 'rgba(224,242,254,0.9)',
  radius: 28,
};

/* ─── Motion Variants ─── */
const fadeUp = { hidden:{ opacity:0, y:36 }, visible:{ opacity:1, y:0, transition:{ duration:.55, ease:[.25,.46,.45,.94] } } };
const fadeLeft = { hidden:{ opacity:0, x:-40 }, visible:{ opacity:1, x:0, transition:{ duration:.6, ease:[.25,.46,.45,.94] } } };
const fadeRight = { hidden:{ opacity:0, x:40 }, visible:{ opacity:1, x:0, transition:{ duration:.6, ease:[.25,.46,.45,.94] } } };
const stagger = { visible:{ transition:{ staggerChildren:.1 } } };

/* ─── Pulsing dot ─── */
const Pulse = ({ color='#10B981', size=10 }) => (
  <span style={{ position:'relative', display:'inline-flex', width:size, height:size, flexShrink:0 }}>
    <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, opacity:.35, animation:'ping 1.6s ease-in-out infinite' }} />
    <span style={{ position:'absolute', inset:size*.15, borderRadius:'50%', background:color }} />
  </span>
);

/* ─── Animated live bars ─── */
const LiveBars = ({ color='#0EA5E9', count=14 }) => {
  const [h, setH] = useState(() => Array.from({ length:count }, ()=>25+Math.random()*55));
  useEffect(()=>{
    const t = setInterval(()=> setH(prev=> prev.map(()=> 18+Math.random()*72)), 850);
    return ()=> clearInterval(t);
  },[]);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:60, marginTop:'auto', paddingTop:12 }}>
      {h.map((v,i)=>(
        <motion.div key={i} animate={{ height:`${v}%` }} transition={{ type:'spring', stiffness:110, damping:15 }}
          style={{ flex:1, borderRadius:3, background:`${color}${i%2===0?'CC':'55'}` }} />
      ))}
    </div>
  );
};

/* ─── Icon with hover micro-animation ─── */
const AnimIcon = ({ icon, color, bg, size=56 }) => (
  <motion.div whileHover={{ scale:1.15, rotate:6 }} transition={{ type:'spring', stiffness:300, damping:12 }}
    style={{ width:size, height:size, borderRadius:'50%', background:bg||`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>
    {icon}
  </motion.div>
);

/* ─── Marquee ─── */
const TECHS = ['WhatsApp API','React 18','Python Flask','MySQL 8','Node.js','Framer Motion','JWT Auth','Webhooks','REST API','Ngrok'];
const Marquee = () => (
  <div style={{ overflow:'hidden', padding:'2rem 0', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, background:'#fff' }}>
    <motion.div animate={{ x:['0%','-50%'] }} transition={{ repeat:Infinity, duration:24, ease:'linear' }}
      style={{ display:'flex', gap:'2rem', whiteSpace:'nowrap', width:'max-content' }}>
      {[...TECHS,...TECHS].map((item,i)=>(
        <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:'.5rem', padding:'.45rem 1.1rem', background:'#F0F9FF', borderRadius:100, border:'1px solid #BAE6FD', color:'#0284C7', fontWeight:700, fontSize:'.82rem' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:T.electric, display:'inline-block' }} />
          {item}
        </span>
      ))}
    </motion.div>
  </div>
);

export default function LandingPage() {
  const [status, setStatus] = useState({ wa:true, ngrok:true });

  useEffect(()=>{
    if (!API_URL) return;
    fetch(`${API_URL}/api/contacts?limit=1`, { headers:{ ...NGROK_HEADERS, Authorization:'Bearer check' }, signal:AbortSignal.timeout(4000) })
      .then(r=> setStatus({ wa:true, ngrok:r.status!==0 }))
      .catch(()=> setStatus({ wa:true, ngrok:false }));
  },[]);

  return (
    <PublicLayout>
      <style>{`
        @keyframes ping { 0%,100%{transform:scale(1);opacity:.35} 50%{transform:scale(2.4);opacity:0} }
        @keyframes pulseBtn { 0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,.5)} 60%{box-shadow:0 0 0 16px rgba(14,165,233,0)} }
        .cta-main { animation:pulseBtn 2.6s infinite; }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @media(max-width:900px){ .hero-grid{grid-template-columns:1fr!important} .bento-grid{grid-template-columns:1fr!important; grid-template-rows:auto!important} .bento-wide,.bento-tall{grid-column:span 1!important;grid-row:span 1!important} }
        @media(max-width:640px){ h1.hero-title{font-size:clamp(2.8rem,9vw,4.5rem)!important} }
      `}</style>

      {/* ══ HERO ══ */}
      <section style={{ minHeight:'96vh', display:'flex', alignItems:'center', padding:'7rem 1.5rem 5rem', background:'linear-gradient(155deg,#EFF9FF 0%,#E0F2FE 45%,#F8FAFF 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-140, right:-140, width:560, height:560, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,.1),transparent 68%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-200, left:-100, width:640, height:640, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,.06),transparent 68%)', pointerEvents:'none' }} />

        <div style={{ maxWidth:1320, margin:'0 auto', width:'100%', position:'relative', zIndex:1 }}>
          <div className="hero-grid" style={{ display:'grid', gridTemplateColumns:'1.15fr 0.85fr', gap:'4rem', alignItems:'center' }}>

            {/* ── Left ── */}
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:'.6rem', background:'rgba(14,165,233,.08)', border:'1px solid rgba(14,165,233,.2)', padding:'.45rem 1.1rem', borderRadius:100, fontSize:'.76rem', fontWeight:800, color:'#0284C7', marginBottom:'2rem', letterSpacing:'.08em' }}>
                  <Pulse color="#10B981" size={9} />
                  SISTEMA GEOCHAT V3.0 · OPERATIVO
                </span>
              </motion.div>

              <motion.h1 className="hero-title" variants={fadeUp}
                style={{ fontSize:'clamp(3rem,6vw,6rem)', fontWeight:800, lineHeight:.95, letterSpacing:'-.055em', marginBottom:'1.75rem' }}>
                <span style={{ color:T.primary }}>Vende más</span><br />
                <span style={{ color:T.primary }}>con </span>
                <span style={{ background:`linear-gradient(135deg,${T.electric},#0284C7,#7C3AED)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  Inteligencia.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} style={{ fontSize:'1.15rem', color:'#475569', lineHeight:1.75, marginBottom:'2.75rem', maxWidth:520 }}>
                La infraestructura conversacional que transforma cada chat de WhatsApp en una oportunidad de negocio cerrada, documentada y escalable.
              </motion.p>

              <motion.div variants={fadeUp} style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                <Link to="/login" className="cta-main" style={{ textDecoration:'none', padding:'1.1rem 2.4rem', background:`linear-gradient(135deg,${T.electric},#0284C7)`, color:'#fff', borderRadius:16, fontWeight:700, fontSize:'1rem', display:'flex', alignItems:'center', gap:'.6rem', transition:'transform .3s' }}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04) translateY(-3px)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                  Prueba Gratis <ArrowRight size={18} />
                </Link>
                <Link to="/sistemas" style={{ textDecoration:'none', padding:'1.1rem 2.2rem', background:`${T.glass}`, backdropFilter:'blur(12px)', color:T.primary, borderRadius:16, fontWeight:700, border:`1px solid ${T.border}`, transition:'all .3s' }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.02)';e.currentTarget.style.background='#fff'}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.background=T.glass}}>
                  Ver Sistemas
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} style={{ display:'flex', gap:'1.25rem', marginTop:'2rem', flexWrap:'wrap' }}>
                {['Sin tarjeta de crédito','Setup en 2 min','Cancela cuando quieras'].map(t=>(
                  <span key={t} style={{ display:'flex', alignItems:'center', gap:'.4rem', color:'#0284C7', fontWeight:600, fontSize:'.8rem' }}>
                    <CheckCircle2 size={14} /> {t}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* ── Right – Mockup + floating status ── */}
            <motion.div initial={{ opacity:0, x:50, rotateY:-8 }} animate={{ opacity:1, x:0, rotateY:0 }} transition={{ duration:.9, ease:'easeOut' }} style={{ position:'relative', perspective:1000 }}>
              <div style={{ background:`${T.glass}`, backdropFilter:'blur(20px)', borderRadius:32, padding:'1.1rem', border:`1px solid ${T.border}`, boxShadow:'0 32px 80px rgba(14,165,233,.12)' }}>
                <img src="/dashboard_mockup.png" alt="GeoChat Dashboard" style={{ width:'100%', borderRadius:24, display:'block' }} />
              </div>

              {/* Floating glassmorphism status card */}
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.7 }}
                style={{ position:'absolute', bottom:-18, left:-28, background:'rgba(255,255,255,.88)', backdropFilter:'blur(18px)', borderRadius:20, padding:'1rem 1.3rem', border:`1px solid ${T.border}`, boxShadow:'0 12px 40px rgba(14,165,233,.1)', minWidth:196 }}>
                <p style={{ fontSize:'.68rem', fontWeight:800, color:T.electric, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'.6rem' }}>Estado del Sistema</p>
                {[{ label:'WhatsApp API', ok:status.wa },{ label:'Ngrok Tunnel', ok:status.ngrok }].map(s=>(
                  <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.4rem' }}>
                    <Pulse color={s.ok?'#10B981':'#EF4444'} size={9} />
                    <span style={{ fontSize:'.8rem', fontWeight:600, color:'#334155', flex:1 }}>{s.label}</span>
                    <span style={{ fontSize:'.72rem', fontWeight:800, color:s.ok?'#10B981':'#EF4444' }}>{s.ok?'Online':'Offline'}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      <Marquee />

      {/* ══ STATS ══ */}
      <section style={{ padding:'5rem 1.5rem', background:'#fff' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true, margin:'-60px' }} variants={stagger}
            style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1.25rem' }}>
            {[
              { v:'+1M', l:'Mensajes procesados', icon:<MessageSquare size={20}/>, c:'#0EA5E9' },
              { v:'99.9%', l:'Uptime garantizado', icon:<Shield size={20}/>, c:'#10B981' },
              { v:'<2ms', l:'Latencia motor IA', icon:<Zap size={20}/>, c:'#8B5CF6' },
              { v:'24/7', l:'Soporte humano', icon:<Headphones size={20}/>, c:'#F59E0B' },
            ].map(s=>(
              <motion.div key={s.l} variants={fadeUp}
                style={{ background:T.bg, borderRadius:T.radius, padding:'2.25rem 2rem', border:`1px solid ${T.border}`, textAlign:'center' }}
                whileHover={{ scale:1.04, y:-8, boxShadow:`0 20px 50px ${s.c}20` }}>
                <AnimIcon icon={s.icon} color={s.c} size={52} />
                <h3 style={{ fontSize:'2.4rem', fontWeight:800, color:T.primary, letterSpacing:'-.03em', margin:'1rem 0 .2rem' }}>{s.v}</h3>
                <p style={{ color:'#64748B', fontWeight:500, fontSize:'.88rem' }}>{s.l}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ BENTO GRID ══ */}
      <section style={{ padding:'5rem 1.5rem 6rem', background:'linear-gradient(180deg,#F8FAFF,#F0F9FF)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger} style={{ textAlign:'center', marginBottom:'3.5rem' }}>
            <motion.span variants={fadeUp} style={{ color:T.electric, fontWeight:700, fontSize:'.8rem', letterSpacing:'.18em', textTransform:'uppercase' }}>PODER SIN LÍMITES</motion.span>
            <motion.h2 variants={fadeUp} style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:800, color:T.primary, marginTop:'.6rem', letterSpacing:'-.03em' }}>
              Todo lo que necesitas<br/>en un solo lugar.
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger}
            className="bento-grid"
            style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gridTemplateRows:'260px 260px', gap:'1.25rem' }}>

            {/* Wide – Automation */}
            <motion.div variants={fadeUp} className="bento-wide" style={{ gridColumn:'span 2', background:`${T.glass}`, backdropFilter:'blur(14px)', borderRadius:T.radius, padding:'2.5rem', border:`1px solid ${T.border}`, display:'flex', flexDirection:'column' }}
              whileHover={{ scale:1.015, boxShadow:'0 24px 60px rgba(14,165,233,.1)', y:-5 }}>
              <AnimIcon icon={<Workflow size={24}/>} color={T.electric} />
              <h3 style={{ fontSize:'1.3rem', fontWeight:800, color:T.primary, margin:'1.25rem 0 .5rem' }}>Motor de Automatización</h3>
              <p style={{ color:'#64748B', fontSize:'.9rem', lineHeight:1.6 }}>Flujos que trabajan solos. Califica leads y asigna agentes en milisegundos.</p>
              <LiveBars color={T.electric} />
            </motion.div>

            {/* Tall – AI */}
            <motion.div variants={fadeUp} className="bento-tall" style={{ gridRow:'span 2', background:`linear-gradient(180deg,${T.primary},#0284C7)`, borderRadius:T.radius, padding:'2.5rem', display:'flex', flexDirection:'column', justifyContent:'space-between' }}
              whileHover={{ scale:1.015, y:-5 }}>
              <div>
                <AnimIcon icon={<Bot size={24}/>} color="#38BDF8" bg="rgba(255,255,255,.12)" />
                <h3 style={{ fontSize:'1.4rem', fontWeight:800, color:'#fff', margin:'1.25rem 0 .75rem' }}>IA Neural</h3>
                <p style={{ color:'rgba(255,255,255,.72)', fontSize:'.9rem', lineHeight:1.7 }}>Aprende de tu negocio. Integración con GPT-4 y Claude 3 para respuestas que cierran ventas.</p>
              </div>
              <div style={{ background:'rgba(255,255,255,.07)', borderRadius:16, padding:'1.25rem' }}>
                {[['Contexto real','98%'],['Conversión','↑ 42%'],['Latencia','<1.2s']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:'.55rem', fontSize:'.82rem' }}>
                    <span style={{ color:'rgba(255,255,255,.65)' }}>{k}</span>
                    <span style={{ color:'#38BDF8', fontWeight:800 }}>{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Small – Speed */}
            <motion.div variants={fadeUp} style={{ background:`${T.glass}`, backdropFilter:'blur(14px)', borderRadius:T.radius, padding:'2.5rem', border:`1px solid ${T.border}` }}
              whileHover={{ scale:1.02, boxShadow:'0 20px 50px rgba(245,158,11,.12)', y:-5 }}>
              <AnimIcon icon={<Zap size={22}/>} color="#F59E0B" />
              <h3 style={{ fontSize:'1.15rem', fontWeight:800, color:T.primary, margin:'1rem 0 .4rem' }}>Flash Response</h3>
              <p style={{ color:'#64748B', fontSize:'.88rem', lineHeight:1.6 }}>Atiende cientos en paralelo sin fricción ni demoras.</p>
            </motion.div>

            {/* Small – Team */}
            <motion.div variants={fadeUp} style={{ background:`${T.glass}`, backdropFilter:'blur(14px)', borderRadius:T.radius, padding:'2.5rem', border:`1px solid ${T.border}` }}
              whileHover={{ scale:1.02, boxShadow:'0 20px 50px rgba(16,185,129,.12)', y:-5 }}>
              <AnimIcon icon={<Users size={22}/>} color="#10B981" />
              <h3 style={{ fontSize:'1.15rem', fontWeight:800, color:T.primary, margin:'1rem 0 .4rem' }}>Multi-Agente Pro</h3>
              <p style={{ color:'#64748B', fontSize:'.88rem', lineHeight:1.6 }}>Todo tu equipo sobre el mismo número WhatsApp.</p>
            </motion.div>

            {/* Wide – Analytics */}
            <motion.div variants={fadeUp} className="bento-wide" style={{ gridColumn:'span 2', background:`${T.glass}`, backdropFilter:'blur(14px)', borderRadius:T.radius, padding:'2.5rem', border:`1px solid ${T.border}`, display:'flex', flexDirection:'column' }}
              whileHover={{ scale:1.015, boxShadow:'0 24px 60px rgba(239,68,68,.08)', y:-5 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <AnimIcon icon={<TrendingUp size={24}/>} color="#EF4444" />
                  <h3 style={{ fontSize:'1.3rem', fontWeight:800, color:T.primary, margin:'1.1rem 0 .4rem' }}>Analytics en Vivo</h3>
                  <p style={{ color:'#64748B', fontSize:'.9rem' }}>Métricas de cada conversación en tiempo real.</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontSize:'2rem', fontWeight:800, color:'#EF4444', lineHeight:1 }}>↑ 38%</p>
                  <p style={{ fontSize:'.72rem', color:'#64748B', fontWeight:600 }}>vs mes anterior</p>
                </div>
              </div>
              <LiveBars color="#EF4444" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section style={{ padding:'5rem 1.5rem', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <motion.h2 initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
            style={{ textAlign:'center', fontSize:'2.4rem', fontWeight:800, color:T.primary, marginBottom:'3rem' }}>
            Lo que dicen nuestros clientes.
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger}
            style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(380px,1fr))', gap:'1.5rem' }}>
            {[
              { text:'"GeoChat cambió nuestra operación. Cerramos 40% más oportunidades desde el primer mes."', name:'Alejandro Rivera', role:'Director Comercial @ InnovaGroup' },
              { text:'"La IA nos salvó. Un agente ahora hace el trabajo de tres personas con mejor calidad."', name:'María González', role:'CEO @ TechStartup MX' },
            ].map(t=>(
              <motion.div key={t.name} variants={fadeUp}
                style={{ background:T.bg, borderRadius:T.radius, padding:'2.75rem', border:`1px solid ${T.border}` }}
                whileHover={{ scale:1.02, boxShadow:'0 20px 50px rgba(14,165,233,.08)', y:-5 }}>
                <div style={{ display:'flex', gap:'.25rem', marginBottom:'1.25rem' }}>
                  {[...Array(5)].map((_,i)=><Star key={i} size={16} fill="#F59E0B" color="#F59E0B"/>)}
                </div>
                <p style={{ fontSize:'1.05rem', color:'#334155', lineHeight:1.75, fontStyle:'italic', marginBottom:'1.75rem' }}>{t.text}</p>
                <div style={{ display:'flex', alignItems:'center', gap:'.875rem' }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:`linear-gradient(135deg,${T.electric},#7C3AED)` }} />
                  <div>
                    <p style={{ fontWeight:700, color:T.primary, fontSize:'.9rem' }}>{t.name}</p>
                    <p style={{ fontSize:'.78rem', color:'#64748B' }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding:'5rem 1.5rem 6rem', background:'linear-gradient(135deg,#F0F9FF,#E0F2FE)' }}>
        <motion.div initial={{ opacity:0, scale:.95 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true }}
          style={{ maxWidth:860, margin:'0 auto', textAlign:'center', background:`linear-gradient(135deg,${T.primary},#0284C7)`, borderRadius:40, padding:'5rem 2.5rem', boxShadow:'0 40px 100px rgba(14,165,233,.25)' }}>
          <h2 style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:800, color:'#fff', marginBottom:'1.25rem' }}>
            ¿Listo para escalar?
          </h2>
          <p style={{ color:'rgba(255,255,255,.72)', fontSize:'1.1rem', marginBottom:'2.75rem', maxWidth:480, margin:'0 auto 2.75rem' }}>
            Únete a las empresas que ya están cerrando más ventas con GeoChat.
          </p>
          <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:'.75rem', textDecoration:'none', padding:'1.1rem 2.8rem', background:'#fff', color:'#0284C7', borderRadius:16, fontWeight:800, fontSize:'1.05rem', boxShadow:'0 8px 30px rgba(0,0,0,.15)', transition:'all .3s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            Comenzar Ahora <ArrowRight size={20}/>
          </Link>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
