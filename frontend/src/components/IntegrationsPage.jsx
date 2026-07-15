import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  Terminal,
  CheckCircle
} from 'lucide-react';
import PublicLayout from './PublicLayout';

const CONNECTIONS = [
  { 
    name: 'Google Sheets', 
    category: 'sheets', 
    description: 'Exporta leads calificados y datos recopilados por la IA en tiempo real a tus hojas de cálculo de forma estructurada.', 
    color: '#0F9D58', 
    logo: '📊' 
  },
  { 
    name: 'Zapier', 
    category: 'automation', 
    description: 'Conecta GeoChat con más de 5,000 aplicaciones web sin escribir una sola línea de código en un par de clics.', 
    color: '#FF4A00', 
    logo: '🧡' 
  },
  { 
    name: 'HubSpot', 
    category: 'crm', 
    description: 'Sincroniza tus contactos de WhatsApp y sus estados de calificación directamente en tu pipeline de ventas de HubSpot.', 
    color: '#FF7A59', 
    logo: '🤝' 
  },
  { 
    name: 'Stripe', 
    category: 'payments', 
    description: 'Genera enlaces de cobro seguros directamente en tus conversaciones de WhatsApp y recibe alertas de pago confirmados.', 
    color: '#635BFF', 
    logo: '💳' 
  },
  { 
    name: 'Make', 
    category: 'automation', 
    description: 'Diseña automatizaciones y flujos de trabajo avanzados, lógicos y multi-etapa integrando tu WhatsApp.', 
    color: '#8247E5', 
    logo: '💜' 
  },
  { 
    name: 'Salesforce', 
    category: 'crm', 
    description: 'Conecta tus conversaciones con el CRM número uno a nivel mundial para calificar, rutear y nutrir cuentas corporativas.', 
    color: '#00A1E0', 
    logo: '☁️' 
  },
  { 
    name: 'Shopify', 
    category: 'ecom', 
    description: 'Permite que la IA de GeoChat consulte el stock de tu tienda, recomiende productos y recupere carritos abandonados.', 
    color: '#96BF48', 
    logo: '🛍️' 
  },
  { 
    name: 'PayPal', 
    category: 'payments', 
    description: 'Envía cobros directos de PayPal y simplifica el proceso de compra de tus clientes directamente por chat.', 
    color: '#003087', 
    logo: '💙' 
  },
  { 
    name: 'WooCommerce', 
    category: 'ecom', 
    description: 'Vincula tu catálogo de WordPress para enviar fichas de productos y crear órdenes en caliente directo desde WhatsApp.', 
    color: '#96588A', 
    logo: '🛒' 
  },
  { 
    name: 'Mercado Pago', 
    category: 'payments', 
    description: 'Ofrece cobros dinámicos con tarjetas locales de débito y crédito en moneda local a tus clientes de toda Latinoamérica.', 
    color: '#009EE3', 
    logo: '💰' 
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'crm', label: 'CRMs' },
  { id: 'sheets', label: 'Hojas de Cálculo' },
  { id: 'payments', label: 'Pasarelas de Pago' },
  { id: 'automation', label: 'Automatización' },
  { id: 'ecom', label: 'E-commerce' }
];

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredConnections = CONNECTIONS.filter(conn => {
    const matchesSearch = conn.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          conn.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || conn.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
        .category-filter-btn {
          padding: 10px 20px; border-radius: 100px; border: 1px solid rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.45); color: #475569; font-size: 0.88rem; font-weight: 700;
          cursor: pointer; transition: all 0.3s ease;
        }
        .category-filter-btn:hover {
          background: rgba(255, 255, 255, 0.8);
          border-color: #00D68F;
          color: #0F172A;
        }
        .category-filter-btn.active {
          background: #FFFFFF;
          border-color: #00D68F;
          color: #00D68F;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
        }
        .conn-card {
          background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(255, 255, 255, 0.75);
          border-radius: 24px; padding: 2rem; display: flex; flex-direction: column; gap: 1rem;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); backdrop-filter: blur(16px);
        }
        .conn-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.75);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
        }
        .dev-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px;
          background: rgba(0, 214, 143, 0.08); border: 1px solid rgba(0, 214, 143, 0.2);
          border-radius: 100px; color: #00A87B; font-size: 0.75rem; font-weight: 700;
        }
      `}</style>

      {/* ── 1. HÉROE TECNOLÓGICO ── */}
      <section style={{ padding: '11rem 5% 4rem', position: 'relative' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', textAlign: 'center' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0, 214, 143, 0.08)', border: '1px solid rgba(0, 214, 143, 0.2)', borderRadius: '100px', color: '#00A87B', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <span>🔌</span> Conexiones sin Límites
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)', fontWeight: 900, lineHeight: 1.1, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 1.5rem' }}>
            Conecta GeoChat con las<br />
            <span style={{ color: '#00D68F' }}>herramientas que ya utilizas.</span>
          </h1>

          <p style={{ fontSize: '1.15rem', lineHeight: 1.6, color: '#475569', fontWeight: 500, maxWidth: '750px', margin: '0 auto 3rem' }}>
            Sincroniza contactos, actualiza bases de datos y gestiona pagos de WhatsApp automáticamente sin romper tus flujos de trabajo actuales.
          </p>
        </div>
      </section>

      {/* ── 2. CATÁLOGO INTERACTIVO CON BUSCADOR Y FILTROS ── */}
      <section style={{ padding: '2rem 5% 5rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          {/* Barra de Búsqueda y Filtros de Categoría */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.75)',
            borderRadius: '28px',
            padding: '2rem',
            marginBottom: '3rem',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            
            {/* Input del Buscador */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={20} color="#94A3B8" style={{ position: 'absolute', left: '16px' }} />
              <input 
                type="text" 
                placeholder="Buscar conexiones (ej. Sheets, Stripe, HubSpot...)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.02)',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00D68F'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            {/* Categorías */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`category-filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

          </div>

          {/* Grid de Conexiones Filtradas */}
          {filteredConnections.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {filteredConnections.map((conn, i) => (
                <div key={i} className="conn-card" style={{ borderTop: `4px solid ${conn.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '2rem' }}>{conn.logo}</span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{conn.name}</h3>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: conn.color, textTransform: 'uppercase', background: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '100px', border: `1px solid ${conn.color}22` }}>
                      Compatible
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                    {conn.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.3)', borderRadius: '24px', border: '1px dashed rgba(15, 23, 42, 0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>No encontramos esa conexión</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: '400px', margin: '0 auto' }}>
                Prueba buscando otro término o usa Zapier / Webhooks para conectar prácticamente cualquier aplicación.
              </p>
            </div>
          )}

        </div>
      </section>

      {/* ── 3. SECCIÓN PARA DESARROLLADORES (WEBHOOKS & API) ── */}
      <section style={{ padding: '5rem 5%', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '5rem', alignItems: 'center' }}>
          
          {/* Lado izquierdo: Textos explicativos */}
          <div>
            <div className="dev-badge" style={{ marginBottom: '1.5rem' }}>
              <Terminal size={14} /> Desarrolladores
            </div>

            <h2 style={{ fontSize: 'clamp(2rem, 3vw, 2.7rem)', fontWeight: 900, lineHeight: 1.1, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 1.2rem' }}>
              Webhooks & API REST<br />
              <span style={{ color: '#00D68F' }}>a tu propio ritmo.</span>
            </h2>

            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#475569', fontWeight: 500, marginBottom: '2rem' }}>
              ¿Tienes un sistema interno o un CRM propietario? Conecta GeoChat enviando payloads JSON automáticos en milisegundos cada vez que un lead sea calificado o agende una cita con la IA.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <CheckCircle size={16} color="#00D68F" />
                API REST completa para envío de mensajes plantillas o texto libre.
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <CheckCircle size={16} color="#00D68F" />
                Webhooks con reintentos automáticos y firma de seguridad.
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <CheckCircle size={16} color="#00D68F" />
                Documentación interactiva disponible en Swagger / Postman.
              </li>
            </ul>
          </div>

          {/* Lado derecho: Consola de código simulada */}
          <div style={{
            background: '#0F172A',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
            fontSize: '0.82rem',
            lineHeight: 1.5,
            color: '#F8FAFC',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header consola */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
              </div>
              <span style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 700 }}>POST /webhooks/geochat-lead</span>
            </div>

            {/* Código JSON */}
            <pre style={{ margin: 0, color: '#38BDF8', overflowX: 'auto' }}>
{`{
  `}<span style={{ color: '#F472B6' }}>"event"</span>{`: `}<span style={{ color: '#34D399' }}>"lead.qualified"</span>{`,
  `}<span style={{ color: '#F472B6' }}>"timestamp"</span>{`: `}<span style={{ color: '#34D399' }}>"2026-07-15T18:50:00Z"</span>{`,
  `}<span style={{ color: '#F472B6' }}>"data"</span>{`: {
    `}<span style={{ color: '#F472B6' }}>"phone"</span>{`: `}<span style={{ color: '#34D399' }}>"+593987654321"</span>{`,
    `}<span style={{ color: '#F472B6' }}>"name"</span>{`: `}<span style={{ color: '#34D399' }}>"Wendy Llivichuzhca"</span>{`,
    `}<span style={{ color: '#F472B6' }}>"status"</span>{`: `}<span style={{ color: '#34D399' }}>"qualified"</span>{`,
    `}<span style={{ color: '#F472B6' }}>"summary"</span>{`: `}<span style={{ color: '#34D399' }}>"Interesado en Plan Agencia. Solicita demo."</span>{`,
    `}<span style={{ color: '#F472B6' }}>"variables"</span>{`: {
      `}<span style={{ color: '#F472B6' }}>"email"</span>{`: `}<span style={{ color: '#34D399' }}>"wendy@geochat.com"</span>{`,
      `}<span style={{ color: '#F472B6' }}>"company"</span>{`: `}<span style={{ color: '#34D399' }}>"GeoInformatica"</span>{`
    }
  }
}`}
            </pre>
          </div>

        </div>
      </section>

      {/* ── 4. CIERRE MINIMALISTA ── */}
      <section style={{ padding: '4rem 5% 8rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', textAlign: 'center' }}>
          <Link to="/inversion" className="btn-green-main">Ver Planes e Inversión <ArrowRight size={18} /></Link>
        </div>
      </section>

    </PublicLayout>
  );
}
