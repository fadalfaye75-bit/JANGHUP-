
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { API } from '../services/api';
import { supabase } from '../services/supabaseClient';

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

  const initAuth = useCallback(async () => {
    try {
      setLoading(true);
      // SRE CRITICAL: Always use getUser() which verifies JWT with the server.
      // getSession() only reads from local storage and can be faked or expired.
      const profile = await API.auth.getSession();
      setUser(profile);
    } catch (e) {
      console.error("[SRE Auth Audit] Initialization failed:", e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAdminViewClass(null);
        // Wipe storage on signout
        localStorage.clear();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const profile = await API.auth.getSession();
          setUser(profile);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initAuth]);

  const login = async (email: string, pass: string) => {
    const foundUser = await API.auth.login(email, pass);
    setUser(foundUser);
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      
      // Forced clean reset
      setUser(null);
      setAdminViewClass(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // Reset navigation state
      window.location.hash = '/login';
      window.location.reload(); 
    } catch (e) {
      console.error("[SRE Security] Logout cleanup failed:", e);
      window.location.reload();
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

  if (loading) {
    return (
      <div id="app-loader">
        <div className="spinner"></div>
        <p className="mt-4 text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Sécure Boot JANGHUP...</p>
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
