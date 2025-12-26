
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2, Lock, Unlock, Loader2, BarChart2, Check, Users, Search, Sparkles, Shield, Send, Share2, AlertCircle, Vote as VoteIcon, X, TrendingUp, Trophy, Crown, ArrowRight, MessageCircle, Mail, BarChart3, CheckCircle2, Activity, RefreshCcw, Copy, Pencil } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');

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

  const handleCopy = (poll: Poll) => {
    navigator.clipboard.writeText(`📊 Sondage JANGHUP: ${poll.question}`);
    addNotification({ title: 'Copié', message: 'Sujet du sondage copié.', type: 'success' });
  };

  const handleShare = (poll: Poll) => {
    API.sharing.whatsapp(`📊 *Sondage JANGHUP*\n\nQuestion: *${poll.question}*\n\n🎓 _Participez sur la plateforme !_`);
  };

  const handleVote = async (pollId: string, optionId: string, currentVoteId?: string | null) => {
    if (currentVoteId === optionId || votingPollId) return;
    setVotingPollId(pollId);
    try {
      await API.polls.vote(pollId, optionId);
      addNotification({ title: 'Vote enregistré', message: 'Merci pour votre participation.', type: 'success' });
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
      const matchesSearch = poll.question.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && poll.isActive) || (statusFilter === 'closed' && !poll.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [user, polls, searchTerm, statusFilter, isAdmin]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in px-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 border-b border-gray-100 dark:border-gray-800 pb-12">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-500 text-white rounded-[2rem] flex items-center justify-center shadow-premium"><BarChart3 size={36} /></div>
           <h2 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Consultations</h2>
        </div>
        {canPost && (
          <button onClick={() => setIsModalOpen(true)} className="bg-gray-900 dark:bg-black text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-premium italic flex items-center gap-2 hover:scale-105 transition-all">
            <Plus size={20} /> Créer un Sondage
          </button>
        )}
      </div>

      <div className="grid gap-12">
        {displayedPolls.map((poll) => {
          const canManage = isAdmin || (user?.id === poll.user_id);
          
          return (
            <div key={poll.id} className="bg-white dark:bg-gray-900 rounded-[4rem] p-10 shadow-soft border-2 border-transparent hover:border-primary-100 transition-all flex flex-col relative group">
               <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                  <div className="space-y-3">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${poll.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      {poll.isActive ? 'Scrutin Ouvert' : 'Scrutin Clos'}
                    </span>
                    <h3 className="text-3xl font-black italic text-gray-900 dark:text-white uppercase tracking-tighter leading-tight">{poll.question}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{poll.className} • {poll.totalVotes} votes exprimés</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleShare(poll)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Partager"><Share2 size={20}/></button>
                    <button onClick={() => handleCopy(poll)} className="p-4 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-900 hover:text-white transition-all shadow-sm" title="Copier"><Copy size={20}/></button>
                    {canManage && (
                      <>
                        <button onClick={() => handleToggleStatus(poll)} className="p-4 bg-gray-50 text-gray-400 hover:text-primary-500 rounded-2xl transition-all shadow-sm" title={poll.isActive ? "Clôturer" : "Ouvrir"}>
                           {poll.isActive ? <Lock size={20}/> : <Unlock size={20}/>}
                        </button>
                        <button onClick={() => handleDelete(poll.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Supprimer">
                           <Trash2 size={20}/>
                        </button>
                      </>
                    )}
                  </div>
               </div>

               <div className="space-y-4">
                  {poll.options.map(opt => {
                    const isSelected = poll.userVoteOptionId === opt.id;
                    const percent = Math.round((opt.votes / (poll.totalVotes || 1)) * 100);
                    return (
                      <button key={opt.id} disabled={!poll.isActive} onClick={() => handleVote(poll.id, opt.id, poll.userVoteOptionId)} className={`w-full p-6 rounded-2xl border-2 text-left flex justify-between items-center transition-all relative overflow-hidden group/opt ${isSelected ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:border-primary-500'}`}>
                        {(!poll.isActive || poll.hasVoted) && (
                          <div className="absolute top-0 left-0 h-full bg-primary-500/10 transition-all duration-1000" style={{ width: `${percent}%` }} />
                        )}
                        <span className="font-bold relative z-10">{opt.label}</span>
                        <div className="flex items-center gap-4 relative z-10">
                          {(isSelected || !poll.isActive || poll.hasVoted) && <span className="text-[10px] font-black uppercase">{percent}%</span>}
                          {isSelected && <CheckCircle2 size={20} className="text-emerald-400" />}
                        </div>
                      </button>
                    );
                  })}
               </div>
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
          <textarea required placeholder="Quelle est votre question ?" value={newPoll.question} onChange={e => setNewPoll({...newPoll, question: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-primary-50" rows={3} />
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Options de vote</label>
            {newPoll.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input required placeholder={`Choix ${i+1}`} value={opt} onChange={e => {
                  const n = [...newPoll.options];
                  n[i] = e.target.value;
                  setNewPoll({...newPoll, options: n});
                }} className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-bold italic text-sm" />
                {newPoll.options.length > 2 && (
                  <button type="button" onClick={() => setNewPoll({...newPoll, options: newPoll.options.filter((_, idx) => idx !== i)})} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={18}/></button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})} className="text-[10px] font-black text-primary-500 uppercase tracking-widest p-2 hover:bg-primary-50 rounded-lg transition-all">+ Ajouter une option</button>
          </div>
          <select disabled={!isAdmin} value={newPoll.className} onChange={e => setNewPoll({...newPoll, className: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase">
            <option value="Général">Toute l'institution</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <button type="submit" disabled={submitting} className="w-full py-5 bg-primary-500 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all">
            {submitting ? <Loader2 className="animate-spin mx-auto"/> : "Ouvrir les urnes"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
