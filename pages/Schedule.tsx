
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Loader2, Save, FileSpreadsheet, MapPin, User as UserIcon, Clock, 
  Calendar as CalendarIcon, Edit3, Trash2, AlertCircle, CheckCircle2, 
  ChevronRight, ChevronLeft, Download, Info
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
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  slots.push("19:00");
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const CATEGORY_COLORS = [
  { name: 'Technique', hex: '#87CEEB', bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-700' },
  { name: 'TP / Labo', hex: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { name: 'Amphi', hex: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  { name: 'Soutien', hex: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { name: 'Urgent', hex: '#f43f5e', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
];

export default function Schedule() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const importExcelRef = useRef<HTMLInputElement>(null);
  
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Partial<ScheduleSlot> | null>(null);
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;
  const currentClassName = user?.className || 'DUT-EEAIT-2';

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const gridSlots = await API.schedules.getSlots(currentClassName);
      setSlots(gridSlots || []);
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

  // Parseur amélioré pour capturer TOUT le contenu
  const parseExcelCell = (content: string) => {
    if (!content) return { subject: '', teacher: '', room: '' };
    
    // Nettoyage et séparation par lignes
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let subjectParts: string[] = [];
    let teacher = "";
    let room = "";

    lines.forEach(line => {
      const lower = line.toLowerCase();
      // Détection prof (Dr:, Dr., Pr:, M., M:, etc.)
      if (lower.startsWith('dr:') || lower.startsWith('dr.') || 
          lower.startsWith('pr:') || lower.startsWith('pr.') || 
          lower.startsWith('m:') || lower.startsWith('m.')) {
        teacher = line;
      } 
      // Détection salle (Salle:, Lieu:, Amphi:)
      else if (lower.startsWith('salle:') || lower.startsWith('lieu:') || lower.startsWith('amphi:')) {
        room = line.replace(/salle:|lieu:|amphi:/i, '').trim();
      } 
      // Tout le reste (dont les groupes) va dans le sujet
      else {
        subjectParts.push(line);
      }
    });

    return { 
      subject: subjectParts.join(' / '), 
      teacher: teacher || "Enseignant non spécifié", 
      room: room || "Salle non spécifiée" 
    };
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const newSlots: ScheduleSlot[] = [];
        
        // Localisation des colonnes de jours
        const headerRowIdx = data.findIndex(row => row.some(cell => cell?.toString().toLowerCase().includes('lundi')));
        if (headerRowIdx === -1) throw new Error("Entête 'Lundi' introuvable.");
        
        const headerRow = data[headerRowIdx];
        const dayIndices = DAYS.map(day => headerRow.findIndex(cell => cell?.toString().toLowerCase().includes(day.toLowerCase())));

        // Parcours de la grille
        for (let r = headerRowIdx + 1; r < data.length; r++) {
          const row = data[r];
          const timeCell = row[0]?.toString();
          if (!timeCell || !timeCell.includes(':')) continue;

          dayIndices.forEach((colIndex, dayIdx) => {
            if (colIndex === -1) return;
            const content = row[colIndex];
            
            if (content && content.toString().trim().length > 2) {
              const { subject, teacher, room } = parseExcelCell(content.toString());
              
              // Calcul de la durée en cherchant quand s'arrête le bloc (cellules vides suivantes)
              let endRow = r + 1;
              while (endRow < data.length && (!data[endRow][colIndex] || data[endRow][colIndex].toString().trim() === "")) {
                // Si on arrive sur une nouvelle heure en colonne 0
                if (data[endRow][0] && data[endRow][0].toString().includes(':')) {
                   endRow++;
                } else break;
                if (endRow - r > 10) break; // Sécurité
              }

              const startTime = timeCell.length === 4 ? `0${timeCell}` : timeCell;
              // On prend l'heure de la ligne d'après comme fin
              const endIdx = TIME_SLOTS.indexOf(startTime) + (endRow - r);
              const endTime = TIME_SLOTS[endIdx] || TIME_SLOTS[TIME_SLOTS.length - 1];

              newSlots.push({
                day: dayIdx,
                startTime: startTime,
                endTime: endTime,
                subject,
                teacher,
                room,
                color: CATEGORY_COLORS[subject.toLowerCase().includes('tp') ? 1 : 0].hex,
                className: currentClassName
              });
            }
          });
        }

        if (newSlots.length > 0) {
          setSlots(newSlots);
          setHasUnsavedChanges(true);
          addNotification({ 
            title: 'Extraction Terminée', 
            message: `${newSlots.length} modules extraits avec succès.`, 
            type: 'success' 
          });
        }
      } catch (err: any) {
        addNotification({ title: 'Erreur Import', message: err.message, type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
    if (importExcelRef.current) importExcelRef.current.value = '';
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Grille Publiée', message: 'L\'emploi du temps est à jour pour toute la classe.', type: 'success' });
      setHasUnsavedChanges(false);
      fetchData(true);
    } catch (e: any) {
      addNotification({ title: 'Erreur', message: e.message, type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (dayIdx: number, timeStr: string) => {
    const slot = slots.find(s => s.day === dayIdx && s.startTime === timeStr);
    const isPause = timeStr === "12:00" || timeStr === "12:30" || timeStr === "13:00";
    
    if (slot) {
      const startIdx = TIME_SLOTS.indexOf(slot.startTime);
      const endIdx = TIME_SLOTS.indexOf(slot.endTime);
      const duration = Math.max(1, endIdx - startIdx);
      const colorSet = CATEGORY_COLORS.find(c => c.hex === slot.color) || CATEGORY_COLORS[0];

      return (
        <div 
          key={slot.id || `${dayIdx}-${timeStr}`}
          onClick={(e) => { e.stopPropagation(); if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
          className={`absolute inset-x-1 top-0.5 p-2 rounded-xl border-l-4 shadow-sm z-20 ${colorSet.bg} ${colorSet.border} ${colorSet.text} ${canEdit ? 'cursor-pointer hover:brightness-95 transition-all' : ''} overflow-hidden`}
          style={{ height: `calc(${duration} * 100% - 4px)` }}
        >
          <p className="text-[9px] font-black uppercase leading-tight italic mb-1 line-clamp-3">{slot.subject}</p>
          <div className="space-y-0.5 opacity-90 overflow-hidden">
            <p className="text-[7px] font-bold truncate flex items-center gap-1"><MapPin size={8} className="shrink-0" /> {slot.room}</p>
            <p className="text-[7px] font-bold truncate flex items-center gap-1"><UserIcon size={8} className="shrink-0" /> {slot.teacher}</p>
          </div>
        </div>
      );
    }
    
    return (
      <div 
        onClick={() => {
          if (canEdit && !isPause) {
            setSelectedSlot({ 
              day: dayIdx, startTime: timeStr, 
              endTime: TIME_SLOTS[TIME_SLOTS.indexOf(timeStr) + 3] || "19:00", 
              subject: '', room: '', teacher: '', color: CATEGORY_COLORS[0].hex, className: currentClassName 
            });
            setShowEditModal(true);
          }
        }}
        className={`w-full h-full border-b border-slate-100 dark:border-slate-800/50 ${isPause ? 'bg-slate-50/40 dark:bg-slate-800/20' : canEdit ? 'hover:bg-brand-50/30 cursor-crosshair' : ''} transition-colors`}
      />
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-32 px-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-xl"><CalendarIcon size={24} /></div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter leading-none">Planning Interactif</h2>
              <div className="flex items-center gap-3 mt-2">
                 <span className="text-[10px] font-black text-brand uppercase tracking-widest">{currentClassName}</span>
                 <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">ESP Dakar • {new Date().getFullYear()}</span>
              </div>
           </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-3">
             <input type="file" ref={importExcelRef} onChange={handleImportExcel} className="hidden" accept=".xlsx,.xls" />
             <button 
                onClick={() => importExcelRef.current?.click()} 
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-soft hover:shadow-premium transition-all italic"
             >
                <FileSpreadsheet size={18} className="text-emerald-500" /> Importer le fichier Excel
             </button>

             {hasUnsavedChanges && (
                <button 
                  onClick={handlePublish} 
                  disabled={saving} 
                  className="bg-brand text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-premium flex items-center gap-3 animate-pulse active:scale-95 transition-all"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Publier à la classe
                </button>
             )}
          </div>
        )}
      </div>

      {/* Draft Warning */}
      {canEdit && hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl flex items-center justify-between text-amber-700 shadow-sm">
           <div className="flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest italic">Vous travaillez sur un brouillon non publié • Les étudiants ne voient pas encore ces données</p>
           </div>
           <button onClick={() => fetchData()} className="text-[10px] font-black uppercase underline tracking-widest hover:text-amber-900">Annuler l'import</button>
        </div>
      )}

      {/* Grid Container */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-premium border border-slate-50 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[1200px]">
             {/* Days Header */}
             <div className="grid grid-cols-[100px_repeat(6,1fr)] bg-slate-50 dark:bg-slate-800/50">
                <div className="h-16 flex items-center justify-center border-r border-slate-100 dark:border-slate-800">
                   <Clock size={16} className="text-slate-300" />
                </div>
                {DAYS.map(day => (
                  <div key={day} className="h-16 flex items-center justify-center font-black italic uppercase text-[10px] tracking-widest text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 last:border-0">
                    {day}
                  </div>
                ))}
             </div>

             {/* Time Rows */}
             <div className="relative">
                {TIME_SLOTS.map((time) => (
                  <div key={time} className="grid grid-cols-[100px_repeat(6,1fr)] h-16 group">
                     <div className="flex items-center justify-center border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10">
                        <span className="text-[10px] font-black text-slate-400 italic group-hover:text-brand transition-colors">{time}</span>
                     </div>
                     {DAYS.map((_, dayIdx) => (
                        <div key={dayIdx} className="relative border-r border-slate-100 dark:border-slate-800 last:border-0">
                           {renderCell(dayIdx, time)}
                        </div>
                     ))}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {canEdit && (
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={selectedSlot?.id ? "Modifier la séance" : "Nouveau cours"}>
          {selectedSlot && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const slot = selectedSlot as ScheduleSlot;
              if (selectedSlot.id) setSlots(prev => prev.map(s => s.id === slot.id ? slot : s));
              else setSlots(prev => [...prev, { ...slot, id: `temp-${Date.now()}` }]);
              setHasUnsavedChanges(true);
              setShowEditModal(false);
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Module / Groupe</label>
                <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" placeholder="ex: Groupe Gr3 / Maths" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Salle</label>
                  <input required value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" placeholder="DGE-Labo" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Enseignant</label>
                  <input required value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" placeholder="Dr. MBOUP" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Heure de début</label>
                    <select value={selectedSlot.startTime} onChange={e => setSelectedSlot({...selectedSlot, startTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase border-none outline-none">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Heure de fin</label>
                    <select value={selectedSlot.endTime} onChange={e => setSelectedSlot({...selectedSlot, endTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase border-none outline-none">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Couleur du badge</label>
                <div className="flex gap-3">
                  {CATEGORY_COLORS.map(c => (
                    <button key={c.hex} type="button" onClick={() => setSelectedSlot({...selectedSlot, color: c.hex})} className={`w-10 h-10 rounded-full transition-all ${selectedSlot.color === c.hex ? 'ring-4 ring-offset-2 ring-brand scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                 <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl italic active:scale-95 transition-all">
                   Confirmer l'ajout
                 </button>
                 {selectedSlot.id && (
                   <button type="button" onClick={() => { setSlots(prev => prev.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); }} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                     <Trash2 size={20}/>
                   </button>
                 )}
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
