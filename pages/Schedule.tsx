
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Loader2, Trash2, Save, FileSpreadsheet, MapPin, User as UserIcon, Clock, Calendar as CalendarIcon, 
  Plus, X, ChevronRight, AlertCircle, UploadCloud, FileText, Download, Eye, ExternalLink, MessageCircle, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ScheduleSlot } from '../types';
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
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
      const [gridSlots, files, classList] = await Promise.all([
        API.schedules.getSlots(currentClassName),
        API.schedules.list(currentClassName),
        API.classes.list()
      ]);
      setSlots(gridSlots || []);
      setDocuments(files || []);
      setClasses(classList || []);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentClassName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await API.schedules.uploadFile(file, currentClassName);
      addNotification({ title: 'Succès', message: 'Document téléversé avec succès.', type: 'success' });
      fetchData(true);
    } catch (error: any) {
      addNotification({ title: 'Erreur', message: "Échec du téléversement.", type: 'alert' });
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

        // Tentative de mapping intelligent des colonnes
        const importedSlots: ScheduleSlot[] = data.map((row: any, idx: number) => {
          const dayName = row.Jour || row.Day || "";
          const dayIdx = DAYS.findIndex(d => d.toLowerCase() === dayName.toString().toLowerCase());
          
          return {
            id: `import-${idx}-${Date.now()}`,
            day: dayIdx !== -1 ? dayIdx : 0,
            startTime: row.Début || row.Start || "08:00",
            endTime: row.Fin || row.End || "09:00",
            subject: row.Matière || row.Subject || "Matière",
            teacher: row.Professeur || row.Teacher || "À définir",
            room: row.Salle || row.Room || "À définir",
            color: themeColor,
            classname: currentClassName
          } as ScheduleSlot;
        });

        if (importedSlots.length > 0) {
          setSlots(importedSlots);
          setHasUnsavedChanges(true);
          addNotification({ 
            title: 'Excel Importé', 
            message: `${importedSlots.length} créneaux détectés. N'oubliez pas de publier.`, 
            type: 'success' 
          });
        }
      } catch (err) {
        addNotification({ title: 'Erreur Import', message: "Format Excel non reconnu ou corrompu.", type: 'alert' });
      }
    };
    reader.readAsBinaryString(file);
    if (importExcelRef.current) importExcelRef.current.value = '';
  };

  const handleShareWhatsApp = () => {
    const text = `📅 *EMPLOI DU TEMPS JANGHUP*\n\nClasse : *${currentClassName}*\nL'emploi du temps a été mis à jour. Connectez-vous pour le consulter !`;
    API.sharing.whatsapp(text);
  };

  const handleShareEmail = () => {
    const classObj = classes.find(c => c.name.trim().toLowerCase() === currentClassName.trim().toLowerCase());
    const to = classObj?.email || '';
    
    if (!to) {
       addNotification({ title: 'Email manquant', message: "Aucun email configuré pour cette classe. Envoi à l'administration.", type: 'warning' });
    }

    const subject = `📅 MISE À JOUR EMPLOI DU TEMPS: ${currentClassName}`;
    const body = `Bonjour,\n\nL'emploi du temps de la classe ${currentClassName} a été actualisé sur le portail JangHup ESP.\n\n🎓 Cordialement,\nLe portail JangHup`;
    
    API.sharing.email(to, subject, body);
  };

  const handleSaveSlots = async () => {
    setSaving(true);
    try {
      const payload = slots.map(s => ({
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject,
        teacher: s.teacher || 'À définir',
        room: s.room || 'À définir',
        color: s.color,
        classname: currentClassName
      }));
      
      await API.schedules.saveSlots(currentClassName, payload as any);
      addNotification({ title: 'Publié', message: 'Emploi du temps mis à jour.', type: 'success' });
      setHasUnsavedChanges(false);
      fetchData(true);
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde.', type: 'alert' });
    } finally {
      setSaving(false);
    }
  };

  const openNewSlotModal = (dayIdx: number, timeStr: string) => {
    if (!canEdit) return;
    const isPause = timeStr >= "12:00" && timeStr < "14:00";
    if (isPause) return;

    const startH = parseInt(timeStr.split(':')[0]);
    const endH = startH + 1; 
    const endTimeStr = `${endH.toString().padStart(2, '0')}:00`;

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
    const isPause = timeStr === "12:00" || timeStr === "13:00";
    const slot = slots.find(s => s.day === dayIdx && s.startTime === timeStr);
    
    if (slot) {
      const startH = parseInt(slot.startTime.split(':')[0]);
      const endH = parseInt(slot.endTime.split(':')[0]);
      const duration = endH - startH;
      const colorSet = CATEGORY_COLORS.find(c => c.color === slot.color) || CATEGORY_COLORS[0];

      return (
        <div 
          key={slot.id}
          onClick={(e) => { e.stopPropagation(); if(canEdit) { setSelectedSlot(slot); setShowEditModal(true); } }}
          className={`absolute inset-x-1 top-1 p-3 rounded-2xl border-l-4 shadow-sm z-20 ${colorSet.bg} ${colorSet.border} ${colorSet.text} ${canEdit ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''} overflow-hidden`}
          style={{ height: `calc(${duration} * 100% - 8px)` }}
        >
          <p className="text-[10px] font-black uppercase tracking-tight line-clamp-1 leading-none mb-1 italic">{slot.subject}</p>
          <div className="flex flex-col gap-0.5 opacity-80">
            <div className="flex items-center gap-1 text-[8px] font-bold truncate"><MapPin size={10} /> {slot.room}</div>
            {duration >= 1.5 && <div className="flex items-center gap-1 text-[8px] font-bold truncate"><UserIcon size={10} /> {slot.teacher}</div>}
          </div>
        </div>
      );
    }
    
    return (
      <div 
        onClick={() => openNewSlotModal(dayIdx, timeStr)}
        className={`w-full h-full ${isPause ? 'bg-slate-50/50 dark:bg-slate-800/20 cursor-not-allowed' : 'hover:bg-slate-50/50 cursor-crosshair'} transition-colors relative`}
      >
        {isPause && dayIdx === 2 && timeStr === "12:00" && (
           <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-700 font-black text-[9px] uppercase tracking-widest pointer-events-none">Pause</div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Initialisation de la grille...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in pb-32">
      {/* Header Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand text-white rounded-[2.5rem] flex items-center justify-center shadow-premium"><CalendarIcon size={36} /></div>
           <div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter leading-none">Emploi du Temps</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3">{currentClassName}</p>
           </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button 
            onClick={handleShareWhatsApp} 
            className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95 group"
            title="Partager WhatsApp"
          >
            <MessageCircle size={24} />
            <span className="hidden lg:inline text-[9px] font-black uppercase">WhatsApp</span>
          </button>
          
          <button 
            onClick={handleShareEmail} 
            className="flex items-center gap-2 p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-sm active:scale-95 group"
            title="Diffuser par Email"
          >
            <Mail size={24} />
            <span className="hidden lg:inline text-[9px] font-black uppercase">Mail Classe</span>
          </button>
          
          {canEdit && (
            <>
              <div className="h-10 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2 hidden sm:block" />
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*,.xlsx,.xls,.csv" />
              <input type="file" ref={importExcelRef} onChange={handleImportExcel} className="hidden" accept=".xlsx,.xls,.csv" />
              
              <button 
                onClick={() => importExcelRef.current?.click()} 
                className="bg-white dark:bg-slate-800 text-brand px-8 py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all italic border border-brand/20"
              >
                <FileSpreadsheet size={18} /> Importer Grille
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading} 
                className="bg-slate-900 dark:bg-slate-800 text-white px-8 py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all italic hover:bg-black"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />} PDF / Image
              </button>

              {hasUnsavedChanges && (
                <button onClick={handleSaveSlots} disabled={saving} className="bg-emerald-500 text-white px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-premium flex items-center gap-3 animate-pulse">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Publier Grille
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-premium border border-slate-50 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[80px_repeat(6,1fr)] bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <div className="h-16 flex items-center justify-center border-r border-slate-100 dark:border-slate-800"><Clock size={16} className="text-slate-300" /></div>
                  {DAYS.map((day) => (
                    <div key={day} className="h-16 flex items-center justify-center font-black italic uppercase text-[10px] tracking-widest text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 last:border-0">{day}</div>
                  ))}
                </div>

                {TIME_SLOTS.map((timeStr) => {
                  return (
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
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic px-2">Ressources & Fichiers</h3>
           <div className="space-y-4">
              {documents.length > 0 ? documents.map(doc => {
                const isExcel = doc.name.match(/\.(xlsx|xls|csv)$/i);
                return (
                  <div key={doc.id} className="bg-white dark:bg-slate-900 p-6 rounded-4xl shadow-soft border border-slate-50 dark:border-slate-800 group transition-all hover:shadow-premium">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:text-brand transition-colors">
                          {isExcel ? <FileSpreadsheet size={24}/> : <FileText size={24}/>}
                        </div>
                        <div className="min-w-0 flex-1">
                           <p className="text-sm font-black italic text-slate-900 dark:text-white truncate uppercase">{doc.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-brand hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center transition-all shadow-sm">
                          Ouvrir
                        </a>
                        {canEdit && (
                          <button onClick={() => { if(confirm('Supprimer ce fichier ?')) API.schedules.deleteFile(doc.id).then(() => fetchData(true)); }} className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm">
                            <Trash2 size={16}/>
                          </button>
                        )}
                     </div>
                  </div>
                )
              }) : (
                <div className="p-10 bg-slate-50 dark:bg-slate-800/20 rounded-[3rem] text-center border-2 border-dashed border-slate-100 dark:border-slate-700">
                   <FileText size={32} className="mx-auto mb-4 text-slate-200" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-tight">Aucun document téléversé</p>
                </div>
              )}
           </div>
        </div>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={selectedSlot?.id?.startsWith('new') ? "Ajouter une Séance" : "Modifier le Créneau"}>
        {selectedSlot && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const slot = selectedSlot as ScheduleSlot;
            const startH = parseInt(slot.startTime.split(':')[0]);
            const endH = parseInt(slot.endTime.split(':')[0]);
            
            if (startH >= endH) {
              addNotification({ title: 'Erreur', message: "Horaire incohérent.", type: 'alert' });
              return;
            }

            if (selectedSlot.id?.startsWith('new')) setSlots(prev => [...prev, slot]);
            else setSlots(prev => prev.map(s => s.id === slot.id ? slot : s));
            
            setHasUnsavedChanges(true);
            setShowEditModal(false);
          }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Module / Matière</label>
              <input required value={selectedSlot.subject} onChange={e => setSelectedSlot({...selectedSlot, subject: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic outline-none border-none focus:ring-4 focus:ring-brand-50" placeholder="Analyse Mathématique..." />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Salle</label>
                <input required value={selectedSlot.room} onChange={e => setSelectedSlot({...selectedSlot, room: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" placeholder="Salle 105" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Professeur</label>
                <input required value={selectedSlot.teacher} onChange={e => setSelectedSlot({...selectedSlot, teacher: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold italic border-none focus:ring-4 focus:ring-brand-50" placeholder="M. Ndiaye" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Début</label>
                <select value={selectedSlot.startTime} onChange={e => setSelectedSlot({...selectedSlot, startTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase outline-none border-none">
                  {TIME_SLOTS.map(t => <option key={t} value={t} disabled={t >= "12:00" && t < "14:00"}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Fin</label>
                <select value={selectedSlot.endTime} onChange={e => setSelectedSlot({...selectedSlot, endTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase outline-none border-none">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>
                  )}
                  <option value="19:00">19:00</option>
                  <option value="20:00">20:00</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">Code Couleur</label>
              <div className="flex gap-3">
                {CATEGORY_COLORS.map(c => (
                  <button key={c.color} type="button" onClick={() => setSelectedSlot({...selectedSlot, color: c.color})} className={`w-8 h-8 rounded-full transition-all ${selectedSlot.color === c.color ? 'ring-4 ring-offset-4 ring-brand scale-110 shadow-lg' : 'opacity-40 hover:opacity-100 shadow-sm'}`} style={{ backgroundColor: c.color }} />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
               <button type="submit" className="flex-1 bg-brand text-white py-5 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-premium italic active:scale-95 transition-all">
                 {selectedSlot.id?.startsWith('new') ? "Ajouter" : "Appliquer"}
               </button>
               {!selectedSlot.id?.startsWith('new') && (
                 <button type="button" onClick={() => { if(confirm('Retirer ce créneau ?')) { setSlots(prev => prev.filter(s => s.id !== selectedSlot.id)); setHasUnsavedChanges(true); setShowEditModal(false); } }} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
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
