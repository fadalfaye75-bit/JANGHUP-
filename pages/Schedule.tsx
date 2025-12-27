
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Loader2, Save, Calendar as CalendarIcon, Edit3, Trash2, 
  ShieldCheck, Printer, Maximize, Minimize, 
  Check, Clock, RefreshCcw, UploadCloud, MapPin,
  AlertTriangle, History, Undo2, FileDown,
  FileSpreadsheet, HelpCircle, ChevronRight, Sparkles, UserCheck,
  BookOpen, Beaker, GraduationCap, Users
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

const THEMES = {
  TP: { 
    bg: 'bg-indigo-50 dark:bg-indigo-950/40', 
    border: 'border-indigo-600', 
    text: 'text-indigo-700 dark:text-indigo-300', 
    accent: 'bg-indigo-600',
    icon: Beaker 
  },
  CM: { 
    bg: 'bg-sky-50 dark:bg-sky-950/40', 
    border: 'border-sky-600', 
    text: 'text-sky-700 dark:text-sky-300', 
    accent: 'bg-sky-600',
    icon: GraduationCap 
  },
  TD: { 
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
    border: 'border-emerald-600', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    accent: 'bg-emerald-600',
    icon: BookOpen 
  },
  DEFAULT: { 
    bg: 'bg-slate-50 dark:bg-slate-800/50', 
    border: 'border-slate-400', 
    text: 'text-slate-700 dark:text-slate-300', 
    accent: 'bg-slate-600',
    icon: CalendarIcon 
  }
};

const getCategory = (subject: string) => {
  const s = subject.toUpperCase();
  if (s.includes('TP')) return 'TP';
  if (s.includes('CM')) return 'CM';
  if (s.includes('TD')) return 'TD';
  return 'DEFAULT';
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
  const [activeDayMobile, setActiveDayMobile] = useState(new Date().getDay() - 1 < 0 ? 0 : new Date().getDay() - 1);
  
  const excelInputRef = useRef<HTMLInputElement>(null);

  const currentClassName = useMemo(() => {
    if (user?.role === UserRole.ADMIN && adminViewClass) return adminViewClass;
    return user?.classname || 'Général';
  }, [user, adminViewClass]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    const role = String(user.role).toUpperCase();
    if (role === 'ADMIN') return true;
    if (role === 'DELEGATE') {
      return user.classname.toLowerCase() === currentClassName.toLowerCase() || user.classname.toLowerCase() === 'général';
    }
    return false;
  }, [user, currentClassName]);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const rawSlots = await API.schedules.getSlots(currentClassName);
      const normalized = (rawSlots || []).map((s: any) => ({
        ...s,
        starttime: (s.starttime || "").padStart(5, '0'),
        endtime: (s.endtime || "").padStart(5, '0')
      }));
      setSlots(normalized);
      setHasUnsavedChanges(false);
    } catch (error) {
      addNotification({ title: 'Erreur', message: "Sync échouée.", type: 'alert' });
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

        let headerRowIndex = data.findIndex(row => row.some(cell => cell?.toString().toLowerCase().includes('lundi')));
        if (headerRowIndex === -1) {
          addNotification({ title: 'Format invalide', message: 'En-tête des jours introuvable.', type: 'alert' });
          return;
        }

        const daysRow = data[headerRowIndex];
        const dayColumns = DAYS.map(d => daysRow.findIndex(cell => cell?.toString().toLowerCase().includes(d.toLowerCase())));

        const importedSlots: ScheduleSlot[] = [];
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          const timeStr = row[0]?.toString().trim();
          if (!timeStr || !timeStr.includes(':')) continue;

          dayColumns.forEach((colIdx, dayIdx) => {
            if (colIdx === -1) return;
            const cellContent = row[colIdx]?.toString().trim();
            if (cellContent && cellContent.length > 5) {
              const sections = cellContent.split(/(?=Groupe:)/gi).filter(s => s.trim().length > 0);
              sections.forEach((section, sIdx) => {
                let teacher = "À définir";
                let room = "À définir";
                const teacherPrefixMatch = section.match(/(Dr|Mr|M\.|Pr|Mme):\s*([\s\S]*?)(?=\s*Salle:|$)/i);
                if (teacherPrefixMatch) {
                    teacher = `${teacherPrefixMatch[1]} ${teacherPrefixMatch[2].trim()}`;
                }
                const salleMatch = section.match(/Salle:\s*([\s\S]*?)(?=\s*Groupe:|$)/i);
                if (salleMatch) room = salleMatch[1].trim();
                const groupMatch = section.match(/Groupe:\s*([^\n]+)/i);
                const groupName = groupMatch ? groupMatch[1].trim() : "";
                let subject = section.split(/(?:Dr|Mr|M\.|Pr|Mme):|Salle:|Groupe:/i)[0].trim().replace(/\n/g, ' ');
                if (groupName) subject = `${groupName} - ${subject}`;
                const startIdx = TIME_STEPS.indexOf(timeStr.padStart(5, '0'));
                const isTP = section.toUpperCase().includes('TP');
                const duration = isTP ? 8 : 4; 
                let endIdx = Math.min(startIdx + duration, TIME_STEPS.length - 1);

                importedSlots.push({
                  id: `excel-${i}-${dayIdx}-${sIdx}`,
                  day: dayIdx,
                  starttime: timeStr.padStart(5, '0'),
                  endtime: TIME_STEPS[endIdx],
                  subject,
                  teacher,
                  room,
                  classname: currentClassName
                });
              });
            }
          });
        }
        setSlots(importedSlots);
        setHasUnsavedChanges(true);
        addNotification({ title: 'Importation Réussie', message: `${importedSlots.length} créneaux extraits pour ${currentClassName}.`, type: 'success' });
      } catch (err) {
        addNotification({ title: 'Erreur', message: "Lecture Excel impossible.", type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Synchronisé', message: `Planning ${currentClassName} mis à jour.`, type: 'success' });
      setHasUnsavedChanges(false);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Sauvegarde échouée.', type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const renderGridCell = (dayIdx: number, time: string) => {
    const startingSlots = slots.filter(s => s.day === dayIdx && s.starttime === time);
    const isOccupiedByOverlap = slots.some(s => {
      if (s.day !== dayIdx) return false;
      const sStart = TIME_STEPS.indexOf(s.starttime);
      const sEnd = TIME_STEPS.indexOf(s.endtime);
      const current = TIME_STEPS.indexOf(time);
      return current > sStart && current < sEnd;
    });

    if (isOccupiedByOverlap && startingSlots.length === 0) return null;

    return (
      <div className={`w-full h-full relative border-b border-r border-slate-100 dark:border-slate-800/50 flex gap-1 p-1 ${canEdit ? 'hover:bg-brand/5 cursor-crosshair' : ''}`}>
        {startingSlots.map((slot, idx) => {
          const startIdx = TIME_STEPS.indexOf(slot.starttime);
          const endIdx = TIME_STEPS.indexOf(slot.endtime);
          const durationRows = Math.max(1, endIdx - startIdx);
          const cat = getCategory(slot.subject);
          const theme = THEMES[cat as keyof typeof THEMES];
          const Icon = theme.icon;
          
          return (
            <div 
              key={slot.id || `${idx}`}
              onClick={(e) => { e.stopPropagation(); if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
              className={`flex-1 rounded-3xl border-l-[5px] shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1.5 z-20 flex flex-col p-3 overflow-hidden border ${theme.bg} ${theme.border} ${canEdit ? 'cursor-pointer' : ''}`}
              style={{ 
                height: `calc(${durationRows} * 100% + ${(durationRows - 1) * 4}px)`,
                position: 'absolute',
                top: '4px',
                left: `${(idx * (100 / startingSlots.length))}%`,
                width: `calc(${(100 / startingSlots.length)}% - 6px)`,
                minWidth: startingSlots.length > 1 ? '48%' : 'auto'
              }}
            >
              <div className="flex items-start justify-between mb-1.5 shrink-0">
                <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase italic text-white ${theme.accent}`}>{cat}</span>
                <Icon size={14} className={theme.text} />
              </div>
              <h4 className={`text-[10px] md:text-[11px] font-black uppercase italic tracking-tighter leading-tight mb-2 line-clamp-3 ${theme.text}`}>
                {slot.subject}
              </h4>
              <div className="mt-auto space-y-1.5 pt-1.5 border-t border-slate-900/5">
                <div className="flex items-center gap-1.5">
                  <MapPin size={10} className={theme.text} />
                  <span className="text-[9px] font-black text-slate-500 truncate italic uppercase">{slot.room}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck size={10} className={theme.text} />
                  <span className="text-[8px] font-bold text-slate-400 uppercase leading-tight italic break-words">
                    {slot.teacher}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {startingSlots.length === 0 && !isOccupiedByOverlap && canEdit && (
          <div className="absolute inset-0" onClick={() => {
            const startIdx = TIME_STEPS.indexOf(time);
            setSelectedSlot({ day: dayIdx, starttime: time, endtime: TIME_STEPS[startIdx + 4], subject: '', teacher: '', room: '', classname: currentClassName });
            setShowEditModal(true);
          }} />
        )}
      </div>
    );
  };

  return (
    <div className={`max-w-7xl mx-auto space-y-12 animate-fade-in pb-40 px-4 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-slate-950 p-8 overflow-auto' : ''}`}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 no-print">
        <div className="flex items-center gap-8">
           <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-premium transform rotate-3"><CalendarIcon size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Planning</h2>
              <div className="flex items-center gap-3 mt-2">
                 <span className="text-brand font-black text-[11px] uppercase tracking-widest italic">{currentClassName}</span>
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                 <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">DGE • ESP Dakar</span>
              </div>
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
             <div className="flex p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-soft">
                <button onClick={() => setIsFullscreen(!isFullscreen)} title="Plein écran" className="p-3.5 text-slate-400 hover:text-brand transition-all">
                  {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                </button>
                <button onClick={() => window.print()} title="Imprimer" className="p-3.5 text-slate-400 hover:text-brand transition-all">
                  <Printer size={22} />
                </button>
                <button onClick={() => fetchData()} title="Actualiser" className="p-3.5 text-slate-400 hover:text-brand transition-all">
                  <RefreshCcw size={22} />
                </button>
             </div>
             {canEdit && hasUnsavedChanges && (
               <button onClick={handleSave} disabled={saving} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-premium flex flex-col items-center leading-tight active:scale-95 transition-all italic animate-pulse">
                 <div className="flex items-center gap-2">
                   {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                   <span>Synchroniser</span>
                 </div>
                 <span className="text-[8px] opacity-70">Assigner à {currentClassName}</span>
               </button>
             )}
        </div>
      </div>

      {canEdit && (
        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-premium flex flex-col md:flex-row items-center justify-between gap-8 no-print border-t-2 border-brand">
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <UploadCloud size={30} />
               </div>
               <div className="text-white">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter">Gestion Administrative</h3>
                  <p className="text-[9px] font-bold opacity-50 uppercase tracking-[0.2em] mt-1">Importation TP (4H) & Titres Professeurs</p>
               </div>
            </div>
            <div className="flex gap-4">
               <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
               <button onClick={() => excelInputRef.current?.click()} className="px-10 py-4 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl transition-all italic hover:bg-brand hover:text-white">
                  <FileSpreadsheet size={18} /> Charger Fichier Excel
               </button>
            </div>
        </div>
      )}

      <section id="planning-print-area" className="bg-white dark:bg-slate-900 border-[6px] border-slate-900 dark:border-white rounded-[3.5rem] overflow-hidden shadow-premium">
         <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[1250px] lg:min-w-full">
               <div className="grid grid-cols-[120px_repeat(6,1fr)] bg-slate-900 border-b-[6px] border-slate-900">
                  <div className="h-14 flex items-center justify-center text-white font-black text-2xl italic">H</div>
                  {DAYS.map((day, idx) => (
                    <div key={day} className={`h-14 flex items-center justify-center font-black italic uppercase text-[10px] tracking-[0.4em] text-white border-l border-white/10 ${activeDayMobile !== idx ? 'lg:flex hidden' : 'flex'}`}>
                      {day}
                    </div>
                  ))}
               </div>
               <div className="relative">
                  {DISPLAY_SLOTS.map((time) => (
                    <div key={time} className="grid grid-cols-[120px_repeat(6,1fr)] h-24">
                       <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 font-black text-[13px] italic text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 border-r-[6px] border-slate-900">
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

      <div className="flex flex-wrap justify-between items-center gap-8 px-10 no-print">
        <div className="flex flex-wrap gap-6">
          {Object.entries(THEMES).map(([key, theme]) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full border-2 ${theme.border}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">{key}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all">
           <Users size={24} />
           <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">JANGHUP • ACADÉMIQUE</p>
        </div>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Édition de Séance">
        {selectedSlot && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const newSlot = { ...selectedSlot } as ScheduleSlot;
            const newId = selectedSlot.id || `temp-${Date.now()}`;
            setSlots(selectedSlot.id ? slots.map(s => s.id === selectedSlot.id ? { ...newSlot, id: newId } : s) : [...slots, { ...newSlot, id: newId }]);
            setHasUnsavedChanges(true);
            setShowEditModal(false);
          }} className="space-y-6 py-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Intitulé du Cours (TP pour 4H)</label>
              <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black italic outline-none border-2 border-transparent focus:border-brand transition-all text-sm" placeholder="Ex: Informatique TP" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Salle</label>
                <input required value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold italic outline-none text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Titre et Nom du Professeur</label>
                <input required value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold italic outline-none text-sm" placeholder="Ex: Dr TRAORE ou Mr SOW" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Début</label>
                  <select value={selectedSlot.starttime} onChange={e => setSelectedSlot({...selectedSlot, starttime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-black italic text-xs outline-none">
                    {DISPLAY_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Fin</label>
                  <select value={selectedSlot.endtime} onChange={e => setSelectedSlot({...selectedSlot, endtime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-black italic text-xs outline-none">
                    {TIME_STEPS.slice(TIME_STEPS.indexOf(selectedSlot.starttime || "08:00") + 1).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
            </div>
            <div className="flex gap-4 pt-6">
               <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase italic shadow-premium active:scale-95 transition-all text-xs">Sauvegarder les modifications</button>
               {selectedSlot.id && (
                 <button type="button" onClick={() => { setSlots(slots.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); }} className="p-5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"><Trash2 size={24}/></button>
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
          @page { size: landscape; margin: 0.5cm; }
        }
      `}</style>
    </div>
  );
}
