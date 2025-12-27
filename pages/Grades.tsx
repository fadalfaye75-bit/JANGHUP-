
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { Grade, UserRole } from '../types';
import { 
  ClipboardList, TrendingUp, Award, Target, Filter, 
  Search, Download, Plus, Loader2, BookOpen, AlertCircle,
  ChevronDown, GraduationCap, Star
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Grades() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  // Fix: Property 'themeColor' does not exist on type 'User'. Did you mean 'themecolor'?
  const themeColor = user?.themecolor || '#0ea5e9';
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesterFilter, setSemesterFilter] = useState<number>(0); // 0 = All

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const data = await API.grades.list(user?.id);
        setGrades(data);
      } catch (e) {
        addNotification({ title: 'Erreur', message: 'Impossible de charger vos notes.', type: 'alert' });
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [user?.id, addNotification]);

  const stats = useMemo(() => {
    const filtered = semesterFilter === 0 ? grades : grades.filter(g => g.semester === semesterFilter);
    if (filtered.length === 0) return { avg: 0, totalCoef: 0, credits: 0 };
    
    let totalScore = 0;
    let totalCoef = 0;
    filtered.forEach(g => {
      totalScore += (g.score / g.maxScore * 20) * g.coefficient;
      totalCoef += g.coefficient;
    });
    
    return {
      avg: totalScore / totalCoef,
      totalCoef,
      credits: filtered.length * 5 // Mock credits
    };
  }, [grades, semesterFilter]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-primary-500" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Récupération des résultats...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-emerald-500 text-white rounded-[1.8rem] flex items-center justify-center shadow-lg"><ClipboardList size={32} /></div>
           <div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">Mes Résultats</h2>
              {/* Fix: Property 'className' does not exist on type 'User'. Did you mean 'classname'? */}
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Suivi académique officiel • {user?.classname}</p>
           </div>
        </div>

        <div className="flex gap-3">
           <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700">
             {[0, 1, 2].map((s) => (
               <button 
                 key={s} 
                 onClick={() => setSemesterFilter(s)}
                 className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${semesterFilter === s ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-900'}`}
               >
                 {s === 0 ? 'Tout' : `S${s}`}
               </button>
             ))}
           </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid md:grid-cols-3 gap-8">
         <div className="bg-white dark:bg-gray-900 p-10 rounded-[3.5rem] shadow-soft border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-1000" />
            <TrendingUp size={24} className="text-emerald-500 mb-6" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Moyenne Générale</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black italic tracking-tighter text-gray-900 dark:text-white">{stats.avg.toFixed(2)}</span>
              <span className="text-xl font-bold text-gray-400">/20</span>
            </div>
         </div>

         <div className="bg-white dark:bg-gray-900 p-10 rounded-[3.5rem] shadow-soft border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-1000" />
            <Target size={24} className="text-primary-500 mb-6" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Modules Validés</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black italic tracking-tighter text-gray-900 dark:text-white">{grades.filter(g => g.score >= g.maxScore/2).length}</span>
              <span className="text-xl font-bold text-gray-400">/ {grades.length}</span>
            </div>
         </div>

         <div className="bg-white dark:bg-gray-900 p-10 rounded-[3.5rem] shadow-soft border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-1000" />
            <Award size={24} className="text-amber-500 mb-6" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Crédits ECTS</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black italic tracking-tighter text-gray-900 dark:text-white">{stats.credits}</span>
              <span className="text-xl font-bold text-gray-400">pts</span>
            </div>
         </div>
      </div>

      {/* Grades List */}
      <div className="bg-white dark:bg-gray-900 rounded-[4rem] shadow-soft border border-gray-100 dark:border-gray-800 overflow-hidden">
         <div className="p-10 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-3">
              <BookOpen size={18} className="text-primary-500" /> Relevé Détaillé
            </h3>
            <button className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase hover:text-primary-500 transition-colors">
              <Download size={16} /> PDF
            </button>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <tr>
                    <th className="px-10 py-6">Matière / Module</th>
                    <th className="px-10 py-6">Note</th>
                    <th className="px-10 py-6">Coef</th>
                    <th className="px-10 py-6">Semestre</th>
                    <th className="px-10 py-6 text-right">Statut</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {grades.filter(g => semesterFilter === 0 || g.semester === semesterFilter).map(grade => {
                    const isPassed = grade.score >= (grade.maxScore / 2);
                    return (
                      <tr key={grade.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all">
                        <td className="px-10 py-8">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                 {grade.subject.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black italic text-gray-900 dark:text-white">{grade.subject}</span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{grade.comment || 'Aucun commentaire'}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <span className={`text-xl font-black italic ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {grade.score} <span className="text-xs text-gray-400 font-bold">/ {grade.maxScore}</span>
                           </span>
                        </td>
                        <td className="px-10 py-8 font-black text-gray-500 italic">x{grade.coefficient}</td>
                        <td className="px-10 py-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Semestre {grade.semester}</td>
                        <td className="px-10 py-8 text-right">
                           <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                             {isPassed ? 'Validé' : 'Échec'}
                           </span>
                        </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
            {grades.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                 <AlertCircle size={40} className="text-gray-100" />
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Aucun résultat publié pour le moment.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
