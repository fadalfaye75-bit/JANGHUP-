
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { Announcement, Exam, UserRole, Poll, MeetLink } from '../types';
import { 
  GraduationCap, Loader2, BarChart2, 
  Calendar, Radio, Zap, ArrowRight, 
  Megaphone, MapPin
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

  const fetchData = useCallback(async (quiet = false) => {
    // Si le composant n'est plus là, on arrête tout
    if (!isMounted.current) return;
    
    if (!quiet) setLoading(true);
    
    try {
      const [allAnns, allExams, allPolls, allMeets] = await Promise.all([
          API.announcements.list(0, 5),
          API.exams.list(),
          API.polls.list(),
          API.meet.list()
      ]);

      if (!isMounted.current) return;

      const filterByAccess = (itemClass: string) => {
        const target = itemClass || 'Général';
        if (user?.role === UserRole.ADMIN && !adminViewClass) return true;
        if (adminViewClass) return target === adminViewClass || target === 'Général';
        return target === user?.className || target === 'Général';
      };

      setData({
        anns: (allAnns || []).filter(a => filterByAccess(a.className)).slice(0, 3),
        exams: (allExams || []).filter(e => filterByAccess(e.className) && new Date(e.date) >= new Date()).slice(0, 2),
        polls: (allPolls || []).filter(p => filterByAccess(p.className) && p.isActive).slice(0, 1),
        meets: (allMeets || []).filter(m => filterByAccess(m.className)).slice(0, 1)
      });
    } catch (error) {
      console.warn("[Dashboard] Fetch error ignored during unmount");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [user?.role, user?.className, adminViewClass]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    // On s'abonne mais avec une référence propre
    const subscription = API.announcements.subscribe(() => {
      if (isMounted.current) fetchData(true);
    });
    
    return () => { 
      isMounted.current = false; // Bloque les futurs setState
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [fetchData]);

  const metrics = useMemo(() => [
    { to: '/announcements', label: 'Annonces', count: data.anns.length, icon: Megaphone, color: themeColor },
    { to: '/exams', label: 'Examens', count: data.exams.length, icon: GraduationCap, color: '#f59e0b' },
    { to: '/polls', label: 'Sondages', count: data.polls.length, icon: BarChart2, color: '#8b5cf6' },
    { to: '/meet', label: 'En Direct', count: data.meets.length, icon: Radio, color: '#10b981' }
  ], [data, themeColor]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="animate-spin text-primary-500" size={40} />
      <p className="mt-4 text-[10px] font-black uppercase text-gray-400">Synchronisation...</p>
    </div>
  );

  return (
    <div className="space-y-12 max-w-7xl mx-auto animate-fade-in pb-32">
      <div className="space-y-6">
         <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full border border-gray-100 dark:border-gray-700 shadow-soft">
            <Zap size={14} className="text-amber-500 fill-amber-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{user?.schoolName || 'ESP Dakar'} • Officiel</span>
         </div>
         <div>
            <h2 className="text-5xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase leading-none">Bonjour, {user?.name?.split(' ')[0]}</h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-6 font-medium italic">Accédez à vos ressources académiques centralisées sur JangHup.</p>
         </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {metrics.map((m) => (
          <Link key={m.to} to={m.to} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-soft border border-gray-100 dark:border-gray-800 hover:scale-105 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-10 group-hover:scale-150 transition-transform" style={{ backgroundColor: m.color }} />
            <div className="p-4 rounded-2xl w-fit mb-6 text-white shadow-lg" style={{ backgroundColor: m.color }}>
               <m.icon size={24} />
            </div>
            <p className="text-3xl font-black italic text-gray-900 dark:text-white leading-none">{m.count}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{m.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between px-6">
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.4em] flex items-center gap-3 italic">
                 <Megaphone size={18} className="text-primary-500" /> Flux d'actualités
              </h3>
              <Link to="/announcements" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <ArrowRight size={20} className="text-gray-400" />
              </Link>
           </div>
           
           <div className="grid gap-6">
             {data.anns.map((ann) => (
               <div key={ann.id} onClick={() => navigate('/announcements')} className="bg-white dark:bg-gray-900 p-8 rounded-[3.5rem] shadow-soft border border-gray-100 dark:border-gray-800 hover:shadow-premium transition-all cursor-pointer group flex items-start gap-8">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center font-black text-gray-300 group-hover:bg-primary-500 group-hover:text-white transition-all shrink-0">
                    {ann.author?.charAt(0) || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xl font-black italic text-gray-900 dark:text-white truncate mb-2">{ann.title}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(ann.date).toLocaleDateString()} • {ann.author}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>

        <div className="space-y-12">
           <div className="bg-gray-900 dark:bg-black rounded-[4rem] p-10 text-white shadow-premium relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-8 italic opacity-60">Prochain Examen</h3>
                {data.exams.length > 0 ? (
                  <div className="space-y-6">
                     <h4 className="text-2xl font-black italic tracking-tighter leading-tight">{data.exams[0].subject}</h4>
                     <div className="flex items-center gap-3 text-xs font-bold text-primary-400 italic">
                        <Calendar size={14} /> {new Date(data.exams[0].date).toLocaleDateString()}
                     </div>
                  </div>
                ) : (
                  <p className="text-xs font-medium italic opacity-50">Aucune épreuve planifiée.</p>
                )}
                <Link to="/exams" className="mt-10 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                  Voir tout
                </Link>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
