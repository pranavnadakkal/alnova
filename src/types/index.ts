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
