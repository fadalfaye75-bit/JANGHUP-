
import { supabase } from './supabaseClient';
import { User, Announcement, UserRole, ClassGroup, Exam, Poll, MeetLink, ScheduleSlot, ActivityLog, AppNotification, ScheduleFile } from '../types';

/**
 * Interface de communication unifiée avec Supabase.
 * Toutes les requêtes respectent les politiques RLS définies côté serveur.
 */
export const API = {
  auth: {
    canPost: (u: User | null) => {
      if (!u) return false;
      return [UserRole.ADMIN, UserRole.DELEGATE].includes(u.role);
    },
    
    login: async (email: string, pass: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (pError) throw pError;
      return profile as User;
    },

    logout: async () => supabase.auth.signOut(),

    getUsers: async (): Promise<User[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      return data || [];
    },

    createUser: async (userData: any) => {
      // Note: L'admin crée le profil, l'auth est gérée par invitation ou trigger SQL
      const { data, error } = await supabase.from('profiles').insert([{
        id: crypto.randomUUID(), // Temporaire avant liaison auth réelle
        name: userData.name,
        email: userData.email,
        role: userData.role,
        classname: userData.classname,
        schoolname: userData.schoolname || 'ESP Dakar'
      }]).select().single();
      if (error) throw error;
      return data;
    },

    updateProfile: async (id: string, updates: Partial<User>) => {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    deleteUser: async (id: string) => supabase.from('profiles').delete().eq('id', id),

    /* Fix: Add missing updatePassword method */
    updatePassword: async (id: string, password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    }
  },

  announcements: {
    list: async (limit = 50): Promise<Announcement[]> => {
      // Le RLS filtre automatiquement par classname de l'utilisateur connecté
      const { data, error } = await supabase.from('announcements').select('*').order('date', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    },
    create: async (ann: Partial<Announcement>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('announcements').insert([{ 
        ...ann, 
        user_id: user?.id,
        date: new Date().toISOString() 
      }]);
      if (error) throw error;
    },
    /* Fix: Add missing update method */
    update: async (id: string, ann: Partial<Announcement>) => {
      const { error } = await supabase.from('announcements').update(ann).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => supabase.from('announcements').delete().eq('id', id),
    subscribe: (callback: () => void) => {
      return supabase.channel('ann_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, callback).subscribe();
    }
  },

  exams: {
    list: async (): Promise<Exam[]> => {
      const { data, error } = await supabase.from('exams').select('*').order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    create: async (exam: Partial<Exam>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('exams').insert([{ ...exam, user_id: user?.id }]);
      if (error) throw error;
    },
    /* Fix: Add missing update method */
    update: async (id: string, exam: Partial<Exam>) => {
      const { error } = await supabase.from('exams').update(exam).eq('id', id);
      if (error) throw error;
    },
    /* Fix: Add missing delete method */
    delete: async (id: string) => {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
    }
  },

  /* Fix: Add missing meet object */
  meet: {
    list: async (): Promise<MeetLink[]> => {
      const { data, error } = await supabase.from('meet_links').select('*').order('title');
      if (error) throw error;
      return data || [];
    },
    create: async (link: Partial<MeetLink>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('meet_links').insert([{ ...link, user_id: user?.id }]);
      if (error) throw error;
    },
    update: async (id: string, link: Partial<MeetLink>) => {
      const { error } = await supabase.from('meet_links').update(link).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('meet_links').delete().eq('id', id);
      if (error) throw error;
    }
  },

  polls: {
    list: async (): Promise<Poll[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      // On récupère les sondages, leurs options et les votes de l'utilisateur
      const { data, error } = await supabase.from('polls').select('*, poll_options(*), poll_votes(*)').order('created_at', { ascending: false });
      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        totalVotes: p.poll_votes?.length || 0,
        hasVoted: p.poll_votes?.some((v: any) => v.user_id === user?.id),
        userVoteOptionId: p.poll_votes?.find((v: any) => v.user_id === user?.id)?.option_id,
        options: p.poll_options.map((o: any) => ({ 
          ...o, 
          votes: p.poll_votes?.filter((v: any) => v.option_id === o.id).length || 0 
        }))
      }));
    },
    vote: async (pollId: string, optionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('poll_votes').upsert({ 
        poll_id: pollId, 
        user_id: user?.id, 
        option_id: optionId 
      });
      if (error) throw error;
    },
    create: async (poll: any) => {
      const { data: newPoll, error: pError } = await supabase.from('polls').insert([{ 
        question: poll.question, 
        classname: poll.classname, 
        isactive: true 
      }]).select().single();
      if (pError) throw pError;
      
      const options = poll.options.map((o: string) => ({ poll_id: newPoll.id, label: o }));
      const { error: oError } = await supabase.from('poll_options').insert(options);
      if (oError) throw oError;
    },
    /* Fix: Add missing subscribe method */
    subscribe: (callback: () => void) => {
      return supabase.channel('poll_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, callback).subscribe();
    },
    /* Fix: Add missing update method */
    update: async (id: string, updates: Partial<Poll>) => {
      const { error } = await supabase.from('polls').update(updates).eq('id', id);
      if (error) throw error;
    },
    /* Fix: Add missing delete method */
    delete: async (id: string) => {
      const { error } = await supabase.from('polls').delete().eq('id', id);
      if (error) throw error;
    }
  },

  schedules: {
    getSlots: async (classname: string): Promise<ScheduleSlot[]> => {
      const { data, error } = await supabase.from('schedule_slots').select('*').eq('classname', classname);
      if (error) throw error;
      return data || [];
    },
    saveSlots: async (classname: string, slots: ScheduleSlot[]) => {
      // On vide et on remplace pour la classe donnée (stratégie simple de sync)
      await supabase.from('schedule_slots').delete().eq('classname', classname);
      const { error } = await supabase.from('schedule_slots').insert(slots.map(s => ({ ...s, classname })));
      if (error) throw error;
    },
    /* Fix: Add missing list method for ScheduleFile */
    list: async (): Promise<ScheduleFile[]> => {
      const { data, error } = await supabase.from('schedule_files').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  },

  sharing: {
    whatsapp: (text: string) => {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  },

  notifications: {
    list: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    markRead: async (id: string) => supabase.from('notifications').update({ is_read: true }).eq('id', id),
    /* Fix: Add missing subscribe method */
    subscribe: (callback: () => void) => {
      return supabase.channel('notif_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, callback).subscribe();
    },
    /* Fix: Add missing markAllAsRead method */
    markAllAsRead: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('target_user_id', user?.id);
      if (error) throw error;
    },
    /* Fix: Add missing clear method */
    clear: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('notifications').delete().eq('target_user_id', user?.id);
      if (error) throw error;
    },
    /* Fix: Add missing create method */
    create: async (notif: any) => {
      const { error } = await supabase.from('notifications').insert([notif]);
      if (error) throw error;
    },
    /* Fix: Add missing delete method */
    delete: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    }
  },

  classes: {
    list: async (): Promise<ClassGroup[]> => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    create: async (name: string, color: string) => supabase.from('classes').insert([{ name, color }]),
    /* Fix: Add missing update method */
    update: async (id: string, updates: { name: string, color: string }) => {
      const { error } = await supabase.from('classes').update(updates).eq('id', id);
      if (error) throw error;
    },
    /* Fix: Add missing delete method */
    delete: async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
    }
  },

  logs: {
    list: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    }
  },

  settings: {
    getAI: async () => {
      const { data, error } = await supabase.from('ai_settings').select('*').single();
      if (error) return { isActive: true, verbosity: 'balanced', tone: 'helpful' };
      return data;
    }
  },

  /* Fix: Add missing favorites object */
  favorites: {
    list: async () => {
      const { data, error } = await supabase.from('favorites').select('*');
      if (error) throw error;
      return data || [];
    },
    toggle: async (contentId: string, contentType: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from('favorites').select('*').eq('user_id', user?.id).eq('content_id', contentId).single();
      if (existing) {
        return supabase.from('favorites').delete().eq('id', existing.id);
      } else {
        return supabase.from('favorites').insert([{ user_id: user?.id, content_id: contentId, content_type: contentType }]);
      }
    }
  }
};
