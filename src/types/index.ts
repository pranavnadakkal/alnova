export type UserRole = 'student' | 'alumni' | 'admin'

export interface Profile {
  user_id: string
  full_name: string
  bio?: string
  company?: string
  role?: string
  industry?: string
  tech_skills: string[]
  linkedin_url?: string
  graduation_year?: number
  target_roles?: string[]
  years_of_experience?: number
  open_to_referrals?: boolean
}

export type RequestType = 'mentorship' | 'resume' | 'referral'
export type RequestStatus = 'pending' | 'accepted' | 'completed' | 'declined' | 'reviewing' | 'referred' | 'rejected'

export interface ConnectionRequest {
  id: string
  student_id: string
  alumni_id: string
  type: RequestType
  status: RequestStatus
  message: string
  document_url?: string
  created_at: string
}

export interface Conversation {
  id: string
  student_id: string
  alumni_id: string
  created_at: string
  // Joined fields
  other_profile?: Profile
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
}

export type SessionStatus = 'pending' | 'accepted' | 'completed' | 'declined'

export interface MentorshipSession {
  id: string
  student_id: string
  alumni_id: string
  proposed_date: string
  topic: string
  message?: string
  status: SessionStatus
  created_at: string
  // Joined fields
  alumni_profile?: Profile
  student_profile?: Profile
}

export interface AlumniAvailability {
  id: string
  alumni_id: string
  available_date: string
  start_time: string
  end_time: string
  is_booked: boolean
}
