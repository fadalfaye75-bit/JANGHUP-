
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Megaphone, Calendar, GraduationCap, Video, 
  BarChart2, Search, LogOut, Menu, Moon, Sun, 
  ShieldCheck, UserCircle, Bell, School, 
  BellRing
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import { UserRole } from '../types';

export const UserAvatar = React.memo(({ name, color, className = "w-10 h-10", textClassName = "text-xs" }: { name: string, color?: string, className?: string, textClassName?: string }) => {
  const initials = useMemo(() => {
    if (!name) return "?";
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  const bgColor = color || '#0ea5e9';

  return (
    <div 
      className={`${className} rounded-2xl flex items-center justify-center text-white font-black shadow-lg border-2 border-white dark:border-gray-800 shrink-0 transform hover:rotate-3 transition-transform`}
      style={{ backgroundColor: bgColor }}
    >
      <span className={textClassName}>{initials}</span>
    </div>
  );
});

export default function Layout() {
  const { user, logout, toggleTheme, isDarkMode } = useAuth();
  const { notifications, unreadCount, markAllAsRead, clearNotifications } = useNotification();
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [allData, setAllData] = useState<{anns: any[], exams: any[], schs: any[]}>({anns: [], exams: [], schs: []});
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const themeColor = user?.themeColor || '#0ea5e9';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setNotifOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  const prefetchSearchData = useCallback(async () => {
    if (isDataLoaded || !user) return;
    try {
      // Fix: Corrected API arguments and methods
      const [anns, exams, schs] = await Promise.all([
        API.announcements.list(100),
        API.exams.list(),
        API.schedules.list()
      ]);
      setAllData({ anns, exams, schs });
      setIsDataLoaded(true);
    } catch (e) { 
      console.warn("[Search Prefetch] Skipped."); 
    }
  }, [isDataLoaded, user]);

  const navItems = useMemo(() => {
    const items = [
      { to: '/', icon: LayoutDashboard, label: 'Tableau de Bord', end: true },
      { to: '/announcements', icon: Megaphone, label: 'Annonces' },
      { to: '/schedule', icon: Calendar, label: 'Planning' },
      { to: '/exams', icon: GraduationCap, label: 'Examens' },
      { to: '/meet', icon: Video, label: 'Directs' },
      { to: '/polls', icon: BarChart2, label: 'Consultations' },
    ];
    if (user?.role === UserRole.ADMIN) items.push({ to: '/admin', icon: ShieldCheck, label: 'Administration' });
    return items;
  }, [user?.role]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200 font-sans overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/60 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-premium md:shadow-none`}>
        <div className="p-8 h-24 flex-shrink-0 flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center text-white rounded-[1.2rem] shadow-xl" style={{ backgroundColor: themeColor }}>
             <School size={28} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tighter uppercase italic leading-none">JangHup</h1>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 opacity-70" style={{ color: themeColor }}>{user?.schoolName || 'ESP DAKAR'}</p>
          </div>
        </div>

        <div className="px-6 py-2 flex-1 overflow-y-auto custom-scrollbar">
          <NavLink to="/profile" className={({ isActive }) => `flex items-center gap-4 mb-10 p-5 rounded-[2.2rem] transition-all border-2 ${isActive ? 'bg-gray-50/50 border-gray-200 dark:bg-gray-800/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent shadow-sm'}`}>
             <UserAvatar name={user?.name || "U"} color={themeColor} className="w-12 h-12" textClassName="text-xl" />
             <div className="flex-1 min-w-0">
               <p className="text-sm font-black truncate text-gray-900 dark:text-white italic">{user?.name.split(' ')[0]}</p>
               <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{user?.className}</p>
             </div>
          </NavLink>

          <nav className="space-y-1.5 pb-10">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex items-center gap-4 px-6 py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all group
                  ${isActive ? 'text-white shadow-xl italic' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/20'}`}
                style={({ isActive }) => isActive ? { backgroundColor: themeColor } : {}}
              >
                <item.icon size={20} className="group-hover:rotate-12 transition-transform" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <button 
            onClick={() => { if(window.confirm("Quitter le portail ?")) logout(); }} 
            className="flex items-center gap-3 w-full px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-900 rounded-2xl transition-all italic active:scale-95 border border-red-50 dark:border-red-900/30"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-72 flex flex-col h-screen overflow-hidden">
        <header className="h-24 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 z-20 sticky top-0">
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-3 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all active:scale-90">
              <Menu size={24} />
            </button>
            
            <div className="relative flex-1 group hidden sm:block" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" placeholder="Rechercher sur JangHup..."
                  onFocus={prefetchSearchData}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-none rounded-2xl text-sm font-bold italic outline-none focus:ring-4 focus:ring-primary-50 transition-all duration-300"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative" ref={notifRef}>
                <button onClick={() => { markAllAsRead(); setNotifOpen(!isNotifOpen); }} className="p-3.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all relative active:scale-90">
                  <Bell size={22} />
                  {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>}
                </button>
                {isNotifOpen && (
                  <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-gray-900 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
                       <h4 className="text-xs font-black uppercase tracking-widest italic">Alertes</h4>
                       <button onClick={() => clearNotifications()} className="text-[9px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest">Purger</button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                       {notifications.length > 0 ? notifications.map(n => (
                         <div key={n.id} className="p-5 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <p className="text-[10px] font-black text-gray-900 dark:text-white leading-tight">{n.title}</p>
                            <p className="text-[9px] text-gray-400 font-bold mt-1 line-clamp-2">{n.message}</p>
                         </div>
                       )) : (
                         <div className="p-10 text-center opacity-30 grayscale"><BellRing size={40} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Aucun signal</p></div>
                       )}
                    </div>
                  </div>
                )}
             </div>

             <button onClick={toggleTheme} className="p-3.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-90">
                {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
