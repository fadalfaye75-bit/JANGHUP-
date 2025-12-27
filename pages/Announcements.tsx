
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Plus, Trash2, Loader2, Pencil, Megaphone, Search, Maximize2,
  MessageCircle, Link as LinkIcon, ClipboardCopy, Mail, Clock, 
  ChevronRight, AlertCircle, Share2, Check, X, Info, ExternalLink,
  Bell, Filter
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
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    priority: 'normal' as AnnouncementPriority, 
    classname: 'Général', 
    link: '' 
  });
  
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
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const sub = API.announcements.subscribe(fetchAll);
    return () => { sub.unsubscribe(); };
  }, [fetchAll]);

  const canManage = useMemo(() => API.auth.canPost(user), [user]);

  const getWhatsAppTemplate = (ann: Announcement) => {
    const appUrl = window.location.origin + "/#/announcements";
    const linkSection = ann.link ? `\n\n🔗 *Lien utile* : ${ann.link}` : '';
    const priorityEmoji = ann.priority === 'urgent' ? '🚨' : ann.priority === 'important' ? '⚠️' : '📢';
    
    return `${priorityEmoji} *ANNONCE JANGHUP - ${ann.classname}*\n\n🔔 *${ann.title}*\n\n📝 ${ann.content}${linkSection}\n\n👉 *Consultez l'application pour plus de détails* :\n${appUrl}\n\n— _Service de communication JangHup_`;
  };

  const handleCopyTemplate = (ann: Announcement) => {
    const text = getWhatsAppTemplate(ann);
    navigator.clipboard.writeText(text);
    addNotification({ title: 'Copié !', message: 'Le texte est prêt à être collé sur WhatsApp.', type: 'success' });
  };

  const handleShareWhatsApp = (ann: Announcement) => {
    API.sharing.whatsapp(getWhatsAppTemplate(ann));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.length < 3 || formData.content.length < 5) {
      addNotification({ title: 'Champs requis', message: 'Veuillez remplir correctement le titre et le contenu.', type: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await API.announcements.update(editingId, formData);
        addNotification({ title: 'Mise à jour', message: 'Annonce actualisée avec succès.', type: 'success' });
      } else {
        await API.announcements.create(formData);
        addNotification({ title: 'Signal émis', message: 'Votre annonce est maintenant en ligne.', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchAll();
    } catch (e: any) {
      addNotification({ title: 'Erreur', message: "Échec de l'opération technique.", type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer définitivement cette annonce ?")) return;
    try {
      await API.announcements.delete(id);
      addNotification({ title: 'Supprimé', message: 'Le signal a été retiré du flux.', type: 'info' });
      fetchAll();
    } catch (e) {
      addNotification({ title: 'Erreur', message: "Action refusée par le serveur.", type: 'alert' });
    }
  };

  const filteredAnns = useMemo(() => {
    return announcements.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           a.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = user?.role === UserRole.ADMIN || a.classname === 'Général' || a.classname === user?.classname;
      return matchesSearch && matchesClass;
    });
  }, [announcements, searchTerm, user]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-40 gap-6">
      <Loader2 className="animate-spin text-brand" size={64} />
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Synchronisation des annonces...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-48 animate-fade-in px-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-8">
           <div className="w-16 h-16 sm:w-20 sm:h-20 text-white rounded-[2.5rem] flex items-center justify-center shadow-premium transform -rotate-3 hover:rotate-0 transition-transform duration-500" style={{ backgroundColor: themeColor }}>
              <Megaphone size={36} />
           </div>
           <div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Annonces</h2>
              <div className="flex items-center gap-4 mt-4">
                <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase rounded-xl border border-slate-200 dark:border-slate-700 italic flex items-center gap-2">
                  <Bell size={14} /> Flux Actif
                </span>
              </div>
           </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Filtrer les actualités..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               className="w-full pl-16 pr-6 py-5 bg-white dark:bg-slate-900 rounded-[1.8rem] text-[12px] font-bold outline-none border border-slate-100 dark:border-slate-800 shadow-soft focus:ring-4 focus:ring-brand-50 transition-all" 
             />
          </div>
          {canManage && (
            <button 
              onClick={() => { 
                setEditingId(null); 
                setFormData({ title: '', content: '', priority: 'normal', classname: user?.classname || 'Général', link: '' }); 
                setIsModalOpen(true); 
              }} 
              className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-premium hover:brightness-110 active:scale-95 transition-all italic"
            >
              <Plus size={20} /> Diffuser
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="grid gap-12">
        {filteredAnns.length > 0 ? filteredAnns.map((ann) => {
          const isUrgent = ann.priority === 'urgent';
          const isImportant = ann.priority === 'important';
          const isAuthor = user?.id === ann.user_id;
          const isAdmin = user?.role === UserRole.ADMIN;
          const hasRights = isAuthor || isAdmin;

          return (
            <div key={ann.id} className="group bg-white dark:bg-slate-900 rounded-[4.5rem] p-10 md:p-14 shadow-soft border-2 border-transparent hover:border-brand-100 transition-all flex flex-col md:flex-row gap-12 relative overflow-visible">
              {/* Vertical Indicator */}
              <div className={`absolute top-0 left-0 w-3 h-full transition-all rounded-l-[4.5rem] ${isUrgent ? 'bg-rose-500 shadow-[4px_0_20px_rgba(244,63,94,0.4)] animate-pulse' : isImportant ? 'bg-amber-500 shadow-[4px_0_15px_rgba(245,158,11,0.2)]' : 'bg-brand'}`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <span className={`text-[10px] font-black uppercase px-5 py-2 rounded-full text-white shadow-sm italic ${isUrgent ? 'bg-rose-500' : isImportant ? 'bg-amber-500' : 'bg-slate-900'}`}>
                    {ann.priority}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700 italic">
                    {ann.classname} • {new Date(ann.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'})}
                  </span>
                </div>

                <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter mb-8 uppercase leading-tight group-hover:text-brand transition-colors break-words">
                  {ann.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-6 mb-8">
                  {ann.email && (
                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 italic">
                      <Mail size={16} className="text-brand" />
                      <span>{ann.email}</span>
                    </div>
                  )}
                  {ann.link && (
                    <a href={ann.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[11px] font-black text-brand italic hover:underline bg-brand/5 px-5 py-2.5 rounded-2xl border border-brand/10 shadow-inner">
                      <LinkIcon size={14} />
                      <span>Lien de ressource / Formulaire</span>
                    </a>
                  )}
                </div>

                <p className="text-slate-600 dark:text-slate-300 italic text-base leading-relaxed mb-10 whitespace-pre-wrap line-clamp-5 font-medium">
                  {ann.content}
                </p>

                <button 
                  onClick={() => setViewingAnn(ann)} 
                  className="text-[11px] font-black uppercase text-brand flex items-center gap-3 tracking-widest hover:translate-x-3 transition-transform italic border-b-2 border-brand/20 pb-1"
                >
                  Lire tout le message <Maximize2 size={16} />
                </button>
              </div>

              {/* Action Buttons Container */}
              <div className="flex md:flex-col items-center justify-center gap-4 md:pl-12 md:border-l border-slate-100 dark:border-slate-800 shrink-0">
                <button 
                  onClick={() => handleShareWhatsApp(ann)} 
                  className="p-5 bg-emerald-50 text-emerald-600 rounded-[2rem] hover:bg-emerald-500 hover:text-white transition-all shadow-premium active:scale-90" 
                  title="Partager sur WhatsApp"
                >
                  <MessageCircle size={26}/>
                </button>
                <button 
                  onClick={() => handleCopyTemplate(ann)} 
                  className="p-5 bg-slate-50 text-slate-500 rounded-[2rem] hover:bg-slate-900 hover:text-white transition-all shadow-premium active:scale-90" 
                  title="Copier pour mobile"
                >
                  <ClipboardCopy size={26}/>
                </button>
                {hasRights && (
                  <>
                    <div className="hidden md:block w-8 h-[1px] bg-slate-100 dark:bg-slate-800 my-2" />
                    <button 
                      onClick={() => { 
                        setEditingId(ann.id); 
                        setFormData({ title: ann.title, content: ann.content, priority: ann.priority, classname: ann.classname, link: ann.link || '' }); 
                        setIsModalOpen(true); 
                      }} 
                      className="p-5 bg-blue-50 text-blue-500 rounded-[2rem] hover:bg-blue-500 hover:text-white transition-all shadow-premium active:scale-90"
                    >
                      <Pencil size={26}/>
                    </button>
                    <button 
                      onClick={() => handleDelete(ann.id)} 
                      className="p-5 bg-rose-50 text-rose-500 rounded-[2rem] hover:bg-rose-500 hover:text-white transition-all shadow-premium active:scale-90"
                    >
                      <Trash2 size={26}/>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="py-40 text-center bg-white dark:bg-slate-900 rounded-[5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-8">
             <Megaphone size={80} className="text-slate-100 dark:text-slate-800 animate-pulse" />
             <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Aucune annonce interceptée pour le moment.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Éditer le signal" : "Nouvelle Diffusion"}>
        <form onSubmit={handleSave} className="space-y-8 py-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Sujet principal</label>
              <input 
                required 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] font-black italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm" 
                placeholder="Ex: Report du DS d'Algèbre" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Urgence</label>
                  <select 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: e.target.value as AnnouncementPriority})} 
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer"
                  >
                    <option value="normal">Standard</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Public cible</label>
                  <select 
                    value={formData.classname} 
                    onChange={e => setFormData({...formData, classname: e.target.value})} 
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer"
                  >
                    <option value="Général">Toutes les classes</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Détails du message</label>
              <textarea 
                required 
                rows={6} 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})} 
                className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] font-bold italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm leading-relaxed" 
                placeholder="Décrivez précisément l'information..." 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Lien Google Forms / Drive</label>
              <div className="relative">
                <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="url" 
                  value={formData.link} 
                  onChange={e => setFormData({...formData, link: e.target.value})} 
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-bold italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm" 
                  placeholder="https://docs.google.com/..." 
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full py-6 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-premium active:scale-95 transition-all italic flex items-center justify-center gap-4" 
            style={{ backgroundColor: themeColor }}
          >
            {submitting ? <Loader2 className="animate-spin" size={24} /> : (editingId ? "Actualiser le signal" : "Émettre l'annonce")}
          </button>
        </form>
      </Modal>

      {/* Reader Modal (Full View) */}
      {viewingAnn && (
        <Modal isOpen={!!viewingAnn} onClose={() => setViewingAnn(null)} title={viewingAnn.title}>
           <div className="space-y-10 italic">
              <div className="p-10 bg-slate-50 dark:bg-slate-800/50 rounded-[4rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                 <p className="text-slate-700 dark:text-slate-300 leading-loose text-lg whitespace-pre-wrap font-medium">
                   {viewingAnn.content}
                 </p>
              </div>
              
              {viewingAnn.link && (
                <div className="p-8 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-brand/20 flex flex-col sm:flex-row items-center justify-between gap-8 shadow-soft">
                   <div className="flex items-center gap-8">
                      <div className="w-16 h-16 bg-brand/10 rounded-3xl flex items-center justify-center text-brand shadow-sm shrink-0">
                         <LinkIcon size={32} />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Ressource externe jointe</p>
                         <p className="text-sm font-black truncate max-w-[300px] italic text-brand">{viewingAnn.link}</p>
                      </div>
                   </div>
                   <a 
                     href={viewingAnn.link} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="w-full sm:w-auto bg-brand text-white px-10 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:brightness-110 transition-all text-center italic flex items-center justify-center gap-3"
                   >
                     Accéder <ExternalLink size={16} />
                   </a>
                </div>
              )}

              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] gap-8 italic">
                 <div className="flex flex-col gap-2">
                   <span>Posté par {viewingAnn.author}</span>
                   {viewingAnn.email && <span className="text-brand lowercase font-black underline decoration-2">{viewingAnn.email}</span>}
                 </div>
                 <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 px-6 py-3 rounded-full border border-slate-100 dark:border-slate-700">
                   <Clock size={16} className="text-brand"/> Le {new Date(viewingAnn.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                 </div>
              </div>
           </div>
        </Modal>
      )}
    </div>
  );
}
