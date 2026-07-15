import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ChevronDown, 
  CheckCircle, 
  MessageSquare, 
  BookOpen, 
  Users, 
  Mail, 
  Clock 
} from 'lucide-react';
import PublicLayout from './PublicLayout';

const HELP_CHANNELS = [
  {
    title: 'Documentación & Guías',
    description: 'Explora nuestros tutoriales paso a paso para escanear tu QR, subir tus catálogos y entrenar a tu primer agente de IA en minutos.',
    icon: <BookOpen size={24} />,
    btnText: 'Explorar Tutoriales',
    color: '#00D68F',
    link: '#faq-section'
  },
  {
    title: 'Soporte Técnico 24/7',
    description: '¿Tienes problemas con algún flujo o integración? Chatea directamente en vivo con un ingeniero de soporte técnico.',
    icon: <MessageSquare size={24} />,
    btnText: 'Chatear en Soporte',
    color: '#00C2FF',
    link: 'https://wa.me/593986130956?text=Hola!%20Necesito%20soporte%20técnico%20con%20mi%20cuenta%20de%20GeoChat.'
  },
  {
    title: 'Comunidad de Clientes',
    description: 'Únete a nuestro canal exclusivo de WhatsApp para recibir actualizaciones de la plataforma, tips de automatización y hacer networking.',
    icon: <Users size={24} />,
    btnText: 'Unirse al Grupo',
    color: '#8B5CF6',
    link: 'https://wa.me/593986130956?text=Hola!%20Quiero%20unirme%20a%20la%20comunidad%20exclusiva%20de%20GeoChat.'
  }
];

const ONBOARDING_FAQS = [
  {
    q: '¿Cómo reclamo mi sesión de setup asistido gratis de $100 USD?',
    a: 'Una vez adquieres cualquiera de nuestros planes, recibirás un correo de bienvenida con un enlace a Calendly. Ahí podrás agendar una videollamada 1 a 1 de 45 minutos donde uno de nuestros ingenieros configurará tus agentes, integraciones y bases de datos por ti.'
  },
  {
    q: '¿GeoChat es compatible con WhatsApp Web al mismo tiempo?',
    a: 'Sí, totalmente. GeoChat opera en la nube de forma independiente. Tus asesores humanos pueden responder desde WhatsApp Web o su app de celular sin interferir con las respuestas automáticas del agente de IA.'
  },
  {
    q: '¿Qué ocurre si mi teléfono se apaga o se desconecta de internet?',
    a: 'Nada. Tu agente de IA y tus flujos conversacionales siguen operando al 100% en la nube de GeoChat, atendiendo a tus clientes 24/7 sin importar el estado de tu celular.'
  },
  {
    q: '¿Cómo restauro la conexión si se desvincula mi QR?',
    a: 'Solo debes ir a la pestaña "Conexiones" de tu panel, presionar "Desvincular" y escanear el nuevo código QR con tu celular. La base de datos, chats anteriores y entrenamiento de la IA seguirán guardados intactos.'
  }
];

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState({ ...formState, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formState.name && formState.email && formState.message) {
      setSubmitted(true);
    }
  };

  const handleScrollToFaq = (e, targetId) => {
    if (targetId.startsWith('#')) {
      e.preventDefault();
      const element = document.getElementById(targetId.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
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
        .help-channel-card {
          background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(255, 255, 255, 0.75);
          border-radius: 28px; padding: 2.5rem; display: flex; flex-direction: column; gap: 1.2rem;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); backdrop-filter: blur(16px);
        }
        .help-channel-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.75);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
        }
        .btn-channel-action {
          font-size: 0.82rem; font-weight: 800; color: #0F172A; text-decoration: none;
          display: inline-flex; align-items: center; gap: 6px; transition: color 0.2s;
        }
        .btn-channel-action:hover {
          color: #00D68F;
        }
        .contact-input {
          width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #E2E8F0;
          background: #FFFFFF; color: #0F172A; font-size: 0.9rem; font-weight: 500;
          outline: none; transition: border-color 0.2s;
        }
        .contact-input:focus {
          border-color: #00D68F;
        }
        .faq-help-card {
          background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 20px; overflow: hidden; transition: all 0.3s ease;
        }
        .faq-help-card:hover {
          background: rgba(255, 255, 255, 0.65);
          border-color: #00D68F;
        }
      `}</style>

      {/* ── 1. HÉROE DEL CENTRO DE AYUDA ── */}
      <section style={{ padding: '11rem 5% 4rem', position: 'relative', textAlign: 'center' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0, 214, 143, 0.08)', border: '1px solid rgba(0, 214, 143, 0.2)', borderRadius: '100px', color: '#00A87B', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <span>📖</span> Soporte Especializado
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)', fontWeight: 900, lineHeight: 1.1, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 1.5rem' }}>
            ¿Cómo podemos<br />
            <span style={{ color: '#00D68F' }}>ayudarte hoy?</span>
          </h1>

          <p style={{ fontSize: '1.15rem', color: '#475569', fontWeight: 500, maxWidth: '650px', margin: '0 auto' }}>
            Encuentra respuestas rápidas de configuración y canales de soporte directo. Estamos aquí para guiarte en cada paso.
          </p>

        </div>
      </section>

      {/* ── 2. GRID DE CANALES DE SOPORTE ── */}
      <section style={{ padding: '2rem 5% 5rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {HELP_CHANNELS.map((hc, i) => (
              <div key={i} className="help-channel-card" style={{ borderTop: `4px solid ${hc.color}` }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hc.color, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                  {hc.icon}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{hc.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                  {hc.description}
                </p>
                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  {hc.link.startsWith('#') ? (
                    <a 
                      href={hc.link} 
                      onClick={(e) => handleScrollToFaq(e, hc.link)} 
                      className="btn-channel-action"
                    >
                      {hc.btnText} <ArrowRight size={14} />
                    </a>
                  ) : (
                    <a 
                      href={hc.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-channel-action"
                    >
                      {hc.btnText} <ArrowRight size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 3. FORMULARIO DE SOPORTE INTERACTIVO ── */}
      <section style={{ padding: '5rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '5rem', alignItems: 'center' }}>
          
          {/* Lado izquierdo: Información de contacto */}
          <div>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
              Envíanos una solicitud
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.6, fontWeight: 500, marginBottom: '2.5rem' }}>
              ¿Tienes alguna duda comercial o necesitas asistencia con tu cuenta? Completa el formulario de la derecha. Nuestro equipo de soporte técnico revisará tu caso y se pondrá en contacto contigo a la brevedad.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0, 214, 143, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D68F' }}>
                  <Mail size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Correo de Soporte</div>
                  <div style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 800 }}>soporte@geochat.io</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0, 194, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C2FF' }}>
                  <Clock size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Horarios de Atención</div>
                  <div style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 800 }}>Lunes a Domingo — 8:00 AM a 10:00 PM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Lado derecho: Formulario de cristal */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.75)',
            borderRadius: '32px',
            padding: '3rem',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.04)',
            position: 'relative'
          }}>
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form 
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155', display: 'block', marginBottom: '6px' }}>Nombre</label>
                      <input 
                        type="text" 
                        name="name"
                        value={formState.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Ingresa tu nombre"
                        className="contact-input"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155', display: 'block', marginBottom: '6px' }}>Correo Electrónico</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formState.email}
                        onChange={handleInputChange}
                        required
                        placeholder="correo@ejemplo.com"
                        className="contact-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155', display: 'block', marginBottom: '6px' }}>Asunto</label>
                    <input 
                      type="text" 
                      name="subject"
                      value={formState.subject}
                      onChange={handleInputChange}
                      placeholder="¿En qué te podemos ayudar?"
                      className="contact-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 750, color: '#334155', display: 'block', marginBottom: '6px' }}>Mensaje</label>
                    <textarea 
                      name="message"
                      value={formState.message}
                      onChange={handleInputChange}
                      required
                      rows="4"
                      placeholder="Describe detalladamente tu caso..."
                      className="contact-input"
                      style={{ resize: 'none' }}
                    />
                  </div>

                  <div style={{ marginTop: '0.8rem' }}>
                    <button type="submit" className="btn-green-main" style={{ width: '100%', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                      Enviar Mensaje <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ 
                    textAlign: 'center', 
                    padding: '2rem 1rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '1.2rem' 
                  }}
                >
                  <div style={{ color: '#00D68F' }}>
                    <CheckCircle size={56} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>¡Mensaje Recibido!</h3>
                  <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, fontWeight: 500, maxWidth: '350px' }}>
                    Hemos registrado tu ticket con éxito. Uno de nuestros asesores de soporte técnico se pondrá en contacto contigo en menos de 10 minutos por WhatsApp o correo.
                  </p>
                  <button 
                    onClick={() => {
                      setSubmitted(false);
                      setFormState({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="btn-green-main"
                    style={{ border: 'none', cursor: 'pointer', marginTop: '1rem' }}
                  >
                    Enviar otro mensaje
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </section>

      {/* ── 4. ACORDEÓN DE PREGUNTAS DE SOPORTE ── */}
      <section id="faq-section" style={{ padding: '5rem 5% 8rem', position: 'relative', zIndex: 2, scrollMarginTop: '8rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Preguntas de Configuración
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', fontWeight: 500 }}>
              Respuestas rápidas para arrancar tu cuenta con éxito.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ONBOARDING_FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="faq-help-card">
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
