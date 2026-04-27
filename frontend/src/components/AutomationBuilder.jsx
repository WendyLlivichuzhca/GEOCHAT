import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft, Play, Plus, X, MessageSquare, HelpCircle,
  Clock, Zap, UserPlus, Filter, PlayCircle, RefreshCw, Layers, Bot, Edit3, Sparkles, Lock, Code2, Copy, Trash2
} from 'lucide-react';
import Sidebar from './Sidebar';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const TriggerNode = ({ data }) => {
  return (
    <div className="bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] rounded-xl w-[300px] text-white shadow-xl relative">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full border border-white/50 flex items-center justify-center shrink-0">
            <Play fill="white" size={16} className="ml-1" />
          </div>
          <h3 className="font-bold text-lg leading-tight">Crea una<br/>automatización</h3>
        </div>
        <p className="text-[13px] text-white/90 leading-relaxed mb-6">
          Este es el inicio del flujo, puedes comenzar a través de tus campañas o automatizaciones.
        </p>

        {data?.configured && data?.config ? (
          <div className="relative border-t border-white/20 pt-4 pb-1">
            <div className="absolute right-0 top-[-10px] bg-[#0ea5e9] pl-2 pr-0 flex items-center gap-1.5 rounded-l-full">
              <span className="text-[11px] font-bold text-white">Próximo paso</span>
              <div className="w-3 h-3 rounded-full border border-sky-200 bg-white translate-x-1.5"></div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-[14px]">Disparador</h4>
              <div className="flex gap-2">
                <button onClick={data.onAddTrigger} className="text-white hover:text-sky-100 transition-colors"><Edit3 size={15} /></button>
                <button className="text-white hover:text-sky-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"></path></svg>
                </button>
              </div>
            </div>

            <div className="space-y-3 pb-3">
              <div>
                <p className="text-[12px] text-white/80 mb-1">Tipo:</p>
                <div className="bg-white/20 rounded px-3 py-2 text-[13px] font-medium leading-tight text-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">{data.config.tipo}</div>
              </div>
              
              <div>
                <p className="text-[12px] text-white/80 mb-1">Dispositivo:</p>
                <div className="bg-white/20 rounded px-3 py-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] flex items-center">
                  <div className="bg-white text-[#0ea5e9] rounded-full px-3 py-0.5 text-[12px] font-bold">
                    {data.config.dispositivo}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[12px] text-white/80 mb-1">Coincidencia:</p>
                <div className="bg-white/20 rounded px-3 py-2 text-[13px] font-medium leading-tight text-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">{data.config.coincidencia}</div>
              </div>

              {data.config.palabras && (
                <div>
                  <p className="text-[12px] text-white/80 mb-1">Palabras/Frases:</p>
                  <div className="bg-white/20 rounded px-3 py-2 text-[13px] font-medium leading-tight text-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">{data.config.palabras}</div>
                </div>
              )}

              <div>
                <p className="text-[12px] text-white/80 mb-1">Frecuencia:</p>
                <div className="bg-white/20 rounded px-3 py-2 text-[13px] font-medium leading-tight text-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">{data.config.frecuencia}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative border-t border-white/20 pt-4 pb-4">
            <div className="text-[11px] font-bold text-white mb-2 absolute right-0 top-[-10px] bg-[#0ea5e9] px-2 rounded-l-full">
              Próximo paso
            </div>
            <p className="text-[13px] font-bold mb-4">Sin disparador asignado</p>
            <button 
              onClick={data?.onAddTrigger}
              className="w-full bg-white text-[#0ea5e9] font-bold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-sky-50 transition-colors">
              <Plus size={18} /> Nuevo disparador
            </button>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        id="a"
        className="w-3.5 h-3.5 bg-white border-2 border-[#0ea5e9] right-[-7px] top-[150px] shadow-sm"
      />
    </div>
  );
};

// --- NODO PERSONALIZADO: MENÚ DE ACCIONES ---
const MenuNode = ({ data }) => {
  const chipBtn = "flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm";
  const chipIcon = "w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500";

  return (
    <div className="w-[300px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden relative">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-white border-2 border-slate-400 left-[-6px] top-[38px] rounded-full"
      />

      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-[15px]">¿Qué desea agregar?</h3>
        <button onClick={data.onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="px-5 pb-5 space-y-4 max-h-[70vh] overflow-y-auto">

        {/* ── Texto ── */}
        <div>
          <p className="text-[12px] font-semibold text-slate-500 mb-2">Texto</p>
          <div className="flex flex-wrap gap-2">
            <button className={chipBtn} onClick={() => data.onSelectItem && data.onSelectItem('send_message')}>
              <span className={chipIcon}><MessageSquare size={11} /></span>
              Enviar mensaje
            </button>
          </div>
        </div>

        {/* ── Preguntas ── */}
        <div>
          <p className="text-[12px] font-semibold text-slate-500 mb-2">Preguntas</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Múltiple', icon: <HelpCircle size={11} />, type: 'question_multiple' },
              { label: 'Simple',   icon: <HelpCircle size={11} />, type: 'question_simple' },
            ].map(({ label, icon, type }) => (
              <button key={label} className={chipBtn} onClick={() => data.onSelectItem && data.onSelectItem(type)}>
                <span className={chipIcon}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Acciones ── */}
        <div>
          <p className="text-[12px] font-semibold text-slate-500 mb-2">Acciones</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Esperar',                icon: <Clock size={11} /> },
              { label: 'Realizar acción',        icon: <Zap size={11} /> },
              { label: 'Asignar conversación',   icon: <UserPlus size={11} /> },
              { label: 'Condición',              icon: <Filter size={11} /> },
              { label: 'Iniciar automatización', icon: <PlayCircle size={11} /> },
              { label: 'Rotador',                icon: <RefreshCw size={11} /> },
              { label: 'Templates',              icon: <Layers size={11} /> },
              { label: 'Asignar Agente IA',      icon: <Bot size={11} /> },
            ].map(({ label, icon }) => (
              <button key={label} className={chipBtn}>
                <span className={chipIcon}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// --- NODO PERSONALIZADO: ENVIAR MENSAJE ---
const BlockContent = ({ blk, msgTypes, tiempos, removeBlock, updateBlock, toggleTiempo, updateTiempoVal, user, countries }) => {
  const meta = msgTypes.find(t => t.key === blk.key);
  const tiempoOn = tiempos[blk.uid];
  const textareaRef = React.useRef(null);
  const [showEmojis, setShowEmojis] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recorder, setRecorder] = React.useState(null);

  const emojis = ['😀', '😂', '😍', '🙌', '👍', '🔥', '🚀', '✅', '❌', '📍', '📞', '💬', '🎁', '⭐'];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const file = new File([audioBlob], `recording-${Date.now()}.ogg`, { type: 'audio/ogg' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', user?.id);
        try {
          const res = await fetch(`${API_URL}/api/automatizaciones/upload-media`, {
            method: 'POST',
            headers: { 'X-User-Id': user?.id?.toString() || '' },
            body: formData
          });
          const data = await res.json();
          if (data.success) {
            updateBlock(blk.uid, 'url', data.url);
            updateBlock(blk.uid, 'fileName', data.filename);
          }
        } catch (err) { console.error(err); }
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
    } catch (err) { alert("No se pudo acceder al micrófono"); }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      recorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = blk.text || '';
    const newText = text.substring(0, start) + emoji + text.substring(end);
    const newCursorPos = start + emoji.length;
    updateBlock(blk.uid, 'text', newText);
    setShowEmojis(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const applyFormat = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = blk.text || '';
    const selectedText = text.substring(start, end);
    let newText = text;
    let newCursorPos = start;
    switch(type) {
      case 'bold': newText = text.substring(0, start) + '*' + selectedText + '*' + text.substring(end); newCursorPos = end + 2; break;
      case 'italic': newText = text.substring(0, start) + '_' + selectedText + '_' + text.substring(end); newCursorPos = end + 2; break;
      case 'strike': newText = text.substring(0, start) + '~' + selectedText + '~' + text.substring(end); newCursorPos = end + 2; break;
      case 'variable': const variable = '{{nombre}}'; newText = text.substring(0, start) + variable + text.substring(end); newCursorPos = start + variable.length; break;
      default: return;
    }
    updateBlock(blk.uid, 'text', newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
            {meta?.icon}
          </div>
          <span className="font-bold text-slate-700 text-[14px]">{blk.key}</span>
        </div>
        <button onClick={() => removeBlock(blk.uid)} className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition-all shadow-sm hover:rotate-90">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="px-4 pb-4">
        {blk.key === 'Texto' && (
          <div className="pt-1">
            <textarea 
              ref={textareaRef}
              placeholder="Escribe un mensaje..." 
              value={blk.text || ''}
              onChange={(e) => updateBlock(blk.uid, 'text', e.target.value)}
              className="nodrag w-full h-[100px] resize-none bg-slate-50 border border-slate-200 rounded-t-2xl px-4 py-3 text-[14px] placeholder:text-slate-400 focus:outline-none focus:border-violet-300 transition-colors" 
            />
            <div className="flex items-center justify-between border border-slate-200 border-t-0 bg-slate-50 rounded-b-2xl px-4 py-2 relative">
              <div className="flex gap-3">
                <div className="relative">
                  <button onClick={() => setShowEmojis(!showEmojis)} className="text-slate-400 text-[16px] hover:text-violet-600 transition-colors">☺</button>
                  {showEmojis && (
                    <div className="absolute bottom-full left-0 mb-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xl grid grid-cols-7 gap-2 z-[100] w-[240px]">
                      {emojis.map(e => (
                        <button key={e} onClick={() => insertEmoji(e)} className="hover:bg-slate-50 p-1.5 rounded text-[18px] transition-transform hover:scale-125">{e}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => applyFormat('bold')} className="text-slate-500 font-bold text-[12px] hover:text-violet-600 transition-colors">B</button>
                <button onClick={() => applyFormat('italic')} className="text-slate-500 italic text-[12px] hover:text-violet-600 transition-colors">I</button>
                <button onClick={() => applyFormat('strike')} className="text-slate-500 line-through text-[12px] hover:text-violet-600 transition-colors">S</button>
                <button onClick={() => applyFormat('variable')} className="text-slate-500 font-mono text-[11px] hover:text-violet-600 transition-colors">{"{}"}</button>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{(blk.text || '').length} / 4000</span>
            </div>
          </div>
        )}

        {(blk.key === 'Multimedia' || blk.key === 'Documento' || blk.key === 'Audio') && (
          <div className="pt-1">
            <div className="bg-[#eef8ff] border border-[#d0e9ff] rounded-2xl p-4 text-center mb-4 shadow-sm">
              <p className="text-[12px] text-[#2c75a6] leading-relaxed">
                Tu archivo no debe superar los <b className="text-[#1e5d85]">80MB</b>.<br/>
                Si se envía por WhatsApp API, el límite es de <b className="text-[#1e5d85]">16MB</b>.
              </p>
            </div>
            
            <input 
              type="file" 
              id={`file-${blk.uid}`} 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                formData.append('user_id', user?.id);
                const btn = e.target.nextSibling;
                try {
                  btn.innerText = 'Subiendo...';
                  btn.disabled = true;
                  const res = await fetch(`${API_URL}/api/automatizaciones/upload-media`, {
                    method: 'POST',
                    headers: { 'X-User-Id': user?.id?.toString() || '' },
                    body: formData
                  });
                  const data = await res.json();
                  if (data.success) {
                    updateBlock(blk.uid, 'url', data.url);
                    updateBlock(blk.uid, 'fileName', data.filename);
                    btn.innerText = '¡Archivo cargado! ✅';
                  } else {
                    alert("Error: " + data.message);
                    btn.innerText = 'Cargar archivo';
                  }
                } catch (err) { btn.innerText = 'Cargar archivo'; } finally { btn.disabled = false; }
              }}
            />
            <button 
              onClick={() => document.getElementById(`file-${blk.uid}`).click()}
              className={"w-full text-white font-bold text-[14px] py-3.5 rounded-2xl mb-4 transition-all shadow-md active:scale-95 " + (blk.url ? "bg-green-600" : "bg-[#4ade80] hover:bg-[#22c55e]")}
            >
              {blk.url ? `Cambiar: ${blk.fileName || 'Archivo'}` : 'Cargar archivo'}
            </button>

            {blk.key === 'Audio' && (
              <div className="pt-0">
                <div className="bg-[#eef8ff] border border-[#d0e9ff] rounded-2xl p-4 text-center mb-4 shadow-sm">
                  <p className="text-[12px] text-[#2c75a6] leading-relaxed font-medium">Graba un audio o carga un archivo existente.</p>
                </div>
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={"w-full font-bold text-[14px] py-3.5 rounded-2xl flex items-center justify-center gap-3 mb-2 transition-all shadow-sm " + (isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200")}
                >
                  {isRecording ? 'Detener grabación' : 'Grabar audio'}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                </button>
              </div>
            )}

            {/* VISTA PREVIA */}
            {blk.url && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative group min-h-[60px] shadow-inner">
                {blk.fileName?.toLowerCase().match(/\.(mp4|m4v|mov|webm)$/) ? (
                  <div className="bg-black aspect-video flex items-center justify-center"><video src={blk.url} controls className="w-full max-h-48" /></div>
                ) : blk.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                  <img src={blk.url} alt="Preview" className="w-full max-h-48 object-cover" />
                ) : (
                  <div className="p-4 flex items-center gap-4 bg-white text-left">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0 border border-red-100">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[13px] font-bold text-slate-800 truncate">{blk.fileName}</p>
                      <p className="text-[11px] text-slate-400 uppercase font-bold tracking-tight">Archivo</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {blk.key === 'Multimedia' && (
              <div className="mt-2">
                <textarea 
                  ref={textareaRef}
                  placeholder="Escribe un mensaje de descripción..." 
                  value={blk.text || ''}
                  onChange={(e) => updateBlock(blk.uid, 'text', e.target.value)}
                  className="nodrag w-full h-[70px] resize-none bg-slate-50 border border-slate-200 rounded-t-2xl px-4 py-3 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-violet-300 transition-colors" 
                />
                <div className="flex items-center justify-between border border-slate-200 border-t-0 bg-slate-50 rounded-b-2xl px-4 py-2 relative">
                  <div className="flex gap-3">
                    <button onClick={() => applyFormat('bold')} className="text-slate-500 font-bold text-[11px] hover:text-violet-600">B</button>
                    <button onClick={() => applyFormat('italic')} className="text-slate-500 italic text-[11px] hover:text-violet-600">I</button>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{(blk.text || '').length} / 1024</span>
                </div>
              </div>
            )}
          </div>
        )}

        {blk.key === 'Contacto' && (
          <div className="pt-1 space-y-4 text-left">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox" 
                checked={blk.useConnectedNumber || false}
                onChange={(e) => updateBlock(blk.uid, 'useConnectedNumber', e.target.checked)}
                className="w-5 h-5 accent-violet-600 rounded" 
              />
              <span className="text-[13px] font-semibold text-slate-700">Usar número de WhatsApp conectado</span>
            </label>
            
            <div className="space-y-1.5 nodrag">
              <p className="text-[13px] font-bold text-slate-700">Número del contacto<span className="text-red-500 ml-0.5">*</span></p>
              <PhoneInput
                country={'ec'}
                value={blk.contactPhone || ''}
                onChange={(phone) => {
                  updateBlock(blk.uid, 'contactPhone', phone);
                }}
                inputStyle={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: 'white'
                }}
                buttonStyle={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRight: '0',
                  borderRadius: '16px 0 0 16px',
                  paddingLeft: '8px'
                }}
                containerStyle={{
                  borderRadius: '16px'
                }}
                placeholder="Escribe el número"
                enableSearch={true}
                searchPlaceholder="Buscar país..."
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[13px] font-bold text-slate-700">Nombre del contacto<span className="text-red-500 ml-0.5">*</span></p>
              <input 
                type="text" 
                placeholder="Escribe el nombre del contacto" 
                value={blk.contactName || ''}
                onChange={(e) => updateBlock(blk.uid, 'contactName', e.target.value)}
                className="nodrag w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-[14px] font-medium focus:outline-none focus:border-violet-300 transition-colors shadow-sm" 
              />
            </div>
          </div>
        )}

        {/* TIEMPO ENTRE MENSAJE */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-[#f97316]">Tiempo entre mensaje</span>
            <div className="flex items-center gap-3">
              <div onClick={() => toggleTiempo(blk.uid)} className={"w-11 h-6 rounded-full relative cursor-pointer transition-all duration-300 " + (tiempoOn ? "bg-violet-500 shadow-md" : "bg-slate-200")}>
                <div className={"w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 shadow-sm transition-all duration-300 " + (tiempoOn ? "translate-x-5.5" : "translate-x-0.75")}></div>
              </div>
              {tiempoOn && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <input 
                    type="number" 
                    value={blk.delay || 5} 
                    min="3" 
                    max="60"
                    onChange={(e) => updateTiempoVal(blk.uid, e.target.value)}
                    className="nodrag w-8 bg-transparent text-[13px] font-bold text-violet-700 focus:outline-none"
                  />
                </div>
              )}
              <span className="text-[12px] font-semibold text-slate-500">Segundos</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium italic">
            <b>Nota:</b> mínimo de {blk.key === 'Texto' ? 3 : 5} y un máximo de 60
          </p>
        </div>
      </div>
    </div>
  );
};

// --- NODO PERSONALIZADO: ENVIAR MENSAJE ---
const SendMessageNode = ({ id, data }) => {
  const [blocks, setBlocks] = React.useState(data.blocks || []);
  const [tiempos, setTiempos] = React.useState(data.tiempos || {});

  const msgTypes = [
    { key: 'Texto',      label: 'Texto',      icon: <MessageSquare size={14} /> },
    { key: 'Multimedia', label: 'Multimedia',  icon: <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
    { key: 'Audio',      label: 'Audio',      icon: <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg> },
    { key: 'Documento',  label: 'Documento',  icon: <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
    { key: 'Contacto',   label: 'Contacto',   icon: <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
  ];

  // Sincronizar con el padre cuando cambie el estado local
  React.useEffect(() => {
    if (data.onUpdate) {
      data.onUpdate(id, { blocks, tiempos });
    }
  }, [blocks, tiempos]);

  const addBlock   = (key) => setBlocks(prev => [...prev, { key, uid: Date.now(), text: '' }]);
  const removeBlock = (uid) => setBlocks(prev => prev.filter(b => b.uid !== uid));
  const toggleTiempo = (uid) => setTiempos(prev => ({ ...prev, [uid]: !prev[uid] }));
  const updateBlock = (uid, field, value) => {
    setBlocks(prev => prev.map(b => b.uid === uid ? { ...b, [field]: value } : b));
  };
  const updateTiempoVal = (uid, val) => {
    setBlocks(prev => prev.map(b => b.uid === uid ? { ...b, delay: val } : b));
  };

  const countries = [
    { code: '593', flag: '🇪🇨', name: 'Ecuador' },
    { code: '57', flag: '🇨🇴', name: 'Colombia' },
    { code: '51', flag: '🇵🇪', name: 'Perú' },
    { code: '52', flag: '🇲🇽', name: 'México' },
    { code: '54', flag: '🇦🇷', name: 'Argentina' },
    { code: '56', flag: '🇨🇱', name: 'Chile' },
    { code: '58', flag: '🇻🇪', name: 'Venezuela' },
    { code: '502', flag: '🇬🇹', name: 'Guatemala' },
    { code: '503', flag: '🇸🇻', name: 'El Salvador' },
    { code: '504', flag: '🇭🇳', name: 'Honduras' },
    { code: '505', flag: '🇳🇮', name: 'Nicaragua' },
    { code: '506', flag: '🇨🇷', name: 'Costa Rica' },
    { code: '507', flag: '🇵🇦', name: 'Panamá' },
    { code: '53', flag: '🇨🇺', name: 'Cuba' },
    { code: '591', flag: '🇧🇴', name: 'Bolivia' },
    { code: '595', flag: '🇵🇾', name: 'Paraguay' },
    { code: '598', flag: '🇺🇾', name: 'Uruguay' },
    { code: '1', flag: '🇺🇸', name: 'USA' },
    { code: '34', flag: '🇪🇸', name: 'España' },
    { code: '39', flag: '🇮🇹', name: 'Italia' },
    { code: '44', flag: '🇬🇧', name: 'UK' },
    { code: '55', flag: '🇧🇷', name: 'Brasil' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-transparent hover:border-violet-200 transition-all overflow-hidden w-[320px]">
      {/* Botones de acción flotantes para evitar recreación de nodos */}
      <div className="absolute -top-10 left-0 flex gap-1.5">
        <button onClick={() => data?.onDuplicate?.()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-violet-600 hover:bg-violet-50 shadow-sm transition-colors"><Copy size={12}/> Duplicar</button>
        <button onClick={data?.onDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-violet-600 hover:bg-violet-50 shadow-sm transition-colors"><Trash2 size={12}/> Eliminar</button>
      </div>

      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
            <MessageSquare size={16} />
          </div>
          <span className="font-bold text-slate-700 text-[14px]">Enviar mensaje</span>
        </div>
      </div>

      <div className="min-h-[100px] bg-white">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-2">
              <Plus size={24} />
            </div>
            <p className="text-[12px] text-slate-400">Haz clic abajo para añadir contenido</p>
          </div>
        ) : (
          blocks.map(blk => (
            <BlockContent 
              key={blk.uid} 
              blk={blk} 
              msgTypes={msgTypes}
              tiempos={tiempos}
              removeBlock={removeBlock}
              updateBlock={updateBlock}
              toggleTiempo={toggleTiempo}
              updateTiempoVal={updateTiempoVal}
              user={data.user}
              countries={countries}
            />
          ))
        )}
      </div>


      {/* FOOTER: SELECTOR DE TIPOS */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Tipo de mensaje</p>
        <div className="grid grid-cols-5 gap-2">
          {msgTypes.map(type => (
            <button
              key={type.key}
              onClick={() => addBlock(type.key)}
              title={type.label}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:border-violet-400 hover:text-violet-600 hover:shadow-sm transition-all"
            >
              {type.icon}
              <span className="text-[9px] font-medium">{type.key}</span>
            </button>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[10px] font-bold">Próximo paso</span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-white border-2 border-slate-400 left-[-6px] rounded-full" />
      <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-white border-2 border-slate-300 right-[-6px] rounded-full" />
    </div>
  );
};

// --- NODO: PREGUNTA SIMPLE ---
const QuestionNode = ({ id, data }) => {
  const [question, setQuestion] = useState(data.question || '');
  const [saveIn, setSaveIn] = useState(data.saveIn || '');

  // Sincronizar estado local con props (importante para duplicados y carga)
  useEffect(() => {
    if (data.question !== undefined) setQuestion(data.question);
    if (data.saveIn !== undefined) setSaveIn(data.saveIn);
  }, [data.question, data.saveIn]);

  const onQuestionChange = (val) => {
    setQuestion(val);
    data.onUpdate && data.onUpdate(id, { question: val });
  };

  const onSaveInChange = (val) => {
    setSaveIn(val);
    data.onUpdate && data.onUpdate(id, { saveIn: val });
  };


  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-transparent hover:border-violet-200 transition-all overflow-hidden w-[320px]">
      <div className="absolute -top-10 left-0 flex gap-1.5">
        <button onClick={() => data?.onDuplicate?.()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-violet-600 shadow-sm hover:bg-slate-50"><Copy size={12}/> Duplicar</button>
        <button onClick={data?.onDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-violet-600 shadow-sm hover:bg-slate-50"><Trash2 size={12}/> Eliminar</button>
      </div>

      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
            <HelpCircle size={16} />
          </div>
          <span className="font-bold text-slate-700 text-[14px]">Pregunta</span>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
          <textarea 
            placeholder="Escribe un mensaje..."
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            className="nodrag w-full h-[100px] resize-none bg-transparent border-none outline-none text-[14px] placeholder:text-slate-400"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-3 text-slate-400">
              <span className="cursor-pointer hover:text-violet-500">☺</span> <span className="font-bold cursor-pointer hover:text-violet-500">B</span> <span className="italic cursor-pointer hover:text-violet-500">I</span> <span className="line-through cursor-pointer hover:text-violet-500">S</span> <span className="cursor-pointer hover:text-violet-500">{"{}"}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{question.length} / 1024</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
          <span className="text-[12px] font-semibold text-slate-600 text-left">Guardar respuesta en</span>
          <select 
            value={saveIn}
            onChange={(e) => onSaveInChange(e.target.value)}
            className="nodrag text-[12px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-300 shadow-sm cursor-pointer"
          >
            <option value="">Seleccionar</option>
            {(data.customFields || []).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-white border-2 border-slate-400 left-[-6px] rounded-full shadow-sm" />
      <Handle type="source" position={Position.Right} id="out" className="w-3.5 h-3.5 bg-white border-2 border-[#0ea5e9] right-[-7px] shadow-sm" />
    </div>
  );
};

// --- NODO: PREGUNTA MÚLTIPLE ---
const MultipleChoiceNode = ({ id, data }) => {
  const [question, setQuestion] = useState(data.question || '');
  const [options, setOptions] = useState(data.options || [{ id: 'opt-1', label: '' }]);
  const [saveIn, setSaveIn] = useState(data.saveIn || '');

  // Sincronizar estados locales con props
  useEffect(() => {
    if (data.question !== undefined) setQuestion(data.question);
    if (data.options) setOptions(data.options);
    if (data.saveIn !== undefined) setSaveIn(data.saveIn);
  }, [data.question, data.options, data.saveIn]);

  const onQuestionChange = (val) => {
    setQuestion(val);
    data.onUpdate && data.onUpdate(id, { question: val });
  };

  const onSaveInChange = (val) => {
    setSaveIn(val);
    data.onUpdate && data.onUpdate(id, { saveIn: val });
  };


  const addOption = () => {
    const newOpt = { id: `opt-${Date.now()}`, label: '' };
    const newOptions = [...options, newOpt];
    setOptions(newOptions);
    data.onUpdate && data.onUpdate(id, { options: newOptions });
  };

  const updateOption = (optId, label) => {
    const newOptions = options.map(o => o.id === optId ? { ...o, label } : o);
    setOptions(newOptions);
    data.onUpdate && data.onUpdate(id, { options: newOptions });
  };

  const removeOption = (optId) => {
    if (options.length <= 1) return;
    const newOptions = options.filter(o => o.id !== optId);
    setOptions(newOptions);
    data.onUpdate && data.onUpdate(id, { options: newOptions });
  };


  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-transparent hover:border-violet-200 transition-all overflow-hidden w-[320px]">
      <div className="absolute -top-10 left-0 flex gap-1.5">
        <button onClick={() => data?.onDuplicate?.()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-violet-600 shadow-sm hover:bg-slate-50"><Copy size={12}/> Duplicar</button>
        <button onClick={data?.onDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-violet-600 shadow-sm hover:bg-slate-50"><Trash2 size={12}/> Eliminar</button>
      </div>

      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
            <HelpCircle size={16} />
          </div>
          <span className="font-bold text-slate-700 text-[14px]">Pregunta múltiple</span>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4 text-left">
          <textarea 
            placeholder="Escribe un mensaje..."
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            className="nodrag w-full h-[100px] resize-none bg-transparent border-none outline-none text-[14px] placeholder:text-slate-400"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-3 text-slate-400">
              <span className="cursor-pointer hover:text-violet-500">☺</span> <span className="font-bold cursor-pointer hover:text-violet-500">B</span> <span className="italic cursor-pointer hover:text-violet-500">I</span> <span className="line-through cursor-pointer hover:text-violet-500">S</span> <span className="cursor-pointer hover:text-violet-500">{"{}"}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{question.length} / 1024</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5 px-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={data.iaValidation || false}
              onChange={(e) => data.onUpdate && data.onUpdate(id, { iaValidation: e.target.checked })}
              className="w-4 h-4 accent-violet-600 rounded border-slate-300"
            />

            <span className="text-[13px] font-bold text-slate-600 flex items-center gap-1">
              IA<span className="text-[10px] text-violet-500">✨</span> Validar con IA
            </span>
          </label>
          <HelpCircle size={14} className="text-slate-300 cursor-help" />
          <div className="flex-1 flex justify-end">
             <Lock size={14} className="text-slate-300" />
          </div>
        </div>

        <div className="space-y-3 relative text-left">
          {options.map((opt, idx) => (
            <div key={opt.id} className="relative group">
              <input 
                type="text"
                placeholder="Ingresa el título del botón"
                value={opt.label}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                className="nodrag w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-violet-300 shadow-sm"
              />
              {options.length > 1 && (
                <button onClick={() => removeOption(opt.id)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={13} />
                </button>
              )}
              <Handle 
                type="source" 
                position={Position.Right} 
                id={opt.id} 
                className="w-3.5 h-3.5 bg-white border-2 border-[#0ea5e9] right-[-24px] shadow-sm"
                style={{ top: '50%' }}
              />
            </div>
          ))}
        </div>

        <button 
          onClick={addOption}
          className="w-full mt-6 bg-[#84cc16] hover:bg-[#71b113] text-white font-bold text-[14px] py-2.5 rounded-full transition-all shadow-md active:scale-95 mb-5"
        >
          Agregar nueva opción
        </button>

        <div className="flex items-center justify-between gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
          <span className="text-[12px] font-semibold text-slate-600 text-left">Guardar respuesta en</span>
          <select 
            value={saveIn}
            onChange={(e) => onSaveInChange(e.target.value)}
            className="nodrag text-[12px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-300 shadow-sm cursor-pointer"
          >
            <option value="">Seleccionar</option>
            {(data.customFields || []).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-white border-2 border-slate-400 left-[-6px] rounded-full shadow-sm" />
    </div>
  );
};

const nodeTypes = {
  triggerNode: TriggerNode,
  menuNode: MenuNode,
  sendMessageNode: SendMessageNode,
  questionNode: QuestionNode,
  multipleChoiceNode: MultipleChoiceNode,
};

export default function AutomationBuilder({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [frecuencia, setFrecuencia] = useState('cada_vez');
  const [tipoDisparador, setTipoDisparador] = useState('Sin disparador');
  const [condicionMensaje, setCondicionMensaje] = useState('Contiene');
  const [dispositivo, setDispositivo] = useState('');
  const [palabraClave, setPalabraClave] = useState('');
  const [customFields, setCustomFields] = useState([]);

  const [flowName, setFlowName] = useState(`Flow del ${new Date().toLocaleDateString('es-EC')} a las ${new Date().toLocaleTimeString('es-EC')}`);
  const [isActive, setIsActive] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [automationId, setAutomationId] = useState(id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const connectingNodeId = useRef(null);

  // Estados para datos reales del backend
  const [devices, setDevices] = useState([]);
  const [whalinks, setWhalinks] = useState([]);
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    
    // Fetch dispositivos
    fetch(`${API_URL}/api/dashboard/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.dashboard?.dispositivos) {
          setDevices(data.dashboard.dispositivos);
          // Setear el primer dispositivo por defecto si hay
          if (data.dashboard.dispositivos.length > 0) {
             setDispositivo(data.dashboard.dispositivos[0].nombre);
          }
        }
      })
      .catch(err => console.error("Error fetching devices", err));

    // Fetch whalinks
    fetch(`${API_URL}/api/whalink/list?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.links) {
          setWhalinks(data.links);
        }
      })
      .catch(err => console.error("Error fetching whalinks", err));

    // Fetch carpetas
    fetch(`${API_URL}/api/automatizaciones/overview?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.folders) {
          setFolders(data.folders);
        }
      })
      .catch(err => console.error("Error fetching folders", err));

    // Fetch campos personalizados
    fetch(`${API_URL}/api/campos-customizados?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const fieldNames = data.map(f => f.nombre);
          setCustomFields(fieldNames);
          
          // Actualizar nodos de pregunta existentes con los nuevos campos
          setNodes(nds => nds.map(node => {
            if (node.type === 'questionNode') {
              return { ...node, data: { ...node.data, customFields: fieldNames } };
            }
            return node;
          }));
        }
      })
      .catch(err => console.error("Error fetching custom fields", err));

    // Cargar automatización si hay ID (Edición)
    if (id) {
      fetch(`${API_URL}/api/automatizaciones/detail?id=${id}&user_id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.automation) {
            const auto = data.automation;
            setFlowName(auto.nombre || '');
            setIsActive(!!auto.activo);
            setPalabraClave(auto.palabra_clave || '');
            setSelectedFolderId(auto.carpeta_id || '');
            
            // Si el backend devuelve nodos/conexiones como strings, parsearlos
            let savedNodes = auto.nodos || [];
            let savedEdges = auto.conexiones || [];
            if (typeof savedNodes === 'string') try { savedNodes = JSON.parse(savedNodes); } catch(e) {}
            if (typeof savedEdges === 'string') try { savedEdges = JSON.parse(savedEdges); } catch(e) {}
            
            if (savedNodes.length > 0) {
              setNodes(savedNodes.map(n => ({
                ...n,
                data: { 
                  ...n.data, 
                  onUpdate: updateNodeData, 
                  user: user,
                  onDelete: () => {
                    setNodes(nds => nds.filter(node => node.id !== n.id));
                    setEdges(eds => eds.filter(e => e.source !== n.id && e.target !== n.id));
                  },
                  onDuplicate: () => onDuplicateNode(n)
                }
              })));
            }
            if (savedEdges.length > 0) setEdges(savedEdges);
          }
        })
        .catch(err => console.error("Error loading automation detail", err));
    }
  }, [user, id]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, []);

  const handleAddCustomField = (field) => {
    if (field && field !== '' && !customFields.includes(field)) {
      setCustomFields([...customFields, field]);
    }
    setShowCustomFieldModal(false);
  };

  const handleRemoveCustomField = (field) => {
    setCustomFields(customFields.filter(f => f !== field));
  };

  const onDuplicateNode = useCallback((node) => {
    const newNodeId = `${node.type}-${Date.now()}`;
    const newNode = {
      ...node,
      id: newNodeId,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { 
        ...node.data, 
        onUpdate: updateNodeData,
        onDelete: () => {
          setNodes(nds => nds.filter(n => n.id !== newNodeId));
          setEdges(eds => eds.filter(e => e.source !== newNodeId && e.target !== newNodeId));
        },
        onDuplicate: () => onDuplicateNode({ ...node, id: newNodeId, position: { x: node.position.x + 40, y: node.position.y + 40 } })
      }
    };
    setNodes(nds => nds.concat(newNode));
  }, [updateNodeData]);

  const handleSaveTrigger = () => {
    setNodes(nds => nds.map(node => {
      if (node.id === 'trigger-1') {
        return {
          ...node,
          data: {
            ...node.data,
            configured: true,
            config: {
              tipo: tipoDisparador,
              dispositivo: dispositivo,
              coincidencia: condicionMensaje === 'Contiene' ? 'Contiene palabra/frase' : (condicionMensaje === 'Exacto' ? 'Mensaje exacto' : 'Todos los mensajes'),
              palabras: palabraClave,
              frecuencia: frecuencia === 'cada_vez' ? 'Cada vez que se cumpla la condición' : 'Solo una vez por contacto'
            }
          }
        };
      }
      return node;
    }));
    setShowTriggerModal(false);
  };

  const handleSaveAutomation = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    
    // Buscar dispositivo_id basado en el nombre seleccionado
    const selectedDevice = devices.find(d => d.nombre === dispositivo);
    const deviceId = selectedDevice ? selectedDevice.id : null;

    const payload = {
      user_id: user.id,
      nombre: flowName,
      tipo_disparador: 'palabra_clave',
      palabra_clave: palabraClave || null,
      activo: isActive,
      carpeta_id: selectedFolderId || null,
      dispositivo_id: deviceId,
      nodos: nodes,
      conexiones: edges
    };

    try {
      const base = automationId 
        ? `${API_URL}/api/automatizaciones/${automationId}?user_id=${user.id}`
        : `${API_URL}/api/automatizaciones?user_id=${user.id}`;
        
      const method = automationId ? 'PUT' : 'POST';

      const response = await fetch(base, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)

      });

      const data = await response.json();
      
      if (data.success) {
        if (data.automation_id) {
          setAutomationId(data.automation_id);
        }
        setShowSaveModal(false);
        // Opcional: mostrar algún mensaje de éxito
      } else {
        alert("Error al guardar: " + data.message);
      }
    } catch (error) {
      console.error("Error saving automation:", error);
      alert("Error de conexión al guardar la automatización");
    } finally {
      setIsSaving(false);
    }
  };

  const [nodes, setNodes, onNodesChange] = useNodesState([
    { 
      id: 'trigger-1', 
      type: 'triggerNode', 
      position: { x: 250, y: 150 }, 
      data: { 
        label: 'Inicio',
        onAddTrigger: () => setShowTriggerModal(true),
        user: user
      } 
    }
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  return (
    <div className="flex min-h-screen bg-[#f0fdf9] font-sans text-[#134e4a] selection:bg-emerald-200/50 overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="flex-1 ml-24 p-4 lg:p-6 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 bg-white rounded-3xl overflow-hidden flex flex-col relative text-slate-800 shadow-2xl">
          {/* HEADER DE EDICIÓN */}
            <header className="h-[72px] bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-50 relative shadow-sm">
            <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/automatizaciones')}
            className="flex items-center gap-2 text-slate-600 hover:text-[#0ea5e9] transition-colors font-bold text-sm"
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-md border border-slate-100 px-2 py-1 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 transition-all">
            <input 
              type="text" 
              value={flowName} 
              onChange={(e) => setFlowName(e.target.value)} 
              className="bg-transparent border-none outline-none text-slate-700 w-[280px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isActive ? 'text-[#0ea5e9]' : 'text-slate-500'}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
            <div 
              onClick={() => setIsActive(!isActive)}
              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${isActive ? 'bg-sky-500' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${isActive ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`} style={{ transform: isActive ? 'translateX(20px)' : 'translateX(0)' }}></div>
            </div>
          </div>
          <button 
            onClick={() => setShowSaveModal(true)}
            className="bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:opacity-90 text-white px-5 py-2 rounded-lg text-[14px] font-bold shadow-md shadow-sky-200 transition-all">
            Guardar automatización
          </button>
        </div>
      </header>

          {/* CANVAS DEL FLUJO */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onConnect={(params) => {
                setEdges((eds) => addEdge({ 
                  ...params, 
                  animated: true, 
                  style: { stroke: '#0ea5e9', strokeWidth: 2 } 
                }, eds));
                // Al conectar con éxito, limpiamos el ID para que onConnectEnd no abra el menú
                connectingNodeId.current = null;
              }}
              onConnectStart={(_, { nodeId }) => {
                connectingNodeId.current = nodeId;
              }}
              onConnectEnd={(event) => {
                if (!connectingNodeId.current) return;
                const targetIsPane = event.target.classList.contains('react-flow__pane');
                if (targetIsPane) {
                  const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
                  
                  // Convertir coordenadas de pantalla a coordenadas del canvas de React Flow
                  const paneRect = document.querySelector('.react-flow__pane').getBoundingClientRect();
                  const x = (clientX - paneRect.left);
                  const y = (clientY - paneRect.top);

                  const menuNodeId = `menu-${Date.now()}`;
                  const newNode = {
                    id: menuNodeId,
                    type: 'menuNode',
                    position: { x: x - 20, y: y - 40 },
                    data: { 
                      onClose: () => {
                        setNodes(nds => nds.filter(n => n.id !== menuNodeId));
                        setEdges(eds => eds.filter(e => e.target !== menuNodeId));
                      },
                      onSelectItem: (itemType) => {
                        let newNodeData = {};
                        let nodeType = '';

                        if (itemType === 'send_message') {
                          nodeType = 'sendMessageNode';
                          newNodeData = {
                            onUpdate: updateNodeData,
                            blocks: [],
                            tiempos: {},
                            user: user
                          };
                        } else if (itemType === 'question_simple') {
                          nodeType = 'questionNode';
                          newNodeData = {
                            question: '',
                            saveIn: '',
                            customFields: customFields,
                            onUpdate: updateNodeData,
                            user: user
                          };
                        } else if (itemType === 'question_multiple') {
                          nodeType = 'multipleChoiceNode';
                          newNodeData = {
                            question: '',
                            options: [{ id: 'opt-1', label: '' }],
                            iaValidation: false,
                            onUpdate: updateNodeData,
                            user: user
                          };
                        }

                        if (nodeType) {
                          const sendNodeId = `${nodeType}-${Date.now()}`;
                          newNodeData.id = sendNodeId; // <--- AGREGAR ESTO
                          newNodeData.onDelete = () => {
                            setNodes(n => n.filter(node => node.id !== sendNodeId));
                            setEdges(e => e.filter(edge => edge.source !== sendNodeId && edge.target !== sendNodeId));
                          };
                          newNodeData.onDuplicate = () => {
                            setNodes(nds => {
                              const current = nds.find(node => node.id === sendNodeId);
                              if (current) onDuplicateNode(current);
                            });
                          };

                          setNodes(nds => {
                            const menuNode = nds.find(n => n.id === menuNodeId);
                            const filtered = nds.filter(n => n.id !== menuNodeId);
                            return [...filtered, {
                              id: sendNodeId,
                              type: nodeType,
                              position: menuNode?.position || { x: x + 100, y: y },
                              data: newNodeData
                            }];
                          });

                          setEdges(eds => eds.map(e =>
                            e.target === menuNodeId
                              ? { ...e, target: sendNodeId, animated: true, style: { stroke: '#0ea5e9', strokeWidth: 2 } }
                              : e
                          ));
                        }
                      }
                    }
                  };

                  const newEdge = {
                    id: `edge-${connectingNodeId.current}-${menuNodeId}`,
                    source: connectingNodeId.current,
                    target: menuNodeId,
                    animated: true,
                    style: { stroke: '#0ea5e9', strokeWidth: 2 }
                  };

                  setNodes(nds => [...nds, newNode]);
                  setEdges(eds => [...eds, newEdge]);
                }
                connectingNodeId.current = null;
              }}
              defaultViewport={{ x: 200, y: 50, zoom: 1 }}
              minZoom={0.5}
              maxZoom={2}
              className="bg-[#f8faff]"
            >
              <Background color="#bae6fd" gap={20} size={1.5} />
              <Controls className="bg-white border-slate-200 shadow-lg rounded-xl overflow-hidden" showInteractive={false} />
            </ReactFlow>

        {/* MODAL CONFIGURAR DISPARADOR */}
        {showTriggerModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-[500px] animate-in fade-in zoom-in-95 p-8 relative">
              <button onClick={() => setShowTriggerModal(false)} className="absolute top-6 right-6 text-black hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
              
              <div className="mb-6">
                <h2 className="text-[22px] leading-tight font-bold text-slate-900 mb-2">Configurar disparador de automatización</h2>
                <p className="text-[15px] text-slate-500">Define cuándo y cómo se activará esta automatización.</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-[14px] font-bold text-slate-900 mb-2">Tipo de disparador</label>
                <div className="relative">
                  <select 
                    value={tipoDisparador}
                    onChange={(e) => setTipoDisparador(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 text-[15px] text-slate-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                  >
                    <option value="Sin disparador">Sin disparador</option>
                    <option value="Mensaje recibido">Mensaje recibido</option>
                    <option value="Tag agregado">Tag agregado</option>
                    <option value="Integración con terceros">Integración con terceros</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {tipoDisparador === 'Sin disparador' && (
                <p className="text-[14px] text-slate-500 mb-6">Ningún valor seleccionado por el momento.</p>
              )}

              {tipoDisparador === 'Mensaje recibido' && (
                <>
                  <div className="mb-6">
                    <label className="block text-[14px] font-bold text-slate-900 mb-2">Seleccionar dispositivo</label>
                    <div className="relative">
                      <select 
                        value={dispositivo}
                        onChange={(e) => setDispositivo(e.target.value)}
                        className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 text-[15px] text-slate-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                      >
                        <option value="Enviar en cualquier dispositivo">Enviar en cualquier dispositivo</option>
                        {devices.map(d => (
                          <option key={d.id} value={d.nombre}>{d.nombre} ({d.numero_telefono})</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[14px] font-bold text-slate-900 mb-2">Condición del mensaje</label>
                    <div className="relative">
                      <select 
                        value={condicionMensaje}
                        onChange={(e) => setCondicionMensaje(e.target.value)}
                        className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 text-[15px] text-slate-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                      >
                        <option value="Contiene">Contiene</option>
                        <option value="Exacto">Exacto</option>
                        <option value="Todos">Todos</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {condicionMensaje === 'Todos' ? (
                    <div className="mb-6 bg-[#ecfdf5] rounded-xl p-4">
                      <p className="text-[13px] text-[#059669] leading-snug">
                        <span className="font-bold">Nota:</span> Solo puedes tener un disparador "Todos" activo por cuenta. Los disparadores con palabras específicas tienen prioridad sobre "Todos".
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <label className="block text-[14px] font-bold text-slate-900 mb-2">Seleccionar Walink (Palabra clave)</label>
                      <div className="relative">
                        <select 
                          value={palabraClave}
                          onChange={(e) => setPalabraClave(e.target.value)}
                          className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 text-[14px] text-slate-800 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                        >
                          <option value="">Seleccione un walink...</option>
                          {whalinks.map(w => (
                            <option key={w.id} value={w.mensaje_predeterminado}>
                              {w.nombre} - "{w.mensaje_predeterminado}"
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#10b981] mt-2 font-medium">Al seleccionar un walink, su mensaje predeterminado será la palabra clave.</p>
                    </div>
                  )}
                </>
              )}

              {tipoDisparador === 'Tag agregado' && (
                <>
                  <div className="mb-6">
                    <label className="block text-[14px] font-bold text-slate-900 mb-1">Seleccionar tag</label>
                    <p className="text-[14px] text-slate-500 mb-2">Elige el tag que desencadenará la automatización.</p>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 text-[15px] text-slate-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]">
                        <option>Selecciona un tag</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[14px] font-bold text-slate-900 mb-2">Seleccionar dispositivo</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 text-[15px] text-slate-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]">
                        <option>Selecciona un dispositivo</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tipoDisparador === 'Integración con terceros' && (
                <>
                  <div className="mb-6">
                    <label className="block text-[14px] font-bold text-slate-900 mb-2">Seleccionar dispositivo</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 text-[15px] text-slate-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]">
                        <option>Selecciona una opción</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[14px] font-bold text-slate-900 mb-2">Copia esta URL y configúrala en tu plataforma externa</label>
                    <div className="relative">
                      <input 
                        readOnly 
                        value="https://conversations-api.funnelchat.app/api/v1/users/7710/trigger..." 
                        className="w-full bg-[#f8f9fc] border border-slate-200 rounded-lg pl-4 pr-12 py-3 text-[14px] text-[#10b981] font-medium focus:outline-none truncate"
                      />
                      <button className="absolute inset-y-0 right-2 flex items-center px-3 text-[#10b981] hover:text-[#4a4ce0] transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 bg-[#fffdf0] border border-[#fceaa8] rounded-xl p-4 flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      <div className="w-5 h-5 rounded-full bg-[#f5b000] flex items-center justify-center">
                        <Clock size={12} className="text-white" strokeWidth={3} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-900 mb-0.5">Esperando datos del webhook</h4>
                      <p className="text-[13px] text-[#c58d00] leading-snug font-medium">Envía una petición de prueba desde tu herramienta externa para detectar los campos disponibles.</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-[14px] font-bold text-slate-900 mb-1">Relaciona los datos del webhook con la información de tus contactos</h4>
                    <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">Selecciona las variables que quieres guardar. Puedes asignar múltiples variables al mismo campo.</p>
                    
                    <div className="flex justify-end mb-4">
                      <button 
                        onClick={() => setShowCustomFieldModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-[14px] font-bold text-[#10b981] border border-[#10b981] rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Plus size={16} /> Añadir campo
                      </button>
                    </div>

                    <div>
                      <label className="block text-[14px] font-bold text-slate-900 mb-2">Teléfono:</label>
                      <input 
                        type="text" 
                        placeholder="Ingrese una palabra o frase clave"
                        className="w-full bg-[#f8f9fc] border border-slate-200 rounded-lg px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                      />
                    </div>

                    {customFields.map((field) => (
                      <div key={field} className="mt-4">
                        <label className="block text-[14px] font-bold text-slate-900 mb-2">{field}:</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="text" 
                            placeholder="Ingrese una palabra o frase clave"
                            className="flex-1 bg-[#f8f9fc] border border-slate-200 rounded-lg px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                          />
                          <button 
                            onClick={() => handleRemoveCustomField(field)}
                            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                          >
                            <X size={20} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-[14px] font-bold text-slate-900">Frecuencia de activación por contacto</label>
                  <div className="relative group/tooltip flex items-center justify-center">
                    <HelpCircle size={15} className="text-slate-500 cursor-help hover:text-slate-700" />
                    
                    {/* Tooltip Oscuro */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[280px] bg-[#1c1d2c] text-white text-sm rounded-lg p-4 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-2xl">
                      <div className="mb-3">
                        <p className="font-bold mb-1 text-[13px]">Cada vez que se cumpla la condición</p>
                        <p className="text-slate-300 text-[12px] leading-snug">El contacto recibirá la automatización cada vez que active el disparador.</p>
                      </div>
                      <div>
                        <p className="font-bold mb-1 text-[13px]">Solo una vez por contacto</p>
                        <p className="text-slate-300 text-[12px] leading-snug">Se ejecuta solo la primera vez.</p>
                      </div>
                      {/* Triángulo del tooltip */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1c1d2c]"></div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setFrecuencia('cada_vez')}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${frecuencia === 'cada_vez' ? 'bg-[#10b981]' : 'border border-slate-300 group-hover:border-[#10b981]'}`}>
                      {frecuencia === 'cada_vez' && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                    <span className={`text-[15px] transition-colors ${frecuencia === 'cada_vez' ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>Cada vez que se cumpla la condición</span>
                  </label>
                  
                  <label 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setFrecuencia('una_vez')}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${frecuencia === 'una_vez' ? 'bg-[#10b981]' : 'border border-slate-300 group-hover:border-[#10b981]'}`}>
                      {frecuencia === 'una_vez' && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                    <span className={`text-[15px] transition-colors ${frecuencia === 'una_vez' ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>Solo una vez por contacto</span>
                  </label>
                </div>
              </div>

              {tipoDisparador === 'Mensaje recibido' && condicionMensaje === 'Contiene' && (
                <div className="flex items-center justify-between mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" className="peer appearance-none w-4 h-4 rounded border border-slate-300 checked:bg-[#10b981] checked:border-[#10b981] transition-colors" />
                      <svg className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-800 text-[15px] flex items-center gap-0.5">IA<Sparkles size={14}/></span>
                      <span className="text-[15px] font-bold text-slate-500">Disparador Inteligente</span>
                      <HelpCircle size={15} className="text-slate-400 ml-1" />
                    </div>
                  </label>
                  <Lock size={18} className="text-slate-400" />
                </div>
              )}
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowTriggerModal(false)}
                  className="flex-1 py-3 text-[15px] font-bold text-[#10b981] bg-white border border-[#10b981] rounded-lg hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveTrigger}
                  className="flex-1 py-3 text-[15px] font-bold text-white bg-[#10b981] rounded-lg hover:bg-[#059669] transition-colors shadow-sm">
                  Agregar disparador
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL AGREGAR CAMPO CUSTOMIZADO */}
        {showCustomFieldModal && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
            <div className="bg-white rounded-xl shadow-2xl w-[500px] animate-in fade-in zoom-in-95 p-8 relative">
              <button onClick={() => setShowCustomFieldModal(false)} className="absolute top-6 right-6 text-black hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
              
              <div className="mb-8">
                <h2 className="text-[24px] leading-tight font-bold text-black mb-2">Agregar campo customizado</h2>
                <p className="text-[15px] text-slate-500">Selecciona la opción que mejor se adapte a tus objetivos</p>
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <select 
                    value=""
                    onChange={(e) => handleAddCustomField(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-4 py-3 text-[15px] text-slate-600 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                  >
                    <option value="">Selecciona un campo customizado</option>
                    <option value="Email" className="text-slate-700">Email</option>
                    <option value="Nombre" className="text-slate-700">Nombre</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-black">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

            {/* BOTÓN FLOTANTE: AGREGAR NOTA */}
            <button className="absolute bottom-6 left-6 z-40 bg-[#f5b000] hover:bg-[#e0a000] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95">
              <Edit3 size={18} />
              Agregar nota
            </button>
            
            {/* MODAL GUARDAR AUTOMATIZACIÓN */}
            {showSaveModal && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
                <div className="bg-white rounded-xl shadow-2xl w-[450px] animate-in fade-in zoom-in-95 p-8 relative">
                  <button onClick={() => setShowSaveModal(false)} className="absolute top-6 right-6 text-black hover:text-slate-600 transition-colors">
                    <X size={24} />
                  </button>
                  
                  <div className="mb-6">
                    <h2 className="text-[22px] leading-tight font-black text-slate-900 mb-6">¡Atención!</h2>
                    <p className="text-[14px] text-slate-600 mb-4">¿Estás seguro de que quieres guardar los datos del flujo?</p>
                    
                    <div className="mb-4">
                      <p className="text-[14px] font-bold text-slate-900">Resumen del flujo</p>
                      <p className="text-[14px] text-[#10b981] font-bold">Pasos en el flow: {nodes.length - 1}</p>
                    </div>

                    <div className="mb-6">
                      <p className="text-[14px] font-bold text-slate-900 mb-1">Disparador:</p>
                      <p className="text-[14px] text-slate-600 mb-2">{condicionMensaje === 'Contiene' ? 'Contiene palabra/frase' : 'Mensaje exacto'}</p>
                      {palabraClave ? (
                        <div className="inline-block bg-[#ecfdf5] text-[#059669] px-3 py-1 rounded-full text-[13px] font-bold mb-4">
                          {palabraClave}
                        </div>
                      ) : (
                        <div className="inline-block bg-red-50 text-red-500 px-3 py-1 rounded-full text-[13px] font-bold mb-4">
                          Falta configurar palabra clave
                        </div>
                      )}
                      <p className="text-[13px] text-slate-800 font-medium">Esta automatización se activará cada vez que se cumpla el disparador</p>
                    </div>

                    <div className="mb-6">
                      <label className="block text-[14px] font-bold text-slate-900 mb-2">Carpeta</label>
                      <select
                        value={selectedFolderId}
                        onChange={(e) => setSelectedFolderId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-[14px] text-slate-700 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                      >
                        <option value="">Selecciona una carpeta</option>
                        {folders.map(folder => (
                          <option key={folder.id} value={folder.id}>{folder.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-4 mt-8">
                      <button 
                        onClick={() => setShowSaveModal(false)}
                        className="flex-1 py-2.5 text-[14px] font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveAutomation}
                        disabled={isSaving}
                        className={`flex-1 py-2.5 text-[14px] font-bold text-white rounded-lg transition-colors flex justify-center items-center gap-2 ${isSaving ? 'bg-[#6ee7b7] cursor-not-allowed' : 'bg-gradient-to-r from-[#10b981] to-[#0d9488] hover:opacity-90'}`}
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Guardando...
                          </>
                        ) : 'Actualizar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
