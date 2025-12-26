
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2, Lock, Unlock, Loader2, BarChart2, CheckCircle2, MessageCircle, Mail, Copy, X, BarChart3, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Poll, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';

export default function Polls() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const isMounted = useRef(true);
  
  const [polls, setPolls] = useState<Poll[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPoll, setNewPoll] = useState({ question: '', className: '', options: ['', ''], endTime: '' });

  const isAdmin = user?.role === UserRole.ADMIN;
  const isDelegate = user?.role === UserRole.DELEGATE;
  const canPost = isAdmin || isDelegate;

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
    const subscription = API.polls.subscribe(() => fetchPolls(false));
    return () => { isMounted.current = false; subscription.unsubscribe(); };
  }, [fetchPolls]);

  const handleVote = async (pollId: string, optionId: string, currentVoteId?: string | null) => {
    if (currentVoteId === optionId || votingPollId) return;
    setVotingPollId(pollId);
    try {
      await API.polls.vote(pollId, optionId);
      addNotification({ title: 'Vote enregistré', message: 'Merci de votre participation.', type: 'success' });
      await fetchPolls(false);
    } catch (error) {
      addNotification({ title: 'Erreur', message: "Action refusée.", type: 'alert' });
    } finally {
      if (isMounted.current) setVotingPollId(null);
    }
  };

  const handleToggleStatus = async (poll: Poll) => {
    try {
      await API.polls.update(poll.id, { isActive: !poll.isActive });
      addNotification({ title: 'Statut mis à jour', message: poll.isActive ? 'Scrutin clos.' : 'Scrutin ouvert.', type: 'info' });
      fetchPolls(false);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Action non autorisée.', type: 'alert' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce scrutin ?")) return;
    try {
      await API.polls.delete(id);
      addNotification({ title: 'Supprimé', message: 'Sondage retiré.', type: 'info' });
      fetchPolls(false);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Impossible de supprimer.', type: 'alert' });
    }
  };

  const displayedPolls = useMemo(() => {
    return polls.filter(poll => {
      const target = poll.className || 'Général';
      if (!isAdmin && target !== 'Général' && target !== user?.className) return false;
      return poll.question.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [user, polls, searchTerm, isAdmin]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Ouverture des urnes numériques...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand text-white rounded-[2rem] flex items-center justify-center shadow-premium"><BarChart3 size={36} /></div>
           <div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Consultations</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3">Sondages & Démocratie Académique</p>
           </div>
        </div>
        {canPost && (
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-premium italic flex items-center gap-3 hover:scale-105 transition-all">
            <Plus size={20} /> Nouveau Scrutin
          </button>
        )}
      </div>

      <div className="grid gap-10">
        {displayedPolls.map((poll) => {
          const canManage = isAdmin || (user?.id === poll.user_id);
          const hasVoted = poll.hasVoted || !poll.isActive;

          return (
            <div key={poll.id} className="bg-white dark:bg-slate-900 rounded-[4rem] p-8 md:p-14 shadow-soft border-2 border-transparent hover:border-brand-100 transition-all flex flex-col relative group">
               <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-8">
                  <div className="space-y-4">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${poll.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {poll.isActive ? 'Scrutin Ouvert' : 'Scrutin Clos'}
                    </span>
                    <h3 className="text-3xl md:text-4xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">{poll.question}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <BarChart2 size={12} className="text-brand"/> {poll.totalVotes} participations • {poll.className}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => API.sharing.whatsapp(`📊 Sondage JANGHUP: ${poll.question}`)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90" title="Partager WhatsApp"><MessageCircle size={20}/></button>
                    <button onClick={() => handleToggleStatus(poll)} className="p-4 bg-slate-50 text-slate-400 hover:text-brand rounded-2xl transition-all shadow-sm active:scale-90" title={poll.isActive ? "Verrouiller" : "Ouvrir"}>
                       {poll.isActive ? <Lock size={20}/> : <Unlock size={20}/>}
                    </button>
                    {canManage && (
                      <button onClick={() => handleDelete(poll.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90" title="Supprimer">
                         <Trash2 size={20}/>
                      </button>
                    )}
                  </div>
               </div>

               <div className="space-y-4">
                  {poll.options.map(opt => {
                    const isSelected = poll.userVoteOptionId === opt.id;
                    const percent = Math.round((opt.votes / (poll.totalVotes || 1)) * 100);
                    return (
                      <button 
                        key={opt.id} 
                        disabled={!poll.isActive || votingPollId !== null} 
                        onClick={() => handleVote(poll.id, opt.id, poll.userVoteOptionId)} 
                        className={`w-full p-6 md:p-8 rounded-[2rem] border-2 text-left flex justify-between items-center transition-all relative overflow-hidden group/opt ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-brand-500'}`}
                      >
                        {hasVoted && (
                          <div className="absolute top-0 left-0 h-full bg-brand/10 transition-all duration-1000" style={{ width: `${percent}%` }} />
                        )}
                        <span className="font-black italic relative z-10 text-sm md:text-lg uppercase tracking-tight">{opt.label}</span>
                        <div className="flex items-center gap-5 relative z-10">
                          {hasVoted && <span className="text-xs md:text-xl font-black italic text-brand">{percent}%</span>}
                          {isSelected && <CheckCircle2 size={24} className="text-emerald-400" />}
                        </div>
                      </button>
                    );
                  })}
               </div>
               
               {!poll.isActive && (
                 <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center gap-3 text-slate-400">
                    <Lock size={14} />
                    <p className="text-[10px] font-black uppercase tracking-widest italic leading-none">Les résultats sont définitifs. Le scrutin a été clôturé par l'organisateur.</p>
                 </div>
               )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lancer une consultation">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const validOptions = newPoll.options.filter(o => o.trim() !== '');
            await API.polls.create({ question: newPoll.question, className: isAdmin ? newPoll.className : (user?.className || 'Général'), options: validOptions.map(label => ({ label })) });
            setIsModalOpen(false);
            fetchPolls(false);
            addNotification({ title: 'Succès', message: 'Sondage en ligne.', type: 'success' });
          } catch (e) { addNotification({ title: 'Erreur', message: 'Création impossible.', type: 'alert' }); }
          finally { setSubmitting(false); }
        }} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Votre Question</label>
            <textarea required placeholder="ex: Souhaitez-vous décaler le DS de Physique ?" value={newPoll.question} onChange={e => setNewPoll({...newPoll, question: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" rows={3} />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Options de réponse</label>
            {newPoll.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input required placeholder={`Réponse ${i+1}`} value={opt} onChange={e => {
                  const n = [...newPoll.options];
                  n[i] = e.target.value;
                  setNewPoll({...newPoll, options: n});
                }} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic text-sm border-none" />
                {newPoll.options.length > 2 && (
                  <button type="button" onClick={() => setNewPoll({...newPoll, options: newPoll.options.filter((_, idx) => idx !== i)})} className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><X size={18}/></button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})} className="text-[10px] font-black text-brand uppercase tracking-widest p-3 hover:bg-brand-50 rounded-xl transition-all flex items-center gap-2 italic">+ Ajouter un choix</button>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Cible</label>
             <select disabled={!isAdmin} value={newPoll.className} onChange={e => setNewPoll({...newPoll, className: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl font-black text-[10px] uppercase border-none outline-none">
                <option value="Général">Toute l'institution</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
             </select>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-5 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all italic">
            {submitting ? <Loader2 className="animate-spin mx-auto"/> : "Valider le Scrutin"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
