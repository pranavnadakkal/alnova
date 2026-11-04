'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { account, tablesDB } from '@/lib/appwrite/client'
import { ID, Query } from 'appwrite'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Profile, ConnectionRequest } from '@/types'
import {
  Loader2, Search, MessageSquare, User, Briefcase, GraduationCap,
  MapPin, Code2, Link as LinkIcon, Calendar, Clock, ChevronRight,
  Users, Filter, Eye, Mail, Building2, CheckCircle2, ArrowUpRight, X
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type AlumniProfile = Profile & { tech_skills?: string[]; users?: { role: string } }

type ConnectedStudent = {
  profile: Profile & { tech_skills?: string[] }
  request: ConnectionRequest
}

export default function DirectoryPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<'student' | 'alumni' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Student-specific state (alumni directory)
  const [alumni, setAlumni] = useState<AlumniProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAlumniId, setSelectedAlumniId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [requestType, setRequestType] = useState<'mentorship' | 'referral'>('mentorship')
  const [myRequests, setMyRequests] = useState<ConnectionRequest[]>([])

  // Alumni-specific state (student directory)
  const [connectedStudents, setConnectedStudents] = useState<ConnectedStudent[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'mentorship' | 'referral' | 'resume'>('all')
  const [selectedStudent, setSelectedStudent] = useState<ConnectedStudent | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  // Helper to get student's request status for a specific alumni
  const getRequestForAlumni = (alumniId: string, type: 'mentorship' | 'referral') => {
    return myRequests.find((r) => r.alumni_id === alumniId && r.type === type)
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        let user
        try {
          user = await account.get()
        } catch {
          router.push('/login')
          return
        }
        const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
        setUserId(user.$id)

        const ownProfiles = await tablesDB.listRows(databaseId, 'profiles', [
          Query.equal('userId', user.$id),
        ])
        const currentRole = ownProfiles.rows[0]?.role as 'student' | 'alumni' | undefined
        if (currentRole !== 'student' && currentRole !== 'alumni') {
          throw new Error('Your account role is not set.')
        }
        setUserRole(currentRole)

        if (currentRole === 'student') {
          // Fetch alumni directory for students
          const alumniProfiles = await tablesDB.listRows(databaseId, 'profiles', [
            Query.equal('role', 'alumni'),
            Query.limit(5000),
          ])
          const alumniIds = alumniProfiles.rows.map((profile) => profile.userId || profile.$id)
          const [alumniDetails, profileSkills, skills] = await Promise.all([
            alumniIds.length
              ? tablesDB.listRows(databaseId, 'alumni_profiles', [
                  Query.equal('profileId', alumniIds),
                  Query.limit(5000),
                ])
              : Promise.resolve({ rows: [] }),
            alumniIds.length
              ? tablesDB.listRows(databaseId, 'profile_skills', [
                  Query.equal('profileId', alumniIds),
                  Query.limit(5000),
                ])
              : Promise.resolve({ rows: [] }),
            tablesDB.listRows(databaseId, 'skills', [Query.limit(5000)]),
          ])
          const detailMap = new Map(alumniDetails.rows.map((detail) => [detail.profileId, detail]))
          const skillNames = new Map(skills.rows.map((skill) => [skill.$id, skill.name]))
          const skillsByProfile = new Map<string, string[]>()
          profileSkills.rows.forEach((link) => {
            const names = skillsByProfile.get(link.profileId) || []
            const name = skillNames.get(link.skillId)
            if (name) names.push(name)
            skillsByProfile.set(link.profileId, names)
          })
          setAlumni(alumniProfiles.rows.map((profile) => ({
            id: profile.$id,
            user_id: profile.userId || profile.$id,
            email: profile.email || '',
            full_name: profile.fullName || 'Alumni member',
            avatar_url: profile.avatarUrl || null,
            role: 'alumni',
            headline: profile.headline || detailMap.get(profile.userId || profile.$id)?.jobTitle || null,
            bio: profile.bio || null,
            company: detailMap.get(profile.userId || profile.$id)?.company || profile.company || null,
            industry: detailMap.get(profile.userId || profile.$id)?.industry || profile.industry || null,
            linkedin_url: profile.linkedInUrl || null,
            years_of_experience: detailMap.get(profile.userId || profile.$id)?.yearsOfExperience || null,
            open_to_referrals: detailMap.get(profile.userId || profile.$id)?.openToReferrals ?? true,
            tech_skills: skillsByProfile.get(profile.userId || profile.$id) || [],
            created_at: profile.$createdAt,
          } as Profile & { users?: { role: string } })))

          // Fetch student's existing connection requests
          const existingRequests = await tablesDB.listRows(databaseId, 'requests', [
            Query.equal('studentId', user.$id),
            Query.limit(5000),
          ])
          setMyRequests(existingRequests.rows.map((request) => ({
            id: request.$id,
            student_id: request.studentId,
            alumni_id: request.alumniId,
            type: request.type,
            status: request.status || 'pending',
            message: request.message || '',
            document_url: request.documentUrl || null,
            created_at: request.$createdAt,
          } as ConnectionRequest)))
        } else if (currentRole === 'alumni') {
          // Fetch connected students for alumni
          const requestResult = await tablesDB.listRows(databaseId, 'requests', [
            Query.equal('alumniId', user.$id),
            Query.limit(5000),
          ])
          const allowedStatuses = new Set(['accepted', 'completed', 'reviewing', 'referred', 'pending'])
          const requests = requestResult.rows
            .filter((request) => allowedStatuses.has(request.status || 'pending'))
            .map((request) => ({
              id: request.$id,
              student_id: request.studentId,
              alumni_id: request.alumniId,
              type: request.type,
              status: request.status || 'pending',
              message: request.message || '',
              document_url: request.documentUrl || null,
              created_at: request.$createdAt,
            } as ConnectionRequest))

          if (requests.length > 0) {
            const studentIds = [...new Set(requests.map((request) => request.student_id))]
            const profiles = await tablesDB.listRows(databaseId, 'profiles', [
              Query.equal('userId', studentIds),
              Query.limit(5000),
            ])
            const studentMap = new Map<string, ConnectedStudent>()
            for (const document of profiles.rows) {
              const profileId = document.userId || document.$id
              const profile = {
                id: document.$id,
                user_id: profileId,
                email: document.email || '',
                full_name: document.fullName || 'Student',
                avatar_url: document.avatarUrl || null,
                role: 'student',
                headline: document.headline || null,
                bio: document.bio || null,
                company: document.company || null,
                industry: document.industry || null,
                linkedin_url: document.linkedInUrl || null,
                graduation_year: document.graduationYear || null,
                target_roles: document.targetRoles || null,
                created_at: document.$createdAt,
                tech_skills: document.techSkills || [],
              } as Profile & { tech_skills?: string[] }
              const studentRequests = requests
                .filter((request) => request.student_id === profileId)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              if (studentRequests[0]) {
                studentMap.set(profileId, { profile, request: studentRequests[0] })
              }
            }
            setConnectedStudents(Array.from(studentMap.values()))
          }
        }
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
            ? error.message
            : 'Unable to load the directory.')
        setLoadError(message)
        toast.error('Could not load the directory', { description: message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [router])

  // Student: send mentorship/referral request
  const handleRequestMentorship = async () => {
    if (!userId || !selectedAlumniId) {
      toast.error('Please sign in before sending a request.')
      return
    }

    // Check existing request in local state
    const existingReq = getRequestForAlumni(selectedAlumniId, requestType)
    if (existingReq?.status === 'pending') {
      toast.error(`A ${requestType} request is already pending for this alumni.`)
      return
    }
    if (existingReq?.status === 'accepted') {
      toast.info(`${requestType === 'mentorship' ? 'Mentorship' : 'Referral'} has already been given/accepted with this alumni.`)
      return
    }

    setIsSubmitting(true)

    // Check with backend to prevent double-submit or stale state
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
    const existingRequests = await tablesDB.listRows(databaseId, 'requests', [
      Query.equal('studentId', userId),
      Query.equal('alumniId', selectedAlumniId),
      Query.equal('type', requestType),
      Query.limit(5000),
    ])
    const existingDbReq = existingRequests.rows.find((request) =>
      ['pending', 'accepted', 'reviewing', 'referred', 'completed'].includes(request.status),
    )

    if (existingDbReq) {
      if (existingDbReq.status === 'pending') {
        toast.error(`A ${requestType} request has already been sent and is currently pending.`)
      } else if (existingDbReq.status === 'accepted') {
        toast.info(`${requestType === 'mentorship' ? 'Mentorship' : 'Referral'} has already been given/accepted with this alumni.`)
      } else {
        toast.info(`A ${requestType} request already exists (${existingDbReq.status}).`)
      }

      // Sync local requests
      const refreshed = await tablesDB.listRows(databaseId, 'requests', [
        Query.equal('studentId', userId),
        Query.limit(5000),
      ])
      setMyRequests(refreshed.rows.map((request) => ({
        id: request.$id,
        student_id: request.studentId,
        alumni_id: request.alumniId,
        type: request.type,
        status: request.status || 'pending',
        message: request.message || '',
        document_url: request.documentUrl || null,
        created_at: request.$createdAt,
      } as ConnectionRequest)))

      setIsSubmitting(false)
      setDialogOpen(false)
      return
    }

    try {
      const inserted = await tablesDB.createRow(databaseId, 'requests', ID.unique(), {
        studentId: userId,
        alumniId: selectedAlumniId,
        type: requestType,
        message: requestMessage.trim(),
        status: 'pending',
      })
      const insertedRequest = {
        id: inserted.$id,
        student_id: inserted.studentId,
        alumni_id: inserted.alumniId,
        type: inserted.type,
        status: inserted.status || 'pending',
        message: inserted.message || '',
        document_url: inserted.documentUrl || null,
        created_at: inserted.$createdAt,
      } as ConnectionRequest
      setMyRequests((prev) => [insertedRequest, ...prev])
      setDialogOpen(false)
      setRequestMessage('')
      toast.success(`${requestType === 'mentorship' ? 'Mentorship' : 'Referral'} request sent successfully!`)
    } catch (error) {
      toast.error('Failed to send request', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
    setIsSubmitting(false)
  }

  // Filter logic for students view
  const filteredAlumni = alumni.filter((person) => {
    const term = searchQuery.toLowerCase()
    const matchName = person.full_name.toLowerCase().includes(term)
    const matchCompany = person.company?.toLowerCase().includes(term)
    const matchSkills = person.tech_skills?.some(skill => skill.toLowerCase().includes(term))
    const matchIndustry = person.industry?.toLowerCase().includes(term)
    return matchName || matchCompany || matchSkills || matchIndustry
  })

  // Filter logic for alumni view
  const filteredStudents = connectedStudents.filter((cs) => {
    const term = studentSearchQuery.toLowerCase()
    const matchName = cs.profile.full_name.toLowerCase().includes(term)
    const matchSkills = cs.profile.tech_skills?.some(skill => skill.toLowerCase().includes(term))
    const matchIndustry = cs.profile.industry?.toLowerCase().includes(term)
    const matchRole = cs.profile.role?.toLowerCase().includes(term)
    const nameMatch = matchName || matchSkills || matchIndustry || matchRole
    if (filterType === 'all') return nameMatch
    return nameMatch && cs.request.type === filterType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'reviewing': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'referred': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'pending': return 'bg-slate-100 text-slate-600 border-slate-200'
      default: return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mentorship': return <GraduationCap className="w-3.5 h-3.5" />
      case 'referral': return <Briefcase className="w-3.5 h-3.5" />
      case 'resume': return <Eye className="w-3.5 h-3.5" />
      default: return <User className="w-3.5 h-3.5" />
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // ------ LOADING ------
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ------ ERROR ------
  if (loadError) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-slate-900 dark:text-white text-lg font-semibold">Couldn&apos;t load the directory</p>
        <p className="text-slate-500 mt-2">{loadError}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
          Try Again
        </Button>
      </div>
    )
  }

  // ============================
  //   ALUMNI VIEW — My Students
  // ============================
  if (userRole === 'alumni') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Students
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Students connected to you through mentorship, referrals, and resume reviews.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              {connectedStudents.length} {connectedStudents.length === 1 ? 'student' : 'students'}
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, skills, field of study..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['all', 'mentorship', 'referral', 'resume'] as const).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => setFilterType(type)}
                className={`text-xs capitalize whitespace-nowrap h-11 px-4 transition-all ${
                  filterType === type
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                }`}
              >
                {type === 'all' ? 'All' : type}
              </Button>
            ))}
          </div>
        </div>

        {/* Student Cards */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">
              {connectedStudents.length === 0
                ? 'No students connected yet'
                : 'No students match your search'}
            </p>
            <p className="text-slate-400 dark:text-slate-500 mt-1 text-sm max-w-sm mx-auto">
              {connectedStudents.length === 0
                ? 'When students send you mentorship or referral requests, they will appear here.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredStudents.map((cs) => {
              const initials = cs.profile.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()

              return (
                <Card
                  key={cs.profile.user_id}
                  className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden group"
                >
                  {/* Colored top strip based on request type */}
                  <div className={`h-1.5 ${
                    cs.request.type === 'mentorship' ? 'bg-blue-500' :
                    cs.request.type === 'referral' ? 'bg-purple-500' :
                    'bg-amber-500'
                  }`} />

                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3.5">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center shadow-sm">
                          {cs.profile.avatar_url ? (
                            <img
                              src={cs.profile.avatar_url}
                              alt={cs.profile.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-700 dark:text-blue-300 text-lg font-bold">
                              {initials}
                            </span>
                          )}
                        </div>
                        {/* Online-like status dot for active connections */}
                        {(cs.request.status === 'accepted' || cs.request.status === 'reviewing') && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          </div>
                        )}
                      </div>

                      {/* Name & Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                          {cs.profile.full_name}
                        </h3>
                        {cs.profile.role && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {cs.profile.role}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${getStatusColor(cs.request.status)}`}>
                            {getTypeIcon(cs.request.type)}
                            {cs.request.type}
                          </span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${getStatusColor(cs.request.status)}`}>
                            {cs.request.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 pt-0 pb-3 space-y-3">
                    {/* Bio excerpt */}
                    {cs.profile.bio && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {cs.profile.bio}
                      </p>
                    )}

                    {/* Quick info grid */}
                    <div className="space-y-1.5">
                      {cs.profile.industry && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{cs.profile.industry}</span>
                        </div>
                      )}
                      {cs.profile.graduation_year && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>Class of {cs.profile.graduation_year}</span>
                        </div>
                      )}
                      {cs.profile.target_roles && cs.profile.target_roles.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{cs.profile.target_roles.join(', ')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Connected {formatDate(cs.request.created_at)}</span>
                      </div>
                    </div>

                    {/* Skills */}
                    {cs.profile.tech_skills && cs.profile.tech_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cs.profile.tech_skills.slice(0, 4).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                        {cs.profile.tech_skills.length > 4 && (
                          <span className="text-[11px] text-slate-400 px-1 py-0.5">
                            +{cs.profile.tech_skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Request message preview */}
                    {cs.request.message && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Their Message</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed italic">
                          &ldquo;{cs.request.message}&rdquo;
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-3 pb-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-9 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                      onClick={() => {
                        setSelectedStudent(cs)
                        setProfileDialogOpen(true)
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View Profile
                    </Button>
                    <Link href="/messages" className="flex-1">
                      <Button
                        size="sm"
                        className="w-full text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        Message
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Student Profile Detail Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {selectedStudent && (() => {
              const s = selectedStudent
              const initials = s.profile.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()

              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center shadow-sm flex-shrink-0">
                        {s.profile.avatar_url ? (
                          <img
                            src={s.profile.avatar_url}
                            alt={s.profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-blue-700 dark:text-blue-300 text-xl font-bold">
                            {initials}
                          </span>
                        )}
                      </div>
                      <div>
                        <DialogTitle className="text-xl">{s.profile.full_name}</DialogTitle>
                        <DialogDescription className="text-sm">
                          {s.profile.role || 'Student'}
                          {s.profile.graduation_year && ` • Class of ${s.profile.graduation_year}`}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-5 mt-2">
                    {/* Connection Info */}
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Connected via <span className="font-semibold capitalize">{s.request.type}</span>
                        <span className="text-blue-500 dark:text-blue-400"> • {formatDate(s.request.created_at)}</span>
                      </span>
                    </div>

                    {/* Bio */}
                    {s.profile.bio && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">About</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {s.profile.bio}
                        </p>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {s.profile.industry && (
                        <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-medium text-slate-400 uppercase">Industry</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{s.profile.industry}</p>
                          </div>
                        </div>
                      )}
                      {s.profile.graduation_year && (
                        <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-medium text-slate-400 uppercase">Graduation</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{s.profile.graduation_year}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Target Roles */}
                    {s.profile.target_roles && s.profile.target_roles.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Target Roles</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {s.profile.target_roles.map((role, idx) => (
                            <span key={idx} className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {s.profile.tech_skills && s.profile.tech_skills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Skills & Technologies</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {s.profile.tech_skills.map((skill, idx) => (
                            <span key={idx} className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LinkedIn */}
                    {s.profile.linkedin_url && (
                      <a
                        href={s.profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                      >
                        <LinkIcon className="w-4 h-4" />
                        View LinkedIn Profile
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Request message */}
                    {s.request.message && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Original Request Message</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                          &ldquo;{s.request.message}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="mt-4 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setProfileDialogOpen(false)}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      Close
                    </Button>
                    <Link href="/messages">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                    </Link>
                  </DialogFooter>
                </>
              )
            })()}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ===============================
  //   STUDENT VIEW — Alumni Directory
  // ===============================
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Alumni Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Find and connect with alumni in your target industry.</p>
        </div>
        <div className="w-full md:w-72 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, company, skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
          />
        </div>
      </div>

      {filteredAlumni.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">No alumni found matching your search.</p>
          <p className="text-slate-400 dark:text-slate-500 mt-1 text-sm">Try broadening your search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAlumni.map((person) => {
            const initials = person.full_name
              .split(' ')
              .map(n => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()

            return (
              <Card key={person.user_id} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center flex-shrink-0">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-700 dark:text-blue-300 text-base font-bold">{initials}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{person.full_name}</CardTitle>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {person.role} {person.company && <span>at <span className="text-slate-700 dark:text-slate-300 font-medium">{person.company}</span></span>}
                      </div>
                      {person.industry && (
                        <div className="text-xs text-slate-400 mt-0.5">{person.industry}</div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0 pb-3">
                  {person.bio && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{person.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {person.tech_skills?.slice(0, 4).map((skill, idx) => (
                      <span key={idx} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {skill}
                      </span>
                    ))}
                    {person.tech_skills && person.tech_skills.length > 4 && (
                      <span className="text-[11px] text-slate-400 px-1 py-0.5">+{person.tech_skills.length - 4} more</span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  {/* Mentorship Status Action Button */}
                  {(() => {
                    const mentorshipReq = getRequestForAlumni(person.user_id, 'mentorship')
                    if (mentorshipReq?.status === 'pending') {
                      return (
                        <Button
                          variant="outline"
                          className="flex-1 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 hover:text-amber-800 text-xs sm:text-sm font-medium transition-all"
                          onClick={() => {
                            setSelectedAlumniId(person.user_id)
                            setRequestType('mentorship')
                            setDialogOpen(true)
                          }}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
                          Pending
                        </Button>
                      )
                    }
                    if (mentorshipReq?.status === 'accepted') {
                      return (
                        <Button
                          variant="outline"
                          className="flex-1 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 hover:text-emerald-800 text-xs sm:text-sm font-medium transition-all"
                          onClick={() => {
                            setSelectedAlumniId(person.user_id)
                            setRequestType('mentorship')
                            setDialogOpen(true)
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                          Mentorship Given
                        </Button>
                      )
                    }
                    if (mentorshipReq?.status === 'completed') {
                      return (
                        <Button
                          variant="outline"
                          className="flex-1 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs sm:text-sm font-medium transition-all"
                          onClick={() => {
                            setSelectedAlumniId(person.user_id)
                            setRequestType('mentorship')
                            setDialogOpen(true)
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                          Completed
                        </Button>
                      )
                    }
                    return (
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-all"
                        onClick={() => {
                          setSelectedAlumniId(person.user_id)
                          setRequestType('mentorship')
                          setRequestMessage('')
                          setDialogOpen(true)
                        }}
                      >
                        <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                        {mentorshipReq?.status === 'declined' || mentorshipReq?.status === 'rejected' ? 'Re-request' : 'Mentorship'}
                      </Button>
                    )
                  })()}

                  {/* Referral Status Action Button */}
                  {(() => {
                    const referralReq = getRequestForAlumni(person.user_id, 'referral')
                    if (referralReq?.status === 'pending' || referralReq?.status === 'reviewing') {
                      return (
                        <Button
                          variant="outline"
                          className="flex-1 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 text-xs sm:text-sm font-medium transition-all"
                          onClick={() => {
                            setSelectedAlumniId(person.user_id)
                            setRequestType('referral')
                            setDialogOpen(true)
                          }}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
                          Referral Pending
                        </Button>
                      )
                    }
                    if (referralReq?.status === 'accepted' || referralReq?.status === 'referred') {
                      return (
                        <Button
                          variant="outline"
                          className="flex-1 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 text-xs sm:text-sm font-medium transition-all"
                          onClick={() => {
                            setSelectedAlumniId(person.user_id)
                            setRequestType('referral')
                            setDialogOpen(true)
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                          Referred
                        </Button>
                      )
                    }
                    return (
                      <Button
                        variant="outline"
                        className="flex-1 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600 text-xs sm:text-sm font-medium transition-all"
                        onClick={() => {
                          setSelectedAlumniId(person.user_id)
                          setRequestType('referral')
                          setRequestMessage('')
                          setDialogOpen(true)
                        }}
                      >
                        <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                        Referral
                      </Button>
                    )
                  })()}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Student Request Mentorship/Referral Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:max-w-[460px]">
          {(() => {
            const selectedAlumni = alumni.find((a) => a.user_id === selectedAlumniId)
            const activeExistingReq = selectedAlumniId ? getRequestForAlumni(selectedAlumniId, requestType) : undefined

            if (!selectedAlumni) return null

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center flex-shrink-0">
                      {selectedAlumni.avatar_url ? (
                        <img src={selectedAlumni.avatar_url} alt={selectedAlumni.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-700 dark:text-blue-300 text-base font-bold">
                          {selectedAlumni.full_name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <DialogTitle className="text-lg">
                        {requestType === 'mentorship' ? 'Mentorship' : 'Referral'} Request
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        {selectedAlumni.full_name}
                        {selectedAlumni.role && ` • ${selectedAlumni.role}`}
                        {selectedAlumni.company && ` at ${selectedAlumni.company}`}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Status Notice: Request Pending */}
                {activeExistingReq && activeExistingReq.status === 'pending' && (
                  <div className="mt-2 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2.5">
                    <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">
                        {requestType === 'mentorship' ? 'Mentorship request is pending' : 'Referral request is pending'}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
                        You have already sent a {requestType} request to {selectedAlumni.full_name} on {formatDate(activeExistingReq.created_at)}. Please wait for their response.
                      </p>
                      {activeExistingReq.message && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-900/40 text-xs italic text-amber-900 dark:text-amber-200 border border-amber-200/50 dark:border-amber-700/50 leading-relaxed">
                          &ldquo;{activeExistingReq.message}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Notice: Already Accepted / Given */}
                {activeExistingReq && (activeExistingReq.status === 'accepted' || activeExistingReq.status === 'reviewing' || activeExistingReq.status === 'referred') && (
                  <div className="mt-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">
                        {requestType === 'mentorship' ? 'Mentorship already given' : 'Referral already active'}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400/90 leading-relaxed">
                        {selectedAlumni.full_name} has already accepted your {requestType} request! You are connected and can reach out directly.
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Notice: Completed */}
                {activeExistingReq && activeExistingReq.status === 'completed' && (
                  <div className="mt-2 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Mentorship Completed</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400/90 leading-relaxed">
                        Your previous mentorship session with {selectedAlumni.full_name} has been completed.
                      </p>
                    </div>
                  </div>
                )}

                {/* New Request Input (only when no pending or active request) */}
                {(!activeExistingReq || activeExistingReq.status === 'declined' || activeExistingReq.status === 'rejected') && (
                  <div className="grid gap-3 py-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Message to {selectedAlumni.full_name}
                    </label>
                    <Textarea
                      placeholder={
                        requestType === 'mentorship'
                          ? "Hi! I noticed your experience and would love your mentorship on..."
                          : "Hi! I'm interested in roles at your company and would love to explore a referral..."
                      }
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-28"
                    />
                    <p className="text-[11px] text-slate-400">
                      Introduce yourself and briefly describe what advice or assistance you are seeking.
                    </p>
                  </div>
                )}

                <DialogFooter className="gap-2 mt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-200 dark:border-slate-700">
                    Close
                  </Button>

                  {activeExistingReq?.status === 'accepted' || activeExistingReq?.status === 'reviewing' || activeExistingReq?.status === 'referred' ? (
                    <Link href="/messages">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <MessageSquare className="size-4 mr-2" />
                        Open Messages
                      </Button>
                    </Link>
                  ) : activeExistingReq?.status === 'pending' ? (
                    <Link href="/requests">
                      <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                        View in Requests
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={handleRequestMentorship}
                      disabled={isSubmitting || !requestMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                      {isSubmitting ? 'Sending...' : 'Send Request'}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
