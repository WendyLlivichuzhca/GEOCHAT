import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowLeft, Bot, Zap, Check, Sparkles, Database, Send, Radio, Mail, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

const LogoSVG = ({ size = 20, color = "#00D68F" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const WhatsAppLogoSVG = ({ size = 18, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
);

const Login = ({ onLoginSuccess }) => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para la animación secuencial interactiva del flujo de IA
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });
      const data = await response.json();

      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Credenciales incorrectas');
      }
    } catch {
      setError('Error de conexión: asegúrate de que el servidor Flask esté activo en el puerto 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      overflow: 'hidden',
      background: `
        radial-gradient(circle at 75% 20%, rgba(220, 212, 255, 0.5) 0%, transparent 40%),
        radial-gradient(circle at 20% 50%, rgba(210, 245, 235, 0.4) 0%, transparent 40%),
        radial-gradient(circle at 80% 85%, rgba(230, 242, 255, 0.4) 0%, transparent 50%),
        radial-gradient(circle at 50% 10%, rgba(254, 226, 226, 0.3) 0%, transparent 35%),
        #F4F8FB
      `,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes floatFlowCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes flowPulse {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes shimmerSweep {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.3; }
        }
        @keyframes breatheLed {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(8deg); }
        }
        @keyframes floatIconOpposite {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-8deg); }
        }

        .flow-node {
          animation: floatFlowCard 6s ease-in-out infinite;
          transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .flow-line {
          stroke-dasharray: 6, 6;
          animation: flowPulse 1s linear infinite;
        }
        .btn-shimmer-login {
          background: linear-gradient(135deg, #00D68F 0%, #00B686 100%);
          color: white; border: none; padding: 14px 28px; border-radius: 14px;
          font-weight: 750; font-size: 0.92rem; cursor: pointer; position: relative;
          overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 214, 143, 0.4);
          transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-shimmer-login:hover {
          background: linear-gradient(135deg, #00C2FF 0%, #0099FF 100%);
          box-shadow: 0 10px 25px -5px rgba(0, 194, 255, 0.4);
          transform: translateY(-1px);
        }
        .btn-shimmer-login::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg); animation: shimmerSweep 4s infinite;
        }
        
        .input-wrapper-login {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .input-icon-login {
          position: absolute;
          left: 14px;
          color: #94A3B8;
          pointer-events: none;
          transition: color 0.2s ease;
        }
        .login-input {
          width: 100%; padding: 14px 16px 14px 44px; border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.08); background: rgba(255, 255, 255, 0.65);
          color: #0F172A; font-size: 0.9rem; font-weight: 500; outline: none;
          transition: all 0.2s ease;
        }
        .login-input:focus {
          border-color: #00D68F;
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(0, 214, 143, 0.1);
        }
        .input-wrapper-login:focus-within .input-icon-login {
          color: #00D68F;
        }

        .back-link-login {
          display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem;
          font-weight: 850; text-transform: uppercase; letter-spacing: 0.12em;
          color: #475569; text-decoration: none; transition: all 0.2s ease;
        }
        .back-link-login:hover {
          color: #00D68F;
          transform: translateX(-2px);
        }

        .floating-icon-zapier { animation: floatIcon 6s ease-in-out infinite; }
        .floating-icon-sheets { animation: floatIconOpposite 7s ease-in-out infinite; }
        .floating-icon-stripe { animation: floatIcon 8s ease-in-out infinite; animation-delay: 1s; }
        .floating-icon-hubspot { animation: floatIconOpposite 9s ease-in-out infinite; animation-delay: 1.5s; }

        /* Responsive Layout Rules */
        .login-split-container {
          display: flex; width: 100%; min-height: 100vh;
        }
        .login-form-column {
          width: 100%; display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; position: relative; background: transparent;
        }
        .login-visual-column {
          display: none; width: 50%; background: transparent; position: relative; overflow: hidden;
          flex-direction: column; justify-content: center; padding: 4rem 8% 4rem 4%; border-left: 1px solid rgba(15, 23, 42, 0.05);
        }

        @media (min-width: 1024px) {
          .login-form-column {
            width: 45%;
          }
          .login-visual-column {
            display: flex;
            width: 55%;
          }
        }
      `}</style>

      <div className="login-split-container">
        
        {/* ── COLUMNA IZQUIERDA: FORMULARIO DE ACCESO ── */}
        <div className="login-form-column">
          
          <div style={{
            width: '100%',
            maxWidth: '410px',
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            borderRadius: '28px',
            padding: '3.2rem 2.5rem 2.8rem',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            zIndex: 2,
            overflow: 'hidden'
          }}>
            {/* Barra de color neón en la parte superior de la tarjeta */}
            <div style={{
              height: '5px',
              background: 'linear-gradient(90deg, #00D68F 0%, #00C2FF 100%)',
              width: '100%',
              position: 'absolute',
              top: 0,
              left: 0
            }} />

            {/* Volver */}
            <div style={{ marginBottom: '2.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link to="/" className="back-link-login">
                <ArrowLeft size={12} /> Volver al Inicio
              </Link>
              
              {/* Insignia de seguridad SSL */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px',
                background: 'rgba(0, 214, 143, 0.06)', border: '1px solid rgba(0, 214, 143, 0.15)',
                borderRadius: '100px', color: '#00A87B', fontSize: '0.62rem', fontWeight: 800,
                textTransform: 'uppercase'
              }}>
                <Lock size={9} /> Conexión Segura SSL
              </div>
            </div>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.8rem' }}>
              <img 
                src="/logo_geochat.png" 
                alt="GeoChat Logo" 
                style={{ width: '44px', height: '44px', objectFit: 'contain' }} 
              />
              <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>
                GeoChat
              </h1>
            </div>

            {/* Header */}
            <div style={{ marginBottom: '2.2rem' }}>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                Bienvenido
              </h2>
              {/* Línea divisoria degradada bajo el título */}
              <div style={{
                height: '2.5px',
                width: '45px',
                background: 'linear-gradient(90deg, #00D68F, #00C2FF)',
                borderRadius: '100px',
                marginTop: '8px',
                marginBottom: '12px'
              }} />
              <p style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500, lineHeight: 1.4, margin: 0 }}>
                Ingresa tus credenciales para administrar tus conversaciones.
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 750, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Correo Electrónico
                </label>
                <div className="input-wrapper-login">
                  <Mail className="input-icon-login" size={18} />
                  <input 
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    placeholder="correo@geochat.com"
                    className="login-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 750, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contraseña
                </label>
                <div className="input-wrapper-login">
                  <Lock className="input-icon-login" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="login-input"
                    style={{ paddingRight: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s',
                      zIndex: 3
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#00D68F'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Errores */}
              {error && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#EF4444', padding: '12px', borderRadius: '12px', fontSize: '0.78rem',
                  fontWeight: 650, textAlign: 'center', lineHeight: 1.4
                }}>
                  {error}
                </div>
              )}

              {/* Botón de Enviar */}
              <div style={{ marginTop: '0.6rem' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-shimmer-login"
                  style={{ width: '100%', opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px' }}>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }} />
                      </svg>
                      <span>Validando...</span>
                    </>
                  ) : 'Iniciar sesión'}
                </button>
              </div>

            </form>

            {/* Garantía de Cifrado */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#94A3B8',
              fontSize: '0.7rem',
              fontWeight: 600,
              marginTop: '1.8rem'
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00D68F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Cifrado de extremo a extremo activo</span>
            </div>

          </div>
        </div>

        {/* ── COLUMNA DERECHA: SECCIÓN VISUAL Y CANVAS INTERACTIVO ── */}
        <div className="login-visual-column">
          
          {/* Cuadrícula técnica de fondo (Dotted Grid) */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.08) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px', opacity: 0.8, pointerEvents: 'none', zIndex: 1
          }} />

          {/* Iconos de Integraciones Flotantes 3D en el contorno */}
          {/* Indigo / Zapier */}
          <div className="floating-icon-zapier" style={{
            position: 'absolute', top: '12%', right: '12%', width: '42px', height: '42px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4F46E5 100%)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.25)', zIndex: 3
          }}>
            <Zap size={16} color="white" />
          </div>
          {/* Green / Sheets */}
          <div className="floating-icon-sheets" style={{
            position: 'absolute', top: '48%', right: '8%', width: '38px', height: '38px',
            background: 'linear-gradient(135deg, #00D68F 0%, #00B686 100%)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0, 214, 143, 0.25)', zIndex: 3
          }}>
            <Database size={16} color="white" />
          </div>
          {/* Cyan / Stripe */}
          <div className="floating-icon-stripe" style={{
            position: 'absolute', bottom: '10%', right: '22%', width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #00C2FF 0%, #0099FF 100%)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0, 194, 255, 0.25)', zIndex: 3
          }}>
            <Send size={15} color="white" />
          </div>
          {/* Sky Blue / Shopify */}
          <div className="floating-icon-hubspot" style={{
            position: 'absolute', top: '35%', left: '4%', width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(14, 165, 233, 0.25)', zIndex: 3
          }}>
            <Sparkles size={16} color="white" />
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
              background: 'rgba(0, 214, 143, 0.06)', border: '1px solid rgba(0, 214, 143, 0.15)',
              borderRadius: '100px', color: '#00A87B', fontSize: '0.8rem', fontWeight: 750,
              marginBottom: '1.8rem', alignSelf: 'flex-start'
            }}>
              <Sparkles size={14} /> FLUJO DE TRABAJO AUTOMÁTICO
            </div>

            {/* Título de Impacto */}
            <h2 style={{
              fontSize: 'clamp(1.8rem, 2.3vw, 2.5rem)', fontWeight: 900, color: '#0F172A',
              lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 1.2rem'
            }}>
              Diseña conversaciones que<br />
              <span style={{
                background: 'linear-gradient(90deg, #00D68F 0%, #00C2FF 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900
              }}>venden por ti 24/7.</span>
            </h2>

            <p style={{
              fontSize: '0.95rem', color: '#475569', fontWeight: 500, lineHeight: 1.6,
              maxWidth: '480px', margin: '0 0 3rem'
            }}>
              Vincula tu WhatsApp en segundos. El Agente de IA califica a tus leads, responde objeciones y registra la información directo en tu pipeline.
            </p>
          </div>

          {/* SIMULADOR VISUAL COMPLETO Y SECUENCIAL EN VIVO */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: '540px', 
            height: '240px', 
            margin: '0 0 2.5rem',
            zIndex: 2 
          }}>
            
            {/* BARRA DE ESTADO DE SIMULACIÓN */}
            <div style={{
              position: 'absolute', top: '-25px', left: '10px', display: 'flex', alignItems: 'center', gap: '15px',
              fontSize: '0.68rem', fontWeight: 750, color: '#64748B'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%', background: '#00D68F',
                  display: 'inline-block', animation: 'breatheLed 1.5s infinite ease-in-out'
                }} />
                <span>IA SIMULATOR ACTIVE</span>
              </div>
              <div style={{ color: '#94A3B8' }}>•</div>
              <div>PASO: {activeStep + 1}/4</div>
            </div>

            {/* SVG De Conexión con Líneas animadas de flujo */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {/* Línea 1: Trigger -> AI */}
              <path d="M 125,50 C 170,50 170,125 215,125" fill="none" stroke="rgba(15,23,42,0.03)" strokeWidth="3" />
              <path d="M 125,50 C 170,50 170,125 215,125" fill="none" 
                stroke={activeStep >= 1 ? '#00C2FF' : 'rgba(15,23,42,0.05)'} 
                strokeWidth="2.5" className={activeStep >= 1 ? "flow-line" : ""} 
                style={{ transition: 'stroke 0.3s' }}
              />
              
              {/* Línea 2: AI -> CRM */}
              <path d="M 215,125 C 260,125 270,50 315,50" fill="none" stroke="rgba(15,23,42,0.03)" strokeWidth="3" />
              <path d="M 215,125 C 260,125 270,50 315,50" fill="none" 
                stroke={activeStep >= 2 ? '#00D68F' : 'rgba(15,23,42,0.05)'} 
                strokeWidth="2.5" className={activeStep >= 2 ? "flow-line" : ""} 
                style={{ transition: 'stroke 0.3s' }}
              />

              {/* Línea 3: AI -> Zapier/Webhook */}
              <path d="M 215,125 C 260,125 270,200 315,200" fill="none" stroke="rgba(15,23,42,0.03)" strokeWidth="3" />
              <path d="M 215,125 C 260,125 270,200 315,200" fill="none" 
                stroke={activeStep >= 3 ? '#0ea5e9' : 'rgba(15,23,42,0.05)'} 
                strokeWidth="2.5" className={activeStep >= 3 ? "flow-line" : ""} 
                style={{ transition: 'stroke 0.3s' }}
              />
            </svg>

            {/* Nodo 1: Disparador (WhatsApp) */}
            <div className="flow-node" style={{
              position: 'absolute', top: '15px', left: '10px', width: '135px',
              background: '#FFFFFF', 
              border: activeStep === 0 ? '1.5px solid #25D366' : '1px solid rgba(15, 23, 42, 0.06)', 
              borderRadius: '14px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2,
              boxShadow: activeStep === 0 ? '0 10px 25px rgba(37, 211, 102, 0.12)' : '0 6px 15px rgba(15, 23, 42, 0.02)',
              transform: activeStep === 0 ? 'scale(1.03)' : 'scale(1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WhatsAppLogoSVG size={10} color="white" />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>WhatsApp</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>Mensaje Recibido</span>
              <span style={{ fontSize: '0.6rem', color: '#16A34A', fontWeight: 700 }}>"Precio del Plan"</span>
            </div>

            {/* Nodo 2: Agente de IA (GeoChat Core) */}
            <div className="flow-node" style={{
              position: 'absolute', top: '95px', left: '165px', width: '150px',
              background: '#FFFFFF', 
              border: activeStep === 1 ? '1.5px solid #00C2FF' : '1px solid rgba(15, 23, 42, 0.06)', 
              borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 2,
              boxShadow: activeStep === 1 ? '0 12px 30px rgba(0, 194, 255, 0.15)' : '0 6px 15px rgba(15, 23, 42, 0.02)',
              transform: activeStep === 1 ? 'scale(1.03)' : 'scale(1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '6px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'rgba(0, 194, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C2FF' }}>
                    <Bot size={11} />
                  </div>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#00C2FF', textTransform: 'uppercase' }}>Agente IA</span>
                </div>
                {activeStep === 1 && (
                  <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#00C2FF', background: 'rgba(0,194,255,0.08)', padding: '1px 5px', borderRadius: '100px', marginLeft: 'auto' }}>
                    Pensando...
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>Calificar Prospecto</span>
              <span style={{ fontSize: '0.58rem', color: '#475569', background: '#F1F5F9', padding: '3px 6px', borderRadius: '6px', fontWeight: 550, display: 'inline-block' }}>
                {activeStep >= 1 ? "✓ Catálogo enviado" : "En espera..."}
              </span>
            </div>

            {/* Nodo 3: Acción CRM (Kanban) */}
            <div className="flow-node" style={{
              position: 'absolute', top: '15px', left: '325px', width: '145px',
              background: '#FFFFFF', 
              border: activeStep === 2 ? '1.5px solid #00D68F' : '1px solid rgba(15, 23, 42, 0.06)', 
              borderRadius: '14px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2,
              boxShadow: activeStep === 2 ? '0 10px 25px rgba(0, 214, 143, 0.12)' : '0 6px 15px rgba(15, 23, 42, 0.02)',
              transform: activeStep === 2 ? 'scale(1.03)' : 'scale(1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'rgba(0, 214, 143, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D68F' }}>
                  <Check size={11} />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#00D68F', textTransform: 'uppercase' }}>CRM Kanban</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>Crear Oportunidad</span>
              <span style={{ fontSize: '0.6rem', color: '#00A87B', fontWeight: 700 }}>
                {activeStep >= 2 ? "✓ Lead Guardado" : "Pendiente..."}
              </span>
            </div>

            {/* Nodo 4: Webhook de Integración */}
            <div className="flow-node" style={{
              position: 'absolute', top: '165px', left: '325px', width: '145px',
              background: '#FFFFFF', 
              border: activeStep === 3 ? '1.5px solid #0ea5e9' : '1px solid rgba(15, 23, 42, 0.06)', 
              borderRadius: '14px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2,
              boxShadow: activeStep === 3 ? '0 10px 25px rgba(14, 165, 233, 0.12)' : '0 6px 15px rgba(15, 23, 42, 0.02)',
              transform: activeStep === 3 ? 'scale(1.03)' : 'scale(1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
                  <Database size={11} />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase' }}>Integración</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>Enviar Webhook</span>
              <span style={{ fontSize: '0.6rem', color: '#0ea5e9', fontWeight: 700 }}>
                {activeStep === 3 ? "⚡ 200 OK (Zapier)" : "Listo para enviar"}
              </span>
            </div>

          </div>

          {/* Testimonial */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid rgba(15, 23, 42, 0.05)',
            borderRadius: '20px',
            padding: '1.5rem',
            position: 'relative',
            zIndex: 3,
            boxShadow: '0 15px 30px -10px rgba(15, 23, 42, 0.03)'
          }}>
            <p style={{ fontSize: '0.85rem', color: '#475569', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.5, fontWeight: 500 }}>
              "GeoChat es como tener un equipo de atención al cliente y ventas trabajando las 24 horas del día sin interrupciones."
            </p>
            <div style={{ fontSize: '0.75rem', fontWeight: 750, color: '#0F172A' }}>
              Sofía G. <span style={{ color: '#64748B', fontWeight: 500 }}>— CEO de E-com Express</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;
