
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, Trash2, Lock, Unlock, Loader2, BarChart2, CheckCircle2, 
  MessageCircle, Mail, Copy, X, BarChart3, ChevronRight, 
  Vote, UserCheck, Timer, AlertCircle, PieChart, TrendingUp,
  // Added Check and ShieldCheck to fix missing name errors
  Check, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Poll, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';

export default function Polls() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  const isMounted = useRef(true);
  const themeColor = user?.themecolor || '#87CEEB';
  
  const [polls, setPolls] = useState<Poll[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for new poll creation
  const [newPoll, setNewPoll] = useState({ 
    question: '', 
    classname: '', 
    options: ['', ''] 
  });

  const canPost = useMemo(() => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;
  }, [user]);

  const fetchPolls = useCallback(async (showLoader = false) => {
    try {
      if(showLoader) setLoading(true); 
      const data = await API.polls.list();
      if (isMounted.current) setPolls(data);
    } catch (error: any) {
      addNotification({ title: 'Erreur', message: 'Urnes inaccessibles.', type: 'alert' });
    } finally {
      if(showLoader && isMounted.current) setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    isMounted.current = true;
    fetchPolls(true);
    API.classes.list().then(data => { if(isMounted.current) setClasses(data); });
    
    // Real-time subscription
    const subscription = API.polls.subscribe(() => fetchPolls(false));
    return () => { isMounted.current = false; subscription.unsubscribe(); };
  }, [fetchPolls]);

  const handleVote = async (pollId: string, optionId: string, currentVoteId?: string | null) => {
    if (currentVoteId === optionId || votingPollId) return;
    setVotingPollId(pollId);
    try {
      await API.polls.vote(pollId, optionId);
      addNotification({ title: 'Vote pris en compte', message: 'Votre choix a été enregistré.', type: 'success' });
      // The real-time subscription will update the UI, but we fetch to be safe
      await fetchPolls(false);
    } catch (error) {
      addNotification({ title: 'Erreur', message: "Action refusée par le serveur.", type: 'alert' });
    } finally {
      if (isMounted.current) setVotingPollId(null);
    }
  };

  const handleToggleStatus = async (poll: Poll) => {
    try {
      await API.polls.update(poll.id, { isactive: !poll.isactive });
      addNotification({ 
        title: poll.isactive ? 'Scrutin Clos' : 'Scrutin Ouvert', 
        message: poll.isactive ? 'Plus aucun vote n\'est accepté.' : 'Le vote est à nouveau possible.', 
        type: 'info' 
      });
      fetchPolls(false);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Action non autorisée.', type: 'alert' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ce scrutin et tous ses votes ?")) return;
    try {
      await API.polls.delete(id);
      addNotification({ title: 'Supprimé', message: 'Le sondage a été retiré.', type: 'info' });
      fetchPolls(false);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Impossible de supprimer cet élément.', type: 'alert' });
    }
  };

  const handleAddOption = () => {
    setNewPoll(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const handleRemoveOption = (index: number) => {
    if (newPoll.options.length <= 2) return;
    setNewPoll(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = newPoll.options.filter(o => o.trim() !== '');
    if (validOptions.length < 2) {
      addNotification({ title: 'Options manquantes', message: 'Il faut au moins deux choix valides.', type: 'warning' });
      return;
    }
    
    setSubmitting(true);
    try {
      await API.polls.create({ 
        question: newPoll.question, 
        classname: user?.role === UserRole.ADMIN ? (newPoll.classname || 'Général') : (user?.classname || 'Général'), 
        options: validOptions.map(label => ({ label })) 
      });
      
      setIsModalOpen(false);
      setNewPoll({ question: '', classname: '', options: ['', ''] });
      addNotification({ title: 'Scrutin Lancé', message: 'Le sondage est maintenant en ligne.', type: 'success' });
      fetchPolls(false);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Échec de la création.', type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPolls = useMemo(() => {
    return polls.filter(poll => {
      const target = poll.classname || 'Général';
      const matchesSearch = poll.question.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesClass = true;
      if (user?.role === UserRole.ADMIN) {
        matchesClass = adminViewClass ? (target === adminViewClass || target === 'Général') : true;
      } else {
        matchesClass = (target === user?.classname || target === 'Général');
      }
      
      return matchesSearch && matchesClass;
    });
  }, [polls, searchTerm, user, adminViewClass]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-40 gap-8">
        <Loader2 className="animate-spin text-brand" size={64} />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Ouverture des urnes numériques...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-48 animate-fade-in px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-8">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-premium transform -rotate-3 hover:rotate-0 transition-transform duration-500">
              <BarChart3 size={36} />
           </div>
           <div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Consultations</h2>
              <div className="flex items-center gap-4 mt-4">
                 <span className="px-5 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-2xl border border-indigo-100 dark:border-indigo-900/30 italic flex items-center gap-2">
                   <UserCheck size={16} /> Système One-Vote
                 </span>
              </div>
           </div>
        </div>
        
        {canPost && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="w-full md:w-auto bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest italic flex items-center justify-center gap-3 shadow-premium hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={20} /> Nouveau Scrutin
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-12">
        {filteredPolls.length > 0 ? filteredPolls.map((poll) => {
          const canManage = user?.role === UserRole.ADMIN || user?.id === poll.user_id;
          const hasVoted = poll.hasVoted;
          const isClosed = !poll.isactive;

          return (
            <div key={poll.id} className="group bg-white dark:bg-slate-900 rounded-[4rem] p-8 md:p-14 shadow-soft border-2 border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all flex flex-col lg:flex-row gap-12 relative overflow-hidden">
               {/* Left: Info & Question */}
               <div className="flex-1 space-y-8">
                  <div className="flex flex-wrap items-center gap-4">
                     <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest italic ${isClosed ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/30 animate-pulse'}`}>
                        {isClosed ? 'Scrutin Clos' : 'Scrutin Ouvert'}
                     </span>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                       {poll.classname}
                     </span>
                     <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic flex items-center gap-2">
                        <TrendingUp size={14}/> {poll.totalVotes} participations
                     </span>
                  </div>

                  <h3 className="text-3xl md:text-4xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors">
                    {poll.question}
                  </h3>

                  {hasVoted && (
                    <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4 text-emerald-600 italic">
                       <CheckCircle2 size={24} />
                       <span className="text-[11px] font-black uppercase tracking-widest">Votre vote est enregistré. Vous pouvez le modifier tant que le scrutin est ouvert.</span>
                    </div>
                  )}
               </div>

               {/* Middle: Options (The Core) */}
               <div className="flex-1 space-y-4">
                  {poll.options.map(opt => {
                    const isSelected = poll.userVoteOptionId === opt.id;
                    const percent = Math.round((opt.votes / (poll.totalVotes || 1)) * 100);
                    
                    return (
                      <button 
                        key={opt.id} 
                        disabled={isClosed || votingPollId !== null} 
                        onClick={() => handleVote(poll.id, opt.id, poll.userVoteOptionId)} 
                        className={`w-full p-6 rounded-[2rem] border-2 text-left flex justify-between items-center transition-all relative overflow-hidden group/opt ${isSelected ? 'bg-slate-900 text-white border-slate-900 scale-[1.02] shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-indigo-400'}`}
                      >
                        {/* Progress Background */}
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out opacity-20 ${isSelected ? 'bg-emerald-400' : 'bg-indigo-400'}`} 
                          style={{ width: `${percent}%` }} 
                        />
                        
                        <div className="relative z-10 flex items-center gap-4">
                           <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${isSelected ? 'border-emerald-400 bg-emerald-400 text-slate-900' : 'border-slate-200 dark:border-slate-700'}`}>
                             {isSelected && <Check size={16} strokeWidth={4} />}
                           </div>
                           <span className="font-black italic text-sm uppercase tracking-tight">{opt.label}</span>
                        </div>

                        <div className="relative z-10 flex flex-col items-end">
                           <span className="text-xl font-black italic leading-none">{percent}%</span>
                           <span className="text-[9px] font-bold uppercase opacity-50">{opt.votes} votes</span>
                        </div>
                      </button>
                    );
                  })}
               </div>

               {/* Right: Actions */}
               <div className="flex lg:flex-col items-center justify-center gap-4 lg:pl-10 lg:border-l border-slate-100 dark:border-slate-800 shrink-0">
                  <button 
                    onClick={() => {
                      const text = `🗳️ *SONDAGE JANGHUP*\n\nQuestion : *${poll.question}*\n\n👉 *Voter ici* :\n${window.location.origin}/#/polls`;
                      API.sharing.whatsapp(text);
                    }} 
                    className="p-5 bg-emerald-50 text-emerald-600 rounded-[2rem] hover:bg-emerald-500 hover:text-white transition-all shadow-premium active:scale-90"
                    title="Diffuser sur WhatsApp"
                  >
                    <MessageCircle size={26}/>
                  </button>

                  {canManage && (
                    <>
                      <div className="hidden lg:block w-8 h-[1px] bg-slate-100 dark:bg-slate-800 my-2" />
                      <button 
                        onClick={() => handleToggleStatus(poll)} 
                        className={`p-5 rounded-[2rem] transition-all shadow-premium active:scale-90 ${poll.isactive ? 'bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white' : 'bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white'}`}
                        title={poll.isactive ? "Clôturer le vote" : "Réouvrir le vote"}
                      >
                        {poll.isactive ? <Lock size={26}/> : <Unlock size={26}/>}
                      </button>
                      <button 
                        onClick={() => handleDelete(poll.id)} 
                        className="p-5 bg-rose-50 text-rose-500 rounded-[2rem] hover:bg-rose-500 hover:text-white transition-all shadow-premium active:scale-90"
                        title="Supprimer définitivement"
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
             <PieChart size={80} className="text-slate-100 dark:text-slate-800 animate-pulse" />
             <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Aucune consultation active.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lancer une Urne Numérique">
        <form onSubmit={handleCreatePoll} className="space-y-8 py-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Question / Sujet du Scrutin</label>
              <textarea 
                required 
                rows={3} 
                value={newPoll.question} 
                onChange={e => setNewPoll({...newPoll, question: e.target.value})} 
                className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] font-black italic outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-sm leading-relaxed" 
                placeholder="Ex: Quel jour préférez-vous pour le rattrapage ?" 
              />
            </div>

            {user?.role === UserRole.ADMIN && (
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2">Cible institutionnelle</label>
                  <select 
                    value={newPoll.classname} 
                    onChange={e => setNewPoll({...newPoll, classname: e.target.value})} 
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer"
                  >
                    <option value="Général">Toutes les classes</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
               </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[11px] font-black uppercase text-slate-400 italic">Options de réponse</label>
                <button 
                  type="button" 
                  onClick={handleAddOption} 
                  className="text-[10px] font-black uppercase text-indigo-500 hover:underline"
                >
                  + Ajouter un choix
                </button>
              </div>
              
              <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {newPoll.options.map((opt, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500" />
                    <input 
                      required 
                      value={opt} 
                      onChange={e => {
                        const next = [...newPoll.options];
                        next[idx] = e.target.value;
                        setNewPoll({...newPoll, options: next});
                      }} 
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 rounded-[1.2rem] font-bold italic outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-sm" 
                      placeholder={`Option ${idx + 1}`} 
                    />
                    {newPoll.options.length > 2 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveOption(idx)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-premium active:scale-95 transition-all italic flex items-center justify-center gap-4 hover:brightness-110"
          >
            {submitting ? <Loader2 className="animate-spin" size={24} /> : "Valider et Lancer le Scrutin"}
          </button>
        </form>
      </Modal>

      {/* Info footer */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-10 gap-10 opacity-50">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-[10px] font-black uppercase tracking-widest italic">Vote Unique</span></div>
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest italic">Temps Réel</span></div>
          </div>
          <div className="flex items-center gap-6 text-slate-400 italic">
             <ShieldCheck size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.5em]">SYSTÈME DE VOTE SÉCURISÉ JANGHUP</span>
          </div>
      </div>
    </div>
  );
}
