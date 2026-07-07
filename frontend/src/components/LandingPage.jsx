import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, MessageSquare, Zap, Users, Bot, Workflow, 
  TrendingUp, CheckCircle2, Shield, ChevronDown, Check
} from 'lucide-react';
import PublicLayout from './PublicLayout';

/* ─── Variantes de Animación ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};
const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

/* ─── Preguntas y Respuestas del Simulador de IA ─── */
const CHAT_SIMULATION_QA = [
  {
    question: '¿Cómo se entrena al Agente IA?',
    answer: '¡Es súper fácil! Puedes subir archivos de texto, PDFs o escribir tus preguntas y respuestas frecuentes en tu panel. La IA aprende tu información al instante y responde como un experto de tu equipo, sin equivocarse. 🦾'
  },
  {
    question: '¿Es multiagente real para mi equipo?',
    answer: '¡Sí! Todo tu equipo comercial y de soporte puede chatear en paralelo desde el mismo número oficial de WhatsApp. Puedes asignar chats de forma manual o configurar automatizaciones para derivarlos al instante. 👥'
  },
  {
    question: '¿Puedo enviar mensajes masivos?',
    answer: '¡Totalmente! GeoChat te permite crear campañas de difusión masiva ilimitadas a tus contactos y comunidades del CRM, con campos personalizados e informes detallados de entrega y lectura. ⚡'
  },
  {
    question: '¿Cómo funcionan los flujos visuales?',
    answer: 'Contamos con un Constructor Visual de Automatizaciones donde diseñas flujos con botones interactivos, respuestas con retraso y envío de archivos para calificar a tus clientes antes de enviarlos a la IA o un agente humano. ⚙️'
  }
];

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '¡Hola! Bienvenido a GeoChat 🟢. Soy tu Agente de Inteligencia Artificial entrenado. Haz clic en cualquiera de las preguntas de la izquierda y mira cómo te respondo al instante.',
      time: 'Ahora'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef(null);

  // Auto-scroll del chat en el simulador
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Manejar el clic en una pregunta del simulador de chat
  const handleSimulateQuestion = (qa) => {
    if (isTyping || selectedQuestion === qa.question) return;
    
    setSelectedQuestion(qa.question);
    
    // 1. Agregar pregunta del usuario
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: qa.question, time: 'Ahora' }
    ]);

    // 2. Mostrar indicador de escritura
    setIsTyping(true);

    // 3. Simular respuesta del bot tras 1.2 segundos
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: qa.answer, time: 'Ahora' }
      ]);
      setSelectedQuestion(null);
    }, 1200);
  };

  return (
    <PublicLayout>
      <style>{`
        /* Eliminar scrollbars molestas */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Animaciones para chat simulador */
        @keyframes typing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .typing-dot {
          animation: typing 1s infinite ease-in-out;
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #64748b;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* ── SECTION 1: HERO CON SIMULADOR DE CHAT EN VIVO ── */}
      <section style={{ 
        padding: '7rem 1.5rem 5rem', 
        background: 'radial-gradient(circle at 80% 20%, rgba(45,157,120,0.04), transparent 50%), #ffffff', 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Contenido Izquierdo */}
            <div className="lg:col-span-7 text-left">
              <motion.div initial="hidden" animate="visible" variants={stagger}>
                <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e6f6f0] border border-[#2d9d78]/15 text-[#2d9d78] font-extrabold text-[10px] tracking-wider uppercase mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#2d9d78] inline-block animate-pulse" />
                  SISTEMA OPERATIVO · WHATSAPP BUSINESS IA
                </motion.div>

                <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-[3.25rem] font-black text-[#1e1b4b] leading-[1.1] tracking-tight mb-6">
                  Multiplica tus ventas en WhatsApp con <span className="text-[#2d9d78]">Agentes IA.</span>
                </motion.h1>

                <motion.p variants={fadeUp} className="text-slate-500 font-semibold text-sm md:text-base leading-relaxed max-w-xl mb-8">
                  Conecta tu número oficial, organiza a tu equipo en un chat multiagente y activa agentes de IA entrenados para responder preguntas de clientes y cerrar ventas 24/7 de forma 100% autónoma.
                </motion.p>

                <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-8">
                  <Link to="/inversion" className="px-7 py-3.5 bg-[#2d9d78] text-white rounded-full font-black text-sm uppercase tracking-wider text-center shadow-[0_4px_14px_rgba(45,157,120,0.25)] hover:bg-[#258564] hover:shadow-[0_6px_20px_rgba(45,157,120,0.4)] transition-all duration-300 transform hover:-translate-y-0.5">
                    Probar 7 Días Gratis
                  </Link>
                  <Link to="/inversion" className="px-7 py-3.5 bg-white text-[#2d9d78] border-2 border-[#2d9d78] rounded-full font-black text-sm uppercase tracking-wider text-center hover:bg-[#2d9d78] hover:text-white transition-all duration-300">
                    Ver Planes
                  </Link>
                </motion.div>

                <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-6 max-w-lg">
                  {[
                    { val: '24/7', desc: 'Atención Automatizada' },
                    { val: '100%', desc: 'Canal Oficial API' },
                    { val: 'Ilimitado', desc: 'CRM y Contactos' }
                  ].map((stat, i) => (
                    <div key={i} className="text-left">
                      <h4 className="text-lg font-black text-[#2d9d78]">{stat.val}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.desc}</p>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </div>

            {/* Teléfono y Chat Simulador Interactivo (Derecho) */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.6 }}
                className="w-full max-w-[390px] mx-auto bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-800 relative"
              >
                {/* Bocina del Celular */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                  <div className="w-10 h-1 bg-slate-900 rounded-full" />
                </div>

                {/* Contenedor Interno de la Pantalla */}
                <div className="w-full bg-[#efeae2] rounded-[2.5rem] overflow-hidden flex flex-col h-[520px] relative z-10 border border-slate-950">
                  
                  {/* WhatsApp Cabecera */}
                  <div className="bg-[#075e54] pt-6 pb-3 px-4 flex items-center gap-3 text-white">
                    <div className="w-9 h-9 rounded-full bg-[#128c7e] border border-white/20 flex items-center justify-center font-extrabold text-sm shadow-md">
                      G
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                        GeoChat IA
                        <span className="w-2 h-2 rounded-full bg-[#25d366] inline-block animate-pulse" />
                      </h4>
                      <p className="text-[10px] text-white/80 font-semibold">Agente de Soporte Virtual</p>
                    </div>
                  </div>

                  {/* WhatsApp Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
                    {messages.map((msg, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={idx}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[85%] rounded-[1.2rem] px-3.5 py-2.5 text-xs font-semibold leading-relaxed shadow-sm text-left ${
                            msg.sender === 'user' 
                              ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none' 
                              : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                          }`}
                        >
                          {msg.text}
                          <div className="text-[9px] text-slate-400 text-right mt-1.5 font-bold tracking-wider">{msg.time}</div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Indicador de Escritura */}
                    {isTyping && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-white border border-slate-100 rounded-[1.2rem] rounded-tl-none px-4 py-3 flex items-center gap-1 shadow-sm">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </motion.div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Panel Inferior de Simulación */}
                  <div className="bg-white border-t border-slate-200/60 p-3 flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Haz clic para interactuar</p>
                    <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1 no-scrollbar">
                      {CHAT_SIMULATION_QA.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => handleSimulateQuestion(qa)}
                          disabled={isTyping}
                          className="w-full text-left bg-slate-50 hover:bg-[#e6f6f0] hover:text-[#2d9d78] transition-all py-2 px-3 border border-slate-200/50 rounded-xl text-[10px] font-bold text-slate-600 flex items-center justify-between"
                        >
                          <span>{qa.question}</span>
                          <ChevronDown size={10} className="-rotate-90 text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 2: BENTO GRID DE PILARES DE GEOCHAT ── */}
      <section className="py-20 px-4 md:px-6 bg-[#f8fafc] border-y border-slate-100">
        <div className="max-w-[1140px] mx-auto text-center">
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }} 
            variants={stagger}
            className="mb-14"
          >
            <motion.span variants={fadeUp} className="text-[#2d9d78] font-extrabold text-[10px] tracking-widest uppercase block mb-3">
              INFRAESTRUCTURA CONVERSACIONAL DE ÉLITE
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#1e1b4b] tracking-tight">
              Todo lo que tu negocio necesita en WhatsApp.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-500 font-semibold text-xs md:text-sm max-w-lg mx-auto mt-3">
              Escala tus operaciones, mejora tus tiempos de respuesta y consolida tus ventas con nuestro ecosistema unificado.
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: '-50px' }} 
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"
          >
            {[
              {
                title: 'Agentes IA Entrenables',
                desc: 'Entrena asistentes inteligentes con la base de conocimiento de tu marca. Resuelven dudas del catálogo, precios y horarios en segundos de forma nativa.',
                icon: <Bot size={22} className="text-[#2d9d78]" />,
                badge: 'AUTOMATIZADO',
                bg: 'bg-white'
              },
              {
                title: 'Multiagente Centralizado',
                desc: 'Permite que múltiples vendedores y agentes de atención interactúen con tus clientes simultáneamente usando el mismo número oficial de WhatsApp.',
                icon: <Users size={22} className="text-[#2d9d78]" />,
                badge: 'COLABORATIVO',
                bg: 'bg-white'
              },
              {
                title: 'CRM Conversacional e Historial',
                desc: 'Base de datos ilimitada para clasificar contactos, añadir campos personalizados y hacer seguimiento a leads sin salir de tu WhatsApp CRM.',
                icon: <TrendingUp size={22} className="text-[#2d9d78]" />,
                badge: 'ORGANIZADO',
                bg: 'bg-white'
              },
              {
                title: 'Constructor Visual de Flujos',
                desc: 'Diseña automatizaciones complejas, respuestas automáticas estructuradas y secuencias con botones interactivos de manera intuitiva.',
                icon: <Workflow size={22} className="text-[#2d9d78]" />,
                badge: 'SIN CÓDIGO',
                bg: 'bg-white'
              }
            ].map((pilar, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                className={`${pilar.bg} rounded-[2rem] p-8 border border-slate-100/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between text-left transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1`}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#e6f6f0] flex items-center justify-center border border-[#2d9d78]/10 shadow-sm">
                      {pilar.icon}
                    </div>
                    <span className="px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-[9px] font-black tracking-widest text-slate-500 uppercase">
                      {pilar.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-[#1e1b4b] mb-2">{pilar.title}</h3>
                  <p className="text-slate-500 font-semibold text-xs leading-relaxed">{pilar.desc}</p>
                </div>

                <div className="border-t border-slate-100/80 mt-6 pt-6 flex items-center gap-2 text-[#2d9d78] text-xs font-black uppercase tracking-wider cursor-pointer group">
                  <span>Conocer más</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 3: PREGUNTAS FRECUENTES (FAQ) ── */}
      <section className="py-20 px-4 md:px-6 bg-white">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#2d9d78] font-extrabold text-[10px] tracking-widest uppercase block mb-3">
              RESOLVEMOS TUS DUDAS
            </span>
            <h2 className="text-3xl font-black text-[#1e1b4b] tracking-tight">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: '¿Se requiere un número de WhatsApp oficial?',
                a: 'Sí, GeoChat funciona integrado a la API oficial de WhatsApp Cloud o WhatsApp Business, lo cual te garantiza la mayor velocidad de transmisión y previene el riesgo de bloqueo por envíos masivos.'
              },
              {
                q: '¿Cómo se entrena al Agente de Inteligencia Artificial?',
                a: 'El entrenamiento se realiza en minutos. Ingresas textos informativos, cargas documentos en PDF o creas un listado de preguntas y respuestas directamente en el administrador de GeoChat. La IA procesa y memoriza esta información.'
              },
              {
                q: '¿Puedo conectar a todo mi equipo en un solo número?',
                a: '¡Sí! Puedes invitar a tus agentes comerciales, de soporte o posventa y asignarles roles para que respondan de manera conjunta las consultas que ingresan a tu número de WhatsApp central.'
              },
              {
                q: '¿Ofrecen período de prueba de los planes?',
                a: 'Sí, ofrecemos un período de prueba de 7 días totalmente gratuito en el Plan Starter para que pruebes las funciones de CRM, multiagente y los Agentes IA.'
              }
            ].map((faq, i) => {
              const isOpen = activeFaq === i;
              return (
                <div 
                  key={i} 
                  className="border border-slate-100 rounded-2xl overflow-hidden transition-all duration-300 bg-slate-50/50 hover:bg-slate-50"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-[#1e1b4b] focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#2d9d78]' : ''}`} 
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="px-5 pb-5 pt-0 text-slate-500 font-semibold text-xs leading-relaxed border-t border-slate-100/50 mt-1">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: BANNER CTA DE CIERRE ── */}
      <section className="py-16 px-4 md:px-6 bg-[#f8fafc]">
        <div className="max-w-[1000px] mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-[#2d9d78] to-[#1c6d52] rounded-[3rem] p-8 md:p-12 text-center text-white shadow-2xl relative overflow-hidden"
          >
            <div className="relative z-10 max-w-xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">
                ¿Listo para transformar tu WhatsApp en una máquina de ventas?
              </h2>
              <p className="text-white/80 font-bold text-xs md:text-sm mb-8 leading-relaxed">
                Únete a los negocios modernos que ya están usando Inteligencia Artificial para automatizar y escalar sus canales de atención.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/inversion" className="px-8 py-4 bg-white text-[#2d9d78] rounded-full font-black text-sm uppercase tracking-wider text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  Comenzar 7 Días Gratis
                </Link>
              </div>
            </div>
            
            {/* Decoraciones de Fondo */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none" />
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
