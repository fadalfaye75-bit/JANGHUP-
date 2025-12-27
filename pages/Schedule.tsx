
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Loader2, Save, Calendar as CalendarIcon, Edit3, Trash2, 
  FileSpreadsheet, ShieldCheck, Printer, Maximize, Minimize, RefreshCw, Info, Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ScheduleSlot } from '../types';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 18; hour++) {
    const h = hour.toString().padStart(2, '0');
    slots.push(`${h}:00`);
    if (hour === 18) {
      slots.push(`18:30`);
      break; 
    }
    slots.push(`${h}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const isForbiddenSlot = (time: string) => {
  return time >= "12:00" && time < "14:30";
};

const FALLBACK_DATA: ScheduleSlot[] = [
  { id: 'f1', day: 0, starttime: "08:30", endtime: "10:00", subject: "Gr3 Contrôle-commande des Systèmes Industriels 3TP", teacher: "MBOUP", room: "DGE-Laba Automatisme", color: "#FFFFFF", classname: "DUT-EEAIT-2" },
  { id: 'f2', day: 0, starttime: "10:00", endtime: "11:30", subject: "Gr2 Traitement et transmission de l'information TP", teacher: "NDIAYE", room: "DGE-Laba Electronique", color: "#FFFFFF", classname: "DUT-EEAIT-2" },
  { id: 'f3', day: 0, starttime: "14:30", endtime: "17:30", subject: "Gr3 Traitement et transmission de l'information TP", teacher: "NDIAYE", room: "DGE-Labe Electronique", color: "#FFFFFF", classname: "DUT-EEAIT-2" },
  { id: 'f4', day: 1, starttime: "08:30", endtime: "11:30", subject: "Traitement et transmission de l'information CM", teacher: "Ba", room: "DGE-Mezz G", color: "#FFFFFF", classname: "DUT-EEAIT-2" },
  { id: 'f5', day: 2, starttime: "08:30", endtime: "10:00", subject: "Convertisseurs CM", teacher: "DIENG", room: "DGE-Mezz G", color: "#FFFFFF", classname: "DUT-EEAIT-2" },
];

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
  
  const currentClassName = (user?.role === UserRole.ADMIN && adminViewClass) ? adminViewClass : (user?.classname || 'DUT-EEAIT-2');
  
  const canEdit = user?.role === UserRole.ADMIN || (user?.role === UserRole.DELEGATE && user?.classname === currentClassName);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const rawSlots = await API.schedules.getSlots(currentClassName);
      
      const normalized = (rawSlots || []).map((s: any) => ({
        id: s.id,
        day: s.day,
        starttime: (s.starttime || "").padStart(5, '0'),
        endtime: (s.endtime || "").padStart(5, '0'),
        subject: s.subject || "Sans titre",
        teacher: s.teacher || "Inconnu",
        room: s.room || "N/A",
        color: s.color || "#FFFFFF",
        classname: s.classname || currentClassName
      }));

      if (normalized.length === 0 && currentClassName === "DUT-EEAIT-2") {
        setSlots(FALLBACK_DATA);
      } else {
        setSlots(normalized);
      }
      setHasUnsavedChanges(false);
    } catch (error: any) {
      addNotification({ title: 'Erreur Sync', message: error.message, type: 'alert' });
    } finally {
      setLoading(false);
    }
  }, [currentClassName, addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const importedSlots: ScheduleSlot[] = data.map((row, idx) => {
          const dayName = row.Jour || row.Day || "";
          const dayIdx = DAYS.findIndex(d => d.toLowerCase() === dayName.toString().toLowerCase());
          
          return {
            id: `import-${idx}-${Date.now()}`,
            day: dayIdx,
            starttime: (row.Début || row.Start || row["Heure Début"] || "08:00").toString().padStart(5, '0'),
            endtime: (row.Fin || row.End || row["Heure Fin"] || "10:00").toString().padStart(5, '0'),
            subject: row.Matière || row.Subject || row.Module || "Module Inconnu",
            teacher: row.Prof || row.Enseignant || row.Teacher || "À définir",
            room: row.Salle || row.Room || "À définir",
            color: "#FFFFFF",
            classname: currentClassName
          };
        }).filter(s => s.day !== -1);

        if (importedSlots.length > 0) {
          setSlots(importedSlots);
          setHasUnsavedChanges(true);
          addNotification({ 
            title: 'Succès Import', 
            message: `${importedSlots.length} créneaux chargés. Cliquez sur "Publier" pour confirmer.`, 
            type: 'success' 
          });
        }
      } catch (err) {
        addNotification({ title: 'Erreur Excel', message: "Format non reconnu. Utilisez les colonnes: Jour, Début, Fin, Matière, Prof, Salle.", type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleClear = () => {
    if (window.confirm("Vider complètement l'emploi du temps ?")) {
      setSlots([]);
      setHasUnsavedChanges(true);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Synchronisé', message: 'Mise à jour globale effectuée.', type: 'success' });
      setHasUnsavedChanges(false);
    } catch (e: any) {
      addNotification({ title: 'Erreur', message: e.message, type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (dayIdx: number, timeStr: string) => {
    const slot = slots.find(s => s.day === dayIdx && s.starttime === timeStr);
    
    const isOccupiedBySpan = slots.some(s => {
      if (s.day !== dayIdx) return false;
      const startIdx = TIME_SLOTS.indexOf(s.starttime);
      const endIdx = TIME_SLOTS.indexOf(s.endtime);
      const currentIdx = TIME_SLOTS.indexOf(timeStr);
      return currentIdx > startIdx && currentIdx < endIdx;
    });

    if (isOccupiedBySpan) return null;

    if (slot) {
      const startIdx = TIME_SLOTS.indexOf(slot.starttime);
      const endIdx = TIME_SLOTS.indexOf(slot.endtime);
      const duration = Math.max(1, endIdx - startIdx);

      return (
        <div 
          key={slot.id || `${dayIdx}-${timeStr}`}
          onClick={(e) => { e.stopPropagation(); if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
          className={`absolute inset-[0.5px] p-2 border-[2px] border-slate-900 bg-white text-slate-900 z-20 flex flex-col justify-center text-center shadow-sm overflow-hidden ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''}`}
          style={{ height: `calc(${duration} * 100% + ${duration - 1}px)` }}
        >
          <div className="flex flex-col gap-1 h-full justify-center">
            <p className="text-[10px] font-black uppercase leading-tight text-slate-900 line-clamp-2">{slot.subject}</p>
            <p className="text-[9px] font-semibold italic text-slate-600 truncate">Dr: {slot.teacher}</p>
            <div className="w-full h-px bg-slate-200 my-0.5" />
            <p className="text-[9px] font-black uppercase text-slate-900 tracking-tight">Salle: {slot.room}</p>
          </div>
          {canEdit && <Edit3 size={10} className="absolute top-1 right-1 opacity-20 no-print" />}
        </div>
      );
    }
    
    if (isForbiddenSlot(timeStr)) {
        return (
          <div className="w-full h-full bg-slate-100/40 dark:bg-slate-800/20 border-b border-r border-slate-900/10 flex items-center justify-center pointer-events-none">
             {timeStr === "13:00" && <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 transform -rotate-90 italic select-none">PAUSE</span>}
          </div>
        );
    }

    return (
      <div 
        onClick={() => {
          if (canEdit) {
            const startIdx = TIME_SLOTS.indexOf(timeStr);
            const limit = timeStr < "12:00" ? "12:00" : "18:30";
            let defaultEnd = TIME_SLOTS[startIdx + 3] || limit; 
            if (defaultEnd > limit) defaultEnd = limit;

            setSelectedSlot({ 
              day: dayIdx, starttime: timeStr, endtime: defaultEnd, 
              subject: '', room: '', teacher: '', color: "#FFFFFF", classname: currentClassName 
            });
            setShowEditModal(true);
          }
        }}
        className={`w-full h-full border-b border-r border-slate-900/20 transition-colors ${canEdit ? 'hover:bg-brand-50/50 cursor-crosshair' : ''}`}
      />
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest italic animate-pulse">Récupération du format ESP...</p>
    </div>
  );

  return (
    <div className={`max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-32 px-4 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-slate-950 p-6 overflow-auto' : ''}`}>
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><CalendarIcon size={24} /></div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Emploi du Temps</h2>
              <div className="flex items-center gap-3 mt-2">
                 <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[8px] font-black uppercase rounded-md border border-slate-200 dark:border-slate-700 italic">Classe: {currentClassName}</span>
                 {canEdit && (
                   <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[8px] font-black uppercase rounded-md border border-amber-100 flex items-center gap-1 italic animate-pulse">
                     <ShieldCheck size={10}/> Mode Édition Actif
                   </span>
                 )}
              </div>
           </div>
        </div>

        <div className="flex flex-wrap gap-2">
             <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
             </button>

             <button onClick={() => window.print()} className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all">
                <Printer size={18} />
             </button>

             {canEdit && (
               <>
                <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
                <button onClick={() => excelInputRef.current?.click()} className="bg-emerald-600 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:brightness-110 transition-all italic">
                    <FileSpreadsheet size={16} /> Importer Excel
                </button>
                <button onClick={handleClear} className="bg-white text-rose-500 border border-rose-100 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-50 transition-all italic">
                    <RefreshCw size={16} /> Vider
                </button>
                <button onClick={handlePublish} disabled={saving || !hasUnsavedChanges} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all italic ${hasUnsavedChanges ? 'bg-slate-900 text-white animate-pulse' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                  {hasUnsavedChanges ? "Enregistrer les modifications" : "Planning à jour"}
                </button>
               </>
             )}
        </div>
      </div>

      <section id="printable-schedule" className="bg-white dark:bg-slate-900 border-[4px] border-slate-900 overflow-hidden shadow-premium">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[1100px]">
             <div className="grid grid-cols-[80px_repeat(6,1fr)] bg-slate-900 border-b-[4px] border-slate-900">
                <div className="h-16 flex items-center justify-center border-r-[2px] border-white/40 text-white font-black text-4xl italic uppercase">H</div>
                {DAYS.map(day => (
                  <div key={day} className="h-16 flex items-center justify-center font-black italic uppercase text-xl tracking-widest text-white border-r-[2px] border-white/40 last:border-0">{day}</div>
                ))}
             </div>
             
             <div className="relative">
                {TIME_SLOTS.map((time) => (
                  <div key={time} className="grid grid-cols-[80px_repeat(6,1fr)] h-12">
                     <div className="flex items-center justify-center border-r-[4px] border-slate-900 bg-slate-50 dark:bg-slate-800 font-black text-[11px] italic text-slate-900 dark:text-white border-b border-slate-900/10">
                        {time}
                     </div>
                     {DAYS.map((_, dayIdx) => (
                        <div key={dayIdx} className="relative border-r border-slate-900/20 h-full">
                           {renderCell(dayIdx, time)}
                        </div>
                     ))}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row justify-between items-center px-4 no-print gap-4">
          <div className="flex items-center gap-3 p-4 bg-slate-900/5 dark:bg-white/5 rounded-2xl border border-slate-900/10">
            <Info size={18} className="text-slate-500" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">
              Format Administratif ESP Dakar • Pas de 30 minutes • Synchronisation Temps Réel.
            </p>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-50">JangHup Production • École Supérieure Polytechnique</p>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier le créneau">
        {selectedSlot && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const slot = selectedSlot as ScheduleSlot;
            if (selectedSlot.id) setSlots(prev => prev.map(s => s.id === slot.id ? slot : s));
            else setSlots(prev => [...prev, { ...slot, id: `local-${Date.now()}` }]);
            setHasUnsavedChanges(true);
            setShowEditModal(false);
          }} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Module / Intitulé</label>
              <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-2 border-transparent focus:border-slate-900 outline-none transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Salle</label>
                <input required placeholder="ex: DGE-Labe Machines" value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Enseignant (Dr:)</label>
                <input required placeholder="ex: NDIAYE" value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Heure début</label>
                  <select value={selectedSlot.starttime} onChange={e => setSelectedSlot({...selectedSlot, starttime: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[11px] uppercase border-none outline-none">
                    {TIME_SLOTS.filter(t => !isForbiddenSlot(t)).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Heure fin</label>
                  <select value={selectedSlot.endtime} onChange={e => setSelectedSlot({...selectedSlot, endtime: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[11px] uppercase border-none outline-none">
                    {TIME_SLOTS.slice(TIME_SLOTS.indexOf(selectedSlot.starttime || "08:00") + 1).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
            </div>

            <div className="flex gap-4 pt-6">
               <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl italic transition-transform active:scale-95">Confirmer le créneau</button>
               {selectedSlot.id && (
                 <button type="button" onClick={() => { if(confirm("Supprimer ce cours ?")) { setSlots(prev => prev.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); } }} className="p-5 bg-rose-50 text-rose-500 rounded-[2rem] hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={24}/></button>
               )}
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          #printable-schedule { border: 4px solid black !important; border-radius: 0 !important; transform: scale(0.8); transform-origin: top left; width: 100% !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .custom-scrollbar { overflow: visible !important; }
          #printable-schedule * { color: black !important; border-color: black !important; }
          #printable-schedule .bg-slate-900 { background-color: #0f172a !important; -webkit-print-color-adjust: exact; }
          #printable-schedule .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
