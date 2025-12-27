
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Video, Plus, Trash2, Loader2, Pencil, Radio, Clock, Copy, ChevronRight, Share2, Globe, Link2, MessageCircle, Mail
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
    title: '', platform: 'Google Meet', url: '', day: 'Lundi', time: '', classname: '' 
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

  const handleShareWhatsApp = useCallback((link: MeetLink) => {
    const text = `🎥 *DIRECT ACADÉMIQUE JANGHUP*\n\n📘 *${link.title}*\n⏰ ${link.time}\n🔗 Lien : ${link.url}\n\n👉 Connectez-vous à l'heure !\n— JANGHUP\nPlateforme académique officielle`;
    API.sharing.whatsapp(text);
  }, []);

  const handleShareEmail = useCallback((link: MeetLink) => {
    const classObj = classes.find(c => c.name === link.classname);
    const to = classObj?.email || '';
    const subject = `🎥 [Direct] ${link.title} – JANGHUP`;
    const body = `Bonjour,\n\nUn nouveau cours en direct a été programmé sur la plateforme JANGHUP.\n\nDétails :\n\n📘 Matière : ${link.title}\n📅 Date : ${link.time}\n🔗 Lien d'accès : ${link.url}\n\nNous vous prions d'être ponctuel.\n\nCordialement,\n\n— JANGHUP\nPlateforme académique officielle`;
    API.sharing.email(to, subject, body);
  }, [classes]);

  const handleCopy = useCallback((link: MeetLink) => {
    const text = `🎥 Cours en direct : ${link.title}\n⏰ ${link.time}\n🔗 ${link.url}`;
    navigator.clipboard.writeText(text);
    addNotification({ title: 'Copié', message: 'Lien copié.', type: 'success' });
  }, [addNotification]);

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
      const target = link.classname || 'Général';
      return isAdmin 
        ? (adminViewClass ? (target === adminViewClass || target === 'Général') : true)
        : (target === user?.classname || target === 'Général');
    });
  }, [meetings, isAdmin, adminViewClass, user?.classname]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 gap-6">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Chargement des sessions...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in px-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-premium"><Radio size={36} className="animate-pulse" /></div>
           <div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-none">Directs</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3">Salles de Cours JANGHUP</p>
           </div>
        </div>
        {canPost && (
          <button onClick={() => { setEditingId(null); setFormData({ title: '', platform: 'Google Meet', url: '', day: 'Lundi', time: '', classname: isAdmin ? '' : (user?.classname || '') }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-12 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest shadow-premium hover:scale-105 transition-all flex items-center gap-3"><Plus size={20} /> Nouveau salon</button>
        )}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filteredLinks.map(link => {
          const plat = PLATFORM_ICONS[link.platform as keyof typeof PLATFORM_ICONS] || PLATFORM_ICONS['Autre'];
          const canManage = isAdmin || (user?.id === link.user_id);
          return (
            <div key={link.id} className="group bg-white dark:bg-slate-900 rounded-[4rem] p-10 shadow-soft border-2 border-transparent hover:border-emerald-100 transition-all flex flex-col relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2.5 h-full" style={{ backgroundColor: plat.color }} />
               <div className="flex justify-between items-start mb-10">
                  <div className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${plat.bg} ${plat.border}`} style={{ color: plat.color }}>{link.platform}</div>
                  <div className="flex gap-2">
                     <button onClick={() => handleShareWhatsApp(link)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 transition-all active:scale-90" title="WhatsApp"><MessageCircle size={18}/></button>
                     <button onClick={() => handleShareEmail(link)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-500 transition-all active:scale-90" title="Email"><Mail size={18}/></button>
                     {canManage && <button onClick={() => handleDelete(link.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 transition-all active:scale-90"><Trash2 size={18}/></button>}
                  </div>
               </div>
               <h3 className="text-2xl font-black italic text-slate-900 dark:text-white leading-tight uppercase min-h-[3rem] mb-4">{link.title}</h3>
               <div className="flex items-center gap-3 text-sm font-black text-slate-900 dark:text-white mb-8"><Clock size={18} className="text-emerald-500" /> {link.time}</div>
               <a href={link.url} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-4 bg-emerald-500 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all italic group/btn">Rejoindre le Direct <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" /></a>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Modifier" : "Lancer un Direct JANGHUP"}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const payload = { title: formData.title, platform: formData.platform, url: formData.url, time: `${formData.day} à ${formData.time}`, classname: isAdmin ? formData.classname : (user?.classname || 'Général') };
            if (editingId) await API.meet.update(editingId, payload);
            else await API.meet.create(payload);
            fetchMeetings();
            setIsModalOpen(false);
            addNotification({ title: 'Succès', message: 'Salon enregistré.', type: 'success' });
          } catch (error) { addNotification({ title: 'Erreur', message: "Échec.", type: 'alert' }); }
          finally { setSubmitting(false); }
        }} className="space-y-6">
          <input required placeholder="Sujet de la séance" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold italic border-none" />
          <input required placeholder="https://..." value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold border-none" />
          <button type="submit" disabled={submitting} className="w-full bg-emerald-500 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase italic text-[11px] tracking-widest">{submitting ? <Loader2 className="animate-spin mx-auto" /> : "Publier le salon"}</button>
        </form>
      </Modal>
    </div>
  );
}
