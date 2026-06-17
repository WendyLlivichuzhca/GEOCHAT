// frontend/src/components/ChatbotWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Send, Bot, Sparkles, Cpu, Layers, 
  HelpCircle, Activity, Copy, AlertTriangle, Users, 
  Smartphone, Brain, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ChatbotWidget({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const storageKey = `geochat_chat_history_${user?.id || 'default'}`;

  // Cargar historial inicial desde localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(m => ({ 
          ...m, 
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date() 
        }));
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
    return [
      {
        id: 'welcome',
        text: '¡Hola! 👋 Soy tu Asistente Virtual de GeoCHAT. Estoy aquí para ayudarte a monitorear tu sistema y responder tus dudas. ¿En qué te puedo colaborar hoy?',
        sender: 'bot',
        timestamp: new Date(),
      }
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Guardar mensajes en localStorage cada vez que cambien
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages, storageKey]);

  // Consultar estadísticas silenciosamente al abrir por primera vez o refrescar
  useEffect(() => {
    if (isOpen) {
      fetch(`${API_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          message: 'init_stats_silent',
        }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      })
      .catch(err => console.error('Error fetching silent stats:', err));
    }
  }, [isOpen, user?.id]);

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar el historial de conversación?')) {
      const welcomeMessage = {
        id: 'welcome',
        text: '¡Hola! 👋 Soy tu Asistente Virtual de GeoCHAT. Estoy aquí para ayudarte a monitorear tu sistema y responder tus dudas. ¿En qué te puedo colaborar hoy?',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  };

  // Auto scroll al recibir mensajes o cambiar de estado de carga
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const quickActions = [
    { label: 'Ver Dispositivos', icon: <Cpu size={14} />, query: 'dispositivos' },
    { label: 'Resumen de Contactos', icon: <Layers size={14} />, query: 'contactos' },
    { label: 'Estado del Bridge', icon: <Activity size={14} />, query: 'bridge' },
    { label: 'Ayuda de Comandos', icon: <HelpCircle size={14} />, query: 'ayuda' },
  ];

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          message: text.trim(),
        }),
      });

      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
      
      const botResponse = {
        id: `bot_${Date.now()}`,
        text: data.success ? data.response : (data.message || 'Lo siento, ocurrió un error en la conexión.'),
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error al consultar chatbot:', error);
      const errorMsg = {
        id: `err_${Date.now()}`,
        text: 'No logré conectarme con el servidor. Por favor, verifica tu conexión.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessageText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="font-bold text-white">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Botón flotante animado con brillo y pulso */}
      <motion.div
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center text-white cursor-pointer z-50 hover:shadow-[0_0_35px_rgba(16,185,129,0.7)]"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20 pointer-events-none" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <MessageCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Panel de chat flotante Dark Glassmorphism */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-24 right-8 w-[390px] max-w-[calc(100vw-32px)] h-[580px] bg-[#0b0f19]/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800/60 flex flex-col overflow-hidden z-50 origin-bottom-right"
          >
            {/* Cabecera premium */}
            <div className="p-5 bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#111827] border-b border-slate-800/80 text-white flex items-center justify-between shadow-md relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white border border-white/10 shadow-inner">
                  <Bot size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-normal flex items-center gap-1.5 text-white">
                    GeoCHAT Asistente
                    <Sparkles size={13} className="text-emerald-400" />
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">En línea</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearHistory}
                  title="Vaciar Historial"
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 hover:text-red-400 transition-all flex items-center justify-center text-slate-400"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 transition-all flex items-center justify-center text-slate-300"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Mini Dashboard Visual de Estado (Salud de la plataforma) */}
            {stats && (
              <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-3 flex gap-2 justify-between items-center select-none shrink-0">
                <div className="flex items-center gap-1.5 bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-800/50 flex-1 hover:bg-slate-950/60 transition-all">
                  <Users size={12} className="text-indigo-400" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Contactos</span>
                    <span className="text-xs font-bold text-slate-100 leading-none mt-0.5">{stats.contacts}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-800/50 flex-1 hover:bg-slate-950/60 transition-all">
                  <Smartphone size={12} className={stats.disconnected_devices > 0 ? "text-amber-400 animate-pulse" : "text-emerald-400"} />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Líneas</span>
                    <span className="text-xs font-bold text-slate-100 leading-none mt-0.5">
                      {stats.devices - stats.disconnected_devices}/{stats.devices}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-800/50 flex-1 hover:bg-slate-950/60 transition-all">
                  <Brain size={12} className="text-pink-400" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Reglas IA</span>
                    <span className="text-xs font-bold text-slate-100 leading-none mt-0.5">{stats.automations}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta de dispositivo desconectado */}
            {stats && stats.disconnected_devices > 0 && (
              <div 
                onClick={() => handleSendMessage('dispositivos')}
                className="bg-amber-950/45 hover:bg-amber-950/65 border-b border-amber-900/50 px-5 py-2.5 flex items-center justify-between text-amber-300 text-[10px] font-bold cursor-pointer transition-all shrink-0 select-none"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={12} className="text-amber-500 shrink-0 animate-bounce" />
                  <span>Tienes {stats.disconnected_devices} dispositivo(s) desconectado(s)</span>
                </div>
                <span className="text-amber-400 underline hover:text-amber-250">Ver diagnóstico →</span>
              </div>
            )}

            {/* Cuerpo de mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 bg-slate-950/40 custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 flex items-center justify-center shrink-0 mb-0.5 shadow-sm shadow-emerald-950">
                      <Bot size={14} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-[1.25rem] px-4 py-3 text-[11px] leading-relaxed font-semibold shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-tr from-[#5d5fef] to-[#4c4ded] text-white rounded-br-none border border-indigo-500/20'
                        : 'bg-[#1e293b]/90 border border-slate-800/80 text-slate-300 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{formatMessageText(msg.text)}</p>
                    
                    {msg.sender === 'bot' && (msg.text.includes('{nombre}') || msg.text.includes('{name}') || msg.text.includes('•')) && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="mt-2.5 flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 rounded-lg text-[9px] font-bold border border-emerald-800/40 transition-all active:scale-95 shadow-sm"
                      >
                        <Copy size={10} />
                        {copiedId === msg.id ? '¡Copiado!' : 'Copiar plantilla'}
                      </button>
                    )}
                    
                    <span
                      className={`block text-[8px] mt-1 text-right font-medium ${
                        msg.sender === 'user' ? 'text-white/60' : 'text-slate-500'
                      }`}
                    >
                      {new Intl.DateTimeFormat('es-EC', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-950">
                    <Bot size={14} />
                  </div>
                  <div className="bg-[#1e293b]/90 border border-slate-800/80 text-slate-400 rounded-[1.25rem] rounded-bl-none px-4 py-3.5 shadow-md flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 px-1 py-0.5">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Acciones Rápidas (Chips) */}
            <div className="px-5 py-3.5 bg-[#0b0f19] border-t border-slate-900 overflow-x-auto flex gap-2 shrink-0 custom-scrollbar select-none">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action.query)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/30 hover:text-emerald-400 transition-all rounded-full text-[10px] font-bold text-slate-400 shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input de mensaje */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-4 bg-[#0b0f19] border-t border-slate-900 flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pregúntame algo sobre GeoCHAT..."
                disabled={isLoading}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl h-11 px-4 text-xs font-semibold text-slate-250 placeholder:text-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:bg-slate-900/80 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-teal-600 disabled:from-slate-800 disabled:to-slate-900 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-md shadow-emerald-950 shrink-0 active:scale-95 hover:brightness-110"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
