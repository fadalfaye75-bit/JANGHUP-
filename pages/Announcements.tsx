
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Plus, Trash2, Loader2, Pencil, Megaphone, Search, Bookmark, Maximize2,
  ExternalLink, MessageCircle, Mail, Link as LinkIcon, Copy, Share2, AlertCircle, X,
  Globe, Video, FileText, Link2, PlusCircle
} from 'lucide-react';
import { UserRole, Announcement, AnnouncementPriority, ExternalLink as ExtLinkType, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

export default function Announcements() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const themeColor = user?.themeColor || '#87CEEB';
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingAnn, setViewingAnn] = useState<Announcement | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAnn, setNewAnn] = useState({ 
    title: '', content: '', priority: 'normal' as AnnouncementPriority, 
    className: 'Général', links: [] as ExtLinkType[] 
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const sub = API.announcements.subscribe(fetchAll);
    return () => sub.unsubscribe();
  }, [fetchAll]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification({ title: 'Copié', message: 'Texte copié.', type: 'success' });
  };

  const handleShareWhatsApp = (ann: Announcement) => {
    const text = `📢 *ANNONCE JANGHUP*\n\n*${ann.title}*\n\n${ann.content}\n\n🎓 _Publié par ${ann.author}_`;
    API.sharing.whatsapp(text);
  };

  const handleShareEmail = (ann: Announcement) => {
    const classObj = classes.find(c => c.name === ann.className);
    const to = classObj?.email || '';
    const subject = `📢 ANNONCE JANGHUP: ${ann.title}`;
    const body = `${ann.content}\n\nCible: ${ann.className}\nPublié par: ${ann.author}\nDate: ${new Date(ann.date).toLocaleDateString()}`;
    API.sharing.email(to, subject, body);
  };

  const handleAddLink = () => {
    setNewAnn({ ...newAnn, links: [...newAnn.links, { label: '', url: '' }] });
  };

  const handleRemoveLink = (index: number) => {
    const updatedLinks = newAnn.links.filter((_, i) => i !== index);
    setNewAnn({ ...newAnn, links: updatedLinks });
  };

  const handleLinkChange = (index: number, field: 'label' | 'url', value: string) => {
    const updatedLinks = [...newAnn.links];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };
    setNewAnn({ ...newAnn, links: updatedLinks });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanedLinks = newAnn.links.filter(l => l.label.trim() && l.url.trim());
      const payload = { ...newAnn, links: cleanedLinks };

      if (editingId) await API.announcements.update(editingId, payload);
      else await API.announcements.create(payload);
      
      setIsModalOpen(false);
      addNotification({ title: 'Succès', message: 'Annonce publiée.', type: 'success' });
      fetchAll();
    } catch (e: any) {
      addNotification({ title: 'Erreur', message: e.message, type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      await API.announcements.delete(id);
      addNotification({ title: 'Supprimé', message: 'L\'annonce a été retirée.', type: 'info' });
      fetchAll();
    } catch (e) {
      addNotification({ title: 'Erreur', message: "Action impossible.", type: 'alert' });
    }
  };

  const filteredAnns = useMemo(() => {
    return announcements.filter(a => 
      (a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (user?.role === UserRole.ADMIN || a.className === 'Général' || a.className === user?.className)
    );
  }, [announcements, searchTerm, user]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-brand" size={48} /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 text-white rounded-[1.8rem] flex items-center justify-center shadow-premium" style={{ backgroundColor: themeColor }}><Megaphone size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Annonces</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Communication Officielle ESP</p>
           </div>
        </div>
        {API.auth.canPost(user) && (
          <button onClick={() => { setEditingId(null); setNewAnn({ title: '', content: '', priority: 'normal', className: 'Général', links: [] }); setIsModalOpen(true); }} className="bg-slate-900 dark:bg-slate-800 text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-premium hover:scale-105 transition-all italic">
            <Plus size={20} /> Nouvelle Publication
          </button>
        )}
      </div>

      <div className="grid gap-8">
        {filteredAnns.map((ann) => {
          const isAuthor = user?.id === ann.user_id;
          const isAdmin = user?.role === UserRole.ADMIN;
          const canManage = isAuthor || isAdmin;

          return (
            <div key={ann.id} className="group bg-white dark:bg-gray-900 rounded-[3.5rem] p-8 md:p-12 shadow-soft border-2 border-transparent hover:border-brand-100 transition-all flex flex-col md:flex-row gap-10 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2.5 h-full ${ann.priority === 'urgent' ? 'bg-rose-500' : 'bg-brand'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full text-white ${ann.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : 'bg-slate-900'}`}>{ann.priority}</span>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{ann.className} • {new Date(ann.date).toLocaleDateString()}</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white italic tracking-tighter mb-5 uppercase leading-tight">{ann.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 italic text-sm line-clamp-3 leading-relaxed mb-6">{ann.content}</p>
                
                {ann.links && ann.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {ann.links.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-700 dark:text-brand-300 hover:bg-brand hover:text-white transition-all border border-slate-100 dark:border-slate-700">
                        <Link2 size={12} /> {link.label}
                      </a>
                    ))}
                  </div>
                )}

                <button onClick={() => setViewingAnn(ann)} className="text-[10px] font-black uppercase text-brand flex items-center gap-2 tracking-widest hover:underline">Ouvrir l'annonce <Maximize2 size={14} /></button>
              </div>
              
              <div className="flex md:flex-col items-center justify-center gap-3 md:pl-10 md:border-l border-gray-100 dark:border-gray-800">
                <button onClick={() => handleShareWhatsApp(ann)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90" title="Partager WhatsApp"><MessageCircle size={20}/></button>
                <button onClick={() => handleShareEmail(ann)} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm active:scale-90" title="Diffuser par Email"><Mail size={20}/></button>
                <button onClick={() => handleCopy(`${ann.title}\n\n${ann.content}`)} className="p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90" title="Copier"><Copy size={20}/></button>
                {canManage && (
                  <>
                    <button onClick={() => { setEditingId(ann.id); setNewAnn({ title: ann.title, content: ann.content, priority: ann.priority, className: ann.className, links: ann.links || [] }); setIsModalOpen(true); }} className="p-4 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-sm active:scale-90" title="Modifier"><Pencil size={20}/></button>
                    <button onClick={() => handleDelete(ann.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90" title="Supprimer"><Trash2 size={20}/></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Éditer l'annonce" : "Nouvelle Annonce"}>
        <form onSubmit={handleSave} className="space-y-6">
          <input required placeholder="Titre de la publication..." value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none focus:ring-4 focus:ring-brand-50" />
          <textarea required placeholder="Votre message..." rows={5} value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none focus:ring-4 focus:ring-brand-50" />
          
          <div className="grid grid-cols-2 gap-4">
            <select value={newAnn.priority} onChange={e => setNewAnn({...newAnn, priority: e.target.value as any})} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase outline-none">
              <option value="normal">Priorité : Normal</option><option value="important">Priorité : Important</option><option value="urgent">Priorité : Urgent</option>
            </select>
            <select value={newAnn.className} onChange={e => setNewAnn({...newAnn, className: e.target.value})} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase outline-none">
              <option value="Général">Toute l'institution</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ressources & Liens</label>
              <button type="button" onClick={handleAddLink} className="text-brand flex items-center gap-1 text-[10px] font-black uppercase">
                <PlusCircle size={14} /> Ajouter un lien
              </button>
            </div>
            {newAnn.links.map((link, idx) => (
              <div key={idx} className="flex gap-2 animate-fade-in">
                <input placeholder="Libellé" value={link.label} onChange={e => handleLinkChange(idx, 'label', e.target.value)} className="flex-1 p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-[11px] font-bold outline-none" />
                <input placeholder="https://..." value={link.url} onChange={e => handleLinkChange(idx, 'url', e.target.value)} className="flex-1 p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-[11px] font-bold outline-none" />
                <button type="button" onClick={() => handleRemoveLink(idx)} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"><X size={16} /></button>
              </div>
            ))}
          </div>

          <button type="submit" disabled={submitting} className="w-full py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all">
            {submitting ? <Loader2 className="animate-spin mx-auto" /> : (editingId ? "Mettre à jour" : "Publier l'annonce")}
          </button>
        </form>
      </Modal>

      {viewingAnn && (
        <Modal isOpen={!!viewingAnn} onClose={() => setViewingAnn(null)} title={viewingAnn.title}>
           <div className="space-y-8 italic">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">{viewingAnn.content}</p>
              
              {viewingAnn.links && viewingAnn.links.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Liens utiles :</p>
                  <div className="flex flex-col gap-2">
                    {viewingAnn.links.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all border border-transparent hover:border-brand-200">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{link.label}</span>
                        <ExternalLink size={16} className="text-brand" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white text-[8px] uppercase">{viewingAnn.author?.charAt(0)}</div>
                    <span>{viewingAnn.author}</span>
                 </div>
                 <span>{new Date(viewingAnn.date).toLocaleDateString()}</span>
              </div>
           </div>
        </Modal>
      )}
    </div>
  );
}
