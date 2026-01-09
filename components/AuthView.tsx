
import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { ICONS } from '../constants';

const AuthView: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="w-full max-w-md relative z-10 space-y-8 animate-fade-up">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl">
            <ICONS.Brain className="w-10 h-10" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black font-display text-slate-900 tracking-tight">Academia AI</h1>
            <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">Architect of Knowledge</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-8 md:p-10">
          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Institutional Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu" 
                className="w-full px-6 py-4 bg-slate-50 border-none ring-1 ring-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Security Key</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-6 py-4 bg-slate-50 border-none ring-1 ring-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 transition-all"
                required
              />
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center px-4 animate-pulse">{error}</p>}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-950 text-white py-4 rounded-2xl font-bold hover:bg-indigo-600 shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : isLogin ? 'Access Core' : 'Create Identity'}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Or Link With</span>
            <div className="h-[1px] flex-1 bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-4 border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
            <button 
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-4 border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              Guest Access
            </button>
          </div>
        </div>

        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="w-full text-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          {isLogin ? "Request New Identity Protocol" : "Back to Security Clearance"}
        </button>
      </div>
    </div>
  );
};

export default AuthView;
