import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, School, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const targetEmail = email.trim().toLowerCase();
      if (!targetEmail || !password) throw new Error("Identifiants requis.");
      await login(targetEmail, password);
    } catch (err: any) {
      setError(err.message || "Email ou code incorrect.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 font-sans relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-300 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-5xl shadow-premium p-10 md:p-14 border border-slate-50 dark:border-slate-800 animate-fade-in relative z-10">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-brand text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <School size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
            Portail JangHup
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 flex items-center justify-center gap-2">
            <Sparkles size={12} className="text-brand animate-pulse" /> Écosystème Numérique ESP
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-[11px] font-bold border border-rose-100 dark:border-rose-900/20">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Identifiant Académique</label>
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand transition-colors" size={20} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="prenom.nom@esp.sn" 
                className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm outline-none focus:ring-4 focus:ring-brand-50 transition-all shadow-inner-soft" 
                required 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Mot de Passe Sécurisé</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full pl-16 pr-14 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-sm outline-none focus:ring-4 focus:ring-brand-50 transition-all shadow-inner-soft" 
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-5 rounded-[2.2rem] shadow-premium hover:bg-brand transition-all flex items-center justify-center gap-4 uppercase tracking-widest text-xs italic active:scale-95 disabled:opacity-70 mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Se Connecter'}
          </button>
        </form>

        <div className="mt-14 pt-10 text-center border-t border-slate-50 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.5em] italic">JangHup Production • Cloud ESP</p>
        </div>
      </div>
    </div>
  );
}