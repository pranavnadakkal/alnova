import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AlumniDashboard from '@/components/dashboard/AlumniDashboard'

export default async function AlumniDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Prefer the deployed legacy key, then support the standardized schema.
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    profile = (await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()).data
  }

  if (!profile) {
    redirect('/onboarding')
  }

  const isStudent = profile.role?.toLowerCase() === 'student' || profile.role === null

  if (isStudent) {
    redirect('/student-dashboard')
  }

  // Fetch connection requests for stats and recent activity
  const { data: requests, error: requestsError } = await supabase
    .from('requests')
    .select('*')
    .eq('alumni_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const studentIds = (requests || []).map((request) => request.student_id).filter(Boolean)
  const { data: students } = studentIds.length
    ? await supabase.from('profiles').select('*').in('id', studentIds)
    : { data: [] }
  const studentMap = new Map((students || []).map((student) => [student.user_id || student.id, student]))
  const enrichedRequests = (requests || []).map((request) => ({
    ...request,
    student: studentMap.get(request.student_id) || null,
    status: request.status || 'pending',
  }))

  return <AlumniDashboard profile={profile} requests={requestsError ? [] : enrichedRequests} />
}
