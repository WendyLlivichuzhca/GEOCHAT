import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, MessageSquare, Zap, Users, Bot, Workflow, 
  TrendingUp, CheckCircle2, Shield, ChevronDown, Check, Smartphone
} from 'lucide-react';
import PublicLayout from './PublicLayout';

/* ─── Variantes de Animación Framer Motion ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' } }
};
const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

/* ─── Casos de Uso del Simulador Dinámico ─── */
const USE_CASES = {
  ecommerce: {
    tabLabel: '🛍️ Tienda / Catálogo',
    botName: 'Demo Boutique IA',
    botSub: 'Agente de Ventas Online',
    welcome: '¡Hola! Bienvenido a nuestra tienda de demostración 🛍️. Estoy entrenada para mostrarte el catálogo, costos de envío y métodos de pago. ¿En qué puedo ayudarte?',
    qa: [
      {
        question: '¿Tienen catálogo de productos?',
        answer: '¡Por supuesto! Puedes escribir "ver catálogo" o dar clic al link directo en nuestro perfil para ver los modelos y tallas disponibles en stock. 📱'
      },
      {
        question: '¿Cuánto cuesta el envío?',
        answer: 'El envío cuesta $3.50 a nivel nacional. ¡Pero si tu orden supera los $40 USD, el envío es totalmente gratis a tu puerta! 📦'
      },
      {
        question: '¿Cuáles son los métodos de pago?',
        answer: 'Aceptamos transferencias bancarias, tarjetas de crédito/débito y pago contra entrega en ciudades seleccionadas para tu seguridad. 💳'
      }
    ]
  },
  support: {
    tabLabel: '🔧 Soporte Técnico',
    botName: 'Soporte GeoChat IA',
    botSub: 'Asistente Técnico 24/7',
    welcome: 'Hola, bienvenido al canal de asistencia 🔧. Estoy aquí para resolver tus dudas de integración, estado del sistema o facturación. ¿Qué problema presentas hoy?',
    qa: [
      {
        question: '¿Cómo restauro mi contraseña?',
        answer: 'Ingresa a la pantalla de login, haz clic en "Olvidé mi contraseña" e ingresa tu email. Te enviaremos un enlace de recuperación de inmediato. ✉️'
      },
      {
        question: '¿Tienen integración con APIs externas?',
        answer: '¡Sí! GeoChat ofrece Webhooks entrantes/salientes y documentación de API completa para conectar tus CRM o bases de datos externas de forma limpia. 🔌'
      },
      {
        question: '¿El servicio está operativo hoy?',
        answer: '¡Totalmente! Todos nuestros nodos y servidores se encuentran en línea y operando con un Uptime del 99.9% en tiempo real. 🟢'
      }
    ]
  },
  agency: {
    tabLabel: '🚀 Agencia / Servicios',
    botName: 'Agencia Digital IA',
    botSub: 'Consultor de Proyectos',
    welcome: 'Hola, gracias por escribir a nuestra consultora digital 🚀. Te ayudo a cotizar proyectos de automatización, desarrollo web o marketing. ¿Qué buscas hoy?',
    qa: [
      {
        question: '¿Qué servicios ofrecen?',
        answer: 'Nos especializamos en automatización de WhatsApp con IA, desarrollo web a medida, integraciones de software y embudos de marketing digital. 📈'
      },
      {
        question: '¿Cómo agendo una reunión?',
        answer: '¡Es súper fácil! Puedes reservar una llamada inicial gratuita de 15 minutos en Zoom o Meet usando el enlace de nuestra agenda. 📅'
      },
      {
        question: '¿Trabajan de forma internacional?',
        answer: '¡Sí! Colaboramos con marcas y equipos de marketing en toda Latinoamérica, Estados Unidos y España de forma 100% remota y ágil. 🌎'
      }
    ]
  }
};

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [currentCase, setCurrentCase] = useState('ecommerce');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef(null);

  // Inicializar o cambiar el chat al seleccionar otro caso de uso
  useEffect(() => {
    setMessages([
      {
        sender: 'bot',
        text: USE_CASES[currentCase].welcome,
        time: 'Ahora'
      }
    ]);
    setIsTyping(false);
    setSelectedQuestion(null);
  }, [currentCase]);

  // Auto-scroll del chat interactivo
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Ejecutar simulación de pregunta y respuesta
  const handleSimulate = (qa) => {
    if (isTyping || selectedQuestion === qa.question) return;

    setSelectedQuestion(qa.question);

    // 1. Agregar pregunta del usuario a la derecha
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: qa.question, time: 'Ahora' }
    ]);

    // 2. Activar "Escribiendo..."
    setIsTyping(true);

    // 3. Simular respuesta del bot tras 1 segundo
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: qa.answer, time: 'Ahora' }
      ]);
      setSelectedQuestion(null);
    }, 1000);
  };

  return (
    <PublicLayout>
      <style>{`
        /* Ocultar barra de scroll global sin perder funcionalidad */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Efecto de parpadeo de puntos del bot escribiendo */
        @keyframes typing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .typing-dot {
          animation: typing 1s infinite ease-in-out;
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #64748b;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* ─── SECCIÓN 1: HERO PREMIUM CON SIMULADOR MULTICASO EN VIVO ─── */}
      <section style={{ 
        padding: '7.5rem 1.5rem 5.5rem', 
        background: 'radial-gradient(circle at 10% 20%, rgba(45,157,120,0.05) 0%, transparent 60%), radial-gradient(circle at 90% 80%, rgba(37,99,235,0.02) 0%, transparent 50%), #ffffff',
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Contenido Comercial (Izquierda) */}
            <div className="lg:col-span-7 text-left">
              <motion.div initial="hidden" animate="visible" variants={stagger}>
                
                {/* Badge Superior */}
                <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e6f6f0] border border-[#2d9d78]/15 text-[#2d9d78] font-extrabold text-[10px] tracking-wider uppercase mb-6 shadow-[inset_0_1px_2px_rgba(45,157,120,0.05)]">
                  <span className="w-2 h-2 rounded-full bg-[#2d9d78] inline-block animate-pulse" />
                  SISTEMA GEOCAT V3.0 · WHATSAPP BUSINESS IA
                </motion.div>

                {/* Título Principal */}
                <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-[3.25rem] font-black text-[#1e1b4b] leading-[1.1] tracking-tight mb-6">
                  Tus ventas por WhatsApp en piloto automático con <span className="text-[#2d9d78]">Inteligencia Artificial.</span>
                </motion.h1>

                {/* Subtítulo descriptivo */}
                <motion.p variants={fadeUp} className="text-slate-500 font-semibold text-sm md:text-base leading-relaxed max-w-xl mb-8">
                  Conecta tu número oficial, organiza a tu equipo en un chat multiagente y activa agentes de IA entrenados para responder preguntas, calificar prospectos y cerrar ventas 24/7 sin esfuerzo.
                </motion.p>

                {/* Llamados a la Acción */}
                <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-8">
                  <Link to="/inversion" className="px-8 py-4 bg-[#2d9d78] text-white rounded-full font-black text-xs uppercase tracking-wider text-center shadow-[0_4px_14px_rgba(45,157,120,0.25)] hover:bg-[#258564] hover:shadow-[0_6px_20px_rgba(45,157,120,0.4)] transition-all duration-300 transform hover:-translate-y-0.5">
                    Probar 7 Días Gratis
                  </Link>
                  <Link to="/inversion" className="px-8 py-4 bg-white text-[#2d9d78] border-2 border-[#2d9d78] rounded-full font-black text-xs uppercase tracking-wider text-center hover:bg-[#2d9d78] hover:text-white transition-all duration-300">
                    Ver Planes
                  </Link>
                </motion.div>

                {/* Métricas destacadas */}
                <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-6 max-w-lg">
                  {[
                    { val: '24/7', desc: 'Soporte Automatizado' },
                    { val: '100% Oficial', desc: 'Integración Cloud API' },
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

            {/* Simulador Multicaso Móvil (Derecha) */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              
              {/* Selector de Perfil de Negocio (Pestañas) */}
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 max-w-[390px] mx-auto w-full border border-slate-200/50">
                {Object.keys(USE_CASES).map(key => (
                  <button
                    key={key}
                    onClick={() => setCurrentCase(key)}
                    className={`flex-1 text-center py-2 px-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-300 ${
                      currentCase === key 
                        ? 'bg-white text-[#2d9d78] shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {USE_CASES[key].tabLabel.split(' ')[1] || USE_CASES[key].tabLabel}
                  </button>
                ))}
              </div>

              {/* Teléfono Maqueta Celular */}
              <motion.div 
                key={currentCase}
                initial={{ opacity: 0, scale: 0.96 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.5 }}
                className="w-full max-w-[390px] mx-auto bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-850 relative"
              >
                {/* Bocina e Isla Dinámica */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                  <div className="w-10 h-1 bg-slate-900 rounded-full" />
                </div>

                {/* Pantalla de WhatsApp */}
                <div className="w-full bg-[#efeae2] rounded-[2.5rem] overflow-hidden flex flex-col h-[500px] relative z-10 border border-slate-950">
                  
                  {/* Header Chat */}
                  <div className="bg-[#075e54] pt-6 pb-2.5 px-4 flex items-center gap-3 text-white">
                    <div className="w-8 h-8 rounded-full bg-[#128c7e] border border-white/20 flex items-center justify-center font-black text-xs shadow-sm uppercase">
                      {USE_CASES[currentCase].botName.charAt(0)}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-xs leading-tight flex items-center gap-1.5">
                        {USE_CASES[currentCase].botName}
                        <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] inline-block animate-pulse" />
                      </h4>
                      <p className="text-[9px] text-white/80 font-bold">{USE_CASES[currentCase].botSub}</p>
                    </div>
                  </div>

                  {/* Mensajes del Chat */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
                    {messages.map((msg, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={idx}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[85%] rounded-[1.1rem] px-3.5 py-2.5 text-[11px] font-semibold leading-relaxed shadow-sm text-left ${
                            msg.sender === 'user' 
                              ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none' 
                              : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                          }`}
                        >
                          {msg.text}
                          <div className="text-[8px] text-slate-400 text-right mt-1.5 font-bold tracking-wider">{msg.time}</div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Escribiendo */}
                    {isTyping && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-white border border-slate-100 rounded-[1.1rem] rounded-tl-none px-4 py-2.5 flex items-center gap-1 shadow-sm">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </motion.div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Selector interactivo de preguntas */}
                  <div className="bg-white border-t border-slate-200/50 p-3 flex flex-col gap-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Toca una pregunta de prueba</p>
                    <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1 no-scrollbar">
                      {USE_CASES[currentCase].qa.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => handleSimulate(qa)}
                          disabled={isTyping}
                          className="w-full text-left bg-slate-50 hover:bg-[#e6f6f0] hover:text-[#2d9d78] transition-all py-2.5 px-3.5 border border-slate-200/40 rounded-xl text-[10px] font-extrabold text-slate-650 flex items-center justify-between"
                        >
                          <span>{qa.question}</span>
                          <ChevronDown size={10} className="-rotate-90 text-slate-450 shrink-0" />
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

      {/* ─── SECCIÓN 2: BENTO GRID DE PANTALLAS Y BENEFICIOS PÚBLICOS ─── */}
      <section className="py-24 px-4 md:px-6 bg-[#f8fafc] border-y border-slate-100">
        <div className="max-w-[1140px] mx-auto text-center">
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }} 
            variants={stagger}
            className="mb-16"
          >
            <span className="text-[#2d9d78] font-extrabold text-[10px] tracking-widest uppercase block mb-3">
              PRODUCTIVIDAD DE CLASE MUNDIAL
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#1e1b4b] tracking-tight">
              Todo lo que necesitas para vender en WhatsApp.
            </h2>
            <motion.p variants={fadeUp} className="text-slate-500 font-semibold text-xs md:text-sm max-w-lg mx-auto mt-3">
              Administra campañas, atiende clientes y automatiza procesos de tu negocio en un solo panel de control integrado.
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: '-50px' }} 
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
          >
            {[
              {
                title: 'Agentes de IA Entrenables',
                desc: 'Alimenta a tu bot con archivos de texto, PDFs o respuestas rápidas. La IA procesa todo y atiende de forma inteligente las consultas del catálogo sin equivocarse.',
                icon: <Bot size={20} className="text-[#2d9d78]" />,
                badge: 'IA NEURAL',
                colSpan: 'lg:col-span-2'
              },
              {
                title: 'Multiagente Centralizado',
                desc: 'Todo tu equipo chateando y vendiendo al unísono desde una sola línea de WhatsApp oficial, con roles y asignaciones automáticas.',
                icon: <Users size={20} className="text-[#2d9d78]" />,
                badge: 'COLABORATIVO',
                colSpan: ''
              },
              {
                title: 'CRM Conversacional',
                desc: 'Clasifica prospectos con etiquetas personalizadas, haz seguimiento a embudos comerciales y mantén organizada tu base de datos de manera ilimitada.',
                icon: <TrendingUp size={20} className="text-[#2d9d78]" />,
                badge: 'CRM PRO',
                colSpan: ''
              },
              {
                title: 'Constructor Visual de Flujos',
                desc: 'Diseña árboles de decisión con botones interactivos, respuestas automáticas, retraso humano artificial y menús multimedia de forma 100% visual y sin saber programar.',
                icon: <Workflow size={20} className="text-[#2d9d78]" />,
                badge: 'SIN CÓDIGO',
                colSpan: 'lg:col-span-2'
              }
            ].map((pilar, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                className={`${pilar.colSpan} bg-white rounded-[2rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between text-left transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1`}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-[#e6f6f0] flex items-center justify-center border border-[#2d9d78]/10 shadow-sm">
                      {pilar.icon}
                    </div>
                    <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[8px] font-black tracking-widest text-slate-500 uppercase">
                      {pilar.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-[#1e1b4b] mb-2">{pilar.title}</h3>
                  <p className="text-slate-500 font-semibold text-xs leading-relaxed">{pilar.desc}</p>
                </div>

                <div className="border-t border-slate-100/80 mt-6 pt-6 flex items-center gap-2 text-[#2d9d78] text-xs font-black uppercase tracking-wider cursor-pointer group">
                  <span>Saber más</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── SECCIÓN 3: MÉTRICAS Y ESTADÍSTICAS ─── */}
      <section className="py-20 px-4 md:px-6 bg-white">
        <div className="max-w-[1140px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { val: '+85%', title: 'Automatización Efectiva', desc: 'Consultas que el Agente IA resuelve de forma 100% autónoma y sin necesidad de personal.' },
              { val: '< 1.2s', title: 'Tiempo de Respuesta', desc: 'Latencia mínima de procesamiento de nuestro motor de IA para WhatsApp Cloud API.' },
              { val: '3x más', title: 'Conversión Comercial', desc: 'Aumento promedio en el cierre de leads calificados por la plataforma en el embudo.' }
            ].map((m, idx) => (
              <div key={idx} className="p-6 border border-slate-100 rounded-3xl bg-slate-50/30 text-center">
                <h3 className="text-4xl md:text-5xl font-black text-[#2d9d78] mb-2">{m.val}</h3>
                <h4 className="text-sm font-black text-[#1e1b4b] mb-2">{m.title}</h4>
                <p className="text-slate-400 font-semibold text-xs leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECCIÓN 4: PREGUNTAS FRECUENTES (FAQ) ACCORDION ─── */}
      <section className="py-24 px-4 md:px-6 bg-white border-t border-slate-100">
        <div className="max-w-[760px] mx-auto">
          
          <div className="text-center mb-14">
            <span className="text-[#2d9d78] font-extrabold text-[10px] tracking-widest uppercase block mb-3">
              RESOLVEMOS TUS INQUIETUDES
            </span>
            <h2 className="text-3xl font-black text-[#1e1b4b] tracking-tight">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: '¿Es compatible con cualquier tipo de cuenta de WhatsApp?',
                a: 'Sí. Funciona perfectamente integrando la API oficial de WhatsApp Cloud o WhatsApp Business, lo cual te garantiza velocidad inmediata, estabilidad y previene baneos por envíos masivos.'
              },
              {
                q: '¿Cómo aprende el Agente de Inteligencia Artificial?',
                a: '¡Es sumamente simple! Creas tu base de conocimientos subiendo documentos de texto, PDFs o escribiendo FAQs personalizadas en el administrador de GeoChat. La IA procesa y comprende tus datos al instante.'
              },
              {
                q: '¿Cuántos agentes pueden usar la misma línea de WhatsApp?',
                a: 'Los que necesites. De acuerdo a tu plan, puedes invitar a todo tu equipo comercial y de soporte técnico para atender las conversaciones entrantes de forma organizada en un chat multiagente.'
              },
              {
                q: '¿Tienen soporte técnico para la configuración inicial?',
                a: '¡Sí! Todos nuestros planes incluyen una sesión inicial personalizada en Zoom o Meet para ayudarte a conectar tu API, configurar tus embudos de CRM y entrenar a tu primer Agente de IA.'
              }
            ].map((faq, i) => {
              const isOpen = activeFaq === i;
              return (
                <div 
                  key={i} 
                  className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all duration-300"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-[#1e1b4b] focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={16} 
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

      {/* ─── SECCIÓN 5: CTA BANNER FINAL ─── */}
      <section className="py-20 px-4 md:px-6 bg-[#f8fafc]">
        <div className="max-w-[1000px] mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-[#2d9d78] to-[#1c6d52] rounded-[3.5rem] p-8 md:p-14 text-center text-white shadow-2xl relative overflow-hidden"
          >
            <div className="relative z-10 max-w-xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">
                ¿Listo para transformar tu atención por WhatsApp?
              </h2>
              <p className="text-white/80 font-bold text-xs md:text-sm mb-8 leading-relaxed">
                Empieza hoy mismo y automatiza tu negocio con el multiagente e Inteligencia Artificial más veloz del mercado.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/inversion" className="px-8 py-4 bg-white text-[#2d9d78] rounded-full font-black text-xs uppercase tracking-wider text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  Comenzar 7 Días Gratis
                </Link>
              </div>
            </div>
            
            {/* Formas abstractas blur */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/5 blur-xl pointer-events-none" />
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
