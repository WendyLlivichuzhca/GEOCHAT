import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, MessageSquare, Zap, Users, Bot, Workflow,
  Shield, Sparkles, Smartphone, Check, HelpCircle, ChevronDown, Plus, Minus
} from 'lucide-react';
import PublicLayout from './PublicLayout';

const T = {
  primary: '#0f172a',    // Slate 900 (Textos oscuros)
  secondary: '#475569',  // Slate 600 (Textos secundarios)
  emerald: '#2d9d78',    // Verde corporativo GeoChat
  emeraldHover: '#237a5d',
  bg: '#f8fafc',
  border: 'rgba(226,232,240,0.8)',
  glass: 'rgba(255,255,255,0.76)'
};

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: .5, ease: 'easeOut' } } };
const stagger = { visible: { transition: { staggerChildren: .1 } } };

/* ─── CALCULADORA INTERACTIVA DE RETORNO (ROI) ─── */
function SavingsCalculator() {
  const [chats, setChats] = useState(250);
  const [costPerHour, setCostPerHour] = useState(12);

  // Estimación honesta: la IA y los flujos resuelven el 70% de las consultas básicas. Cada chat toma ~4 minutos del tiempo de un agente.
  const hoursSaved = Math.round(((chats * 30) * 0.70 * 4) / 60);
  const savings = Math.round(hoursSaved * costPerHour);

  return (
    <div style={{ background: 'white', borderRadius: 24, padding: '2.5rem', border: `1px solid ${T.border}`, boxShadow: '0 20px 50px rgba(15,23,42,0.04)', textAlign: 'left' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Sliders */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: T.primary, marginBottom: '1.5rem' }}>Ahorro de Tiempo y Costos</h3>
          
          {/* Chats al día */}
          <div style={{ marginBottom: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
              <span style={{ fontSize: '.85rem', fontWeight: 700, color: T.secondary }}>Chats recibidos al día</span>
              <span style={{ fontSize: '.85rem', fontWeight: 850, color: T.emerald }}>{chats} chats</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="2000" 
              step="50" 
              value={chats} 
              onChange={e => setChats(Number(e.target.value))} 
              style={{ width: '100%', accentColor: T.emerald, cursor: 'pointer' }}
            />
          </div>

          {/* Costo de soporte */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
              <span style={{ fontSize: '.85rem', fontWeight: 700, color: T.secondary }}>Costo por hora de soporte/agente</span>
              <span style={{ fontSize: '.85rem', fontWeight: 850, color: T.emerald }}>${costPerHour} USD/hr</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="100" 
              step="1" 
              value={costPerHour} 
              onChange={e => setCostPerHour(Number(e.target.value))} 
              style={{ width: '100%', accentColor: T.emerald, cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Resultados */}
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Tiempo Ahorrado al Mes</label>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: T.primary, margin: 0 }}>⏰ {hoursSaved} Horas</p>
            <span style={{ fontSize: '.72rem', color: T.secondary, fontWeight: 500 }}>Delegando respuestas recurrentes a la IA</span>
          </div>

          <div>
            <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Ahorro Mensual Estimado</label>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: T.emerald, margin: 0 }}>💵 ${savings.toLocaleString()} USD</p>
            <span style={{ fontSize: '.72rem', color: T.secondary, fontWeight: 500 }}>Reduciendo la necesidad de contratar personal extra</span>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── MOCKUP INTERACTIVO DEL PRODUCTO (TABS) ─── */
function ProductConsolePreview() {
  const [tab, setTab] = useState('inbox'); // 'inbox' | 'ia' | 'flows'

  return (
    <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: 28, border: `1px solid ${T.border}`, padding: '1rem', boxShadow: '0 30px 80px rgba(15,23,42,0.06)' }}>
      {/* Tabs selectors */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '.5rem' }}>
        {[
          { id: 'inbox', label: '👥 Consola Multiagente', desc: 'Chat en equipo' },
          { id: 'ia', label: '🤖 Agente de IA', desc: 'Entrenamiento & Memoria' },
          { id: 'flows', label: '⚡ Flujos Automatizados', desc: 'Creador Visual' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: tab === t.id ? '#ffffff' : 'transparent',
              border: tab === t.id ? `1px solid #e2e8f0` : 'none',
              borderRadius: 14,
              padding: '.65rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.25s',
              textAlign: 'left',
              boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.02)' : 'none'
            }}
          >
            <p style={{ fontSize: '.8rem', fontWeight: 800, color: tab === t.id ? T.emerald : T.primary, margin: 0 }}>{t.label}</p>
            <p style={{ fontSize: '.68rem', color: T.secondary, margin: 0, fontWeight: 500 }}>{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Screen area */}
      <div style={{ background: '#ffffff', borderRadius: 20, height: 350, border: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {tab === 'inbox' && (
            <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', height: '100%' }}>
              {/* Chats Sidebar */}
              <div style={{ borderRight: '1px solid #f1f5f9', background: '#f8fafc', padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                <p style={{ fontSize: '.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', margin: '0 0 .25rem 0' }}>Bandeja compartida</p>
                <div style={{ background: '#ffffff', border: '1px solid #2d9d78', padding: '.5rem', borderRadius: 10, textAlign: 'left' }}>
                  <p style={{ fontSize: '.72rem', fontWeight: 800, color: T.primary, margin: 0 }}>Wendy Llivichuzhca</p>
                  <p style={{ fontSize: '.6rem', color: T.emerald, fontWeight: 700, margin: 0 }}>Asignado a: Carlos (Asesor)</p>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '.5rem', borderRadius: 10, textAlign: 'left', opacity: 0.7 }}>
                  <p style={{ fontSize: '.72rem', fontWeight: 800, color: T.primary, margin: 0 }}>Juan Pérez</p>
                  <p style={{ fontSize: '.6rem', color: T.secondary, margin: 0 }}>Esperando respuesta...</p>
                </div>
              </div>
              {/* Active Conversation */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', padding: '.65rem 1rem', textAlign: 'left', background: '#ffffff' }}>
                  <p style={{ fontSize: '.8rem', fontWeight: 800, color: T.primary, margin: 0 }}>Wendy Llivichuzhca</p>
                  <span style={{ fontSize: '.65rem', background: '#e6f6f0', color: T.emerald, padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>Activo · WhatsApp QR</span>
                </div>
                <div style={{ flex: 1, padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem', background: '#fcfcfc', overflowY: 'auto' }}>
                  <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '.5rem .75rem', borderRadius: 10, fontSize: '.72rem', color: T.primary, maxWidth: '80%', textAlign: 'left' }}>
                    Hola, me gustaría saber si tienen disponibilidad para soporte mañana.
                  </div>
                  {/* Private internal note (Human agents can leave internal notes invisible to customer!) */}
                  <div style={{ alignSelf: 'center', width: '90%', background: '#fffbeb', border: '1px solid #fde68a', padding: '.45rem .75rem', borderRadius: 8, fontSize: '.68rem', color: '#b45309', fontWeight: 700, textAlign: 'left' }}>
                    📝 Nota Interna (Solo asesores): Cliente prioritario, se le agendó llamada para las 10:00 AM.
                  </div>
                  <div style={{ alignSelf: 'flex-end', background: '#e6f6f0', border: '1px solid rgba(45,157,120,0.2)', padding: '.5rem .75rem', borderRadius: 10, fontSize: '.72rem', color: T.emerald, maxWidth: '80%', textAlign: 'left', fontWeight: 600 }}>
                    ¡Hola Wendy! Sí, Carlos te atenderá directamente a esa hora.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'ia' && (
            <motion.div key="ia" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ padding: '1.25rem', textAlign: 'left', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '.9rem', fontWeight: 800, color: T.primary, margin: '0 0 .25rem 0' }}>Bases de Conocimiento (Entrenamiento)</h4>
                <p style={{ fontSize: '.75rem', color: T.secondary, margin: 0 }}>Sube archivos e información corporativa para que el Agente IA responda con precisión.</p>
              </div>

              {/* Documents grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div style={{ background: '#f8fafc', border: `1px dashed ${T.emerald}`, borderRadius: 12, padding: '.75rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <div style={{ background: '#e6f6f0', padding: '6px', borderRadius: 8, color: T.emerald }}><Check size={16} /></div>
                  <div>
                    <p style={{ fontSize: '.72rem', fontWeight: 800, color: T.primary, margin: 0 }}>manual_precios.pdf</p>
                    <p style={{ fontSize: '.6rem', color: T.secondary, margin: 0 }}>1.2 MB · Entrenado exitosamente</p>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: `1px dashed ${T.emerald}`, borderRadius: 12, padding: '.75rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <div style={{ background: '#e6f6f0', padding: '6px', borderRadius: 8, color: T.emerald }}><Check size={16} /></div>
                  <div>
                    <p style={{ fontSize: '.72rem', fontWeight: 800, color: T.primary, margin: 0 }}>preguntas_frecuentes.txt</p>
                    <p style={{ fontSize: '.6rem', color: T.secondary, margin: 0 }}>45 KB · Entrenado exitosamente</p>
                  </div>
                </div>
              </div>

              {/* AI Objective Selector */}
              <div style={{ background: '#f8fafc', border: `1px solid #e2e8f0`, borderRadius: 12, padding: '.85rem' }}>
                <label style={{ fontSize: '.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '.3rem' }}>Objetivo del Agente IA</label>
                <div style={{ background: 'white', border: '1px solid #cbd5e1', padding: '.45rem .75rem', borderRadius: 8, fontSize: '.75rem', fontWeight: 700, color: T.primary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>💬 Preguntas Frecuentes (FAQ) & Captura de Leads</span>
                  <ChevronDown size={14} />
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'flows' && (
            <motion.div key="flows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ padding: '1.25rem', height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '.9rem', fontWeight: 800, color: T.primary, margin: '0 0 .25rem 0' }}>Constructor Visual de Flujos</h4>
                <p style={{ fontSize: '.75rem', color: T.secondary, margin: 0 }}>Automatiza respuestas y derivaciones en una estructura visual modular.</p>
              </div>

              {/* Flow boxes */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.65rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '.5rem 1rem', fontSize: '.7rem', fontWeight: 800, color: T.primary, boxShadow: '0 2px 6px rgba(0,0,0,0.02)', width: 220 }}>
                  🟢 Disparador: "Hola, quiero info"
                </div>
                <div style={{ height: 16, width: 2, background: '#cbd5e1' }} />
                <div style={{ background: '#e6f6f0', border: `1px solid ${T.emerald}`, borderRadius: 10, padding: '.5rem 1rem', fontSize: '.7rem', fontWeight: 800, color: T.emerald, boxShadow: '0 2px 6px rgba(0,0,0,0.02)', width: 220 }}>
                  🤖 Derivar a: Agente IA (Precios)
                </div>
                <div style={{ height: 16, width: 2, background: '#cbd5e1' }} />
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '.5rem 1rem', fontSize: '.7rem', fontWeight: 800, color: T.primary, boxShadow: '0 2px 6px rgba(0,0,0,0.02)', width: 220 }}>
                  🔄 Guardar Campo: Presupuesto
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── PREGUNTAS FRECUENTES (FAQ ACCORDION) ─── */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { q: '¿Qué es y cómo funciona el volumen de MAC (Contactos Activos Mensuales)?', a: 'MAC es la cantidad de contactos únicos que le escriben a tus números de WhatsApp dentro de un mes calendario. Puedes recibir miles de mensajes de un mismo contacto y solo contará como 1 MAC. El contador se reinicia de forma automática cada mes.' },
    { q: '¿La IA puede aprender de cualquier tipo de documento?', a: 'Sí. Puedes cargar ficheros PDF, archivos de texto plano (.txt) o incluso pegar enlaces URL de tu página web de información. La IA procesará el contenido y lo guardará en la base de conocimientos del agente en segundos para usarlo de inmediato.' },
    { q: '¿Puedo conectar mi propio número de WhatsApp personal o comercial?', a: 'Sí. El emparejamiento se realiza a través de un código QR nativo (Web Whatsapp). No necesitas pasar por procesos engorrosos de aprobación ni registrar un número nuevo; puedes usar tu número telefónico de siempre.' },
    { q: '¿Qué sucede si un cliente se frustra hablando con el robot de IA?', a: 'El sistema tiene reglas inteligentes de transferencia humana integradas. Si el cliente expresa frustración o exige hablar con un asesor humano, la IA se detiene (se pausa automáticamente), y el chat es etiquetado como URGENTE y derivado a tus asesores humanos.' }
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'left' }}>
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} style={{ borderBottom: '1px solid #e2e8f0', padding: '1.25rem 0' }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: 800, color: T.primary }}>{faq.q}</span>
              <span style={{ color: T.emerald }}>{isOpen ? <Minus size={18} /> : <Plus size={18} />}</span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <p style={{ fontSize: '.9rem', color: T.secondary, lineHeight: 1.6, marginTop: '.75rem', marginBottom: 0, fontWeight: 500 }}>
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  return (
    <PublicLayout>
      <style>{`
        @media(max-width:900px){
          .hero-grid { grid-template-columns: 1fr!important; gap: 3rem!important; text-align: center!important; }
          .hero-buttons { justify-content: center!important; }
          .pilars-grid { grid-template-columns: 1fr!important; }
        }
      `}</style>

      {/* ══ SECCIÓN HERO (NUEVA ESTRUCTURA PREMIUM) ══ */}
      <section style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', padding: '6rem 1.5rem 4rem', background: 'radial-gradient(circle at 80% 20%, #e6f6f0 0%, #ffffff 60%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, left: -100, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle,rgba(45,157,120,.05),transparent 65%)', pointerEvents: 'none' }} />
        
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: '4rem', alignItems: 'center' }}>
            
            {/* Izquierda: Mensaje y los dos Botones Clave */}
            <motion.div initial="hidden" animate="visible" variants={stagger} style={{ textAlign: 'left' }}>
              <motion.div variants={fadeUp} style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'rgba(45,157,120,0.08)', border: '1px solid rgba(45,157,120,0.2)', padding: '.4rem 1rem', borderRadius: 100, fontSize: '.75rem', fontWeight: 800, color: T.emerald, marginBottom: '1.5rem', letterSpacing: '.03em' }}>
                <Sparkles size={12} /> TECNOLOGÍA CONVERSACIONAL DE VANGUARDIA
              </motion.div>

              <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 900, lineHeight: 1.05, color: T.primary, letterSpacing: '-0.04em', marginBottom: '1.5rem' }}>
                El CRM de WhatsApp<br />
                <span style={{ color: T.emerald }}>potenciado por IA.</span>
              </motion.h1>

              <motion.p variants={fadeUp} style={{ fontSize: '1.05rem', color: T.secondary, lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: 480, fontWeight: 500 }}>
                Conecta a tu equipo de agentes a una bandeja compartida única. Automatiza tus ventas y el soporte recurrente con chatbots inteligentes entrenados directamente con tus documentos, archivos o páginas web.
              </motion.p>

              {/* Botones solicitados sin alterar */}
              <motion.div className="hero-buttons" variants={fadeUp} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                <Link to="/inversion" style={{ textDecoration: 'none', padding: '1rem 2.2rem', background: T.emerald, color: '#fff', borderRadius: 100, fontWeight: 800, fontSize: '.92rem', display: 'inline-flex', alignItems: 'center', gap: '.5rem', transition: 'all 0.25s', boxShadow: '0 4px 14px rgba(45,157,120,.2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.emeraldHover}
                  onMouseLeave={e => e.currentTarget.style.background = T.emerald}>
                  Prueba Gratis de 7 Días <ArrowRight size={16} />
                </Link>
                <Link to="/sistemas" style={{ textDecoration: 'none', padding: '1rem 2rem', background: '#ffffff', color: T.primary, borderRadius: 100, fontWeight: 800, border: '1px solid #e2e8f0', fontSize: '.92rem', transition: 'all 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                  Ver Sistemas
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', fontWeight: 700, color: T.secondary }}>
                  <Shield size={14} color={T.emerald} /> Conexión Segura QR y Cloud API
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', fontWeight: 700, color: T.secondary }}>
                  <Check size={14} color={T.emerald} /> Cancelación Simple
                </div>
              </motion.div>
            </motion.div>

            {/* Derecha: Consola Mockup Interactiva */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .6 }}>
              <ProductConsolePreview />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══ TRES PILARES CLAVE DE CUMPLIMIENTO REAL ══ */}
      <section style={{ padding: '6rem 1.5rem', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ color: T.emerald, fontWeight: 850, fontSize: '.78rem', letterSpacing: '.15em', textTransform: 'uppercase' }}>CÓMO REVOLUCIONAMOS TU ATENCIÓN</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: T.primary, marginTop: '.5rem', letterSpacing: '-0.02em' }}>
              Gestión total en un único canal conversacional.
            </h2>
          </div>

          <div className="pilars-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
            
            {/* Pilar 1: Multiagente */}
            <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'left' }}>
              <div style={{ background: 'rgba(45,157,120,0.08)', color: T.emerald, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: T.primary, marginBottom: '.75rem' }}>Bandeja Multiagente</h3>
              <p style={{ fontSize: '.85rem', color: T.secondary, lineHeight: 1.5, fontWeight: 500 }}>
                Conecta a todo tu equipo de soporte o ventas bajo el mismo número. Asigna conversaciones de forma equilibrada, deja notas internas invisibles para el cliente y monitorea las respuestas de tus asesores en vivo.
              </p>
            </div>

            {/* Pilar 2: Automatizaciones */}
            <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'left' }}>
              <div style={{ background: 'rgba(45,157,120,0.08)', color: T.emerald, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Workflow size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: T.primary, marginBottom: '.75rem' }}>Flujos y Triggers Dinámicos</h3>
              <p style={{ fontSize: '.85rem', color: T.secondary, lineHeight: 1.5, fontWeight: 500 }}>
                Diseña automatizaciones con un constructor visual intuitivo. Crea caminos basados en palabras clave exactas o condiciona respuestas inmediatas y derivaciones especiales a departamentos correspondientes.
              </p>
            </div>

            {/* Pilar 3: Agentes IA */}
            <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'left' }}>
              <div style={{ background: 'rgba(45,157,120,0.08)', color: T.emerald, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Bot size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: T.primary, marginBottom: '.75rem' }}>Agente IA de Conocimiento</h3>
              <p style={{ fontSize: '.85rem', color: T.secondary, lineHeight: 1.5, fontWeight: 500 }}>
                Carga tus propios manuales o enlaces web. El Agente de IA entrenado responderá consultas complejas utilizando lenguaje natural y fluidez, calificando prospectos y guardando variables directamente en la ficha del CRM.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ══ INTERACTIVE SAVINGS CALCULATOR SECTION ══ */}
      <section style={{ padding: '4rem 1.5rem 6rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '3.5rem' }}>
            <span style={{ color: T.emerald, fontWeight: 850, fontSize: '.78rem', letterSpacing: '.15em', textTransform: 'uppercase' }}>RETORNO DE INVERSIÓN (ROI)</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: T.primary, marginTop: '.5rem', letterSpacing: '-0.02em' }}>
              Descubre cuánto tiempo ahorra tu negocio.
            </h2>
          </div>
          <SavingsCalculator />
        </div>
      </section>

      {/* ══ PREGUNTAS FRECUENTES (FAQ) ══ */}
      <section style={{ padding: '6rem 1.5rem', background: '#ffffff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '3.5rem' }}>
            <span style={{ color: T.emerald, fontWeight: 850, fontSize: '.78rem', letterSpacing: '.15em', textTransform: 'uppercase' }}>SOPORTE Y TRANSPARENCIA</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: T.primary, marginTop: '.5rem', letterSpacing: '-0.02em' }}>
              Preguntas Frecuentes
            </h2>
          </div>
          <FAQSection />
        </div>
      </section>

      {/* ══ CTA FINAL PREMIUM ══ */}
      <section style={{ padding: '4rem 1.5rem 6rem', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
        <motion.div initial={{ opacity: 0, scale: .98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', background: `linear-gradient(135deg, ${T.primary}, #070914)`, borderRadius: 32, padding: '5rem 2.5rem', boxShadow: '0 30px 80px rgba(15,23,42,0.15)' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Comienza a automatizar hoy mismo
          </h2>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '.95rem', marginBottom: '2.5rem', maxWidth: 450, margin: '0 auto 2.5rem', lineHeight: 1.5 }}>
            Únete a las empresas que ya utilizan GeoChat para duplicar su velocidad de atención al cliente en WhatsApp.
          </p>
          <Link to="/inversion" style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem', textDecoration: 'none', padding: '1.05rem 2.5rem', background: '#ffffff', color: T.emerald, borderRadius: 100, fontWeight: 800, fontSize: '.92rem', boxShadow: '0 8px 24px rgba(0,0,0,.15)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ffffff'; }}>
            Comenzar Prueba de 7 Días <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
