
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { API } from '../services/api';
import { 
  Users, BookOpen, UserPlus, Search, Loader2, School, 
  Plus, Trash2, LayoutDashboard, Shield, 
  PenSquare, Activity, Download, RefreshCcw, 
  ChevronRight, UserMinus, TrendingUp, Clock, Info, Check, Mail,
  CheckCircle2, FileDown
} from 'lucide-react';
import { UserRole, ClassGroup, ActivityLog, User } from '../types';
import Modal from '../components/Modal';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

type TabType = 'dashboard' | 'users' | 'classes' | 'logs';

const THEME_COLORS = [
  { name: 'Bleu ESP', color: '#0ea5e9' },
  { name: 'Émeraude', color: '#10b981' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Ambre', color: '#f59e0b' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Graphite', color: '#475569' },
  { name: 'Cerise', color: '#e11d48' },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  const [users, setUsers] = useState<User[]>([]);
  const [classesList, setClassesList] = useState<ClassGroup[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: 'passer25', role: UserRole.STUDENT, classname: '', schoolname: 'ESP Dakar' });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classFormData, setClassFormData] = useState({ id: '', name: '', email: '', color: '#0ea5e9' });
  const [isEditClassMode, setIsEditClassMode] = useState(false);

  const themeColor = user?.themecolor || '#87CEEB';

  const fetchGlobalData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    
    try {
        const [usersData, classesData, logsData] = await Promise.all([
            API.auth.getUsers(),
            API.classes.list(),
            API.logs.list()
        ]);
        setUsers(usersData);
        setClassesList(classesData);
        setLogs(logsData);
    } catch(e: any) {
        addNotification({ title: 'Erreur Sync', message: e?.message || "Échec du chargement backend.", type: 'alert' });
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  }, [addNotification]);

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      fetchGlobalData();
    }
  }, [user, fetchGlobalData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.fullName || !newUser.email || !newUser.classname) {
      addNotification({ title: 'Champs requis', message: 'Veuillez remplir toutes les informations.', type: 'warning' });
      return;
    }
    
    setSubmitting(true);
    try {
      await API.auth.createUser({
        name: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        classname: newUser.classname,
        schoolname: newUser.schoolname
      });
      addNotification({ title: 'Profil Créé', message: 'Le compte a été ajouté à la base de données.', type: 'success' });
      setIsUserModalOpen(false);
      setNewUser({ fullName: '', email: '', password: 'passer25', role: UserRole.STUDENT, classname: '', schoolname: 'ESP Dakar' });
      fetchGlobalData(true);
    } catch (err: any) {
      addNotification({ title: 'Échec de création', message: err.message || "Erreur lors de la création.", type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await API.auth.updateProfile(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        classname: editingUser.classname
      });
      addNotification({ title: 'Succès', message: 'Profil mis à jour.', type: 'success' });
      setIsEditModalOpen(false);
      fetchGlobalData(true);
    } catch (err: any) {
      addNotification({ title: 'Échec', message: err.message, type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer définitivement ${name} ?`)) return;
    try {
      await API.auth.deleteUser(id);
      addNotification({ title: 'Supprimé', message: 'L\'utilisateur a été retiré.', type: 'info' });
      fetchGlobalData(true);
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: 'Action impossible.', type: 'alert' });
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditClassMode) {
        await API.classes.update(classFormData.id, { 
          name: classFormData.name, 
          email: classFormData.email, 
          color: classFormData.color 
        });
      } else {
        await API.classes.create(classFormData.name, classFormData.email, classFormData.color);
      }
      addNotification({ title: 'Filière enregistrée', message: 'Les données ont été synchronisées.', type: 'success' });
      setIsClassModalOpen(false);
      fetchGlobalData(true);
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: err.message, type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer la filière "${name}" ? Cela ne supprimera pas les étudiants mais ils n'auront plus de classe assignée.`)) return;
    try {
      await API.classes.delete(id);
      addNotification({ title: 'Filière Retirée', message: name + ' a été supprimée.', type: 'info' });
      fetchGlobalData(true);
    } catch (err: any) {
      addNotification({ title: 'Erreur', message: 'Suppression impossible.', type: 'alert' });
    }
  };

  const downloadCSV = useCallback((data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JangHup_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleExportData = async (type: 'users' | 'classes' | 'logs') => {
    setExporting(type);
    try {
      let dataToExport: any[] = [];
      let filename = "";
      if (type === 'users') {
        dataToExport = users.map(u => ({ Nom: u.name, Email: u.email, Role: u.role, Filière: u.classname }));
        filename = "utilisateurs";
      } else if (type === 'classes') {
        dataToExport = classesList.map(c => ({ Nom: c.name, Email: c.email, Effectif: c.studentCount }));
        filename = "filieres";
      } else {
        dataToExport = logs.map(l => ({ Date: l.timestamp, Acteur: l.actor, Action: l.action, Cible: l.target }));
        filename = "audit";
      }
      downloadCSV(dataToExport, filename);
    } finally { setExporting(null); }
  };

  const dashboardStats = useMemo(() => {
    const rolesCount = { [UserRole.ADMIN]: 0, [UserRole.DELEGATE]: 0, [UserRole.STUDENT]: 0 };
    users.forEach(u => { if (rolesCount[u.role] !== undefined) rolesCount[u.role]++; });
    return {
        usersCount: users.length,
        classesCount: classesList.length,
        rolesData: [
            { name: 'Étudiants', value: rolesCount[UserRole.STUDENT], color: '#3B82F6' },
            { name: 'Délégués', value: rolesCount[UserRole.DELEGATE], color: '#10B981' },
            { name: 'Admins', value: rolesCount[UserRole.ADMIN], color: '#8B5CF6' },
        ]
    };
  }, [users, classesList]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = (u.name?.toLowerCase() || '').includes(q) || (u.email?.toLowerCase() || '').includes(q);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  if (loading && users.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-brand" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Accès administration JangHup...</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-160px)] animate-fade-in pb-20">
      {/* Admin Sidebar Navigation */}
      <div className="w-full md:w-80 flex-shrink-0 space-y-6">
         <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 shadow-soft border border-gray-100 dark:border-gray-800">
             <div className="flex items-center gap-4 mb-10 px-2">
                <div className="p-3.5 text-white rounded-2xl shadow-xl transition-transform hover:rotate-6" style={{ backgroundColor: themeColor }}>
                    <Shield size={22} />
                </div>
                <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Administration</h3>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Contrôle Institutionnel</p>
                </div>
             </div>
             <nav className="space-y-1.5">
                 {[
                   { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de Bord' },
                   { id: 'classes', icon: BookOpen, label: 'Classes & Filières' },
                   { id: 'users', icon: Users, label: 'Utilisateurs' },
                   { id: 'logs', icon: Activity, label: 'Audit Sécurité' }
                 ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`w-full flex items-center gap-4 px-6 py-4.5 text-xs font-black rounded-2xl transition-all uppercase tracking-widest italic ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-premium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                        <tab.icon size={18} /> {tab.label}
                    </button>
                 ))}
             </nav>
             <button onClick={() => fetchGlobalData(true)} className="w-full mt-6 flex items-center justify-center gap-2 py-3 text-[9px] font-black uppercase tracking-widest text-brand hover:underline">
               <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} /> Actualiser les données
             </button>
         </div>

         <div className="bg-slate-900 dark:bg-black rounded-[3rem] p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-1000" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
              <Download size={12} /> Rapports Globaux
            </p>
            <div className="space-y-3 relative z-10">
              <button onClick={() => handleExportData('users')} disabled={exporting !== null} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {exporting === 'users' ? <Loader2 size={14} className="animate-spin"/> : <Users size={14} />} CSV Inscrits
              </button>
              <button onClick={() => handleExportData('logs')} disabled={exporting !== null} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {exporting === 'logs' ? <Loader2 size={14} className="animate-spin"/> : <Shield size={14} />} Journal Audit
              </button>
            </div>
         </div>
      </div>

      {/* Admin Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {activeTab === 'dashboard' && (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3.5rem] shadow-soft border border-gray-100 dark:border-gray-800 group hover:shadow-premium transition-all">
                        <div className="flex items-center justify-between mb-4">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inscrits Totaux</p>
                           <Users size={20} className="text-brand opacity-20 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className="text-6xl font-black text-gray-900 dark:text-white italic tracking-tighter leading-none">{dashboardStats.usersCount}</h3>
                        <p className="text-[9px] text-emerald-500 font-bold mt-4 uppercase tracking-widest flex items-center gap-1"><TrendingUp size={10}/> Synchronisation live</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3.5rem] shadow-soft border border-gray-100 dark:border-gray-800 group hover:shadow-premium transition-all">
                        <div className="flex items-center justify-between mb-4">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filières Actives</p>
                           <BookOpen size={20} className="text-brand opacity-20 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className="text-6xl font-black text-gray-900 dark:text-white italic tracking-tighter leading-none">{dashboardStats.classesCount}</h3>
                        <p className="text-[9px] text-gray-400 font-bold mt-4 uppercase tracking-widest italic">Configuration ESP</p>
                    </div>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-gray-900 p-10 rounded-[4rem] shadow-soft border border-gray-100 dark:border-gray-800">
                      <h3 className="text-sm font-black text-gray-900 dark:text-white mb-10 uppercase tracking-widest italic border-l-4 border-brand pl-6">Structure des Comptes</h3>
                      <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={dashboardStats.rolesData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                                  {dashboardStats.rolesData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                                <Legend verticalAlign="bottom" iconType="circle" />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 p-10 rounded-[4rem] shadow-soft border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-10">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic border-l-4 border-amber-500 pl-6">Flux Sécurité</h3>
                        <button onClick={() => setActiveTab('logs')} className="text-[10px] font-black text-brand hover:underline tracking-widest uppercase">Voir tout</button>
                      </div>
                      <div className="space-y-4">
                        {logs.slice(0, 5).map(log => (
                          <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                             <p className="text-xs font-bold text-gray-700 dark:text-gray-300 italic truncate flex-1">
                               {log.actor} <span className="font-medium text-gray-400 mx-1">{log.action}</span> {log.target}
                             </p>
                          </div>
                        ))}
                      </div>
                  </div>
                </div>
            </div>
         )}
         
         {activeTab === 'users' && (
            <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-soft border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex flex-col lg:flex-row justify-between gap-6 bg-gray-50/30">
                    <div className="flex-1 max-w-xl relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input type="text" placeholder="Rechercher un profil..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-4.5 bg-white dark:bg-gray-800 rounded-[1.8rem] text-sm font-bold outline-none shadow-sm focus:ring-4 focus:ring-brand-50 transition-all border border-gray-100 dark:border-gray-700" />
                    </div>
                    <div className="flex gap-3">
                      <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-6 py-4 bg-white dark:bg-gray-800 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border border-gray-100 dark:border-gray-700 outline-none shadow-sm cursor-pointer">
                        <option value="ALL">Tous les rôles</option>
                        <option value={UserRole.STUDENT}>Étudiants</option>
                        <option value={UserRole.DELEGATE}>Délégués</option>
                        <option value={UserRole.ADMIN}>Admins</option>
                      </select>
                      <button onClick={() => setIsUserModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2 hover:bg-black">
                        <UserPlus size={18}/> Nouveau compte
                      </button>
                    </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                            <tr>
                              <th className="px-10 py-6">Utilisateur & Rôle</th>
                              <th className="px-10 py-6">Email Académique</th>
                              <th className="px-10 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-brand-50/5 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-md transform group-hover:rotate-3 transition-transform ${u.role === UserRole.ADMIN ? 'bg-violet-500' : u.role === UserRole.DELEGATE ? 'bg-emerald-500' : 'bg-brand'}`}>
                                              {u.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black italic text-gray-900 dark:text-white text-lg tracking-tight leading-none mb-1.5">{u.name}</span>
                                                <div className="flex items-center gap-2">
                                                   <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${u.role === UserRole.ADMIN ? 'bg-violet-100 text-violet-600' : u.role === UserRole.DELEGATE ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'}`}>
                                                     {u.role}
                                                   </span>
                                                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{u.classname}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-gray-500 italic font-medium">{u.email}</td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex gap-2 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingUser(u); setIsEditModalOpen(true); }} className="p-3 bg-blue-50 dark:bg-blue-900/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-90" title="Éditer"><PenSquare size={18}/></button>
                                            <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-3 bg-red-50 dark:bg-red-900/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-90" title="Supprimer"><UserMinus size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
         )}

         {activeTab === 'classes' && (
            <div className="space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                    <div>
                        <h3 className="text-4xl font-black italic text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Classes & Filières</h3>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-brand" /> Gestion institutionnelle
                        </p>
                    </div>
                    <button onClick={() => { setClassFormData({ id: '', name: '', email: '', color: '#0ea5e9' }); setIsEditClassMode(false); setIsClassModalOpen(true); }} className="bg-slate-900 dark:bg-black text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all italic flex items-center gap-3 hover:bg-gray-800">
                        <Plus size={20} /> Ajouter une Filière
                    </button>
                </div>
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                    {classesList.map(cls => (
                        <div key={cls.id} className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border-2 shadow-soft flex flex-col group relative overflow-hidden transition-all hover:scale-[1.03] hover:-translate-y-2" style={{ borderColor: cls.color || '#e2e8f0' }}>
                            <div className="absolute top-0 right-0 w-48 h-48 opacity-5 -mr-20 -mt-20 rounded-full group-hover:scale-150 transition-transform duration-1000" style={{ backgroundColor: cls.color }} />
                            
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div className="w-16 h-16 rounded-[1.8rem] shadow-xl flex items-center justify-center text-white" style={{ backgroundColor: cls.color || '#87CEEB' }}>
                                  <School size={32} />
                                </div>
                                <div className="flex flex-col items-end">
                                   <span className="text-4xl font-black italic leading-none text-gray-900 dark:text-white">{cls.studentCount || 0}</span>
                                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Membres</span>
                                </div>
                            </div>
                            
                            <h4 className="text-3xl font-black italic mb-2 text-gray-900 dark:text-white leading-tight tracking-tight uppercase">{cls.name}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-12 truncate italic">{cls.email || 'Aucun email de diffusion'}</p>
                            
                            <div className="mt-auto space-y-3 relative z-10">
                                <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => { setClassFormData({ id: cls.id, name: cls.name, email: cls.email || '', color: cls.color || '#0ea5e9' }); setIsEditClassMode(true); setIsClassModalOpen(true); }} className="py-4 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-brand rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 font-black text-[9px] uppercase"><PenSquare size={16}/> Éditer</button>
                                  <button onClick={() => handleDeleteClass(cls.id, cls.name)} className="py-4 bg-red-50 dark:bg-red-900/10 text-red-400 hover:text-red-500 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 font-black text-[9px] uppercase"><Trash2 size={16}/> Retirer</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         )}

         {activeTab === 'logs' && (
            <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-soft border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/20">
                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 italic flex items-center gap-3">
                      <Activity size={18} className="text-amber-500" /> Journal Audit JangHup
                    </h4>
                    <button onClick={() => handleExportData('logs')} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl active:scale-95 transition-all">
                        <FileDown size={16}/> Extraire tout le journal
                    </button>
                </div>
                <div className="p-8 space-y-3">
                    {logs.map(log => (
                        <div key={log.id} className="flex items-center gap-8 p-6 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 rounded-[2.5rem] transition-all border-b border-gray-50 dark:border-gray-800 last:border-0 group">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 text-brand rounded-2xl shadow-inner-soft shrink-0 group-hover:scale-110 transition-transform">
                                <Shield size={20}/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-bold text-gray-900 dark:text-white italic leading-tight">
                                    <span className="text-brand">{log.actor}</span> <span className="text-gray-400 font-medium lowercase italic mx-2 underline decoration-gray-200 decoration-2">{log.action}</span> <span className="text-gray-900 dark:text-white underline decoration-amber-500/20 decoration-4">{log.target}</span>
                                </p>
                                <div className="flex items-center gap-4 mt-3">
                                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                                     <Clock size={12} /> {new Date(log.timestamp).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                                   </p>
                                   <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${log.type === 'security' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>{log.type}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         )}
      </div>

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Enrôlement JangHup Premium">
          <form onSubmit={handleCreateUser} className="space-y-8 py-2">
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Nom et Prénom</label>
                  <input required className="w-full p-5 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none font-bold text-sm outline-none shadow-inner-soft focus:ring-4 focus:ring-brand-50" placeholder="Jean Dupont" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Email Académique</label>
                  <input required type="email" className="w-full p-5 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none font-bold text-sm outline-none shadow-inner-soft focus:ring-4 focus:ring-brand-50" placeholder="jean.dupont@esp.sn" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Rôle</label>
                    <select className="w-full p-5 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none font-black text-[10px] uppercase outline-none cursor-pointer" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                        <option value={UserRole.STUDENT}>Étudiant</option>
                        <option value={UserRole.DELEGATE}>Délégué</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Filière</label>
                    <select required className="w-full p-5 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none font-black text-[10px] uppercase outline-none cursor-pointer" value={newUser.classname} onChange={e => setNewUser({...newUser, classname: e.target.value})}>
                        <option value="">Sélectionner...</option>
                        {classesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-start gap-3 border border-amber-100 dark:border-amber-800">
                <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase leading-relaxed">
                  L'utilisateur recevra un mot de passe temporaire s'il n'existe pas encore. L'ID sera généré automatiquement.
                </p>
              </div>
              <button disabled={submitting} type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-premium uppercase tracking-[0.2em] italic text-xs active:scale-95 transition-all hover:bg-black">
                {submitting ? <Loader2 className="animate-spin mx-auto" size={20}/> : "Valider l'inscription"}
              </button>
          </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier le Profil">
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-8 py-2">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Nom Complet</label>
                    <input required className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-bold text-sm outline-none focus:ring-4 focus:ring-brand-50" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Email Académique</label>
                    <input required type="email" className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-bold text-sm outline-none focus:ring-4 focus:ring-brand-50" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Rôle</label>
                        <select className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-black text-[10px] uppercase outline-none" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                            <option value={UserRole.STUDENT}>Étudiant</option>
                            <option value={UserRole.DELEGATE}>Délégué</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Filière</label>
                        <select className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none font-black text-[10px] uppercase outline-none" value={editingUser.classname} onChange={e => setEditingUser({...editingUser, classname: e.target.value})}>
                            <option value="">Aucune</option>
                            {classesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <button disabled={submitting} type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-premium uppercase tracking-widest italic text-xs active:scale-95 transition-all">
                    {submitting ? <Loader2 className="animate-spin mx-auto" size={20}/> : "Sauvegarder les changements"}
                </button>
            </form>
          )}
      </Modal>

      <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title="Configuration de la Filière">
         <form onSubmit={handleSaveClass} className="space-y-8 py-2">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Nom de la classe</label>
                <input required className="w-full p-5 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none font-bold text-sm outline-none shadow-inner-soft focus:ring-4 focus:ring-brand-50" placeholder="L2 Informatique" value={classFormData.name} onChange={e => setClassFormData({...classFormData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Email de diffusion</label>
                <input type="email" className="w-full p-5 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 border-none font-bold text-sm outline-none shadow-inner-soft focus:ring-4 focus:ring-brand-50" placeholder="list-l2@esp.sn" value={classFormData.email} onChange={e => setClassFormData({...classFormData, email: e.target.value})} />
            </div>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Identité Visuelle</label>
                <div className="grid grid-cols-4 gap-4">
                    {THEME_COLORS.map(c => (
                        <button key={c.color} type="button" onClick={() => setClassFormData({...classFormData, color: c.color})} className={`h-12 rounded-2xl transition-all shadow-sm ${classFormData.color === c.color ? 'ring-4 ring-offset-2 ring-brand scale-110 shadow-lg' : 'hover:scale-105 opacity-80'}`} style={{ backgroundColor: c.color }} title={c.name}>
                          {classFormData.color === c.color && <Check size={16} className="mx-auto text-white" />}
                        </button>
                    ))}
                </div>
            </div>
            <button disabled={submitting} type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] uppercase tracking-[0.2em] text-[10px] italic shadow-2xl active:scale-95 transition-all">
                {submitting ? <Loader2 className="animate-spin mx-auto" size={20}/> : (isEditClassMode ? "Mettre à jour" : "Créer la filière")}
            </button>
         </form>
      </Modal>
    </div>
  );
}
