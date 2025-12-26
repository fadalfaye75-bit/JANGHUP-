
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Clock, MapPin, Plus, Trash2, Loader2, Pencil, 
  Calendar as CalendarIcon, Copy, Timer, FileText, MessageCircle, Mail, AlertTriangle
} from 'lucide-react';
import { UserRole, Exam, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

export default function Exams() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    subject: '', date: '', time: '', room: '', className: '', duration: '2h', notes: ''
  });

  const isAdmin = user?.role === UserRole.ADMIN;
  const isDelegate = user?.role === UserRole.DELEGATE;
  const canPost = isAdmin || isDelegate;

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await API.exams.list();
      setExams(data);
    } catch (error) {
      addNotification({ title: 'Erreur', message: 'Échec du chargement.', type: 'alert' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchExams();
    API.classes.list().then(setClasses);
  }, [fetchExams]);

  const handleCopy = useCallback((exam: Exam) => {
    const text = `📅 Examen: ${exam.subject}\n📍 Salle: ${exam.room}\n🕒 Date: ${new Date(exam.date).toLocaleString()}\n📝 Notes: ${exam.notes || 'Aucune'}`;
    navigator.clipboard.writeText(text);
    addNotification({ title: 'Copié', message: 'Détails copiés.', type: 'success' });
  }, [addNotification]);

  const handleShareEmail = useCallback((exam: Exam) => {
    const classObj = classes.find(c => c.name === exam.className);
    const to = classObj?.email || '';
    const examDate = new Date(exam.date);
    const subject = `📅 EXAMEN À VENIR: ${exam.subject}`;
    const body = `📚 Matière : ${exam.subject}\n📍 Salle : ${exam.room}\n🕒 Date : ${examDate.toLocaleString('fr-FR')}\n⏱️ Durée : ${exam.duration}\n📝 Notes : ${exam.notes || 'Aucune'}\n\n🎓 Plateforme JANGHUP ESP`;
    API.sharing.email(to, subject, body);
  }, [classes]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Supprimer cette épreuve ?')) return;
    try {
      await API.exams.delete(id);
      fetchExams();
      addNotification({ title: 'Supprimé', message: 'Épreuve retirée.', type: 'info' });
    } catch (error) {
      addNotification({ title: 'Erreur', message: "Échec.", type: 'alert' });
    }
  }, [fetchExams, addNotification]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const target = exam.className || 'Général';
      return isAdmin ? (adminViewClass ? (target === adminViewClass || target === 'Général') : true) : (target === user?.className || target === 'Général');
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exams, isAdmin, adminViewClass, user?.className]);

  const getDaysDiff = (dateStr: string) => {
    const now = new Date();
    const examDate = new Date(dateStr);
    const diff = examDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 gap-4">
      <Loader2 className="animate-spin text-amber-500" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Synchronisation de l'agenda...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500 text-white rounded-[2rem] flex items-center justify-center shadow-premium"><CalendarIcon size={32} /></div>
           <div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Examens</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3">Calendrier des épreuves ESP</p>
           </div>
        </div>
        {canPost && (
          <button onClick={() => { setEditingId(null); setFormData({ subject: '', date: '', time: '', room: '', className: isAdmin ? '' : (user?.className || ''), duration: '2h', notes: '' }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest italic flex items-center gap-3 shadow-xl hover:scale-105 transition-all">
            <Plus size={20} /> Programmer
          </button>
        )}
      </div>

      <div className="grid gap-8">
        {filteredExams.length > 0 ? filteredExams.map((exam) => {
          const daysLeft = getDaysDiff(exam.date);
          const examDate = new Date(exam.date);
          const canManage = isAdmin || (user?.id === exam.user_id);
          const isUrgent = daysLeft >= 0 && daysLeft <= 3;

          return (
            <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-8 md:p-12 shadow-soft border-2 border-transparent hover:border-amber-100 transition-all flex flex-col md:flex-row gap-10 items-start relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-2.5 h-full ${isUrgent ? 'bg-rose-500 shadow-[2px_0_15px_rgba(244,63,94,0.3)]' : 'bg-amber-500'}`} />
              
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {isUrgent ? (
                    <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-500 border border-rose-100 animate-pulse italic">
                      <AlertTriangle size={12} /> J-{daysLeft} • Critique
                    </span>
                  ) : daysLeft < 0 ? (
                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200 italic">Terminé</span>
                  ) : (
                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 italic">Prévu dans {daysLeft}j</span>
                  )}
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.className}</span>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter mb-6 leading-tight group-hover:text-amber-600 transition-colors">{exam.subject}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm font-bold text-slate-500 mb-8">
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl italic"><CalendarIcon size={18} className="text-amber-500" /> {examDate.toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}</div>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl italic"><Clock size={18} className="text-amber-500" /> {examDate.toTimeString().slice(0,5)}</div>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl italic"><MapPin size={18} className="text-amber-500" /> {exam.room}</div>
                </div>
                
                {exam.notes && (
                  <div className="bg-amber-50/30 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100/50 dark:border-amber-800/20">
                    <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-3 flex items-center gap-2 italic"><FileText size={12}/> Instructions de l'enseignant</p>
                    <p className="text-sm font-medium italic text-slate-600 dark:text-slate-300 leading-relaxed">{exam.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap md:flex-col gap-3 md:pl-10 md:border-l border-slate-100 dark:border-slate-800 self-stretch justify-center">
                <button onClick={() => API.sharing.whatsapp(`🚨 EXAMEN JANGHUP: ${exam.subject} le ${examDate.toLocaleString()}`)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90" title="WhatsApp"><MessageCircle size={20}/></button>
                <button onClick={() => handleShareEmail(exam)} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm active:scale-90" title="Partager par Email"><Mail size={20}/></button>
                <button onClick={() => handleCopy(exam)} className="p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90" title="Copier Détails"><Copy size={20}/></button>
                {canManage && (
                  <>
                    <button onClick={() => { setEditingId(exam.id); setFormData({ subject: exam.subject, date: examDate.toISOString().split('T')[0], time: examDate.toTimeString().slice(0,5), room: exam.room, className: exam.className, duration: exam.duration || '2h', notes: exam.notes || '' }); setIsModalOpen(true); }} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90" title="Éditer"><Pencil size={20}/></button>
                    <button onClick={() => handleDelete(exam.id)} className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90" title="Retirer"><Trash2 size={20}/></button>
                  </>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="py-32 text-center bg-white dark:bg-slate-900 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6">
             <CalendarIcon size={64} className="text-slate-100 dark:text-slate-800" />
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Aucune épreuve planifiée pour le moment.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Mise à jour de l'épreuve" : "Nouvelle Évaluation"}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const isoDate = new Date(`${formData.date}T${formData.time}`).toISOString();
            const payload = { ...formData, date: isoDate, className: isAdmin ? formData.className : (user?.className || 'Général') };
            if (editingId) await API.exams.update(editingId, payload);
            else await API.exams.create(payload);
            fetchExams();
            setIsModalOpen(false);
            addNotification({ title: 'Succès', message: 'Examen synchronisé.', type: 'success' });
          } catch (error) { addNotification({ title: 'Erreur', message: "Échec de l'action.", type: 'alert' }); }
          finally { setSubmitting(false); }
        }} className="space-y-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Module / Unité</label>
             <input required placeholder="ex: Réseaux & Télécoms..." value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-amber-50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold border-none" />
            <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold border-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Durée (ex: 3h)" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold border-none" />
            <input required placeholder="Salle (ex: Amphi 1)" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold border-none" />
          </div>
          <textarea placeholder="Observations particulières..." rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-amber-50" />
          <select required value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase outline-none border-none">
             <option value="Général">Campus Global</option>
             {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <button type="submit" disabled={submitting} className="w-full py-5 bg-amber-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all italic">
            {submitting ? <Loader2 className="animate-spin mx-auto"/> : (editingId ? "Sauvegarder" : "Publier l'épreuve")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
