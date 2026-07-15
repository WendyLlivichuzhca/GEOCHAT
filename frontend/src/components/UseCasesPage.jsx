import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Coins, 
  Clock, 
  Sparkles,
  Smartphone,
  Bot,
  Users,
  Settings
} from 'lucide-react';
import PublicLayout from './PublicLayout';

const USE_CASES = [
  {
    title: 'Tiendas & E-commerce',
    emoji: '🛍️',
    problem: 'Preguntas constantes de stock, tallas, formas de pago y estatus de envío que saturan a tu equipo.',
    solution: 'La IA de GeoChat recomienda productos, asiste en la compra y brinda el tracking de envío al instante.',
    metric: '+40% conversión',
    metricLabel: 'de carritos recuperados',
    color: '#00D68F'
  },
  {
    title: 'Bienes Raíces & Inmobiliarias',
    emoji: '🏢',
    problem: 'Cientos de personas preguntando por propiedades sin calificar presupuesto ni zona de interés.',
    solution: 'El Agente de IA filtra prospectos, envía folletos en PDF y agenda visitas solo con clientes calificados.',
    metric: '3x más citas',
    metricLabel: 'agendadas con leads calificados',
    color: '#00C2FF'
  },
  {
    title: 'Consultorios & Sector Salud',
    emoji: '🩺',
    problem: 'Secretarias ocupadas respondiendo llamadas repetitivas para reservar o cancelar turnos médicos.',
    solution: 'Sincroniza tu agenda y permite que la IA muestre turnos disponibles, reserve citas y envíe recordatorios.',
    metric: '-50% llamadas',
    metricLabel: 'telefónicas en recepción',
    color: '#8B5CF6'
  },
  {
    title: 'Servicios Profesionales & B2B',
    emoji: '💼',
    problem: 'Pérdida de tiempo en reuniones con prospectos que no cumplen con tu presupuesto o perfil ideal.',
    solution: 'La IA califica al prospecto en frío mediante preguntas clave y, si es apto, lo conecta con tu equipo comercial.',
    metric: '+35% conversión',
    metricLabel: 'de leads fríos a reuniones',
    color: '#F59E0B'
  },
  {
    title: 'Soporte & Postventa',
    emoji: '💬',
    problem: 'Clientes frustrados esperando horas por respuestas simples de preguntas frecuentes.',
    solution: 'Bandeja multiagente centralizada que responde al instante y deriva chats complejos a agentes humanos.',
    metric: '< 1 min',
    metricLabel: 'tiempo de respuesta promedio',
    color: '#EC4899'
  },
  {
    title: 'Educación & Academias',
    emoji: '🎓',
    problem: 'Saturación en temporadas de inscripción respondiendo precios, temarios y fechas de inicio.',
    solution: 'La IA comparte temarios interactivos en PDF, aclara costos y guía al estudiante en su inscripción.',
    metric: '+60% registros',
    metricLabel: 'automatizados sin intervención',
    color: '#3B82F6'
  }
];

export default function UseCasesPage() {
  const [chatsCount, setChatsCount] = useState(1000);
  const [ticketVal, setTicketVal] = useState(50);
  const [conversionRate, setConversionRate] = useState(5);

  const handleScrollToCalculator = (e) => {
    e.preventDefault();
    const element = document.getElementById('roi-calculator');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cálculos matemáticos de ROI
  const currentRevenue = chatsCount * (conversionRate / 100) * ticketVal;
  // GeoChat incrementa la conversión un 3% en promedio al responder de inmediato
  const estimatedNewConversion = conversionRate + 3;
  const newRevenue = chatsCount * (estimatedNewConversion / 100) * ticketVal;
  const extraRevenue = Math.max(0, Math.round(newRevenue - currentRevenue));
  
  // Asumiendo que cada chat toma 4 minutos del equipo en promedio
  const hoursSaved = Math.round((chatsCount * 4) / 60);

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
        .btn-white-main {
          background: #FFFFFF; color: #0F172A; padding: 16px 36px; border-radius: 100px;
          font-weight: 700; font-size: 1rem; display: inline-flex; align-items: center; gap: 8px;
          text-decoration: none; border: 1px solid #E2E8F0; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03); transition: all 0.3s ease;
        }
        .btn-white-main:hover {
          background: #F8FAFC;
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
        }
        .industry-card {
          background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(255, 255, 255, 0.75);
          border-radius: 28px; padding: 2.5rem; transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          display: flex; flexDirection: column; gap: 1.2rem; backdrop-filter: blur(16px);
        }
        .industry-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.75);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
        }
        .slider-input {
          -webkit-appearance: none; width: 100%; height: 6px; border-radius: 5px; 
          background: #E2E8F0; outline: none; margin: 12px 0 24px;
        }
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 20px; height: 20px; 
          border-radius: 50%; background: #00D68F; cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 214, 143, 0.5); transition: transform 0.1s;
        }
        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .size-card {
          background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 24px; padding: 2.5rem; display: flex; flex-direction: column; gap: 1.2rem;
          transition: all 0.3s ease; backdrop-filter: blur(12px);
        }
        .size-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.55);
          border-color: #00D68F;
        }
      `}</style>

      {/* ── 1. HERO COMERCIAL ── */}
      <section style={{ padding: '11rem 5% 5rem', position: 'relative' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', textAlign: 'center' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0, 214, 143, 0.08)', border: '1px solid rgba(0, 214, 143, 0.2)', borderRadius: '100px', color: '#00A87B', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <span>💼</span> Optimización de Operaciones
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)', fontWeight: 900, lineHeight: 1.1, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 1.5rem' }}>
            Soluciones diseñadas a la<br />
            <span style={{ color: '#00D68F' }}>medida de tu negocio.</span>
          </h1>

          <p style={{ fontSize: '1.15rem', lineHeight: 1.6, color: '#475569', fontWeight: 500, maxWidth: '750px', margin: '0 auto 3.5rem' }}>
            Descubre cómo empresas de todos los sectores automatizan el 80% de sus chats diarios en WhatsApp para liberar de carga a sus vendedores y multiplicar sus ventas.
          </p>

          <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/inversion" className="btn-green-main">Ver Planes e Inversión <ArrowRight size={18} /></Link>
            <a href="#roi-calculator" onClick={handleScrollToCalculator} className="btn-white-main">Calcular Retorno (ROI)</a>
          </div>
        </div>
      </section>

      {/* ── 2. GRID DE INDUSTRIAS (CASOS DE USO) ── */}
      <section style={{ padding: '5rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Soluciones para cada sector
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Explora cómo los Agentes de IA y los flujos conversacionales resuelven los problemas reales de tu industria.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {USE_CASES.map((uc, i) => (
              <div key={i} className="industry-card" style={{ borderLeft: `4px solid ${uc.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '2.5rem' }}>{uc.emoji}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: uc.color }}>{uc.metric}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{uc.metricLabel}</div>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '0.5rem' }}>{uc.title}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.88rem', lineHeight: 1.5, fontWeight: 500 }}>
                  <div>
                    <span style={{ color: '#EF4444', fontWeight: 700 }}>El Problema:</span>
                    <p style={{ color: '#475569', marginTop: '2px' }}>{uc.problem}</p>
                  </div>
                  <div>
                    <span style={{ color: '#00D68F', fontWeight: 700 }}>La Solución:</span>
                    <p style={{ color: '#475569', marginTop: '2px' }}>{uc.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 3. CALCULADORA INTERACTIVA DE ROI ── */}
      <section id="roi-calculator" style={{ padding: '5rem 5%', position: 'relative', zIndex: 2, scrollMarginTop: '8rem' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Calcula tus ganancias estimadas
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Ingresa los datos actuales de tu negocio y calcula cuánto tiempo y dinero adicional puedes recuperar implementando GeoChat.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.75)',
            borderRadius: '36px',
            padding: '4rem 3rem',
            boxShadow: '0 30px 60px -20px rgba(15, 23, 42, 0.05)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center'
          }}>
            
            {/* Lado izquierdo: Deslizadores */}
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '2.5rem' }}>Parámetros de tu Negocio</h3>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                  <span>Chats recibidos al mes</span>
                  <span style={{ color: '#00D68F', fontSize: '1rem' }}>{chatsCount.toLocaleString()} chats</span>
                </div>
                <input 
                  type="range" 
                  min="200" 
                  max="10000" 
                  step="100"
                  value={chatsCount} 
                  onChange={(e) => setChatsCount(parseInt(e.target.value))}
                  className="slider-input" 
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                  <span>Valor promedio de venta (Ticket)</span>
                  <span style={{ color: '#00D68F', fontSize: '1rem' }}>${ticketVal} USD</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="1000" 
                  step="5"
                  value={ticketVal} 
                  onChange={(e) => setTicketVal(parseInt(e.target.value))}
                  className="slider-input" 
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                  <span>Tasa de conversión actual</span>
                  <span style={{ color: '#00D68F', fontSize: '1rem' }}>{conversionRate}% de chats</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="25" 
                  step="1"
                  value={conversionRate} 
                  onChange={(e) => setConversionRate(parseInt(e.target.value))}
                  className="slider-input" 
                />
              </div>
            </div>

            {/* Lado derecho: Resultados */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '28px',
              padding: '3rem',
              boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)',
              border: '1px solid #F1F5F9',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#64748B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Retorno Mensual Estimado</h3>
              
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>Ingreso Adicional Estimado</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: '#00D68F', letterSpacing: '-0.04em' }}>+${extraRevenue.toLocaleString()}</div>
                  <div style={{ fontSize: '0.9rem', color: '#00D68F', fontWeight: 800 }}>USD / mes</div>
                </div>
                <div style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 500, marginTop: '4px' }}>*Al responder en segundos e incrementar un 3% tu tasa de conversión actual</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid #F1F5F9', paddingTop: '2rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00C2FF', marginBottom: '6px' }}>
                    <Clock size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Tiempo Ahorrado</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A' }}>{hoursSaved} horas</div>
                  <span style={{ color: '#94A3B8', fontSize: '0.7rem', fontWeight: 500 }}>al mes para tu equipo</span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B5CF6', marginBottom: '6px' }}>
                    <Coins size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Eficiencia IA</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A' }}>100%</div>
                  <span style={{ color: '#94A3B8', fontSize: '0.7rem', fontWeight: 500 }}>de chats atendidos 24/7</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. SOLUCIONES POR TAMAÑO ── */}
      <section style={{ padding: '5rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.7rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Diseñado para cualquier escala
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '600px', margin: '0 auto', fontWeight: 500 }}>
              Desde auto-empleados hasta corporaciones multinacionales, GeoChat se amolda a tu flujo operativo.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Emprendedores */}
            <div className="size-card">
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(0, 214, 143, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D68F' }}>
                <Bot size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Emprendedores & Solopreneurs</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Ideal si trabajas solo y no tienes tiempo de contestar. El Agente de IA califica a tus clientes potenciales, responde preguntas recurrentes y te envía los datos a tu celular listos para cerrar.
              </p>
            </div>

            {/* Pymes */}
            <div className="size-card">
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(0, 194, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C2FF' }}>
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Equipos de Venta & Pymes</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Ideal para centralizar a varios vendedores en una sola línea de WhatsApp. Cuenta con bandeja compartida, asignación inteligente, tags y un pipeline visual Kanban para organizar tus cierres de venta.
              </p>
            </div>

            {/* Corporativos */}
            <div className="size-card">
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
                <Settings size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Empresas & Grandes Equipos</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                Ideal si necesitas conectar múltiples números, entrenar diferentes modelos de IA para distintas áreas o integrar tus bases de datos mediante webhooks y APIs personalizadas de alto rendimiento.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. CIERRE MINIMALISTA ── */}
      <section style={{ padding: '4rem 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', textAlign: 'center' }}>
          <Link to="/inversion" className="btn-green-main">Ver Planes e Inversión <ArrowRight size={18} /></Link>
        </div>
      </section>

    </PublicLayout>
  );
}
