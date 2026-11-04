import { redirect } from 'next/navigation'
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server'
import { Query } from 'node-appwrite'
import { verifyAlumni } from './actions'
import { CheckCircle2, GraduationCap, ShieldCheck, Users } from 'lucide-react'

type AlumniCandidate = {
  document_id: string
  profile_id: string
  full_name: string
  company: string | null
  industry: string | null
}

export default async function AdminDashboardPage() {
  let sessionClient
  try {
    sessionClient = await createSessionClient()
  } catch {
    redirect('/login')
  }
  const user = await sessionClient.account.get()
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!

  const adminProfiles = await sessionClient.tablesDB.listRows(
    databaseId,
    'profiles',
    [Query.equal('userId', user.$id)],
  )
  if (adminProfiles.rows[0]?.role !== 'admin') redirect('/student-dashboard')

  const adminClient = createAdminClient()
  const [students, verifiedAlumni, successfulSessions, unverifiedAlumni] = await Promise.all([
    adminClient.tablesDB.listRows(databaseId, 'profiles', [
      Query.equal('role', 'student'),
      Query.limit(1),
    ]),
    adminClient.tablesDB.listRows(databaseId, 'alumni_profiles', [
      Query.equal('isVerified', true),
      Query.limit(1),
    ]),
    adminClient.tablesDB.listRows(databaseId, 'mentorship_sessions', [
      Query.equal('status', 'completed'),
      Query.limit(1),
    ]),
    adminClient.tablesDB.listRows(databaseId, 'alumni_profiles', [
      Query.equal('isVerified', false),
      Query.limit(5000),
    ]),
  ])

  const profileIds = unverifiedAlumni.rows
    .map((alumni) => alumni.profileId)
    .filter((profileId): profileId is string => Boolean(profileId))
  const profileResult = profileIds.length
    ? await adminClient.tablesDB.listRows(databaseId, 'profiles', [
        Query.equal('userId', profileIds),
        Query.limit(5000),
      ])
    : { rows: [] }
  const profileMap = new Map(profileResult.rows.map((profile) => [
    profile.userId || profile.$id,
    profile,
  ]))

  const candidates = unverifiedAlumni.rows.map((alumni) => {
    const profileId = alumni.profileId || alumni.$id
    const profile = profileMap.get(profileId)
    return {
      document_id: alumni.$id,
      profile_id: profileId,
      full_name: profile?.fullName || alumni.fullName || 'Unnamed alumni',
      company: alumni.company || null,
      industry: alumni.industry || null,
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
        <Metric icon={Users} label="Active students" value={students.total} />
        <Metric icon={ShieldCheck} label="Verified alumni" value={verifiedAlumni.total} />
        <Metric icon={GraduationCap} label="Successful sessions" value={successfulSessions.total} />
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
                <form action={verifyAlumni.bind(null, candidate.document_id, candidate.profile_id)}>
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
