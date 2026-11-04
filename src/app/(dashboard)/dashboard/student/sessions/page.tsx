'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { account, tablesDB } from '@/lib/appwrite/client'
import { Query } from 'appwrite'
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageSquare,
  Search,
  ArrowLeft,
  Filter,
  Building2,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function StudentSessionsTrackerPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'declined'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true)
      try {
        let user
        try {
          user = await account.get()
        } catch {
          router.push('/login')
          return
        }
        setUserId(user.$id)
        const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!

        // 1. Fetch from mentorship_sessions
        let sessionList: any[] = []
        const rows = await tablesDB.listRows(databaseId, 'mentorship_sessions', [
          Query.equal('studentId', user.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(5000),
        ])

        if (rows.rows.length > 0) {
          sessionList = rows.rows.map((session) => ({
            ...session,
            id: session.$id,
            student_id: session.studentId,
            alumni_id: session.alumniId,
            created_at: session.$createdAt,
          }))
        } else {
          // Fallback to requests table
          const legacy = await tablesDB.listRows(databaseId, 'requests', [
            Query.equal('studentId', user.$id),
            Query.equal('type', 'mentorship'),
            Query.orderDesc('$createdAt'),
            Query.limit(5000),
          ])
          sessionList = legacy.rows.map((request) => ({
              id: request.$id,
              student_id: request.studentId,
              alumni_id: request.alumniId,
              topic: 'Mentorship Session',
              pitch: request.message,
              status: request.status,
              created_at: request.$createdAt,
            }))
        }

        // Attach alumni profiles
        const alumniIds = Array.from(new Set(sessionList.map((s) => s.alumni_id))).filter(Boolean)
        if (alumniIds.length > 0) {
          const [alumniProfiles, alumniExt] = await Promise.all([
            tablesDB.listRows(databaseId, 'profiles', [
              Query.equal('userId', alumniIds),
              Query.limit(5000),
            ]),
            tablesDB.listRows(databaseId, 'alumni_profiles', [
              Query.equal('profileId', alumniIds),
              Query.limit(5000),
            ]),
          ])

          const extMap = new Map(alumniExt.rows.map((extension) => [extension.profileId, extension]))
          const map = new Map(
            alumniProfiles.rows.map((profile) => {
              const profileId = profile.userId || profile.$id
              const ext = extMap.get(profileId)
              return [
                profileId,
                {
                  ...profile,
                  id: profileId,
                  user_id: profileId,
                  full_name: profile.fullName || profile.full_name,
                  avatar_url: profile.avatarUrl || profile.avatar_url,
                  company: ext?.company || null,
                  role: ext?.jobTitle || profile.headline || profile.role,
                  industry: ext?.industry || null,
                },
              ]
            })
          )
          sessionList = sessionList.map((s) => ({ ...s, alumni: map.get(s.alumni_id) }))
        }

        setSessions(sessionList)
      } catch (err) {
        console.error('Error loading sessions tracker:', err)
        toast.error('Could not load session requests.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSessions()
  }, [router])

  const filteredSessions = sessions.filter((s) => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    const term = searchQuery.toLowerCase()
    const matchName = s.alumni?.full_name?.toLowerCase().includes(term)
    const matchCompany = s.alumni?.company?.toLowerCase().includes(term)
    const matchTopic = s.topic?.toLowerCase().includes(term)
    const matchPitch = s.pitch?.toLowerCase().includes(term)
    return matchStatus && (!term || matchName || matchCompany || matchTopic || matchPitch)
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status}
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        )
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3.5 h-3.5" />
            Declined
          </span>
        )
      default:
        return (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {status}
          </span>
        )
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mentorship Session Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor the status of your 1-on-1 mentorship session requests.
          </p>
        </div>

        <Link href="/alumni">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium text-xs sm:text-sm">
            <GraduationCap className="w-4 h-4 mr-2" />
            Find More Mentors
          </Button>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by mentor name, company, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', 'pending', 'accepted', 'completed', 'declined'] as const).map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={`h-11 px-4 text-xs font-semibold capitalize whitespace-nowrap rounded-xl transition-all ${
                filterStatus === status
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Sessions Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mx-auto mb-3 text-blue-600">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {sessions.length === 0 ? 'No session requests found' : 'No matching sessions'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            {sessions.length === 0
              ? 'Browse the alumni directory and request a session with a mentor in your domain.'
              : 'Try clearing your search query or changing the status filter.'}
          </p>
          {sessions.length === 0 && (
            <Link href="/alumni">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                Explore Alumni Directory
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center shrink-0 shadow-sm">
                  {session.alumni?.avatar_url ? (
                    <img src={session.alumni.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">
                      {session.alumni?.full_name?.slice(0, 2).toUpperCase() || 'AL'}
                    </span>
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {session.alumni?.full_name || 'Alumni Mentor'}
                    </h3>
                    {session.alumni?.company && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {session.alumni.company}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {session.topic || 'Mentorship Focus'}
                  </div>

                  {session.pitch && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      &ldquo;{session.pitch}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span>Requested: {formatDate(session.created_at)}</span>
                    {session.proposed_date && (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                        <Calendar className="w-3 h-3 text-blue-500" />
                        Proposed: {formatDate(session.proposed_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                {getStatusBadge(session.status)}

                {session.status === 'accepted' ? (
                  <Link href={`/messages?alumniId=${session.alumni_id}`}>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Open Chat
                    </Button>
                  </Link>
                ) : session.status === 'pending' ? (
                  <span className="text-[11px] text-slate-400">Awaiting mentor acceptance</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
