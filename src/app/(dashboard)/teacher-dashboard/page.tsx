'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { account, tablesDB } from '@/lib/appwrite/client'
import { Query } from 'appwrite'
import { Award, Clock3, Handshake, TrendingUp, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type RequestRow = {
  student_id: string
  alumni_id: string
  status: string
}

type AlumniRow = {
  id: string
  full_name: string
  company?: string | null
  role?: string | null
  industry?: string | null
  avatar_url?: string | null
}

type AlumniPerformance = AlumniRow & {
  associatedStudents: number
  activeConnections: number
  completedConnections: number
  totalRequests: number
  score: number
}

const activeStatuses = new Set(['accepted', 'reviewing', 'referred'])

function getScore(performance: Omit<AlumniPerformance, 'score'>) {
  return performance.associatedStudents * 10
    + performance.activeConnections * 5
    + performance.completedConnections * 15
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const [alumni, setAlumni] = useState<AlumniPerformance[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [associatedStudentCount, setAssociatedStudentCount] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)
      let user
      try {
        user = await account.get()
      } catch {
        router.push('/login')
        return
      }
      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!

      const profileResult = await tablesDB.listRows(databaseId, 'profiles', [
        Query.equal('userId', user.$id),
      ])
      const role = profileResult.rows[0]?.role
      if (role !== 'teacher') {
        router.push('/student-dashboard')
        return
      }

      const [studentsResult, alumniResult, requestsResult] = await Promise.all([
        tablesDB.listRows(databaseId, 'profiles', [
          Query.equal('role', 'student'),
          Query.limit(1),
        ]),
        tablesDB.listRows(databaseId, 'profiles', [
          Query.equal('role', 'alumni'),
          Query.limit(5000),
        ]),
        tablesDB.listRows(databaseId, 'requests', [Query.limit(5000)]),
      ])

      const alumniUsers = alumniResult.rows.map((profile) => ({
        id: profile.userId || profile.$id,
        full_name: profile.fullName || 'Alumni member',
        role: profile.role,
        avatar_url: profile.avatarUrl || null,
        company: profile.company || null,
        industry: profile.industry || null,
      }))
      const requestData = requestsResult.rows.map((request) => ({
        id: request.$id,
        student_id: request.studentId,
        alumni_id: request.alumniId,
        status: request.status || 'pending',
      }))

      const profileMap = new Map(
        alumniUsers.map((entry) => [entry.id, entry])
      )
      const requests = requestData as RequestRow[]
      const performances = alumniUsers.map(({ id }) => {
        const alumniRequests = requests.filter((request) => request.alumni_id === id)
        const associatedStudents = new Set(
          alumniRequests
            .filter((request) => activeStatuses.has(request.status) || request.status === 'completed')
            .map((request) => request.student_id)
        ).size
        const activeConnections = new Set(
          alumniRequests
            .filter((request) => activeStatuses.has(request.status))
            .map((request) => request.student_id)
        ).size
        const completedConnections = new Set(
          alumniRequests
            .filter((request) => request.status === 'completed')
            .map((request) => request.student_id)
        ).size
        const base = {
          ...(profileMap.get(id) || { id, full_name: 'Alumni member' }),
          associatedStudents,
          activeConnections,
          completedConnections,
          totalRequests: alumniRequests.length,
        }
        return { ...base, score: getScore(base) }
      }).sort((a, b) => b.score - a.score || b.associatedStudents - a.associatedStudents)

      setTotalStudents(studentsResult.total)
      setAssociatedStudentCount(new Set(
        requests
          .filter((request) => activeStatuses.has(request.status) || request.status === 'completed')
          .map((request) => request.student_id)
      ).size)
      setPendingRequests(requests.filter((request) => request.status === 'pending').length)
      setAlumni(performances)
    }

    loadDashboard()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.'))
      .finally(() => setIsLoading(false))
  }, [router])

  if (isLoading) {
    return <div className="mx-auto h-64 max-w-6xl animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
  }

  if (error) {
    return <p className="text-red-600">Could not load dashboard: {error}</p>
  }

  const topAlumni = alumni[0]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Teacher insights</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Alumni Performance</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          See which alumni are creating the most student connections and how many students each alumni supports.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={Users} label="Registered students" value={totalStudents} color="blue" />
        <SummaryCard icon={Handshake} label="Associated students" value={associatedStudentCount} color="emerald" />
        <SummaryCard icon={Clock3} label="Pending requests" value={pendingRequests} color="amber" />
      </section>

      {topAlumni && (
        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white shadow-lg shadow-indigo-600/20">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">Top performing alumni</p>
              <h2 className="mt-1 text-xl font-bold">{topAlumni.full_name}</h2>
              <p className="mt-1 text-sm text-indigo-100">
                {topAlumni.associatedStudents} associated student{topAlumni.associatedStudents === 1 ? '' : 's'} · {topAlumni.completedConnections} completed connection{topAlumni.completedConnections === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900 dark:text-white">Alumni leaderboard</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Ranked by associated students, active connections, and completed connections.</p>
        </div>
        {alumni.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">No alumni have registered yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {alumni.map((entry, index) => (
              <div key={entry.id} className="grid gap-4 px-6 py-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center">
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-sm font-bold text-slate-400">#{index + 1}</span>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                      {entry.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{entry.full_name}</p>
                    <p className="truncate text-xs text-slate-500">{entry.role || entry.company || entry.industry || 'Alumni'}</p>
                  </div>
                </div>
                <Metric label="Students" value={entry.associatedStudents} />
                <Metric label="Active" value={entry.activeConnections} />
                <Metric label="Completed" value={entry.completedConnections} />
                <div className="text-left md:text-right">
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{entry.score}</p>
                  <p className="text-[11px] text-slate-500">performance score</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-${color}-50 text-${color}-600 dark:bg-${color}-950/40 dark:text-${color}-400`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  )
}
