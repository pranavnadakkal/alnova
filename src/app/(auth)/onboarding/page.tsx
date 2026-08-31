'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const onboardingSchema = z.object({
  role: z.enum(['student', 'alumni']),
  full_name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  bio: z.string().optional(),
  company: z.string().optional(),
  job_role: z.string().optional(),
  industry: z.string().min(2, { message: 'Industry is required' }),
  tech_skills: z.string().min(2, { message: 'Please add some skills (comma separated)' }),
  linkedin_url: z.string().url({ message: 'Must be a valid URL' }).optional().or(z.literal('')),
})

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: 'student',
    }
  })

  const [selectedRole, setSelectedRole] = useState<'student' | 'alumni'>('student')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      
      const { data: profile } = await supabase.from('profiles').select('user_id').eq('user_id', user.id).single()
      if (profile) {
        router.push('/dashboard')
      }
    }
    checkUser()
  }, [router, supabase])

  const onSubmit = async (data: z.infer<typeof onboardingSchema>) => {
    if (!userId) return
    
    setIsLoading(true)
    
    const skillsArray = data.tech_skills.split(',').map(s => s.trim()).filter(Boolean)

    if (data.role === 'alumni') {
      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'alumni' })
        .eq('id', userId)
      
      if (roleError) {
        toast.error("Error updating user role: " + roleError.message)
        setIsLoading(false)
        return
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        full_name: data.full_name,
        bio: data.bio,
        company: data.role === 'alumni' ? data.company : null,
        role: data.job_role,
        industry: data.industry,
        tech_skills: skillsArray,
        linkedin_url: data.linkedin_url || null
      })

    if (profileError) {
      toast.error(profileError.message)
      setIsLoading(false)
      return
    }

    toast.success('Profile created successfully!')
    router.push('/dashboard')
  }

  return (
    <Card className="w-full max-w-xl glass-card border-none my-8 mx-4 sm:mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Complete your profile
        </CardTitle>
        <CardDescription className="text-center text-white/70">
          Tell us about yourself to help us find the best matches
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>I am a...</Label>
            <Select onValueChange={(value) => {
              if (value !== 'student' && value !== 'alumni') return
              setValue('role', value)
              setSelectedRole(value)
            }} defaultValue="student">
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input 
              id="full_name" 
              className="bg-white/10 border-white/20 focus:border-white/40"
              {...register('full_name')}
            />
            {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedRole === 'student' ? (
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <Label htmlFor="job_role">Major / Field of Study</Label>
                <Input 
                  id="job_role" 
                  placeholder="e.g. Computer Science"
                  className="bg-white/10 border-white/20 focus:border-white/40"
                  {...register('job_role')}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company">Current Company</Label>
                  <Input 
                    id="company" 
                    placeholder="e.g. Google"
                    className="bg-white/10 border-white/20 focus:border-white/40"
                    {...register('company')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_role">Job Title</Label>
                  <Input 
                    id="job_role" 
                    placeholder="e.g. Software Engineer"
                    className="bg-white/10 border-white/20 focus:border-white/40"
                    {...register('job_role')}
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">{selectedRole === 'student' ? 'Target Industry' : 'Industry'}</Label>
            <Input 
              id="industry" 
              placeholder="e.g. Tech, Finance, Healthcare"
              className="bg-white/10 border-white/20 focus:border-white/40"
              {...register('industry')}
            />
            {errors.industry && <p className="text-sm text-destructive">{errors.industry.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tech_skills">Skills / Tech Stack (comma separated)</Label>
            <Input 
              id="tech_skills" 
              placeholder="e.g. React, Python, Data Analysis"
              className="bg-white/10 border-white/20 focus:border-white/40"
              {...register('tech_skills')}
            />
            {errors.tech_skills && <p className="text-sm text-destructive">{errors.tech_skills.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL (Optional)</Label>
            <Input 
              id="linkedin_url" 
              type="url"
              placeholder="https://linkedin.com/in/username"
              className="bg-white/10 border-white/20 focus:border-white/40"
              {...register('linkedin_url')}
            />
            {errors.linkedin_url && <p className="text-sm text-destructive">{errors.linkedin_url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Short Bio (Optional)</Label>
            <Input 
              id="bio" 
              placeholder="Tell us a little bit about yourself"
              className="bg-white/10 border-white/20 focus:border-white/40"
              {...register('bio')}
            />
          </div>

        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : 'Complete Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
