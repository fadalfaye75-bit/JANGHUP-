
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { Announcement, Exam, UserRole, Poll, MeetLink } from '../types';
import { 
  GraduationCap, Loader2, BarChart2, 
  Calendar, Radio, Zap, ArrowRight, 
  Megaphone, Clock, Sparkles, ChevronRight,
  School, Bell, MapPin
} from 'lucide-react';

export default function Dashboard() {
  const { user, adminViewClass } = useAuth();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const themeColor = user?.themeColor || '#87CEEB';

  const [data, setData] = useState({
    anns: [] as Announcement[],
    exams: [] as Exam[],
    polls: [] as Poll[],
    meets: [] as MeetLink[]
  });
  const [loading, setLoading] = useState(true);

  const filterByAccess = useCallback((itemClass: string) => {
    const target = itemClass || 'Général';
    if (user?.role === UserRole.ADMIN && !adminViewClass) return true;
    if (adminViewClass) return target === adminViewClass || target === 'Général';
    return target === user?.className || target === 'Général';
  }, [user?.role, user?.className, adminViewClass]);

  const fetchData = useCallback(async (quiet = false) => {
    if (!isMounted.current) return;
    if (!quiet) setLoading(true);
    
    try {
      const [anns, exams, polls, meets] = await Promise.all([
          API.announcements.list(10),
          API.exams.list(),
          API.polls.list(),
          API.meet.list()
      ]);

      if (!isMounted.current) return;

      setData({
        anns: anns.filter(a => filterByAccess(a.className)).slice(0, 3),
        exams: exams.filter(e => filterByAccess(e.className) && new Date(e.date) >= new Date()).slice(0, 2),
        polls: polls.filter(p => filterByAccess(p.className) && p.isActive).slice(0, 1),
        meets: meets.filter(m => filterByAccess(m.className)).slice(0, 1)
      });
    } catch (error) {
      console.warn("[Dashboard] Sync issue");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [filterByAccess]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const sub = API.announcements.subscribe(() => fetchData(true));
    return () => { isMounted.current = false; sub.unsubscribe(); };
  }, [fetchData]);

  const stats = useMemo(() => [
    { label: 'Annonces', count: data.anns.length, icon: Megaphone, color: themeColor, to: '/announcements' },
    { label: 'Examens', count: data.exams.length, icon: GraduationCap, color: '#f59e0b', to: '/exams' },
    { label: 'Sondages', count: data.polls.length, icon: BarChart2, color: '#8b5cf6', to: '/polls' },
    { label: 'Meet', count: data.meets.length, icon: Radio, color: '#10b981', to: '/meet' }
  ], [data, themeColor]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Synchronisation JangHup...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in pb-20 px-2 md:px-0">
      {/* Header Widget */}
      <section className="bg-white dark:bg-slate-900 rounded-[3rem] md:rounded-[4rem] p-8 md:p-14 shadow-premium border border-slate-50 dark:border-slate-800 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand-50/40 dark:bg-brand-900/10 rounded-full -mr-48 -mt-48 blur-3xl transition-transform duration-1000 group-hover:scale-110 pointer-events-none" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="space-y-6">
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-100 dark:border-brand-800 shadow-sm">
                  <Sparkles size={14} className="animate-pulse" /> Espace Premium Actif
               </div>
               <h1 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-[0.9] flex flex-col">
                  <span>Bonjour,</span>
                  <span className="text-brand">{user.name.split(' ')[0]} 👋</span>
               </h1>
               <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-lg leading-relaxed text-sm md:text-base">
                  Bienvenue sur votre plateforme académique centralisée. Tous vos outils universitaires sont synchronisés.
               </p>
               <div className="flex flex-wrap gap-4 pt-4">
                  <button onClick={() => navigate('/schedule')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all italic">
                     <Calendar size={16} /> Emploi du Temps
                  </button>
                  <button onClick={() => navigate('/announcements')} className="bg-white text-slate-900 border border-slate-100 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-soft flex items-center gap-3 active:scale-95 transition-all italic">
                     <Megaphone size={16} /> Dernières Actus
                  </button>
               </div>
            </div>
            <div className="hidden lg:flex flex-col items-center">
                <div className="w-48 h-48 bg-white dark:bg-slate-800 rounded-[3.5rem] shadow-premium p-8 border border-slate-50 dark:border-slate-700 transform rotate-3 hover:rotate-0 transition-all duration-500">
                    <div className="w-full h-full rounded-[2rem] flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: themeColor }}>
                        <School size={64} />
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{user.schoolName || 'ESP Dakar'}</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 uppercase tracking-tight italic">{user.className}</p>
                </div>
            </div>
         </div>
      </section>

      {/* Grid Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all group overflow-hidden relative border border-slate-50 dark:border-slate-800">
            <div className="p-4 rounded-2xl w-fit mb-8 text-white shadow-lg" style={{ backgroundColor: s.color }}>
               <s.icon size={24} />
            </div>
            <p className="text-5xl font-black italic text-slate-900 dark:text-white tracking-tighter leading-none">{s.count}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 italic">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 md:gap-10">
        {/* Main Feed Section */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between px-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.4em] italic flex items-center gap-3">
                 <Bell size={16} className="text-brand" /> Fil d'actualités
              </h3>
              <Link to="/announcements" className="text-brand flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:translate-x-1 transition-transform italic">
                 Voir tout <ChevronRight size={16} />
              </Link>
           </div>
           
           <div className="grid gap-4 md:gap-6">
             {data.anns.length > 0 ? data.anns.map((ann) => (
               <div key={ann.id} onClick={() => navigate('/announcements')} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-soft border-2 border-transparent hover:border-brand-100 transition-all cursor-pointer group flex items-start gap-8 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-2 h-full ${ann.priority === 'urgent' ? 'bg-rose-500' : 'bg-brand'}`} />
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 group-hover:bg-brand group-hover:text-white transition-all shrink-0 shadow-inner">
                    {ann.author?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xl md:text-2xl font-black italic text-slate-900 dark:text-white truncate uppercase tracking-tight group-hover:text-brand transition-colors mb-2">{ann.title}</h4>
                    <div className="flex items-center gap-4">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                         <Clock size={12} /> {new Date(ann.date).toLocaleDateString()}
                       </p>
                       <span className="text-[9px] font-black text-brand uppercase tracking-widest bg-brand-50 px-2 py-0.5 rounded-md italic">{ann.author}</span>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-slate-100 group-hover:text-brand group-hover:translate-x-1 transition-all mt-4" />
               </div>
             )) : (
               <div className="bg-slate-50 dark:bg-slate-900/50 p-16 rounded-[4rem] text-center border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
                  <Megaphone size={48} className="text-slate-200" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Aucune annonce récente pour votre classe.</p>
               </div>
             )}
           </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-10">
           {/* Next Exam Widget */}
           <div className="bg-slate-900 dark:bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 -mr-24 -mt-24 rounded-full group-hover:scale-150 transition-transform duration-1000" />
              <div className="flex items-center gap-3 mb-10 relative z-10">
                 <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20"><Calendar size={20}/></div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Urgence Académique</h3>
              </div>
              {data.exams.length > 0 ? (
                <div className="space-y-8 relative z-10">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-amber-500/50 italic tracking-widest">Matière principale</p>
                      <h4 className="text-3xl font-black italic tracking-tighter leading-none uppercase group-hover:translate-x-1 transition-transform">{data.exams[0].subject}</h4>
                   </div>
                   <div className="flex items-center gap-3 text-[11px] font-bold text-slate-300 italic bg-white/5 p-5 rounded-[1.5rem] border border-white/5">
                      <Clock size={16} className="text-amber-500" /> 
                      {new Date(data.exams[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                   </div>
                   <div className="pt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-60 italic border-t border-white/5 mt-6">
                      {/* Fix: Added MapPin from lucide-react */}
                      <div className="flex items-center gap-2"><MapPin size={12}/> {data.exams[0].room}</div>
                      <div className="flex items-center gap-2"><Clock size={12}/> {data.exams[0].duration}</div>
                   </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-6 relative z-10">
                  <div className="w-16 h-1 bg-white/10 rounded-full mx-auto"></div>
                  <p className="text-xs font-bold italic text-slate-500 uppercase tracking-widest">Aucune évaluation programmée</p>
                </div>
              )}
              <Link to="/exams" className="mt-12 w-full flex items-center justify-center py-5 bg-white/10 hover:bg-white/20 rounded-3xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 italic">
                Voir l'Agenda Complet
              </Link>
           </div>

           {/* Live Access Widget */}
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-soft border border-slate-50 dark:border-slate-800 flex items-center justify-between group cursor-pointer hover:shadow-premium transition-all" onClick={() => navigate('/meet')}>
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner group-hover:scale-110 transition-transform"><Radio size={24}/></div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Accès Live</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Cours à distance</p>
                 </div>
              </div>
              <ChevronRight size={24} className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
           </div>

           {/* Poll Widget */}
           {data.polls.length > 0 && (
              <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-premium group cursor-pointer" onClick={() => navigate('/polls')}>
                <div className="flex items-center gap-3 mb-6">
                  <BarChart2 size={20} className="animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Consultation Ouverte</span>
                </div>
                <h4 className="text-lg font-black italic uppercase tracking-tighter leading-tight mb-8 line-clamp-2">{data.polls[0].question}</h4>
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-white w-1/2 animate-shimmer" />
                </div>
                <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mt-4 italic">Cliquez pour voter</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
