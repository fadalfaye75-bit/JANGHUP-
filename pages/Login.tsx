
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, School, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si déjà authentifié, on dégage de la page login
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
      // La redirection sera gérée par le useEffect ci-dessus dès que l'état changera
    } catch (err: any) {
      console.error("[Auth Error]", err);
      setError(err.message || "Email ou code personnel incorrect.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary-500 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-premium p-12 border border-gray-100 dark:border-gray-800 animate-fade-in relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary-500 text-white rounded-[1.8rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/20 transform -rotate-3">
            <School size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
            Portail JangHup
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3 flex items-center justify-center gap-2">
            <ShieldCheck size={12} className="text-primary-500" /> Accès Institutionnel
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-[11px] font-bold border border-red-100 dark:border-red-900/20">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Email Académique</label>
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={20} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="prenom.nom@esp.sn" 
                className="w-full pl-16 pr-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm outline-none focus:ring-4 focus:ring-primary-50 transition-all shadow-inner-soft" 
                required 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Code Personnel</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full pl-16 pr-14 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm outline-none focus:ring-4 focus:ring-primary-50 transition-all shadow-inner-soft" 
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-gray-900 dark:bg-black text-white font-black py-5 rounded-[2rem] shadow-2xl hover:bg-primary-600 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[11px] italic active:scale-95 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Accéder au Portail'}
          </button>
        </form>

        <div className="mt-12 pt-8 text-center border-t border-gray-50 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.5em] italic">JangHup Production Cloud</p>
        </div>
      </div>
    </div>
  );
}
