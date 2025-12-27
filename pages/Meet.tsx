
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Video, Plus, Trash2, Loader2, Pencil, Radio, Clock, Copy, ChevronRight, 
  Share2, Globe, Link2, MessageCircle, ExternalLink, Calendar, 
  MonitorPlay, ShieldCheck, Bell, Info, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, MeetLink, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';

const PLATFORM_THEMES = {
  'Google Meet': { color: '#0ea5e9', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900/30' },
  'Zoom': { color: '#2563eb', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-100 dark:border-indigo-900/30' },
  'Teams': { color: '#4f46e5', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-100 dark:border-violet-900/30' },
  'Autre': { color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/30' }
};

export default function Meet() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  const isMounted = useRef(true);
  const themeColor = user?.themecolor || '#87CEEB';
  
  const [meetings, setMeetings] = useState<MeetLink[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    platform: 'Google Meet', 
    url: '', 
    day: 'Lundi', 
    time: '08:00', 
    classname: '' 
  });

  const canPost = useMemo(() => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;
  }, [user]);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await API.meet.list();
      if (isMounted.current) setMeetings(data);
    } catch (error) {
      addNotification({ title: 'Erreur Sync', message: 'Impossible de charger les salles de cours.', type: 'alert' });
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    isMounted.current = true;
    fetchMeetings();
    API.classes.list().then(data => { if(isMounted.current) setClasses(data); });
    return () => { isMounted.current = false; };
  }, [fetchMeetings]);

  const handleShareWhatsApp = (link: MeetLink) => {
    const text = `🎥 *COURS EN DIRECT JANGHUP*\n\n📘 *Matière* : ${link.title}\n⏰ *Horaire* : ${link.time}\n🏛️ *Classe* : ${link.classname}\n🔗 *Lien Direct* : ${link.url}\n\n👉 Connectez-vous 5 min avant le début !\n— _JANGHUP ESP_`;
    API.sharing.whatsapp(text);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Retirer cette salle du répertoire ?')) return;
    try {
      await API.meet.delete(id);
      addNotification({ title: 'Session Retirée', message: 'Le lien de direct a été supprimé.', type: 'info' });
      fetchMeetings();
    } catch (error) {
      addNotification({ title: 'Erreur', message: "Action technique échouée.", type: 'alert' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { 
        title: formData.title, 
        platform: formData.platform, 
        url: formData.url, 
        time: `${formData.day} à ${formData.time}`, 
        classname: user?.role === UserRole.ADMIN ? (formData.classname || 'Général') : (user?.classname || 'Général') 
      };

      if (editingId) {
        await API.meet.update(editingId, payload);
        addNotification({ title: 'Session Mise à jour', message: 'Les accès ont été modifiés.', type: 'success' });
      } else {
        await API.meet.create(payload);
        addNotification({ title: 'Direct Publié', message: 'Le lien est maintenant visible par tous les étudiants.', type: 'success' });
      }
      
      setIsModalOpen(false);
      fetchMeetings();
    } catch (error) {
      addNotification({ title: 'Erreur', message: "Enregistrement impossible.", type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLinks = useMemo(() => {
    return meetings.filter(link => {
      const target = link.classname || 'Général';
      if (user?.role === UserRole.ADMIN) {
        return adminViewClass ? (target === adminViewClass || target === 'Général') : true;
      }
      return target === user?.classname || target === 'Général';
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [meetings, user, adminViewClass]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-40 gap-8">
        <Loader2 className="animate-spin text-emerald-500" size={64} />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Initialisation des Salles Virtuelles...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-48 animate-fade-in px-4">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-8">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-premium transform -rotate-3 hover:rotate-0 transition-all">
              <Radio size={40} className="animate-pulse" />
           </div>
           <div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Directs</h2>
              <div className="flex items-center gap-4 mt-4">
                 <span className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase rounded-2xl border border-emerald-100 dark:border-emerald-900/30 italic flex items-center gap-2">
                   <MonitorPlay size={16} /> Cours Synchrone
                 </span>
              </div>
           </div>
        </div>
        
        {canPost && (
          <button 
            onClick={() => { 
              setEditingId(null); 
              setFormData({ title: '', platform: 'Google Meet', url: '', day: 'Lundi', time: '08:00', classname: user?.classname || '' }); 
              setIsModalOpen(true); 
            }} 
            className="w-full lg:w-auto bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-premium hover:brightness-110 active:scale-95 transition-all italic flex items-center justify-center gap-4"
          >
            <Plus size={24} /> Lancer un salon de cours
          </button>
        )}
      </div>

      {/* Meet Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filteredLinks.length > 0 ? filteredLinks.map(link => {
          const theme = PLATFORM_THEMES[link.platform as keyof typeof PLATFORM_THEMES] || PLATFORM_THEMES['Autre'];
          const canManage = user?.role === UserRole.ADMIN || user?.id === link.user_id;

          return (
            <div key={link.id} className="group bg-white dark:bg-slate-900 rounded-[4rem] p-10 shadow-soft border-2 border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-all flex flex-col relative overflow-hidden">
               {/* Vertical Platform Indicator */}
               <div className="absolute top-0 left-0 w-2.5 h-full transition-all" style={{ backgroundColor: theme.color }} />
               
               <div className="flex justify-between items-start mb-10">
                  <div className={`flex items-center gap-3 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${theme.bg} ${theme.border}`} style={{ color: theme.color }}>
                     <Globe size={14} /> {link.platform}
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handleShareWhatsApp(link)} className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-[1.5rem] hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90" title="Diffuser">
                        <MessageCircle size={20}/>
                     </button>
                     {canManage && (
                        <button onClick={() => handleDelete(link.id)} className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-[1.5rem] hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90">
                           <Trash2 size={20}/>
                        </button>
                     )}
                  </div>
               </div>

               <div className="flex-1 space-y-6 mb-10">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{link.classname}</p>
                    <h3 className="text-2xl md:text-3xl font-black italic text-slate-900 dark:text-white leading-tight uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">
                      {link.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <Clock size={22} className="text-emerald-500" />
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rendez-vous</p>
                       <p className="text-sm font-black italic text-slate-700 dark:text-slate-300">{link.time}</p>
                    </div>
                  </div>
               </div>

               <a 
                 href={link.url} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="w-full flex items-center justify-center gap-4 bg-emerald-500 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 hover:shadow-emerald-500/20 transition-all italic group/btn"
               >
                 Rejoindre le Direct <ChevronRight size={22} className="group-hover/btn:translate-x-2 transition-transform" />
               </a>
            </div>
          );
        }) : (
          <div className="col-span-full py-40 text-center bg-white dark:bg-slate-900 rounded-[5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-8">
             <Video size={80} className="text-slate-100 dark:text-slate-800 animate-pulse" />
             <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Aucune session de direct programmée.</p>
          </div>
        )}
      </div>

      {/* Management Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Modifier la session" : "Nouveau Direct JANGHUP"}>
        <form onSubmit={handleSave} className="space-y-8 py-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Titre / Matière du cours</label>
              <div className="relative">
                <MonitorPlay className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] font-black italic outline-none border-2 border-transparent focus:border-emerald-500 transition-all text-sm" placeholder="Ex: Algorithmique Avancée" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Plateforme</label>
                  <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer">
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Teams">Microsoft Teams</option>
                    <option value="Autre">Autre Lien</option>
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Classe</label>
                  <select value={formData.classname} onChange={e => setFormData({...formData, classname: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer">
                    <option value="Général">Toutes les classes</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Lien URL du salon</label>
              <div className="relative">
                <Link2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input required type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] font-bold italic outline-none border-2 border-transparent focus:border-emerald-500 transition-all text-sm" placeholder="https://meet.google.com/..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Jour</label>
                  <select value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer">
                    {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Heure</label>
                  <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-bold text-sm border-none outline-none shadow-sm" />
               </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full py-6 bg-emerald-500 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-premium active:scale-95 transition-all italic flex items-center justify-center gap-4 hover:bg-emerald-600"
          >
            {submitting ? <Loader2 className="animate-spin" size={24} /> : (editingId ? "Mettre à jour le salon" : "Diffuser le Direct")}
          </button>
        </form>
      </Modal>

      {/* Info Legend */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-10 gap-10 opacity-50">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest italic">Live / Synchrone</span></div>
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-slate-300" /><span className="text-[10px] font-black uppercase tracking-widest italic">Historique</span></div>
          </div>
          <div className="flex items-center gap-6 text-slate-400 italic">
             <ShieldCheck size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.5em]">SÉCURITÉ SSL JANGHUP</span>
          </div>
      </div>
    </div>
  );
}
