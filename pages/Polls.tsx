
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
  const [newPoll, setNewPoll] = useState({ question: '', classname: '', options: ['', ''], endtime: '' });

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

  const handleShareWhatsApp = (poll: Poll) => {
    const appUrl = window.location.origin + "/#/polls";
    const text = `📢 *SONDAGE JANGHUP*\n\n🔔 *Votre avis compte !*\n📘 Question : *${poll.question}*\n\n👉 Votez maintenant ici :\n🔗 ${appUrl}\n\n— JANGHUP\nPlateforme académique officielle`;
    API.sharing.whatsapp(text);
  };

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
      await API.polls.update(poll.id, { isactive: !poll.isactive });
      addNotification({ title: 'Statut mis à jour', message: poll.isactive ? 'Scrutin clos.' : 'Scrutin ouvert.', type: 'info' });
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
      const target = poll.classname || 'Général';
      if (!isAdmin && target !== 'Général' && target !== user?.classname) return false;
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
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3">Sondages Officiels JANGHUP</p>
           </div>
        </div>
        {canPost && (
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-premium italic flex items-center gap-3 hover:scale-105 transition-all"><Plus size={20} /> Nouveau Scrutin</button>
        )}
      </div>

      <div className="grid gap-10">
        {displayedPolls.map((poll) => {
          const canManage = isAdmin || (user?.id === poll.user_id);
          const hasVoted = poll.hasVoted || !poll.isactive;
          return (
            <div key={poll.id} className="bg-white dark:bg-slate-900 rounded-[4rem] p-8 md:p-14 shadow-soft border-2 border-transparent hover:border-brand-100 transition-all flex flex-col relative group">
               <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-8">
                  <div className="space-y-4">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${poll.isactive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{poll.isactive ? 'Scrutin Ouvert' : 'Scrutin Clos'}</span>
                    <h3 className="text-3xl md:text-4xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">{poll.question}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><BarChart2 size={12} className="text-brand"/> {poll.totalVotes} participations • {poll.classname}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleShareWhatsApp(poll)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-90" title="Partager WhatsApp"><MessageCircle size={20}/></button>
                    {canManage && <button onClick={() => handleDelete(poll.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-90" title="Supprimer"><Trash2 size={20}/></button>}
                  </div>
               </div>
               <div className="space-y-4">
                  {poll.options.map(opt => {
                    const isSelected = poll.userVoteOptionId === opt.id;
                    const percent = Math.round((opt.votes / (poll.totalVotes || 1)) * 100);
                    return (
                      <button key={opt.id} disabled={!poll.isactive || votingPollId !== null} onClick={() => handleVote(poll.id, opt.id, poll.userVoteOptionId)} className={`w-full p-6 md:p-8 rounded-[2rem] border-2 text-left flex justify-between items-center transition-all relative overflow-hidden ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-brand-500'}`}>
                        {hasVoted && <div className="absolute top-0 left-0 h-full bg-brand/10" style={{ width: `${percent}%` }} />}
                        <span className="font-black italic relative z-10 text-sm md:text-lg uppercase tracking-tight">{opt.label}</span>
                        {hasVoted && <span className="text-xs md:text-xl font-black italic text-brand relative z-10">{percent}%</span>}
                      </button>
                    );
                  })}
               </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lancer une consultation JANGHUP">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const validOptions = newPoll.options.filter(o => o.trim() !== '');
            await API.polls.create({ question: newPoll.question, classname: isAdmin ? newPoll.classname : (user?.classname || 'Général'), options: validOptions.map(label => ({ label })) });
            setIsModalOpen(false);
            fetchPolls(false);
            addNotification({ title: 'Succès', message: 'Sondage en ligne.', type: 'success' });
          } catch (e) { addNotification({ title: 'Erreur', message: 'Création impossible.', type: 'alert' }); }
          finally { setSubmitting(false); }
        }} className="space-y-6">
          <textarea required placeholder="Votre Question institutionnelle" value={newPoll.question} onChange={e => setNewPoll({...newPoll, question: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl font-bold italic" rows={3} />
          <button type="submit" disabled={submitting} className="w-full py-5 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all italic">{submitting ? <Loader2 className="animate-spin mx-auto"/> : "Valider le Scrutin"}</button>
        </form>
      </Modal>
    </div>
  );
}
