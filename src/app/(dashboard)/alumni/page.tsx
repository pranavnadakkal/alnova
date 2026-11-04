'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { account, tablesDB } from '@/lib/appwrite/client'
import { Query } from 'appwrite'
import {
  Search,
  Users,
  GraduationCap,
  Briefcase,
  MessageSquare,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Filter,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MentorshipRequestModal from '@/components/student/MentorshipRequestModal'
import ReferralRequestModal from '@/components/student/ReferralRequestModal'
import { toast } from 'sonner'

interface EnrichedAlumni {
  id: string
  user_id: string
  full_name: string
  avatar_url?: string | null
  headline?: string | null
  bio?: string | null
  company?: string | null
  role?: string | null
  industry?: string | null
  years_of_experience?: number | null
  open_to_referrals: boolean
  open_to_mentorship?: boolean
  is_verified?: boolean
  skills: string[]
  mentorshipStatus?: 'pending' | 'accepted' | 'completed' | 'declined' | null
}

function AlumniDirectoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [studentId, setStudentId] = useState<string | null>(null)
  const [alumniList, setAlumniList] = useState<EnrichedAlumni[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters from URL or state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCompany, setSelectedCompany] = useState(searchParams.get('company') || 'all')
  const [selectedIndustry, setSelectedIndustry] = useState(searchParams.get('industry') || 'all')
  const [selectedSkill, setSelectedSkill] = useState(searchParams.get('skill') || 'all')
  const [referralsOnly, setReferralsOnly] = useState(searchParams.get('referrals') === 'true')

  // Modals state
  const [mentorshipModalAlumni, setMentorshipModalAlumni] = useState<EnrichedAlumni | null>(null)
  const [referralModalAlumni, setReferralModalAlumni] = useState<EnrichedAlumni | null>(null)

  // Sync state to URL params cleanly
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (selectedCompany !== 'all') params.set('company', selectedCompany)
    if (selectedIndustry !== 'all') params.set('industry', selectedIndustry)
    if (selectedSkill !== 'all') params.set('skill', selectedSkill)
    if (referralsOnly) params.set('referrals', 'true')

    const newQuery = params.toString()
    const url = newQuery ? `/alumni?${newQuery}` : '/alumni'
    window.history.replaceState(null, '', url)
  }, [searchQuery, selectedCompany, selectedIndustry, selectedSkill, referralsOnly])

  const fetchAlumniAndRequests = async () => {
    try {
      let user
      try {
        user = await account.get()
      } catch {
        router.push('/login')
        return
      }
      setStudentId(user.$id)
      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!

      // Fetch student's existing mentorship requests to display accurate status on cards
      const [studentSessions, studentLegacyReqs] = await Promise.all([
        tablesDB.listRows(databaseId, 'mentorship_sessions', [
          Query.equal('studentId', user.$id),
          Query.limit(5000),
        ]),
        tablesDB.listRows(databaseId, 'requests', [
          Query.equal('studentId', user.$id),
          Query.limit(5000),
        ]),
      ])

      const statusMap = new Map<string, EnrichedAlumni['mentorshipStatus']>()
      studentSessions.rows.forEach((session) => statusMap.set(session.alumniId, session.status))
      studentLegacyReqs.rows.forEach((request) => {
        if (request.type === 'mentorship' && !statusMap.has(request.alumniId)) {
          statusMap.set(request.alumniId, 'pending')
        }
      })

      // Query alumni profiles joined with profiles and profile_skills
      // 1. Try fetching from alumni_profiles
      let enriched: EnrichedAlumni[] = []
      const alumniProfiles = await tablesDB.listRows(databaseId, 'alumni_profiles', [Query.limit(5000)])

      if (alumniProfiles.rows.length > 0) {
        // Fetch skills for these profiles
        const profileIds = alumniProfiles.rows
          .map((alumni) => alumni.profileId)
          .filter((profileId): profileId is string => Boolean(profileId))
        const [profileResult, skillRows, skills] = await Promise.all([
          profileIds.length
            ? tablesDB.listRows(databaseId, 'profiles', [
                Query.equal('userId', profileIds),
                Query.limit(5000),
              ])
            : Promise.resolve(null),
          profileIds.length
            ? tablesDB.listRows(databaseId, 'profile_skills', [
                Query.equal('profileId', profileIds),
                Query.limit(5000),
              ])
            : Promise.resolve({ rows: [] }),
          tablesDB.listRows(databaseId, 'skills', [Query.limit(5000)]),
        ])

        type ProfileFields = {
          $id: string
          userId?: string
          fullName?: string
          avatarUrl?: string
          headline?: string
          bio?: string
          role?: string
        }
        const profileMap = new Map<string, ProfileFields>()
        profileResult?.rows.forEach((profile) => {
          profileMap.set(profile.userId || profile.$id, profile)
        })
        const skillMap = new Map(skills.rows.map((skill) => [skill.$id, skill.name]))
        const skillsMap = new Map<string, string[]>()
        skillRows.rows.forEach((row) => {
          const list = skillsMap.get(row.profileId) || []
          const skillName = skillMap.get(row.skillId)
          if (skillName) list.push(skillName)
          skillsMap.set(row.profileId, list)
        })

        enriched = alumniProfiles.rows.map((alumni) => {
          const profileId = alumni.profileId || alumni.$id
          const profile = profileMap.get(profileId)
          const alumniUserId = profile?.userId || profile?.$id || profileId
          const company = alumni.company || null
          const jobTitle = alumni.jobTitle || null
          const currentSkills = skillsMap.get(profileId) || []

          return {
            id: alumniUserId,
            user_id: alumniUserId,
            full_name: profile?.fullName || 'Alumni Member',
            avatar_url: profile?.avatarUrl,
            headline: profile?.headline || (jobTitle && company ? `${jobTitle} at ${company}` : null),
            bio: profile?.bio,
            company,
            role: jobTitle || profile?.headline || profile?.role,
            industry: alumni.industry || null,
            years_of_experience: alumni.yearsOfExperience,
            open_to_referrals: alumni.openToReferrals ?? true,
            open_to_mentorship: alumni.openToMentorship ?? true,
            is_verified: Boolean(alumni.isVerified ?? true),
            skills: currentSkills,
            mentorshipStatus: statusMap.get(alumniUserId) || null,
          }
        })
      } else {
        // Fallback: Fetch directly from profiles table where role='alumni'
        const profilesData = await tablesDB.listRows(databaseId, 'profiles', [
          Query.equal('role', 'alumni'),
          Query.limit(5000),
        ])

        enriched = profilesData.rows.map((profile) => ({
            id: profile.userId || profile.$id,
            user_id: profile.userId || profile.$id,
            full_name: profile.fullName || 'Alumni Member',
            avatar_url: profile.avatarUrl,
            headline: profile.headline || profile.role,
            bio: profile.bio,
            company: null,
            role: profile.role,
            industry: null,
            years_of_experience: null,
            open_to_referrals: true,
            open_to_mentorship: true,
            is_verified: true,
            skills: [],
            mentorshipStatus: statusMap.get(profile.userId || profile.$id) || null,
          }))
      }

      setAlumniList(enriched)
    } catch (err) {
      console.error('Failed to fetch alumni directory:', err)
      toast.error('Could not load alumni directory.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAlumniAndRequests()
  }, [router])

  // Extract distinct filter values
  const allCompanies = useMemo(() => {
    const set = new Set<string>()
    alumniList.forEach((a) => a.company && set.add(a.company))
    return Array.from(set).sort()
  }, [alumniList])

  const allIndustries = useMemo(() => {
    const set = new Set<string>()
    alumniList.forEach((a) => a.industry && set.add(a.industry))
    return Array.from(set).sort()
  }, [alumniList])

  const allSkills = useMemo(() => {
    const set = new Set<string>()
    alumniList.forEach((a) => a.skills.forEach((s) => set.add(s)))
    return Array.from(set).sort()
  }, [alumniList])

  // Filtered list
  const filteredAlumni = useMemo(() => {
    return alumniList.filter((a) => {
      // Search query filter
      const q = searchQuery.toLowerCase()
      const matchQuery =
        !q ||
        a.full_name.toLowerCase().includes(q) ||
        a.company?.toLowerCase().includes(q) ||
        a.role?.toLowerCase().includes(q) ||
        a.headline?.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q) ||
        a.skills.some((s) => s.toLowerCase().includes(q))

      // Company filter
      const matchCompany = selectedCompany === 'all' || a.company === selectedCompany

      // Industry filter
      const matchIndustry = selectedIndustry === 'all' || a.industry === selectedIndustry

      // Skill filter
      const matchSkill = selectedSkill === 'all' || a.skills.includes(selectedSkill)

      // Referrals filter
      const matchReferrals = !referralsOnly || a.open_to_referrals

      return matchQuery && matchCompany && matchIndustry && matchSkill && matchReferrals
    })
  }, [alumniList, searchQuery, selectedCompany, selectedIndustry, selectedSkill, referralsOnly])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCompany('all')
    setSelectedIndustry('all')
    setSelectedSkill('all')
    setReferralsOnly(false)
  }

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCompany !== 'all' ||
    selectedIndustry !== 'all' ||
    selectedSkill !== 'all' ||
    referralsOnly

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Verified Alumni Network
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Alumni Directory
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm max-w-2xl">
            Discover and connect with graduated alumni across premier tech companies. Schedule 1-on-1 mentorship sessions, message directly, and explore employee referrals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 rounded-lg border-slate-300 text-slate-600 dark:text-slate-300">
            {filteredAlumni.length} {filteredAlumni.length === 1 ? 'Mentor' : 'Mentors'} Available
          </Badge>
        </div>
      </div>

      {/* 2. Interactive Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by name, company, job title, bio, or tech stack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          {/* Company dropdown */}
          <div className="w-full md:w-48">
            <Select value={selectedCompany} onValueChange={(value) => setSelectedCompany(value || '')}>
              <SelectTrigger className="h-11 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                <SelectValue placeholder="Company: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Companies</SelectItem>
                {allCompanies.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Industry dropdown */}
          <div className="w-full md:w-48">
            <Select value={selectedIndustry} onValueChange={(value) => setSelectedIndustry(value || '')}>
              <SelectTrigger className="h-11 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                <SelectValue placeholder="Industry: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Industries</SelectItem>
                {allIndustries.map((ind) => (
                  <SelectItem key={ind} value={ind} className="text-xs">{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second row: Skills & Open to Referrals Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Tech Stack select */}
            <div className="w-44">
              <Select value={selectedSkill} onValueChange={(value) => setSelectedSkill(value || '')}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg">
                  <SelectValue placeholder="Tech Stack: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Tech Stacks</SelectItem>
                  {allSkills.map((sk) => (
                    <SelectItem key={sk} value={sk} className="text-xs">{sk}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Referrals Switch */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Switch
                checked={referralsOnly}
                onCheckedChange={setReferralsOnly}
                id="referrals-switch"
                className="scale-75 data-[state=checked]:bg-emerald-600"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Open to Referrals Only
              </span>
            </label>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-slate-500 hover:text-red-500 px-2"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reset filters
              </Button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredAlumni.length}</span> verified profiles
          </div>
        </div>
      </div>

      {/* 3. Alumni Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full rounded-xl" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredAlumni.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No alumni found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto mb-6">
            We couldn&apos;t find any alumni matching your search filters. Try broadening your keywords or removing some filters.
          </p>
          <Button onClick={clearFilters} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlumni.map((alumnus) => {
            const initials = alumnus.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <Card
                key={alumnus.id}
                className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/60 transition-all flex flex-col overflow-hidden bg-white dark:bg-slate-900"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3.5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center shadow-sm">
                        {alumnus.avatar_url ? (
                          <img src={alumnus.avatar_url} alt={alumnus.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-blue-700 dark:text-blue-300 font-bold text-lg">{initials}</span>
                        )}
                      </div>
                      {alumnus.is_verified && (
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* Basic Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {alumnus.full_name}
                        </CardTitle>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                        {alumnus.role || 'Alumni Member'}
                        {alumnus.company && (
                          <span className="text-slate-500 font-normal"> at <strong className="text-slate-800 dark:text-slate-200">{alumnus.company}</strong></span>
                        )}
                      </div>

                      {alumnus.industry && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{alumnus.industry}</span>
                          {alumnus.years_of_experience && (
                            <span>• {alumnus.years_of_experience}+ yrs exp</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pb-3 space-y-3 pt-0">
                  {/* Bio or headline */}
                  {(alumnus.headline || alumnus.bio) && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {alumnus.headline || alumnus.bio}
                    </p>
                  )}

                  {/* Badges: Open to Referrals */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {alumnus.open_to_referrals && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <Sparkles className="w-3 h-3" />
                        Open to Referrals
                      </span>
                    )}
                    {alumnus.open_to_mentorship && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        <GraduationCap className="w-3 h-3" />
                        1-on-1 Mentor
                      </span>
                    )}
                  </div>

                  {/* Skills tags */}
                  {alumnus.skills && alumnus.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {alumnus.skills.slice(0, 4).map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {alumnus.skills.length > 4 && (
                        <span className="text-[10px] text-slate-400 px-1 py-0.5">
                          +{alumnus.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>

                {/* Card Actions: Request Mentorship, Message, Ask for Referral */}
                <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 w-full">
                    {/* Mentorship Action Button with dynamic status */}
                    {alumnus.mentorshipStatus === 'pending' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMentorshipModalAlumni(alumnus)}
                        className="flex-1 h-9 text-xs font-semibold border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Pending
                      </Button>
                    ) : alumnus.mentorshipStatus === 'accepted' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMentorshipModalAlumni(alumnus)}
                        className="flex-1 h-9 text-xs font-semibold border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Mentorship Given
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setMentorshipModalAlumni(alumnus)}
                        className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <GraduationCap className="w-3.5 h-3.5 mr-1" />
                        Request Mentorship
                      </Button>
                    )}

                    {/* Message button */}
                    <Link href={`/messages?alumniId=${alumnus.user_id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300"
                        title="Direct Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>

                  {/* Ask for Referral button */}
                  {alumnus.open_to_referrals && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReferralModalAlumni(alumnus)}
                      className="w-full h-8 text-[11px] text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-medium"
                    >
                      <Briefcase className="w-3 h-3 mr-1.5 text-purple-500" />
                      Ask for Referral at {alumnus.company || 'Company'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* 4. Modals */}
      {studentId && (
        <>
          <MentorshipRequestModal
            alumni={mentorshipModalAlumni}
            isOpen={Boolean(mentorshipModalAlumni)}
            onClose={() => setMentorshipModalAlumni(null)}
            studentId={studentId}
            onSuccess={fetchAlumniAndRequests}
          />

          <ReferralRequestModal
            alumni={referralModalAlumni}
            isOpen={Boolean(referralModalAlumni)}
            onClose={() => setReferralModalAlumni(null)}
            studentId={studentId}
            onSuccess={fetchAlumniAndRequests}
          />
        </>
      )}
    </div>
  )
}

export default function AlumniDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading alumni directory...</div>}>
      <AlumniDirectoryContent />
    </Suspense>
  )
}
