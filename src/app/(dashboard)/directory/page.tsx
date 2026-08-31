'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Profile } from '@/types'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type AlumniProfile = Profile & { users?: { role: string } }

export default function DirectoryPage() {
  const supabase = useMemo(() => createClient(), [])
  const [alumni, setAlumni] = useState<AlumniProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [studentId, setStudentId] = useState<string | null>(null)
  
  // Dialog state
  const [requestMessage, setRequestMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAlumniId, setSelectedAlumniId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [requestType, setRequestType] = useState<'mentorship' | 'referral'>('mentorship')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlumni = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (user) {
        setStudentId(user.id)
      }

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
        if (profiles) {
          setAlumni(profiles)
        }
      }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load the alumni directory.'
        setLoadError(message)
        toast.error('Could not load the alumni directory', { description: message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlumni()
  }, [supabase])

  const handleRequestMentorship = async () => {
    if (!studentId || !selectedAlumniId) {
      toast.error('Please sign in before sending a request.')
      return
    }
    setIsSubmitting(true)
    
    const { error } = await supabase.from('requests').insert({
      student_id: studentId,
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

  const filteredAlumni = alumni.filter((person) => {
    const term = searchQuery.toLowerCase()
    const matchName = person.full_name.toLowerCase().includes(term)
    const matchCompany = person.company?.toLowerCase().includes(term)
    const matchSkills = person.tech_skills?.some(skill => skill.toLowerCase().includes(term))
    const matchIndustry = person.industry?.toLowerCase().includes(term)
    
    return matchName || matchCompany || matchSkills || matchIndustry
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alumni Directory</h1>
          <p className="text-white/70 mt-1">Find and connect with alumni in your target industry.</p>
        </div>
        <div className="w-full md:w-72">
          <Input 
            placeholder="Search by name, company, skill..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/10 border-white/20 focus:border-white/40"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="glass-card border-none">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 bg-white/10" />
                <Skeleton className="h-4 w-1/2 bg-white/10 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-5 w-16 bg-white/10" />
                  <Skeleton className="h-5 w-20 bg-white/10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-16 px-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white text-lg">We couldn&apos;t load the alumni directory.</p>
          <p className="text-white/60 mt-2">Please refresh the page and try again.</p>
        </div>
      ) : filteredAlumni.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white/70 text-lg">No alumni found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlumni.map((person) => (
            <Card key={person.user_id} className="glass-card border-none flex flex-col">
              <CardHeader>
                <CardTitle>{person.full_name}</CardTitle>
                <div className="text-sm text-white/70 font-medium">
                  {person.role} {person.company && <span>at <span className="text-white">{person.company}</span></span>}
                </div>
                {person.industry && (
                  <div className="text-xs text-white/50 mt-1">Industry: {person.industry}</div>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {person.bio && (
                  <p className="text-sm text-white/80 line-clamp-3 mb-4">{person.bio}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {person.tech_skills?.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-white/10">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-white/10 flex gap-2">
                <Dialog open={dialogOpen && selectedAlumniId === person.user_id} onOpenChange={(open) => {
                  setDialogOpen(open)
                  if (open) {
                    setSelectedAlumniId(person.user_id)
                    setRequestType('mentorship')
                  } else {
                    setSelectedAlumniId(null)
                  }
                }}>
                  <DialogTrigger render={<Button className="flex-1 bg-white text-black hover:bg-white/90 text-xs sm:text-sm" />}>
                    Mentorship
                  </DialogTrigger>
                  <DialogContent className="glass-card border-none text-white sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Request {requestType === 'mentorship' ? 'Mentorship' : 'Referral'}</DialogTitle>
                      <DialogDescription className="text-white/70">
                        Send a brief message to {person.full_name} for a {requestType}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Textarea
                        placeholder="Hi! I'm interested in..."
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        className="bg-white/10 border-white/20 focus:border-white/40 h-32"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-transparent border-white/20 text-white hover:bg-white/10">
                        Cancel
                      </Button>
                      <Button onClick={handleRequestMentorship} disabled={isSubmitting || !requestMessage.trim()} className="bg-white text-black hover:bg-white/90">
                        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                        {isSubmitting ? 'Sending...' : 'Send Request'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline" 
                  className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs sm:text-sm"
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
          ))}
        </div>
      )}
    </div>
  )
}
