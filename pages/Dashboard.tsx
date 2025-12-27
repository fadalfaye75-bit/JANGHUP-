
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { Announcement, Exam, UserRole, Poll, MeetLink } from '../types';
import { 
  GraduationCap, Loader2, BarChart2, Calendar, Radio, Megaphone, 
  Clock, Sparkles, ChevronRight, Bell, MapPin, AlertTriangle
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Dashboard() {
  const { user, adminViewClass } = useAuth();
  const { notifications } = useNotification();
  const navigate = useNavigate();
  
  const [data, setData] = useState({
    anns: [] as Announcement[],
    exams: [] as Exam[],
    polls: [] as Poll[]
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [anns, exams, polls] = await Promise.all([
          API.announcements.list(5),
          API.exams.list(),
          API.polls.list()
      ]);
      setData({ anns, exams, polls });
    } catch (error) {
      console.warn("[Dashboard] Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const sub = API.announcements.subscribe(fetchData);
    return () => { sub.unsubscribe(); };
  }, [fetchData]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <Loader2 className="animate-spin text-brand" size={56} />
      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Synchronisation JANGHUP...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in pb-32">
      {/* Hero Section */}
      <section className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 md:p-16 shadow-premium border border-slate-50 dark:border-slate-800 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
            <div className="space-y-6">
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <Sparkles size={14} className="animate-pulse" /> Espace Premium • ESP
               </div>
               <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-[0.8]">
                  Salut, <br/><span className="text-brand">{user?.name.split(' ')[0]} 👋</span>
               </h1>
               <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-lg leading-relaxed">
                  Bienvenue sur votre portail unifié. Retrouvez ici vos cours, plannings et annonces synchronisés en temps réel.
               </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-inner text-center">
                  <p className="text-5xl font-black italic text-brand tracking-tighter">{data.anns.length}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Signaux</p>
               </div>
               <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-premium text-center">
                  <p className="text-5xl font-black italic text-white tracking-tighter">{data.exams.length}</p>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-2">Examens</p>
               </div>
            </div>
         </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between px-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.4em] italic flex items-center gap-3">
                 <Bell size={18} className="text-brand" /> Dernières Annonces
              </h3>
              <Link to="/announcements" className="text-brand flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:translate-x-1 transition-transform italic">Voir tout <ChevronRight size={16} /></Link>
           </div>
           
           <div className="space-y-4">
             {data.anns.map((ann) => (
               <div key={ann.id} onClick={() => navigate('/announcements')} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-soft border border-transparent hover:border-brand/20 transition-all cursor-pointer group flex items-center gap-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-lg ${ann.priority === 'urgent' ? 'bg-rose-500' : 'bg-brand'}`}>
                    {ann.author?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black italic text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-brand transition-colors truncate">
                      {ann.title}
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                      <Clock size={12} /> {new Date(ann.date).toLocaleDateString('fr-FR')} • {ann.classname}
                    </p>
                  </div>
                  <ChevronRight size={24} className="text-slate-100 group-hover:text-brand transition-all" />
               </div>
             ))}
           </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 -mr-16 -mt-16 rounded-full group-hover:scale-125 transition-transform duration-700" />
              <div className="flex items-center gap-4 mb-10 relative z-10">
                 <div className="p-3 bg-brand/20 rounded-xl text-brand"><Calendar size={24}/></div>
                 <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Prochain Examen</h3>
              </div>
              {data.exams.length > 0 ? (
                <div className="space-y-6 relative z-10">
                   <h4 className="text-3xl font-black italic tracking-tighter leading-tight uppercase">{data.exams[0].subject}</h4>
                   <div className="flex items-center gap-4 text-xs font-bold text-slate-400 italic">
                      <Clock size={18} className="text-brand" /> {new Date(data.exams[0].date).toLocaleString('fr-FR', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'})}
                   </div>
                   <div className="flex items-center gap-4 text-xs font-bold text-slate-400 italic">
                      <MapPin size={18} className="text-brand" /> {data.exams[0].room}
                   </div>
                </div>
              ) : (
                <p className="text-xs italic text-slate-500">Aucune épreuve planifiée.</p>
              )}
           </div>

           <div onClick={() => navigate('/polls')} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-soft border border-slate-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer hover:shadow-premium transition-all">
              <div className="flex items-center gap-6">
                 <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"><BarChart2 size={24}/></div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultations</p>
                    <p className="text-sm font-black italic text-slate-900 dark:text-white uppercase">Urnes Actives</p>
                 </div>
              </div>
              <ChevronRight size={24} className="text-slate-200 group-hover:text-emerald-500 transition-all" />
           </div>
        </div>
      </div>
    </div>
  );
}
