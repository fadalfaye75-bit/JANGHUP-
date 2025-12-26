
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { Announcement, Exam, UserRole, Poll, MeetLink } from '../types';
import { 
  GraduationCap, Loader2, BarChart2, 
  Calendar, Radio, Zap, ArrowRight, 
  Megaphone, Clock, Sparkles, ChevronRight,
  School
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
    { label: 'Annonces', count: data.anns.length, icon: Megaphone, color: '#87CEEB', to: '/announcements' },
    { label: 'Examens', count: data.exams.length, icon: GraduationCap, color: '#f59e0b', to: '/exams' },
    { label: 'Sondages', count: data.polls.length, icon: BarChart2, color: '#8b5cf6', to: '/polls' },
    { label: 'Meet', count: data.meets.length, icon: Radio, color: '#10b981', to: '/meet' }
  ], [data]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initialisation JangHup...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Welcome Section */}
      <section className="bg-white dark:bg-slate-900 rounded-5xl p-10 md:p-14 shadow-premium border border-slate-50 dark:border-slate-800 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-brand-100/30 dark:bg-brand-900/10 rounded-full -mr-24 -mt-24 blur-3xl transition-transform duration-1000 group-hover:scale-110" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-brand-100 dark:border-brand-800">
                  <Sparkles size={12} className="animate-pulse" /> Bienvenue sur le Portail
               </div>
               <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-tight">
                  Bonjour, {user.name.split(' ')[0]} 👋
               </h1>
               <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-lg leading-relaxed">
                  Votre espace académique centralisé pour l'ESP Dakar est synchronisé. 
                  Retrouvez vos cours, examens et annonces en un coup d'œil.
               </p>
            </div>
            <div className="hidden lg:block w-40 h-40 bg-white dark:bg-slate-800 rounded-4xl shadow-soft p-6 border border-slate-100 dark:border-slate-700 transform rotate-6 hover:rotate-0 transition-transform">
               <div className="w-full h-full bg-brand rounded-2xl flex items-center justify-center text-white">
                  <School size={48} />
               </div>
            </div>
         </div>
      </section>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="bg-white dark:bg-slate-900 p-8 rounded-4xl shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all group overflow-hidden relative border border-slate-50 dark:border-slate-800">
            <div className="p-3.5 rounded-2xl w-fit mb-6 text-white shadow-lg" style={{ backgroundColor: s.color }}>
               <s.icon size={22} />
            </div>
            <p className="text-4xl font-black italic text-slate-900 dark:text-white tracking-tighter">{s.count}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Announcements */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic">Dernières Publications</h3>
              <Link to="/announcements" className="text-brand flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:translate-x-1 transition-transform">
                 Voir tout <ChevronRight size={14} />
              </Link>
           </div>
           
           <div className="grid gap-4">
             {data.anns.map((ann) => (
               <div key={ann.id} onClick={() => navigate('/announcements')} className="bg-white dark:bg-slate-900 p-7 rounded-4xl shadow-soft border border-transparent hover:border-brand-100 transition-all cursor-pointer group flex items-start gap-6 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${ann.priority === 'urgent' ? 'bg-rose-500' : 'bg-brand'}`} />
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-300 group-hover:bg-brand group-hover:text-white transition-all shrink-0">
                    {ann.author?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black italic text-slate-900 dark:text-white truncate uppercase tracking-tight group-hover:text-brand transition-colors">{ann.title}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                      <Clock size={10} /> {new Date(ann.date).toLocaleDateString()} • {ann.author}
                    </p>
                  </div>
               </div>
             ))}
             {data.anns.length === 0 && (
               <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-4xl text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Aucune annonce récente</p>
               </div>
             )}
           </div>
        </div>

        {/* Next Exam Sidebar */}
        <div className="space-y-6">
           <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic px-2">Agenda</h3>
           <div className="bg-slate-900 dark:bg-slate-900 rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className="flex items-center gap-3 mb-10">
                 <div className="p-2.5 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20"><Calendar size={20}/></div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Prochain Examen</h3>
              </div>
              {data.exams.length > 0 ? (
                <div className="space-y-6">
                   <h4 className="text-2xl font-black italic tracking-tighter leading-tight uppercase group-hover:translate-x-1 transition-transform">{data.exams[0].subject}</h4>
                   <div className="flex items-center gap-3 text-xs font-bold text-slate-300 italic bg-white/5 p-4 rounded-2xl border border-white/5">
                      <Clock size={14} className="text-amber-500" /> 
                      {new Date(data.exams[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                   </div>
                   <div className="pt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-60">
                      📍 {data.exams[0].room} • ⏱️ {data.exams[0].duration}
                   </div>
                </div>
              ) : (
                <div className="py-6 space-y-3">
                  <p className="text-xs font-medium italic text-slate-400">Aucune évaluation programmée pour le moment.</p>
                  <div className="w-12 h-1 bg-white/10 rounded-full"></div>
                </div>
              )}
              <Link to="/exams" className="mt-10 block text-center py-5 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5">
                Consulter le Planning
              </Link>
           </div>

           {/* Quick Action */}
           <div className="bg-white dark:bg-slate-900 p-8 rounded-4xl shadow-soft border border-slate-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer" onClick={() => navigate('/meet')}>
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Radio size={20}/></div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Accès Direct</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white italic">Cours en visioconférence</p>
                 </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
           </div>
        </div>
      </div>
    </div>
  );
}
