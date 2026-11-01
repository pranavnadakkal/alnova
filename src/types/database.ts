export type UserRole = 'student' | 'alumni' | 'admin' | 'teacher'
export type RequestStatus = 'pending' | 'accepted' | 'completed' | 'declined'
export type ReferralStatus = 'pending' | 'submitted' | 'referred' | 'declined'
export type ResumeReviewStatus = 'pending' | 'in_review' | 'completed' | 'declined'

export interface User {
  id: string
  email: string
  role: UserRole
  created_at?: string
}

export interface Profile {
  id: string
  user_id?: string
  email?: string
  full_name: string
  avatar_url?: string | null
  role: UserRole
  headline?: string | null
  bio?: string | null
  company?: string | null
  industry?: string | null
  graduation_year?: number | null
  linkedin_url?: string | null
  years_of_experience?: number | null
  open_to_referrals?: boolean
  created_at?: string
  updated_at?: string
}

export interface ConnectionRequest {
  id: string
  student_id: string
  alumni_id: string
  type: 'mentorship' | 'resume' | 'referral'
  status: RequestStatus
  message: string
  document_url?: string | null
  created_at: string
}

export interface StudentProfile {
  id: string
  profile_id: string
  major?: string | null
  graduation_year?: number | null
  target_roles?: string[] | null
  resume_url?: string | null
  created_at?: string
  updated_at?: string
  profile?: Profile
}

export interface AlumniProfile {
  id: string
  profile_id: string
  company?: string | null
  job_title?: string | null
  industry?: string | null
  years_of_experience?: number | null
  open_to_referrals: boolean
  open_to_mentorship?: boolean
  monthly_session_limit?: number
  is_verified?: boolean
  created_at?: string
  updated_at?: string
  profile?: Profile
  skills?: Skill[]
}

export interface TeacherProfile {
  id: string
  profile_id: string
  department?: string | null
  title?: string | null
  is_verified?: boolean
  created_at?: string
  updated_at?: string
  profile?: Profile
}

export interface Announcement {
  id: string
  author_id: string
  title: string
  content: string
  event_date?: string | null
  priority: 'normal' | 'important' | 'urgent'
  created_at: string
  updated_at?: string
  // Joined fields
  author?: Pick<Profile, 'full_name'>
  teacher_details?: Pick<TeacherProfile, 'department' | 'title'>
}

export interface Notification {
  id: string
  user_id: string
  type: string
  content: string
  link?: string | null
  is_read: boolean
  created_at: string
}

export interface Skill {
  id: string
  name: string
  category?: string | null
}

export interface ProfileSkill {
  id?: string
  profile_id: string
  skill_id: string
  skill?: Skill
}

export interface Conversation {
  id: string
  student_id?: string
  alumni_id?: string
  created_at: string
  updated_at?: string
  participants?: ConversationParticipant[]
  other_profile?: Profile
  last_message?: Message
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  profile_id: string
  last_read_at?: string | null
  profile?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read?: boolean
  created_at: string
  sender_profile?: Profile
}

export interface MentorshipSession {
  id: string
  student_id: string
  alumni_id: string
  topic: string
  pitch?: string | null
  message?: string | null
  proposed_date?: string | null
  scheduled_at?: string | null
  status: RequestStatus
  created_at: string
  updated_at?: string
  alumni?: Profile
  student?: Profile
}

export interface ResumeReview {
  id: string
  student_id: string
  alumni_id: string
  resume_url: string
  notes?: string | null
  feedback?: string | null
  status: ResumeReviewStatus
  created_at: string
  updated_at?: string
  alumni?: Profile
  student?: Profile
}

export interface ReferralRequest {
  id: string
  student_id: string
  alumni_id: string
  company: string
  job_title?: string | null
  job_url?: string | null
  resume_url?: string | null
  message?: string | null
  status: ReferralStatus
  created_at: string
  updated_at?: string
  alumni?: Profile
  student?: Profile
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: User
        Update: Partial<User>
      }
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { user_id?: string; id?: string; full_name: string }
        Update: Partial<Profile>
      }
      requests: {
        Row: ConnectionRequest
        Insert: Omit<ConnectionRequest, 'id' | 'created_at' | 'status'> & {
          id?: string
          created_at?: string
          status?: RequestStatus
        }
        Update: Partial<ConnectionRequest>
      }
      student_profiles: {
        Row: StudentProfile
        Insert: Partial<StudentProfile> & { profile_id: string }
        Update: Partial<StudentProfile>
      }
      alumni_profiles: {
        Row: AlumniProfile
        Insert: Partial<AlumniProfile> & { profile_id: string }
        Update: Partial<AlumniProfile>
      }
      skills: {
        Row: Skill
        Insert: Omit<Skill, 'id'> & { id?: string }
        Update: Partial<Skill>
      }
      profile_skills: {
        Row: ProfileSkill
        Insert: ProfileSkill
        Update: Partial<ProfileSkill>
      }
      conversations: {
        Row: Conversation
        Insert: Partial<Conversation>
        Update: Partial<Conversation>
      }
      conversation_participants: {
        Row: ConversationParticipant
        Insert: Partial<ConversationParticipant> & { conversation_id: string; profile_id: string }
        Update: Partial<ConversationParticipant>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Message>
      }
      mentorship_sessions: {
        Row: MentorshipSession
        Insert: Omit<MentorshipSession, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<MentorshipSession>
      }
      resume_reviews: {
        Row: ResumeReview
        Insert: Omit<ResumeReview, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<ResumeReview>
      }
      referral_requests: {
        Row: ReferralRequest
        Insert: Omit<ReferralRequest, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<ReferralRequest>
      }
      teacher_profiles: {
        Row: TeacherProfile
        Insert: Partial<TeacherProfile> & { profile_id: string }
        Update: Partial<TeacherProfile>
      }
      announcements: {
        Row: Announcement
        Insert: Omit<Announcement, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Announcement>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Notification>
      }
    }
  }
}
