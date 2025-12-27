
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { 
  Clock, MapPin, Plus, Trash2, Loader2, Pencil, 
  Calendar as CalendarIcon, Timer, FileText, 
  MessageCircle, AlertTriangle, ClipboardCopy, 
  // Added GraduationCap to imports
  ChevronRight, Info, BookOpen, Bell, GraduationCap
} from 'lucide-react';
import { UserRole, Exam, ClassGroup } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

export default function Exams() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  const themeColor = user?.themecolor || '#87CEEB';

  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    subject: '', 
    date: '', 
    time: '', 
    room: '', 
    classname: '', 
    duration: '2h00', 
    notes: '' 
  });

  const canPost = useMemo(() => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;
  }, [user]);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await API.exams.list();
      setExams(data);
    } catch (error) {
      addNotification({ title: 'Erreur Sync', message: 'Impossible de charger l\'agenda des examens.', type: 'alert' });
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
    const dateStr = examDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = examDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    return `🚨 *ALERTE EXAMEN JANGHUP*\n\n📚 *Matière* : ${exam.subject}\n📅 *Date* : ${dateStr}\n⏰ *Heure* : ${timeStr}\n⌛ *Durée* : ${exam.duration}\n🏛️ *Salle* : ${exam.room}\n\n📝 *Notes* : ${exam.notes || 'Aucune consigne particulière.'}\n\n👉 *Détails complets sur l'app* :\n${window.location.origin}/#/exams\n\n— _Service Académique JANGHUP_`;
  };

  const handleShareWhatsApp = (exam: Exam) => {
    API.sharing.whatsapp(getWhatsAppTemplate(exam));
  };

  const handleCopyTemplate = (exam: Exam) => {
    navigator.clipboard.writeText(getWhatsAppTemplate(exam));
    addNotification({ title: 'Copié !', message: 'Modèle WhatsApp prêt à être diffusé.', type: 'success' });
  };

  const filteredExams = useMemo(() => {
    const now = new Date().getTime();
    return exams.filter(exam => {
      const target = exam.classname || 'Général';
      const isVisible = user?.role === UserRole.ADMIN 
        ? (adminViewClass ? (target === adminViewClass || target === 'Général') : true) 
        : (target === user?.classname || target === 'Général');
      
      // On garde aussi les examens passés de moins de 24h pour info
      const examTime = new Date(exam.date).getTime();
      return isVisible && (examTime > now - (24 * 60 * 60 * 1000));
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exams, user, adminViewClass]);

  const getDaysDiff = (dateStr: string) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const examDate = new Date(dateStr);
    examDate.setHours(0,0,0,0);
    const diff = examDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isoDate = new Date(`${formData.date}T${formData.time}`).toISOString();
      const payload = { 
        ...formData, 
        date: isoDate, 
        classname: user?.role === UserRole.ADMIN ? (formData.classname || 'Général') : (user?.classname || 'Général') 
      };
      
      if (editingId) {
        await API.exams.update(editingId, payload);
        addNotification({ title: 'Mis à jour', message: 'L\'épreuve a été modifiée avec succès.', type: 'success' });
      } else {
        await API.exams.create(payload);
        addNotification({ title: 'Programmé', message: 'Nouvel examen ajouté au calendrier.', type: 'success' });
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      fetchExams();
    } catch (error) {
      addNotification({ title: 'Erreur', message: "Échec de l'enregistrement technique.", type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement cette épreuve ?")) return;
    try {
      await API.exams.delete(id);
      addNotification({ title: 'Supprimé', message: 'L\'examen a été retiré de l\'agenda.', type: 'info' });
      fetchExams();
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Action non autorisée.', type: 'alert' });
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-40 gap-6">
      <Loader2 className="animate-spin text-amber-500" size={64} />
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic animate-pulse">Initialisation du calendrier des épreuves...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-48 animate-fade-in px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-8">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-premium transform -rotate-3 hover:rotate-0 transition-transform duration-500">
              <GraduationCap size={40} />
           </div>
           <div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Examens</h2>
              <div className="flex items-center gap-4 mt-4">
                 <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase rounded-xl border border-slate-200 dark:border-slate-700 italic flex items-center gap-2">
                   <Bell size={14} /> Agenda Officiel
                 </span>
              </div>
           </div>
        </div>
        
        {canPost && (
          <button 
            onClick={() => { 
              setEditingId(null); 
              setFormData({ subject: '', date: '', time: '', room: '', classname: user?.classname || '', duration: '2h00', notes: '' }); 
              setIsModalOpen(true); 
            }} 
            className="w-full md:w-auto bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest italic flex items-center justify-center gap-3 shadow-premium hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={20} /> Programmer une épreuve
          </button>
        )}
      </div>

      {/* Exams Grid */}
      <div className="grid gap-10">
        {filteredExams.length > 0 ? filteredExams.map((exam) => {
          const daysLeft = getDaysDiff(exam.date);
          const isUpcoming = daysLeft >= 0;
          const isVerySoon = daysLeft >= 0 && daysLeft <= 7;
          const examDate = new Date(exam.date);
          const canManage = user?.role === UserRole.ADMIN || user?.id === exam.user_id;

          return (
            <div key={exam.id} className="group bg-white dark:bg-slate-900 rounded-[4rem] p-8 md:p-12 shadow-soft border-2 border-transparent hover:border-amber-100 dark:hover:border-amber-900/30 transition-all flex flex-col md:flex-row gap-10 items-start relative overflow-hidden">
              {/* Alert Ribbon */}
              <div className={`absolute top-0 left-0 w-3 h-full transition-all ${isVerySoon ? 'bg-rose-500 shadow-[2px_0_15px_rgba(244,63,94,0.4)] animate-pulse' : 'bg-amber-500'}`} />
              
              <div className="flex-1 w-full min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  {isVerySoon ? (
                    <span className="flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-100 dark:border-rose-900/30 italic">
                      <AlertTriangle size={14} /> J-{daysLeft} • Alerte Imminente
                    </span>
                  ) : isUpcoming ? (
                    <span className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-100 dark:border-amber-900/30 italic">
                      Dans {daysLeft} jours
                    </span>
                  ) : (
                    <span className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 italic">
                      Épreuve terminée
                    </span>
                  )}
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                    {exam.classname}
                  </span>
                </div>

                <h3 className="text-3xl md:text-5xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter mb-8 group-hover:text-amber-600 transition-colors leading-none">
                  {exam.subject}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <CalendarIcon size={20} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                       <p className="text-sm font-black italic text-slate-700 dark:text-slate-300 truncate">
                         {examDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                       </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <Clock size={20} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Heure</p>
                       <p className="text-sm font-black italic text-slate-700 dark:text-slate-300">
                         {examDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <MapPin size={20} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Salle</p>
                       <p className="text-sm font-black italic text-slate-700 dark:text-slate-300 truncate">{exam.room}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <Timer size={20} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Durée</p>
                       <p className="text-sm font-black italic text-slate-700 dark:text-slate-300">{exam.duration}</p>
                    </div>
                  </div>
                </div>

                {exam.notes && (
                  <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-4 italic group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 transition-all">
                    <FileText size={20} className="text-amber-500 shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Notes spécifiques</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{exam.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex md:flex-col items-center justify-center gap-4 md:pl-10 md:border-l border-slate-100 dark:border-slate-800 shrink-0 self-stretch">
                <button 
                  onClick={() => handleShareWhatsApp(exam)} 
                  className="p-5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-[2rem] hover:bg-emerald-500 hover:text-white transition-all shadow-premium active:scale-90" 
                  title="Partager sur WhatsApp"
                >
                  <MessageCircle size={24}/>
                </button>
                <button 
                  onClick={() => handleCopyTemplate(exam)} 
                  className="p-5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-[2rem] hover:bg-slate-900 hover:text-white transition-all shadow-premium active:scale-90" 
                  title="Copier le signal"
                >
                  <ClipboardCopy size={24}/>
                </button>
                {canManage && (
                  <>
                    <div className="hidden md:block w-8 h-[1px] bg-slate-100 dark:bg-slate-800 my-2" />
                    <button 
                      onClick={() => { 
                        setEditingId(exam.id); 
                        const d = new Date(exam.date);
                        setFormData({ 
                          subject: exam.subject, 
                          date: d.toISOString().split('T')[0], 
                          time: d.toTimeString().slice(0, 5), 
                          room: exam.room, 
                          classname: exam.classname, 
                          duration: exam.duration, 
                          notes: exam.notes || '' 
                        }); 
                        setIsModalOpen(true); 
                      }} 
                      className="p-5 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-[2rem] hover:bg-blue-500 hover:text-white transition-all shadow-premium active:scale-90"
                    >
                      <Pencil size={24}/>
                    </button>
                    <button 
                      onClick={() => handleDelete(exam.id)} 
                      className="p-5 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-[2rem] hover:bg-rose-500 hover:text-white transition-all shadow-premium active:scale-90"
                    >
                      <Trash2 size={24}/>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="py-40 text-center bg-white dark:bg-slate-900 rounded-[5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center gap-8">
             <CalendarIcon size={80} className="text-slate-100 dark:text-slate-800 animate-pulse" />
             <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Aucune épreuve planifiée à l'horizon.</p>
          </div>
        )}
      </div>

      {/* Program / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Éditer l'épreuve" : "Nouvelle Évaluation"}>
        <form onSubmit={handleSave} className="space-y-8 py-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Matière / Module</label>
              <div className="relative">
                <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  required 
                  value={formData.subject} 
                  onChange={e => setFormData({...formData, subject: e.target.value})} 
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] font-black italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm" 
                  placeholder="Ex: Analyse Numérique" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Date</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-bold text-sm border-none outline-none shadow-sm" 
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Heure</label>
                  <input 
                    required 
                    type="time" 
                    value={formData.time} 
                    onChange={e => setFormData({...formData, time: e.target.value})} 
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-bold text-sm border-none outline-none shadow-sm" 
                  />
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Salle / Amphi</label>
                  <div className="relative">
                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required 
                      value={formData.room} 
                      onChange={e => setFormData({...formData, room: e.target.value})} 
                      className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-bold italic border-none outline-none text-sm" 
                      placeholder="Amphi IP" 
                    />
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Durée estimée</label>
                  <div className="relative">
                    <Timer className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required 
                      value={formData.duration} 
                      onChange={e => setFormData({...formData, duration: e.target.value})} 
                      className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-bold italic border-none outline-none text-sm" 
                      placeholder="Ex: 2h30" 
                    />
                  </div>
               </div>
            </div>

            <div className="space-y-3">
               <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Classe concernée</label>
               <select 
                 value={formData.classname} 
                 onChange={e => setFormData({...formData, classname: e.target.value})} 
                 className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[11px] uppercase outline-none border-none shadow-sm cursor-pointer"
               >
                 <option value="Général">Toutes les classes</option>
                 {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
               </select>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 italic ml-2 tracking-widest">Consignes / Notes spécifiques</label>
              <textarea 
                rows={4} 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] font-bold italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm leading-relaxed" 
                placeholder="Ex: Calculatrice non autorisée, Apporter sa propre feuille..." 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full py-6 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-premium active:scale-95 transition-all italic flex items-center justify-center gap-4 hover:brightness-110" 
            style={{ backgroundColor: themeColor }}
          >
            {submitting ? <Loader2 className="animate-spin" size={24} /> : (editingId ? "Actualiser l'épreuve" : "Valider le calendrier")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
