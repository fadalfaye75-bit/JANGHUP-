import { supabase } from './supabaseClient';
import { User, Announcement, UserRole, ClassGroup, Exam, Poll, MeetLink, ScheduleSlot, ActivityLog, AppNotification, ScheduleFile, Grade, DirectMessage } from '../types';

export const API = {
  auth: {
    canPost: (u: User | null) => [UserRole.ADMIN, UserRole.DELEGATE].includes(u?.role as UserRole),
    
    login: async (email: string, pass: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (pError) throw pError;
      return profile;
    },

    logout: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    updateProfile: async (id: string, updates: Partial<User>) => {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    updatePassword: async (userId: string, password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },

    getUsers: async (): Promise<User[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      return data || [];
    },

    deleteUser: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    },

    createUser: async (userData: any) => {
      const newId = userData.id || crypto.randomUUID();
      const { data, error } = await supabase.from('profiles').insert([{
        id: newId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        className: userData.className,
        schoolName: userData.schoolName || 'ESP Dakar',
        themeColor: '#87CEEB'
      }]).select().single();
      if (error) throw error;
      return data;
    }
  },

  announcements: {
    list: async (limit = 50): Promise<Announcement[]> => {
      const { data, error } = await supabase.from('announcements').select('*').order('date', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    },
    create: async (ann: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user?.id).single();
      const { error } = await supabase.from('announcements').insert([{ ...ann, user_id: user?.id, author: profile?.name || 'Admin', date: new Date().toISOString() }]);
      if (error) throw error;
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('announcements').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => supabase.from('announcements').delete().eq('id', id),
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('ann_prod').on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, callback).subscribe();
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
      const { error } = await supabase.from('exams').insert([{ ...exam, user_id: user?.id }]);
      if (error) throw error;
    },
    update: async (id: string, exam: any) => {
      const { error } = await supabase.from('exams').update(exam).eq('id', id);
      if (error) throw error;
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
      const { error } = await supabase.from('poll_votes').upsert({ poll_id: pollId, user_id: user?.id, option_id: optionId }, { onConflict: 'poll_id,user_id' });
      if (error) throw error;
    },
    create: async (poll: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: newPoll, error: pError } = await supabase.from('polls').insert([{ question: poll.question, className: poll.className, isActive: true, user_id: user?.id }]).select().single();
      if (pError) throw pError;
      const { error: oError } = await supabase.from('poll_options').insert(poll.options.map((o: any) => ({ poll_id: newPoll.id, label: o.label })));
      if (oError) throw oError;
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('polls').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => supabase.rpc('delete_poll_complete', { p_poll_id: id }),
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('polls_prod').on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, callback).subscribe();
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
      const { error } = await supabase.from('meet_links').insert([{ ...meet, user_id: user?.id }]);
      if (error) throw error;
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('meet_links').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => supabase.from('meet_links').delete().eq('id', id)
  },

  classes: {
    list: async (): Promise<ClassGroup[]> => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    create: async (name: string, email: string, color: string) => {
      const { error } = await supabase.from('classes').insert([{ name, email, color }]);
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

  schedules: {
    list: async (className?: string): Promise<ScheduleFile[]> => {
      let query = supabase.from('schedule_files').select('*').order('created_at', { ascending: false });
      if (className) query = query.eq('className', className);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    getSlots: async (className: string): Promise<ScheduleSlot[]> => {
      const { data, error } = await supabase.from('schedule_slots').select('*').eq('className', className);
      if (error) throw error;
      return data || [];
    },
    saveSlots: async (className: string, slots: ScheduleSlot[]) => {
      const { error: delError } = await supabase.from('schedule_slots').delete().eq('className', className);
      if (delError) throw delError;
      
      if (slots.length > 0) {
        const { error: insError } = await supabase.from('schedule_slots').insert(
          slots.map(s => ({
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            subject: s.subject,
            teacher: s.teacher,
            room: s.room,
            color: s.color,
            className: className
          }))
        );
        if (insError) throw insError;
      }
    },
    uploadFile: async (file: File, className: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `schedule_${className.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('schedules')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('schedules')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('schedule_files').insert([{
        name: file.name,
        url: publicUrl,
        className: className,
        uploaded_by: user?.id
      }]);

      if (dbError) throw dbError;
    },
    deleteFile: async (id: string) => {
      const { error } = await supabase.from('schedule_files').delete().eq('id', id);
      if (error) throw error;
    }
  },

  sharing: {
    whatsapp: (text: string) => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    },
    email: (to: string, subject: string, body: string) => {
      const recipient = to?.trim() ? to : 'administration@esp.sn';
      const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.click();
    }
  },

  notifications: {
    list: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
    markRead: async (id: string) => supabase.from('notifications').update({ is_read: true }).eq('id', id),
    markAllAsRead: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      return supabase.from('notifications').update({ is_read: true }).eq('target_user_id', user?.id);
    },
    clear: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('notifications').delete().eq('target_user_id', user.id);
      if (error) throw error;
    },
    subscribe: (callback: () => void) => {
      const sub = supabase.channel('notif_prod').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, callback).subscribe();
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

  favorites: {
    list: async () => {
      const { data, error } = await supabase.from('favorites').select('*');
      if (error) throw error;
      return data || [];
    },
    toggle: async (contentId: string, contentType: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from('favorites').select('id').eq('user_id', user?.id).eq('content_id', contentId).eq('content_type', contentType).single();
      if (existing) return supabase.from('favorites').delete().eq('id', existing.id);
      return supabase.from('favorites').insert([{ user_id: user?.id, content_id: contentId, content_type: contentType }]);
    }
  },

  grades: {
    list: async (userId?: string): Promise<Grade[]> => {
      const { data, error } = await supabase.from('grades').select('*').eq('user_id', userId);
      if (error) throw error;
      return data || [];
    }
  },

  messaging: {
    list: async (): Promise<DirectMessage[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    send: async (receiverId: string, content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('direct_messages').insert([{
        sender_id: user?.id,
        receiver_id: receiverId,
        content,
        timestamp: new Date().toISOString(),
        is_read: false
      }]);
      if (error) throw error;
    }
  },

  settings: {
    getAI: async () => {
      const { data, error } = await supabase.from('ai_settings').select('*').single();
      if (error) return { isActive: true, verbosity: 'balanced', tone: 'helpful' };
      return data;
    }
  }
};