'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const profileSchema = z.object({
  full_name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  bio: z.string().optional(),
  company: z.string().optional(),
  job_role: z.string().optional(),
  industry: z.string().min(2, { message: 'Industry is required' }),
  tech_skills: z.string().min(2, { message: 'Please add some skills (comma separated)' }),
  linkedin_url: z.string().url({ message: 'Must be a valid URL' }).optional().or(z.literal('')),
})

export default function ProfilePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  const [userId, setUserId] = useState<string | null>(null)
  const [userType, setUserType] = useState<'student' | 'alumni' | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetching(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        setError(authError.message)
        setIsFetching(false)
        return
      }
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      
      const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (userError) setError('Unable to load your account details. Please try again.')
      if (userData) {
        setUserType(userData.role)
      }

      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (profileError) setError('Unable to load your profile. Please refresh the page.')
      if (profile) {
        reset({
          full_name: profile.full_name,
          bio: profile.bio || '',
          company: profile.company || '',
          job_role: profile.role || '',
          industry: profile.industry || '',
          tech_skills: profile.tech_skills?.join(', ') || '',
          linkedin_url: profile.linkedin_url || '',
        })
      }
      setIsFetching(false)
    }
    
    fetchProfile()
  }, [router, supabase, reset])

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    const skillsArray = data.tech_skills.split(',').map(s => s.trim()).filter(Boolean)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        bio: data.bio,
        company: data.company,
        role: data.job_role,
        industry: data.industry,
        tech_skills: skillsArray,
        linkedin_url: data.linkedin_url || null
      })
      .eq('user_id', userId)

    if (profileError) {
      setError(profileError.message)
      toast.error('Failed to update profile', { description: profileError.message })
    } else {
      toast.success('Profile updated successfully!')
    }
    
    setIsLoading(false)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Failed to sign out', { description: error.message })
      setIsSigningOut(false)
      return
    }
    toast.success('Signed out successfully')
    router.push('/login')
  }

  if (isFetching) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 bg-white/10" />
          <Skeleton className="h-4 w-96 bg-white/10 mt-2" />
        </div>
        <Card className="glass-card border-none max-w-2xl">
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-20 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-white/70 mt-1">Manage your public information and visibility.</p>
        </div>
        <Button variant="destructive" onClick={handleSignOut} disabled={isSigningOut} className="bg-red-500/80 hover:bg-red-500/100 self-start sm:self-auto">
          {isSigningOut && <Loader2 className="size-4 animate-spin" />}
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>

      <Card className="w-full max-w-2xl glass-card border-none">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription className="text-white/60">
              Update your information below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-3 text-sm bg-destructive/20 text-destructive-foreground rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input 
                id="full_name" 
                className="bg-white/10 border-white/20 focus:border-white/40"
                {...register('full_name')}
              />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="job_role">
                  {userType === 'student' ? 'Major / Field of Study' : 'Job Title'}
                </Label>
                <Input 
                  id="job_role" 
                  className="bg-white/10 border-white/20 focus:border-white/40"
                  {...register('job_role')}
                />
              </div>

              {userType === 'alumni' && (
                <div className="space-y-2">
                  <Label htmlFor="company">Current Company</Label>
                  <Input 
                    id="company" 
                    className="bg-white/10 border-white/20 focus:border-white/40"
                    {...register('company')}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input 
                id="industry" 
                className="bg-white/10 border-white/20 focus:border-white/40"
                {...register('industry')}
              />
              {errors.industry && <p className="text-sm text-destructive">{errors.industry.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tech_skills">Skills / Tech Stack (comma separated)</Label>
              <Input 
                id="tech_skills" 
                className="bg-white/10 border-white/20 focus:border-white/40"
                {...register('tech_skills')}
              />
              {errors.tech_skills && <p className="text-sm text-destructive">{errors.tech_skills.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input 
                id="linkedin_url" 
                type="url"
                className="bg-white/10 border-white/20 focus:border-white/40"
                {...register('linkedin_url')}
              />
              {errors.linkedin_url && <p className="text-sm text-destructive">{errors.linkedin_url.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input 
                id="bio" 
                className="bg-white/10 border-white/20 focus:border-white/40"
                {...register('bio')}
              />
            </div>
            
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="bg-white text-black hover:bg-white/90">
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
