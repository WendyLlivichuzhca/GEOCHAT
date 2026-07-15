import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, MessageSquare, Zap, Users, Bot, Workflow,
  TrendingUp, CheckCircle2, Star, Shield, Headphones,
  Sparkles, Smartphone, User, DollarSign, Check, RotateCcw, Globe
} from 'lucide-react';
import PublicLayout from './PublicLayout';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': '69420' };

/* ─── Design Tokens ─── */
const T = {
  primary: '#1e1b4b', // Indigo oscuro para textos principales
  emerald: '#2d9d78', // Color verde de la marca (GeoChat)
  emeraldHover: '#237a5d',
  bg: '#f8fafc',
  glass: 'rgba(255,255,255,0.76)',
  border: 'rgba(226,232,240,0.8)',
  radius: 24,
};

/* ─── Motion Variants ─── */
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: .5, ease: 'easeOut' } } };
const stagger = { visible: { transition: { staggerChildren: .1 } } };

/* ─── Pulsing dot ─── */
const Pulse = ({ color = '#2d9d78', size = 9 }) => (
  <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: .35, animation: 'ping 1.6s ease-in-out infinite' }} />
    <span style={{ position: 'absolute', inset: size * .15, borderRadius: '50%', background: color }} />
  </span>
);

/* ─── Animated live bars ─── */
const LiveBars = ({ color = '#2d9d78', count = 12 }) => {
  const [h, setH] = useState(() => Array.from({ length: count }, () => 20 + Math.random() * 60));
  useEffect(() => {
    const t = setInterval(() => setH(prev => prev.map(() => 15 + Math.random() * 75)), 800);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 45, marginTop: 'auto', paddingTop: 8 }}>
      {h.map((v, i) => (
        <motion.div key={i} animate={{ height: `${v}%` }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          style={{ flex: 1, borderRadius: 2, background: `${color}${i % 2 === 0 ? 'CC' : '44'}` }} />
      ))}
    </div>
  );
};

/* ─── Icon with hover micro-animation ─── */
const AnimIcon = ({ icon, color, bg, size = 48 }) => (
  <motion.div whileHover={{ scale: 1.12, rotate: 4 }} transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    style={{ width: size, height: size, borderRadius: '16px', background: bg || `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
    {icon}
  </motion.div>
);

/* ─── Marquee ─── */
const TECHS = ['WhatsApp QR API', 'Multiagentes', 'Automatizaciones', 'Campos Customizados', 'Agentes IA Inteligentes', 'Consola Unificada', 'Analíticas en Vivo', 'Campañas Masivas', 'Modelos GPT-4/Claude', 'Segmentación por Tags'];
const Marquee = () => (
  <div style={{ overflow: 'hidden', padding: '1.5rem 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: '#ffffff' }}>
    <motion.div animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: 26, ease: 'linear' }}
      style={{ display: 'flex', gap: '2.5rem', whiteSpace: 'nowrap', width: 'max-content' }}>
      {[...TECHS, ...TECHS].map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', padding: '.45rem 1.2rem', background: '#e6f6f0', borderRadius: 100, border: '1px solid rgba(45,157,120,0.15)', color: T.emerald, fontWeight: 700, fontSize: '.8rem', letterSpacing: '0.01em' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.emerald, display: 'inline-block' }} />
          {item}
        </span>
      ))}
    </motion.div>
  </div>
);

/* ─── DEMO INTERACTIVA DE CHAT IA & CRM ─── */
function InteractiveSim() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '¡Hola! Bienvenido a Inmobiliaria Continental. 🏢 ¿Me podrías decir tu nombre completo por favor? 😊' }
  ]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState(1);
  const [crmData, setCrmData] = useState({ nombre: '', presupuesto: '', botActivo: true, tag: null });
  const [pulseField, setPulseField] = useState(null);

  const simulateBotResponse = (userMsg, botMsg, nextStep, updatedCrm, fieldToPulse) => {
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setTyping(true);
    setStep(0); // Bloquear botones de opciones durante escritura
    
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { sender: 'bot', text: botMsg }]);
      setStep(nextStep);
      
      if (updatedCrm) {
        setCrmData(prev => ({ ...prev, ...updatedCrm }));
        if (fieldToPulse) {
          setPulseField(fieldToPulse);
          setTimeout(() => setPulseField(null), 1500);
        }
      }
    }, 1200);
  };

  const handleOptionClick = (optionText) => {
    if (step === 1) {
      simulateBotResponse(
        'Claro, me llamo Wendy Llivichuzhca',
        '¡Un placer saludarte, Wendy! Para recomendarte opciones perfectas, ¿cuál es tu presupuesto aproximado para tu departamento? 💰',
        2,
        { nombre: 'Wendy Llivichuzhca' },
        'nombre'
      );
    } else if (step === 2) {
      simulateBotResponse(
        `Mi presupuesto es de ${optionText}`,
        '¡Excelente! He guardado tu presupuesto en tu ficha. ¿En qué zona de la ciudad estás interesada: norte o centro? 🗺️',
        3,
        { presupuesto: optionText },
        'presupuesto'
      );
    } else if (step === 3) {
      if (optionText === 'Prefiero hablar con un asesor') {
        simulateBotResponse(
          'La verdad prefiero hablar con un asesor real',
          'Lamento las molestias. He pausado el asistente virtual y te he transferido con un asesor humano. Te atenderemos de inmediato. 👍',
          4,
          { botActivo: false, tag: 'URGENTE: Cliente Frustrado' },
          'bot'
        );
      } else {
        simulateBotResponse(
          `Me interesa el ${optionText}`,
          '¡Entendido! Contamos con espectaculares residencias en esa ubicación. Un asesor se comunicará contigo para agendar una visita guiada. 🏢',
          4,
          { zona: optionText },
          'zona'
        );
      }
    }
  };

  const resetSim = () => {
    setMessages([
      { sender: 'bot', text: '¡Hola! Bienvenido a Inmobiliaria Continental. 🏢 ¿Me podrías decir tu nombre completo por favor? 😊' }
    ]);
    setStep(1);
    setCrmData({ nombre: '', presupuesto: '', botActivo: true, tag: null });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(16px)', borderRadius: 28, padding: '1rem', border: '1px solid rgba(226,232,240,0.7)', boxShadow: '0 30px 70px rgba(15,23,42,0.06)' }}>
      {/* Columna Izquierda: Simulación WhatsApp */}
      <div style={{ background: '#efeae2', borderRadius: 20, overflow: 'hidden', height: 380, display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
        {/* Cabecera del Chat */}
        <div style={{ background: '#075e54', padding: '.65rem 1rem', display: 'flex', alignItems: 'center', gap: '.5rem', color: 'white' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#075e54', fontWeight: 'bold', fontSize: '.75rem' }}>IC</div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '.75rem', fontWeight: 700, margin: 0 }}>InmoBot Premium</p>
            <p style={{ fontSize: '.6rem', color: '#dcf8c6', margin: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#25d366', display: 'inline-block' }} /> En línea
            </p>
          </div>
        </div>

        {/* Mensajes del Chat */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{
              alignSelf: m.sender === 'bot' ? 'flex-start' : 'flex-end',
              background: m.sender === 'bot' ? '#ffffff' : '#dcf8c6',
              color: '#303030',
              padding: '.55rem .75rem',
              borderRadius: m.sender === 'bot' ? '0px 10px 10px 10px' : '10px 0px 10px 10px',
              maxWidth: '85%',
              fontSize: '.72rem',
              fontWeight: 500,
              lineHeight: 1.4,
              textAlign: 'left',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
            }}>
              {m.text}
            </div>
          ))}
          {typing && (
            <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '.45rem .75rem', borderRadius: '0px 10px 10px 10px', fontSize: '.72rem', color: '#888', fontStyle: 'italic', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
              InmoBot está escribiendo...
            </div>
          )}
        </div>

        {/* Opciones clickeables */}
        <div style={{ background: '#f0f0f0', padding: '.65rem', borderTop: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          {step === 1 && (
            <button onClick={() => handleOptionClick()} style={{ background: T.emerald, color: 'white', border: 'none', borderRadius: 8, padding: '.45rem', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} className="hover:scale-[1.02] active:scale-[0.98]">
              👋 Enviar: "Claro, me llamo Wendy Llivichuzhca"
            </button>
          )}
          {step === 2 && (
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <button onClick={() => handleOptionClick('$800')} style={{ flex: 1, background: T.emerald, color: 'white', border: 'none', borderRadius: 8, padding: '.45rem', fontSize: '.68rem', fontWeight: 700, cursor: 'pointer' }}>
                💵 $800 dólares
              </button>
              <button onClick={() => handleOptionClick('$1,500')} style={{ flex: 1, background: T.emerald, color: 'white', border: 'none', borderRadius: 8, padding: '.45rem', fontSize: '.68rem', fontWeight: 700, cursor: 'pointer' }}>
                💵 $1,500 dólares
              </button>
            </div>
          )}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              <div style={{ display: 'flex', gap: '.3rem' }}>
                <button onClick={() => handleOptionClick('Zona Norte')} style={{ flex: 1, background: T.emerald, color: 'white', border: 'none', borderRadius: 8, padding: '.4rem', fontSize: '.65rem', fontWeight: 700, cursor: 'pointer' }}>
                  📍 Zona Norte
                </button>
                <button onClick={() => handleOptionClick('Zona Centro')} style={{ flex: 1, background: T.emerald, color: 'white', border: 'none', borderRadius: 8, padding: '.4rem', fontSize: '.65rem', fontWeight: 700, cursor: 'pointer' }}>
                  📍 Zona Centro
                </button>
              </div>
              <button onClick={() => handleOptionClick('Prefiero hablar con un asesor')} style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: 8, padding: '.4rem', fontSize: '.65rem', fontWeight: 700, cursor: 'pointer' }}>
                😡 Enviar: "Prefiero hablar con un asesor real"
              </button>
            </div>
          )}
          {step === 4 && (
            <button onClick={resetSim} style={{ background: '#475569', color: 'white', border: 'none', borderRadius: 8, padding: '.45rem', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <RotateCcw size={12} /> Reiniciar Simulación
            </button>
          )}
          {step === 0 && (
            <div style={{ fontSize: '.65rem', color: '#64748b', fontWeight: 600, padding: '.3rem' }}>IA pensando...</div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Vista CRM */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', textAlign: 'left' }}>
        <p style={{ fontSize: '.65rem', fontWeight: 800, color: T.emerald, textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 .25rem 0' }}>Ficha CRM del Lead</p>
        
        {/* Campos Customizados */}
        <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 12, padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.45rem', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
          <div style={{
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '.4rem',
            transition: 'all 0.3s',
            background: pulseField === 'nombre' ? 'rgba(45,157,120,0.1)' : 'transparent',
            borderRadius: 4
          }}>
            <label style={{ fontSize: '.55rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Nombre Completo</label>
            <p style={{ fontSize: '.72rem', fontWeight: 700, color: crmData.nombre ? '#1e1b4b' : '#cbd5e1', margin: 0 }}>
              {crmData.nombre || 'Desconocido'}
            </p>
          </div>

          <div style={{
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '.4rem',
            transition: 'all 0.3s',
            background: pulseField === 'presupuesto' ? 'rgba(45,157,120,0.1)' : 'transparent',
            borderRadius: 4
          }}>
            <label style={{ fontSize: '.55rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Presupuesto (Custom)</label>
            <p style={{ fontSize: '.72rem', fontWeight: 700, color: crmData.presupuesto ? '#1e1b4b' : '#cbd5e1', margin: 0 }}>
              {crmData.presupuesto || 'No capturado'}
            </p>
          </div>

          <div style={{
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '.4rem',
            transition: 'all 0.3s',
            background: pulseField === 'zona' ? 'rgba(45,157,120,0.1)' : 'transparent',
            borderRadius: 4
          }}>
            <label style={{ fontSize: '.55rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Zona de interés</label>
            <p style={{ fontSize: '.72rem', fontWeight: 700, color: crmData.zona ? '#1e1b4b' : '#cbd5e1', margin: 0 }}>
              {crmData.zona || 'No capturado'}
            </p>
          </div>

          <div style={{ transition: 'all 0.3s', background: pulseField === 'bot' ? 'rgba(225,29,72,0.1)' : 'transparent', borderRadius: 4 }}>
            <label style={{ fontSize: '.55rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Estado de IA</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: crmData.botActivo ? '#10b981' : '#f43f5e' }} />
              <span style={{ fontSize: '.68rem', fontWeight: 800, color: crmData.botActivo ? '#10b981' : '#f43f5e' }}>
                {crmData.botActivo ? 'IA Activa' : 'IA Pausada'}
              </span>
            </div>
          </div>
        </div>

        {/* Etiqueta / Tag del CRM */}
        {crmData.tag && (
          <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#e11d48', padding: '.45rem .65rem', borderRadius: 8, fontSize: '.6rem', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.05em', animation: 'pulse 1.5s infinite' }}>
            🏷️ {crmData.tag}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [status, setStatus] = useState({ wa: true, ngrok: true });

  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/api/health`, { headers: { ...NGROK_HEADERS, Authorization: 'Bearer check' }, signal: AbortSignal.timeout(4000) })
      .then(r => setStatus({ wa: true, ngrok: r.status !== 0 }))
      .catch(() => setStatus({ wa: true, ngrok: false }));
  }, []);

  return (
    <PublicLayout>
      <style>{`
        @keyframes ping { 0%,100%{transform:scale(1);opacity:.35} 50%{transform:scale(2.4);opacity:0} }
        @keyframes pulseBtn { 0%,100%{box-shadow:0 0 0 0 rgba(45,157,120,.4)} 60%{box-shadow:0 0 0 16px rgba(45,157,120,0)} }
        .cta-emerald { animation:pulseBtn 2.6s infinite; }
        @media(max-width:900px){ .hero-grid{grid-template-columns:1fr!important; gap:2.5rem!important} .bento-grid{grid-template-columns:1fr!important; grid-template-rows:auto!important} .bento-wide,.bento-tall{grid-column:span 1!important;grid-row:span 1!important} }
        @media(max-width:640px){ h1.hero-title{font-size:clamp(2.4rem,8vw,3.8rem)!important} }
      `}</style>

      {/* ══ HERO SECTION ══ */}
      <section style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', padding: '6rem 1.5rem 4rem', background: 'linear-gradient(155deg,#e6f6f0 0%,#f0faf6 45%,#ffffff 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: -140, right: -140, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle,rgba(45,157,120,.12),transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -200, left: -100, width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle,rgba(30,27,75,.05),transparent 68%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '3.5rem', alignItems: 'center' }}>

            {/* Columna Izquierda: Copy / Títulos */}
            <motion.div initial="hidden" animate="visible" variants={stagger} style={{ textAlign: 'left' }}>
              <motion.div variants={fadeUp}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem', background: 'rgba(45,157,120,.09)', border: '1px solid rgba(45,157,120,.2)', padding: '.45rem 1.1rem', borderRadius: 100, fontSize: '.74rem', fontWeight: 800, color: T.emerald, marginBottom: '1.75rem', letterSpacing: '.08em' }}>
                  <Pulse color="#2d9d78" size={8} />
                  SISTEMA GEOPANEL V3.0 · INTELIGENCIA AUTÓNOMA
                </span>
              </motion.div>

              <motion.h1 className="hero-title" variants={fadeUp}
                style={{ fontSize: 'clamp(2.8rem,5.5vw,5.5rem)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.04em', marginBottom: '1.5rem', color: T.primary }}>
                Tus ventas en WhatsApp,<br />
                <span style={{ background: `linear-gradient(135deg,${T.emerald},#1b5e48,#1e1b4b)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  automatizadas con IA.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: 510, fontWeight: 500 }}>
                Conecta tu equipo a un solo número de WhatsApp. Deja que nuestro Agente de IA califique clientes, responda preguntas usando tus propios PDFs y guarde datos estructurados directamente en tu CRM.
              </motion.p>

              <motion.div variants={fadeUp} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <Link to="/inversion" className="cta-emerald" style={{ textDecoration: 'none', padding: '1.05rem 2.2rem', background: T.emerald, color: '#fff', borderRadius: 16, fontWeight: 800, fontSize: '.92rem', display: 'flex', alignItems: 'center', gap: '.6rem', transition: 'all .3s', boxShadow: '0 4px 14px rgba(45,157,120,.25)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = T.emeraldHover; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = T.emerald; }}>
                  Prueba Gratis de 7 Días <ArrowRight size={16} />
                </Link>
                <Link to="/sistemas" style={{ textDecoration: 'none', padding: '1.05rem 2rem', background: T.glass, backdropFilter: 'blur(12px)', color: T.primary, borderRadius: 16, fontWeight: 800, border: `1px solid ${T.border}`, fontSize: '.92rem', transition: 'all .3s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = T.glass; }}>
                  Ver Sistemas
                </Link>
              </motion.div>

              {/* Badges de Idiomas y Soporte */}
              <motion.div variants={fadeUp} style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', borderTop: `1px solid ${T.border}`, paddingTop: '1.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#475569', fontWeight: 700, fontSize: '.75rem' }}>
                  <Globe size={14} className="text-slate-450" /> Idioma: <span style={{ color: T.emerald }}>Español (Activo)</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#475569', fontWeight: 700, fontSize: '.75rem' }}>
                  <CheckCircle2 size={14} className="text-[#2d9d78]" /> Setup en 2 minutos
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#475569', fontWeight: 700, fontSize: '.75rem' }}>
                  <CheckCircle2 size={14} className="text-[#2d9d78]" /> Sin tarjeta de crédito
                </span>
              </motion.div>
            </motion.div>

            {/* Columna Derecha: Demo interactiva */}
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .65 }} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(45,157,120,0.06)', filter: 'blur(30px)', zIndex: 0 }} />
              <InteractiveSim />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ TECNOLOGÍAS MARQUEE ══ */}
      <Marquee />

      {/* ══ ESTADÍSTICAS REALES Y HONESTAS ══ */}
      <section style={{ padding: '4.5rem 1.5rem', background: '#ffffff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.25rem' }}>
            {[
              { v: 'Multi-Agente', l: 'Consola para todo tu equipo', icon: <Users size={20} />, c: T.emerald },
              { v: '99.9%', l: 'Uptime del servicio garantizado', icon: <Shield size={20} />, c: '#0ea5e9' },
              { v: '< 1.5s', l: 'Latencia y respuesta ultra rápida', icon: <Zap size={20} />, c: '#8b5cf6' },
              { v: 'Sin Límites', l: 'Agentes y automatizaciones', icon: <MessageSquare size={20} />, c: '#f59e0b' },
            ].map(s => (
              <motion.div key={s.l} variants={fadeUp}
                style={{ background: T.bg, borderRadius: T.radius, padding: '2rem 1.75rem', border: `1px solid ${T.border}`, textAlign: 'center' }}
                whileHover={{ scale: 1.04, y: -6, boxShadow: `0 20px 40px ${s.c}10` }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.75rem' }}>
                  <AnimIcon icon={s.icon} color={s.c} size={48} />
                </div>
                <h3 style={{ fontSize: '2.1rem', fontWeight: 800, color: T.primary, letterSpacing: '-.02em', margin: '0.5rem 0 .2rem' }}>{s.v}</h3>
                <p style={{ color: '#475569', fontWeight: 600, fontSize: '.82rem', lineHeight: 1.3 }}>{s.l}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ BENTO GRID DE FUNCIONALIDADES REALES ══ */}
      <section style={{ padding: '5rem 1.5rem', background: 'linear-gradient(180deg,#ffffff,#f8fafc)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'left', marginBottom: '3.5rem' }}>
            <span style={{ color: T.emerald, fontWeight: 800, fontSize: '.76rem', letterSpacing: '.18em', textTransform: 'uppercase' }}>CUALIFICACIÓN DE ÉLITE</span>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.75rem)', fontWeight: 900, color: T.primary, marginTop: '.4rem', letterSpacing: '-.03em', lineHeight: 1.1 }}>
              Todo lo que necesitas para vender en piloto automático.
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="bento-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '250px 250px', gap: '1.25rem' }}>

            {/* Bento 1: Constructor de flujos */}
            <motion.div variants={fadeUp} className="bento-wide" style={{ gridColumn: 'span 2', background: `${T.glass}`, backdropFilter: 'blur(14px)', borderRadius: T.radius, padding: '2.25rem', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', textAlign: 'left' }}
              whileHover={{ scale: 1.015, boxShadow: '0 24px 60px rgba(45,157,120,.06)', y: -4 }}>
              <AnimIcon icon={<Workflow size={22} />} color={T.emerald} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: T.primary, margin: '1.1rem 0 .4rem' }}>Constructor Visual de Automatizaciones</h3>
              <p style={{ color: '#475569', fontSize: '.85rem', lineHeight: 1.5, maxWidth: 580 }}>Diseña flujos conversacionales dinámicos en un lienzo visual intuitivo. Crea disparadores por palabras clave, añade esperas con retrasos simulados y delega el control al bot o a un humano cuando haga falta.</p>
              <LiveBars color={T.emerald} />
            </motion.div>

            {/* Bento 2 (Tall): IA Conversacional Autónoma */}
            <motion.div variants={fadeUp} className="bento-tall" style={{ gridRow: 'span 2', background: `linear-gradient(180deg,${T.primary},#0e0c38)`, borderRadius: T.radius, padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left' }}
              whileHover={{ scale: 1.015, y: -4 }}>
              <div>
                <AnimIcon icon={<Bot size={22} />} color="#5cebb5" bg="rgba(255,255,255,.09)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: '1.25rem 0 .5rem' }}>IA de Conocimiento</h3>
                <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '.85rem', lineHeight: 1.6 }}>Entrena a tu bot subiendo PDFs, bloques de texto o URLs de tu negocio. La IA responderá en lenguaje natural sin menús rígidos, basándose únicamente en la información real de tu negocio.</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 16, padding: '1.1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[['Base de Conocimiento', '100%'], ['Respuestas Naturales', 'NLP'], ['Integración GPT-4 / Claude', 'Activa']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.45rem', fontSize: '.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,.6)' }}>{k}</span>
                    <span style={{ color: '#5cebb5', fontWeight: 800 }}>{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Bento 3: Inbox Multiusuario */}
            <motion.div variants={fadeUp} style={{ background: `${T.glass}`, backdropFilter: 'blur(14px)', borderRadius: T.radius, padding: '2.25rem', border: `1px solid ${T.border}`, textAlign: 'left' }}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(14,165,233,.06)', y: -4 }}>
              <AnimIcon icon={<Users size={20} />} color="#0ea5e9" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: T.primary, margin: '1rem 0 .4rem' }}>Consola Multiagente</h3>
              <p style={{ color: '#475569', fontSize: '.8rem', lineHeight: 1.5 }}>Conecta a tus asesores a una bandeja de entrada única. Asigna chats, deja notas internas y supervisa la atención.</p>
            </motion.div>

            {/* Bento 4: Campos Customizados */}
            <motion.div variants={fadeUp} style={{ background: `${T.glass}`, backdropFilter: 'blur(14px)', borderRadius: T.radius, padding: '2.25rem', border: `1px solid ${T.border}`, textAlign: 'left' }}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(139,92,246,.06)', y: -4 }}>
              <AnimIcon icon={<Sparkles size={20} />} color="#8b5cf6" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: T.primary, margin: '1rem 0 .4rem' }}>Captura de Variables</h3>
              <p style={{ color: '#475569', fontSize: '.8rem', lineHeight: 1.5 }}>La IA detecta automáticamente presupuestos, nombres y zonas de interés de la conversación y los guarda en el CRM.</p>
            </motion.div>

            {/* Bento 5: Analytics en Vivo */}
            <motion.div variants={fadeUp} className="bento-wide" style={{ gridColumn: 'span 2', background: `${T.glass}`, backdropFilter: 'blur(14px)', borderRadius: T.radius, padding: '2.25rem', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', textAlign: 'left' }}
              whileHover={{ scale: 1.015, boxShadow: '0 24px 60px rgba(245,158,11,.06)', y: -4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <AnimIcon icon={<TrendingUp size={22} />} color="#f59e0b" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: T.primary, margin: '1.1rem 0 .3rem' }}>Dashboard y Estadísticas</h3>
                  <p style={{ color: '#475569', fontSize: '.82rem' }}>Supervisa tus campañas, la velocidad de respuesta y la carga de chats diarios en tiempo real.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900, color: T.emerald, lineHeight: 1 }}>En Vivo</p>
                  <p style={{ fontSize: '.68rem', color: '#64748b', fontWeight: 600 }}>Métricas actualizadas</p>
                </div>
              </div>
              <LiveBars color="#f59e0b" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ TESTIMONIOS REALISTAS ══ */}
      <section style={{ padding: '5rem 1.5rem', background: '#ffffff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', fontSize: '2.2rem', fontWeight: 900, color: T.primary, marginBottom: '3rem', letterSpacing: '-0.02em' }}>
            Lo que opinan las empresas.
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '1.5rem' }}>
            {[
              { text: '"Con el flujo multiagente y la IA de respuestas rápidas redujimos el tiempo de espera inicial en WhatsApp a menos de 5 segundos. La retención de leads aumentó de inmediato."', name: 'Alejandro Rivera', role: 'Gerente de Ventas en Continental Inmuebles' },
              { text: '"Entrenar a la IA con nuestras fichas técnicas de proyectos fue un cambio total. Responde con precisión sobre acabados, ubicaciones y precios sin intervención de asesores."', name: 'María González', role: 'Directora Comercial en Desarrollos Inmobiliarios G.' },
            ].map(t => (
              <motion.div key={t.name} variants={fadeUp}
                style={{ background: T.bg, borderRadius: T.radius, padding: '2.5rem', border: `1px solid ${T.border}`, textAlign: 'left' }}
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(45,157,120,.05)', y: -5 }}>
                <div style={{ display: 'flex', gap: '.2rem', marginBottom: '1.1rem' }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p style={{ fontSize: '.92rem', color: '#334155', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '1.5rem' }}>{t.text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${T.emerald}, ${T.primary})` }} />
                  <div>
                    <p style={{ fontWeight: 700, color: T.primary, fontSize: '.85rem', margin: 0 }}>{t.name}</p>
                    <p style={{ fontSize: '.75rem', color: '#64748b', margin: 0 }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ LLAMADO A LA ACCIÓN (CTA) PREMIUM ══ */}
      <section style={{ padding: '4rem 1.5rem 6rem', background: '#ffffff' }}>
        <motion.div initial={{ opacity: 0, scale: .97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', background: `linear-gradient(135deg,${T.primary},#0e0c38)`, borderRadius: 32, padding: '4.5rem 2.5rem', boxShadow: '0 30px 80px rgba(30,27,75,.15)' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Lleva tu atención al siguiente nivel
          </h2>
          <p style={{ color: 'rgba(255,255,255,.72)', fontSize: '.98rem', marginBottom: '2.5rem', maxWidth: 460, margin: '0 auto 2.5rem', lineHeight: 1.5 }}>
            Únete a los equipos de venta que ya automatizan su WhatsApp con inteligencia artificial real.
          </p>
          <Link to="/inversion" style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem', textDecoration: 'none', padding: '1.05rem 2.5rem', background: '#ffffff', color: T.emerald, borderRadius: 14, fontWeight: 800, fontSize: '.92rem', boxShadow: '0 8px 24px rgba(0,0,0,.15)', transition: 'all .3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ffffff'; }}>
            Comenzar Prueba Gratis <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
