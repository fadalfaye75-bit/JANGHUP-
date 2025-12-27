
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Loader2, Save, Calendar as CalendarIcon, Edit3, Trash2, 
  ShieldCheck, Printer, Maximize, Minimize, 
  Check, Clock, RefreshCcw, UploadCloud, MapPin,
  AlertTriangle, History, Undo2, FileDown,
  FileSpreadsheet, HelpCircle, ChevronRight, Sparkles, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ScheduleSlot } from '../types';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const TIME_STEPS = [];
for (let h = 8; h <= 18; h++) {
  TIME_STEPS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 18) TIME_STEPS.push(`${h.toString().padStart(2, '0')}:30`);
}
TIME_STEPS.push("18:30");

const DISPLAY_SLOTS = TIME_STEPS.slice(0, -1);

const SUBJECT_COLORS: Record<string, string> = {
  'math': '#3b82f6',
  'info': '#10b981',
  'physique': '#f59e0b',
  'anglais': '#8b5cf6',
  'eco': '#f43f5e',
  'droit': '#6366f1',
  'marketing': '#ec4899',
  'gestion': '#14b8a6',
};

const getSubjectColor = (subject: string) => {
  const s = subject.toLowerCase();
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (s.includes(key)) return color;
  }
  return '#87CEEB';
};

export default function Schedule() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [history, setHistory] = useState<ScheduleSlot[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Partial<ScheduleSlot> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDayMobile, setActiveDayMobile] = useState(new Date().getDay() - 1 < 0 ? 0 : new Date().getDay() - 1);
  const [conflicts, setConflicts] = useState<string[]>([]);
  
  const excelInputRef = useRef<HTMLInputElement>(null);

  const normalize = (str: string | undefined | null) => str?.trim().toLowerCase() || '';

  const currentClassName = useMemo(() => {
    if (user?.role === UserRole.ADMIN && adminViewClass) return adminViewClass;
    return user?.classname || 'Général';
  }, [user, adminViewClass]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    const role = String(user.role).toUpperCase();
    
    if (role === 'ADMIN') return true;
    
    if (role === 'DELEGATE') {
      const userClass = normalize(user.classname);
      const pageClass = normalize(currentClassName);
      return userClass === pageClass || userClass === 'général';
    }
    
    return false;
  }, [user, currentClassName]);

  const checkConflicts = useCallback((currentSlots: ScheduleSlot[]) => {
    const newConflicts: string[] = [];
    currentSlots.forEach((s1, i) => {
      currentSlots.forEach((s2, j) => {
        if (i === j) return;
        if (s1.day === s2.day) {
          const start1 = TIME_STEPS.indexOf(s1.starttime);
          const end1 = TIME_STEPS.indexOf(s1.endtime);
          const start2 = TIME_STEPS.indexOf(s2.starttime);
          const end2 = TIME_STEPS.indexOf(s2.endtime);
          if ((start1 < end2 && end1 > start2)) {
            newConflicts.push(s1.id || `conflict-${i}`);
          }
        }
      });
    });
    setConflicts(newConflicts);
  }, []);

  const updateSlotsWithHistory = useCallback((newSlots: ScheduleSlot[]) => {
    setHistory(prev => [slots, ...prev].slice(0, 10));
    setSlots(newSlots);
    setHasUnsavedChanges(true);
    checkConflicts(newSlots);
  }, [slots, checkConflicts]);

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[0];
      setHistory(prevHistory => prevHistory.slice(1));
      setSlots(prev);
      checkConflicts(prev);
    }
  };

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const rawSlots = await API.schedules.getSlots(currentClassName);
      const normalized = (rawSlots || []).map((s: any) => ({
        ...s,
        starttime: (s.starttime || "").padStart(5, '0'),
        endtime: (s.endtime || "").padStart(5, '0'),
        color: s.color || getSubjectColor(s.subject)
      }));
      setSlots(normalized);
      setHistory([]);
      setHasUnsavedChanges(false);
      checkConflicts(normalized);
    } catch (error) {
      addNotification({ title: 'Erreur Sync', message: "Impossible de charger le planning.", type: 'alert' });
    } finally {
      setLoading(false);
    }
  }, [currentClassName, addNotification, checkConflicts]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDownloadTemplate = () => {
    const templateData = [
      { Jour: "Lundi", Début: "08:00", Fin: "10:00", Matière: "Mathématiques", Prof: "M. SARR", Salle: "Amphi 1" },
      { Jour: "Mardi", Début: "10:30", Fin: "12:30", Matière: "Informatique", Prof: "Mme. DIOP", Salle: "Labo A" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modèle_Planning");
    XLSX.writeFile(wb, "Modele_JangHup_Planning.xlsx");
    addNotification({ title: 'Modèle prêt', message: 'Remplissez le fichier et ré-importez-le.', type: 'info' });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          addNotification({ title: 'Erreur', message: "Le fichier Excel est vide.", type: 'warning' });
          return;
        }

        const importedSlots: ScheduleSlot[] = data.map((row, idx) => {
          const getVal = (variants: string[]) => {
            const key = Object.keys(row).find(k => variants.some(v => k.toLowerCase().includes(v.toLowerCase())));
            return key ? row[key] : null;
          };

          const rawDay = (getVal(["Jour", "Day", "Date"]) || "").toString();
          const dayIdx = DAYS.findIndex(d => normalize(d) === normalize(rawDay) || normalize(d).includes(normalize(rawDay)));
          
          let start = (getVal(["Début", "Start", "Heure", "Time"]) || "08:00").toString().replace('h', ':').padStart(5, '0');
          let end = (getVal(["Fin", "End", "Jusqu'à"]) || "10:00").toString().replace('h', ':').padStart(5, '0');
          const subject = getVal(["Matière", "Subject", "Module", "Cours"]) || "Inconnu";
          const teacher = getVal(["Prof", "Enseignant", "Teacher"]) || "À définir";
          const room = getVal(["Salle", "Room", "Lieu"]) || "ESP";

          return {
            id: `temp-${idx}-${Date.now()}`,
            day: dayIdx,
            starttime: start,
            endtime: end,
            subject: subject.toString(),
            teacher: teacher.toString(),
            room: room.toString(),
            color: getSubjectColor(subject.toString()),
            classname: currentClassName
          };
        }).filter(s => s.day !== -1);

        if (importedSlots.length > 0) {
          updateSlotsWithHistory(importedSlots);
          addNotification({ title: 'Import Réussi', message: `${importedSlots.length} cours chargés. Cliquez sur Synchroniser pour valider.`, type: 'success' });
        } else {
          addNotification({ title: 'Échec', message: "Format non reconnu. Utilisez le modèle Excel.", type: 'alert' });
        }
      } catch (err) {
        addNotification({ title: 'Erreur', message: "Lecture du fichier impossible.", type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleExportExcel = () => {
    const data = slots.map(s => ({
      Jour: DAYS[s.day],
      Début: s.starttime,
      Fin: s.endtime,
      Matière: s.subject,
      Prof: s.teacher,
      Salle: s.room
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planning");
    XLSX.writeFile(wb, `Planning_${currentClassName}.xlsx`);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Succès', message: 'Le planning est maintenant à jour pour tous.', type: 'success' });
      setHasUnsavedChanges(false);
      setHistory([]);
      fetchData(true);
    } catch (e: any) {
      addNotification({ title: 'Erreur', message: "La sauvegarde a échoué.", type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const renderGridCell = (dayIdx: number, time: string) => {
    const slot = slots.find(s => s.day === dayIdx && s.starttime === time);
    const isCovered = slots.some(s => {
      if (s.day !== dayIdx) return false;
      const sStart = TIME_STEPS.indexOf(s.starttime);
      const sEnd = TIME_STEPS.indexOf(s.endtime);
      const current = TIME_STEPS.indexOf(time);
      return current > sStart && current < sEnd;
    });

    if (isCovered) return null;

    if (slot) {
      const startIdx = TIME_STEPS.indexOf(slot.starttime);
      const endIdx = TIME_STEPS.indexOf(slot.endtime);
      const durationRows = Math.max(1, endIdx - startIdx);
      const isConflict = conflicts.includes(slot.id || '');

      return (
        <div 
          key={slot.id || `${dayIdx}-${time}`}
          onClick={() => { if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
          className={`absolute inset-[3px] p-2 md:p-3 bg-white dark:bg-slate-800 border-2 rounded-2xl flex flex-col items-center justify-center text-center z-10 transition-all hover:shadow-xl overflow-hidden group ${canEdit ? 'cursor-pointer active:scale-95' : ''} ${isConflict ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-slate-900 dark:border-white shadow-sm'}`}
          style={{ height: `calc(${durationRows} * 100% + ${(durationRows - 1) * 1}px)` }}
        >
          <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: slot.color }} />
          <div className="flex flex-col gap-0.5 w-full">
            <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-900 dark:text-white leading-tight italic tracking-tighter break-words">
              {slot.subject}
            </p>
            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase truncate">
              {slot.teacher}
            </p>
            <div className="w-1/4 h-[1px] bg-slate-100 dark:bg-slate-700 mx-auto my-1.5" />
            <p className="text-[9px] md:text-[10px] font-black text-brand uppercase italic flex items-center justify-center gap-1">
               <MapPin size={10} className="hidden md:block"/> {slot.room}
            </p>
          </div>
          {isConflict && <AlertTriangle size={14} className="absolute bottom-2 right-2 text-rose-500 animate-pulse" />}
          {canEdit && <Edit3 size={12} className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity no-print" />}
        </div>
      );
    }

    return (
      <div 
        onClick={() => {
          if(canEdit) {
            const startIdx = TIME_STEPS.indexOf(time);
            setSelectedSlot({ 
              day: dayIdx, starttime: time, endtime: TIME_STEPS[startIdx + 4] || "18:30", 
              subject: '', teacher: '', room: '', classname: currentClassName, color: '#87CEEB'
            });
            setShowEditModal(true);
          }
        }}
        className={`w-full h-full border-b border-r border-slate-100 dark:border-slate-800/50 transition-colors ${canEdit ? 'hover:bg-brand/5 cursor-crosshair' : ''}`}
      />
    );
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-40 gap-8">
        <Loader2 className="animate-spin text-brand" size={64} />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Initialisation JANGHUP Sync...</p>
    </div>
  );

  return (
    <div className={`max-w-7xl mx-auto space-y-12 animate-fade-in pb-40 px-4 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-slate-950 p-8 overflow-auto' : ''}`}>
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 no-print">
        <div className="flex items-center gap-8">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 text-white rounded-[2.2rem] flex items-center justify-center shadow-premium transform -rotate-3"><CalendarIcon size={36} /></div>
           <div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Planning</h2>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                 <span className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase rounded-2xl border border-slate-200 dark:border-slate-700 italic">{currentClassName}</span>
                 {canEdit && (
                   <span className="px-5 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-2xl flex items-center gap-2 shadow-lg italic animate-pulse border border-emerald-400">
                     <ShieldCheck size={16}/> Mode Gestion Actif
                   </span>
                 )}
              </div>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
             <div className="flex p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.8rem] shadow-soft">
                <button onClick={() => setIsFullscreen(!isFullscreen)} title="Plein écran" className="p-3.5 text-slate-400 hover:text-brand transition-all">
                  {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
                <button onClick={() => window.print()} title="Imprimer" className="p-3.5 text-slate-400 hover:text-brand transition-all">
                  <Printer size={24} />
                </button>
                <button onClick={handleExportExcel} title="Télécharger Excel" className="p-3.5 text-slate-400 hover:text-brand transition-all">
                  <FileSpreadsheet size={24} />
                </button>
                <button onClick={() => fetchData()} title="Actualiser" className="p-3.5 text-slate-400 hover:text-brand transition-all">
                  <RefreshCcw size={24} />
                </button>
             </div>
        </div>
      </div>

      {/* Delegate/Admin Management Tools - High Visibility */}
      {canEdit && (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-8 sm:p-12 rounded-[4rem] shadow-premium flex flex-col md:flex-row items-center justify-between gap-10 animate-in slide-in-from-top-6 duration-700 no-print relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none group-hover:bg-white/20 transition-all duration-1000" />
            
            <div className="flex items-center gap-8 relative z-10">
               <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center shadow-xl backdrop-blur-md transform group-hover:rotate-6 transition-transform">
                  <UploadCloud size={36} />
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-emerald-200 animate-pulse" />
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Outils de Gestion</h3>
                  </div>
                  <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest leading-relaxed max-w-sm">
                    {user?.role === UserRole.DELEGATE ? "Session Délégué : " : "Session Admin : "} 
                    Pilotez le planning de <span className="underline decoration-white/40 decoration-2">{currentClassName}</span>.
                  </p>
               </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-4 relative z-10 w-full md:w-auto">
               <button onClick={handleDownloadTemplate} className="flex-1 md:flex-none px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all border border-white/20 italic">
                  <HelpCircle size={20} /> Modèle
               </button>
               <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
               <button onClick={() => excelInputRef.current?.click()} className="flex-1 md:flex-none px-10 py-5 bg-white text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all italic hover:brightness-110">
                  <FileDown size={20} /> Import Excel
               </button>
               
               <div className="w-full md:w-auto flex gap-4">
                  {hasUnsavedChanges && (
                    <button onClick={handleSave} disabled={saving} className="flex-1 md:flex-none px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all italic border-2 border-emerald-400 animate-pulse">
                      {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Synchroniser
                    </button>
                  )}
                  {history.length > 0 && (
                    <button onClick={handleUndo} className="p-5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10" title="Annuler la modification">
                      <Undo2 size={24} />
                    </button>
                  )}
               </div>
            </div>
        </div>
      )}

      {/* Mobile Day Selector */}
      <div className="lg:hidden flex overflow-x-auto gap-4 pb-10 no-print custom-scrollbar">
          {DAYS.map((day, idx) => (
            <button key={day} onClick={() => setActiveDayMobile(idx)} className={`px-12 py-5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest italic transition-all whitespace-nowrap shadow-sm border ${activeDayMobile === idx ? 'bg-slate-900 text-white border-slate-900 scale-105' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}>
              {day}
            </button>
          ))}
      </div>

      {/* Main Grid */}
      <section id="planning-print-area" className="bg-white dark:bg-slate-900 border-[6px] border-slate-900 dark:border-white rounded-[4.5rem] overflow-hidden shadow-premium relative">
         <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[1100px] lg:min-w-full">
               <div className="grid grid-cols-[130px_repeat(6,1fr)] bg-slate-900 border-b-[6px] border-slate-900">
                  <div className="h-16 flex items-center justify-center border-r-[1px] border-white/10 text-white font-black text-3xl italic">H</div>
                  {DAYS.map((day, idx) => (
                    <div key={day} className={`h-16 flex items-center justify-center font-black italic uppercase text-xs tracking-[0.4em] text-white border-r-[1px] border-white/10 last:border-0 ${activeDayMobile !== idx ? 'lg:flex hidden' : 'flex'}`}>
                      {day}
                    </div>
                  ))}
               </div>
               
               <div className="relative">
                  {DISPLAY_SLOTS.map((time) => (
                    <div key={time} className="grid grid-cols-[130px_repeat(6,1fr)] h-20">
                       <div className="flex items-center justify-center border-r-[6px] border-slate-900 bg-slate-50 dark:bg-slate-800 font-black text-[12px] italic text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 shadow-inner">
                          {time}
                       </div>
                       {DAYS.map((_, dayIdx) => (
                          <div key={dayIdx} className={`relative h-full ${activeDayMobile !== dayIdx ? 'lg:block hidden' : 'block'}`}>
                             {renderGridCell(dayIdx, time)}
                          </div>
                       ))}
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </section>

      {/* Legend */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-10 no-print gap-10">
          <div className="flex flex-wrap items-center gap-8 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft">
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-rose-500 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest italic">Conflit</span></div>
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-brand" /><span className="text-[10px] font-black uppercase tracking-widest italic">Standard</span></div>
            <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-800 hidden md:block" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">
              Planning Officiel {currentClassName} • Cycle 8h - 18h30
            </p>
          </div>
          <div className="flex items-center gap-6 text-slate-300 dark:text-slate-800 italic">
             <UserCheck size={24} />
             <span className="text-[11px] font-black uppercase tracking-[0.6em]">VÉRIFICATION ACADÉMIQUE OK</span>
          </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier la séance">
        {selectedSlot && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const newSlot = { ...selectedSlot, color: getSubjectColor(selectedSlot.subject || '') } as ScheduleSlot;
            const newId = selectedSlot.id || `temp-${Date.now()}`;
            let newSlotsList = selectedSlot.id ? slots.map(s => s.id === selectedSlot.id ? { ...newSlot, id: newId } : s) : [...slots, { ...newSlot, id: newId }];
            updateSlotsWithHistory(newSlotsList);
            setShowEditModal(false);
          }} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic">Module / Matière</label>
              <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] font-black italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm" placeholder="Ex: Algorithmique" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic">Salle</label>
                <input required placeholder="Amphi IP" value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-bold italic border-none outline-none text-sm" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic">Professeur</label>
                <input required placeholder="M. SARR" value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-bold italic border-none outline-none text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic">Début</label>
                  <select value={selectedSlot.starttime} onChange={e => setSelectedSlot({...selectedSlot, starttime: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[12px] uppercase outline-none shadow-sm cursor-pointer italic">
                    {DISPLAY_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-2 italic">Fin</label>
                  <select value={selectedSlot.endtime} onChange={e => setSelectedSlot({...selectedSlot, endtime: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] font-black text-[12px] uppercase outline-none shadow-sm cursor-pointer italic">
                    {TIME_STEPS.slice(TIME_STEPS.indexOf(selectedSlot.starttime || "08:00") + 1).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
            </div>
            <div className="flex gap-4 pt-10">
               <button type="submit" className="flex-1 bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-premium italic flex items-center justify-center gap-3 active:scale-95 transition-all"><Check size={20}/> Valider</button>
               {selectedSlot.id && (
                 <button type="button" onClick={() => { if(confirm("Supprimer ?")) { updateSlotsWithHistory(slots.filter(s => s.id !== selectedSlot.id)); setShowEditModal(false); } }} className="p-6 bg-rose-50 text-rose-500 rounded-[2rem] hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"><Trash2 size={24}/></button>
               )}
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; }
          #planning-print-area { border: 6px solid black !important; border-radius: 0 !important; transform: scale(0.9); transform-origin: top center; width: 100% !important; margin: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          #planning-print-area * { color: black !important; border-color: black !important; }
          #planning-print-area .bg-slate-900 { background-color: #000 !important; color: #fff !important; }
          #planning-print-area .bg-slate-50, #planning-print-area .bg-slate-800 { background-color: #f1f5f9 !important; }
          @page { size: landscape; margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
