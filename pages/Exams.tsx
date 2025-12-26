
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Clock, MapPin, Plus, Trash2, Loader2, Pencil, 
  Calendar as CalendarIcon, Copy, Share2, Timer, FileText, ChevronRight, MessageCircle, Mail
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

  const handleShareWhatsApp = useCallback((exam: Exam) => {
    const text = `🚨 *EXAMEN JANGHUP*\n\n📚 *Matière :* ${exam.subject}\n📍 *Salle :* ${exam.room}\n📅 *Date :* ${new Date(exam.date).toLocaleString()}\n⏱️ *Durée :* ${exam.duration}\n📝 *Notes :* ${exam.notes || 'N/A'}`;
    API.sharing.whatsapp(text);
  }, []);

  const handleShareEmail = useCallback((exam: Exam) => {
    const classObj = classes.find(c => c.name === exam.className);
    const to = classObj?.email || '';
    const subject = `🚨 EXAMEN PROGRAMMÉ: ${exam.subject}`;
    const body = `📚 Matière : ${exam.subject}\n📍 Salle : ${exam.room}\n📅 Date : ${new Date(exam.date).toLocaleString()}\n⏱️ Durée : ${exam.duration}\n📝 Notes : ${exam.notes || 'N/A'}\n\n🎓 Espace JANGHUP ESP`;
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

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-amber-500" size={48} /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-10">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-amber-500 text-white rounded-4xl flex items-center justify-center shadow-premium"><CalendarIcon size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Examens</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Agenda des évaluations ESP</p>
           </div>
        </div>
        {canPost && (
          <button onClick={() => { setEditingId(null); setFormData({ subject: '', date: '', time: '', room: '', className: isAdmin ? '' : (user?.className || ''), duration: '2h', notes: '' }); setIsModalOpen(true); }} className="bg-slate-900 dark:bg-slate-800 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest italic flex items-center gap-2 shadow-premium hover:scale-105 transition-all">
            <Plus size={20} /> Programmer un examen
          </button>
        )}
      </div>

      <div className="grid gap-8">
        {filteredExams.map((exam) => {
          const examDate = new Date(exam.date);
          const canManage = isAdmin || (user?.id === exam.user_id);

          return (
            <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-8 md:p-10 shadow-soft border-2 border-transparent hover:border-amber-100 transition-all flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2.5 h-full bg-amber-500" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 text-amber-600">Planifié</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.className}</span>
                </div>
                <h3 className="text-3xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter mb-4 leading-tight">{exam.subject}</h3>
                <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-bold text-slate-500 mb-6">
                  <div className="flex items-center gap-2"><Clock size={16} className="text-amber-500" /> {examDate.toLocaleString('fr-FR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="flex items-center gap-2"><Timer size={16} className="text-amber-500" /> {exam.duration}</div>
                  <div className="flex items-center gap-2"><MapPin size={16} className="text-amber-500" /> {exam.room}</div>
                </div>
                
                {exam.notes && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><FileText size={12}/> Consignes :</p>
                    <p className="text-sm font-medium italic text-slate-600 dark:text-slate-300 leading-relaxed">{exam.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 md:flex-col md:pl-8 md:border-l border-slate-100 dark:border-slate-800 self-center">
                <button onClick={() => handleShareWhatsApp(exam)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90" title="WhatsApp"><MessageCircle size={20}/></button>
                <button onClick={() => handleShareEmail(exam)} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm active:scale-90" title="Email Classe"><Mail size={20}/></button>
                <button onClick={() => handleCopy(exam)} className="p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90" title="Copier"><Copy size={20}/></button>
                {canManage && (
                  <>
                    <button onClick={() => { setEditingId(exam.id); setFormData({ subject: exam.subject, date: examDate.toISOString().split('T')[0], time: examDate.toTimeString().slice(0,5), room: exam.room, className: exam.className, duration: exam.duration || '2h', notes: exam.notes || '' }); setIsModalOpen(true); }} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90" title="Modifier"><Pencil size={20}/></button>
                    <button onClick={() => handleDelete(exam.id)} className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90" title="Supprimer"><Trash2 size={20}/></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Éditer l'épreuve" : "Nouvelle Évaluation"}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const isoDate = new Date(`${formData.date}T${formData.time}`).toISOString();
            const payload = { 
              subject: formData.subject,
              date: isoDate,
              duration: formData.duration,
              room: formData.room,
              notes: formData.notes,
              className: isAdmin ? formData.className : (user?.className || 'Général') 
            };
            
            if (editingId) await API.exams.update(editingId, payload);
            else await API.exams.create(payload);
            
            fetchExams();
            setIsModalOpen(false);
            addNotification({ title: 'Succès', message: 'Examen enregistré.', type: 'success' });
          } catch (error) { addNotification({ title: 'Erreur', message: "Échec de l'enregistrement.", type: 'alert' }); }
          finally { setSubmitting(false); }
        }} className="space-y-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Module / Matière</label>
             <input required placeholder="ex: Analyse Mathématique..." value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-none focus:ring-4 focus:ring-brand-50" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date</label>
              <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none border-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Heure</label>
              <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none border-none" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Durée</label>
              <input required placeholder="2h" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Salle</label>
              <input required placeholder="Salle 103" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-none" />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Notes (facultatif)</label>
             <textarea placeholder="Consignes..." rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-none focus:ring-4 focus:ring-brand-50" />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Classe Cible</label>
             <select required value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase outline-none border-none">
                <option value="Général">Tout le campus</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
             </select>
          </div>

          <button type="submit" disabled={submitting} className="w-full py-5 bg-amber-500 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
            {submitting ? <Loader2 className="animate-spin mx-auto"/> : (editingId ? "Enregistrer" : "Programmer")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
