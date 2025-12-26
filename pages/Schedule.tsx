import React, { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, Save, MapPin, User as UserIcon, Clock, 
  Calendar as CalendarIcon, Edit3, Trash2, Mail, 
  Download, Coffee, BookOpen, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ScheduleSlot, ClassGroup } from '../types';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import Modal from '../components/Modal';

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
  const isLunch = time >= "12:00" && time < "14:30";
  const isLate = time > "18:30";
  return isLunch || isLate;
};

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
  
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
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
      const [gridSlots, classList] = await Promise.all([
        API.schedules.getSlots(currentClassName),
        API.classes.list()
      ]);
      setSlots(gridSlots || []);
      setClasses(classList || []);
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

  const handleShareEmail = () => {
    const classObj = classes.find(c => c.name === currentClassName);
    const to = classObj?.email || '';
    const subject = `📅 EMPLOI DU TEMPS MIS À JOUR : ${currentClassName}`;
    
    let scheduleSummary = `Voici l'emploi du temps officiel pour la classe ${currentClassName} :\n\n`;
    DAYS.forEach((day, idx) => {
      const daySlots = slots.filter(s => s.day === idx).sort((a,b) => a.startTime.localeCompare(b.startTime));
      if (daySlots.length > 0) {
        scheduleSummary += `--- ${day.toUpperCase()} ---\n`;
        daySlots.forEach(s => {
          scheduleSummary += `${s.startTime} - ${s.endTime} | ${s.subject} (${s.teacher} - ${s.room})\n`;
        });
        scheduleSummary += `\n`;
      }
    });
    
    scheduleSummary += `\nConsultez la version interactive sur JangHup ESP.`;
    API.sharing.email(to, subject, scheduleSummary);
    addNotification({ title: 'Diffusion Email', message: `Partage envoyé vers ${to || 'administration'}`, type: 'success' });
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Grille Publiée', message: 'L\'emploi du temps est synchronisé.', type: 'success' });
      setHasUnsavedChanges(false);
      fetchData(true);
    } catch (e: any) {
      addNotification({ title: 'Erreur Serveur', message: 'Vérifiez les contraintes horaires.', type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (dayIdx: number, timeStr: string) => {
    const slot = slots.find(s => s.day === dayIdx && s.startTime === timeStr);
    const isForbidden = isForbiddenSlot(timeStr);
    
    if (slot) {
      const startIdx = TIME_SLOTS.indexOf(slot.startTime);
      const endIdx = TIME_SLOTS.indexOf(slot.endTime);
      const duration = Math.max(1, endIdx - startIdx);
      const colorSet = CATEGORY_COLORS.find(c => c.hex === slot.color) || CATEGORY_COLORS[0];

      return (
        <div 
          key={slot.id || `${dayIdx}-${timeStr}`}
          onClick={(e) => { e.stopPropagation(); if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
          className={`absolute inset-x-1 top-0.5 p-3 rounded-2xl border-l-[6px] shadow-sm z-20 ${colorSet.bg} ${colorSet.border} ${colorSet.text} ${canEdit ? 'cursor-pointer hover:brightness-95 hover:scale-[1.01] transition-all' : ''} overflow-hidden group/slot`}
          style={{ height: `calc(${duration} * 100% - 4px)` }}
        >
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-black uppercase leading-tight italic truncate flex-1">{slot.subject}</p>
            {canEdit && <Edit3 size={10} className="opacity-0 group-hover/slot:opacity-100 transition-opacity" />}
          </div>
          <div className="space-y-1 opacity-90">
            <p className="text-[8px] font-bold truncate flex items-center gap-1.5"><MapPin size={10} /> {slot.room}</p>
            <p className="text-[8px] font-bold truncate flex items-center gap-1.5"><UserIcon size={10} /> {slot.teacher}</p>
          </div>
        </div>
      );
    }
    
    if (isForbidden) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/30 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-700/50">
                {timeStr === "13:00" && (
                  <div className="flex flex-col items-center opacity-20">
                    <Coffee size={16} className="text-slate-400" />
                    <span className="text-[8px] font-black uppercase mt-1">Pause</span>
                  </div>
                )}
            </div>
        );
    }

    return (
      <div 
        onClick={() => {
          if (canEdit) {
            const startIdx = TIME_SLOTS.indexOf(timeStr);
            const limit = timeStr < "12:00" ? "12:00" : "18:30";
            let defaultEnd = TIME_SLOTS[startIdx + 4] || limit;
            if (defaultEnd > limit) defaultEnd = limit;

            setSelectedSlot({ 
              day: dayIdx, startTime: timeStr, 
              endTime: defaultEnd, 
              subject: '', room: '', teacher: '', color: CATEGORY_COLORS[0].hex, className: currentClassName 
            });
            setShowEditModal(true);
          }
        }}
        className={`w-full h-full border-b border-slate-100 dark:border-slate-800/50 ${canEdit ? 'hover:bg-brand-50/40 cursor-crosshair' : ''} transition-colors`}
      />
    );
  };

  const validStartTimes = TIME_SLOTS.filter(t => !isForbiddenSlot(t));
  const validEndTimes = (startTime: string) => {
      const idx = TIME_SLOTS.indexOf(startTime);
      if (idx === -1) return [];
      return TIME_SLOTS.slice(idx + 1).filter(t => {
          if (startTime < "12:00") return t <= "12:00";
          return t <= "18:30";
      });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Chargement de l'emploi du temps...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-fade-in pb-32 px-4">
      {/* Header UI */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-slate-900 dark:bg-slate-800 text-white rounded-[2rem] flex items-center justify-center shadow-xl transform -rotate-3"><CalendarIcon size={28} /></div>
           <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter leading-none">Planning</h2>
              <div className="flex items-center gap-4 mt-3">
                 <span className="px-3 py-1 bg-brand-50 text-brand text-[9px] font-black uppercase rounded-lg border border-brand-100">{currentClassName}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                   <Clock size={12}/> Grille Interactive ESP
                 </span>
              </div>
           </div>
        </div>

        <div className="flex flex-wrap gap-3">
             <button 
                onClick={handleShareEmail}
                className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all italic"
             >
                <Mail size={20} className="text-brand" /> Diffuser par Email
             </button>

             {canEdit && hasUnsavedChanges && (
                <button 
                  onClick={handlePublish} 
                  disabled={saving} 
                  className="bg-brand text-white px-10 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-premium flex items-center gap-3 animate-pulse transition-all"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Publier la grille
                </button>
             )}
        </div>
      </div>

      {/* Interactive Grid */}
      <section className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-premium border border-slate-50 dark:border-slate-800 overflow-hidden">
        <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.4em] italic flex items-center gap-3">
                 <CalendarIcon size={18} className="text-brand" /> Grille Interactive
            </h3>
            <div className="flex items-center gap-4">
               {CATEGORY_COLORS.map(c => (
                 <div key={c.name} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${c.hex === '#87CEEB' ? 'bg-brand' : ''}`} style={{ backgroundColor: c.hex }} />
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">{c.name}</span>
                 </div>
               ))}
            </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[1200px]">
             <div className="grid grid-cols-[120px_repeat(6,1fr)] bg-slate-50 dark:bg-slate-800/50">
                <div className="h-20 flex items-center justify-center border-r border-slate-100 dark:border-slate-800"><Clock size={20} className="text-slate-300" /></div>
                {DAYS.map(day => (
                  <div key={day} className="h-20 flex items-center justify-center font-black italic uppercase text-[11px] tracking-widest text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 last:border-0">{day}</div>
                ))}
             </div>
             <div className="relative">
                {TIME_SLOTS.map((time) => (
                  <div key={time} className="grid grid-cols-[120px_repeat(6,1fr)] h-20 group">
                     <div className="flex items-center justify-center border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800">
                        <span className={`text-[11px] font-black italic transition-colors ${isForbiddenSlot(time) ? 'text-slate-300' : 'text-slate-400 group-hover:text-brand'}`}>{time}</span>
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
      </section>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={selectedSlot?.id && !selectedSlot.id.toString().startsWith('temp-') ? "Modifier la séance" : "Programmer un cours"}>
        {selectedSlot && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const slot = selectedSlot as ScheduleSlot;
            if (selectedSlot.id) setSlots(prev => prev.map(s => s.id === slot.id ? slot : s));
            else setSlots(prev => [...prev, { ...slot, id: `temp-${Date.now()}` }]);
            setHasUnsavedChanges(true);
            setShowEditModal(false);
          }} className="space-y-6">
            
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic flex items-center gap-2"><BookOpen size={14}/> Module / Matière</label>
              <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50 transition-all outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic flex items-center gap-2"><MapPin size={14}/> Salle</label>
                <input required value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none outline-none" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic flex items-center gap-2"><UserCheck size={14}/> Professeur</label>
                <input required value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none outline-none" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Durée standard</label>
              <div className="flex gap-4">
                 <button 
                  type="button" 
                  onClick={() => {
                    const idx = TIME_SLOTS.indexOf(selectedSlot.startTime!);
                    const limit = selectedSlot.startTime! < "12:00" ? "12:00" : "18:30";
                    const end = TIME_SLOTS[idx + 4] || limit;
                    setSelectedSlot({...selectedSlot, endTime: end > limit ? limit : end});
                  }}
                  className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${selectedSlot.endTime === TIME_SLOTS[TIME_SLOTS.indexOf(selectedSlot.startTime!) + 4] ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                 >
                   2 Heures
                 </button>
                 <button 
                  type="button" 
                  onClick={() => {
                    const idx = TIME_SLOTS.indexOf(selectedSlot.startTime!);
                    const limit = selectedSlot.startTime! < "12:00" ? "12:00" : "18:30";
                    const end = TIME_SLOTS[idx + 8] || limit;
                    setSelectedSlot({...selectedSlot, endTime: end > limit ? limit : end});
                  }}
                  className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${selectedSlot.endTime === TIME_SLOTS[TIME_SLOTS.indexOf(selectedSlot.startTime!) + 8] ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                 >
                   4 Heures
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Heure début</label>
                  <select value={selectedSlot.startTime} onChange={e => {
                    const start = e.target.value;
                    const idx = TIME_SLOTS.indexOf(start);
                    const limit = start < "12:00" ? "12:00" : "18:30";
                    const nextEnd = TIME_SLOTS[idx + 4] || limit;
                    setSelectedSlot({...selectedSlot, startTime: start, endTime: nextEnd > limit ? limit : nextEnd});
                  }} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[11px] uppercase border-none outline-none">
                    {validStartTimes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Heure fin</label>
                  <select value={selectedSlot.endTime} onChange={e => setSelectedSlot({...selectedSlot, endTime: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[11px] uppercase border-none outline-none">
                    {validEndTimes(selectedSlot.startTime || "08:00").map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
            </div>

            <div className="flex gap-4 pt-8">
               <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest shadow-xl italic active:scale-95 transition-all">Enregistrer</button>
               {selectedSlot.id && (
                 <button type="button" onClick={() => { setSlots(prev => prev.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); }} className="p-5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={24}/></button>
               )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
