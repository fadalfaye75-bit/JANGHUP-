
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Video, Plus, Trash2, Loader2, Pencil, Radio, Clock, Copy, ChevronRight, Share2, Globe, Link2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, MeetLink, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';

const PLATFORM_ICONS = {
  'Google Meet': { color: '#0ea5e9', bg: 'bg-blue-50', border: 'border-blue-100' },
  'Zoom': { color: '#2563eb', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  'Teams': { color: '#4f46e5', bg: 'bg-violet-50', border: 'border-violet-100' },
  'Autre': { color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100' }
};

export default function Meet() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  const isMounted = useRef(true);
  
  const [meetings, setMeetings] = useState<MeetLink[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', platform: 'Google Meet', url: '', day: 'Lundi', time: '', className: '' 
  });

  const isAdmin = user?.role === UserRole.ADMIN;
  const isDelegate = user?.role === UserRole.DELEGATE;
  const canPost = isAdmin || isDelegate;

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await API.meet.list();
      if (isMounted.current) setMeetings(data);
    } catch (error) {
      addNotification({ title: 'Erreur', message: 'Chargement échoué.', type: 'alert' });
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

  const handleCopy = useCallback((link: MeetLink) => {
    const text = `🎥 Cours en direct : ${link.title}\n⏰ ${link.time}\n🔗 ${link.url}`;
    navigator.clipboard.writeText(text);
    addNotification({ title: 'Copié', message: 'Lien copié.', type: 'success' });
  }, [addNotification]);

  const handleShare = useCallback((link: MeetLink) => {
    const text = `🎥 *COURS EN DIRECT*\n\n📚 Matière : *${link.title}*\n⏰ Heure : *${link.time}*\n🔗 Lien : ${link.url}\n\n🎓 _Via JangHup ESP_`;
    API.sharing.whatsapp(text);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Supprimer ce lien ?')) return;
    try {
      await API.meet.delete(id);
      fetchMeetings();
      addNotification({ title: 'Supprimé', message: 'Lien retiré.', type: 'info' });
    } catch (error) {
      addNotification({ title: 'Erreur', message: "Échec.", type: 'alert' });
    }
  }, [fetchMeetings, addNotification]);

  const filteredLinks = useMemo(() => {
    return meetings.filter(link => {
      const target = link.className || 'Général';
      return isAdmin 
        ? (adminViewClass ? (target === adminViewClass || target === 'Général') : true)
        : (target === user?.className || target === 'Général');
    });
  }, [meetings, isAdmin, adminViewClass, user?.className]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 gap-6">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse italic">Synchronisation des flux...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in px-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-gray-100 dark:border-gray-800 pb-12">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-premium"><Radio size={36} className="animate-pulse" /></div>
           <div>
              <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase leading-none">Visioconférences</h2>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-3">Directs académiques JANGHUP</p>
           </div>
        </div>
        
        {canPost && (
          <button 
            onClick={() => { setEditingId(null); setFormData({ title: '', platform: 'Google Meet', url: '', day: 'Lundi', time: '', className: isAdmin ? '' : (user?.className || '') }); setIsModalOpen(true); }} 
            className="bg-gray-900 dark:bg-black text-white px-12 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest shadow-premium hover:bg-black transition-all italic flex items-center justify-center gap-3"
          >
            <Plus size={20} /> Programmer un direct
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filteredLinks.map(link => {
          const plat = PLATFORM_ICONS[link.platform as keyof typeof PLATFORM_ICONS] || PLATFORM_ICONS['Autre'];
          const canManage = isAdmin || (user?.id === link.user_id);
          
          return (
            <div key={link.id} className="group bg-white dark:bg-gray-900 rounded-[4rem] p-10 shadow-soft border-2 border-transparent hover:border-emerald-100 transition-all flex flex-col relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2.5 h-full" style={{ backgroundColor: plat.color }} />
               
               <div className="flex justify-between items-start mb-10">
                  <div className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${plat.bg} ${plat.border}`} style={{ color: plat.color }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: plat.color }} />
                    {link.platform}
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handleShare(link)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Share2 size={18}/></button>
                     <button onClick={() => handleCopy(link)} className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-900 hover:text-white transition-all shadow-sm"><Copy size={18}/></button>
                     {canManage && (
                       <>
                         <button onClick={() => { 
                           setEditingId(link.id); 
                           const parts = link.time.split(' à ');
                           setFormData({ title: link.title, platform: link.platform, url: link.url, day: parts[0] || 'Lundi', time: parts[1] || '', className: link.className });
                           setIsModalOpen(true);
                         }} className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"><Pencil size={18}/></button>
                         <button onClick={() => handleDelete(link.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                       </>
                     )}
                  </div>
               </div>

               <div className="flex-1 space-y-4">
                  <h3 className="text-2xl font-black italic tracking-tighter text-gray-900 dark:text-white leading-tight uppercase min-h-[3rem]">{link.title}</h3>
                  <div className="flex flex-col gap-3 text-gray-500">
                     <div className="flex items-center gap-3">
                        <Clock size={18} className="text-emerald-500 shrink-0" />
                        <span className="text-sm font-black italic text-gray-900 dark:text-white">{link.time}</span>
                     </div>
                  </div>
               </div>

               <div className="mt-12">
                  <a href={link.url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-4 bg-emerald-500 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all italic active:scale-95 group/btn">
                    Rejoindre le salon <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                  </a>
               </div>
            </div>
          );
        })}
        {filteredLinks.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 py-24 text-center bg-white dark:bg-gray-900 rounded-[4rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
             <Video size={48} className="mx-auto text-gray-100 mb-6" />
             <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">Aucun cours en direct programmé</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Modifier le salon" : "Nouveau Direct"}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const payload = { 
              title: formData.title,
              platform: formData.platform,
              url: formData.url,
              time: `${formData.day} à ${formData.time}`, 
              className: isAdmin ? formData.className : (user?.className || 'Général') 
            };
            
            if (editingId) await API.meet.update(editingId, payload);
            else await API.meet.create(payload);
            
            fetchMeetings();
            setIsModalOpen(false);
            addNotification({ title: 'Succès', message: 'Salon enregistré.', type: 'success' });
          } catch (error) { addNotification({ title: 'Erreur', message: "Échec de l'enregistrement.", type: 'alert' }); }
          finally { setSubmitting(false); }
        }} className="space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Titre de la séance / Matière</label>
            <input required placeholder="ex: Analyse Mathématique - TD" type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-bold italic outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Plateforme</label>
              <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase outline-none">
                   <option value="Google Meet">Google Meet</option>
                   <option value="Zoom">Zoom</option>
                   <option value="Teams">Teams</option>
                   <option value="Autre">Autre</option>
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Heure</label>
              <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold outline-none" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Jour</label>
            <select required value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase outline-none">
                 <option value="Lundi">Lundi</option>
                 <option value="Mardi">Mardi</option>
                 <option value="Mercredi">Mercredi</option>
                 <option value="Jeudi">Jeudi</option>
                 <option value="Vendredi">Vendredi</option>
                 <option value="Samedi">Samedi</option>
                 <option value="Dimanche">Dimanche</option>
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">URL d'accès</label>
            <input required placeholder="https://meet.google.com/..." type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold italic outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Cible</label>
             <select required value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase outline-none">
                <option value="Général">Tous (Général)</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
             </select>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-emerald-500 text-white font-black py-5 rounded-[2rem] shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase italic text-[11px] tracking-widest">
            {submitting ? <Loader2 className="animate-spin mx-auto" /> : (editingId ? "Sauvegarder les changements" : "Démarrer le programme")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
