
import { supabase } from './supabaseClient';
import { User, Announcement, Exam, MeetLink, Poll, ClassGroup, ActivityLog, AppNotification, UserRole, ScheduleFile, ScheduleSlot, Grade, DirectMessage } from '../types';

const handleAPIError = (error: any, fallback: string) => {
  if (!error) return;
  console.error(`[SRE API Audit] ${fallback}:`, error);
  const message = error.message || fallback;
  throw new Error(message);
};

const mapProfile = (dbProfile: any): User => ({
  id: dbProfile.id,
  name: dbProfile.name || 'Utilisateur',
  email: dbProfile.email || '',
  role: (dbProfile.role as UserRole) || UserRole.STUDENT,
  className: dbProfile.classname || 'Général',
  avatar: dbProfile.avatar,
  schoolName: dbProfile.school_name,
  isActive: dbProfile.is_active ?? true,
  themeColor: dbProfile.theme_color
});

export const API = {
  auth: {
    canPost: (user: User | null): boolean => user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE,
    canEdit: (user: User | null, item: any): boolean => {
      if (!user) return false;
      if (user.role === UserRole.ADMIN) return true;
      return user.role === UserRole.DELEGATE && item.user_id === user.id;
    },
    // Added missing canDelete security helper
    canDelete: (user: User | null): boolean => user?.role === UserRole.ADMIN,
    
    getSession: async (): Promise<User | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (!profile) return null;
        return mapProfile(profile);
      } catch (e) { return null; }
    },
    
    login: async (email: string, pass: string): Promise<User> => {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password: pass 
      });
      
      if (error) throw new Error("Identifiants incorrects ou compte inexistant.");
      if (!data?.user) throw new Error("Échec critique de l'authentification.");
      
      let profileData = null;
      for (let i = 0; i < 3; i++) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
        if (p) { profileData = p; break; }
        await new Promise(r => setTimeout(r, 500)); 
      }
      
      if (!profileData) throw new Error("Profil non synchronisé. Contactez le délégué.");
      return mapProfile(profileData);
    },

    getUsers: async (): Promise<User[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) handleAPIError(error, "Impossible de charger les utilisateurs.");
      return (data || []).map(mapProfile);
    },

    createUser: async (userData: any) => {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email.trim().toLowerCase(), 
        password: userData.password,
        options: { 
          data: { 
            name: userData.fullName, 
            role: userData.role, 
            className: userData.className, 
            school_name: userData.schoolName 
          } 
        }
      });
      if (error) throw new Error(error.message);
      return data.user;
    },

    // Added missing deleteUser for admin panel
    deleteUser: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) handleAPIError(error, "Suppression utilisateur échouée");
    },

    // Added missing updatePassword for profile
    updatePassword: async (id: string, pass: string) => {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) handleAPIError(error, "Mise à jour mot de passe échouée");
    },

    updateProfile: async (id: string, updates: Partial<User>) => {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.role) dbUpdates.role = updates.role;
      if (updates.className) dbUpdates.classname = updates.className;
      if (updates.themeColor) dbUpdates.theme_color = updates.themeColor;
      if (updates.schoolName) dbUpdates.school_name = updates.schoolName;
      
      const { data, error } = await supabase.from('profiles').update(dbUpdates).eq('id', id).select().maybeSingle();
      if (error) handleAPIError(error, "Mise à jour échouée.");
      return data ? mapProfile(data) : null;
    }
  },

  announcements: {
    list: async (page: number, size: number): Promise<Announcement[]> => {
      const { data, error } = await supabase.from('announcements')
        .select('*')
        .order('date', { ascending: false })
        .range(page * size, (page + 1) * size - 1);
      if (error) return [];
      return (data || []).map(a => ({ ...a, className: a.classname }));
    },
    subscribe: (callback: () => void) => {
      return supabase.channel('ann_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, callback)
        .subscribe();
    },
    // Added missing announcement mutations
    create: async (ann: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('announcements').insert({
        user_id: user?.id,
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        classname: ann.className,
        links: ann.links,
        author: user?.user_metadata?.name || 'Admin',
        date: new Date().toISOString()
      });
      if (error) handleAPIError(error, "Création annonce échouée");
    },
    update: async (id: string, ann: any) => {
      const { error } = await supabase.from('announcements').update({
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        classname: ann.className,
        links: ann.links
      }).eq('id', id);
      if (error) handleAPIError(error, "Mise à jour annonce échouée");
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) handleAPIError(error, "Suppression annonce échouée");
    }
  },

  // Added missing exams service
  exams: {
    list: async (): Promise<Exam[]> => {
      const { data, error } = await supabase.from('exams').select('*').order('date');
      if (error) return [];
      return (data || []).map(e => ({ ...e, className: e.classname }));
    },
    create: async (exam: any) => {
      const { error } = await supabase.from('exams').insert({
        subject: exam.subject,
        date: exam.date,
        duration: exam.duration,
        room: exam.room,
        notes: exam.notes,
        classname: exam.className
      });
      if (error) handleAPIError(error, "Création examen échouée");
    },
    update: async (id: string, exam: any) => {
      const { error } = await supabase.from('exams').update({
        subject: exam.subject,
        date: exam.date,
        duration: exam.duration,
        room: exam.room,
        notes: exam.notes,
        classname: exam.className
      }).eq('id', id);
      if (error) handleAPIError(error, "Mise à jour examen échouée");
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) handleAPIError(error, "Suppression examen échouée");
    }
  },

  // Added missing schedules service
  schedules: {
    list: async (): Promise<ScheduleFile[]> => {
      const { data, error } = await supabase.from('schedule_files').select('*').order('uploadDate', { ascending: false });
      if (error) return [];
      return (data || []).map(s => ({ ...s, className: s.classname }));
    },
    getSlots: async (className: string): Promise<ScheduleSlot[]> => {
      const { data, error } = await supabase.from('schedule_slots').select('*').eq('classname', className);
      if (error) return [];
      return data || [];
    },
    saveSlots: async (className: string, slots: ScheduleSlot[]) => {
      await supabase.from('schedule_slots').delete().eq('classname', className);
      if (slots.length > 0) {
        const { error } = await supabase.from('schedule_slots').insert(
          slots.map(s => ({ ...s, classname: className, id: undefined }))
        );
        if (error) handleAPIError(error, "Sauvegarde planning échouée");
      }
    },
    deleteFile: async (id: string) => {
      const { error } = await supabase.from('schedule_files').delete().eq('id', id);
      if (error) handleAPIError(error, "Suppression fichier échouée");
    }
  },

  // Added missing meet service
  meet: {
    list: async (): Promise<MeetLink[]> => {
      const { data, error } = await supabase.from('meet_links').select('*').order('time');
      if (error) return [];
      return (data || []).map(m => ({ ...m, className: m.classname }));
    },
    create: async (meet: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('meet_links').insert({
        user_id: user?.id,
        title: meet.title,
        platform: meet.platform,
        url: meet.url,
        time: meet.time,
        classname: meet.className
      });
      if (error) handleAPIError(error, "Création salon échouée");
    },
    update: async (id: string, meet: any) => {
      const { error } = await supabase.from('meet_links').update({
        title: meet.title,
        platform: meet.platform,
        url: meet.url,
        time: meet.time,
        classname: meet.className
      }).eq('id', id);
      if (error) handleAPIError(error, "Mise à jour salon échouée");
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('meet_links').delete().eq('id', id);
      if (error) handleAPIError(error, "Suppression salon échouée");
    }
  },

  // Added missing polls service
  polls: {
    list: async (): Promise<Poll[]> => {
      const { data, error } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
      if (error) return [];
      const { data: { user } } = await supabase.auth.getUser();
      
      return Promise.all((data || []).map(async p => {
        const { data: votes } = await supabase.from('poll_votes').select('option_id, user_id').eq('poll_id', p.id);
        const userVote = votes?.find(v => v.user_id === user?.id);
        
        const optionsWithVotes = p.options.map((opt: any) => ({
          ...opt,
          votes: votes?.filter(v => v.option_id === opt.id).length || 0
        }));

        return {
          ...p,
          className: p.classname,
          options: optionsWithVotes,
          totalVotes: votes?.length || 0,
          hasVoted: !!userVote,
          userVoteOptionId: userVote?.option_id,
          createdAt: p.created_at
        };
      }));
    },
    vote: async (pollId: string, optionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', user.id);
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: pollId,
        user_id: user.id,
        option_id: optionId
      });
      if (error) handleAPIError(error, "Vote échoué");
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('polls').update({
        is_active: updates.isActive ?? undefined,
        question: updates.question ?? undefined,
        classname: updates.className ?? undefined
      }).eq('id', id);
      if (error) handleAPIError(error, "Mise à jour sondage échouée");
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('polls').delete().eq('id', id);
      if (error) handleAPIError(error, "Suppression sondage échouée");
    },
    create: async (poll: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const options = poll.options.map((o: any, i: number) => ({ id: `opt-${i}-${Date.now()}`, label: o.label }));
      const { error } = await supabase.from('polls').insert({
        user_id: user?.id,
        question: poll.question,
        classname: poll.className,
        options: options,
        is_active: true,
        end_time: poll.endTime,
        created_at: new Date().toISOString()
      });
      if (error) handleAPIError(error, "Création sondage échouée");
    },
    subscribe: (callback: () => void) => {
      return supabase.channel('poll_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, callback).subscribe();
    }
  },

  classes: {
    list: async (): Promise<ClassGroup[]> => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) return [];
      return (data || []).map(c => ({ id: c.id, name: c.name, email: c.email, studentCount: c.student_count, color: c.color }));
    },
    // Added missing class mutations
    create: async (name: string, email: string, color: string) => {
      const { error } = await supabase.from('classes').insert({ name, email, color });
      if (error) handleAPIError(error, "Création classe échouée");
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('classes').update(updates).eq('id', id);
      if (error) handleAPIError(error, "Mise à jour classe échouée");
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) handleAPIError(error, "Suppression classe échouée");
    }
  },

  logs: {
    list: async (): Promise<ActivityLog[]> => {
      const { data } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(50);
      return data || [];
    }
  },

  settings: {
    getAI: async () => {
      const { data } = await supabase.from('ai_settings').select('*').maybeSingle();
      return { isActive: data?.is_active ?? true, verbosity: data?.verbosity ?? 'medium', tone: data?.tone ?? 'balanced', customInstructions: data?.custom_instructions ?? "Assistant JangHup." };
    }
  },

  favorites: {
    list: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id);
      return data || [];
    },
    toggle: async (contentId: string, contentType: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data: existing } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('content_id', contentId).eq('content_type', contentType).maybeSingle();
      if (existing) { await supabase.from('favorites').delete().eq('id', existing.id); return false; }
      else { await supabase.from('favorites').insert({ user_id: user.id, content_id: contentId, content_type: contentType }); return true; }
    }
  },

  // Added missing interactions service
  interactions: {
    incrementShare: async (type: string, id: string) => {
      // Mock interaction as real DB shares table not available in current schema, logging only for SRE audit.
      console.debug(`[Interaction Audit] Shared ${type}:${id}`);
    }
  },

  // Added missing notifications service
  notifications: {
    list: async (): Promise<AppNotification[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('notifications').select('*').eq('target_user_id', user?.id).order('timestamp', { ascending: false });
      return data || [];
    },
    add: async (notif: any) => {
      const { error } = await supabase.from('notifications').insert({
        title: notif.title,
        message: notif.message,
        type: notif.type,
        target_user_id: notif.targetUserId,
        is_read: false,
        timestamp: new Date().toISOString()
      });
      if (error) handleAPIError(error, "Ajout notification échouée");
    },
    markRead: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    markAllRead: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('notifications').update({ is_read: true }).eq('target_user_id', user?.id);
    },
    clear: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('notifications').delete().eq('target_user_id', user?.id);
    }
  },

  // Added missing grades service
  grades: {
    list: async (userId?: string): Promise<Grade[]> => {
      const targetId = userId || (await supabase.auth.getUser()).data.user?.id;
      const { data } = await supabase.from('grades').select('*').eq('user_id', targetId);
      return data || [];
    }
  },

  // Added missing messaging service
  messaging: {
    list: async (): Promise<DirectMessage[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`).order('timestamp', { ascending: false });
      return data || [];
    },
    send: async (receiverId: string, content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('messages').insert({
        sender_id: user?.id,
        receiver_id: receiverId,
        content,
        timestamp: new Date().toISOString(),
        is_read: false
      });
      if (error) handleAPIError(error, "Envoi message échoué");
    }
  }
};
