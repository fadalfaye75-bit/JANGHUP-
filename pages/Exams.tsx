
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Clock, MapPin, Plus, Trash2, Loader2, Pencil, 
  Calendar as CalendarIcon, Copy, Share2, Timer
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
    subject: '', date: '', time: '', room: '', className: ''
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
    const text = `📅 Examen: ${exam.subject}\n📍 Salle: ${exam.room}\n🕒 Date: ${new Date(exam.date).toLocaleString()}`;
    navigator.clipboard.writeText(text);
    addNotification({ title: 'Copié', message: 'Détails copiés.', type: 'success' });
  }, [addNotification]);

  const handleShare = useCallback((exam: Exam) => {
    const text = `🚨 *EXAMEN JANGHUP*\n\n📚 *Matière :* ${exam.subject}\n📍 *Salle :* ${exam.room}\n📅 *Date :* ${new Date(exam.date).toLocaleString()}`;
    API.sharing.whatsapp(text);
  }, []);

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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-orange-500 text-white rounded-3xl flex items-center justify-center shadow-lg"><CalendarIcon size={32} /></div>
           <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Examens</h2>
        </div>
        {canPost && (
          <button onClick={() => { setEditingId(null); setFormData({ subject: '', date: '', time: '', room: '', className: isAdmin ? '' : (user?.className || '') }); setIsModalOpen(true); }} className="bg-gray-900 dark:bg-black text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest italic flex items-center gap-2 shadow-xl hover:scale-105 transition-all">
            <Plus size={20} /> Programmer
          </button>
        )}
      </div>

      <div className="grid gap-8">
        {filteredExams.map((exam) => {
          const examDate = new Date(exam.date);
          const canManage = isAdmin || (user?.id === exam.user_id);

          return (
            <div key={exam.id} className="bg-white dark:bg-gray-900 rounded-[3.5rem] p-8 shadow-soft border-2 border-transparent hover:border-orange-100 transition-all flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2.5 h-full bg-orange-500" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-50 text-orange-600">Planifié</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase">{exam.className}</span>
                </div>
                <h3 className="text-3xl font-black italic text-gray-900 dark:text-white uppercase tracking-tighter mb-4">{exam.subject}</h3>
                <div className="flex gap-6 text-sm font-bold text-gray-500">
                  <div className="flex items-center gap-2"><Clock size={16}/> {examDate.toLocaleString()}</div>
                  <div className="flex items-center gap-2"><MapPin size={16}/> {exam.room}</div>
                </div>
              </div>
              
              <div className="flex gap-2 md:pl-8 md:border-l border-gray-100 dark:border-gray-800">
                <button onClick={() => handleShare(exam)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Share2 size={20}/></button>
                <button onClick={() => handleCopy(exam)} className="p-4 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-900 hover:text-white transition-all shadow-sm"><Copy size={20}/></button>
                {canManage && (
                  <>
                    <button onClick={() => { setEditingId(exam.id); setFormData({ subject: exam.subject, date: examDate.toISOString().split('T')[0], time: examDate.toTimeString().slice(0,5), room: exam.room, className: exam.className }); setIsModalOpen(true); }} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Pencil size={20}/></button>
                    <button onClick={() => handleDelete(exam.id)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={20}/></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Éditer" : "Créer"}>
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
            addNotification({ title: 'Succès', message: 'Mis à jour.', type: 'success' });
          } catch (error) { addNotification({ title: 'Erreur', message: "Échec.", type: 'alert' }); }
          finally { setSubmitting(false); }
        }} className="space-y-6">
          <input required placeholder="Matière" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold italic" />
          <div className="grid grid-cols-2 gap-4">
            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl" />
            <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl" />
          </div>
          <input required placeholder="Salle" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold italic" />
          <button type="submit" disabled={submitting} className="w-full py-5 bg-orange-500 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl">
            {submitting ? <Loader2 className="animate-spin mx-auto"/> : "Enregistrer"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
