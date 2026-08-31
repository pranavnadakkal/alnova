'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConnectionRequest, Profile, RequestStatus } from '@/types'
import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

type ExtendedRequest = ConnectionRequest & {
  studentProfile?: Profile
  alumniProfile?: Profile
}

export default function RequestsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'student' | 'alumni' | null>(null)
  const [requests, setRequests] = useState<ExtendedRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)

  // Resume Upload State
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeMessage, setResumeMessage] = useState('')
  const [selectedAlumniForResume, setSelectedAlumniForResume] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  
  // Available alumni for resume/referral dropdowns
  const [availableAlumni, setAvailableAlumni] = useState<Profile[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) return
      setUserId(user.id)

      const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (userError) throw userError
      if (userData) setUserRole(userData.role)

      // Fetch requests for this user
      const idField = userData?.role === 'alumni' ? 'alumni_id' : 'student_id'
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .eq(idField, user.id)
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError
      if (requestsData) {
        // Fetch related profiles manually since we don't have a foreign key to profiles table directly in requests, just to users.
        const studentIds = requestsData.map(r => r.student_id)
        const alumniIds = requestsData.map(r => r.alumni_id)
        
        const { data: studentProfiles, error: studentsError } = await supabase.from('profiles').select('*').in('user_id', studentIds)
        const { data: alumniProfiles, error: alumniError } = await supabase.from('profiles').select('*').in('user_id', alumniIds)
        if (studentsError || alumniError) throw studentsError || alumniError

        const enrichedRequests = requestsData.map(req => ({
          ...req,
          studentProfile: studentProfiles?.find(p => p.user_id === req.student_id),
          alumniProfile: alumniProfiles?.find(p => p.user_id === req.alumni_id)
        }))
        setRequests(enrichedRequests)
      }

      // If student, fetch all alumni for dropdowns
      if (userData?.role === 'student') {
        const { data: alumniUsers, error: alumniUsersError } = await supabase.from('users').select('id').eq('role', 'alumni')
        if (alumniUsersError) throw alumniUsersError
        if (alumniUsers) {
          const ids = alumniUsers.map(a => a.id)
          const { data: aProfiles, error: alumniProfilesError } = await supabase.from('profiles').select('*').in('user_id', ids)
          if (alumniProfilesError) throw alumniProfilesError
          if (aProfiles) setAvailableAlumni(aProfiles)
        }
      }

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load your requests.'
        setLoadError(message)
        toast.error('Could not load requests', { description: message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  const updateRequestStatus = async (requestId: string, newStatus: RequestStatus) => {
    setUpdatingRequestId(requestId)
    const { error } = await supabase.from('requests').update({ status: newStatus }).eq('id', requestId)
    if (!error) {
      setRequests(current => current.map(req => req.id === requestId ? { ...req, status: newStatus } : req))
      toast.success(`Request marked as ${newStatus}.`)
    } else {
      toast.error('Failed to update request', { description: error.message })
    }
    setUpdatingRequestId(null)
  }

  const handleResumeUpload = async () => {
    if (!userId || !resumeFile || !selectedAlumniForResume) return
    if (resumeFile.type !== 'application/pdf') {
      toast.error('Please upload a PDF resume.')
      return
    }
    setIsUploading(true)

    const fileExt = resumeFile.name.split('.').pop()
    const fileName = `${userId}-${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, resumeFile)

    if (uploadError) {
      toast.error('Failed to upload resume', { description: uploadError.message })
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(filePath)

    const { error: requestError } = await supabase.from('requests').insert({
      student_id: userId,
      alumni_id: selectedAlumniForResume,
      type: 'resume',
      status: 'pending',
      message: resumeMessage || 'Please review my resume.',
      document_url: publicUrl
    })

    if (requestError) {
      toast.error('Failed to submit resume review request', { description: requestError.message })
    } else {
      toast.success('Resume submitted successfully!')
      setResumeFile(null)
      setResumeMessage('')
      setSelectedAlumniForResume('')
    }

    setIsUploading(false)
  }

  const renderStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Pending</Badge>
      case 'accepted': return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Accepted</Badge>
      case 'declined': return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Declined</Badge>
      case 'reviewing': return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Reviewing</Badge>
      case 'completed': return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Completed</Badge>
      case 'referred': return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Referred</Badge>
      case 'rejected': return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">Rejected</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const mentorshipRequests = requests.filter(r => r.type === 'mentorship')
  const resumeRequests = requests.filter(r => r.type === 'resume')
  const referralRequests = requests.filter(r => r.type === 'referral')
  const requestsSkeleton = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => <Card key={item} className="glass-card border-none"><CardContent className="space-y-4 p-6"><Skeleton className="h-5 w-1/2 bg-white/10" /><Skeleton className="h-4 w-full bg-white/10" /><Skeleton className="h-16 w-full bg-white/10" /></CardContent></Card>)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Requests Pipeline</h1>
        <p className="text-white/70 mt-1">Manage your mentorship sessions, resume reviews, and referrals.</p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-16 text-center"><p className="text-lg text-white">We couldn&apos;t load your requests.</p><p className="mt-2 text-white/60">Please refresh the page and try again.</p></div>
      ) : <Tabs defaultValue="mentorship" className="w-full">
        <TabsList className="w-full overflow-x-auto justify-start bg-white/10 border border-white/20 sm:w-fit">
          <TabsTrigger value="mentorship" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Mentorship</TabsTrigger>
          <TabsTrigger value="resume" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Resume Reviews</TabsTrigger>
          <TabsTrigger value="referral" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="mentorship" className="mt-6 space-y-4">
          {isLoading ? requestsSkeleton : mentorshipRequests.length === 0 ? <p className="text-white/50">No mentorship requests.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mentorshipRequests.map(req => (
                <Card key={req.id} className="glass-card border-none">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {userRole === 'alumni' ? req.studentProfile?.full_name : req.alumniProfile?.full_name}
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        {new Date(req.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {renderStatusBadge(req.status)}
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 text-sm bg-white/5 p-3 rounded-md">{req.message}</p>
                  </CardContent>
                  {userRole === 'alumni' && req.status === 'pending' && (
                    <CardFooter className="flex gap-2">
                      <Button size="sm" disabled={updatingRequestId === req.id} onClick={() => updateRequestStatus(req.id, 'accepted')} className="bg-green-500/80 hover:bg-green-500">{updatingRequestId === req.id && <Loader2 className="animate-spin" />}Accept</Button>
                      <Button size="sm" disabled={updatingRequestId === req.id} onClick={() => updateRequestStatus(req.id, 'declined')} variant="destructive">Decline</Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resume" className="mt-6 space-y-8">
          {userRole === 'student' && (
            <Card className="glass-card border-none max-w-xl">
              <CardHeader>
                <CardTitle>Request a Resume Review</CardTitle>
                <CardDescription className="text-white/60">Upload your PDF resume and select an alumni to review it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Alumni</label>
                  <select 
                    className="w-full bg-white/10 border border-white/20 rounded-md p-2 text-white"
                    value={selectedAlumniForResume}
                    onChange={(e) => setSelectedAlumniForResume(e.target.value)}
                  >
                    <option value="" className="text-black">Select an alumni...</option>
                    {availableAlumni.map(a => (
                      <option key={a.user_id} value={a.user_id} className="text-black">{a.full_name} - {a.company}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message (Optional)</label>
                  <Textarea 
                    value={resumeMessage} 
                    onChange={e => setResumeMessage(e.target.value)}
                    className="bg-white/10 border-white/20" 
                    placeholder="Any specific areas you want feedback on?" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resume (PDF)</label>
                  <Input 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="bg-white/10 border-white/20 cursor-pointer" 
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleResumeUpload} disabled={isUploading || !resumeFile || !selectedAlumniForResume} className="bg-white text-black hover:bg-white/90">
                  {isUploading && <Loader2 className="size-4 animate-spin" />}
                  {isUploading ? 'Uploading...' : 'Submit for Review'}
                </Button>
              </CardFooter>
            </Card>
          )}

          <div>
            <h3 className="text-xl font-semibold mb-4">Your Resume Reviews</h3>
            {isLoading ? requestsSkeleton : resumeRequests.length === 0 ? <p className="text-white/50">No resume requests.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resumeRequests.map(req => (
                  <Card key={req.id} className="glass-card border-none">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {userRole === 'alumni' ? req.studentProfile?.full_name : req.alumniProfile?.full_name}
                        </CardTitle>
                        <CardDescription className="text-white/60">
                          {new Date(req.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {renderStatusBadge(req.status)}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-white/80 text-sm bg-white/5 p-3 rounded-md">{req.message}</p>
                      {req.document_url && (
                        <a href={req.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline">
                          View Resume PDF
                        </a>
                      )}
                    </CardContent>
                    {userRole === 'alumni' && req.status === 'pending' && (
                      <CardFooter className="flex gap-2">
                        <Button size="sm" disabled={updatingRequestId === req.id} onClick={() => updateRequestStatus(req.id, 'reviewing')} className="bg-blue-500/80 hover:bg-blue-500">{updatingRequestId === req.id && <Loader2 className="animate-spin" />}Mark as Reviewing</Button>
                      </CardFooter>
                    )}
                    {userRole === 'alumni' && req.status === 'reviewing' && (
                      <CardFooter className="flex gap-2">
                        <Button size="sm" disabled={updatingRequestId === req.id} onClick={() => updateRequestStatus(req.id, 'completed')} className="bg-emerald-500/80 hover:bg-emerald-500">{updatingRequestId === req.id && <Loader2 className="animate-spin" />}Mark as Completed</Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="referral" className="mt-6 space-y-4">
          {isLoading ? requestsSkeleton : referralRequests.length === 0 ? <p className="text-white/50">No referral requests.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {referralRequests.map(req => (
                <Card key={req.id} className="glass-card border-none">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {userRole === 'alumni' ? req.studentProfile?.full_name : req.alumniProfile?.full_name}
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        {req.alumniProfile?.company}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">{renderStatusBadge(req.status)}</div>
                    <p className="text-white/80 text-sm">{req.message}</p>
                  </CardContent>
                  {userRole === 'alumni' && (
                    <CardFooter className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={updatingRequestId === req.id} onClick={() => updateRequestStatus(req.id, 'reviewing')} variant="outline" className="bg-white/5">{updatingRequestId === req.id && <Loader2 className="animate-spin" />}Reviewing</Button>
                      <Button size="sm" disabled={updatingRequestId === req.id} onClick={() => updateRequestStatus(req.id, 'referred')} className="bg-purple-500/80 hover:bg-purple-500">Referred</Button>
                      <Button size="sm" disabled={updatingRequestId === req.id} onClick={() => updateRequestStatus(req.id, 'rejected')} variant="destructive">Rejected</Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>}
    </div>
  )
}
