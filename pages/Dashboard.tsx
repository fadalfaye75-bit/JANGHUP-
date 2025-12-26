
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { Announcement, Exam, UserRole, Poll, MeetLink } from '../types';
import { 
  GraduationCap, Loader2, BarChart2, 
  Calendar, Radio, Zap, ArrowRight, 
  Megaphone, Clock
} from 'lucide-react';

export default function Dashboard() {
  const { user, adminViewClass } = useAuth();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const themeColor = user?.themeColor || '#0ea5e9';

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
    { label: 'Consultations', count: data.polls.length, icon: BarChart2, color: '#8b5cf6', to: '/polls' },
    { label: 'En Direct', count: data.meets.length, icon: Radio, color: '#10b981', to: '/meet' }
  ], [data, themeColor]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-primary-500" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Synchronisation JANGHUP...</p>
    </div>
  );

  return (
    <div className="space-y-12 max-w-7xl mx-auto animate-fade-in pb-32 px-4">
      <div className="space-y-4">
         <div className="inline-flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 shadow-soft">
            <Zap size={14} className="text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">{user?.schoolName || 'ESP Dakar'}</span>
         </div>
         <h2 className="text-4xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase leading-none">Bonjour, {user?.name?.split(' ')[0]}</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-soft hover:scale-105 transition-all group overflow-hidden relative">
            <div className="p-3 rounded-2xl w-fit mb-4 text-white" style={{ backgroundColor: s.color }}>
               <s.icon size={20} />
            </div>
            <p className="text-3xl font-black italic text-gray-900 dark:text-white leading-none">{s.count}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-4">
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] italic">Dernières Nouvelles</h3>
              <Link to="/announcements" className="text-primary-500 hover:scale-110 transition-transform"><ArrowRight size={20} /></Link>
           </div>
           
           <div className="space-y-4">
             {data.anns.map((ann) => (
               <div key={ann.id} onClick={() => navigate('/announcements')} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-soft border border-transparent hover:border-primary-100 transition-all cursor-pointer group flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center font-black text-gray-300 group-hover:bg-primary-500 group-hover:text-white transition-all shrink-0">
                    {ann.author?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black italic text-gray-900 dark:text-white truncate uppercase">{ann.title}</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{ann.author} • {new Date(ann.date).toLocaleDateString()}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>

        <div className="bg-gray-900 dark:bg-black rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden h-fit flex flex-col gap-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-amber-500 rounded-xl"><Calendar size={18}/></div>
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Prochain Examen</h3>
            </div>
            {data.exams.length > 0 ? (
              <div className="space-y-4">
                 <h4 className="text-2xl font-black italic tracking-tighter leading-tight uppercase">{data.exams[0].subject}</h4>
                 <div className="flex items-center gap-3 text-xs font-bold text-amber-500 italic">
                    <Clock size={14} /> {new Date(data.exams[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                 </div>
              </div>
            ) : (
              <p className="text-xs font-medium italic opacity-50">Aucune évaluation prévue.</p>
            )}
            <Link to="/exams" className="mt-4 block text-center py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">Consulter le Calendrier</Link>
        </div>
      </div>
    </div>
  );
}
