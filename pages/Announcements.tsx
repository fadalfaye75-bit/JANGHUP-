
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Plus, Share2, Trash2, Loader2, Pencil, 
  Megaphone, Search, Bookmark, Maximize2,
  ExternalLink, Trash, Link2, X, MessageCircle, Mail,
  Link as LinkIcon
} from 'lucide-react';
import { UserRole, Announcement, AnnouncementPriority, ExternalLink as ExtLinkType, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

const StructuredContent = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={i} className="flex gap-3 pl-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
              <p className="text-gray-700 dark:text-gray-300 italic text-base leading-relaxed">{line.trim().substring(2)}</p>
            </div>
          );
        }
        return <p key={i} className="text-gray-700 dark:text-gray-300 italic text-base leading-relaxed">{line}</p>;
      })}
    </div>
  );
};

export default function Announcements() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const themeColor = user?.themeColor || '#0ea5e9';
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAnn, setViewingAnn] = useState<Announcement | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAnn, setNewAnn] = useState({ 
    title: '', 
    content: '', 
    priority: 'normal' as AnnouncementPriority, 
    className: '',
    links: [] as ExtLinkType[]
  });

  const [searchTerm, setSearchTerm] = useState('');

  const canPost = API.auth.canPost(user);

  const fetchAnnouncements = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setLoading(true);
      const data = await API.announcements.list(0, 50);
      setAnnouncements(data);
      const favs = await API.favorites.list();
      setFavoriteIds(new Set(favs.filter(f => f.content_type === 'announcement').map(f => f.content_id)));
    } catch (error) {
      addNotification({ title: 'Erreur', message: 'Chargement échoué.', type: 'alert' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchAnnouncements(true);
    API.classes.list().then(setClasses).catch(() => {});
    const subscription = API.announcements.subscribe(() => fetchAnnouncements(false));
    return () => { subscription.unsubscribe(); };
  }, [fetchAnnouncements]);

  const handleShareWhatsApp = (ann: Announcement) => {
    try {
      const className = ann.className || 'Toutes Filières';
      const priorityLabel = ann.priority === 'urgent' ? '🔴 URGENT' : ann.priority === 'important' ? '🟠 IMPORTANT' : '📌 ANNONCE';
      
      const text = `🔵 *JangHup – ${className}*\n\n*${priorityLabel} : ${ann.title.toUpperCase()}*\n\n${ann.content}\n\n📅 *Publié le :* ${new Date(ann.date).toLocaleDateString()}\n👤 *Par :* ${ann.author}\n\n🔗 *Consulter sur JangHup*\nhttps://janghup.app/#/announcements\n\n—\nPlateforme JangHup\nCommunication académique officielle`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      API.interactions.incrementShare('announcements', ann.id).catch(() => {});
    } catch (e) {
      console.error("WhatsApp share failed", e);
    }
  };

  const handleShareEmail = (ann: Announcement) => {
    try {
      const targetClass = classes.find(c => c.name === ann.className);
      const recipient = targetClass?.email || '';
      const className = ann.className || 'Toutes Filières';
      
      const subject = `[JangHup – ${className}] ${ann.title}`;
      const body = `🔵 JangHup – ${className}\n\n📌 ANNONCE : ${ann.title.toUpperCase()}\n\n${ann.content}\n\n---\nPublié le : ${new Date(ann.date).toLocaleDateString()}\nPar : ${ann.author}\n\n🔗 Consulter sur JangHup : https://janghup.app/#/announcements\n\n—\nPlateforme JangHup\nCommunication académique officielle`;
      
      const mailtoLink = document.createElement('a');
      mailtoLink.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      mailtoLink.click();
      
      API.interactions.incrementShare('announcements', ann.id).catch(() => {});
    } catch (e) {
      console.error("Email share failed", e);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const added = await API.favorites.toggle(id, 'announcement');
      setFavoriteIds(prev => { const next = new Set(prev); if (added) next.add(id); else next.delete(id); return next; });
      addNotification({ title: added ? 'Favori ajouté' : 'Favori retiré', message: 'Effectué.', type: 'success' });
    } catch (e) { addNotification({ title: 'Erreur', message: 'Action impossible.', type: 'alert' }); } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ?")) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await API.announcements.delete(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      addNotification({ title: 'Supprimé', message: 'Contenu retiré.', type: 'info' });
    } catch (e: any) { 
      addNotification({ title: 'Échec', message: e.message, type: 'alert' }); 
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setNewAnn({
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      className: ann.className,
      links: ann.links || []
    });
    setIsModalOpen(true);
  };

  const handleAddLink = () => {
    setNewAnn(prev => ({
      ...prev,
      links: [...prev.links, { label: '', url: '' }]
    }));
  };

  const handleRemoveLink = (index: number) => {
    setNewAnn(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  const handleLinkChange = (index: number, field: 'label' | 'url', value: string) => {
    setNewAnn(prev => {
      const updatedLinks = [...prev.links];
      updatedLinks[index] = { ...updatedLinks[index], [field]: value };
      return { ...prev, links: updatedLinks };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !newAnn.title.trim() || !newAnn.content.trim()) return;
    
    // Filtrer les liens vides
    const validLinks = newAnn.links.filter(l => l.label.trim() !== '' && l.url.trim() !== '');
    
    setSubmitting(true);
    try {
      const payload = { 
        ...newAnn, 
        links: validLinks,
        className: user?.role === UserRole.ADMIN ? newAnn.className : (user?.className || 'Général') 
      };
      
      if (editingId) await API.announcements.update(editingId, payload);
      else await API.announcements.create(payload);
      
      setIsModalOpen(false);
      fetchAnnouncements(false);
      addNotification({ title: 'Succès', message: 'Opération réussie.', type: 'success' });
    } catch (error: any) { 
      addNotification({ title: 'Erreur', message: error?.message, type: 'alert' }); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const displayedAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || ann.content.toLowerCase().includes(searchTerm.toLowerCase());
      const targetClass = ann.className || 'Général';
      const isForUser = user?.role === UserRole.ADMIN || targetClass === 'Général' || targetClass === user?.className;
      return matchesSearch && isForUser;
    });
  }, [announcements, searchTerm, user]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-primary-500" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Flux JangHup...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-fade-in">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 text-white rounded-[1.8rem] flex items-center justify-center shadow-xl" style={{ backgroundColor: themeColor }}><Megaphone size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic leading-none">Annonces</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Dernières infos de JangHup</p>
           </div>
        </div>
        {canPost && (
          <button onClick={() => { setEditingId(null); setNewAnn({ title: '', content: '', priority: 'normal', className: '', links: [] }); setIsModalOpen(true); }} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:brightness-110 transition-all active:scale-95">
            <Plus size={20} /> Nouvelle Publication
          </button>
        )}
      </div>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Rechercher une annonce..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-6 py-4 bg-white dark:bg-gray-900 rounded-3xl text-sm font-bold border-none outline-none shadow-soft" />
      </div>

      <div className="grid gap-8">
        {displayedAnnouncements.map((ann) => {
          const canEdit = API.auth.canEdit(user, ann);
          const canDelete = API.auth.canDelete(user) || (user?.role === UserRole.DELEGATE && ann.user_id === user?.id);
          const isProcessing = processingIds.has(ann.id);
          const annColor = ann.color || themeColor;

          return (
            <div 
              key={ann.id} 
              className={`group bg-white dark:bg-gray-900 rounded-[3.5rem] p-10 shadow-soft border-2 border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:scale-[1.015] hover:-translate-y-1.5 hover:shadow-premium transition-all duration-300 flex flex-col md:flex-row gap-10 overflow-hidden relative cursor-default ${isProcessing ? 'opacity-50 pointer-events-none grayscale' : ''}`}
            >
              <div className="absolute top-0 left-0 w-2 h-full transition-all duration-500 group-hover:w-3" style={{ backgroundColor: ann.priority === 'urgent' ? '#f43f5e' : (ann.priority === 'important' ? '#f59e0b' : annColor) }} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                   <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg text-white ${ann.priority === 'urgent' ? 'bg-rose-500' : (ann.priority === 'important' ? 'bg-amber-500' : 'bg-gray-500')}`}>{ann.priority}</span>
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{ann.author} • {new Date(ann.date).toLocaleDateString()}</span>
                   <span className="text-[9px] font-black uppercase px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500">{ann.className}</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white italic tracking-tighter mb-4 cursor-pointer hover:underline underline-offset-4 decoration-2" onClick={() => setViewingAnn(ann)} style={{ textDecorationColor: annColor }}>{ann.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 italic text-sm line-clamp-3 mb-6 leading-relaxed">{ann.content}</p>
                
                {ann.links && ann.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {ann.links.map((link, idx) => (
                      <a 
                        key={idx} 
                        href={link.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all shadow-sm"
                      >
                        <LinkIcon size={12} /> {link.label}
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <button onClick={() => setViewingAnn(ann)} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transform transition-transform group-hover:translate-x-1" style={{ color: annColor }}>Lire la suite <Maximize2 size={14} /></button>
                </div>
              </div>
              <div className="flex md:flex-col items-center justify-center gap-2 md:pl-10 md:border-l border-gray-100 dark:border-gray-800 opacity-80 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleShareWhatsApp(ann)} className="p-3 bg-[#25D366] text-white rounded-xl active:scale-90 hover:scale-110 transition-all shadow-md" title="Partager sur WhatsApp"><MessageCircle size={18}/></button>
                 <button onClick={() => handleShareEmail(ann)} className="p-3 bg-gray-900 text-white rounded-xl active:scale-90 hover:scale-110 transition-all shadow-md" title="Partager par Email"><Mail size={18}/></button>
                 <button onClick={() => handleToggleFavorite(ann.id)} className={`p-3 rounded-xl border transition-all hover:scale-110 active:scale-90 shadow-sm ${favoriteIds.has(ann.id) ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-gray-50 text-gray-400'}`}><Bookmark size={18}/></button>
                 {canEdit && <button onClick={() => handleEdit(ann)} className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white hover:scale-110 active:scale-90 transition-all shadow-sm"><Pencil size={18}/></button>}
                 {canDelete && (
                  <button onClick={() => handleDelete(ann.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white hover:scale-110 active:scale-90 transition-all shadow-sm">
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>}
                  </button>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Modifier l'annonce" : "Nouvelle annonce"}>
         <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Titre de l'annonce</label>
              <input required value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-50/20" placeholder="Titre..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Priorité</label>
                <select value={newAnn.priority} onChange={e => setNewAnn({...newAnn, priority: e.target.value as any})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase outline-none cursor-pointer">
                  <option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option>
                </select>
              </div>
              {user?.role === UserRole.ADMIN && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cible</label>
                  <select value={newAnn.className} onChange={e => setNewAnn({...newAnn, className: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase outline-none cursor-pointer">
                    <option value="Général">Toute l'école</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contenu</label>
              <textarea required value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})} rows={6} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold text-sm outline-none italic focus:ring-4 focus:ring-primary-50/20" placeholder="Décrivez votre annonce ici..." />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Liens utiles (Optionnel)</label>
                <button type="button" onClick={handleAddLink} className="text-[10px] font-black text-primary-500 uppercase tracking-widest flex items-center gap-1 hover:underline">
                  <Plus size={14} /> Ajouter un lien
                </button>
              </div>
              
              <div className="space-y-3">
                {newAnn.links.map((link, idx) => (
                  <div key={idx} className="flex gap-2 items-start animate-in slide-in-from-right-2">
                    <div className="flex-1 space-y-2">
                      <input 
                        value={link.label} 
                        onChange={e => handleLinkChange(idx, 'label', e.target.value)} 
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-[11px] font-bold outline-none" 
                        placeholder="Nom du lien (ex: Formulaire)" 
                      />
                      <input 
                        value={link.url} 
                        onChange={e => handleLinkChange(idx, 'url', e.target.value)} 
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-[11px] font-bold outline-none" 
                        placeholder="URL (https://...)" 
                      />
                    </div>
                    <button type="button" onClick={() => handleRemoveLink(idx)} className="p-3 text-red-400 hover:text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full py-5 bg-primary-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl">
               {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editingId ? "Enregistrer les modifications" : "Publier l'annonce")}
            </button>
         </form>
      </Modal>

      <Modal isOpen={!!viewingAnn} onClose={() => setViewingAnn(null)} title="Détail de l'annonce">
        {viewingAnn && (
          <div className="space-y-8">
            <div className="space-y-2">
              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg text-white ${viewingAnn.priority === 'urgent' ? 'bg-rose-500' : (viewingAnn.priority === 'important' ? 'bg-amber-500' : 'bg-gray-500')}`}>{viewingAnn.priority}</span>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white italic leading-tight tracking-tight">{viewingAnn.title}</h3>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{viewingAnn.author} • {new Date(viewingAnn.date).toLocaleDateString()}</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700">
              <StructuredContent content={viewingAnn.content} />
            </div>

            {viewingAnn.links && viewingAnn.links.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ressources jointes</p>
                <div className="grid gap-2">
                  {viewingAnn.links.map((link, idx) => (
                    <a 
                      key={idx} 
                      href={link.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary-500 transition-all group"
                    >
                      <span className="text-sm font-bold italic text-gray-700 dark:text-gray-300 group-hover:text-primary-500">{link.label}</span>
                      <ExternalLink size={16} className="text-gray-400 group-hover:text-primary-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => handleShareWhatsApp(viewingAnn)} className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md">WhatsApp</button>
              <button onClick={() => handleShareEmail(viewingAnn)} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md">Email</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
