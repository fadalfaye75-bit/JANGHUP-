
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { API } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  adminViewClass: string | null;
  setAdminViewClass: (classId: string | null) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminViewClass, setAdminViewClass] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rlsError, setRlsError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.message.includes("recursion")) {
          setRlsError("Erreur critique de base de données (RLS Recursion). Veuillez appliquer le script SQL correct.");
          setLoading(false);
          return;
        }

        if (retryCount < 3) { 
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }
        throw error;
      }
      
      if (data) {
        setUser(data);
        setRlsError(null);
      }
    } catch (e: any) {
      console.error("Erreur profil fatal:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        setLoading(true);
        fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAdminViewClass(null);
        setLoading(false);
      }
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, pass: string) => {
    const profile = await API.auth.login(email, pass);
    if (profile) setUser(profile);
  };

  const logout = async () => {
    try {
      await API.auth.logout();
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      // Nettoyage impératif de l'état local
      setUser(null);
      setAdminViewClass(null);
      localStorage.removeItem('supabase.auth.token'); // Nettoyage manuel au cas où
    }
  };

  const updateCurrentUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = await API.auth.updateProfile(user.id, updates);
    if (updatedUser) setUser(updatedUser);
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      document.documentElement.classList.toggle('dark', newMode);
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  if (rlsError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50 dark:bg-slate-950 p-10 text-center">
        <div className="w-20 h-20 bg-rose-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl mb-8 animate-bounce">
          <AlertTriangle size={40} />
        </div>
        <h1 className="text-3xl font-black uppercase italic text-slate-900 dark:text-white tracking-tighter mb-4">Erreur de Configuration</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm font-medium italic mb-10 leading-relaxed">
          {rlsError}
        </p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-premium active:scale-95 transition-all italic">
          <RefreshCcw size={18} /> Réessayer la connexion
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-brand rounded-full animate-spin shadow-inner"></div>
        <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse italic">Synchronisation JangHup...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, login, logout, updateCurrentUser,
      adminViewClass, setAdminViewClass, toggleTheme, isDarkMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
