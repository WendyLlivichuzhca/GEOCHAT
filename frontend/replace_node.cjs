const fs = require('fs');
const content = fs.readFileSync('src/components/AutomationBuilder.jsx', 'utf8');

const start = content.indexOf('// --- NODO PERSONALIZADO: ENVIAR MENSAJE ---');
const end   = content.indexOf('\nconst nodeTypes = {');

const newNode = `// --- NODO PERSONALIZADO: ENVIAR MENSAJE ---
const SendMessageNode = ({ id, data }) => {
  const [blocks, setBlocks] = React.useState([{ key: 'Texto', uid: 1 }]);
  const [tiempos, setTiempos] = React.useState({});

  const msgTypes = [
    { key: 'Texto',      label: 'Texto',      icon: <MessageSquare size={14} /> },
    { key: 'Multimedia', label: 'Multimedia',  icon: <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
    { key: 'Audio',      label: 'Audio',      icon: <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg> },
    { key: 'Documento',  label: 'Documento',  icon: <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
    { key: 'Contacto',   label: 'Contacto',   icon: <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
  ];

  const addBlock   = (key) => setBlocks(prev => [...prev, { key, uid: Date.now() }]);
  const removeBlock = (uid) => setBlocks(prev => prev.filter(b => b.uid !== uid));
  const toggleTiempo = (uid) => setTiempos(prev => ({ ...prev, [uid]: !prev[uid] }));

  const BlockContent = ({ blk }) => {
    const meta = msgTypes.find(t => t.key === blk.key);
    const tiempoOn = tiempos[blk.uid];
    return (
      <div className="border-b border-slate-100">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">{meta?.icon}</span>
            <span className="font-semibold text-[13px]">{blk.key}</span>
          </div>
          <button onClick={() => removeBlock(blk.uid)} className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>

        {blk.key === 'Texto' && (
          <div className="px-4 pt-3 pb-2">
            <textarea placeholder="Escribe un mensaje..." className="w-full h-[80px] resize-none bg-slate-50 border border-slate-200 rounded-t-lg px-3 py-2 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-violet-300" />
            <div className="flex items-center justify-between border border-slate-200 border-t-0 bg-slate-50 rounded-b-lg px-3 py-1.5">
              <div className="flex gap-2">
                <button className="text-slate-400 text-[14px]">☺</button>
                <button className="text-slate-500 font-bold text-[11px]">B</button>
                <button className="text-slate-500 italic text-[11px]">I</button>
                <button className="text-slate-500 line-through text-[11px]">S</button>
                <button className="text-slate-500 font-mono text-[10px]">{"{}"}</button>
              </div>
              <span className="text-[11px] text-slate-400">0 / 4000</span>
            </div>
          </div>
        )}

        {(blk.key === 'Multimedia' || blk.key === 'Documento') && (
          <div className="px-4 py-3">
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-center mb-3">
              <p className="text-[11px] text-sky-700">Tu archivo no debe superar los <b>80MB</b>.<br/>Si se envía por WhatsApp API, el límite es de <b>16MB</b>.</p>
            </div>
            <button className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white font-bold text-[13px] py-2 rounded-lg mb-2 transition-colors">Cargar archivo</button>
            {blk.key === 'Multimedia' && (
              <>
                <textarea placeholder="Escribe un mensaje..." className="w-full h-[60px] resize-none bg-slate-50 border border-slate-200 rounded-t-lg px-3 py-2 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-violet-300" />
                <div className="flex items-center justify-between border border-slate-200 border-t-0 bg-slate-50 rounded-b-lg px-3 py-1">
                  <div className="flex gap-2">
                    <button className="text-slate-400 text-[14px]">☺</button>
                    <button className="text-slate-500 font-bold text-[11px]">B</button>
                    <button className="text-slate-500 italic text-[11px]">I</button>
                    <button className="text-slate-500 line-through text-[11px]">S</button>
                  </div>
                  <span className="text-[11px] text-slate-400">0 / 1024</span>
                </div>
              </>
            )}
          </div>
        )}

        {blk.key === 'Audio' && (
          <div className="px-4 py-3">
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-center mb-3">
              <p className="text-[11px] text-sky-700">Tu archivo de audio no debe superar los <b>80MB</b>.<br/>Si se envía por WhatsApp API, el límite es de <b>16MB</b>.</p>
            </div>
            <button className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white font-bold text-[13px] py-2 rounded-lg mb-2 transition-colors">Cargar archivo</button>
            <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[13px] py-2 rounded-lg flex items-center justify-center gap-2">
              Grabar audio
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            </button>
          </div>
        )}

        {blk.key === 'Contacto' && (
          <div className="px-4 py-3">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-violet-600" />
              <span className="text-[12px] font-semibold text-slate-700">Usar número de WhatsApp conectado</span>
            </label>
            <p className="text-[11px] font-bold text-slate-700 mb-1">Número del contacto<span className="text-red-500">*</span></p>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 mb-3"><span>🇺🇸</span><span className="text-slate-400 text-[12px]">▾ +1</span></div>
            <p className="text-[11px] font-bold text-slate-700 mb-1">Nombre del contacto<span className="text-red-500">*</span></p>
            <input type="text" placeholder="Escribe el nombre del contacto" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] placeholder:text-slate-400 focus:outline-none focus:border-violet-300" />
          </div>
        )}

        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-semibold text-orange-500">Tiempo entre mensaje</span>
            <div className="flex items-center gap-2">
              <div onClick={() => toggleTiempo(blk.uid)} className={"w-8 h-4 rounded-full relative cursor-pointer transition-colors " + (tiempoOn ? "bg-violet-500" : "bg-slate-200")}>
                <div className={"w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform " + (tiempoOn ? "translate-x-4" : "translate-x-0.5")}></div>
              </div>
              <span className="text-[11px] text-slate-600">Segundos</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400"><b>Nota:</b> mínimo de {blk.key === 'Texto' ? 3 : 5} y un máximo de 60</p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[360px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-slate-200 relative">
      <div className="absolute -top-10 left-0 flex gap-1.5">
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-violet-600 hover:bg-violet-50 shadow-sm"><Copy size={12}/> Duplicar</button>
        <button onClick={data?.onDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-violet-600 hover:bg-violet-50 shadow-sm"><Trash2 size={12}/> Eliminar</button>
      </div>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-white border-2 border-slate-400 left-[-6px] top-[36px] rounded-full" />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600"><MessageSquare size={15}/></div>
        <span className="font-bold text-slate-800 text-[14px]">Enviar mensaje</span>
      </div>
      {blocks.map(blk => <BlockContent key={blk.uid} blk={blk} />)}
      <div className="px-4 py-3">
        <p className="text-[12px] font-bold text-slate-700 mb-2">Tipo de mensaje</p>
        <div className="flex gap-1 justify-between border border-slate-100 rounded-xl p-1 bg-slate-50">
          {msgTypes.map(({ key, label, icon }) => (
            <button key={key} onClick={() => addBlock(key)} className="flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg flex-1 text-slate-400 hover:text-violet-600 hover:bg-white hover:shadow-sm transition-all">
              {icon}<span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pb-3 flex justify-end items-center gap-2">
        <span className="text-[11px] text-slate-400 font-medium">Próximo paso</span>
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-white border-2 border-slate-300 right-[-6px] rounded-full" />
      </div>
    </div>
  );
};
`;

const result = content.slice(0, start) + newNode + content.slice(end);
fs.writeFileSync('src/components/AutomationBuilder.jsx', result, 'utf8');
console.log('OK');
