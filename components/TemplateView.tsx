
import React, { useState, useEffect } from 'react';
import { askTutor, generateMindMap, generateStudyVisual } from '../services/geminiService';
import { ICONS } from '../constants';
import { MindMapData, MindMapNode } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface StudyStudioProps {
  mode: 'NOTES' | 'STUDIO';
}

const WorkflowRenderer: React.FC<{ data: MindMapData, onDataChange: (data: MindMapData) => void }> = ({ data, onDataChange }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const currentPage = data.pages[currentPageIndex] || data.pages[0];

  const handleNodeEdit = (nodeId: string, field: 'label' | 'content', value: string) => {
    const updatedPages = data.pages.map(page => ({
      ...page,
      nodes: page.nodes.map(node => node.id === nodeId ? { ...node, [field]: value } : node)
    }));
    onDataChange({ ...data, pages: updatedPages });
  };

  const getPos = (id: string, nodesOnPage: MindMapNode[]) => {
    const topics = nodesOnPage.filter(n => n.type === 'topic');
    const subtopics = nodesOnPage.filter(n => n.type === 'subtopic');
    const leaf = nodesOnPage.filter(n => !['topic', 'subtopic'].includes(n.type));
    const node = nodesOnPage.find(n => n.id === id);
    if (!node) return { x: 50, y: 50 };
    if (node.type === 'topic') return { x: (100 / (topics.length + 1)) * (topics.indexOf(node) + 1), y: 15 };
    if (node.type === 'subtopic') return { x: (100 / (subtopics.length + 1)) * (subtopics.indexOf(node) + 1), y: 45 };
    const idx = leaf.indexOf(node);
    const cols = Math.ceil(Math.sqrt(leaf.length || 1));
    return { x: (100 / (cols + 1)) * ((idx % cols) + 1), y: 75 + (Math.floor(idx / cols) * 12) };
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full animate-fade-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 font-display">{data.title}</h3>
          <p className="text-[10px] md:text-[11px] text-slate-500 font-medium italic mt-1 leading-tight">Stage: {currentPage?.summary}</p>
        </div>
        <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200 self-end md:self-auto">
          {data.pages.map((p, idx) => (
            <button key={idx} onClick={() => setCurrentPageIndex(idx)}
              className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all ${currentPageIndex === idx ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full min-h-[500px] md:min-h-[650px] bg-[#fcfdff] rounded-[1.5rem] md:rounded-[3rem] border-2 border-slate-100 shadow-inner overflow-x-auto touch-pan-x custom-scrollbar">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
        
        {/* SVG needs a minimum width on mobile to prevent squashing */}
        <div className="min-w-[600px] md:min-w-full h-full relative">
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orientation="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" /></marker></defs>
            {currentPage.edges.map((edge, i) => {
              const from = getPos(edge.from, currentPage.nodes);
              const to = getPos(edge.to, currentPage.nodes);
              return <path key={i} d={`M ${from.x}% ${from.y}% C ${from.x}% ${from.y + 12}%, ${to.x}% ${to.y - 12}%, ${to.x}% ${to.y}%`} stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="8 6" markerEnd="url(#arrowhead)" className="opacity-20" />;
            })}
          </svg>

          {currentPage.nodes.map(node => {
            const pos = getPos(node.id, currentPage.nodes);
            return (
              <div key={node.id} className={`absolute p-3 md:p-5 rounded-2xl md:rounded-3xl shadow-xl border-2 w-48 md:w-64 transform -translate-x-1/2 -translate-y-1/2 bg-white group transition-all z-10 ${node.type === 'topic' ? 'border-indigo-500 ring-4 md:ring-8 ring-indigo-50' : 'border-slate-200'}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                  <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm ${node.type === 'topic' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{node.type === 'tip' ? '💡' : '🎯'}</div>
                  <input value={node.label} onChange={(e) => handleNodeEdit(node.id, 'label', e.target.value)} className="text-[10px] md:text-xs font-black w-full bg-transparent border-none p-0 focus:ring-0 truncate" />
                </div>
                <textarea value={node.content} onChange={(e) => handleNodeEdit(node.id, 'content', e.target.value)} rows={3} className="text-[9px] md:text-[11px] text-slate-500 font-medium leading-relaxed bg-transparent border-none w-full p-0 focus:ring-0 resize-none custom-scrollbar" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StudyStudio: React.FC<StudyStudioProps> = ({ mode }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState(() => mode === 'NOTES' ? localStorage.getItem('academia_last_notes') || '' : '');
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(() => mode === 'STUDIO' ? JSON.parse(localStorage.getItem('academia_last_mindmap') || 'null') : null);
  const [diagramUrl, setDiagramUrl] = useState<string | null>(() => mode === 'STUDIO' ? localStorage.getItem('academia_last_diagram') : null);
  const [isLoading, setIsLoading] = useState(false);
  const [studioTab, setStudioTab] = useState<'map' | 'diagram'>('map');
  const [noteFocus, setNoteFocus] = useState<'Standard' | 'Summary' | 'Advanced'>('Advanced');

  useEffect(() => { if (mode === 'NOTES' && output) localStorage.setItem('academia_last_notes', output); }, [output, mode]);
  useEffect(() => { if (mode === 'STUDIO' && mindMapData) localStorage.setItem('academia_last_mindmap', JSON.stringify(mindMapData)); }, [mindMapData, mode]);
  useEffect(() => { if (mode === 'STUDIO' && diagramUrl) localStorage.setItem('academia_last_diagram', diagramUrl); }, [diagramUrl, mode]);

  const handleSynthesize = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    try {
      if (mode === 'NOTES') {
        const response = await askTutor({ prompt: `${input} (${noteFocus})`, useThinking: true });
        setOutput(response.text);
      } else if (studioTab === 'map') {
        const data = await generateMindMap(input);
        setMindMapData(data);
      } else {
        const url = await generateStudyVisual(input, '16:9');
        setDiagramUrl(url);
      }
    } catch (err: any) { setOutput(`Error: ${err.message}`); } finally { setIsLoading(false); }
  };

  const clearStorage = () => {
    if (mode === 'NOTES') { setOutput(''); localStorage.removeItem('academia_last_notes'); }
    else { setMindMapData(null); setDiagramUrl(null); localStorage.removeItem('academia_last_mindmap'); localStorage.removeItem('academia_last_diagram'); }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <header className="hidden md:flex h-16 border-b border-slate-100 items-center justify-between px-8 bg-white/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center text-white"><ICONS.Notes className="w-5 h-5" /></div>
          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{mode === 'NOTES' ? 'Academic Mastery' : 'Visual Studio'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {mode === 'STUDIO' ? (
              <>
                <button onClick={() => setStudioTab('map')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${studioTab === 'map' ? 'bg-white text-indigo-600' : 'text-slate-400'}`}>Map</button>
                <button onClick={() => setStudioTab('diagram')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${studioTab === 'diagram' ? 'bg-white text-indigo-600' : 'text-slate-400'}`}>Diagram</button>
              </>
            ) : (
              ['Standard', 'Summary', 'Advanced'].map(f => (
                <button key={f} onClick={() => setNoteFocus(f as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${noteFocus === f ? 'bg-white text-indigo-600' : 'text-slate-400'}`}>{f}</button>
              ))
            )}
          </div>
          <button onClick={clearStorage} className="p-2 text-slate-400 hover:text-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
      </header>

      {/* Mobile-only tools bar */}
      <div className="md:hidden flex flex-wrap gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 items-center justify-between">
        <div className="flex gap-1 bg-slate-200 p-1 rounded-lg">
          {mode === 'STUDIO' ? (
             <>
              <button onClick={() => setStudioTab('map')} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${studioTab === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Map</button>
              <button onClick={() => setStudioTab('diagram')} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${studioTab === 'diagram' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Diagram</button>
             </>
          ) : (
            ['Standard', 'Summary', 'Advanced'].map(f => (
              <button key={f} onClick={() => setNoteFocus(f as any)} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${noteFocus === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{f}</button>
            ))
          )}
        </div>
        <button onClick={clearStorage} className="text-[9px] font-black text-slate-400 uppercase">Clear Asset</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fafafa]">
        <div className="chat-max-width px-4 md:px-6 py-8 md:py-12 space-y-8 md:space-y-12">
          <div className="space-y-4 md:space-y-6">
            <h1 className="text-2xl md:text-4xl font-black font-display text-slate-900 tracking-tight leading-tight px-2">
              {mode === 'NOTES' ? 'Synthesize Rigorous Notes' : `Construct ${studioTab === 'map' ? 'Logical Workflow' : 'Visual Aid'}`}
            </h1>
            <div className="relative group bg-white border border-slate-200 rounded-3xl shadow-2xl p-2 transition-all">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSynthesize()} placeholder="Topic..." className="w-full px-4 md:px-8 py-4 md:py-5 focus:outline-none text-slate-800 text-base md:text-lg bg-transparent placeholder:text-slate-400" />
              <button onClick={handleSynthesize} disabled={isLoading || !input.trim()} className="absolute right-3 top-3 bottom-3 bg-slate-950 text-white px-6 md:px-10 rounded-2xl font-bold hover:bg-indigo-600 text-xs md:text-sm">
                {isLoading ? <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Go'}
              </button>
            </div>
          </div>

          <div className={`min-h-[400px] md:min-h-[500px] rounded-[1.5rem] md:rounded-[3rem] p-4 md:p-12 relative transition-all duration-700 bg-white shadow-2xl border border-slate-100`}>
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white/60 backdrop-blur-sm rounded-[1.5rem] md:rounded-[3rem]">
                <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-slate-900 uppercase tracking-widest text-[10px] md:text-xs">Building Knowledge Infrastructure...</p>
              </div>
            ) : output || mindMapData || diagramUrl ? (
              <div className="animate-fade-up">
                {mode === 'NOTES' && (
                  <div className="prose prose-slate prose-sm md:prose-base max-w-none bg-white font-serif">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{output}</ReactMarkdown>
                  </div>
                )}
                {mode === 'STUDIO' && studioTab === 'map' && mindMapData && <WorkflowRenderer data={mindMapData} onDataChange={setMindMapData} />}
                {mode === 'STUDIO' && studioTab === 'diagram' && diagramUrl && (
                  <div className="flex flex-col items-center gap-6 md:gap-8">
                    <img src={diagramUrl} alt="Visual Aid" className="rounded-2xl md:rounded-[3rem] shadow-2xl w-full max-w-4xl border" />
                    <a href={diagramUrl} download="academia-diagram.png" className="bg-slate-950 text-white px-8 py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest">Download Asset</a>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[300px] md:h-[450px] flex flex-col items-center justify-center text-slate-200 space-y-6">
                <ICONS.Brain className="w-12 h-12 md:w-16 md:h-16 opacity-10" />
                <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.4em] opacity-30 text-center px-4">Architect Mode Standby</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyStudio;
