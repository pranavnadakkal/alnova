import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifyAlumni } from './actions'
import { CheckCircle2, GraduationCap, ShieldCheck, Users } from 'lucide-react'

type AlumniCandidate = {
  profile_id: string
  full_name: string
  company: string | null
  industry: string | null
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if ((admin as { role?: string } | null)?.role !== 'admin') redirect('/student-dashboard')

  const [
    { count: activeStudents },
    { count: verifiedAlumni },
    { count: successfulSessions },
    { data: unverifiedAlumni, error: alumniError },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('alumni_profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('mentorship_sessions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('alumni_profiles').select('profile_id, company, industry, profiles!inner(full_name)').eq('is_verified', false),
  ])
  if (alumniError) throw alumniError

  const candidates = (unverifiedAlumni || []).map((entry) => {
    const row = entry as unknown as {
      profile_id: string
      company: string | null
      industry: string | null
      profiles: { full_name: string } | { full_name: string }[]
    }
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      profile_id: row.profile_id,
      full_name: profile?.full_name || 'Unnamed alumni',
      company: row.company,
      industry: row.industry,
    } satisfies AlumniCandidate
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Administration</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Verification Portal</h1>
        <p className="mt-2 text-sm text-slate-500">Review alumni profiles and monitor platform health.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Users} label="Active students" value={activeStudents || 0} />
        <Metric icon={ShieldCheck} label="Verified alumni" value={verifiedAlumni || 0} />
        <Metric icon={GraduationCap} label="Successful sessions" value={successfulSessions || 0} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">Alumni awaiting verification</h2>
          <p className="mt-1 text-xs text-slate-500">Verify profiles before they appear as trusted alumni.</p>
        </div>
        {candidates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">All alumni profiles are verified.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {candidates.map((candidate) => (
              <div key={candidate.profile_id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{candidate.full_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[candidate.company, candidate.industry].filter(Boolean).join(' · ') || 'No professional details provided'}
                  </p>
                </div>
                <form action={verifyAlumni.bind(null, candidate.profile_id)}>
                  <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                    Verify alumni
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Icon className="mb-4 h-5 w-5 text-indigo-600" />
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}
