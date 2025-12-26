
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Loader2, Trash2, Save, FileSpreadsheet, MapPin, User as UserIcon, Clock, Calendar as CalendarIcon, Plus, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ScheduleSlot } from '../types';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
  "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"
];

const CATEGORY_COLORS = [
  { name: 'Bleu', color: '#0ea5e9', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { name: 'Émeraude', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { name: 'Violet', color: '#8b5cf6', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
  { name: 'Ambre', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { name: 'Rose', color: '#f43f5e', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
];

const normalizeTime = (raw: any): string => {
  if (!raw) return "";
  let time = raw.toString().toLowerCase().trim().replace(/[hH]/g, ':');
  if (time.includes(':')) {
    let [h, m] = time.split(':');
    let hour = parseInt(h, 10);
    let min = parseInt(m, 10) || 0;
    if (min > 0 && min < 45) min = 30;
    else if (min >= 45) { hour += 1; min = 0; }
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }
  const val = parseInt(time, 10);
  if (!isNaN(val)) return `${val.toString().padStart(2, '0')}:00`;
  return "";
};

export default function Schedule() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const themeColor = user?.themeColor || '#0ea5e9';
  
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Partial<ScheduleSlot> | null>(null);
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;
  const currentClassName = user?.className || 'Général';

  const fetchAllData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const gridSlots = await API.schedules.getSlots(currentClassName);
      setSlots(gridSlots);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentClassName]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(data.length, 20); i++) {
          if (data[i].some(c => String(c).toLowerCase().includes('lundi'))) {
            headerRowIdx = i;
            break;
          }
        }
        if (headerRowIdx === -1) throw new Error("Fichier non reconnu (en-tête Lundi introuvable).");

        const dayCols: { [key: number]: number } = {};
        data[headerRowIdx].forEach((cell, colIdx) => {
          if (!cell) return;
          const dayIdx = DAYS.findIndex(d => String(cell).toLowerCase().includes(d.toLowerCase()));
          if (dayIdx !== -1) dayCols[dayIdx] = colIdx;
        });

        const rowToTime: { [key: number]: string } = {};
        for (let i = headerRowIdx + 1; i < data.length; i++) {
          const timeVal = data[i][0] || data[i][1];
          const norm = normalizeTime(timeVal);
          if (norm) rowToTime[i] = norm;
        }

        const parsedSlots: ScheduleSlot[] = [];
        Object.entries(dayCols).forEach(([dayIdxStr, colIdx]) => {
          const dayIdx = parseInt(dayIdxStr);
          for (let i = headerRowIdx + 1; i < data.length; i++) {
            const cellValue = data[i][colIdx];
            if (cellValue && String(cellValue).trim().length > 3) {
              const content = String(cellValue).trim();
              let startTime = rowToTime[i];
              
              if (!startTime) {
                for (let k = i - 1; k > headerRowIdx; k--) { if (rowToTime[k]) { startTime = rowToTime[k]; break; } }
              }
              if (!startTime) startTime = "08:00";

              // BLOQUAGE PAUSE DÉJEUNER DANS L'IMPORT
              if (startTime >= "12:00" && startTime < "14:30") continue;

              let lastRowOfBlock = i;
              for (let j = i + 1; j < data.length; j++) {
                const nextCell = data[j][colIdx];
                if (nextCell !== undefined && nextCell !== null && String(nextCell).trim().length > 3 && String(nextCell).trim() !== content) break;
                if (rowToTime[j] && nextCell !== undefined && String(nextCell).trim().length > 3) break;
                lastRowOfBlock = j;
              }

              let endTime = rowToTime[lastRowOfBlock + 1] || "18:30";
              if (endTime > "12:00" && endTime <= "14:30") endTime = "12:00";

              const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
              
              parsedSlots.push({
                id: `temp-${Date.now()}-${parsedSlots.length}`,
                day: dayIdx,
                startTime,
                endTime,
                subject: lines[0] || "Cours",
                teacher: lines.find(l => /pr|dr|m\.|mme/i.test(l)) || "À définir",
                room: lines.find(l => /salle|amphi/i.test(l)) || "À définir",
                color: CATEGORY_COLORS[parsedSlots.length % CATEGORY_COLORS.length].color,
                classname: currentClassName
              });
              i = lastRowOfBlock;
            }
          }
        });

        setSlots(parsedSlots);
        setHasUnsavedChanges(true);
        addNotification({ title: 'Importation réussie', message: `${parsedSlots.length} cours détectés.`, type: 'success' });
      } catch (err: any) {
        addNotification({ title: 'Erreur', message: err.message, type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Publié', message: 'Planning mis à jour.', type: 'success' });
      setHasUnsavedChanges(false);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Sauvegarde impossible.', type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const openNewSlotModal = (dayIdx: number, timeStr: string) => {
    if (!canEdit) return;
    const isPause = timeStr >= "12:00" && timeStr < "14:30";
    if (isPause) {
      addNotification({ title: 'Pause Déjeuner', message: 'Aucun cours ne peut être placé entre 12h et 14h30.', type: 'info' });
      return;
    }

    // Calculer endTime par défaut (1h après ou jusqu'à la pause)
    let [h, m] = timeStr.split(':').map(Number);
    let endH = h + 1;
    let endTimeStr = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    if (endTimeStr > "12:00" && endTimeStr < "14:30") endTimeStr = "12:00";

    setSelectedSlot({
      id: `new-${Date.now()}`,
      day: dayIdx,
      startTime: timeStr,
      endTime: endTimeStr,
      subject: '',
      teacher: '',
      room: '',
      color: themeColor,
      classname: currentClassName
    });
    setShowEditModal(true);
  };

  const renderCell = (dayIdx: number, timeStr: string) => {
    const isPause = timeStr >= "12:00" && timeStr < "14:30";
    const slot = slots.find(s => s.day === dayIdx && s.startTime === timeStr);
    
    if (slot) {
      const units = (() => {
        const [h1, m1] = slot.startTime.split(':').map(Number);
        const [h2, m2] = slot.endTime.split(':').map(Number);
        return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 30;
      })();
      const style = CATEGORY_COLORS.find(c => c.color === slot.color) || CATEGORY_COLORS[0];

      return (
        <div 
          key={slot.id}
          onClick={(e) => { e.stopPropagation(); if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
          className={`absolute inset-x-1 top-1 p-3 rounded-2xl border-l-4 shadow-sm z-20 ${style.bg} ${style.border} ${style.text} ${canEdit ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
          style={{ height: `calc(${units} * 100% - 8px)` }}
        >
          <p className="text-[10px] font-black uppercase tracking-tight line-clamp-2 leading-tight mb-1">{slot.subject}</p>
          <div className="flex flex-col gap-0.5 opacity-70">
            <div className="flex items-center gap-1 text-[9px] font-bold truncate"><MapPin size={10} /> {slot.room}</div>
            {units > 2 && <div className="flex items-center gap-1 text-[9px] font-bold truncate"><UserIcon size={10} /> {slot.teacher}</div>}
          </div>
        </div>
      );
    }
    
    return (
      <div 
        onClick={() => openNewSlotModal(dayIdx, timeStr)}
        className={`w-full h-full ${isPause ? 'bg-gray-100/50 cursor-not-allowed' : 'hover:bg-gray-50/50 cursor-cell'} transition-colors`}
      >
        {isPause && dayIdx === 2 && timeStr === "12:30" && (
           <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-black text-[9px] uppercase tracking-widest whitespace-nowrap">Pause Déjeuner (12h-14h30)</div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-32 gap-6">
      <Loader2 className="animate-spin text-primary-500" size={48} />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Chargement...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-32 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-primary-500 text-white rounded-[1.8rem] flex items-center justify-center shadow-lg"><CalendarIcon size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">Emploi du Temps</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{currentClassName} • ESP Dakar</p>
           </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-3 bg-emerald-50 text-emerald-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-emerald-100 transition-all shadow-md">
              <FileSpreadsheet size={18} /> Importer Excel
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </label>
            <button onClick={() => openNewSlotModal(0, "08:00")} className="flex items-center gap-3 bg-gray-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md">
              <Plus size={18} /> Ajouter Manuel
            </button>
            {hasUnsavedChanges && (
              <button onClick={handleSave} disabled={saving} className="bg-primary-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl animate-bounce-subtle">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} Publier
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-premium border border-gray-50 dark:border-gray-800 overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-[100px_repeat(6,1fr)] bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
              <div className="h-16 flex items-center justify-center border-r border-gray-100 dark:border-gray-700"><Clock size={20} className="text-gray-400" /></div>
              {DAYS.map((day) => (
                <div key={day} className="h-16 flex items-center justify-center font-black italic uppercase text-[11px] tracking-[0.2em] text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700 last:border-0">{day}</div>
              ))}
            </div>

            {TIME_SLOTS.map((timeStr) => {
              return (
                <div key={timeStr} className="grid grid-cols-[100px_repeat(6,1fr)] border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="h-14 flex items-center justify-center border-r border-gray-100 dark:border-gray-700">
                    <span className="text-[11px] font-black text-gray-400 italic">{timeStr}</span>
                  </div>
                  {DAYS.map((_, dayIdx) => (
                    <div key={dayIdx} className="h-14 relative border-r border-gray-100 dark:border-gray-700 last:border-0">
                      {renderCell(dayIdx, timeStr)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={selectedSlot?.id?.startsWith('new') ? "Ajouter un cours" : "Modifier le créneau"}>
        {selectedSlot && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const slot = selectedSlot as ScheduleSlot;
            if (slot.startTime >= slot.endTime) {
              alert("L'heure de fin doit être après l'heure de début.");
              return;
            }
            if (selectedSlot.id?.startsWith('new')) {
              setSlots(prev => [...prev, slot]);
            } else {
              setSlots(prev => prev.map(s => s.id === slot.id ? slot : s));
            }
            setHasUnsavedChanges(true);
            setShowEditModal(false);
          }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400">Matière / Module</label>
              <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold italic outline-none border-none focus:ring-4 focus:ring-primary-50" placeholder="ex: Analyse Mathématique" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Salle</label>
                <input required value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold italic border-none" placeholder="Salle 101" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Professeur</label>
                <input required value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold italic border-none" placeholder="Dr. Sy" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Heure de début</label>
                <select value={selectedSlot.startTime} onChange={e => setSelectedSlot({...selectedSlot, startTime: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase outline-none border-none">
                  {TIME_SLOTS.map(t => <option key={t} value={t} disabled={t >= "12:00" && t < "14:30"}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Heure de fin</label>
                <select value={selectedSlot.endTime} onChange={e => setSelectedSlot({...selectedSlot, endTime: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase outline-none border-none">
                  {TIME_SLOTS.map(t => <option key={t} value={t} disabled={t > "12:00" && t < "14:30"}>{t}</option>)}
                  <option value="19:00">19:00</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-gray-400">Couleur de catégorie</label>
              <div className="flex gap-2">
                {CATEGORY_COLORS.map(c => (
                  <button key={c.color} type="button" onClick={() => setSelectedSlot({...selectedSlot, color: c.color})} className={`w-8 h-8 rounded-full transition-all ${selectedSlot.color === c.color ? 'ring-4 ring-offset-4 ring-gray-200 scale-110' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c.color }} />
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
               <button type="submit" className="flex-1 bg-primary-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                 {selectedSlot.id?.startsWith('new') ? "Ajouter au planning" : "Enregistrer"}
               </button>
               {!selectedSlot.id?.startsWith('new') && (
                 <button type="button" onClick={() => { if(window.confirm('Supprimer ce cours ?')) { setSlots(prev => prev.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); } }} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-md">
                   <Trash2 size={20}/>
                 </button>
               )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
