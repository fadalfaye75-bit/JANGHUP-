
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Loader2, AlertCircle, ChevronRight, Eye, EyeOff, School, Info } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      console.error("[Login Error]", err);
      if (err.message?.includes('Invalid login credentials')) {
        setError("Email ou mot de passe incorrect. Vérifiez vos identifiants.");
      } else if (err.message?.includes('Profil introuvable')) {
        setError("Compte authentifié mais profil non configuré. Contactez l'administrateur.");
      } else {
        setError(err.message || "Une erreur technique est survenue.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-100/20 via-transparent to-transparent -z-0"></div>
      
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-premium p-10 border border-gray-100 dark:border-gray-800 relative z-10 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.8rem] bg-primary-500 text-white mb-6 shadow-xl shadow-primary-500/20">
             <School size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase">JangHup</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-3 text-xs font-bold uppercase tracking-widest italic">
            Portail Centralisé ESP Dakar
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/20 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={18} className="flex-shrink-0" /> 
            <span className="flex-1">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Identifiant Académique</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="prenom.nom@esp.sn"
                className="w-full pl-14 pr-5 py-4 rounded-2xl border-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm outline-none focus:ring-4 focus:ring-primary-50 dark:focus:ring-primary-900/10 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Code d'accès</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-14 pr-14 py-4 rounded-2xl border-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm outline-none focus:ring-4 focus:ring-primary-50 dark:focus:ring-primary-900/10 transition-all"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gray-900 dark:bg-black hover:bg-primary-600 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95 uppercase tracking-widest text-[11px] italic"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Se connecter'}
            {!isLoading && <ChevronRight size={18} />}
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
             <Info size={12} className="text-primary-500" /> Note de déploiement
           </p>
           <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
             Si vous n'avez pas encore de compte, demandez à un administrateur de vous enrôler via le panneau de contrôle.
           </p>
        </div>
      </div>
    </div>
  );
}
