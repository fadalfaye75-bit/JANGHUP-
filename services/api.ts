
import { supabase } from './supabaseClient';
import { User, Announcement, UserRole, ClassGroup, Exam, Poll, MeetLink, ScheduleSlot, ActivityLog, AppNotification, ScheduleFile } from '../types';

export const API = {
  auth: {
    canPost: (u: User | null) => {
      if (!u) return false;
      const role = String(u.role).toUpperCase();
      return role === 'ADMIN' || role === 'DELEGATE';
    },
    
    login: async (email: string, pass: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (pError) throw pError;
      return profile;
    },

    logout: async () => supabase.auth.signOut(),

    getUsers: async (): Promise<User[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      return data || [];
    },

    createUser: async (userData: any) => {
      const { data, error } = await supabase.from('profiles').insert([{
        id: crypto.randomUUID(),
        name: userData.name,
        email: userData.email,
        role: userData.role,
        classname: userData.classname,
        schoolname: userData.schoolname || 'ESP Dakar',
        themecolor: '#87CEEB'
      }]).select().single();
      if (error) throw error;
      return data;
    },

    updateProfile: async (id: string, updates: Partial<User>) => {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    // Added updatePassword to fix error in Profile.tsx
    updatePassword: async (id: string, pass: string) => {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) throw error;
      return true;
    },

    deleteUser: async (id: string) => supabase.from('profiles').delete().eq('id', id)
  },

  announcements: {
    list: async (limit = 50): Promise<Announcement[]> => {
      const { data, error } = await supabase.from('announcements').select('*').order('date', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    },
    create: async (ann: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', user?.id).single();
      return supabase.from('announcements').insert([{ 
        ...ann, 
        user_id: user?.id, 
        author: profile?.name || 'Admin', 
        email: profile?.email || '',
        date: new Date().toISOString() 
      }]);
    },
    // Added update to fix error in Announcements.tsx
    update: async (id: string, ann: any) => {
      return supabase.from('announcements').update(ann).eq('id', id);
    },
    delete: async (id: string) => supabase.from('announcements').delete().eq('id', id),
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('ann_channel').on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, callback).subscribe();
      return { unsubscribe: () => { supabase.removeChannel(sub); } };
    }
  },

  exams: {
    list: async (): Promise<Exam[]> => {
      const { data, error } = await supabase.from('exams').select('*').order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    create: async (exam: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      return supabase.from('exams').insert([{ ...exam, user_id: user?.id }]);
    },
    // Added update to fix error in Exams.tsx
    update: async (id: string, exam: any) => {
      return supabase.from('exams').update(exam).eq('id', id);
    },
    delete: async (id: string) => supabase.from('exams').delete().eq('id', id)
  },

  polls: {
    list: async (): Promise<Poll[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('polls').select('*, poll_options(*), poll_votes(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        totalVotes: p.poll_votes?.length || 0,
        hasVoted: p.poll_votes?.some((v: any) => v.user_id === user?.id),
        userVoteOptionId: p.poll_votes?.find((v: any) => v.user_id === user?.id)?.option_id,
        options: p.poll_options.map((o: any) => ({ ...o, votes: p.poll_votes?.filter((v: any) => v.option_id === o.id).length || 0 }))
      }));
    },
    vote: async (pollId: string, optionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      return supabase.from('poll_votes').upsert({ poll_id: pollId, user_id: user?.id, option_id: optionId }, { onConflict: 'poll_id,user_id' });
    },
    create: async (poll: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: newPoll, error: pError } = await supabase.from('polls').insert([{ question: poll.question, classname: poll.classname, isactive: true, user_id: user?.id }]).select().single();
      if (pError) throw pError;
      return supabase.from('poll_options').insert(poll.options.map((o: any) => ({ poll_id: newPoll.id, label: o.label })));
    },
    // Added update to fix error in Polls.tsx
    update: async (id: string, updates: any) => {
      return supabase.from('polls').update(updates).eq('id', id);
    },
    delete: async (id: string) => supabase.rpc('delete_poll_complete', { p_poll_id: id }),
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('polls_channel').on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, callback).subscribe();
      return { unsubscribe: () => { supabase.removeChannel(sub); } };
    }
  },

  meet: {
    list: async (): Promise<MeetLink[]> => {
      const { data, error } = await supabase.from('meet_links').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (meet: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      return supabase.from('meet_links').insert([{ ...meet, user_id: user?.id }]);
    },
    // Added update to fix error in Meet.tsx
    update: async (id: string, meet: any) => {
      return supabase.from('meet_links').update(meet).eq('id', id);
    },
    delete: async (id: string) => supabase.from('meet_links').delete().eq('id', id)
  },

  classes: {
    list: async (): Promise<ClassGroup[]> => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    create: async (name: string, color: string) => supabase.from('classes').insert([{ name, color }]),
    // Added update to fix error in AdminPanel.tsx
    update: async (id: string, updates: any) => {
      return supabase.from('classes').update(updates).eq('id', id);
    },
    delete: async (id: string) => supabase.from('classes').delete().eq('id', id)
  },

  schedules: {
    // Added list to fix error in Profile.tsx
    list: async (): Promise<ScheduleFile[]> => {
      const { data, error } = await supabase.from('schedule_files').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getSlots: async (classname: string): Promise<ScheduleSlot[]> => {
      const { data, error } = await supabase.from('schedule_slots').select('*').eq('classname', classname);
      if (error) throw error;
      return data || [];
    },
    saveSlots: async (classname: string, slots: ScheduleSlot[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('schedule_slots').delete().eq('classname', classname);
      if (slots.length > 0) {
        return supabase.from('schedule_slots').insert(slots.map(s => ({
          ...s, classname, last_modified_by: user?.id
        })));
      }
    }
  },

  sharing: {
    whatsapp: (text: string) => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  },

  notifications: {
    list: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
    markRead: async (id: string) => supabase.from('notifications').update({ is_read: true }).eq('id', id),
    // Added markAllAsRead to fix error in NotificationContext.tsx
    markAllAsRead: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return supabase.from('notifications').update({ is_read: true }).eq('target_user_id', user?.id).eq('is_read', false);
    },
    clear: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return supabase.from('notifications').delete().eq('target_user_id', user?.id);
    },
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('notif_channel').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, callback).subscribe();
      return { unsubscribe: () => { supabase.removeChannel(sub); } };
    }
  },

  logs: {
    list: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
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

  // Added favorites to fix error in Profile.tsx
  favorites: {
    list: async (): Promise<any[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('favorites').select('*').eq('user_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    toggle: async (contentId: string, contentType: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from('favorites').select('*').eq('user_id', user?.id).eq('content_id', contentId).eq('content_type', contentType).single();
      if (existing) {
        return supabase.from('favorites').delete().eq('id', existing.id);
      } else {
        return supabase.from('favorites').insert([{ user_id: user?.id, content_id: contentId, content_type: contentType }]);
      }
    }
  }
};
