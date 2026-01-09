
import React, { useState, useRef, useEffect } from 'react';
import { getGeminiClient, decodeBase64, decodeAudioData, encodeAudio, ensureApiKey } from '../services/geminiService';
import { ICONS } from '../constants';
import { Modality, LiveServerMessage } from '@google/genai';

const VOICES = [
  { id: 'Zephyr', name: 'Zephyr', desc: 'Neutral & Balanced' },
  { id: 'Puck', name: 'Puck', desc: 'Energetic & Bright' },
  { id: 'Charon', name: 'Charon', desc: 'Calm & Steady' },
  { id: 'Kore', name: 'Kore', desc: 'Professional & Clear' },
];

const LiveSession: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [transcription, setTranscription] = useState('');
  
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopSession = () => {
    setIsActive(false);
    setStatus('idle');
    setVolume(0);
    setTranscription('');
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const updateVisualizer = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setVolume(average);
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      setError(null);
      await ensureApiKey();
      const ai = getGeminiClient();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            source.connect(analyser); 
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = encodeAudio(inputData);
              sessionPromise.then(session => { session.sendRealtimeInput({ media: { data: pcmData, mimeType: 'audio/pcm;rate=16000' } }); });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setStatus('listening');
            setIsActive(true);
            updateVisualizer();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              setStatus('speaking');
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const bytes = decodeBase64(part.inlineData.data);
                  const buffer = await decodeAudioData(bytes, outputCtx, 24000, 1);
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                  const source = outputCtx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(outputCtx.destination);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                  source.onended = () => { sourcesRef.current.delete(source); if (sourcesRef.current.size === 0) setStatus('listening'); };
                }
              }
            }
            if (message.serverContent?.outputTranscription) { setTranscription(prev => (prev + ' ' + message.serverContent!.outputTranscription!.text).slice(-150)); }
            if (message.serverContent?.interrupted) { sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} }); sourcesRef.current.clear(); nextStartTimeRef.current = 0; setStatus('listening'); }
          },
          onerror: () => { setError("Link unstable. Re-syncing..."); stopSession(); },
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice.id as any } } },
          systemInstruction: "Academia Architect Voice Core. JEE/NEET Expert. Precise and pedagogical."
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { setError("Microphone access required."); setStatus('idle'); }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      <header className="hidden md:flex h-16 border-b border-slate-100 items-center justify-between px-8 bg-white/70 backdrop-blur-2xl sticky top-0 z-40">
        <span className="text-sm font-black text-slate-900 uppercase">Voice Protocol</span>
        <div className="flex bg-slate-100 p-1 rounded-xl border">
          {VOICES.map(v => (
            <button key={v.id} onClick={() => setSelectedVoice(v)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${selectedVoice.id === v.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{v.name}</button>
          ))}
        </div>
      </header>

      {/* Mobile-only settings */}
      <div className="md:hidden flex gap-1 px-4 py-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
        {VOICES.map(v => (
          <button key={v.id} onClick={() => setSelectedVoice(v)} className={`shrink-0 px-3 py-1 rounded-md text-[9px] font-black uppercase ${selectedVoice.id === v.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{v.name}</button>
        ))}
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10 overflow-hidden">
        <div className="flex flex-col items-center text-center space-y-8 md:space-y-12 w-full max-w-2xl">
          <div className="relative group cursor-pointer" onClick={!isActive ? startSession : undefined}>
            <div className={`w-56 h-56 md:w-72 md:h-72 rounded-full flex items-center justify-center transition-all duration-1000 relative ${isActive ? 'bg-slate-950 scale-105 shadow-[0_40px_100px_rgba(79,70,229,0.3)]' : 'bg-white shadow-2xl border'}`}>
              {isActive && (
                <div className="absolute inset-0 rounded-full overflow-hidden opacity-20">
                  <div className="absolute inset-4 rounded-full bg-indigo-500 blur-2xl animate-pulse" style={{ transform: `scale(${1 + (volume / 300)})` }}></div>
                </div>
              )}
              {!isActive ? (
                <div className="flex flex-col items-center gap-2">
                  <ICONS.Mic className="w-8 h-8 md:w-10 md:h-10 text-slate-300" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Connect</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 h-16 w-32">
                   {[...Array(10)].map((_, i) => (
                     <div key={i} className="w-1.5 bg-indigo-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(15, (volume / 255) * 100 * (0.5 + Math.random() * 0.5))}%` }}></div>
                   ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 w-full">
            <h2 className="text-2xl md:text-4xl font-bold font-display text-slate-900 tracking-tight">
              {status === 'idle' ? 'Ready to Sync' : status === 'listening' ? 'Listening...' : status === 'speaking' ? 'Speaking' : 'Connecting...'}
            </h2>
            {isActive && transcription && (
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border max-h-24 overflow-hidden"><p className="text-slate-600 text-sm italic font-medium">"{transcription}..."</p></div>
            )}
            {error && <div className="text-red-500 text-xs font-bold animate-pulse">{error}</div>}
          </div>

          <div className="flex gap-4 pt-2">
            {!isActive ? (
              <button onClick={startSession} className="bg-slate-950 text-white px-10 py-4 rounded-full font-bold shadow-xl text-sm flex items-center gap-2 transition-transform active:scale-95"><ICONS.Live className="w-5 h-5" /> Start Link</button>
            ) : (
              <button onClick={stopSession} className="bg-white text-red-600 px-10 py-4 rounded-full font-bold shadow-xl text-sm border border-red-100 transition-transform active:scale-95">Terminate</button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveSession;
