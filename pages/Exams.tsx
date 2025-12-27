
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Clock, MapPin, Plus, Trash2, Loader2, Pencil, 
  Calendar as CalendarIcon, Copy, Timer, FileText, MessageCircle, AlertTriangle, ClipboardCopy
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
    subject: '', date: '', time: '', room: '', classname: '', duration: '2h', notes: ''
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

  const getWhatsAppTemplate = (exam: Exam) => {
    const examDate = new Date(exam.date);
    const dateStr = examDate.toLocaleDateString() + ' à ' + examDate.toTimeString().slice(0, 5);
    return `📢 *Information Importante – JANGHUP*\n\n🔔 *Examen : ${exam.subject}*\n📅 ${dateStr}\n📘 Salle : ${exam.room} | Durée : ${exam.duration}\n\n👉 Consultez les détails ici :\n🔗 ${window.location.origin}/#/exams\n\n— JANGHUP\nPlateforme académique officielle`;
  };

  const handleShareWhatsApp = (exam: Exam) => {
    API.sharing.whatsapp(getWhatsAppTemplate(exam));
  };

  const handleCopyTemplate = (exam: Exam) => {
    navigator.clipboard.writeText(getWhatsAppTemplate(exam));
    addNotification({ title: 'Copié', message: 'Modèle WhatsApp prêt.', type: 'success' });
  };

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const target = exam.classname || 'Général';
      return isAdmin ? (adminViewClass ? (target === adminViewClass || target === 'Général') : true) : (target === user?.classname || target === 'Général');
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exams, isAdmin, adminViewClass, user?.classname]);

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
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3">Agenda Officiel JANGHUP</p>
           </div>
        </div>
        {canPost && (
          <button onClick={() => { setEditingId(null); setFormData({ subject: '', date: '', time: '', room: '', classname: isAdmin ? '' : (user?.classname || ''), duration: '2h', notes: '' }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest italic flex items-center gap-3 shadow-xl hover:scale-105 transition-all"><Plus size={20} /> Programmer</button>
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
              <div className={`absolute top-0 left-0 w-2.5 h-full ${isUrgent ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {isUrgent ? <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-500 border border-rose-100 animate-pulse italic">J-{daysLeft} • Critique</span> : <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 italic">Prévu dans {daysLeft}j</span>}
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.classname}</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter mb-6 group-hover:text-amber-600 transition-colors">{exam.subject}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm font-bold text-slate-500">
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl italic"><CalendarIcon size={18} className="text-amber-500" /> {examDate.toLocaleDateString()}</div>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl italic"><Clock size={18} className="text-amber-500" /> {examDate.toTimeString().slice(0,5)}</div>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl italic"><MapPin size={18} className="text-amber-500" /> {exam.room}</div>
                </div>
              </div>
              <div className="flex flex-wrap md:flex-col gap-3 md:pl-10 md:border-l border-slate-100 dark:border-slate-800 self-stretch justify-center">
                <button onClick={() => handleShareWhatsApp(exam)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-90" title="Partager WhatsApp"><MessageCircle size={20}/></button>
                <button onClick={() => handleCopyTemplate(exam)} className="p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all active:scale-90" title="Copier le modèle"><ClipboardCopy size={20}/></button>
                {canManage && (
                  <button onClick={async () => { if(confirm("Supprimer ?")) { await API.exams.delete(exam.id); fetchExams(); } }} className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"><Trash2 size={20}/></button>
                )}
              </div>
            </div>
          );
        }) : <div className="py-32 text-center bg-white dark:bg-slate-900 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6"><CalendarIcon size={64} className="text-slate-100 dark:text-slate-800" /><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Aucune épreuve planifiée.</p></div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Mise à jour" : "Nouvelle Évaluation JANGHUP"}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const isoDate = new Date(`${formData.date}T${formData.time}`).toISOString();
            const payload = { ...formData, date: isoDate, classname: isAdmin ? formData.classname : (user?.classname || 'Général') };
            if (editingId) await API.exams.update(editingId, payload);
            else await API.exams.create(payload);
            fetchExams();
            setIsModalOpen(false);
            addNotification({ title: 'Succès', message: 'Examen synchronisé.', type: 'success' });
          } catch (error) { addNotification({ title: 'Erreur', message: "Échec.", type: 'alert' }); }
          finally { setSubmitting(false); }
        }} className="space-y-6">
          <input required placeholder="Module / Unité" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic" />
          <div className="grid grid-cols-2 gap-4">
            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold" />
            <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold" />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-5 bg-amber-500 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest italic">{submitting ? <Loader2 className="animate-spin mx-auto"/> : "Valider l'agenda"}</button>
        </form>
      </Modal>
    </div>
  );
}
