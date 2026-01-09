
import React from 'react';
import { AppMode } from '../types';
import { ICONS } from '../constants';
import { useAuth } from '../context/AuthContext';

interface HomeViewProps {
  onSelectMode: (mode: AppMode) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onSelectMode }) => {
  const { user } = useAuth();
  
  const tools = [
    {
      mode: AppMode.CHAT,
      title: 'Architect Chat',
      desc: 'Advanced reasoning engine for solving complex problems and synthesizing visual assets.',
      icon: ICONS.Chat,
      color: 'from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-200'
    },
    {
      mode: AppMode.LIVE,
      title: 'Voice Protocol',
      desc: 'Real-time pedagogical conversation. Talk through chapters and clarify doubts instantly.',
      icon: ICONS.Live,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-200'
    },
    {
      mode: AppMode.NOTES,
      title: 'Note Synthesis',
      desc: 'Transform broad topics into structured, high-depth study mastery documents.',
      icon: ICONS.Notes,
      color: 'from-purple-500 to-violet-600',
      shadow: 'shadow-purple-200'
    },
    {
      mode: AppMode.STUDIO,
      title: 'Visual Studio',
      desc: 'Construct logical n8n-style mind maps and professional educational diagrams.',
      icon: ICONS.Map,
      color: 'from-blue-500 to-sky-600',
      shadow: 'shadow-blue-200'
    }
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 space-y-12 md:space-y-20">
        <header className="space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest">Core Command Center</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-display text-slate-900 tracking-tight leading-tight">
            Welcome, <span className="text-indigo-600">{user?.displayName?.split(' ')[0] || (user?.isAnonymous ? 'Guest Scholar' : 'Scholar')}</span>.
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl">
            Select an architectural module to begin your academic synthesis. Your progress is {user?.isAnonymous ? 'ephemeral (Guest Mode)' : 'synced to the cloud'}.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-24">
          {tools.map((tool) => (
            <button
              key={tool.mode}
              onClick={() => onSelectMode(tool.mode)}
              className="group relative flex flex-col items-start p-8 md:p-10 bg-white border border-slate-100 rounded-[2.5rem] text-left hover:border-indigo-500 hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white mb-8 shadow-xl ${tool.shadow} group-hover:scale-110 transition-transform duration-500`}>
                <tool.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display">{tool.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium mb-8">
                {tool.desc}
              </p>
              <div className="mt-auto flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                Initialize Module
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
              
              {/* Background Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 blur-3xl transition-opacity`}></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeView;
