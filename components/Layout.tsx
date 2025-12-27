
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Megaphone, Calendar, GraduationCap, Video, 
  BarChart2, LogOut, Menu, Moon, Sun, 
  ShieldCheck, School, X, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useNotification } from '../context/NotificationContext';

export const UserAvatar = React.memo(({ name, color, className = "w-10 h-10", textClassName = "text-xs" }: { name: string, color?: string, className?: string, textClassName?: string }) => {
  const initials = useMemo(() => {
    if (!name) return "?";
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [name]);
  const bgColor = color || '#87CEEB';
  return (
    <div className={`${className} rounded-2xl flex items-center justify-center text-white font-black shadow-sm border-2 border-white dark:border-gray-800 shrink-0 transform hover:scale-105 transition-all`} style={{ backgroundColor: bgColor }}>
      <span className={textClassName}>{initials}</span>
    </div>
  );
});

export default function Layout() {
  const { user, logout, toggleTheme, isDarkMode } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const themeColor = user?.themecolor || '#87CEEB';

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const navItems = useMemo(() => {
    const items = [
      { to: '/', icon: LayoutDashboard, label: 'Tableau de Bord', end: true },
      { to: '/schedule', icon: Calendar, label: 'Planning' },
      { to: '/announcements', icon: Megaphone, label: 'Annonces' },
      { to: '/exams', icon: GraduationCap, label: 'Examens' },
      { to: '/meet', icon: Video, label: 'Directs' },
      { to: '/polls', icon: BarChart2, label: 'Consultations' },
      { to: '/notifications', icon: Bell, label: 'Alertes' }, // Déplacé en bas
    ];
    if (user?.role === UserRole.ADMIN) items.push({ to: '/admin', icon: ShieldCheck, label: 'Admin' });
    return items;
  }, [user?.role]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-slate-950 transition-colors duration-300 font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden backdrop-blur-md" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-soft`}>
        <div className="p-8 h-24 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center text-white rounded-xl shadow-lg" style={{ backgroundColor: themeColor }}>
               <School size={22} />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">JangHup</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-400"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `flex items-center gap-4 px-5 py-4 text-xs font-bold uppercase tracking-widest rounded-2xl transition-all ${isActive ? 'bg-brand text-white shadow-premium italic' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <item.icon size={20} />
                <span className="truncate">{item.label}</span>
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-6 border-t border-slate-50 dark:border-slate-800">
          <button onClick={async () => { if(confirm("Quitter JangHup ?")) { await logout(); navigate('/login'); } }} className="flex items-center gap-3 w-full px-5 py-4 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-white hover:bg-rose-500 rounded-2xl transition-all active:scale-95 italic border border-rose-50 dark:border-rose-900/20">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>
      <div className="flex-1 md:ml-72 flex flex-col h-screen overflow-hidden pb-24 md:pb-0">
        <header className="h-20 glass flex items-center justify-between px-8 z-20 sticky top-0 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><Menu size={24} /></button>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Portail JangHup • ESP</p>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none mt-1">{user?.classname}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/notifications')} className="relative p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
             </button>
             <button onClick={toggleTheme} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <NavLink to="/profile" className="flex items-center gap-3 pl-2 border-l border-slate-100 dark:border-slate-800 ml-2">
               <UserAvatar name={user.name} color={themeColor} className="w-10 h-10" />
               <div className="hidden lg:block">
                 <p className="text-xs font-black italic text-slate-900 dark:text-white leading-none">{user.name.split(' ')[0]}</p>
               </div>
             </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
           <div className="max-w-6xl mx-auto"><Outlet /></div>
        </main>
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 glass border-t border-slate-100 dark:border-slate-800 z-50 flex items-center justify-around px-4">
           {navItems.slice(0, 5).map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center justify-center gap-1 transition-all ${isActive ? 'text-brand scale-110' : 'text-slate-400'}`}>
                 <div className="relative">
                    <item.icon size={20} />
                    {item.to === '/notifications' && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-lg">
                        {unreadCount}
                      </span>
                    )}
                 </div>
                 <span className="text-[8px] font-black uppercase tracking-widest">{item.label.split(' ')[0]}</span>
              </NavLink>
           ))}
        </nav>
      </div>
    </div>
  );
}
