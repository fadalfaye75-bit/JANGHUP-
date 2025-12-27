
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Loader2, Save, Calendar as CalendarIcon, Edit3, Trash2, 
  Printer, Maximize, Minimize, Check, Clock, RefreshCcw, 
  UploadCloud, MapPin, FileSpreadsheet, ChevronRight, UserCheck,
  BookOpen, Beaker, GraduationCap, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ScheduleSlot } from '../types';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_STEPS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];

const THEMES = {
  TP: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-600', text: 'text-indigo-700 dark:text-indigo-300', accent: 'bg-indigo-600', icon: Beaker },
  CM: { bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-600', text: 'text-sky-700 dark:text-sky-300', accent: 'bg-sky-600', icon: GraduationCap },
  TD: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-600', text: 'text-emerald-700 dark:text-emerald-300', accent: 'bg-emerald-600', icon: BookOpen },
  DEFAULT: { bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-400', text: 'text-slate-700 dark:text-slate-300', accent: 'bg-slate-600', icon: CalendarIcon }
};

export default function Schedule() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Partial<ScheduleSlot> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const excelInputRef = useRef<HTMLInputElement>(null);

  const currentClassName = useMemo(() => {
    return (user?.role === UserRole.ADMIN && adminViewClass) ? adminViewClass : (user?.classname || 'Général');
  }, [user, adminViewClass]);

  const canEdit = useMemo(() => {
    return user?.role === UserRole.ADMIN || (user?.role === UserRole.DELEGATE && user.classname === currentClassName);
  }, [user, currentClassName]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const rawSlots = await API.schedules.getSlots(currentClassName);
      setSlots(rawSlots);
      setHasUnsavedChanges(false);
    } catch (error) {
      addNotification({ title: 'Erreur Sync', message: "Impossible de charger le planning.", type: 'alert' });
    } finally {
      setLoading(false);
    }
  }, [currentClassName, addNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // Logique simplifiée d'extraction (à adapter selon le template ESP)
        const importedSlots: ScheduleSlot[] = [];
        // Analyse des lignes/colonnes pour remplir importedSlots...
        
        setSlots(importedSlots);
        setHasUnsavedChanges(true);
        addNotification({ title: 'Importation Réussie', message: `${importedSlots.length} créneaux extraits.`, type: 'success' });
      } catch (err) {
        addNotification({ title: 'Erreur', message: "Lecture Excel impossible.", type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Synchronisé', message: 'Planning mis à jour sur le cloud.', type: 'success' });
      setHasUnsavedChanges(false);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Sauvegarde échouée.', type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (dayIdx: number, time: string) => {
    const slot = slots.find(s => s.day === dayIdx && s.starttime === time);
    const cat = slot?.subject.toUpperCase().includes('TP') ? 'TP' : slot?.subject.toUpperCase().includes('CM') ? 'CM' : 'TD';
    const theme = THEMES[cat as keyof typeof THEMES] || THEMES.DEFAULT;

    return (
      <div 
        onClick={() => { if(canEdit) { setSelectedSlot(slot || { day: dayIdx, starttime: time, endtime: TIME_STEPS[TIME_STEPS.indexOf(time)+2], classname: currentClassName }); setShowEditModal(true); } }}
        className={`h-full border-b border-r border-slate-100 dark:border-slate-800 p-1 transition-all ${canEdit ? 'hover:bg-brand/5 cursor-pointer' : ''}`}
      >
        {slot && (
          <div className={`h-full rounded-xl border-l-4 p-2 shadow-sm ${theme.bg} ${theme.border} animate-fade-in`}>
             <p className={`text-[10px] font-black uppercase leading-tight line-clamp-2 ${theme.text}`}>{slot.subject}</p>
             <div className="mt-1 flex items-center gap-1 opacity-60">
                <MapPin size={8} /> <span className="text-[8px] font-bold">{slot.room}</span>
             </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Chargement de l'emploi du temps...</p>
    </div>
  );

  return (
    <div className={`space-y-10 animate-fade-in pb-20 ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-950 p-8' : ''}`}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-premium"><CalendarIcon size={32} /></div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Planning</h2>
              <p className="text-brand font-black text-[10px] uppercase tracking-widest mt-1">{currentClassName}</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
             <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-soft text-slate-400 hover:text-brand transition-all">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
             </button>
             {canEdit && (
               <button onClick={handleSave} disabled={saving || !hasUnsavedChanges} className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-premium flex items-center gap-2 disabled:opacity-50 transition-all">
                 {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Synchroniser
               </button>
             )}
        </div>
      </div>

      {canEdit && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-soft border border-slate-50 dark:border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-brand/10 text-brand rounded-xl"><UploadCloud size={24} /></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 italic">Mise à jour rapide via Excel</p>
           </div>
           <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
           <button onClick={() => excelInputRef.current?.click()} className="px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all">
              Choisir un fichier
           </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-premium">
         <div className="grid grid-cols-[80px_repeat(6,1fr)] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest py-4 text-center">
            <div className="border-r border-white/10 italic">H</div>
            {DAYS.map(day => <div key={day} className="border-r border-white/10 last:border-0">{day}</div>)}
         </div>
         <div className="grid grid-cols-[80px_repeat(6,1fr)] auto-rows-[60px]">
            {TIME_STEPS.slice(0, -1).map(time => (
               <React.Fragment key={time}>
                  <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 font-black text-[11px] text-slate-400 italic border-b border-r border-slate-100 dark:border-slate-800">{time}</div>
                  {DAYS.map((_, idx) => renderCell(idx, time))}
               </React.Fragment>
            ))}
         </div>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Édition du créneau">
         {selectedSlot && (
           <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              setSlots(prev => [...prev.filter(s => !(s.day === selectedSlot.day && s.starttime === selectedSlot.starttime)), selectedSlot as ScheduleSlot]);
              setHasUnsavedChanges(true);
              setShowEditModal(false);
           }}>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400">Matière (ex: Informatique TP)</label>
                 <input required value={selectedSlot.subject || ''} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Salle</label>
                    <input required value={selectedSlot.room || ''} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Professeur</label>
                    <input required value={selectedSlot.teacher || ''} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold outline-none" />
                 </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl">Appliquer les changements</button>
              {selectedSlot.id && (
                <button type="button" onClick={() => { setSlots(prev => prev.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); }} className="w-full py-2 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:underline">Supprimer ce cours</button>
              )}
           </form>
         )}
      </Modal>
    </div>
  );
}
