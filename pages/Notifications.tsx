
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Bell, BellOff, Trash2, CheckCircle2, Filter, Plus, 
  Search, Loader2, AlertCircle, Info, Check, 
  Mail, Clock, ShieldCheck, Megaphone, Trash, 
  ChevronRight, X, AlertTriangle, Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, AppNotification, ClassGroup } from '../types';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import Modal from '../components/Modal';

export default function Notifications() {
  const { user } = useAuth();
  const { 
    notifications: contextNotifs, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Local filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // New notification form
  const [newNotif, setNewNotif] = useState({
    title: '',
    message: '',
    type: 'info' as any,
    priority: 'low' as any,
    classname: 'Général',
    target: 'all' // all | role | user
  });

  const canBroadcast = useMemo(() => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;
  }, [user]);

  useEffect(() => {
    API.classes.list().then(setClasses);
  }, []);

  const handleCreateNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.notifications.create({
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type,
        priority: newNotif.priority,
        classname: newNotif.classname,
        target_user_id: 'system' // Broadcast
      });
      setIsModalOpen(false);
      setNewNotif({ title: '', message: '', type: 'info', priority: 'low', classname: 'Général', target: 'all' });
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredNotifs = useMemo(() => {
    return contextNotifs.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           n.message.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || n.type === filterType;
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'unread' ? !n.is_read : n.is_read);
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contextNotifs, searchTerm, filterType, filterStatus]);

  const stats = useMemo(() => {
    const unread = contextNotifs.filter(n => !n.is_read).length;
    const urgent = contextNotifs.filter(n => n.priority === 'urgent' && !n.is_read).length;
    return { unread, urgent };
  }, [contextNotifs]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette notification ?")) return;
    try {
      await API.notifications.delete(id);
      // Let context re-fetch via real-time or callback if needed
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'alert': return <AlertCircle className="text-rose-500" size={24} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={24} />;
      case 'success': return <CheckCircle2 className="text-emerald-500" size={24} />;
      default: return <Info className="text-blue-500" size={24} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-48 animate-fade-in px-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-8">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center shadow-premium transform -rotate-3 hover:rotate-0 transition-all">
              <Bell size={36} className={stats.unread > 0 ? 'animate-bounce' : ''} />
           </div>
           <div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Alertes</h2>
              <div className="flex items-center gap-4 mt-4">
                 <span className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase rounded-2xl border border-slate-200 dark:border-slate-700 italic flex items-center gap-2">
                   {stats.unread} Message(s) non lu(s)
                 </span>
                 {stats.urgent > 0 && (
                    <span className="px-5 py-2 bg-rose-500 text-white text-[10px] font-black uppercase rounded-2xl italic animate-pulse">
                      {stats.urgent} Urgent(s)
                    </span>
                 )}
              </div>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={markAllAsRead} className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest shadow-soft hover:bg-slate-50 transition-all italic flex items-center gap-2">
            <CheckCircle2 size={18}/> Marquer tout
          </button>
          <button onClick={clearNotifications} className="px-8 py-4 bg-rose-50 text-rose-500 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest shadow-soft hover:bg-rose-500 hover:text-white transition-all italic flex items-center gap-2">
            <Trash2 size={18}/> Vider l'historique
          </button>
          {canBroadcast && (
            <button onClick={() => setIsModalOpen(true)} className="px-10 py-5 bg-slate-900 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest shadow-premium hover:brightness-110 active:scale-95 transition-all italic flex items-center gap-3">
              <Plus size={20}/> Émettre un signal
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between px-6 py-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-soft border border-slate-50 dark:border-slate-800">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Rechercher dans les messages..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none border-none shadow-inner-soft" 
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
             <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none border-none shadow-sm cursor-pointer"
             >
               <option value="all">Tous types</option>
               <option value="alert">Alertes</option>
               <option value="warning">Avertissements</option>
               <option value="info">Informations</option>
               <option value="success">Succès</option>
             </select>
             <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none border-none shadow-sm cursor-pointer"
             >
               <option value="all">Tout statut</option>
               <option value="unread">Non lus</option>
               <option value="read">Lus</option>
             </select>
          </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-6">
        {filteredNotifs.length > 0 ? filteredNotifs.map((n) => (
          <div 
            key={n.id} 
            onClick={() => !n.is_read && markAsRead(n.id)}
            className={`group bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 shadow-soft border-2 transition-all flex flex-col md:flex-row items-center gap-10 relative overflow-hidden ${n.is_read ? 'border-transparent opacity-60' : 'border-brand shadow-premium scale-[1.01]'}`}
          >
             {/* Read/Unread indicator */}
             {!n.is_read && <div className="absolute top-0 right-0 w-24 h-24 bg-brand/10 rounded-bl-full flex items-center justify-center"><Check size={24} className="text-brand mb-4 ml-4" /></div>}
             
             <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                {getIcon(n.type)}
             </div>

             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-4">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-4 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 italic flex items-center gap-2">
                     <Clock size={12}/> {new Date(n.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                   </span>
                   {n.priority === 'urgent' && <span className="text-[10px] font-black text-white bg-rose-500 px-4 py-1.5 rounded-xl animate-pulse">URGENT</span>}
                   {n.classname && <span className="text-[10px] font-black text-slate-500 uppercase px-4 py-1.5 border border-slate-200 rounded-xl">{n.classname}</span>}
                </div>

                <h3 className={`text-2xl md:text-3xl font-black italic tracking-tighter uppercase leading-none mb-4 ${n.is_read ? 'text-slate-500' : 'text-slate-900 dark:text-white group-hover:text-brand transition-colors'}`}>
                  {n.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 italic text-sm font-medium leading-relaxed line-clamp-2 md:line-clamp-none">
                  {n.message}
                </p>
             </div>

             <div className="flex gap-4 shrink-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  className="p-5 bg-rose-50 text-rose-500 rounded-3xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"
                >
                  <Trash size={24}/>
                </button>
             </div>
          </div>
        )) : (
          <div className="py-40 text-center bg-white dark:bg-slate-900 rounded-[5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-8">
             <BellOff size={80} className="text-slate-100 dark:text-slate-800" />
             <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Votre centre d'alertes est vide.</p>
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Émettre un Signal Système">
        <form onSubmit={handleCreateNotif} className="space-y-8 py-4">
           <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Titre du signal</label>
                <input 
                  required 
                  value={newNotif.title}
                  onChange={e => setNewNotif({...newNotif, title: e.target.value})}
                  className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] font-black italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm" 
                  placeholder="Ex: Système mis à jour" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                   <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Type</label>
                   <select 
                    value={newNotif.type}
                    onChange={e => setNewNotif({...newNotif, type: e.target.value})}
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer"
                   >
                     <option value="info">Information</option>
                     <option value="alert">Alerte Critique</option>
                     <option value="warning">Attention</option>
                     <option value="success">Succès</option>
                   </select>
                </div>
                <div className="space-y-3">
                   <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Priorité</label>
                   <select 
                    value={newNotif.priority}
                    onChange={e => setNewNotif({...newNotif, priority: e.target.value})}
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer"
                   >
                     <option value="low">Basse</option>
                     <option value="high">Haute</option>
                     <option value="urgent">Urgent</option>
                   </select>
                </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Cible</label>
                 <select 
                  value={newNotif.classname}
                  onChange={e => setNewNotif({...newNotif, classname: e.target.value})}
                  className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer"
                 >
                   <option value="Général">Tout le monde</option>
                   {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Message détaillé</label>
                <textarea 
                  required 
                  rows={4} 
                  value={newNotif.message}
                  onChange={e => setNewNotif({...newNotif, message: e.target.value})}
                  className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] font-bold italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm leading-relaxed" 
                  placeholder="Contenu de la notification..." 
                />
              </div>
           </div>

           <button 
             type="submit" 
             disabled={submitting} 
             className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-premium active:scale-95 transition-all italic flex items-center justify-center gap-4 hover:brightness-110"
           >
             {submitting ? <Loader2 className="animate-spin" size={24} /> : (
                <>Diffuser le signal <Send size={20}/></>
             )}
           </button>
        </form>
      </Modal>

      {/* Info Legend */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-10 gap-10 opacity-50">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest italic">Signal Prioritaire</span></div>
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-[10px] font-black uppercase tracking-widest italic">Action Requis</span></div>
          </div>
          <div className="flex items-center gap-6 text-slate-400 italic">
             <ShieldCheck size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.5em]">SYSTÈME D'ALERTES SÉCURISÉ JANGHUP</span>
          </div>
      </div>
    </div>
  );
}
