import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AlumniDashboard from '@/components/dashboard/AlumniDashboard'

export default async function AlumniDashboardPage() {
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

  if (isStudent) {
    redirect('/student-dashboard')
  }

  // Fetch connection requests for stats and recent activity
  const { data: requests } = await supabase
    .from('requests')
    .select(`
      *,
      student:profiles!student_id(full_name, role, company)
    `)
    .eq('alumni_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <AlumniDashboard profile={profile} requests={requests || []} />
  )
}
