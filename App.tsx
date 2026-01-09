
import React, { useState } from 'react';
import { AppMode } from './types';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import ChatView from './components/ChatView';
import LiveSession from './components/LiveSession';
import StudyStudio from './components/TemplateView';
import AuthView from './components/AuthView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ICONS } from './constants';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-6 bg-white">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying Identity...</p>
      </div>
    );
  }

  if (!user) return <AuthView />;

  const renderContent = () => {
    switch (mode) {
      case AppMode.HOME: return <HomeView onSelectMode={setMode} />;
      case AppMode.CHAT: return <ChatView />;
      case AppMode.LIVE: return <LiveSession />;
      case AppMode.NOTES: return <StudyStudio mode="NOTES" />;
      case AppMode.STUDIO: return <StudyStudio mode="STUDIO" />;
      default: return <HomeView onSelectMode={setMode} />;
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case AppMode.HOME: return 'Dashboard';
      case AppMode.CHAT: return 'Architect Chat';
      case AppMode.LIVE: return 'Voice Protocol';
      case AppMode.NOTES: return 'Note Synthesis';
      case AppMode.STUDIO: return 'Visual Studio';
      default: return 'Academia AI';
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white overflow-hidden academia-ai-root">
      {/* Mobile Top Header */}
      <header className="md:hidden h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-xl z-[60] sticky top-0">
        <button onClick={() => setMode(AppMode.HOME)} className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
             <ICONS.Brain className="w-4 h-4" />
          </div>
          <span className="text-xs font-black tracking-tight uppercase text-slate-900">{getModeTitle()}</span>
        </button>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
        </button>
      </header>

      <Sidebar 
        currentMode={mode} 
        setMode={(m) => { setMode(m); setIsSidebarOpen(false); }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {renderContent()}

        {/* Floating Bottom Navigation Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[55] w-fit px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl border border-white/10 ring-1 ring-black/20">
            <button 
              onClick={() => setMode(AppMode.HOME)}
              className={`p-3 rounded-xl transition-all ${mode === AppMode.HOME ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </button>
            <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
            {[
              { mode: AppMode.CHAT, icon: ICONS.Chat },
              { mode: AppMode.LIVE, icon: ICONS.Live },
              { mode: AppMode.NOTES, icon: ICONS.Notes },
              { mode: AppMode.STUDIO, icon: ICONS.Map }
            ].map(item => (
              <button 
                key={item.mode}
                onClick={() => setMode(item.mode)}
                className={`p-3 rounded-xl transition-all ${mode === item.mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;
