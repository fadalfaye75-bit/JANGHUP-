
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Plus, Trash2, Loader2, Pencil, Megaphone, Search, Bookmark, Maximize2,
  ExternalLink, MessageCircle, Mail, Link as LinkIcon, Copy, Share2, AlertCircle, X,
  Globe, Video, FileText, Link2
} from 'lucide-react';
import { UserRole, Announcement, AnnouncementPriority, ExternalLink as ExtLinkType, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

export default function Announcements() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const themeColor = user?.themeColor || '#0ea5e9';
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingAnn, setViewingAnn] = useState<Announcement | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAnn, setNewAnn] = useState({ 
    title: '', content: '', priority: 'normal' as AnnouncementPriority, 
    className: '', links: [] as ExtLinkType[] 
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
    addNotification({ title: 'Copié', message: 'Texte copié dans le presse-papier.', type: 'success' });
  };

  const handleShare = (ann: Announcement) => {
    const text = `📢 *ANNONCE JANGHUP*\n\n*${ann.title}*\n\n${ann.content}\n\n🎓 _Publié par ${ann.author}_`;
    API.sharing.whatsapp(text);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) await API.announcements.update(editingId, newAnn);
      else await API.announcements.create(newAnn);
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
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 text-white rounded-[1.8rem] flex items-center justify-center shadow-xl shadow-primary-500/10" style={{ backgroundColor: themeColor }}><Megaphone size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Annonces</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Communication Officielle JangHup</p>
           </div>
        </div>
        {API.auth.canPost(user) && (
          <button onClick={() => { setEditingId(null); setNewAnn({ title: '', content: '', priority: 'normal', className: 'Général', links: [] }); setIsModalOpen(true); }} className="bg-primary-500 text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-premium hover:scale-105 transition-all italic">
            <Plus size={20} /> Nouvelle Publication
          </button>
        )}
      </div>

      <div className="grid gap-10">
        {filteredAnns.map((ann) => {
          const isAuthor = user?.id === ann.user_id;
          const isAdmin = user?.role === UserRole.ADMIN;
          const canManage = isAuthor || isAdmin;

          return (
            <div key={ann.id} className="group bg-white dark:bg-gray-900 rounded-[3.5rem] p-8 md:p-12 shadow-soft border-2 border-transparent hover:border-primary-100 transition-all flex flex-col md:flex-row gap-10 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2.5 h-full ${ann.priority === 'urgent' ? 'bg-red-500' : 'bg-primary-500'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full text-white ${ann.priority === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-gray-900'}`}>{ann.priority}</span>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{ann.className} • {new Date(ann.date).toLocaleDateString()}</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white italic tracking-tighter mb-5 uppercase">{ann.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 italic text-sm line-clamp-3 leading-relaxed mb-8">{ann.content}</p>
                <button onClick={() => setViewingAnn(ann)} className="text-[10px] font-black uppercase text-primary-500 flex items-center gap-2 tracking-widest hover:underline">Lire la suite <Maximize2 size={14} /></button>
              </div>
              
              <div className="flex md:flex-col items-center justify-center gap-3 md:pl-10 md:border-l border-gray-100 dark:border-gray-800">
                <button onClick={() => handleShare(ann)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Partager"><Share2 size={20}/></button>
                <button onClick={() => handleCopy(`${ann.title}\n\n${ann.content}`)} className="p-4 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-900 hover:text-white transition-all shadow-sm" title="Copier"><Copy size={20}/></button>
                {canManage && (
                  <>
                    <button onClick={() => { setEditingId(ann.id); setNewAnn({ title: ann.title, content: ann.content, priority: ann.priority, className: ann.className, links: ann.links || [] }); setIsModalOpen(true); }} className="p-4 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-sm" title="Modifier"><Pencil size={20}/></button>
                    <button onClick={() => handleDelete(ann.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Supprimer"><Trash2 size={20}/></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Éditer l'annonce" : "Nouvelle Annonce"}>
        <form onSubmit={handleSave} className="space-y-6">
          <input required placeholder="Titre..." value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold italic" />
          <textarea required placeholder="Message..." rows={6} value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold italic" />
          <div className="grid grid-cols-2 gap-4">
            <select value={newAnn.priority} onChange={e => setNewAnn({...newAnn, priority: e.target.value as any})} className="p-4 bg-gray-50 rounded-2xl font-black text-[10px] uppercase">
              <option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option>
            </select>
            <select value={newAnn.className} onChange={e => setNewAnn({...newAnn, className: e.target.value})} className="p-4 bg-gray-50 rounded-2xl font-black text-[10px] uppercase">
              <option value="Général">Toute l'école</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-5 bg-primary-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl">
            {submitting ? <Loader2 className="animate-spin mx-auto" /> : "Publier l'annonce"}
          </button>
        </form>
      </Modal>

      {viewingAnn && (
        <Modal isOpen={!!viewingAnn} onClose={() => setViewingAnn(null)} title={viewingAnn.title}>
           <div className="space-y-6 italic">
              <p className="text-gray-600 leading-relaxed text-lg">{viewingAnn.content}</p>
              <div className="pt-6 border-t flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                 <span>Par {viewingAnn.author}</span>
                 <span>{new Date(viewingAnn.date).toLocaleDateString()}</span>
              </div>
           </div>
        </Modal>
      )}
    </div>
  );
}
