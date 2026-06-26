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
  const [showTooltip, setShowTooltip] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Mostrar globo de bienvenida flotante después de un delay
  useEffect(() => {
    const dismissed = sessionStorage.getItem('geochat_tooltip_dismissed');
    if (!dismissed && !isOpen) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
      }, 4000); // Aparece a los 4 segundos
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDismissTooltip = (e) => {
    e.stopPropagation(); // Evita abrir el chat al cerrar el globo
    setShowTooltip(false);
    sessionStorage.setItem('geochat_tooltip_dismissed', 'true');
  };

  // Guardar mensajes en localStorage cada vez que cambien
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages, storageKey]);

  // Consultar estadísticas silenciosamente al abrir
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

  const formatMessageText = (text, sender) => {
    if (!text) return '';
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong 
            key={index} 
            className={`font-extrabold ${sender === 'user' ? 'text-white' : 'text-[#5d5fef]'}`}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <strong 
            key={index} 
            className={`font-bold ${sender === 'user' ? 'text-white' : 'text-[#5d5fef]'}`}
          >
            {part.slice(1, -1)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Globo de bienvenida llamativo para captar atención */}
      <AnimatePresence>
        {showTooltip && !isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-[72px] right-[76px] bg-white border border-slate-200/90 rounded-2xl shadow-[0_10px_30px_rgba(93,95,239,0.15)] px-4 py-3 flex items-center gap-3 z-[60] select-none max-w-[260px] cursor-pointer hover:shadow-[0_12px_35px_rgba(93,95,239,0.22)] hover:border-[#5d5fef]/40 transition-all group"
            onClick={() => {
              setIsOpen(true);
              setShowTooltip(false);
            }}
          >
            {/* Indicador de estado online neón */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            
            <div className="flex flex-col pr-3">
              <span className="text-[9px] font-extrabold text-[#5d5fef] uppercase tracking-wider">Asistente Virtual</span>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5 leading-tight group-hover:text-slate-800 transition-colors">
                ¿Tienes dudas? ¡Pregúntame algo sobre GeoCHAT! 🤖
              </p>
            </div>

            <button
              onClick={handleDismissTooltip}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 border border-slate-200 flex items-center justify-center transition-all shadow-sm"
            >
              <X size={10} />
            </button>
            
            {/* Flecha del globo */}
            <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-t border-slate-200/90 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante animado violeta/azul (Coherente con los botones del sistema) */}
      <motion.div
        className="fixed bottom-4 right-4 w-12 h-12 bg-gradient-to-tr from-[#5d5fef] to-[#4b4ded] rounded-full shadow-[0_6px_25px_rgba(93,95,239,0.4)] flex items-center justify-center text-white cursor-pointer z-[60] hover:shadow-[0_6px_30px_rgba(93,95,239,0.55)]"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Anillos de pulsación constante para llamar la atención */}
        <div className="absolute inset-0 rounded-full border border-[#5d5fef]/40 animate-ping opacity-35 pointer-events-none" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-0 rounded-full border border-[#5d5fef]/20 animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '4.5s', animationDelay: '1s' }} />
        
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={28} />
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
              <MessageCircle size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Panel de chat flotante más amplio y con coherencia visual (Light Glassmorphism) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-[68px] right-4 w-[400px] max-w-[calc(100vw-32px)] h-[600px] bg-white/95 backdrop-blur-md rounded-[2rem] shadow-[0_15px_45px_rgba(15,23,42,0.15)] border border-slate-200/80 flex flex-col overflow-hidden z-[60] origin-bottom-right"
          >
            {/* Cabecera premium con gradiente coherente con el color de botones del sistema */}
            <div className="p-5 bg-gradient-to-r from-[#5d5fef] to-[#4b4ded] text-white flex items-center justify-between shadow-md relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/25 shadow-inner">
                  <Bot size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-normal flex items-center gap-1.5 text-white">
                    GeoCHAT Asistente
                    <Sparkles size={13} className="text-emerald-300" />
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] font-bold text-emerald-100 uppercase tracking-wider">En línea</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearHistory}
                  title="Vaciar Historial"
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 hover:text-red-200 transition-all flex items-center justify-center text-white"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 transition-all flex items-center justify-center text-white"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Mini Dashboard Visual de Estado (Salud de la plataforma - Light Mode) */}
            {stats && (
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex gap-2.5 justify-between items-center select-none shrink-0">
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-100 flex-1 shadow-sm hover:shadow transition-all">
                  <Users size={12} className="text-[#5d5fef]" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Contactos</span>
                    <span className="text-xs font-extrabold text-slate-800 leading-none mt-0.5">{stats.contacts}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-100 flex-1 shadow-sm hover:shadow transition-all">
                  <Smartphone size={12} className={stats.disconnected_devices > 0 ? "text-amber-500 animate-pulse" : "text-emerald-500"} />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Líneas</span>
                    <span className="text-xs font-extrabold text-slate-800 leading-none mt-0.5">
                      {stats.devices - stats.disconnected_devices}/{stats.devices}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-100 flex-1 shadow-sm hover:shadow transition-all">
                  <Brain size={12} className="text-pink-500" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Reglas IA</span>
                    <span className="text-xs font-extrabold text-slate-800 leading-none mt-0.5">{stats.automations}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta de dispositivo desconectado */}
            {stats && stats.disconnected_devices > 0 && (
              <div 
                onClick={() => handleSendMessage('dispositivos')}
                className="bg-amber-50 hover:bg-amber-100 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-amber-800 text-[10px] font-bold cursor-pointer transition-all shrink-0 select-none animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                  <span>Tienes {stats.disconnected_devices} dispositivo(s) desconectado(s)</span>
                </div>
                <span className="underline hover:text-amber-950">Ver diagnóstico →</span>
              </div>
            )}

            {/* Cuerpo de mensajes (Claro, limpio y de alto contraste) */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 bg-slate-50/60 custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5d5fef] flex items-center justify-center shrink-0 mb-0.5 shadow-sm">
                      <Bot size={15} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-[1.25rem] px-4 py-3 text-xs leading-relaxed font-semibold shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-tr from-[#5d5fef] to-[#4b4ded] text-white rounded-br-none'
                        : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{formatMessageText(msg.text, msg.sender)}</p>
                    
                    {msg.sender === 'bot' && (msg.text.includes('{nombre}') || msg.text.includes('{name}') || msg.text.includes('•')) && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="mt-2.5 flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100/80 text-[#5d5fef] rounded-lg text-[10px] font-bold border border-indigo-100 transition-all active:scale-95 shadow-sm"
                      >
                        <Copy size={10} />
                        {copiedId === msg.id ? '¡Copiado!' : 'Copiar plantilla'}
                      </button>
                    )}
                    
                    <span
                      className={`block text-[8px] mt-1 text-right font-medium ${
                        msg.sender === 'user' ? 'text-white/70' : 'text-slate-400'
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
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5d5fef] flex items-center justify-center shrink-0 shadow-sm">
                    <Bot size={15} />
                  </div>
                  <div className="bg-white border border-slate-100 text-slate-400 rounded-[1.25rem] rounded-bl-none px-4 py-3.5 shadow-sm flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 px-1 py-0.5">
                      <span className="w-1.5 h-1.5 bg-[#5d5fef] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#5d5fef] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#5d5fef] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Acciones Rápidas (Chips - Estilo claro) */}
            <div className="px-5 py-3.5 bg-white border-t border-slate-100 overflow-x-auto flex gap-2 shrink-0 custom-scrollbar select-none">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action.query)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:border-[#5d5fef] hover:bg-indigo-50/40 hover:text-[#5d5fef] transition-all rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
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
              className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pregúntame algo sobre GeoCHAT..."
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl h-11 px-4 text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#5d5fef] focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-11 h-11 bg-gradient-to-tr from-[#5d5fef] to-[#4b4ded] disabled:opacity-30 disabled:hover:brightness-100 text-white rounded-2xl flex items-center justify-center transition-all shadow-md shadow-indigo-100 shrink-0 active:scale-95 hover:brightness-110"
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
