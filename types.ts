
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
  className: string;
  avatar?: string;
  schoolName?: string;
  isActive?: boolean;
  themeColor?: string;
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
  date: string;
  className: string;
  priority: AnnouncementPriority;
  links?: ExternalLink[];
  color?: string;
  created_at?: string;
}

/* Added missing Exam interface */
export interface Exam {
  id: string;
  subject: string;
  date: string;
  duration: string;
  room: string;
  notes?: string;
  className: string;
  user_id?: string;
}

/* Added missing Poll interfaces */
export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  className: string;
  options: PollOption[];
  totalVotes: number;
  isActive: boolean;
  endTime?: string | null;
  user_id: string;
  hasVoted?: boolean;
  userVoteOptionId?: string | null;
}

/* Added missing MeetLink interface */
export interface MeetLink {
  id: string;
  title: string;
  platform: string;
  url: string;
  time: string;
  className: string;
  user_id: string;
}

/* Added missing Schedule types */
export interface ScheduleFile {
  id: string;
  user_id: string;
  url: string;
  version: string;
  category: string;
  className: string;
  uploadDate: string;
}

export interface ScheduleSlot {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
  classname: string;
}

/* Added missing ActivityLog interface */
export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  type: 'security' | 'action';
}

/* Added missing Grade interface */
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

/* Added missing DirectMessage interface */
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
