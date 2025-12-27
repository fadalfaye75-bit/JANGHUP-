
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Loader2, Save, Calendar as CalendarIcon, Edit3, Trash2, 
  FileSpreadsheet, ShieldCheck, Printer, Maximize, Minimize, RefreshCw, Info, Check, X, ChevronRight, Clock
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

const isPauseSlot = (time: string) => {
  return time >= "12:00" && time < "14:30";
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

  // LOGIQUE DE PERMISSION CRITIQUE : Délégués et Admins
  const canEdit = useMemo(() => {
    if (!user) return false;
    // Admins : Pleins pouvoirs
    if (user.role === UserRole.ADMIN) return true;
    
    // Délégués : Uniquement si la classe visualisée est la leur
    if (user.role === UserRole.DELEGATE) {
      const uClass = String(user.classname || '').trim().toLowerCase();
      const vClass = String(currentClassName || '').trim().toLowerCase();
      // On compare sans tenir compte des espaces superflus ou de la casse
      return uClass !== '' && uClass === vClass;
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
        endtime: (s.endtime || "").padStart(5, '0'),
      }));
      setSlots(normalized);
      setHasUnsavedChanges(false);
    } catch (error) {
      addNotification({ title: 'Erreur Sync', message: "Grille inaccessible.", type: 'alert' });
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

        if (data.length === 0) {
          addNotification({ title: 'Fichier vide', message: "Aucune donnée trouvée dans le fichier.", type: 'warning' });
          return;
        }

        const importedSlots: ScheduleSlot[] = data.map((row, idx) => {
          // Normalisation des clés pour supporter plusieurs noms de colonnes
          const findKey = (keys: string[]) => {
            const rowKey = Object.keys(row).find(k => keys.some(target => k.toLowerCase().includes(target.toLowerCase())));
            return rowKey ? row[rowKey] : null;
          };

          const rawDay = (findKey(["Jour", "Day"]) || "").toString();
          const dayIdx = DAYS.findIndex(d => d.toLowerCase() === rawDay.toLowerCase() || d.toLowerCase().includes(rawDay.toLowerCase()));
          
          const start = (findKey(["Début", "Start"]) || "08:00").toString().padStart(5, '0');
          const end = (findKey(["Fin", "End"]) || "10:00").toString().padStart(5, '0');
          const subj = findKey(["Matière", "Subject", "Module"]) || "Sans titre";
          const prof = findKey(["Prof", "Enseignant", "Teacher"]) || "À définir";
          const room = findKey(["Salle", "Room"]) || "TBD";

          return {
            id: `import-${idx}-${Date.now()}`,
            day: dayIdx,
            starttime: start,
            endtime: end,
            subject: subj.toString(),
            teacher: prof.toString(),
            room: room.toString(),
            color: "#FFFFFF",
            classname: currentClassName
          };
        }).filter(s => s.day !== -1);

        if (importedSlots.length > 0) {
          setSlots(importedSlots);
          setHasUnsavedChanges(true);
          addNotification({ title: 'Importation Réussie', message: `${importedSlots.length} cours détectés. N'oubliez pas de sauvegarder.`, type: 'success' });
        } else {
          addNotification({ title: 'Format invalide', message: "Vérifiez que vos colonnes s'appellent : Jour, Début, Fin, Matière.", type: 'alert' });
        }
      } catch (err) {
        addNotification({ title: 'Erreur', message: "Échec de lecture du fichier Excel.", type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Enregistré', message: 'L\'emploi du temps a été mis à jour avec succès.', type: 'success' });
      setHasUnsavedChanges(false);
      fetchData(true);
    } catch (e: any) {
      addNotification({ title: 'Action refusée', message: e.message, type: 'alert' });
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

      return (
        <div 
          key={slot.id || `${dayIdx}-${time}`}
          onClick={() => { if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
          className={`absolute inset-[1px] p-2 md:p-4 border-[2px] md:border-[3px] border-black dark:border-white bg-white dark:bg-slate-800 flex flex-col items-center justify-center text-center z-10 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 overflow-hidden ${canEdit ? 'cursor-pointer' : ''}`}
          style={{ height: `calc(${durationRows} * 100% + ${(durationRows - 1) * 1}px)` }}
        >
          <div className="flex flex-col gap-1 max-w-full">
            <p className="text-[10px] md:text-xs font-black uppercase text-slate-900 dark:text-white leading-tight italic line-clamp-3">
              {slot.subject}
            </p>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase truncate">
              {slot.teacher}
            </p>
            <div className="w-1/2 h-[1px] bg-slate-200 dark:bg-slate-600 mx-auto my-1" />
            <p className="text-[10px] md:text-[11px] font-black text-slate-900 dark:text-brand tracking-tighter uppercase italic">
              Salle: {slot.room}
            </p>
          </div>
          {canEdit && <Edit3 size={10} className="absolute top-1 right-1 opacity-0 group-hover/slot:opacity-40 no-print" />}
        </div>
      );
    }

    if (isPauseSlot(time)) {
        return (
          <div className="w-full h-full bg-slate-100/50 dark:bg-slate-800/20 border-b border-r border-slate-200 dark:border-slate-800 flex items-center justify-center select-none">
             {time === "13:00" && <span className="text-[9px] font-black tracking-[0.6em] text-slate-300 uppercase italic">PAUSE</span>}
          </div>
        );
    }

    return (
      <div 
        onClick={() => {
          if(canEdit) {
            const startIdx = TIME_STEPS.indexOf(time);
            setSelectedSlot({ 
              day: dayIdx, starttime: time, endtime: TIME_STEPS[startIdx + 3] || "18:30", 
              subject: '', teacher: '', room: '', classname: currentClassName 
            });
            setShowEditModal(true);
          }
        }}
        className={`w-full h-full border-b border-r border-slate-200 dark:border-slate-800 transition-colors ${canEdit ? 'hover:bg-brand-50 cursor-crosshair' : ''}`}
      />
    );
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 gap-6">
        <Loader2 className="animate-spin text-brand" size={48} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Initialisation de l'emploi du temps...</p>
    </div>
  );

  return (
    <div className={`max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-32 px-4 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-slate-950 p-6 overflow-auto' : ''}`}>
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg"><CalendarIcon size={28} /></div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Planning de cours</h2>
              <div className="flex items-center gap-3 mt-2">
                 <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase rounded-lg border border-slate-200 dark:border-slate-700 italic">Classe: {currentClassName}</span>
                 {canEdit && <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-lg border border-amber-100 flex items-center gap-2"><ShieldCheck size={12}/> Gestionnaire</span>}
              </div>
           </div>
        </div>

        <div className="flex flex-wrap gap-2">
             <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
             </button>

             <button onClick={() => window.print()} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all">
                <Printer size={18} />
             </button>

             {canEdit && (
               <>
                <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
                <button onClick={() => excelInputRef.current?.click()} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:brightness-110 transition-all italic">
                    <FileSpreadsheet size={16} /> Import Excel
                </button>
                <button onClick={handleSave} disabled={saving || !hasUnsavedChanges} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all italic ${hasUnsavedChanges ? 'bg-slate-900 text-white animate-pulse' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                  {hasUnsavedChanges ? "Sauvegarder" : "À jour"}
                </button>
               </>
             )}
        </div>
      </div>

      <section id="planning-print-area" className="bg-white dark:bg-slate-900 border-[3px] md:border-[4px] border-slate-900 dark:border-white overflow-hidden shadow-2xl">
         <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[900px]">
               <div className="grid grid-cols-[80px_repeat(6,1fr)] bg-slate-800 border-b-[3px] border-slate-900">
                  <div className="h-14 flex items-center justify-center border-r-[2px] border-white/20 text-white font-black text-2xl italic">H</div>
                  {DAYS.map(day => (
                    <div key={day} className="h-14 flex items-center justify-center font-black italic uppercase text-lg tracking-widest text-white border-r-[2px] border-white/20 last:border-0">{day}</div>
                  ))}
               </div>
               
               <div className="relative">
                  {DISPLAY_SLOTS.map((time) => (
                    <div key={time} className="grid grid-cols-[80px_repeat(6,1fr)] h-12">
                       <div className="flex items-center justify-center border-r-[3px] border-slate-900 bg-slate-50 dark:bg-slate-800 font-black text-[11px] italic text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                          {time}
                       </div>
                       {DAYS.map((_, dayIdx) => (
                          <div key={dayIdx} className="relative h-full">
                             {renderGridCell(dayIdx, time)}
                          </div>
                       ))}
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </section>

      <div className="flex flex-col sm:flex-row justify-between items-center px-4 no-print gap-4">
          <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            <Info size={18} className="text-brand" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-relaxed">
              Standard ESP • Pas de 30 min • Grille académique officielle.
            </p>
          </div>
          <div className="flex items-center gap-2 opacity-30 italic">
             <Clock size={14} />
             <span className="text-[9px] font-black uppercase tracking-widest">Généré via JANGHUP PREMIUM</span>
          </div>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Gestion du créneau">
        {selectedSlot && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const newSlot = selectedSlot as ScheduleSlot;
            const newId = selectedSlot.id || `temp-${Date.now()}`;
            if (selectedSlot.id) {
              setSlots(prev => prev.map(s => s.id === selectedSlot.id ? { ...newSlot, id: newId } : s));
            } else {
              setSlots(prev => [...prev, { ...newSlot, id: newId }]);
            }
            setHasUnsavedChanges(true);
            setShowEditModal(false);
          }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Module / Matière</label>
              <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold italic outline-none border-2 border-transparent focus:border-slate-900" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Salle</label>
                <input required placeholder="DGE-Mezz G" value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold italic border-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Enseignant</label>
                <input required placeholder="Dr. SY" value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold italic border-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Début</label>
                  <select value={selectedSlot.starttime} onChange={e => setSelectedSlot({...selectedSlot, starttime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-black text-[11px] uppercase border-none outline-none">
                    {DISPLAY_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Fin</label>
                  <select value={selectedSlot.endtime} onChange={e => setSelectedSlot({...selectedSlot, endtime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-black text-[11px] uppercase border-none outline-none">
                    {TIME_STEPS.slice(TIME_STEPS.indexOf(selectedSlot.starttime || "08:00") + 1).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
            </div>

            <div className="flex gap-4 pt-4">
               <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl italic flex items-center justify-center gap-3"><Check size={20}/> Confirmer</button>
               {selectedSlot.id && (
                 <button type="button" onClick={() => { setSlots(prev => prev.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); }} className="p-4 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={24}/></button>
               )}
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        @media print {
          body { background: white !important; }
          #planning-print-area { border: 2px solid black !important; border-radius: 0 !important; transform: scale(0.98); transform-origin: top center; width: 100% !important; margin: 0 !important; }
          .no-print { display: none !important; }
          #planning-print-area * { color: black !important; border-color: black !important; }
          #planning-print-area .bg-slate-800 { background-color: #000 !important; -webkit-print-color-adjust: exact; }
          #planning-print-area .text-white { color: #fff !important; -webkit-print-color-adjust: exact; }
          #planning-print-area .bg-slate-50 { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
