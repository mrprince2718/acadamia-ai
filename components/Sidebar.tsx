
import React from 'react';
import { AppMode } from '../types';
import { ICONS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebase';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode, isOpen, onClose }) => {
  const { user } = useAuth();
  const navItems = [
    { mode: AppMode.CHAT, label: 'Architect Chat', icon: ICONS.Chat, desc: 'Reasoning Engine' },
    { mode: AppMode.LIVE, label: 'Voice Protocol', icon: ICONS.Live, desc: 'Real-time Audio' },
    { mode: AppMode.NOTES, label: 'Note Synthesis', icon: ICONS.Notes, desc: 'Mastery Documents' },
    { mode: AppMode.STUDIO, label: 'Visual Studio', icon: ICONS.Map, desc: 'Maps & Diagrams' },
  ];

  const handleLogout = () => {
    if (window.confirm("Terminate active session?")) {
      auth.signOut();
    }
  };

  return (
    <nav className={`
      fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#0a0c10] border-r border-white/5 flex flex-col h-full 
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      overflow-y-auto custom-scrollbar
    `}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
                <ICONS.Brain className="w-6 h-6" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0a0c10] rounded-full"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight text-white leading-none mb-1">Academia AI</h1>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Architect v5.0</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-2 text-slate-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Core Modules</p>
          {navItems.map((item) => (
            <button
              key={item.mode}
              onClick={() => setMode(item.mode)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${
                currentMode === item.mode
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${currentMode === item.mode ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold block leading-tight">{item.label}</span>
                <span className="text-[10px] font-medium opacity-50 block leading-tight mt-1">{item.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-auto p-6 space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-2">
            <ICONS.Bolt className="w-3.5 h-3.5 text-indigo-400" />
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Cloud Sync</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
            Status: <span className="text-emerald-400">Authenticated</span>
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 px-3 py-3 text-slate-400 border-t border-white/5 pt-6">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden">
              {user?.photoURL ? <img src={user.photoURL} alt="" /> : (user?.displayName?.[0] || user?.email?.[0] || 'A')}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold block leading-none text-slate-200 truncate">{user?.displayName || 'Scholar'}</span>
              <span className="text-[10px] font-medium opacity-50 block mt-1 truncate">{user?.email}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Terminate Session
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
