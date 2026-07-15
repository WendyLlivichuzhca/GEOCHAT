import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronDown, 
  Check, 
  X, 
  Bot, 
  Sparkles, 
  Smartphone, 
  Settings, 
  Users
} from 'lucide-react';
import PublicLayout from './PublicLayout';

const WhatsAppLogoSVG = ({ size = 20, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const CHAT_SIMULATIONS = {
  inmo: {
    title: 'Agente Inmobiliario',
    badge: 'Inmobiliaria',
    messages: [
      { sender: 'user', text: 'Hola, vi el depa de 2 recámaras en la zona centro.', time: '12:01 PM' },
      { sender: 'ai', text: '¡Hola! Claro que sí, el departamento de $180,000 USD cuenta con 85m², terraza, bodega y cochera privada. ¿Te gustaría agendar una visita virtual o presencial esta semana?', time: '12:01 PM' },
      { sender: 'user', text: 'Sí, me gustaría agendar para el sábado en la tarde.', time: '12:02 PM' },
      { sender: 'ai', text: '¡Perfecto! 🗓️ He registrado tu interest para el sábado a las 4:00 PM. Por favor, confírmame tu correo electrónico para enviarte los detalles y el enlace de la ubicación.', time: '12:02 PM' }
    ]
  },
  shop: {
    title: 'Soporte E-commerce',
    badge: 'Tienda Online',
    messages: [
      { sender: 'user', text: 'Hola, mi pedido no ha llegado. Mi número de orden es #4028.', time: '3:15 PM' },
      { sender: 'ai', text: '¡Hola! Con gusto lo verifico. El pedido #4028 ya está en ruta con DHL y la fecha estimada de entrega es mañana antes de las 6:00 PM. Aquí tienes tu enlace de rastreo: dhl.com/track/4028 🚚', time: '3:15 PM' },
      { sender: 'user', text: '¡Súper rápido! Muchas gracias por el soporte.', time: '3:16 PM' },
      { sender: 'ai', text: '¡De nada! Nos alegra ayudarte. ¿Hay algo más en lo que pueda apoyarte hoy?', time: '3:16 PM' }
    ]
  },
  med: {
    title: 'Asistente Médico',
    badge: 'Consultorio',
    messages: [
      { sender: 'user', text: 'Hola, buenas tardes, quiero reservar una cita con el cardiólogo.', time: '10:40 AM' },
      { sender: 'ai', text: 'Hola, con gusto. Contamos con citas disponibles para el Dr. Mendoza este jueves a las 10:00 AM o el viernes a las 3:00 PM. ¿Cuál de estos horarios se adapta mejor a tu agenda?', time: '10:40 AM' },
      { sender: 'user', text: 'El jueves a las 10 AM está bien.', time: '10:41 AM' },
      { sender: 'ai', text: '¡Excelente! Cita reservada para el jueves a las 10:00 AM. Por favor, compárteme tu nombre completo y número de identificación para finalizar tu registro de paciente.', time: '10:41 AM' }
    ]
  },
  serv: {
    title: 'Asesor de Servicios',
    badge: 'Agencia',
    messages: [
      { sender: 'user', text: 'Hola, me interesa una cotización de marketing digital.', time: '5:10 PM' },
      { sender: 'ai', text: '¡Hola! Qué gusto saludarte. Para poder enviarte una propuesta exacta, ¿cuál es el rubro de tu empresa y el presupuesto estimado mensual que disponen?', time: '5:10 PM' },
      { sender: 'user', text: 'Somos una clínica dental, presupuesto de $500 al mes.', time: '5:11 PM' },
      { sender: 'ai', text: 'Perfecto. Te recomiendo nuestro plan de Atracción Local. Acabo de notificar a uno de nuestros especialistas en odontomarketing. Te llamará en los próximos 10 minutos para definir los detalles de tu campaña.', time: '5:11 PM' }
    ]
  }
};

const FAQS = [
  {
    q: '¿Es necesario tener mi teléfono celular encendido todo el tiempo?',
    a: 'No. Una vez escaneas el código QR, GeoChat se conecta directamente con los servidores en la nube de WhatsApp. Tu agente de IA y tus flujos de automatización seguirán atendiendo a tus clientes 24/7, incluso si tu celular se queda sin batería, se apaga o se queda sin conexión.'
  },
  {
    q: '¿Puedo usar mi número de WhatsApp actual para GeoChat?',
    a: 'Sí, totalmente. Puedes vincular cualquier número personal o de WhatsApp Business. No necesitas comprar un número nuevo. El proceso se realiza escaneando un código QR idéntico al que utilizas para abrir WhatsApp Web.'
  },
  {
    q: '¿Cómo ayuda GeoChat a evitar el bloqueo de números?',
    a: 'GeoChat está optimizado con algoritmos de simulación humana. Nuestros envíos masivos cuentan con intervalos de tiempo aleatorios personalizables y variables dinámicas que evitan patrones robóticos, protegiendo al máximo la reputación de tu línea.'
  },
  {
    q: '¿Pueden contestar mis asesores humanos al mismo tiempo que la IA?',
    a: 'Sí. GeoChat cuenta con una bandeja de entrada multiagente. Tus vendedores humanos pueden ver el chat en tiempo real y, si deciden intervenir, pueden pausar el agente de IA temporalmente con un solo clic para continuar la conversación de forma manual.'
  },
  {
    q: '¿Necesito saber de programación para entrenar al Agente de IA?',
    a: 'Para nada. El entrenamiento se realiza en lenguaje natural. Solo tienes que escribir las instrucciones de comportamiento (por ejemplo: "Sé amable, saluda y solicita el correo electrónico") y subir tus archivos PDF o redactar las preguntas frecuentes. La IA asimilará la información al instante.'
  }
];

export default function SystemsPage() {
  const [activeTab, setActiveTab] = useState('inmo');
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleScrollToDemo = (e) => {
    e.preventDefault();
    const element = document.getElementById('demo-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <PublicLayout>
      <style>{`
        .btn-green-main {
          background: #00D68F; color: white; padding: 16px 36px; border-radius: 100px;
          font-weight: 700; font-size: 1rem; display: inline-flex; align-items: center; gap: 8px;
          text-decoration: none; box-shadow: 0 10px 25px -5px rgba(0, 214, 143, 0.4); transition: all 0.3s ease;
        }
        .btn-green-main:hover {
          background: #00B686;
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -5px rgba(0, 214, 143, 0.5);
        }
        .interactive-tab {
          padding: 16px 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.45); display: flex; align-items: center; gap: 12px;
          cursor: pointer; transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); text-align: left;
        }
        .interactive-tab:hover {
          background: rgba(255, 255, 255, 0.75);
          transform: translateY(-2px);
          border-color: #00D68F;
        }
        .interactive-tab.active {
          background: #FFFFFF;
          border-color: #00D68F;
          box-shadow: 0 10px 25px -10px rgba(15, 23, 42, 0.08);
          transform: translateY(-2px);
        }
        .glass-box-step {
          background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.55); border-radius: 28px;
          padding: 2.5rem; transition: all 0.3s ease;
        }
        .glass-box-step:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.6);
          border-color: #00D68F;
          box-shadow: 0 15px 35px rgba(15, 23, 42, 0.04);
        }
        .faq-card {
          background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 20px; overflow: hidden; transition: all 0.3s ease;
        }
        .faq-card:hover {
          background: rgba(255, 255, 255, 0.65);
          border-color: #00D68F;
        }
      `}</style>

      {/* ── SECCIÓN SUPERIOR HERO + SIMULADOR (SPLIT) ── */}
      <section style={{ 
        padding: '11rem 5% 5rem', 
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          
          {/* Lado izquierdo: Títulos, Botón e Industrias */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0, 214, 143, 0.08)', border: '1px solid rgba(0, 214, 143, 0.2)', borderRadius: '100px', color: '#00A87B', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              <span>🧠</span> Cómo Funciona
            </div>

            <h1 style={{ fontSize: 'clamp(2.3rem, 3.5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 1.2rem' }}>
              Tu máquina de ventas en WhatsApp,<br />
              <span style={{ color: '#00D68F' }}>explicada paso a paso.</span>
            </h1>

            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#475569', fontWeight: 500, maxWidth: '600px', margin: '0 0 2rem' }}>
              Conecta tu WhatsApp en segundos, entrena tu Agente de IA con tus catálogos o archivos de preguntas frecuentes y deja que filtre prospectos, agende reuniones y notifique a tu equipo de ventas automáticamente.
            </p>

            <div style={{ marginBottom: '3rem' }}>
              <a href="#demo-section" onClick={handleScrollToDemo} className="btn-green-main">
                Ver Demostración en Vivo <ArrowRight size={18} />
              </a>
            </div>

            {/* Selector de Industrias apilado */}
            <div id="demo-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', scrollMarginTop: '10rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Selecciona una industria para probar el simulador:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div 
                  className={`interactive-tab ${activeTab === 'inmo' ? 'active' : ''}`}
                  onClick={() => setActiveTab('inmo')}
                >
                  <span style={{ fontSize: '1.3rem' }}>🏢</span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>Inmobiliaria</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Agenda visitas</div>
                  </div>
                </div>

                <div 
                  className={`interactive-tab ${activeTab === 'shop' ? 'active' : ''}`}
                  onClick={() => setActiveTab('shop')}
                >
                  <span style={{ fontSize: '1.3rem' }}>🛍️</span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>E-commerce</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Filtra envíos y stock</div>
                  </div>
                </div>

                <div 
                  className={`interactive-tab ${activeTab === 'med' ? 'active' : ''}`}
                  onClick={() => setActiveTab('med')}
                >
                  <span style={{ fontSize: '1.3rem' }}>🩺</span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>Consultorio</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Reserva de turnos</div>
                  </div>
                </div>

                <div 
                  className={`interactive-tab ${activeTab === 'serv' ? 'active' : ''}`}
                  onClick={() => setActiveTab('serv')}
                >
                  <span style={{ fontSize: '1.3rem' }}>💼</span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>Servicios</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Filtro de prospectos</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Lado derecho: El celular enmarcado en cristal */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.45)',
              borderRadius: '42px',
              padding: '2.5rem 2rem',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.02)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              maxWidth: '380px'
            }}>
              <div style={{
                width: '310px',
                height: '560px',
                background: '#F8FAFC',
                borderRadius: '40px',
                border: '12px solid #FFFFFF',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Notch */}
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100px', height: '18px', backgroundColor: '#FFFFFF', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', zIndex: 5, boxShadow: '0 0 0 1px #F1F5F9' }} />

                {/* Status Bar */}
                <div style={{ padding: '8px 20px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#1E293B', zIndex: 4 }}>
                  <span>9:41</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22h20V2z"/></svg>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21l-12-12c5.5-5.5 14.5-5.5 20 0z"/></svg>
                    <svg width="12" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="18" height="16" rx="2"/><rect x="22" y="8" width="2" height="8"/></svg>
                  </div>
                </div>

                {/* Header Chat */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px 8px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00D68F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={16} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.75rem' }}>{CHAT_SIMULATIONS[activeTab].title}</div>
                    <div style={{ color: '#00D68F', fontSize: '0.6rem', fontWeight: 700 }}>Agente de IA activo</div>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '100px' }}>
                    {CHAT_SIMULATIONS[activeTab].badge}
                  </span>
                </div>

                {/* Chat Messages */}
                <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                  {CHAT_SIMULATIONS[activeTab].messages.map((m, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', 
                        maxWidth: '85%', 
                        padding: '8px 12px', 
                        background: m.sender === 'user' ? '#ECFDF5' : '#FFFFFF', 
                        border: m.sender === 'user' ? '1px solid rgba(0, 214, 143, 0.1)' : 'none',
                        borderRadius: m.sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', 
                        boxShadow: m.sender === 'ai' ? '0 4px 10px rgba(15, 23, 42, 0.02)' : 'none',
                        color: m.sender === 'user' ? '#008460' : '#0F172A', 
                        fontSize: '0.75rem', 
                        fontWeight: 500, 
                        lineHeight: 1.35 
                      }}
                    >
                      {m.text}
                      <div style={{ textAlign: 'right', fontSize: '0.58rem', color: m.sender === 'user' ? '#00A87B' : '#94A3B8', marginTop: '3px' }}>
                        {m.time} {m.sender === 'user' && '✓✓'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Bezel */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '10px 14px', display: 'flex', gap: '6px', alignItems: 'center', borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ flex: 1, background: '#F8FAFC', padding: '6px 12px', borderRadius: '100px', color: '#94A3B8', fontSize: '0.7rem', border: '1px solid #F1F5F9' }}>Escribe un mensaje...</div>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00D68F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WhatsAppLogoSVG size={12} />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 3. LOS 4 PASOS DETALLADOS ── */}
      <section style={{ padding: '5rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              El ciclo completo de atención inteligente
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Desde la conexión inicial hasta la sincronización con tu CRM, GeoChat automatiza tus procesos de venta.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            
            {/* Paso 1 */}
            <div className="glass-box-step">
              <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(0, 214, 143, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D68F', marginBottom: '1.8rem' }}>
                <Smartphone size={24} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00D68F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paso 1</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0.6rem 0 1rem' }}>Conexión QR Segura</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Escanea el código QR desde tu app de WhatsApp. No necesitas API de Cloud ni aprobaciones burocráticas de Meta. En 10 segundos estarás en línea.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="glass-box-step">
              <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(0, 194, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C2FF', marginBottom: '1.8rem' }}>
                <Settings size={24} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00C2FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paso 2</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0.6rem 0 1rem' }}>Entrenamiento Exclusivo</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Sube tu catálogo de productos, guiones de venta o respuestas frecuentes en formato PDF o de texto. El Agente de IA adoptará tu tono de comunicación al instante.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="glass-box-step">
              <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', marginBottom: '1.8rem' }}>
                <Bot size={24} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paso 3</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0.6rem 0 1rem' }}>Calificación Autónoma</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                La IA responde al instante las dudas técnicas, precios, horarios e intenciones de compra de tus clientes, filtrando y apartando a los prospectos calificados.
              </p>
            </div>

            {/* Paso 4 */}
            <div className="glass-box-step">
              <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', marginBottom: '1.8rem' }}>
                <Users size={24} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paso 4</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0.6rem 0 1rem' }}>Traspaso Colaborativo</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Cuando el prospecto está listo para realizar el pago o solicita hablar con una persona, la IA lo transfiere automáticamente a tu equipo de asesores en vivo.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. COMPARATIVA BOTS VS IA ── */}
      <section style={{ padding: '5rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              La evolución del chatbot clásico
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Compara por qué los asistentes inteligentes de GeoChat convierten hasta 3 veces más que los bots de botones antiguos.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
            
            {/* Columna Chatbots Tradicionales */}
            <div style={{
              background: 'rgba(254, 226, 226, 0.25)',
              border: '1px solid rgba(254, 202, 202, 0.4)',
              borderRadius: '28px',
              padding: '3rem 2.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#EF4444' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#991B1B' }}>Chatbots de Botones</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#7F1D1D', fontWeight: 500, lineHeight: 1.5 }}>
                Tecnología obsoleta basada en menús estáticos de números o botones que limitan la experiencia del cliente.
              </p>
              
              <hr style={{ border: 'none', borderBottom: '1px solid rgba(254, 202, 202, 0.4)' }} />

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.2rem', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <X size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  Si el cliente escribe texto libre o tiene faltas de ortografía, el bot se traba y repite el menú.
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <X size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  Obliga al cliente a seguir una secuencia fija ("Presiona 1 para precios, presiona 2...").
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <X size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  Genera una mala experiencia de usuario y altos niveles de abandono de chat.
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <X size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  Requiere semanas de configuración manual mediante árboles lógicos complejos.
                </li>
              </ul>
            </div>

            {/* Columna Agentes IA GeoChat */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '2px solid #00D68F',
              borderRadius: '28px',
              padding: '3rem 2.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
              boxShadow: '0 20px 40px -10px rgba(0, 214, 143, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00D68F' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={18} />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#065F46' }}>Agentes de IA GeoChat</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#047857', fontWeight: 500, lineHeight: 1.5 }}>
                Inteligencia artificial basada en procesamiento de lenguaje natural que dialoga como un experto vendedor de tu equipo.
              </p>
              
              <hr style={{ border: 'none', borderBottom: '1px solid rgba(0, 214, 143, 0.1)' }} />

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.2rem', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Check size={18} color="#00D68F" style={{ flexShrink: 0, marginTop: '2px' }} />
                  Entiende preguntas directas en texto libre, comprende el contexto y procesa modismos u ortografía imperfecta.
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Check size={18} color="#00D68F" style={{ flexShrink: 0, marginTop: '2px' }} />
                  Brinda información exacta de precios, stock o características de forma fluida y natural.
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Check size={18} color="#00D68F" style={{ flexShrink: 0, marginTop: '2px' }} />
                  Aumenta la retención y califica proactivamente al lead (pide correo, teléfono y producto de interés).
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Check size={18} color="#00D68F" style={{ flexShrink: 0, marginTop: '2px' }} />
                  Se entrena subiendo documentos PDF, Excel o playbooks de venta. Listo para operar en 10 minutos.
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. PREGUNTAS FRECUENTES (FAQs) ── */}
      <section style={{ padding: '5rem 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Preguntas Frecuentes
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', fontWeight: 500 }}>
              Resolvemos tus dudas principales sobre el funcionamiento y la seguridad de GeoChat.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="faq-card">
                  <div 
                    onClick={() => toggleFaq(i)}
                    style={{ 
                      padding: '20px 24px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: isOpen ? '#00D68F' : '#0F172A', margin: 0, transition: 'color 0.2s' }}>
                      {f.q}
                    </h3>
                    <ChevronDown 
                      size={20} 
                      color={isOpen ? '#00D68F' : '#64748B'} 
                      style={{ 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', 
                        transition: 'transform 0.3s ease' 
                      }} 
                    />
                  </div>
                  
                  {/* Animación fluida de apertura */}
                  <div style={{ 
                    maxHeight: isOpen ? '300px' : '0', 
                    overflow: 'hidden', 
                    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
                  }}>
                    <div style={{ padding: '0 24px 20px', color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 500 }}>
                      {f.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

    </PublicLayout>
  );
}
