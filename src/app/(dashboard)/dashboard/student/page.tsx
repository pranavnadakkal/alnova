'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { account, tablesDB } from '@/lib/appwrite/client'
import { Query } from 'appwrite'
import {
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  FileUp,
  Briefcase,
  Sparkles,
  Calendar,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import ResumeReviewModal from '@/components/student/ResumeReviewModal'
import AnnouncementsFeed from '@/components/AnnouncementsFeed'
import { toast } from 'sonner'

export default function StudentDashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Workflows state
  const [mentorshipSessions, setMentorshipSessions] = useState<any[]>([])
  const [resumeReviews, setResumeReviews] = useState<any[]>([])
  const [referralRequests, setReferralRequests] = useState<any[]>([])

  // Modal state
  const [resumeModalOpen, setResumeModalOpen] = useState(false)

  const fetchData = async () => {
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

      const profileResult = await tablesDB.listRows(databaseId, 'profiles', [
        Query.equal('userId', user.$id),
      ])
      const profileDocument = profileResult.rows[0]
      const prof = profileDocument && {
        ...profileDocument,
        id: profileDocument.userId || profileDocument.$id,
        user_id: profileDocument.userId || profileDocument.$id,
        full_name: profileDocument.fullName || profileDocument.full_name,
        avatar_url: profileDocument.avatarUrl || profileDocument.avatar_url,
      }

      if (prof) setProfile(prof)

      // 1. Fetch mentorship_sessions (with fallback to requests table)
      let sessions: any[] = []
      const sessionRows = await tablesDB.listRows(databaseId, 'mentorship_sessions', [
        Query.equal('studentId', user.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(5000),
      ])

      if (sessionRows.rows.length > 0) {
        sessions = sessionRows.rows.map((session) => ({
          ...session,
          id: session.$id,
          student_id: session.studentId,
          alumni_id: session.alumniId,
          created_at: session.$createdAt,
        }))
      } else {
        // Fallback to requests table
        const legacyReqs = await tablesDB.listRows(databaseId, 'requests', [
          Query.equal('studentId', user.$id),
          Query.equal('type', 'mentorship'),
          Query.orderDesc('$createdAt'),
          Query.limit(5000),
        ])
        sessions = legacyReqs.rows.map((request) => ({
            id: request.$id,
            student_id: request.studentId,
            alumni_id: request.alumniId,
            topic: 'Mentorship Session',
            pitch: request.message,
            status: request.status,
            created_at: request.$createdAt,
          }))
      }

      // 2. Fetch resume_reviews (with fallback to requests table)
      let reviews: any[] = []
      const reviewRows = await tablesDB.listRows(databaseId, 'resume_reviews', [
        Query.equal('studentId', user.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(5000),
      ])

      if (reviewRows.rows.length > 0) {
        reviews = reviewRows.rows.map((review) => ({
          ...review,
          id: review.$id,
          student_id: review.studentId,
          alumni_id: review.alumniId,
          resume_url: review.resumeUrl,
          created_at: review.$createdAt,
        }))
      } else {
        const legacyReviews = await tablesDB.listRows(databaseId, 'requests', [
          Query.equal('studentId', user.$id),
          Query.equal('type', 'resume'),
          Query.orderDesc('$createdAt'),
          Query.limit(5000),
        ])
        reviews = legacyReviews.rows.map((request) => ({
          id: request.$id,
          student_id: request.studentId,
          alumni_id: request.alumniId,
          resume_url: request.documentUrl || '#',
          notes: request.message,
          status: request.status,
          created_at: request.$createdAt,
        }))
      }

      // 3. Fetch referral_requests (with fallback to requests table)
      let referrals: any[] = []
      const referralRows = await tablesDB.listRows(databaseId, 'referral_requests', [
        Query.equal('studentId', user.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(5000),
      ])

      if (referralRows.rows.length > 0) {
        referrals = referralRows.rows.map((referral) => ({
          ...referral,
          id: referral.$id,
          student_id: referral.studentId,
          alumni_id: referral.alumniId,
          job_title: referral.jobTitle,
          created_at: referral.$createdAt,
        }))
      } else {
        const legacyRefs = await tablesDB.listRows(databaseId, 'requests', [
          Query.equal('studentId', user.$id),
          Query.equal('type', 'referral'),
          Query.orderDesc('$createdAt'),
          Query.limit(5000),
        ])
        referrals = legacyRefs.rows.map((request) => ({
            id: request.$id,
            student_id: request.studentId,
            alumni_id: request.alumniId,
            company: 'Target Company',
            job_title: 'Role Referral',
            message: request.message,
            status: request.status,
            created_at: request.$createdAt,
          }))
      }

      // Fetch alumni profiles to attach to sessions/reviews/referrals
      const allAlumniIds = Array.from(
        new Set([
          ...sessions.map((s) => s.alumni_id),
          ...reviews.map((r) => r.alumni_id),
          ...referrals.map((r) => r.alumni_id),
        ])
      ).filter(Boolean)

      if (allAlumniIds.length > 0) {
        const [alumniProfiles, alumniExt] = await Promise.all([
          tablesDB.listRows(databaseId, 'profiles', [
            Query.equal('userId', allAlumniIds),
            Query.limit(5000),
          ]),
          tablesDB.listRows(databaseId, 'alumni_profiles', [
            Query.equal('profileId', allAlumniIds),
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

        sessions = sessions.map((s) => ({ ...s, alumni: map.get(s.alumni_id) }))
        reviews = reviews.map((r) => ({ ...r, alumni: map.get(r.alumni_id) }))
        referrals = referrals.map((r) => ({ ...r, alumni: map.get(r.alumni_id) }))
      }

      setMentorshipSessions(sessions)
      setResumeReviews(reviews)
      setReferralRequests(referrals)
    } catch (err) {
      console.error('Error fetching student dashboard data:', err)
      toast.error('Could not load student dashboard metrics.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [router])

  // Computed metrics
  const activeMentorshipsCount = mentorshipSessions.filter(
    (s) => s.status === 'accepted'
  ).length

  const pendingResumeReviewsCount = resumeReviews.filter(
    (r) => r.status === 'pending' || r.status === 'in_review'
  ).length

  const activeReferralsCount = referralRequests.filter(
    (r) => r.status === 'pending' || r.status === 'submitted' || r.status === 'referred'
  ).length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'referred':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            {status}
          </span>
        )
      case 'pending':
      case 'in_review':
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        )
      case 'declined':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        )
      default:
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Header with greeting and welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-600/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            Student Growth Portal • Phase 3
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Scholar'}!
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Track your active mentorship sessions, get resume feedback from verified alumni, and follow your job referral pipeline.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Link href="/alumni">
            <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-md active:scale-95 transition-all text-xs sm:text-sm h-11 px-5 rounded-xl">
              <Users className="w-4 h-4 mr-2" />
              Explore Mentors
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Active Mentorships */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
              Sessions
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {activeMentorshipsCount}
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Active Mentorships
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Total requests: {mentorshipSessions.length}</span>
            <Link href="/requests" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Pending Resume Reviews */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800">
              Reviews
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {pendingResumeReviewsCount}
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Pending Resume Reviews
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Total submissions: {resumeReviews.length}</span>
            <button
              onClick={() => setResumeModalOpen(true)}
              className="text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5"
            >
              Upload PDF <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Referral Pipeline Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800">
              Referrals
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {activeReferralsCount}
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Referral Pipeline Status
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Total referrals: {referralRequests.length}</span>
            <Link href="/requests" className="text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5">
              Pipeline <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Shortcuts */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Find Mentors */}
          <Link
            href="/alumni"
            className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Find Mentors
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Browse verified alumni directory by company, industry & tech stack.
              </p>
            </div>
          </Link>

          {/* Upload Resume */}
          <button
            onClick={() => setResumeModalOpen(true)}
            className="text-left flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Upload Resume
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Submit your PDF resume to an alumnus for an in-depth review.
              </p>
            </div>
          </button>

          {/* Track Referrals */}
          <Link
            href="/requests"
            className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Track Referrals
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Monitor the status of your employee referral submissions.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 3.5. Announcements Feed — full width */}
      <AnnouncementsFeed />

      {/* 4. Active Mentorship Sessions Table & Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentorship Sessions List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Mentorship Sessions & Requests
            </h2>
            <Link href="/alumni" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Request New Session →
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            {mentorshipSessions.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mx-auto mb-3 text-blue-600">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No mentorship sessions yet
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  Connect with alumni mentors in the directory to schedule your first 1-on-1 session.
                </p>
                <Link href="/alumni">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    Find Alumni Mentors
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {mentorshipSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center shrink-0">
                        {session.alumni?.avatar_url ? (
                          <img src={session.alumni.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-blue-700 dark:text-blue-300 font-bold text-xs">
                            {session.alumni?.full_name?.slice(0, 2).toUpperCase() || 'AL'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {session.alumni?.full_name || 'Alumni Mentor'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {session.topic || 'Mentorship Session'}
                          {session.alumni?.company && ` • ${session.alumni.company}`}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Requested {formatDate(session.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusBadge(session.status)}
                      {session.status === 'accepted' ? (
                        <Link href={`/messages?alumniId=${session.alumni_id}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:bg-blue-50">
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            Chat
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Resume Reviews & Referrals (1 col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Resume Reviews
            </h2>
            <button
              onClick={() => setResumeModalOpen(true)}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              + Submit
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm p-4 space-y-3">
            {resumeReviews.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No resume reviews submitted yet.
              </div>
            ) : (
              resumeReviews.slice(0, 3).map((rev) => (
                <div key={rev.id} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {rev.alumni?.full_name ? `Review by ${rev.alumni.full_name}` : 'Resume Review'}
                    </span>
                    {getStatusBadge(rev.status)}
                  </div>
                  {rev.notes && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                      &ldquo;{rev.notes}&rdquo;
                    </p>
                  )}
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/50">
                    <span>{formatDate(rev.created_at)}</span>
                    {rev.resume_url && rev.resume_url !== '#' && (
                      <a
                        href={rev.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        PDF <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Referral Pipeline mini widget */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-2xl border border-purple-200/60 dark:border-purple-800/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Referral Pipeline
              </span>
              <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 dark:text-purple-300">
                {referralRequests.length} active
              </Badge>
            </div>
            <p className="text-xs text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
              Find alumni at your dream companies in the Directory and ask for direct employee referrals.
            </p>
            <Link href="/alumni" className="block pt-1">
              <Button size="sm" variant="outline" className="w-full text-xs h-8 border-purple-300 text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30">
                Browse Companies for Referral
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Resume Review Modal */}
      {userId && (
        <ResumeReviewModal
          isOpen={resumeModalOpen}
          onClose={() => setResumeModalOpen(false)}
          studentId={userId}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
