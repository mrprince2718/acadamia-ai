
import React, { useState, useEffect, useRef, useContext } from 'react';
import { synthesizeNotesPico, generateMindMap, generateStudyVisual, generateQuiz } from '../services/geminiService';
import { ICONS } from '../constants';
import { MindMapData, MindMapNode, MindMapPage, QuizData, QuizQuestion } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '../context/AuthContext';
import { AppSettingsContext } from '../App';
import { db } from '../services/firebase';
import { doc, setDoc, collection, query, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';

interface StudyStudioProps {
  mode: 'NOTES' | 'STUDIO';
}

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  data: string; // base64
  preview?: string;
  size?: number;
}

interface SavedNote {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

const QuizRushPlayer: React.FC<{ 
  quiz: QuizData, 
  onClose: () => void 
}> = ({ quiz, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [diagUrl, setDiagUrl] = useState<string | null>(null);
  const [isDiagLoading, setIsDiagLoading] = useState(false);

  const currentQ = quiz.questions[currentIndex];

  useEffect(() => {
    setDiagUrl(null);
    if (currentQ?.diagramPrompt) {
      loadDiagram(currentQ.diagramPrompt);
    }
  }, [currentIndex, currentQ]);

  const loadDiagram = async (prompt: string) => {
    setIsDiagLoading(true);
    try {
      const url = await generateStudyVisual(prompt, '1:1');
      setDiagUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDiagLoading(false);
    }
  };

  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === currentQ.correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[3rem] shadow-2xl border-4 border-indigo-50 animate-fade-up">
        <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl mb-6 shadow-xl shadow-indigo-100">
           <i className="fas fa-trophy"></i>
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Protocol Terminated</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Mastery Quotient: {Math.round((score / quiz.questions.length) * 100)}%</p>
        <div className="text-6xl font-black text-indigo-600 mb-10">{score} / {quiz.questions.length}</div>
        <button onClick={onClose} className="px-12 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">End Session</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-up">
      <div className="flex items-center justify-between px-6">
         <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-widest">Axiom {currentIndex + 1} / {quiz.questions.length}</span>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-tighter truncate max-w-[250px]">{quiz.title}</h3>
         </div>
         <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all"><i className="fas fa-times"></i></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-8">
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border-2 border-slate-100 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
            <h4 className="text-lg md:text-2xl font-black text-slate-900 leading-tight">
               <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ.question}</ReactMarkdown>
            </h4>
          </div>

          <div className="space-y-4">
            {currentQ.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleOptionClick(i)}
                className={`
                  w-full text-left px-8 py-6 rounded-[1.8rem] border-2 font-black text-sm md:text-base transition-all flex items-center justify-between group
                  ${isAnswered 
                    ? (i === currentQ.correctAnswerIndex ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : (i === selectedOption ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-400'))
                    : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-400 hover:shadow-lg shadow-sm active:scale-[0.98]'
                  }
                `}
              >
                <span>{opt}</span>
                {isAnswered && i === currentQ.correctAnswerIndex && <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center"><i className="fas fa-check"></i></div>}
                {isAnswered && i === selectedOption && i !== currentQ.correctAnswerIndex && <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center"><i className="fas fa-times"></i></div>}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {diagUrl ? (
            <div className="bg-white p-6 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 animate-fade-up">
              <img src={diagUrl} className="w-full rounded-[2.5rem] border border-slate-100" alt="Diagram" />
              <div className="flex items-center justify-center gap-2 mt-6">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Visualization Active</p>
              </div>
            </div>
          ) : isDiagLoading ? (
            <div className="aspect-square bg-slate-50 border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center justify-center gap-6">
               <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Architecting Visual Aid...</p>
            </div>
          ) : null}

          {isAnswered && (
            <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl animate-fade-up">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg"><i className="fas fa-lightbulb"></i></div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Mastery Explanation</span>
               </div>
               <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ.explanation}</ReactMarkdown>
               </div>
               <button onClick={nextQuestion} className="mt-10 w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 active:scale-95">
                  Advance <i className="fas fa-arrow-right ml-2"></i>
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WorkflowRenderer: React.FC<{ 
  data: MindMapData, 
  onDataChange: (data: MindMapData) => void,
  isEditable?: boolean
}> = ({ data, onDataChange, isEditable = false }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentPage = data.pages[currentPageIndex] || data.pages[0];

  useEffect(() => { setTransform({ x: 0, y: 0, scale: window.innerWidth < 768 ? 0.8 : 1 }); }, [currentPageIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mindmap-node')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }));
  };
  const handleMouseUp = () => setIsDragging(false);

  const getPos = (id: string, nodesOnPage: MindMapNode[]) => {
    const node = nodesOnPage.find(n => n.id === id);
    if (!node) return { x: 500, y: 500 };
    if (node.x !== undefined && node.y !== undefined) return { x: node.x, y: node.y };
    if (node.type === 'topic') return { x: 500, y: 150 };
    const others = nodesOnPage.filter(n => n.type !== 'topic');
    const idx = others.indexOf(node);
    const angle = (idx / others.length) * 2 * Math.PI - Math.PI / 2;
    return { x: 500 + 350 * Math.cos(angle), y: 550 + 300 * Math.sin(angle) };
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up">
      <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 font-display tracking-tight uppercase">{data.title}</h3>
          <p className="text-[11px] text-indigo-500 font-black uppercase tracking-widest mt-1">Architecture Page {currentPageIndex + 1}: {currentPage?.summary}</p>
        </div>
        <div className="flex gap-2">
          {data.pages.map((p, idx) => (
            <button key={idx} onClick={() => setCurrentPageIndex(idx)} className={`w-12 h-12 rounded-2xl text-xs font-black uppercase transition-all border ${currentPageIndex === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'}`}>{idx + 1}</button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className={`relative w-full h-[600px] md:h-[800px] bg-slate-50/50 rounded-[4rem] border-2 border-slate-100 shadow-inner overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '50px 50px', transform: `translate(${transform.x % 50}px, ${transform.y % 50}px)` }}></div>
        <div className="absolute inset-0 transition-transform duration-75 ease-out" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]">
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="25" refY="5" orientation="auto"><path d="M0,0 L0,10 L10,5 Z" fill="#6366f1" /></marker></defs>
              {currentPage.edges.map((edge, i) => {
                const from = getPos(edge.from, currentPage.nodes);
                const to = getPos(edge.to, currentPage.nodes);
                return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#6366f1" strokeWidth="3" strokeDasharray="8 5" className="opacity-20" markerEnd="url(#arrow)" />;
              })}
            </svg>
            {currentPage.nodes.map(node => {
              const pos = getPos(node.id, currentPage.nodes);
              const isActive = activeNode === node.id;
              const isTopic = node.type === 'topic';
              return (
                <div key={node.id} onClick={(e) => { e.stopPropagation(); setActiveNode(isActive ? null : node.id); }} className={`mindmap-node absolute p-6 rounded-[2.2rem] shadow-2xl border-2 transition-all duration-500 cursor-pointer ${isActive ? 'w-[450px] z-50 scale-110 ring-8 ring-indigo-50' : 'w-64 z-20 hover:scale-105'} ${isTopic ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white border-slate-100 text-slate-800'} transform -translate-x-1/2 -translate-y-1/2`} style={{ left: pos.x, top: pos.y }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isTopic ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>{node.type === 'tip' ? '💡' : node.type === 'mistake' ? '⚠️' : node.type === 'formula' ? '∑' : '◈'}</div>
                    <h4 className={`text-sm font-black uppercase tracking-tight leading-tight ${isTopic ? 'text-white' : 'text-slate-900'}`}>{node.label}</h4>
                  </div>
                  <div className={`prose prose-sm prose-invert max-w-none transition-all duration-300 ${isActive ? 'max-h-[400px] opacity-100 mt-4' : 'max-h-[40px] opacity-40 overflow-hidden text-[10px]'} ${isTopic ? 'text-indigo-50' : 'text-slate-500'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{node.content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const StudyStudio: React.FC<StudyStudioProps> = ({ mode }) => {
  const { user } = useAuth();
  const { language } = useContext(AppSettingsContext);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [studioTab, setStudioTab] = useState<'map' | 'diagram' | 'library' | 'create'>('map');
  const [notesTab, setNotesTab] = useState<'create' | 'quiz' | 'library'>('create');
  const [savedMaps, setSavedMaps] = useState<MindMapData[]>([]);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [savedQuizzes, setSavedQuizzes] = useState<QuizData[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    
    // Sync Mindmaps
    const qMaps = query(collection(db, `users/${user.uid}/mindmaps`), orderBy('timestamp', 'desc'));
    const unsubscribeMaps = onSnapshot(qMaps, (snapshot) => {
      setSavedMaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MindMapData)));
    });
    const qNotes = query(collection(db, `users/${user.uid}/notes`), orderBy('timestamp', 'desc'));
    const unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
      setSavedNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedNote)));
    });
    const qQuizzes = query(collection(db, `users/${user.uid}/quizzes`), orderBy('timestamp', 'desc'));
    const unsubscribeQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      setSavedQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizData)));
    });
    return () => { unsubscribeMaps(); unsubscribeNotes(); unsubscribeQuizzes(); };
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          setAttachedFiles(prev => [...prev, { id: Date.now().toString() + Math.random(), name: file.name, type: file.type, data: base64, preview: file.type.startsWith('image/') ? (event.target?.result as string) : undefined, size: file.size }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSynthesize = async () => {
    if (!input.trim() && attachedFiles.length === 0 || isLoading) return;
    setIsLoading(true);
    try {
      if (mode === 'NOTES') {
        if (notesTab === 'quiz') {
          let data: QuizData;
          if (input.trim().startsWith('{') || input.trim().startsWith('[')) {
             try {
               data = JSON.parse(input);
             } catch (e) {
               alert("Invalid JSON format.");
               setIsLoading(false);
               return;
             }
          } else {
             data = await generateQuiz(input || "General Knowledge", language);
          }
          if (user && !user.isAnonymous) await setDoc(doc(db, `users/${user.uid}/quizzes`, data.id), data);
          setQuizData(data);
          setInput('');
          setIsLoading(false);
        } else {
          // NOTES SYNTHESIS using PicoApps WebSocket
          setOutput('');
          synthesizeNotesPico(
            input || (attachedFiles.length > 0 ? `Analysis of: ${attachedFiles.map(f => f.name).join(', ')}` : "Study Mastery"),
            (chunk) => setOutput(prev => prev + chunk),
            async () => {
              setIsLoading(false);
              if (user && !user.isAnonymous) {
                const noteId = Date.now().toString();
                await setDoc(doc(db, `users/${user.uid}/notes`, noteId), { id: noteId, title: input.trim().substring(0, 50) || "Synthesized Masterclass", content: output, timestamp: Date.now() });
              }
            },
            (err) => { setOutput(`Protocol Error: ${err.message}`); setIsLoading(false); }
          );
        }
      } else if (studioTab === 'map') {
        const data = await generateMindMap(`${language === 'GU' ? 'Language: Gujarati. ' : ''}${input}`);
        const mapId = Date.now().toString();
        if (user && !user.isAnonymous) await setDoc(doc(db, `users/${user.uid}/mindmaps`, mapId), { ...data, id: mapId, timestamp: Date.now() });
        setMindMapData({ ...data, id: mapId });
        setIsLoading(false);
      } else if (studioTab === 'diagram') {
        const url = await generateStudyVisual(input, '16:9');
        setDiagramUrl(url);
        setIsLoading(false);
      }
    } catch (err: any) { 
      setOutput(`Synthesis Interrupted: ${err.message}`); 
      setIsLoading(false);
    }
  };

  const handleManualSave = async (updatedData: MindMapData) => {
    setMindMapData(updatedData);
    if (user && !user.isAnonymous && updatedData.id) await setDoc(doc(db, `users/${user.uid}/mindmaps`, updatedData.id), updatedData);
  };

  const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !id) return;
    if (window.confirm("Terminate this quiz protocol?")) await deleteDoc(doc(db, `users/${user.uid}/quizzes`, id));
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !id) return;
    if (window.confirm("Deconstruct this archived note?")) await deleteDoc(doc(db, `users/${user.uid}/notes`, id));
  };

  const handleDeleteMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !id) return;
    if (window.confirm("Delete this architecture?")) await deleteDoc(doc(db, `users/${user.uid}/mindmaps`, id));
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <header className="hidden md:flex h-20 border-b border-slate-100 items-center justify-between px-10 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-950 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg"><ICONS.Notes className="w-7 h-7" /></div>
          <div>
            <span className="text-lg font-black text-slate-900 uppercase tracking-tight">{mode === 'NOTES' ? 'Synthesize & Quiz Rush' : 'Visual Studio'}</span>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-1">Linguistic & Visual Linkage Active</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200">
          {mode === 'STUDIO' ? (
            ['map', 'diagram', 'create', 'library'].map(tab => (
              <button key={tab} onClick={() => setStudioTab(tab as any)} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${studioTab === tab ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{tab}</button>
            ))
          ) : (
            ['create', 'quiz', 'library'].map(tab => (
              <button key={tab} onClick={() => setNotesTab(tab as any)} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${notesTab === tab ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{tab === 'create' ? 'Notes' : tab === 'quiz' ? 'Quiz Rush' : 'Library'}</button>
            ))
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fafafa] pb-40">
        <div className="chat-max-width px-6 md:px-12 py-10 md:py-20 space-y-16">
          {((mode === 'STUDIO' && studioTab !== 'library') || (mode === 'NOTES' && notesTab !== 'library' && !quizData)) && (
            <div className="space-y-8">
              <h1 className="text-4xl md:text-6xl font-black font-display text-slate-900 tracking-tight leading-none animate-fade-up">
                {mode === 'NOTES' 
                  ? (notesTab === 'quiz' ? 'Quiz Rush Protocol' : 'Note Architecture & Synthesis') 
                  : studioTab === 'map' ? 'AI Knowledge Logic' : studioTab === 'diagram' ? 'Blueprint Master' : 'Custom Architect Mode'}
              </h1>
              
              <div className="space-y-4">
                <div className="relative group bg-white border-4 border-slate-50 rounded-[3rem] shadow-2xl p-3 transition-all focus-within:ring-8 focus-within:ring-indigo-50">
                  <div className="flex items-center">
                    {mode === 'NOTES' && notesTab === 'create' && (
                      <button onClick={() => fileInputRef.current?.click()} className="ml-4 p-5 bg-slate-950 rounded-[2rem] text-white hover:bg-indigo-600 transition-all shadow-xl"><i className="fas fa-file-upload text-xl"></i></button>
                    )}
                    <input 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSynthesize()} 
                      placeholder={language === 'GU' ? (notesTab === 'quiz' ? "વિષય અથવા JSON કોડ..." : "નોંધો અપલોડ કરો...") : (notesTab === 'quiz' ? "Topic or Paste JSON logic..." : "Declare research topic...")} 
                      className="w-full px-8 py-7 focus:outline-none text-slate-800 text-xl md:text-3xl bg-transparent placeholder:text-slate-300 font-bold tracking-tight" 
                    />
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf" onChange={handleFileUpload} />
                    <button onClick={handleSynthesize} disabled={isLoading || (!input.trim() && attachedFiles.length === 0)} className="absolute right-5 top-5 bottom-5 bg-slate-950 text-white px-10 md:px-16 rounded-[2.2rem] font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-20 transition-all text-xs md:text-base shadow-xl">
                      {isLoading ? <i className="fas fa-circle-notch animate-spin"></i> : 'INITIALIZE'}
                    </button>
                  </div>
                </div>
                {attachedFiles.length > 0 && notesTab === 'create' && (
                  <div className="flex flex-wrap gap-4 px-6 animate-fade-up">
                    {attachedFiles.map(f => (
                      <div key={f.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        {f.preview ? <img src={f.preview} className="w-10 h-10 rounded-xl object-cover" /> : <i className="fas fa-file-pdf text-rose-500 text-xl px-2"></i>}
                        <span className="text-[11px] font-black text-slate-600 max-w-[150px] truncate uppercase">{f.name}</span>
                        <button onClick={() => setAttachedFiles(prev => prev.filter(x => x.id !== f.id))} className="text-slate-300 hover:text-rose-500"><i className="fas fa-times-circle"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="min-h-[500px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-10 animate-fade-up">
                <div className="relative">
                  <div className="w-28 h-28 border-8 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-atom text-indigo-600 text-3xl animate-pulse"></i></div>
                </div>
                <div className="text-center space-y-4">
                   <p className="font-black text-slate-900 uppercase tracking-[0.4em] text-lg">Logic Stream Syncing</p>
                   <p className="text-slate-400 text-sm font-medium italic">Architecting high-depth assessment structures...</p>
                </div>
              </div>
            ) : quizData ? (
              <QuizRushPlayer quiz={quizData} onClose={() => setQuizData(null)} />
            ) : (notesTab === 'library' && mode === 'NOTES') || (studioTab === 'library' && mode === 'STUDIO') ? (
              <div className="animate-fade-up grid grid-cols-1 md:grid-cols-2 gap-8">
                 {mode === 'NOTES' && (
                   <>
                     <div className="col-span-full mb-6">
                        <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.4em] px-4">Archived Logic Prototypes</h4>
                     </div>
                     {savedQuizzes.map(q => (
                       <div key={q.id} onClick={() => setQuizData(q)} className="group relative bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-2xl">
                          <h3 className="text-xl font-black text-slate-900 mb-2 uppercase leading-tight line-clamp-2">{q.title}</h3>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{q.questions.length} Concepts</span>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(q.timestamp).toLocaleDateString()}</span>
                          </div>
                          <button onClick={(e) => handleDeleteQuiz(q.id, e)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="fas fa-trash-alt"></i></button>
                       </div>
                     ))}
                     <div className="col-span-full mt-12 mb-6 border-t border-slate-100 pt-12">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] px-4">Synthesized Masterclasses</h4>
                     </div>
                     {savedNotes.map(n => (
                       <div key={n.id} onClick={() => { setOutput(n.content); setNotesTab('create'); }} className="group relative bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-2xl">
                          <h3 className="text-xl font-black text-slate-900 mb-2 uppercase leading-tight line-clamp-2">{n.title}</h3>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(n.timestamp).toLocaleDateString()}</span>
                          <button onClick={(e) => handleDeleteNote(n.id, e)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="fas fa-trash-alt"></i></button>
                       </div>
                     ))}
                   </>
                 )}
                 {mode === 'STUDIO' && savedMaps.map(m => (
                   <div key={m.id} onClick={() => { setMindMapData(m); setStudioTab('map'); }} className="group relative bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-2xl">
                      <h3 className="text-xl font-black text-slate-900 mb-2 uppercase leading-tight line-clamp-2">{m.title}</h3>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(m.timestamp || 0).toLocaleDateString()}</span>
                      <button onClick={(e) => handleDeleteMap(m.id || '', e)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="fas fa-trash-alt"></i></button>
                   </div>
                 ))}
              </div>
            ) : output || mindMapData || diagramUrl ? (
              <div className="animate-fade-up">
                {mode === 'NOTES' && (
                  <div className="prose prose-slate prose-lg max-w-none bg-white p-10 md:p-20 rounded-[4rem] shadow-2xl border border-slate-50 selection:bg-indigo-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{output}</ReactMarkdown>
                  </div>
                )}
                {mode === 'STUDIO' && studioTab === 'map' && mindMapData && <WorkflowRenderer data={mindMapData} onDataChange={handleManualSave} />}
                {mode === 'STUDIO' && studioTab === 'diagram' && diagramUrl && <div className="p-6 bg-white rounded-[4rem] shadow-2xl border-8 border-slate-50 w-full overflow-hidden"><img src={diagramUrl} className="rounded-[3rem] w-full h-auto" /></div>}
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-200 gap-8 bg-white border-4 border-dashed border-slate-50 rounded-[5rem]">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center shadow-inner"><i className={`fas ${notesTab === 'quiz' ? 'fa-bolt' : 'fa-drafting-compass'} text-4xl opacity-20`}></i></div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-300">{notesTab === 'quiz' ? 'Declare topic for AI Quiz Rush' : 'Initialize Architecture Protocol'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{notesTab === 'quiz' ? 'Or paste valid Quiz Protocol JSON' : 'Upload notes or declare a topic to begin'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyStudio;
