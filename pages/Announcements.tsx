
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Plus, Trash2, Loader2, Pencil, Megaphone, Search, Bookmark, Maximize2,
  ExternalLink, MessageCircle, Mail, Link as LinkIcon, Copy, Share2, AlertCircle, X,
  Globe, Video, FileText, Link2, PlusCircle, CheckCircle2, ChevronRight, Hash, Type, Info
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
    return () => sub.unsubscribe();
  }, [fetchAll]);

  // Validation en temps réel
  const validateField = (name: string, value: string) => {
    let error = "";
    if (name === 'title') {
      if (value.trim().length < 5) error = "Titre trop court (min 5 car.)";
    } else if (name === 'content') {
      if (value.trim().length < 10) error = "Contenu trop court (min 10 car.)";
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification({ title: 'Copié', message: 'Texte copié dans le presse-papier.', type: 'success' });
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
    
    // Final validation before submission
    if (newAnn.title.length < 5 || newAnn.content.length < 10) {
      addNotification({ title: 'Formulaire incomplet', message: 'Veuillez vérifier les champs en rouge.', type: 'warning' });
      return;
    }
    
    setSubmitting(true);
    try {
      const cleanedLinks = newAnn.links.filter(l => l.label.trim() && l.url.trim());
      const payload = { ...newAnn, links: cleanedLinks };

      if (editingId) await API.announcements.update(editingId, payload);
      else await API.announcements.create(payload);
      
      setIsModalOpen(false);
      addNotification({ title: 'Succès', message: 'Annonce publiée sur le portail.', type: 'success' });
      fetchAll();
    } catch (e: any) {
      addNotification({ title: 'Erreur', message: e.message || "Erreur lors de la publication.", type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    try {
      await API.announcements.delete(id);
      addNotification({ title: 'Supprimé', message: 'L\'annonce a été retirée.', type: 'info' });
      fetchAll();
    } catch (e) {
      addNotification({ title: 'Erreur', message: "Action impossible pour le moment.", type: 'alert' });
    }
  };

  const filteredAnns = useMemo(() => {
    return announcements.filter(a => 
      (a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (user?.role === UserRole.ADMIN || a.className === 'Général' || a.className === user?.className)
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
      {/* Search and Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 text-white rounded-[1.8rem] flex items-center justify-center shadow-premium transition-transform hover:scale-105" style={{ backgroundColor: themeColor }}><Megaphone size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Annonces</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Communication Officielle de l'ESP</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Filtrer..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl text-[11px] font-bold outline-none border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-brand-50" 
             />
          </div>
          {API.auth.canPost(user) && (
            <button 
              onClick={() => { setEditingId(null); setNewAnn({ title: '', content: '', priority: 'normal', className: 'Général', links: [] }); setErrors({}); setIsModalOpen(true); }} 
              className="bg-slate-900 dark:bg-brand text-white px-8 py-4.5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-premium hover:brightness-110 active:scale-95 transition-all italic whitespace-nowrap"
            >
              <Plus size={18} /> Publier
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-8">
        {filteredAnns.length > 0 ? filteredAnns.map((ann) => {
          const isAuthor = user?.id === ann.user_id;
          const isAdmin = user?.role === UserRole.ADMIN;
          const canManage = isAuthor || isAdmin;

          return (
            <div key={ann.id} className="group bg-white dark:bg-gray-900 rounded-[3.5rem] p-8 md:p-12 shadow-soft border-2 border-transparent hover:border-brand-100 transition-all flex flex-col md:flex-row gap-10 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2.5 h-full transition-all ${ann.priority === 'urgent' ? 'bg-rose-500 shadow-[2px_0_15px_rgba(244,63,94,0.3)]' : 'bg-brand'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full text-white shadow-sm ${ann.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : ann.priority === 'important' ? 'bg-amber-500' : 'bg-slate-900'}`}>{ann.priority}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{ann.className} • {new Date(ann.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white italic tracking-tighter mb-5 uppercase leading-tight group-hover:text-brand transition-colors">{ann.title}</h3>
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

                <button onClick={() => setViewingAnn(ann)} className="text-[10px] font-black uppercase text-brand flex items-center gap-2 tracking-widest hover:translate-x-1 transition-transform">Consulter en plein écran <Maximize2 size={14} /></button>
              </div>
              
              <div className="flex md:flex-col items-center justify-center gap-3 md:pl-10 md:border-l border-gray-100 dark:border-gray-800 shrink-0">
                <button onClick={() => handleShareWhatsApp(ann)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90" title="Partager WhatsApp"><MessageCircle size={20}/></button>
                <button onClick={() => handleShareEmail(ann)} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm active:scale-90" title="Diffuser par Email"><Mail size={20}/></button>
                <button onClick={() => handleCopy(`${ann.title}\n\n${ann.content}`)} className="p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90" title="Copier"><Copy size={20}/></button>
                {canManage && (
                  <>
                    <button onClick={() => { setEditingId(ann.id); setNewAnn({ title: ann.title, content: ann.content, priority: ann.priority, className: ann.className, links: ann.links || [] }); setErrors({}); setIsModalOpen(true); }} className="p-4 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-sm active:scale-90" title="Modifier"><Pencil size={20}/></button>
                    <button onClick={() => handleDelete(ann.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90" title="Supprimer"><Trash2 size={20}/></button>
                  </>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6">
             <Megaphone size={64} className="text-slate-100 dark:text-slate-800" />
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Aucune annonce ne correspond à vos critères.</p>
          </div>
        )}
      </div>

      {/* Modern Creation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Éditer la publication" : "Nouvelle Annonce Officielle"}>
        <form onSubmit={handleSave} className="space-y-8 py-2">
          
          {/* Form Header Info */}
          <div className="flex items-center gap-3 p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-800">
            <Info size={18} className="text-brand" />
            <p className="text-[9px] font-bold text-brand-700 dark:text-brand-300 uppercase tracking-widest leading-relaxed">
              Votre publication sera visible par {newAnn.className === 'Général' ? "tous les étudiants" : `les étudiants de ${newAnn.className}`}.
            </p>
          </div>

          <div className="space-y-6">
            {/* Title Field with error handling */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase text-slate-400 italic flex items-center gap-2">
                  <Type size={12} /> Titre de l'annonce
                </label>
                {errors.title && (
                  <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 animate-fade-in">
                    <AlertCircle size={10} /> {errors.title}
                  </span>
                )}
              </div>
              <input 
                required 
                placeholder="ex: Rappel : Inscriptions pédagogiques..." 
                value={newAnn.title} 
                onFocus={() => validateField('title', newAnn.title)}
                onChange={e => {
                  setNewAnn({...newAnn, title: e.target.value});
                  validateField('title', e.target.value);
                }} 
                style={{ borderColor: errors.title ? '#fb7185' : 'transparent' }}
                className={`w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-2 transition-all focus:border-brand focus:ring-4 focus:ring-brand-50`} 
              />
            </div>

            {/* Content Field with error handling */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase text-slate-400 italic flex items-center gap-2">
                  <FileText size={12} /> Message détaillé
                </label>
                {errors.content && (
                  <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 animate-fade-in">
                    <AlertCircle size={10} /> {errors.content}
                  </span>
                )}
              </div>
              <textarea 
                required 
                placeholder="Décrivez précisément l'annonce..." 
                rows={5} 
                value={newAnn.content} 
                onFocus={() => validateField('content', newAnn.content)}
                onChange={e => {
                  setNewAnn({...newAnn, content: e.target.value});
                  validateField('content', e.target.value);
                }} 
                style={{ borderColor: errors.content ? '#fb7185' : 'transparent' }}
                className={`w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-2 transition-all focus:border-brand focus:ring-4 focus:ring-brand-50`} 
              />
            </div>
          </div>

          {/* Priority & Class Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Degré d'Urgence</label>
              <div className="flex gap-2">
                {[
                  { id: 'normal', color: 'bg-emerald-500', label: 'Normal' },
                  { id: 'important', color: 'bg-amber-500', label: 'Important' },
                  { id: 'urgent', color: 'bg-rose-500', label: 'Urgent' }
                ].map(p => (
                  <button 
                    key={p.id} 
                    type="button" 
                    onClick={() => setNewAnn({...newAnn, priority: p.id as AnnouncementPriority})}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newAnn.priority === p.id ? `${p.color} text-white shadow-lg scale-105` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Classe Cible</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <select 
                  value={newAnn.className} 
                  onChange={e => setNewAnn({...newAnn, className: e.target.value})} 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-black text-[10px] uppercase outline-none border-2 border-transparent focus:border-brand appearance-none cursor-pointer"
                >
                  <option value="Général">Toute l'institution</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={14} />
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <LinkIcon size={12} /> Ressources & Liens Utiles
              </label>
              <button 
                type="button" 
                onClick={handleAddLink} 
                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 text-brand rounded-xl text-[9px] font-black uppercase shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-brand hover:text-white transition-all active:scale-95"
              >
                <PlusCircle size={14} /> Ajouter
              </button>
            </div>
            
            <div className="space-y-3">
              {newAnn.links.map((link, idx) => (
                <div key={idx} className="flex gap-2 group animate-fade-in items-center">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input 
                      placeholder="Libellé (ex: PDF Cours)" 
                      value={link.label} 
                      onChange={e => handleLinkChange(idx, 'label', e.target.value)} 
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl text-[11px] font-bold outline-none border border-transparent focus:border-brand" 
                    />
                    <input 
                      placeholder="https://..." 
                      value={link.url} 
                      onChange={e => handleLinkChange(idx, 'url', e.target.value)} 
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl text-[11px] font-bold outline-none border border-transparent focus:border-brand" 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveLink(idx)} 
                    className="p-3 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {newAnn.links.length === 0 && (
                <p className="text-[9px] text-slate-400 text-center italic py-2">Aucun lien additionnel configuré.</p>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting || !!errors.title || !!errors.content} 
            className="w-full py-5 bg-slate-900 dark:bg-brand text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-premium active:scale-95 transition-all flex items-center justify-center gap-3 italic group disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: submitting ? undefined : themeColor, 
              boxShadow: submitting ? undefined : `0 20px 40px -15px ${themeColor}55` 
            }}
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" /> 
                {editingId ? "Sauvegarder les modifications" : "Publier maintenant"}
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* Viewing Modal */}
      {viewingAnn && (
        <Modal isOpen={!!viewingAnn} onClose={() => setViewingAnn(null)} title={viewingAnn.title}>
           <div className="space-y-8 italic">
              <div className="flex items-center gap-2">
                 <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md text-white ${viewingAnn.priority === 'urgent' ? 'bg-rose-500' : viewingAnn.priority === 'important' ? 'bg-amber-500' : 'bg-slate-900'}`}>{viewingAnn.priority}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{viewingAnn.className}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">{viewingAnn.content}</p>
              
              {viewingAnn.links && viewingAnn.links.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <LinkIcon size={12} /> Ressources partagées :
                  </p>
                  <div className="grid gap-3">
                    {viewingAnn.links.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-brand hover:text-white transition-all border border-transparent hover:border-brand-200 group">
                        <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-white">{link.label}</span>
                        <ExternalLink size={18} className="text-brand group-hover:text-white" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center text-white text-xs font-black shadow-sm" style={{ backgroundColor: themeColor }}>{viewingAnn.author?.charAt(0)}</div>
                    <div className="flex flex-col">
                      <span className="text-slate-900 dark:text-white">{viewingAnn.author}</span>
                      <span className="text-[8px] opacity-60">ADMINISTRATION ESP</span>
                    </div>
                 </div>
                 <span>Le {new Date(viewingAnn.date).toLocaleDateString()}</span>
              </div>
           </div>
        </Modal>
      )}
    </div>
  );
}
