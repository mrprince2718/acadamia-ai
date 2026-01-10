
import React, { useState, useEffect, useRef, useContext } from 'react';
import { askTutor, generateMindMap, generateStudyVisual, generateQuiz } from '../services/geminiService';
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

const QuizRushView: React.FC<{ 
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
  }, [currentIndex]);

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
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Synthesis Mastery: {Math.round((score / quiz.questions.length) * 100)}%</p>
        <div className="text-6xl font-black text-indigo-600 mb-10">{score} / {quiz.questions.length}</div>
        <button onClick={onClose} className="px-12 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">De-initialize View</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-up">
      <div className="flex items-center justify-between px-6">
         <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Question {currentIndex + 1} / {quiz.questions.length}</span>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-tighter truncate max-w-[200px]">{quiz.title}</h3>
         </div>
         <button onClick={onClose} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times"></i></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
            <h4 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
               <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ.question}</ReactMarkdown>
            </h4>
          </div>

          <div className="space-y-3">
            {currentQ.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleOptionClick(i)}
                className={`
                  w-full text-left p-5 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-between
                  ${isAnswered 
                    ? (i === currentQ.correctAnswerIndex ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : (i === selectedOption ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-400'))
                    : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-400 hover:shadow-lg shadow-sm'
                  }
                `}
              >
                <span>{opt}</span>
                {isAnswered && i === currentQ.correctAnswerIndex && <i className="fas fa-check-circle"></i>}
                {isAnswered && i === selectedOption && i !== currentQ.correctAnswerIndex && <i className="fas fa-times-circle"></i>}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {diagUrl ? (
            <div className="bg-white p-4 rounded-[3rem] shadow-2xl border border-slate-100 animate-fade-up">
              <img src={diagUrl} className="w-full rounded-[2.5rem] border border-slate-50 shadow-inner" alt="Diagram" />
              <p className="text-center text-[9px] font-black text-slate-400 mt-4 uppercase tracking-[0.2em]">Scientific Visual Aid Rendered</p>
            </div>
          ) : isDiagLoading ? (
            <div className="aspect-square bg-slate-50 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center gap-4">
               <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Rendering Logic Aid...</p>
            </div>
          ) : null}

          {isAnswered && (
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl animate-fade-up">
               <div className="flex items-center gap-2 mb-3">
                  <i className="fas fa-lightbulb text-indigo-200"></i>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Academic Explanation</span>
               </div>
               <div className="text-xs font-medium leading-relaxed opacity-95">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ.explanation}</ReactMarkdown>
               </div>
               <button onClick={nextQuestion} className="mt-8 w-full py-4 bg-white text-indigo-600 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">
                  Next Step <i className="fas fa-arrow-right ml-2"></i>
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
  const [isLinking, setIsLinking] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const currentPage = data.pages[currentPageIndex] || data.pages[0];

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: window.innerWidth < 768 ? 0.8 : 1 });
  }, [currentPageIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mindmap-node')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.mindmap-node')) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - transform.x, y: touch.clientY - transform.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setTransform(prev => ({
      ...prev,
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y
    }));
  };

  const getPos = (id: string, nodesOnPage: MindMapNode[]) => {
    const node = nodesOnPage.find(n => n.id === id);
    if (!node) return { x: 500, y: 500 };
    
    if (node.x !== undefined && node.y !== undefined) return { x: node.x, y: node.y };

    if (node.type === 'topic') return { x: 500, y: 150 };
    const others = nodesOnPage.filter(n => n.type !== 'topic');
    const idx = others.indexOf(node);
    const total = others.length;
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
    const radiusX = 350;
    const radiusY = 300;
    return { x: 500 + radiusX * Math.cos(angle), y: 550 + radiusY * Math.sin(angle) };
  };

  const addNewNode = () => {
    const newNode: MindMapNode = {
      id: Date.now().toString(),
      label: "NEW AXIOM",
      type: 'subtopic',
      content: "Define logic here...",
      x: 500 - transform.x,
      y: 500 - transform.y
    };
    
    const updatedPages = data.pages.map((p, idx) => 
      idx === currentPageIndex ? { ...p, nodes: [...p.nodes, newNode] } : p
    );
    onDataChange({ ...data, pages: updatedPages });
    setActiveNode(newNode.id);
  };

  const handleNodeAction = (id: string) => {
    if (isLinking) {
      if (!linkSource) {
        setLinkSource(id);
      } else if (linkSource !== id) {
        const updatedPages = data.pages.map((p, idx) => 
          idx === currentPageIndex ? { 
            ...p, 
            edges: [...p.edges, { from: linkSource, to: id, label: "" }] 
          } : p
        );
        onDataChange({ ...data, pages: updatedPages });
        setIsLinking(false);
        setLinkSource(null);
      }
    } else {
      setActiveNode(activeNode === id ? null : id);
    }
  };

  const updateNode = (id: string, updates: Partial<MindMapNode>) => {
    const updatedPages = data.pages.map((p, idx) => 
      idx === currentPageIndex ? {
        ...p,
        nodes: p.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
      } : p
    );
    onDataChange({ ...data, pages: updatedPages });
  };

  const deleteNode = (id: string) => {
    const updatedPages = data.pages.map((p, idx) => 
      idx === currentPageIndex ? {
        ...p,
        nodes: p.nodes.filter(n => n.id !== id),
        edges: p.edges.filter(e => e.from !== id && e.to !== id)
      } : p
    );
    onDataChange({ ...data, pages: updatedPages });
    setActiveNode(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-4 md:px-8 py-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-black text-slate-900 font-display tracking-tight">{data.title}</h3>
          <p className="text-[11px] text-indigo-500 font-black uppercase tracking-widest mt-1">Stage {currentPageIndex + 1}: {currentPage?.summary}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {data.pages.map((p, idx) => (
              <button 
                key={idx} 
                onClick={() => setCurrentPageIndex(idx)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                  currentPageIndex === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          {isEditable && (
            <button onClick={addNewNode} className="w-10 h-10 bg-slate-950 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 shadow-lg">
              <i className="fas fa-plus"></i>
            </button>
          )}
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative w-full h-[600px] md:h-[800px] bg-slate-50/50 rounded-[2.5rem] md:rounded-[4rem] border-2 border-slate-100 shadow-inner overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        <div className="absolute inset-[-2000px] opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '50px 50px', transform: `translate(${transform.x % 50}px, ${transform.y % 50}px)` }}></div>
        
        <div className="absolute inset-0 transition-transform duration-75 ease-out origin-center" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
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
              const isSrc = linkSource === node.id;
              const isTopic = node.type === 'topic';
              
              return (
                <div key={node.id} 
                  onClick={(e) => { e.stopPropagation(); handleNodeAction(node.id); }}
                  className={`mindmap-node absolute p-4 md:p-6 rounded-[1.8rem] md:rounded-[2.2rem] shadow-2xl border-2 transition-all duration-500 cursor-pointer ${isActive ? 'w-[320px] md:w-[450px] z-50 scale-110 ring-4 ring-indigo-100' : 'w-48 md:w-60 z-20 hover:scale-105'} ${isSrc ? 'ring-4 ring-rose-400' : ''} ${isTopic ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white border-slate-100 text-slate-800'} transform -translate-x-1/2 -translate-y-1/2`} 
                  style={{ left: pos.x, top: pos.y }}>
                  
                  {isEditable && isActive ? (
                    <div className="space-y-4">
                      <input 
                        className={`w-full bg-transparent border-b focus:outline-none font-black uppercase text-xs p-1 ${isTopic ? 'border-white/30 text-white placeholder:text-white/40' : 'border-slate-200 text-slate-900 placeholder:text-slate-400'}`} 
                        value={node.label}
                        placeholder="Node Title..."
                        onChange={(e) => updateNode(node.id, { label: e.target.value })}
                        onClick={e => e.stopPropagation()}
                      />
                      <textarea 
                        className={`w-full rounded-xl p-3 text-xs focus:outline-none min-h-[120px] shadow-inner ${isTopic ? 'bg-black/10 text-indigo-50 placeholder:text-indigo-200/50' : 'bg-slate-50 text-slate-700 placeholder:text-slate-400 border border-slate-100'}`}
                        value={node.content}
                        placeholder="Enter logical description..."
                        onChange={(e) => updateNode(node.id, { content: e.target.value })}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex justify-between items-center px-1">
                         <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-600 transition-colors">Delete Node</button>
                         <button onClick={(e) => { e.stopPropagation(); setActiveNode(null); }} className={`text-[10px] font-black uppercase transition-colors ${isTopic ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Done</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-sm md:text-lg ${isTopic ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                          {node.type === 'tip' ? '💡' : node.type === 'mistake' ? '⚠️' : node.type === 'formula' ? '∑' : '◈'}
                        </div>
                        <h4 className={`text-xs md:text-sm font-black uppercase tracking-tight leading-tight ${isTopic ? 'text-white' : 'text-slate-900'}`}>{node.label}</h4>
                      </div>
                      <div className={`prose prose-sm prose-invert max-w-none transition-all duration-300 ${isActive ? 'max-h-[400px] opacity-100 mt-4' : 'max-h-[40px] opacity-40 overflow-hidden text-[10px]'} ${isTopic ? 'text-indigo-50' : 'text-slate-500'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{node.content}</ReactMarkdown>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute top-8 left-8 flex flex-col gap-3 z-[60]">
          {isEditable && (
            <>
              <button onClick={() => setIsLinking(!isLinking)} className={`w-12 h-12 shadow-lg rounded-2xl flex items-center justify-center transition-all ${isLinking ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-600 border border-slate-100'}`}>
                <i className="fas fa-link"></i>
              </button>
              <div className="px-3 py-1 bg-white/70 backdrop-blur-md rounded-lg border border-slate-100 text-[9px] font-black uppercase tracking-tighter text-slate-500 shadow-sm">
                {isLinking ? "Select Link End" : "ARCHITECT TOOLS"}
              </div>
            </>
          )}
        </div>

        <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-[60]">
          <button onClick={() => setTransform(t => ({ ...t, scale: Math.min(t.scale + 0.1, 2) }))} className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-600 hover:text-indigo-600 border border-slate-100"><i className="fas fa-plus"></i></button>
          <button onClick={() => setTransform(t => ({ ...t, scale: Math.max(t.scale - 0.1, 0.4) }))} className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-600 hover:text-indigo-600 border border-slate-100"><i className="fas fa-minus"></i></button>
          <button onClick={() => setTransform({ x: 0, y: 0, scale: window.innerWidth < 768 ? 0.8 : 1 })} className="w-10 h-10 bg-indigo-600 shadow-lg rounded-full flex items-center justify-center text-white border border-indigo-500"><i className="fas fa-compress-arrows-alt"></i></button>
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
      const maps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MindMapData));
      setSavedMaps(maps);
    });

    // Sync Notes
    const qNotes = query(collection(db, `users/${user.uid}/notes`), orderBy('timestamp', 'desc'));
    const unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedNote));
      setSavedNotes(notes);
    });

    // Sync Quizzes
    const qQuizzes = query(collection(db, `users/${user.uid}/quizzes`), orderBy('timestamp', 'desc'));
    const unsubscribeQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizData));
      setSavedQuizzes(quizzes);
    });

    return () => {
      unsubscribeMaps();
      unsubscribeNotes();
      unsubscribeQuizzes();
    };
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          const newFile: AttachedFile = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            type: file.type,
            data: base64,
            preview: file.type.startsWith('image/') ? (event.target?.result as string) : undefined,
            size: file.size
          };
          setAttachedFiles(prev => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSynthesize = async () => {
    if (!input.trim() && attachedFiles.length === 0 || isLoading) return;
    setIsLoading(true);
    try {
      if (mode === 'NOTES') {
        if (notesTab === 'quiz') {
          // Check if input is pasted JSON or needs generation
          let data: QuizData;
          if (input.trim().startsWith('{')) {
             data = JSON.parse(input);
          } else {
             data = await generateQuiz(input || "General Mastery", language);
          }
          if (user && !user.isAnonymous) await setDoc(doc(db, `users/${user.uid}/quizzes`, data.id), data);
          setQuizData(data);
          setInput('');
        } else {
          const mediaParts = attachedFiles.map(f => ({ data: f.data, mimeType: f.type }));
          const promptText = attachedFiles.length > 0 
            ? `TRANSCRIPTION AND DEEP ANALYSIS: 
               Analyze the attached handwritten notes, textbook photos, or PDF documents. 
               1. Transcribe any handwritten text precisely. 
               2. Synthesize a high-level academic chapter based on these materials. 
               3. Correct any factual errors or omissions found in the provided notes. 
               ${input ? `Focus instructions: ${input}` : ''}`
            : `Language: ${language}. Topic: ${input}`;
            
          const response = await askTutor({ 
            prompt: promptText, 
            useThinking: true,
            mediaParts
          });
          
          setOutput(response.text);
          
          if (user && !user.isAnonymous) {
            const noteId = Date.now().toString();
            const newNote: SavedNote = {
              id: noteId,
              title: input.trim().substring(0, 50) || (attachedFiles.length > 0 ? attachedFiles[0].name : "Synthesized Insight"),
              content: response.text,
              timestamp: Date.now()
            };
            await setDoc(doc(db, `users/${user.uid}/notes`, noteId), newNote);
          }

          setAttachedFiles([]);
        }
      } else if (studioTab === 'map') {
        const data = await generateMindMap(`${language === 'GU' ? 'Language: Gujarati. ' : ''}${input}`);
        const mapId = Date.now().toString();
        const persistentData = { ...data, id: mapId, timestamp: Date.now() };
        if (user && !user.isAnonymous) await setDoc(doc(db, `users/${user.uid}/mindmaps`, mapId), persistentData);
        setMindMapData(persistentData);
      } else if (studioTab === 'create') {
        const mapId = Date.now().toString();
        const emptyMap: MindMapData = {
          id: mapId,
          title: input || "New Logical Protocol",
          timestamp: Date.now(),
          pages: [{
            page: 1,
            summary: "Manual Logic Synthesis",
            nodes: [{ id: "root", label: input || "CORE CONCEPT", type: 'topic', content: "Initial logic point.", x: 500, y: 150 }],
            edges: []
          }]
        };
        if (user && !user.isAnonymous) await setDoc(doc(db, `users/${user.uid}/mindmaps`, mapId), emptyMap);
        setMindMapData(emptyMap);
        setStudioTab('map');
      } else {
        const url = await generateStudyVisual(input, '16:9');
        setDiagramUrl(url);
      }
    } catch (err: any) { 
      setOutput(`Synthesis Interrupted: ${err.message}`); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleManualSave = async (updatedData: MindMapData) => {
    setMindMapData(updatedData);
    if (user && !user.isAnonymous && updatedData.id) {
      await setDoc(doc(db, `users/${user.uid}/mindmaps`, updatedData.id), updatedData);
    }
  };

  const handleDeleteMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !id) return;
    if (window.confirm("Confirm deletion of this logic structure?")) {
      await deleteDoc(doc(db, `users/${user.uid}/mindmaps`, id));
      if (mindMapData?.id === id) setMindMapData(null);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !id) return;
    if (window.confirm("Confirm deletion of this archive?")) {
      await deleteDoc(doc(db, `users/${user.uid}/notes`, id));
      if (output === savedNotes.find(n => n.id === id)?.content) setOutput('');
    }
  };

  const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !id) return;
    if (window.confirm("Terminate this quiz protocol?")) {
      await deleteDoc(doc(db, `users/${user.uid}/quizzes`, id));
      if (quizData?.id === id) setQuizData(null);
    }
  };

  const loadNote = (note: SavedNote) => {
    setOutput(note.content);
    setNotesTab('create');
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <header className="hidden md:flex h-16 border-b border-slate-100 items-center justify-between px-8 bg-white/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white"><ICONS.Notes className="w-6 h-6" /></div>
          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{mode === 'NOTES' ? 'Note Architect & Quiz Rush' : 'Visual Synthesis Studio'}</span>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'STUDIO' ? (
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button onClick={() => setStudioTab('map')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioTab === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Map</button>
              <button onClick={() => setStudioTab('create')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioTab === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Editor</button>
              <button onClick={() => setStudioTab('diagram')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioTab === 'diagram' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Blueprint</button>
              <button onClick={() => setStudioTab('library')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioTab === 'library' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Library</button>
            </div>
          ) : (
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button onClick={() => setNotesTab('create')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notesTab === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Notes</button>
              <button onClick={() => setNotesTab('quiz')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notesTab === 'quiz' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Quiz Rush</button>
              <button onClick={() => setNotesTab('library')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notesTab === 'library' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Archives</button>
            </div>
          )}
        </div>
      </header>

      <div className="md:hidden flex flex-col gap-3 px-4 py-4 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mode === 'NOTES' ? 'Synthesis Engine' : 'Visual Engine'}</span>
          <div className="flex bg-slate-200 p-1 rounded-lg">
            {mode === 'STUDIO' ? (
              <>
                <button onClick={() => setStudioTab('map')} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${studioTab === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>AI</button>
                <button onClick={() => setStudioTab('create')} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${studioTab === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Edit</button>
                <button onClick={() => setStudioTab('diagram')} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${studioTab === 'diagram' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Draft</button>
                <button onClick={() => setStudioTab('library')} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${studioTab === 'library' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Lib</button>
              </>
            ) : (
              <>
                <button onClick={() => setNotesTab('create')} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${notesTab === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Notes</button>
                <button onClick={() => setNotesTab('quiz')} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${notesTab === 'quiz' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Quiz</button>
                <button onClick={() => setNotesTab('library')} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${notesTab === 'library' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Lib</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fafafa] pb-32">
        <div className="chat-max-width px-4 md:px-12 py-8 md:py-16 space-y-12">
          {((mode === 'STUDIO' && studioTab !== 'library') || (mode === 'NOTES' && notesTab !== 'library' && !quizData)) && (
            <div className="space-y-6">
              <h1 className="text-3xl md:text-5xl font-black font-display text-slate-900 tracking-tight leading-tight animate-fade-up">
                {mode === 'NOTES' 
                  ? (notesTab === 'quiz' ? 'Quiz Rush Protocol' : 'Note Architecture & Analysis') 
                  : studioTab === 'map' ? 'AI Knowledge Logic' : studioTab === 'create' ? 'Architect Custom Logic' : 'Render High-Depth Blueprint'}
              </h1>
              
              <div className="space-y-4">
                <div className="relative group bg-white border-2 border-slate-100 rounded-[2rem] md:rounded-[3rem] shadow-2xl p-2 md:p-3 transition-all focus-within:border-indigo-400 focus-within:ring-8 focus-within:ring-indigo-50">
                  <div className="flex items-center">
                    {mode === 'NOTES' && notesTab === 'create' && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="ml-4 md:ml-6 p-4 bg-slate-950 rounded-[1.5rem] text-white hover:bg-indigo-600 transition-all shadow-lg flex items-center justify-center gap-3"
                        title="Upload Handwriting or PDFs"
                      >
                        <i className="fas fa-file-upload text-lg md:text-xl"></i>
                      </button>
                    )}
                    <input 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSynthesize()} 
                      placeholder={
                        language === 'GU' 
                          ? (notesTab === 'quiz' ? "વિષય લખો અથવા JSON પેસ્ટ કરો..." : "નોંધો અપલોડ કરો અથવા વિષય લખો...")
                          : (notesTab === 'quiz' ? "Topic or Paste JSON logic..." : "Analyze notes or type topic...")
                      } 
                      className="w-full px-4 md:px-6 py-5 md:py-7 focus:outline-none text-slate-800 text-lg md:text-2xl bg-transparent placeholder:text-slate-300 font-medium" 
                    />
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf" onChange={handleFileUpload} />
                    <button 
                      onClick={handleSynthesize} 
                      disabled={isLoading || (!input.trim() && attachedFiles.length === 0)} 
                      className="absolute right-4 top-4 bottom-4 bg-slate-950 text-white px-8 md:px-14 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-20 transition-all text-xs md:text-base"
                    >
                      {isLoading ? <i className="fas fa-circle-notch animate-spin"></i> : language === 'GU' ? 'શરૂ કરો' : notesTab === 'quiz' ? 'INITIALIZE' : 'Execute'}
                    </button>
                  </div>
                </div>

                {/* Attached Files Workbench */}
                {attachedFiles.length > 0 && notesTab === 'create' && (
                  <div className="flex flex-wrap gap-4 px-4 py-2 animate-fade-up">
                    {attachedFiles.map(file => (
                      <div key={file.id} className="bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-4">
                        {file.preview ? <img src={file.preview} className="w-10 h-10 rounded-xl object-cover" alt="" /> : <i className="fas fa-file-pdf text-rose-500 text-xl px-2"></i>}
                        <span className="text-[11px] font-black text-slate-700 max-w-[120px] truncate uppercase">{file.name}</span>
                        <button onClick={() => removeFile(file.id)} className="text-slate-300 hover:text-rose-500"><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="min-h-[500px] transition-all">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-8 animate-fade-up">
                <div className="relative">
                  <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-brain text-indigo-600 text-2xl animate-pulse"></i></div>
                </div>
                <div className="text-center space-y-3">
                   <p className="font-black text-slate-900 uppercase tracking-[0.3em] text-sm">Synchronizing Logic Streams</p>
                   <p className="text-slate-400 text-xs font-medium italic">Building challenging academic assessment structures...</p>
                </div>
              </div>
            ) : quizData ? (
              <QuizRushView quiz={quizData} onClose={() => setQuizData(null)} />
            ) : (notesTab === 'library' && mode === 'NOTES') || (studioTab === 'library' && mode === 'STUDIO') ? (
              <div className="animate-fade-up grid grid-cols-1 md:grid-cols-2 gap-8">
                {mode === 'STUDIO' ? (
                  savedMaps.map(m => (
                    <div key={m.id} onClick={() => { setMindMapData(m); setStudioTab('map'); }} className="group relative bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-xl overflow-hidden">
                      <div className="pr-12">
                        <h3 className="text-xl font-black text-slate-900 mb-3 leading-tight line-clamp-2 uppercase">{m.title}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{new Date(m.timestamp || 0).toLocaleDateString()}</p>
                      </div>
                      <button onClick={(e) => handleDeleteMap(m.id || '', e)} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-sm"></i></button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full space-y-12">
                    {/* Quizzes List */}
                    <div className="space-y-6">
                       <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] px-4">Archived Quizzes</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {savedQuizzes.length === 0 ? <p className="text-slate-300 text-xs px-4">No quiz protocols saved.</p> : 
                          savedQuizzes.map(q => (
                            <div key={q.id} onClick={() => setQuizData(q)} className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-xl overflow-hidden">
                                <div className="pr-12">
                                  <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight line-clamp-2 uppercase">{q.title}</h3>
                                  <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest">{q.questions.length} Concepts</p>
                                </div>
                                <button onClick={(e) => handleDeleteQuiz(q.id, e)} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-sm"></i></button>
                            </div>
                          ))
                        }
                       </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-6">
                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-4">Document Archives</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {savedNotes.length === 0 ? <p className="text-slate-300 text-xs px-4">No synthesized archives.</p> : 
                          savedNotes.map(n => (
                            <div key={n.id} onClick={() => loadNote(n)} className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-xl overflow-hidden">
                                <div className="pr-12">
                                  <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight line-clamp-2 uppercase">{n.title}</h3>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">{new Date(n.timestamp).toLocaleDateString()}</p>
                                </div>
                                <button onClick={(e) => handleDeleteNote(n.id, e)} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-sm"></i></button>
                            </div>
                          ))
                        }
                       </div>
                    </div>
                  </div>
                )}
              </div>
            ) : output || mindMapData || diagramUrl ? (
              <div className="animate-fade-up">
                {mode === 'NOTES' && (
                  <div className="prose prose-slate prose-lg max-w-none bg-white p-8 md:p-16 rounded-[3rem] shadow-2xl border border-slate-100 selection:bg-indigo-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{output}</ReactMarkdown>
                  </div>
                )}
                {mode === 'STUDIO' && (studioTab === 'map' || studioTab === 'create') && mindMapData && (
                  <WorkflowRenderer data={mindMapData} onDataChange={handleManualSave} isEditable={true} />
                )}
                {mode === 'STUDIO' && studioTab === 'diagram' && diagramUrl && (
                  <div className="p-4 bg-white rounded-[3rem] shadow-2xl border-4 border-slate-50 w-full overflow-hidden">
                    <img src={diagramUrl} alt="Visual Aid" className="rounded-[2.5rem] w-full h-auto" />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-200 space-y-8 bg-white border-4 border-dashed border-slate-50 rounded-[4rem]">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center"><i className={`fas ${notesTab === 'quiz' ? 'fa-bolt' : 'fa-drafting-compass'} text-4xl opacity-20`}></i></div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-300">
                    {notesTab === 'quiz' ? 'Enter Topic for AI Quiz' : 'Initialize Synthesis Protocol'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {notesTab === 'quiz' ? 'Or paste valid Quiz JSON to manually architect a test' : 'Upload notes or declare a topic to begin'}
                  </p>
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
