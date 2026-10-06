'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

type AlumniProfile = Profile & { users?: { role: string } }

type ConnectedStudent = {
  profile: Profile
  request: ConnectionRequest
}

export default function DirectoryPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
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

  // Alumni-specific state (student directory)
  const [connectedStudents, setConnectedStudents] = useState<ConnectedStudent[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'mentorship' | 'referral' | 'resume'>('all')
  const [selectedStudent, setSelectedStudent] = useState<ConnectedStudent | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userError) throw userError
        setUserRole(userData.role)

        if (userData.role === 'student') {
          // Fetch alumni directory for students
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, role')
            .eq('role', 'alumni')

          if (usersError) throw usersError
          if (users && users.length > 0) {
            const alumniIds = users.map((u) => u.id)
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', alumniIds)

            if (profilesError) throw profilesError
            if (profiles) setAlumni(profiles)
          }
        } else if (userData.role === 'alumni') {
          // Fetch connected students for alumni
          const { data: requests, error: requestsError } = await supabase
            .from('requests')
            .select('*')
            .eq('alumni_id', user.id)
            .in('status', ['accepted', 'completed', 'reviewing', 'referred', 'pending'])

          if (requestsError) throw requestsError

          if (requests && requests.length > 0) {
            const studentIds = [...new Set(requests.map((r: ConnectionRequest) => r.student_id))]
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', studentIds)

            if (profilesError) throw profilesError

            if (profiles) {
              // Map each unique student to their most recent request
              const studentMap = new Map<string, ConnectedStudent>()
              for (const profile of profiles) {
                const studentRequests = requests
                  .filter((r: ConnectionRequest) => r.student_id === profile.user_id)
                  .sort((a: ConnectionRequest, b: ConnectionRequest) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                if (studentRequests.length > 0) {
                  studentMap.set(profile.user_id, {
                    profile,
                    request: studentRequests[0]
                  })
                }
              }
              setConnectedStudents(Array.from(studentMap.values()))
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load the directory.'
        setLoadError(message)
        toast.error('Could not load the directory', { description: message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

  // Student: send mentorship/referral request
  const handleRequestMentorship = async () => {
    if (!userId || !selectedAlumniId) {
      toast.error('Please sign in before sending a request.')
      return
    }
    setIsSubmitting(true)

    const { error } = await supabase.from('requests').insert({
      student_id: userId,
      alumni_id: selectedAlumniId,
      type: requestType,
      message: requestMessage,
      status: 'pending'
    })

    if (!error) {
      setDialogOpen(false)
      setRequestMessage('')
      toast.success(`${requestType === 'mentorship' ? 'Mentorship' : 'Referral'} request sent successfully!`)
    } else {
      toast.error('Failed to send request', { description: error.message })
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
                  <Dialog open={dialogOpen && selectedAlumniId === person.user_id} onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (open) {
                      setSelectedAlumniId(person.user_id)
                      setRequestType('mentorship')
                    } else {
                      setSelectedAlumniId(null)
                    }
                  }}>
                    <DialogTrigger render={<Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm" />}>
                      Mentorship
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Request {requestType === 'mentorship' ? 'Mentorship' : 'Referral'}</DialogTitle>
                        <DialogDescription>
                          Send a brief message to {person.full_name} for a {requestType}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <Textarea
                          placeholder="Hi! I'm interested in..."
                          value={requestMessage}
                          onChange={(e) => setRequestMessage(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-32"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-200 dark:border-slate-700">
                          Cancel
                        </Button>
                        <Button onClick={handleRequestMentorship} disabled={isSubmitting || !requestMessage.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                          {isSubmitting ? 'Sending...' : 'Send Request'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    className="flex-1 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600 text-xs sm:text-sm"
                    onClick={() => {
                      setRequestType('referral')
                      setSelectedAlumniId(person.user_id)
                      setDialogOpen(true)
                    }}
                  >
                    Referral
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
