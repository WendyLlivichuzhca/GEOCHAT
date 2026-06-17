// frontend/src/components/ChatbotWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles, Cpu, Layers, HelpCircle, Activity, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ChatbotWidget({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      text: '¡Hola! 👋 Soy tu Asistente Virtual de GeoCHAT. Estoy aquí para ayudarte a monitorear tu sistema y responder tus dudas. ¿En qué te puedo colaborar hoy?',
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto scroll al recibir mensajes
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
        return <strong key={index} className="font-extrabold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="font-bold">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Botón flotante animado */}
      <motion.div
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#10b981] rounded-full shadow-lg shadow-emerald-300/60 flex items-center justify-center text-white cursor-pointer z-50 hover:bg-[#0ea572]"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
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
            >
              <MessageCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Panel de chat flotante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-24 right-8 w-[380px] max-w-[calc(100vw-32px)] h-[550px] bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-50 origin-bottom-right"
          >
            {/* Cabecera premium */}
            <div className="p-5 bg-gradient-to-r from-[#10b981] to-[#059669] text-white flex items-center justify-between shadow-md relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 shadow-inner">
                  <Bot size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-normal flex items-center gap-1.5">
                    GeoCHAT Asistente
                    <Sparkles size={13} className="text-emerald-200" />
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                    <span className="text-[10px] font-semibold text-emerald-100 uppercase tracking-wider">En línea</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo de mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 bg-slate-50/50 custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 text-[#10b981] flex items-center justify-center shrink-0 mb-0.5">
                      <Bot size={15} />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-[1.25rem] px-4 py-3 text-xs leading-relaxed font-semibold shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#5d5fef] text-white rounded-br-sm'
                        : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{formatMessageText(msg.text)}</p>
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
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 text-[#10b981] flex items-center justify-center shrink-0">
                    <Bot size={15} />
                  </div>
                  <div className="bg-white border border-slate-100 text-slate-400 rounded-[1.25rem] rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-[#10b981]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Escribiendo...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Acciones Rápidas (Chips) */}
            <div className="px-5 py-3 bg-white border-t border-slate-100 overflow-x-auto flex gap-2 shrink-0 custom-scrollbar select-none">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action.query)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 hover:border-[#10b981] hover:bg-emerald-50 hover:text-[#10b981] transition-all rounded-full text-[10px] font-bold text-slate-500 shrink-0 whitespace-nowrap active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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
                placeholder="Escribe tu consulta..."
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl h-11 px-4 text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#10b981] focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-11 h-11 bg-[#10b981] hover:bg-[#0ea572] disabled:opacity-30 disabled:hover:bg-[#10b981] text-white rounded-2xl flex items-center justify-center transition-all shadow-md shadow-emerald-100 shrink-0 active:scale-95"
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
