import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDashboard from '@/components/dashboard/StudentDashboard'
import AlumniDashboard from '@/components/dashboard/AlumniDashboard'

export default async function DashboardIndex() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const isStudent = profile.role?.toLowerCase() === 'student' || profile.role === null

  // Fetch connection requests for stats and recent activity
  const idColumn = isStudent ? 'student_id' : 'alumni_id'
  
  const { data: requests } = await supabase
    .from('connection_requests')
    .select(`
      *,
      student:profiles!student_id(full_name, role, company),
      alumni:profiles!alumni_id(full_name, role, company)
    `)
    .eq(idColumn, user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return isStudent ? (
    <StudentDashboard profile={profile} requests={requests || []} />
  ) : (
    <AlumniDashboard profile={profile} requests={requests || []} />
  )
}
