import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Globe, Zap, Database, ArrowRight, CheckCircle2, Code } from 'lucide-react';
import PublicLayout from './PublicLayout';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

const INTEGRATIONS = [
  { name: 'WhatsApp Cloud API', type: 'NATIVO', desc: 'Conexión oficial sin depender de tu teléfono. Estable, seguro y siempre activo.', icon: <MessageCircle size={28} />, color: '#25D366' },
  { name: 'Meta Business Suite', type: 'SOCIAL', desc: 'Sincroniza campañas de Facebook e Instagram Direct en un solo flujo.', icon: <Globe size={28} />, color: '#0668E1' },
  { name: 'Zapier & Make', type: 'AUTOMATIZACIÓN', desc: 'Conecta GeoChat con más de 5,000 aplicaciones sin escribir una sola línea.', icon: <Zap size={28} />, color: '#FF4A00' },
  { name: 'CRM (HubSpot/Salesforce)', type: 'NEGOCIOS', desc: 'Mantén leads sincronizados bidireccional con tus plataformas de ventas.', icon: <Database size={28} />, color: '#FF7A59' },
];

export default function IntegrationsPage() {
  return (
    <PublicLayout>
      <section style={{ padding: '6rem 2rem 4rem', background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)', textAlign: 'center' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.span variants={fadeUp} style={{ display: 'inline-block', background: 'rgba(14,165,233,0.1)', color: '#0284C7', padding: '0.45rem 1rem', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            ECOSISTEMA ABIERTO
          </motion.span>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: '#0C4A6E', letterSpacing: '-0.04em', marginBottom: '1.25rem' }}>
            Conéctate con{' '}
            <span style={{ background: 'linear-gradient(135deg, #0EA5E9, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>todo tu mundo.</span>
          </motion.h1>
          <motion.p variants={fadeUp} style={{ color: '#64748B', fontSize: '1.1rem', maxWidth: 620, margin: '0 auto' }}>
            GeoChat se integra de forma nativa con las herramientas que ya usas para que tu operación nunca se detenga.
          </motion.p>
        </motion.div>
      </section>

      <section style={{ padding: '5rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: '1.5rem' }}>
            {INTEGRATIONS.map(it => (
              <motion.div key={it.name} variants={fadeUp}
                style={{ background: '#F8FAFF', borderRadius: '28px', padding: '2.5rem', border: '1px solid #E0F2FE', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}
                whileHover={{ scale: 1.02, boxShadow: `0 20px 50px ${it.color}15`, y: -6 }}>
                <div style={{ width: 70, height: 70, borderRadius: '20px', background: `${it.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: it.color, flexShrink: 0 }}>
                  {it.icon}
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: it.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{it.type}</span>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0C4A6E', margin: '0.5rem 0 0.75rem' }}>{it.name}</h3>
                  <p style={{ color: '#64748B', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '1.25rem' }}>{it.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0EA5E9', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                    Conectar ahora <ArrowRight size={16} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* API Section */}
      <section style={{ padding: '5rem 2rem', background: 'linear-gradient(135deg, #0C4A6E, #0284C7)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <Code size={40} color="#38BDF8" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', lineHeight: 1.2 }}>API de Desarrollador<br />Completamente Abierta.</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginBottom: '2rem' }}>
              Construye integraciones personalizadas con nuestra API REST completa. Webhooks en tiempo real, documentación exhaustiva y entorno sandbox incluido.
            </p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {['Documentación interactiva', 'Webhooks en tiempo real', 'Entorno sandbox gratuito', 'SDKs en múltiples lenguajes'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                  <CheckCircle2 size={18} color="#10B981" /> {t}
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '24px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Space Mono', monospace", fontSize: '0.9rem' }}>
            <p style={{ color: '#64748B', marginBottom: '0.5rem' }}># Endpoint de contactos</p>
            <p style={{ color: '#38BDF8' }}>GET /api/contacts HTTP/1.1</p>
            <p style={{ color: '#fff' }}>Host: api.geochat.io</p>
            <p style={{ color: '#fff' }}>Authorization: Bearer {'<YOUR_KEY>'}</p>
            <p style={{ color: '#fff' }}>ngrok-skip-browser-warning: 69420</p>
            <br />
            <p style={{ color: '#64748B' }}># Respuesta 200 OK</p>
            <p style={{ color: '#10B981' }}>{'{'}</p>
            <p style={{ color: '#fff', paddingLeft: '1.5rem' }}>"success": true,</p>
            <p style={{ color: '#fff', paddingLeft: '1.5rem' }}>"contacts": [...]</p>
            <p style={{ color: '#10B981' }}>{'}'}</p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
