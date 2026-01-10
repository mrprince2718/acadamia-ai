
import React, { useState, useRef, useEffect, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppSettingsContext } from '../App';
import { db } from '../services/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

const LiveSession: React.FC = () => {
  const { user } = useAuth();
  const { language } = useContext(AppSettingsContext);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [history, setHistory] = useState<{ text: string; isUser: boolean }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const isThinkingRef = useRef(false);
  const isLiveRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const PI_BACKEND = 'https://backend.buildpicoapps.com/aero/run/llm-api?pk=v1-Z0FBQUFBQnBYNnRiSENveE01LXZyUW9YV0pLWmtHVnF2Q1lKSm9xWGVrNDg1dVVuck8xWDkyaGJQVUFuWE5TWFBSZmk4TWFZSlNRTkd5TnhFRUhwZEd3UEhPT1VrS05WV0E9PQ==';

  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; 
      recognition.interimResults = false;
      recognition.lang = language === 'GU' ? 'gu-IN' : 'en-US';

      recognition.onstart = () => setStatus('listening');
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          handleInput(transcript);
        }
      };
      recognition.onend = () => {
        if (isLiveRef.current && !isThinkingRef.current && !synthesisRef.current.speaking) {
          setTimeout(() => {
            if (isLiveRef.current) try { recognition.start(); } catch(e) {}
          }, 300);
        }
      };
      recognitionRef.current = recognition;
    }

    return () => {
      stopLive();
    };
  }, [language]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const startLive = () => {
    setIsLive(true);
    synthesisRef.current.cancel();
    try { recognitionRef.current?.start(); } catch(e) { setStatus('listening'); }
  };

  const stopLive = () => {
    setIsLive(false);
    isThinkingRef.current = false;
    try { recognitionRef.current?.stop(); } catch(e) {}
    synthesisRef.current.cancel();
    setStatus('idle');
  };

  const addLog = async (text: string, isUser: boolean) => {
    const newEntry = { text, isUser, timestamp: Date.now() };
    setHistory(prev => [...prev, { text, isUser }]);

    if (user && !user.isAnonymous) {
      try {
        const logId = Date.now().toString();
        await setDoc(doc(db, `users/${user.uid}/voice_history`, logId), newEntry);
      } catch (err) {
        console.error("Firebase Sync Error:", err);
      }
    }
  };

  const handleInput = async (query: string) => {
    if (isThinkingRef.current) return;
    isThinkingRef.current = true;
    setStatus('thinking');
    addLog(query, true);

    const prompt = `You are Vidhya, a brilliant AI Tutor. 
    User says: "${query}"
    Response Language: ${language === 'GU' ? 'GUJARATI' : 'ENGLISH'}.
    Task: Explain deeply and accurately. Tone: Sweet, soft, nurturing, helpful. Keep it concise for voice.`;

    try {
      const res = await fetch(PI_BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      isThinkingRef.current = false;
      if (data.status === 'success') {
        addLog(data.text, false);
        speak(data.text);
      } else {
        setStatus('idle');
        if (isLiveRef.current) recognitionRef.current?.start();
      }
    } catch (e) {
      isThinkingRef.current = false;
      setStatus('idle');
      if (isLiveRef.current) recognitionRef.current?.start();
    }
  };

  const speak = (text: string) => {
    synthesisRef.current.cancel();
    setStatus('speaking');
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language === 'GU' ? 'gu-IN' : 'en-US';
    utter.pitch = 1.1; 
    utter.rate = 1.0;

    utter.onend = () => {
      setStatus('idle');
      if (isLiveRef.current) {
        setTimeout(() => { 
          if (isLiveRef.current && !isThinkingRef.current) {
            try { recognitionRef.current?.start(); } catch(e) {} 
          }
        }, 300);
      }
    };
    synthesisRef.current.speak(utter);
  };

  const getStatusText = () => {
    switch(status) {
      case 'listening': return language === 'GU' ? "વિદ્યા સાંભળી રહી છે..." : "Vidhya is Listening...";
      case 'thinking': return language === 'GU' ? "વિદ્યા વિચારી રહી છે..." : "Vidhya is Thinking...";
      case 'speaking': return language === 'GU' ? "વિદ્યા બોલી રહી છે..." : "Vidhya is Speaking...";
      default: return language === 'GU' ? "શરૂ કરવા માટે ક્લિક કરો" : "Tap Orb to Start Chat";
    }
  };

  const getStatusIcon = () => {
    switch(status) {
      case 'listening': return "fa-wave-square";
      case 'thinking': return "fa-brain";
      case 'speaking': return "fa-volume-up";
      default: return "fa-microphone";
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white relative overflow-hidden p-6 pb-32">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="z-10 flex flex-col items-center max-w-xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black font-display bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Vidhya AI Live</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Hybrid Linguistic Link | JEE/NEET Specialist</p>
        </div>

        <div 
          onClick={isLive ? stopLive : startLive}
          className={`
            relative w-48 h-48 md:w-64 md:h-64 cursor-pointer transition-transform duration-300 active:scale-95 group
            ${status === 'listening' ? 'vidhya-state-listening' : ''}
            ${status === 'thinking' ? 'vidhya-state-thinking' : ''}
            ${status === 'speaking' ? 'vidhya-state-speaking' : ''}
          `}
        >
          <div className={`absolute -inset-4 border-2 border-indigo-100 rounded-full ${isLive ? 'animate-[vidhya-pulse-ring_3s_infinite]' : ''}`}></div>
          <div className={`
            absolute inset-0 rounded-full transition-all duration-700 shadow-2xl
            ${status === 'idle' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-200' : ''}
            ${status === 'listening' ? 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-200 animate-[vidhya-wave_1.5s_infinite_ease-in-out]' : ''}
            ${status === 'thinking' ? 'bg-gradient-to-br from-indigo-600 to-blue-600 border-4 border-dashed border-white/30 animate-spin' : ''}
            ${status === 'speaking' ? 'bg-gradient-to-br from-purple-500 to-indigo-500 shadow-purple-300 animate-[vidhya-speak-pulse_0.5s_infinite_alternate]' : ''}
          `}></div>
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <i className={`fas ${getStatusIcon()} text-white text-4xl md:text-5xl opacity-90`}></i>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">{getStatusText()}</p>
        </div>

        <div className="mt-10 flex gap-4">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-50 border border-slate-100 rounded-full text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm"
          >
            <i className="fas fa-history"></i> Transcript
          </button>
          {isLive && (
            <button 
              onClick={stopLive}
              className="px-8 py-3 bg-rose-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-600 transition-colors"
            >
              Terminate
            </button>
          )}
        </div>

        {showHistory && (
          <div className="mt-8 w-full bg-slate-900/95 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 max-h-[200px] overflow-y-auto custom-scrollbar shadow-2xl animate-fade-up">
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-slate-500 text-center text-xs font-medium italic">Transcript manifested here...</p>
              ) : (
                history.map((entry, idx) => (
                  <div key={idx} className={`text-xs leading-relaxed ${entry.isUser ? 'text-indigo-400 font-bold' : 'text-slate-300 font-medium'}`}>
                    <span className="uppercase text-[9px] opacity-50 mr-2">{entry.isUser ? 'Student:' : 'Vidhya:'}</span>
                    {entry.text}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes vidhya-pulse-ring { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.4); opacity: 0; } }
        @keyframes vidhya-wave { 0%, 100% { border-radius: 50%; transform: scale(1); } 50% { border-radius: 45%; transform: scale(1.05); } }
        @keyframes vidhya-speak-pulse { from { transform: scale(1); } to { transform: scale(1.08); } }
      `}</style>
    </div>
  );
};

export default LiveSession;
