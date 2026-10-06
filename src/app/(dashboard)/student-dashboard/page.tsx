import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDashboard from '@/components/dashboard/StudentDashboard'

export default async function StudentDashboardPage() {
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

  if (profile.role?.toLowerCase() === 'alumni') {
    redirect('/alumni-dashboard')
  }

  // Fetch connection requests for stats and recent activity
  const { data: requests } = await supabase
    .from('requests')
    .select(`
      *,
      alumni:profiles!alumni_id(full_name, role, company)
    `)
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <StudentDashboard profile={profile} requests={requests || []} />
  )
}
