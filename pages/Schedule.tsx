
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Loader2, Trash2, Save, FileSpreadsheet, MapPin, User as UserIcon, Clock, Calendar as CalendarIcon, 
  Plus, X, UploadCloud, FileText, MessageCircle, Mail, Download, ExternalLink, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ScheduleSlot, ScheduleFile } from '../types';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

const CATEGORY_COLORS = [
  { name: 'Bleu Ciel', color: '#87CEEB', bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-700' },
  { name: 'Émeraude', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { name: 'Ambre', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { name: 'Indigo', color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  { name: 'Rose', color: '#f43f5e', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
];

export default function Schedule() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importExcelRef = useRef<HTMLInputElement>(null);
  
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [documents, setDocuments] = useState<ScheduleFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Partial<ScheduleSlot> | null>(null);
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;
  const currentClassName = user?.className || 'Général';
  const themeColor = user?.themeColor || '#87CEEB';

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [gridSlots, files] = await Promise.all([
        API.schedules.getSlots(currentClassName),
        API.schedules.list(currentClassName)
      ]);
      setSlots(gridSlots || []);
      setDocuments(files || []);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error(error);
      addNotification({ title: 'Erreur Sync', message: error.message, type: 'alert' });
    } finally {
      setLoading(false);
    }
  }, [currentClassName, addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await API.schedules.uploadFile(file, currentClassName);
      addNotification({ title: 'Document envoyé', message: 'Le fichier a été ajouté aux ressources.', type: 'success' });
      fetchData(true);
    } catch (error: any) {
      addNotification({ title: 'Erreur', message: error.message, type: 'alert' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const importedSlots: ScheduleSlot[] = data.map((row: any) => {
          const dayVal = row.Jour || row.Day || row.day || "";
          const dayIdx = DAYS.findIndex(d => d.toLowerCase() === dayVal.toString().toLowerCase());
          
          return {
            day: dayIdx !== -1 ? dayIdx : 0,
            startTime: row.Début || row.Start || row.start || "08:00",
            endTime: row.Fin || row.End || row.end || "09:00",
            subject: row.Matière || row.Subject || row.subject || "Module",
            teacher: row.Professeur || row.Teacher || row.teacher || "À définir",
            room: row.Salle || row.Room || row.room || "TBA",
            color: themeColor,
            className: currentClassName
          } as ScheduleSlot;
        });

        if (importedSlots.length > 0) {
          setSlots(importedSlots);
          setHasUnsavedChanges(true);
          addNotification({ 
            title: 'Données Excel chargées', 
            message: `${importedSlots.length} séances détectées. Cliquez sur "Publier" pour enregistrer.`, 
            type: 'success' 
          });
        }
      } catch (err) {
        addNotification({ title: 'Erreur Import', message: "Le format Excel n'est pas reconnu.", type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
    if (importExcelRef.current) importExcelRef.current.value = '';
  };

  const handleSaveSlots = async () => {
    setSaving(true);
    try {
      await API.schedules.saveSlots(currentClassName, slots);
      addNotification({ title: 'Grille Publiée', message: 'L\'emploi du temps interactif est à jour.', type: 'success' });
      setHasUnsavedChanges(false);
      fetchData(true);
    } catch (e: any) {
      addNotification({ title: 'Erreur Sauvegarde', message: e.message, type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (dayIdx: number, timeStr: string) => {
    const isPause = timeStr === "12:00" || timeStr === "13:00";
    const slot = slots.find(s => s.day === dayIdx && s.startTime === timeStr);
    
    if (slot) {
      const startH = parseInt(slot.startTime.split(':')[0]);
      const endH = parseInt(slot.endTime.split(':')[0]);
      const duration = Math.max(1, endH - startH);
      const colorSet = CATEGORY_COLORS.find(c => c.color === slot.color) || CATEGORY_COLORS[0];

      return (
        <div 
          key={slot.id || `${dayIdx}-${timeStr}`}
          onClick={(e) => { e.stopPropagation(); if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
          className={`absolute inset-x-1 top-1 p-3 rounded-2xl border-l-4 shadow-sm z-20 ${colorSet.bg} ${colorSet.border} ${colorSet.text} ${canEdit ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''} overflow-hidden`}
          style={{ height: `calc(${duration} * 100% - 8px)` }}
        >
          <p className="text-[10px] font-black uppercase tracking-tight line-clamp-1 italic mb-1">{slot.subject}</p>
          <div className="flex flex-col gap-0.5 opacity-80">
            <div className="flex items-center gap-1 text-[8px] font-bold truncate"><MapPin size={10} /> {slot.room}</div>
            {duration >= 2 && <div className="flex items-center gap-1 text-[8px] font-bold truncate"><UserIcon size={10} /> {slot.teacher}</div>}
          </div>
        </div>
      );
    }
    
    return (
      <div 
        onClick={() => {
          if (canEdit && !isPause) {
            setSelectedSlot({ 
              day: dayIdx, 
              startTime: timeStr, 
              endTime: `${(parseInt(timeStr.split(':')[0]) + 1).toString().padStart(2, '0')}:00`, 
              subject: '', 
              room: '', 
              teacher: '', 
              color: themeColor, 
              className: currentClassName 
            });
            setShowEditModal(true);
          }
        }}
        className={`w-full h-full ${isPause ? 'bg-slate-50/50 dark:bg-slate-800/20 cursor-not-allowed' : 'hover:bg-slate-50/50 cursor-crosshair'} transition-colors relative`}
      >
        {isPause && dayIdx === 0 && (
           <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-700 font-black text-[9px] uppercase tracking-widest pointer-events-none">Pause</div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Chargement de la grille académique...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in pb-32 px-4">
      {/* Dynamic Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand text-white rounded-[2.5rem] flex items-center justify-center shadow-premium"><CalendarIcon size={36} /></div>
           <div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter leading-none">Emploi du Temps</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3">{currentClassName} • ESP Dakar</p>
           </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {canEdit && (
            <>
              <input type="file" ref={importExcelRef} onChange={handleImportExcel} className="hidden" accept=".xlsx,.xls,.csv" />
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*" />
              
              <button 
                onClick={() => importExcelRef.current?.click()} 
                className="bg-white dark:bg-slate-800 text-brand px-8 py-4.5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all italic border border-brand/20"
              >
                <FileSpreadsheet size={18} /> Importer Excel
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading} 
                className="bg-slate-900 dark:bg-slate-800 text-white px-8 py-4.5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all italic hover:bg-black"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />} PDF / Image
              </button>

              {hasUnsavedChanges && (
                <button onClick={handleSaveSlots} disabled={saving} className="bg-emerald-500 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-premium flex items-center gap-3 animate-pulse">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Publier Grille
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-10">
        {/* Main Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-premium border border-slate-50 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[80px_repeat(6,1fr)] bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <div className="h-16 flex items-center justify-center border-r border-slate-100 dark:border-slate-800"><Clock size={16} className="text-slate-300" /></div>
                  {DAYS.map((day) => (
                    <div key={day} className="h-16 flex items-center justify-center font-black italic uppercase text-[10px] tracking-widest text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 last:border-0">{day}</div>
                  ))}
                </div>

                {TIME_SLOTS.map((timeStr) => (
                  <div key={timeStr} className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="h-20 flex items-center justify-center border-r border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 italic">{timeStr}</span>
                    </div>
                    {DAYS.map((_, dayIdx) => (
                      <div key={dayIdx} className="h-20 relative border-r border-slate-100 dark:border-slate-800 last:border-0">
                        {renderCell(dayIdx, timeStr)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Resources Sidebar */}
        <div className="space-y-8">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic">Ressources</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{documents.length} fichiers</span>
           </div>
           <div className="space-y-4">
              {documents.length > 0 ? documents.map(doc => (
                <div key={doc.id} className="bg-white dark:bg-slate-900 p-6 rounded-4xl shadow-soft border border-slate-50 dark:border-slate-800 group hover:shadow-premium transition-all">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:text-brand transition-colors">
                        <FileText size={24}/>
                      </div>
                      <div className="min-w-0 flex-1">
                         <p className="text-sm font-black italic text-slate-900 dark:text-white truncate uppercase">{doc.name}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Le {new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-brand hover:text-white rounded-xl text-[9px] font-black uppercase text-center transition-all">
                        Ouvrir
                      </a>
                      {canEdit && (
                        <button onClick={() => { if(confirm('Supprimer ce document ?')) API.schedules.deleteFile(doc.id).then(() => fetchData(true)); }} className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all">
                          <Trash2 size={16}/>
                        </button>
                      )}
                   </div>
                </div>
              )) : (
                <div className="p-10 bg-slate-50 dark:bg-slate-800/20 rounded-[3rem] text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                   <FileText size={32} className="mx-auto mb-4 text-slate-200" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-tight">Aucune ressource partagée</p>
                </div>
              )}
           </div>
           
           <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-800 flex gap-4">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase leading-relaxed">
                Les modifications apportées à la grille ne sont visibles par la classe qu'après publication.
              </p>
           </div>
        </div>
      </div>

      {/* Edit Slot Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={selectedSlot?.id ? "Modifier la Séance" : "Ajouter un cours"}>
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
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Module</label>
              <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" placeholder="ex: Physique Quantique" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Salle</label>
                <input required value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" placeholder="Salle 105" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Professeur</label>
                <input required value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" placeholder="M. SOW" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Début</label>
                <select value={selectedSlot.startTime} onChange={e => setSelectedSlot({...selectedSlot, startTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase outline-none">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Fin</label>
                <select value={selectedSlot.endTime} onChange={e => setSelectedSlot({...selectedSlot, endTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase outline-none">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="19:00">19:00</option>
                  <option value="20:00">20:00</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Catégorie Visuelle</label>
              <div className="flex gap-3">
                {CATEGORY_COLORS.map(c => (
                  <button key={c.color} type="button" onClick={() => setSelectedSlot({...selectedSlot, color: c.color})} className={`w-10 h-10 rounded-full transition-all ${selectedSlot.color === c.color ? 'ring-4 ring-offset-2 ring-brand scale-110 shadow-lg' : 'opacity-40 hover:opacity-100 shadow-sm'}`} style={{ backgroundColor: c.color }} />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
               <button type="submit" className="flex-1 bg-brand text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-premium italic active:scale-95 transition-all">
                 {selectedSlot.id ? "Mettre à jour" : "Ajouter à la grille"}
               </button>
               {selectedSlot.id && (
                 <button type="button" onClick={() => { setSlots(prev => prev.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); }} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                   <Trash2 size={24}/>
                 </button>
               )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
