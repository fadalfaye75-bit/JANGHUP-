
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Plus, Trash2, Loader2, Pencil, Megaphone, Search, Bookmark, Maximize2,
  ExternalLink, MessageCircle, Link as LinkIcon, Copy, Share2, AlertCircle, X,
  Globe, Video, FileText, Link2, PlusCircle, CheckCircle2, ChevronRight, Hash, Type, Info, ClipboardCopy
} from 'lucide-react';
import { UserRole, Announcement, AnnouncementPriority, ExternalLink as ExtLinkType, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

export default function Announcements() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const themeColor = user?.themecolor || '#87CEEB';
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingAnn, setViewingAnn] = useState<Announcement | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAnn, setNewAnn] = useState({ 
    title: '', content: '', priority: 'normal' as AnnouncementPriority, 
    classname: 'Général', links: [] as ExtLinkType[] 
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [anns, cls] = await Promise.all([
        API.announcements.list(),
        API.classes.list()
      ]);
      setAnnouncements(anns);
      setClasses(cls);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const sub = API.announcements.subscribe(fetchAll);
    return () => { sub.unsubscribe(); };
  }, [fetchAll]);

  const getWhatsAppTemplate = (ann: Announcement) => {
    const appUrl = window.location.origin + "/#/announcements";
    return `📢 *Information Importante – JANGHUP*\n\n🔔 *${ann.title}*\n📅 ${new Date(ann.date).toLocaleDateString()}\n📘 ${ann.content}\n\n👉 Consultez les détails ici :\n🔗 ${appUrl}\n\n— JANGHUP\nPlateforme académique officielle`;
  };

  const handleCopyTemplate = (ann: Announcement) => {
    const text = getWhatsAppTemplate(ann);
    navigator.clipboard.writeText(text);
    addNotification({ title: 'Copié', message: 'Modèle WhatsApp copié avec signature.', type: 'success' });
  };

  const handleShareWhatsApp = (ann: Announcement) => {
    API.sharing.whatsapp(getWhatsAppTemplate(ann));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAnn.title.length < 5 || newAnn.content.length < 10) {
      addNotification({ title: 'Formulaire incomplet', message: 'Veuillez vérifier les champs.', type: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) await API.announcements.update(editingId, newAnn);
      else await API.announcements.create(newAnn);
      setIsModalOpen(false);
      addNotification({ title: 'Succès', message: 'Annonce publiée.', type: 'success' });
      fetchAll();
    } catch (e: any) {
      addNotification({ title: 'Erreur', message: "Échec de publication.", type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      await API.announcements.delete(id);
      addNotification({ title: 'Supprimé', message: 'Annonce retirée.', type: 'info' });
      fetchAll();
    } catch (e) {
      addNotification({ title: 'Erreur', message: "Action impossible.", type: 'alert' });
    }
  };

  const filteredAnns = useMemo(() => {
    return announcements.filter(a => 
      (a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (user?.role === UserRole.ADMIN || a.classname === 'Général' || a.classname === user?.classname)
    );
  }, [announcements, searchTerm, user]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Synchronisation des annonces...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 text-white rounded-[1.8rem] flex items-center justify-center shadow-premium" style={{ backgroundColor: themeColor }}><Megaphone size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Annonces</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Communication Officielle JANGHUP</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input type="text" placeholder="Filtrer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl text-[11px] font-bold outline-none border border-slate-100 dark:border-slate-800" />
          </div>
          {API.auth.canPost(user) && (
            <button onClick={() => { setEditingId(null); setNewAnn({ title: '', content: '', priority: 'normal', classname: 'Général', links: [] }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-8 py-4.5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-premium hover:brightness-110 active:scale-95 transition-all italic whitespace-nowrap"><Plus size={18} /> Publier</button>
          )}
        </div>
      </div>

      <div className="grid gap-8">
        {filteredAnns.map((ann) => {
          const isAuthor = user?.id === ann.user_id;
          const isAdmin = user?.role === UserRole.ADMIN;
          const canManage = isAuthor || isAdmin;
          return (
            <div key={ann.id} className="group bg-white dark:bg-gray-900 rounded-[3.5rem] p-8 md:p-12 shadow-soft border-2 border-transparent hover:border-brand-100 transition-all flex flex-col md:flex-row gap-10 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2.5 h-full transition-all ${ann.priority === 'urgent' ? 'bg-rose-500 shadow-[2px_0_15px_rgba(244,63,94,0.3)]' : 'bg-brand'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full text-white shadow-sm ${ann.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : ann.priority === 'important' ? 'bg-amber-500' : 'bg-slate-900'}`}>{ann.priority}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{ann.classname} • {new Date(ann.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white italic tracking-tighter mb-5 uppercase leading-tight group-hover:text-brand transition-colors">{ann.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 italic text-sm line-clamp-3 leading-relaxed mb-6">{ann.content}</p>
                <button onClick={() => setViewingAnn(ann)} className="text-[10px] font-black uppercase text-brand flex items-center gap-2 tracking-widest hover:translate-x-1 transition-transform">Plein écran <Maximize2 size={14} /></button>
              </div>
              <div className="flex md:flex-col items-center justify-center gap-3 md:pl-10 md:border-l border-gray-100 dark:border-gray-800 shrink-0">
                <button onClick={() => handleShareWhatsApp(ann)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90" title="Partager WhatsApp"><MessageCircle size={20}/></button>
                <button onClick={() => handleCopyTemplate(ann)} className="p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90" title="Copier le modèle"><ClipboardCopy size={20}/></button>
                {canManage && (
                  <>
                    <button onClick={() => { setEditingId(ann.id); setNewAnn({ title: ann.title, content: ann.content, priority: ann.priority, classname: ann.classname, links: ann.links || [] }); setIsModalOpen(true); }} className="p-4 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-sm active:scale-90" title="Modifier"><Pencil size={20}/></button>
                    <button onClick={() => handleDelete(ann.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90" title="Supprimer"><Trash2 size={20}/></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Éditer l'annonce" : "Nouvelle Publication JANGHUP"}>
        <form onSubmit={handleSave} className="space-y-8 py-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 italic">Titre de l'annonce</label>
              <input required value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-2 transition-all focus:border-brand" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 italic">Contenu détaillé</label>
              <textarea required rows={5} value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-2 transition-all focus:border-brand" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-5 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-premium active:scale-95 transition-all italic" style={{ backgroundColor: themeColor }}>
            {submitting ? <Loader2 className="animate-spin" size={20} /> : "Diffuser l'information"}
          </button>
        </form>
      </Modal>

      {viewingAnn && (
        <Modal isOpen={!!viewingAnn} onClose={() => setViewingAnn(null)} title={viewingAnn.title}>
           <div className="space-y-8 italic">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">{viewingAnn.content}</p>
              <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                 <span>PAR {viewingAnn.author}</span>
                 <span>{new Date(viewingAnn.date).toLocaleDateString()}</span>
              </div>
           </div>
        </Modal>
      )}
    </div>
  );
}
