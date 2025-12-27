
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
  const themeColor = user?.themecolor || '#87CEEB';

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
    return target === user?.classname || target === 'Général';
  }, [user?.role, user?.classname, adminViewClass]);

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
        anns: anns.filter(a => filterByAccess(a.classname)).slice(0, 3),
        exams: exams.filter(e => filterByAccess(e.classname) && new Date(e.date) >= new Date()).slice(0, 2),
        polls: polls.filter(p => filterByAccess(p.classname) && p.isactive).slice(0, 1),
        meets: meets.filter(m => filterByAccess(m.classname)).slice(0, 1)
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
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <Loader2 className="animate-spin text-brand" size={56} />
      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Synchronisation JANGHUP...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in pb-40 px-4 md:px-0">
      {/* Hero Section */}
      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-8 md:p-16 shadow-premium border border-slate-50 dark:border-slate-800 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-brand-50/40 dark:bg-brand-900/10 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
            <div className="space-y-8">
               <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-100 dark:border-brand-800">
                  <Sparkles size={14} className="animate-pulse" /> Espace Académique Premium
               </div>
               <h1 className="text-6xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-[0.8] flex flex-col">
                  <span>Salut,</span>
                  <span className="text-brand">{user?.name.split(' ')[0]} 👋</span>
               </h1>
               <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-xl leading-relaxed text-base md:text-xl">
                  Bienvenue sur votre plateforme centrale. Retrouvez ici vos cours, plannings et annonces synchronisés en temps réel.
               </p>
               <div className="flex flex-wrap gap-5 pt-4">
                  <button onClick={() => navigate('/schedule')} className="bg-slate-900 text-white px-12 py-6 rounded-[2.2rem] text-[11px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 active:scale-95 transition-all italic">
                     <Calendar size={20} /> Emploi du Temps
                  </button>
                  <button onClick={() => navigate('/announcements')} className="bg-white text-slate-900 border border-slate-100 px-12 py-6 rounded-[2.2rem] text-[11px] font-black uppercase tracking-widest shadow-soft flex items-center gap-3 active:scale-95 transition-all italic">
                     <Megaphone size={20} /> Annonces
                  </button>
               </div>
            </div>
            <div className="hidden lg:block relative">
                <div className="w-64 h-64 bg-white dark:bg-slate-800 rounded-[4.5rem] shadow-premium p-12 border border-slate-50 dark:border-slate-700 transform rotate-6 hover:rotate-0 transition-all duration-700">
                    <div className="w-full h-full rounded-[2.8rem] flex items-center justify-center text-white shadow-xl" style={{ backgroundColor: themeColor }}>
                        <School size={80} />
                    </div>
                </div>
                <div className="absolute -bottom-6 -left-6 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black italic text-[10px] uppercase tracking-widest shadow-2xl">
                    {user?.classname}
                </div>
            </div>
         </div>
      </section>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="bg-white dark:bg-slate-900 p-10 rounded-[3.2rem] shadow-soft hover:shadow-premium hover:-translate-y-2 transition-all group overflow-hidden relative border border-slate-50 dark:border-slate-800">
            <div className="p-5 rounded-2xl w-fit mb-10 text-white shadow-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: s.color }}>
               <s.icon size={30} />
            </div>
            <p className="text-7xl font-black italic text-slate-900 dark:text-white tracking-tighter leading-none">{s.count}</p>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-4 italic">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-10">
           <div className="flex items-center justify-between px-8">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.5em] italic flex items-center gap-4">
                 <Bell size={20} className="text-brand animate-bounce" /> Derniers Signaux
              </h3>
              <Link to="/announcements" className="text-brand flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:translate-x-2 transition-transform italic">
                 Voir tout <ChevronRight size={20} />
              </Link>
           </div>
           
           <div className="grid gap-6">
             {data.anns.length > 0 ? data.anns.map((ann) => (
               <div key={ann.id} onClick={() => navigate('/announcements')} className="bg-white dark:bg-slate-900 p-10 rounded-[4rem] shadow-soft border-2 border-transparent hover:border-brand-100 transition-all cursor-pointer group flex flex-col md:flex-row items-start md:items-center gap-10 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-2.5 h-full ${ann.priority === 'urgent' ? 'bg-rose-500 shadow-[2px_0_15px_rgba(244,63,94,0.3)]' : 'bg-brand'}`} />
                  <div className="w-20 h-20 rounded-[1.8rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-300 group-hover:bg-brand group-hover:text-white transition-all shrink-0 shadow-inner text-3xl italic">
                    {ann.author?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-2xl md:text-3xl font-black italic text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-brand transition-colors mb-4 leading-tight">
                      {ann.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-8">
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Clock size={16} /> {new Date(ann.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                       </p>
                       <span className="text-[11px] font-black text-brand uppercase tracking-widest bg-brand-50 dark:bg-brand-900/10 px-4 py-1.5 rounded-xl italic border border-brand-100 dark:border-brand-800">{ann.author}</span>
                    </div>
                  </div>
                  <ChevronRight size={32} className="hidden md:block text-slate-100 group-hover:text-brand group-hover:translate-x-3 transition-all shrink-0" />
               </div>
             )) : (
               <div className="bg-slate-50 dark:bg-slate-900/50 p-24 rounded-[4.5rem] text-center border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-8">
                  <Megaphone size={64} className="text-slate-200 opacity-50" />
                  <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic">Aucun signal détecté pour le moment.</p>
               </div>
             )}
           </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-12">
           {/* Calendar Widget */}
           <div className="bg-slate-900 dark:bg-black rounded-[4.5rem] p-12 text-white shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 -mr-24 -mt-24 rounded-full group-hover:scale-150 transition-transform duration-1000" />
              <div className="flex items-center gap-5 mb-12 relative z-10">
                 <div className="p-5 bg-amber-500 rounded-3xl shadow-2xl shadow-amber-500/30 transform rotate-12 group-hover:rotate-0 transition-transform"><Calendar size={28}/></div>
                 <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-amber-500">Alerte Évaluation</h3>
              </div>
              {data.exams.length > 0 ? (
                <div className="space-y-12 relative z-10">
                   <div className="space-y-4">
                      <p className="text-[11px] font-black uppercase text-amber-500/50 italic tracking-widest">Matière prioritaire</p>
                      <h4 className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none uppercase group-hover:translate-x-3 transition-transform">{data.exams[0].subject}</h4>
                   </div>
                   <div className="flex items-center gap-5 text-sm font-bold text-slate-300 italic bg-white/5 p-8 rounded-[2.2rem] border border-white/5 shadow-inner">
                      <Clock size={24} className="text-amber-500 animate-pulse" /> 
                      {new Date(data.exams[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                   </div>
                   <div className="pt-10 flex items-center justify-between text-[11px] font-black uppercase tracking-widest opacity-60 italic border-t border-white/10">
                      <div className="flex items-center gap-3"><MapPin size={16}/> {data.exams[0].room}</div>
                      <div className="flex items-center gap-3"><Clock size={16}/> {data.exams[0].duration}</div>
                   </div>
                </div>
              ) : (
                <div className="py-20 text-center space-y-10 relative z-10 opacity-30">
                  <Calendar size={64} className="mx-auto" />
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] italic">Agenda libre</p>
                </div>
              )}
           </div>

           {/* Quick Action Cards */}
           <div className="space-y-5">
              <div onClick={() => navigate('/meet')} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-soft border border-slate-50 dark:border-slate-800 flex items-center justify-between group cursor-pointer hover:shadow-premium transition-all">
                 <div className="flex items-center gap-6">
                    <div className="p-5 bg-emerald-50 text-emerald-600 rounded-3xl shadow-inner group-hover:scale-110 transition-transform"><Radio size={28}/></div>
                    <div>
                       <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">En Direct</p>
                       <p className="text-base font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Salles de cours</p>
                    </div>
                 </div>
                 <ChevronRight size={28} className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-3 transition-all" />
              </div>
              
              <div onClick={() => navigate('/polls')} className="bg-indigo-600 p-10 rounded-[3rem] shadow-premium flex items-center justify-between group cursor-pointer hover:brightness-110 transition-all text-white">
                 <div className="flex items-center gap-6">
                    <div className="p-5 bg-white/10 rounded-3xl group-hover:scale-110 transition-transform"><BarChart2 size={28}/></div>
                    <div>
                       <p className="text-[11px] font-black uppercase tracking-widest text-indigo-200">Consultations</p>
                       <p className="text-base font-black italic uppercase tracking-tight">Espace de vote</p>
                    </div>
                 </div>
                 <ChevronRight size={28} className="text-indigo-200 group-hover:translate-x-3 transition-all" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
