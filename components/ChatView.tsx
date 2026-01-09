
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { ICONS } from '../constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

const ChatView: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(true);
  const [useSearch, setUseSearch] = useState(false);
  const [image, setImage] = useState<{ data: string; mimeType: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // PicoApps API Keys & Endpoints (From your provided code)
  const LLM_API_URL = "https://backend.buildpicoapps.com/aero/run/llm-api?pk=v1-Z0FBQUFBQnBYNnRiSENveE01LXZyUW9YV0pLWmtHVnF2Q1lKSm9xWGVrNDg1dVVuck8xWDkyaGJQVUFuWE5TWFBSZmk4TWFZSlNRTkd5TnhFRUhwZEd3UEhPT1VrS05WV0E9PQ==";
  const IMG_API_URL = "https://backend.buildpicoapps.com/aero/run/image-generation-api?pk=v1-Z0FBQUFBQnBYNnRiSENveE01LXZyUW9YV0pLWmtHVnF2Q1lKSm9xWGVrNDg1dVVuck8xWDkyaGJQVUFuWE5TWFBSZmk4TWFZSlNRTkd5TnhFRUhwZEd3UEhPT1VrS05WV0E9PQ==";

  // Sync with Firestore - Only for non-guest users
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const q = query(collection(db, `users/${user.uid}/chats`), orderBy('timestamp', 'asc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => doc.data() as ChatMessage);
      setMessages(msgs);
    });
    return unsubscribe;
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [input]);

  const callPicoAppsAPI = async (apiUrl: string, prompt: string, prependPersona = false) => {
    let finalPrompt = prompt;
    if (prependPersona) {
      finalPrompt = "Follow instructions precisely! If the user asks to generate, create or make an image, photo, or picture by describing it, You will reply with '/image' + description. Otherwise, You will respond normally. Avoid additional explanations." + prompt;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: finalPrompt })
    });
    return response.json();
  };

  const handleSend = async () => {
    if ((!input.trim() && !image) || isLoading || !user) return;

    const currentInput = input.trim();
    const msgId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: msgId,
      role: 'user',
      text: currentInput,
      timestamp: Date.now(),
    };

    // Save to Firestore ONLY if not guest
    if (!user.isAnonymous) {
      await setDoc(doc(db, `users/${user.uid}/chats`, msgId), userMessage);
    } else {
      // Local only update for guest
      setMessages(prev => [...prev, userMessage]);
    }
    
    setInput('');
    setIsLoading(true);

    try {
      let aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: '',
        timestamp: Date.now(),
      };

      // Check if explicit image request
      if (currentInput.startsWith('/image')) {
        const imageDescription = currentInput.substring(6).trim();
        const imageData = await callPicoAppsAPI(IMG_API_URL, imageDescription);
        if (imageData.status === 'success') {
          aiMessage.imageUrl = imageData.imageUrl;
          aiMessage.text = `Generated visual asset for: ${imageDescription}`;
        } else {
          aiMessage.text = "Visual synthesis failed. Attempting textual recovery...";
        }
      } else {
        // Normal LLM call with persona
        const data = await callPicoAppsAPI(LLM_API_URL, currentInput, true);
        if (data.status === 'success') {
          // Check for LLM triggered image generation
          if (data.text.trim().toLowerCase().startsWith('/image')) {
            const imageDescription = data.text.substring(data.text.toLowerCase().indexOf('/image') + 6).trim();
            const imageData = await callPicoAppsAPI(IMG_API_URL, imageDescription);
            if (imageData.status === 'success') {
              aiMessage.imageUrl = imageData.imageUrl;
              aiMessage.text = `Visual representation synthesized: ${imageDescription}`;
            } else {
              aiMessage.text = data.text; // Fallback to raw text
            }
          } else {
            aiMessage.text = data.text;
          }
        } else {
          aiMessage.text = "Communication link unstable. Synthesis aborted.";
        }
      }

      if (!user.isAnonymous) {
        await setDoc(doc(db, `users/${user.uid}/chats`, aiMessage.id), aiMessage);
      } else {
        setMessages(prev => [...prev, aiMessage]);
      }
      setImage(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Permanently clear this session?")) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <header className="hidden md:flex h-16 border-b border-slate-100 items-center justify-between px-8 bg-white/70 backdrop-blur-2xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900 tracking-tight uppercase">Architect AI Thread</span>
          <div className="px-2 py-0.5 bg-indigo-50 rounded text-[9px] font-black text-indigo-600 border border-indigo-100 uppercase tracking-tighter">Pico-Engine Linked</div>
          {user?.isAnonymous && <div className="px-2 py-0.5 bg-rose-50 rounded text-[9px] font-black text-rose-600 border border-rose-100 uppercase tracking-tighter ml-2">Guest Mode: No Cloud Sync</div>}
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={clearChat} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfcfc]">
        <div className="chat-max-width px-4 md:px-6 py-8 md:py-12 space-y-8">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center pt-12 md:pt-24 text-center space-y-8 animate-fade-up">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
                <ICONS.Brain className="w-10 h-10" />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold font-display text-slate-900 tracking-tight px-4">Architect Mode Active</h1>
              <p className="text-slate-400 text-sm max-w-md mx-auto font-medium">Specialized in reasoning and visual generation. Try typing "/image a neon atom structure".</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="animate-fade-up px-2">
              <div className={`flex gap-3 md:gap-8 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex-1 max-w-[95%] md:max-w-[calc(100%-4rem)] ${msg.role === 'user' ? 'md:max-w-[80%] flex flex-col items-end' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-slate-100/80 backdrop-blur rounded-2xl px-4 md:px-6 py-3 md:py-4 text-slate-800 shadow-sm border border-slate-200/50 text-sm font-medium">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="space-y-4 md:space-y-6">
                      {msg.imageUrl && (
                        <div className="group relative w-full max-w-sm rounded-3xl overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 aspect-square mb-4">
                          <img src={msg.imageUrl} alt="Generated Visualization" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={msg.imageUrl} download="architect-asset.png" className="bg-white text-slate-950 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest">Download Asset</a>
                          </div>
                        </div>
                      )}

                      <div className="prose prose-slate prose-sm md:prose-base max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-40 md:h-32" />
        </div>
      </div>

      <div className="absolute bottom-24 md:bottom-28 left-0 right-0 p-3 md:p-6 pointer-events-none z-50">
        <div className="chat-max-width pointer-events-auto">
          <div className="relative bg-white/90 backdrop-blur-3xl rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-2xl group focus-within:border-indigo-400 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={1}
              placeholder="Query the architect (or use /image)..."
              className="w-full pl-12 md:pl-14 pr-16 md:pr-32 py-4 md:py-5 focus:outline-none text-slate-800 text-sm md:text-lg bg-transparent placeholder:text-slate-400"
              style={{ minHeight: '56px' }}
            />
            
            <div className="absolute left-3 md:left-4 bottom-3 md:bottom-4">
              <button 
                onClick={() => {
                  if (!input.startsWith('/image ')) setInput('/image ' + input);
                }}
                className="p-2 text-slate-400 hover:text-indigo-600"
                title="Synthesize Visualization"
              >
                <ICONS.Visuals className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="absolute right-3 md:right-4 bottom-3 md:bottom-4 flex items-center gap-2">
              <button onClick={handleSend} disabled={isLoading || (!input.trim() && !image)} className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 text-white rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-indigo-600 disabled:opacity-20 shadow-xl transition-all">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ICONS.Send className="w-5 h-5 md:w-6 md:h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
