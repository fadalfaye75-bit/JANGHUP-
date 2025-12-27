
export enum UserRole {
  STUDENT = 'STUDENT',
  DELEGATE = 'DELEGATE',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  classname: string;
  avatar?: string;
  schoolname?: string;
  is_active?: boolean;
  themecolor?: string;
  created_at?: string;
}

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface ExternalLink {
  label: string;
  url: string;
}

export interface Announcement {
  id: string;
  user_id: string;
  title: string;
  content: string;
  author: string;
  email?: string;
  link?: string; // Nouveau champ lien direct
  date: string;
  classname: string;
  priority: AnnouncementPriority;
  links?: ExternalLink[];
  color?: string;
  created_at?: string;
}

export interface Exam {
  id: string;
  subject: string;
  date: string;
  duration: string;
  room: string;
  notes?: string;
  classname: string;
  user_id?: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  classname: string;
  options: PollOption[];
  totalVotes: number;
  isactive: boolean;
  endtime?: string | null;
  user_id: string;
  hasVoted?: boolean;
  userVoteOptionId?: string | null;
}

export interface MeetLink {
  id: string;
  title: string;
  platform: string;
  url: string;
  time: string;
  classname: string;
  user_id: string;
}

export interface ScheduleFile {
  id: string;
  uploaded_by: string;
  url: string;
  classname: string;
  name: string;
  created_at: string;
}

export interface ScheduleSlot {
  id?: string;
  day: number;
  starttime: string;
  endtime: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
  classname: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  type: 'security' | 'action';
}

export interface Grade {
  id: string;
  user_id: string;
  subject: string;
  score: number;
  maxScore: number;
  coefficient: number;
  semester: number;
  comment?: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

export interface ClassGroup {
  id: string;
  name: string;
  email: string;
  studentCount: number;
  color?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: string;
  is_read: boolean;
  target_user_id: string;
}
