import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Workflow, Cpu, Shield, Activity, Layers, Database, CheckCircle2, Zap } from 'lucide-react';
import PublicLayout from './PublicLayout';

/* ── Live Wave Chart ── */
const LiveWave = () => {
  const COUNT = 28;
  const [bars, setBars] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => 30 + ((i * 13 + 7) % 55))
  );

  useEffect(() => {
    const t = setInterval(() => {
      setBars(prev => prev.map((_, i) => {
        // Wave offset: each bar lags slightly behind its neighbor
        const wave = Math.sin(Date.now() / 600 + i * 0.45) * 28;
        return Math.max(15, Math.min(95, 55 + wave + (Math.random() - 0.5) * 12));
      }));
    }, 80);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110, marginBottom: '1rem' }}>
      {bars.map((h, i) => (
        <motion.div key={i}
          animate={{ height: `${h}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 16 }}
          style={{
            flex: 1, borderRadius: 4,
            background: i > COUNT - 6
              ? 'linear-gradient(to top,#0EA5E9,#38BDF8)'
              : `rgba(14,165,233,${0.1 + (i / COUNT) * 0.35})`,
          }}
        />
      ))}
    </div>
  );
};

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

const SYSTEMS = [
  {
    title: 'Motor de Flujos v3',
    desc: 'Lógica de automatización con procesamiento distribuido de eventos. Diseña flujos complejos con una interfaz visual intuitiva.',
    icon: <Workflow size={28} />, color: '#0EA5E9',
    tags: ['Multi-paso', 'Condicionales', 'Webhooks bidireccionales'],
  },
  {
    title: 'Cerebro IA Neural',
    desc: 'Motor generativo que aprende de tu base de datos para respuestas ultra-precisas, contextuales y orientadas a conversión.',
    icon: <Cpu size={28} />, color: '#8B5CF6',
    tags: ['Contexto real', 'Multilingüe', 'Análisis de sentimiento'],
  },
  {
    title: 'Data Vault Seguro',
    desc: 'Encriptación de extremo a extremo y gestión de permisos granular. Tus datos protegidos con estándares de grado bancario.',
    icon: <Shield size={28} />, color: '#10B981',
    tags: ['Backup Pro', 'Auditoría', 'Privacidad Total'],
  },
  {
    title: 'Infraestructura Cloud',
    desc: 'Clusters distribuidos geográficamente para latencia mínima y disponibilidad máxima sin importar el volumen.',
    icon: <Layers size={28} />, color: '#F59E0B',
    tags: ['Alta disponibilidad', 'Auto-scaling', 'Multi-región'],
  },
  {
    title: 'Analytics en Tiempo Real',
    desc: 'Métricas de cada conversación, agente y campana procesadas en milisegundos. Decisiones basadas en datos reales.',
    icon: <Activity size={28} />, color: '#EF4444',
    tags: ['Live metrics', 'KPIs', 'Exportación'],
  },
  {
    title: 'Base de Datos Distribuida',
    desc: 'Almacenamiento escalable con replicación automática. Tu información siempre disponible y con backup en tiempo real.',
    icon: <Database size={28} />, color: '#06B6D4',
    tags: ['Replicación', 'Failover', 'Backup automático'],
  },
];

export default function SystemsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section style={{
        padding: '6rem 2rem 4rem',
        background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE 50%, #F8FAFF)',
        textAlign: 'center',
      }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.span variants={fadeUp} style={{
            display: 'inline-block', background: 'rgba(14,165,233,0.1)',
            color: '#0284C7', padding: '0.45rem 1rem', borderRadius: '100px',
            fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: '1.5rem',
          }}>
            INGENIERÍA DE CLASE MUNDIAL
          </motion.span>
          <motion.h1 variants={fadeUp} style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800,
            color: '#0C4A6E', letterSpacing: '-0.04em', marginBottom: '1.5rem',
          }}>
            Sistemas que <span style={{ background: 'linear-gradient(135deg, #0EA5E9, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>no se detienen.</span>
          </motion.h1>
          <motion.p variants={fadeUp} style={{ color: '#64748B', fontSize: '1.15rem', maxWidth: 640, margin: '0 auto' }}>
            La robustez técnica que tu empresa necesita para manejar miles de conversaciones simultáneas sin comprometer la velocidad.
          </motion.p>
        </motion.div>
      </section>

      {/* Systems Grid */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}
          >
            {SYSTEMS.map(s => (
              <motion.div key={s.title} variants={fadeUp}
                style={{
                  background: '#F8FAFF', borderRadius: '28px', padding: '2.5rem',
                  border: '1px solid #E0F2FE', transition: 'all 0.3s',
                }}
                whileHover={{ scale: 1.02, boxShadow: `0 20px 50px ${s.color}18`, y: -8 }}
              >
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: `${s.color}15`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: s.color, marginBottom: '1.5rem',
                }}>
                  {s.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0C4A6E', marginBottom: '0.75rem' }}>{s.title}</h3>
                <p style={{ color: '#64748B', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '1.5rem' }}>{s.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {s.tags.map(t => (
                    <span key={t} style={{
                      background: `${s.color}10`, color: s.color,
                      padding: '0.3rem 0.75rem', borderRadius: '100px',
                      fontSize: '0.75rem', fontWeight: 700,
                      border: `1px solid ${s.color}25`,
                    }}>{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Infra Showcase */}
      <section style={{ padding: '5rem 2rem', background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0C4A6E', marginBottom: '1.5rem', lineHeight: 1.2 }}>
              Construido para escalar<br />sin límites técnicos.
            </h2>
            <p style={{ color: '#64748B', lineHeight: 1.8, fontSize: '1.05rem', marginBottom: '2rem' }}>
              Nuestra arquitectura de microservicios garantiza que cada componente escale de forma independiente, eliminando cuellos de botella incluso en picos de tráfico extremos.
            </p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {['Alta disponibilidad con failover automático', 'Balanceo de carga inteligente', 'Encriptación TLS en tránsito', 'Backups incrementales cada hora'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: '#0C4A6E' }}>
                  <CheckCircle2 size={18} color="#10B981" /> {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div style={{
              background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)',
              borderRadius: '28px', padding: '2.5rem',
              border: '1px solid rgba(224,242,254,0.9)',
              boxShadow: '0 20px 50px rgba(14,165,233,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <Zap size={20} color="#10B981" fill="#10B981" />
                <span style={{ fontWeight: 700, color: '#0C4A6E' }}>Estado del Sistema: Óptimo</span>
              </div>
              <LiveWave />
              <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
                CARGA DEL SISTEMA EN TIEMPO REAL · ÓPTIMO
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
