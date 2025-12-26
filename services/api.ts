
import { supabase } from './supabaseClient';
import { User, Announcement, UserRole, ClassGroup, Exam, Poll, MeetLink, ScheduleFile, ScheduleSlot, ActivityLog, Grade, DirectMessage, AppNotification } from '../types';

export const API = {
  auth: {
    canPost: (u: User | null) => [UserRole.ADMIN, UserRole.DELEGATE].includes(u?.role as UserRole),
    canEdit: (u: User | null, item: any) => u?.role === UserRole.ADMIN || (u?.id === item.user_id),
    canDelete: (u: User | null) => u?.role === UserRole.ADMIN,

    login: async (email: string, pass: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      
      let profile = null;
      for (let i = 0; i < 5; i++) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (p) { profile = p; break; }
        await new Promise(res => setTimeout(res, 800));
      }
      
      if (!profile) throw new Error("Profil introuvable. Veuillez recharger la page.");
      return profile;
    },

    logout: async () => {
      await supabase.auth.signOut();
    },

    createUser: async (userData: any) => {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            className: userData.className,
            schoolName: userData.schoolName
          }
        }
      });
      if (error) throw error;
      return data;
    },

    updateProfile: async (id: string, updates: Partial<User>) => {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    getUsers: async (): Promise<User[]> => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data || [];
    },

    deleteUser: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    },

    updatePassword: async (id: string, pass: string) => {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) throw error;
      return { success: true };
    }
  },

  announcements: {
    list: async (page = 0, size = 50): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false })
        .range(page * size, (page + 1) * size - 1);
      if (error) throw error;
      return data || [];
    },
    create: async (ann: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user?.id).single();
      const { error } = await supabase.from('announcements').insert([{
        ...ann,
        user_id: user?.id,
        author: profile?.name || 'Administrateur',
        date: new Date().toISOString()
      }]);
      if (error) throw error;
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('announcements').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('ann_changes').on('postgres_changes', { event: '*', table: 'announcements' }, callback).subscribe();
      return { unsubscribe: () => supabase.removeChannel(sub) };
    }
  },

  exams: {
    list: async (): Promise<Exam[]> => {
      const { data, error } = await supabase.from('exams').select('*').order('date');
      if (error) throw error;
      return data || [];
    },
    create: async (exam: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { className, ...rest } = exam;
      const { error } = await supabase.from('exams').insert([{ ...rest, className, user_id: user?.id }]);
      if (error) throw error;
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('exams').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
    }
  },

  polls: {
    list: async (): Promise<Poll[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select('*, poll_options(*), poll_votes(*)')
        .order('created_at', { ascending: false });
      
      if (pollsError) throw pollsError;

      return (pollsData || []).map(p => {
        const userVote = p.poll_votes?.find((v: any) => v.user_id === user?.id);
        const options = p.poll_options.map((o: any) => ({
          ...o,
          votes: p.poll_votes?.filter((v: any) => v.option_id === o.id).length || 0
        }));

        return {
          id: p.id,
          question: p.question,
          className: p.className,
          isActive: p.isActive,
          endTime: p.endTime,
          user_id: p.user_id,
          totalVotes: p.poll_votes?.length || 0,
          hasVoted: !!userVote,
          userVoteOptionId: userVote?.option_id || null,
          options
        };
      });
    },
    vote: async (pollId: string, optionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentification requise pour voter.");

      const { error } = await supabase.from('poll_votes').upsert({
        poll_id: pollId,
        user_id: user.id,
        option_id: optionId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'poll_id,user_id' });

      if (error) throw error;
      return { success: true };
    },
    create: async (poll: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: newPoll, error: pollError } = await supabase.from('polls').insert([{
        question: poll.question,
        className: poll.className,
        isActive: true,
        endTime: poll.endTime,
        user_id: user?.id
      }]).select().single();

      if (pollError) throw pollError;

      const options = poll.options.map((o: any) => ({ poll_id: newPoll.id, label: o.label }));
      const { error: optError } = await supabase.from('poll_options').insert(options);
      
      if (optError) throw optError;
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('polls').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.rpc('delete_poll_complete', { p_poll_id: id });
      if (error) throw error;
    },
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('polls_realtime_v3')
        .on('postgres_changes', { event: '*', table: 'polls' }, callback)
        .on('postgres_changes', { event: '*', table: 'poll_votes' }, callback)
        .subscribe();
      return { unsubscribe: () => supabase.removeChannel(sub) };
    }
  },

  classes: {
    list: async (): Promise<ClassGroup[]> => {
      const { data } = await supabase.from('classes').select('*').order('name');
      return data || [];
    },
    create: async (name: string, email: string, color: string) => {
      const { error } = await supabase.from('classes').insert([{ name, email, color, studentCount: 0 }]);
      if (error) throw error;
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('classes').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
    }
  },

  notifications: {
    list: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    markRead: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    markAllAsRead: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('notifications').update({ is_read: true }).eq('target_user_id', user.id).eq('is_read', false);
    },
    clear: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('notifications').delete().eq('target_user_id', user.id);
    },
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('notif_realtime_v2')
        .on('postgres_changes', { event: 'INSERT', table: 'notifications' }, callback)
        .subscribe();
      return { unsubscribe: () => supabase.removeChannel(sub) };
    }
  },

  schedules: {
    list: async (): Promise<ScheduleFile[]> => {
      const { data, error } = await supabase.from('schedule_files').select('*').order('uploadDate', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getSlots: async (className: string): Promise<ScheduleSlot[]> => {
      const { data, error } = await supabase.from('schedule_slots').select('*').eq('classname', className);
      if (error) throw error;
      return data || [];
    },
    saveSlots: async (className: string, slots: ScheduleSlot[]) => {
      const { error: delError } = await supabase.from('schedule_slots').delete().eq('classname', className);
      if (delError) throw delError;
      if (slots.length > 0) {
        const { error: insError } = await supabase.from('schedule_slots').insert(slots.map(({ id, ...rest }) => rest));
        if (insError) throw insError;
      }
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
      const { error } = await supabase.from('meet_links').insert([{ ...meet, user_id: user?.id }]);
      if (error) throw error;
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('meet_links').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('meet_links').delete().eq('id', id);
      if (error) throw error;
    }
  },

  favorites: {
    list: async (): Promise<any[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('favorites').select('*').eq('user_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    toggle: async (contentId: string, contentType: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from('favorites').select('*').eq('user_id', user?.id).eq('content_id', contentId).single();
      if (existing) {
        await supabase.from('favorites').delete().eq('id', existing.id);
      } else {
        await supabase.from('favorites').insert([{ user_id: user?.id, content_id: contentId, content_type: contentType }]);
      }
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
      return {
        isActive: true,
        verbosity: 'medium',
        tone: 'friendly',
        customInstructions: "Tu es l'assistant IA de JangHup."
      };
    }
  },

  grades: {
    list: async (userId?: string): Promise<Grade[]> => {
      const { data, error } = await supabase.from('grades').select('*').eq('user_id', userId).order('semester');
      if (error) throw error;
      return data || [];
    }
  },

  messaging: {
    list: async (): Promise<DirectMessage[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    send: async (receiverId: string, content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('messages').insert([{
        sender_id: user?.id,
        receiver_id: receiverId,
        content,
        timestamp: new Date().toISOString(),
        is_read: false
      }]);
      if (error) throw error;
    }
  },

  sharing: {
    whatsapp: (text: string) => {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    },
    email: (to: string, subject: string, body: string) => {
      const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = url;
    }
  }
};
