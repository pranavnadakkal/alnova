'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clearAppwriteSession } from '@/app/(auth)/actions'
import { account, tablesDB, storage } from '@/lib/appwrite/client'
import { ID, Query } from 'appwrite'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, User, Briefcase, GraduationCap, Link as LinkIcon, Code2, MapPin, Building2, LogOut, CheckCircle2, Camera, Trash2, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'

const profileSchema = z.object({
  full_name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  bio: z.string().optional(),
  company: z.string().optional(),
  job_role: z.string().optional(),
  industry: z.string().min(2, { message: 'Industry is required' }),
  tech_skills: z.string().min(2, { message: 'Please add some skills (comma separated)' }),
  linkedin_url: z.string().url({ message: 'Must be a valid URL' }).optional().or(z.literal('')),
  graduation_year: z.number().min(1950, { message: 'Invalid year' }).max(2030, { message: 'Invalid year' }).optional(),
  target_roles: z.string().optional(),
})

export default function ProfilePage() {
  const router = useRouter()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [profileRecordId, setProfileRecordId] = useState<string | null>(null)
  const [userType, setUserType] = useState<'student' | 'alumni' | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  })

  const initials = watch('full_name')?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'

  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetching(true)
      let user
      try {
      user = await account.get()
      } catch {
      router.push('/login')
      return
      }
      setUserId(user.$id)

      try {
      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
      const profiles = await tablesDB.listRows(databaseId, 'profiles', [
        Query.equal('userId', user.$id),
      ])
      const profile = profiles.rows[0]
      if (!profile) {
        setError('Unable to load your profile. Please refresh the page.')
        setIsFetching(false)
        return
      }
      setProfileRecordId(profile.$id)
      const role = profile.role === 'alumni' ? 'alumni' : 'student'
      setUserType(role)
      const details = await tablesDB.listRows(
        databaseId,
        role === 'alumni' ? 'alumni_profiles' : 'student_profiles',
        [Query.equal('profileId', user.$id)],
      )
      const roleDetails = details.rows[0]
      if (profile) {
        reset({
          full_name: profile.fullName || '',
          bio: profile.bio || '',
          company: roleDetails?.company || profile.company || '',
          job_role: roleDetails?.jobTitle || profile.headline || '',
          industry: roleDetails?.industry || profile.industry || '',
          tech_skills: profile.techSkills?.join(', ') || '',
          linkedin_url: profile.linkedInUrl || '',
          graduation_year: roleDetails?.graduationYear || profile.graduationYear || undefined,
          target_roles: roleDetails?.targetRoles?.join(', ') || profile.targetRoles?.join(', ') || '',
        })
        if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl)
      }
      } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load your profile.'
      setError(message)
      }
      setIsFetching(false)
    }
    
    fetchProfile()
  }, [router, reset])

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    const skillsArray = data.tech_skills.split(',').map(s => s.trim()).filter(Boolean)
    const targetRolesArray = data.target_roles ? data.target_roles.split(',').map(s => s.trim()).filter(Boolean) : []

    try {
      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
      await tablesDB.updateRow(databaseId, 'profiles', profileRecordId || userId, {
        fullName: data.full_name,
        bio: data.bio || null,
        company: data.company || null,
        headline: data.job_role || null,
        industry: data.industry,
        techSkills: skillsArray,
        linkedInUrl: data.linkedin_url || null,
        graduationYear: data.graduation_year || null,
        targetRoles: targetRolesArray,
      })
      if (userType === 'alumni' || userType === 'student') {
        const collectionId = userType === 'alumni' ? 'alumni_profiles' : 'student_profiles'
        const detailResult = await tablesDB.listRows(databaseId, collectionId, [
          Query.equal('profileId', userId),
        ])
        const details = userType === 'alumni'
          ? {
              profileId: userId,
              company: data.company || null,
              jobTitle: data.job_role || null,
              industry: data.industry,
            }
          : {
              profileId: userId,
              major: data.industry,
              graduationYear: data.graduation_year || null,
              targetRoles: targetRolesArray,
            }
        if (detailResult.rows[0]) {
          await tablesDB.updateRow(databaseId, collectionId, detailResult.rows[0].$id, details)
        } else {
          await tablesDB.createRow(databaseId, collectionId, ID.unique(), details)
        }
      }
      toast.success('Profile updated successfully!')
    } catch (profileError) {
      const message = profileError instanceof Error ? profileError.message : 'Unable to update profile.'
      setError(message)
      toast.error('Failed to update profile', { description: message })
    }
    
    setIsLoading(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type', { description: 'Please upload a JPG, PNG, WebP, or GIF image.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size is 5MB.' })
      return
    }

    setIsUploadingAvatar(true)
    try {
      const bucketId = process.env.NEXT_PUBLIC_AVATARS_BUCKET_ID || 'avatars'
      const uploaded = await storage.createFile(bucketId, ID.unique(), file)
      const urlWithCacheBust = `${storage.getFileView(bucketId, uploaded.$id).toString()}?t=${Date.now()}`
      await tablesDB.updateRow(process.env.NEXT_PUBLIC_DATABASE_ID!, 'profiles', profileRecordId || userId, {
        avatarUrl: urlWithCacheBust,
      })
      setAvatarUrl(urlWithCacheBust)
      toast.success('Profile photo updated!')
    } catch (uploadError) {
      toast.error('Failed to save avatar', {
        description: uploadError instanceof Error ? uploadError.message : 'Please try again.',
      })
    }
    setIsUploadingAvatar(false)
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveAvatar = async () => {
    if (!userId) return
    setIsUploadingAvatar(true)

    try {
      await tablesDB.updateRow(process.env.NEXT_PUBLIC_DATABASE_ID!, 'profiles', profileRecordId || userId, {
        avatarUrl: null,
      })
      setAvatarUrl(null)
      toast.success('Profile photo removed')
    } catch (updateError) {
      toast.error('Failed to remove photo', {
        description: updateError instanceof Error ? updateError.message : 'Please try again.',
      })
    }
    setIsUploadingAvatar(false)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await account.deleteSession('current')
      await clearAppwriteSession()
    } catch (error) {
      toast.error('Failed to sign out', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
      setIsSigningOut(false)
      return
    }
    toast.success('Signed out successfully')
    router.push('/login')
  }

  if (isFetching) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Profile Settings</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your personal information and visibility.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleSignOut} 
          disabled={isSigningOut} 
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors bg-white"
        >
          {isSigningOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <div className="px-6 pb-6 pt-0 text-center relative">
              {/* Avatar with Upload Overlay */}
              <div className="relative w-28 h-28 mx-auto -mt-14 mb-4 group">
                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 p-1.5 shadow-lg">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile photo"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 text-3xl font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                {/* Upload Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200 cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* Photo Action Buttons */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="text-xs h-8 px-3 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300"
                >
                  <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
                  {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="text-xs h-8 px-3 border-red-200 text-red-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mb-4">JPG, PNG, WebP or GIF • Max 5MB</p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{watch('full_name') || 'Your Name'}</h2>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 capitalize mb-4">
                {userType} {watch('job_role') ? `• ${watch('job_role')}` : ''}
              </p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-6 bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg w-fit mx-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Profile Active
              </div>
              
              <div className="space-y-3 text-sm text-left">
                {watch('company') && (
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{watch('company')}</span>
                  </div>
                )}
                {watch('industry') && (
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{watch('industry')}</span>
                  </div>
                )}
                {watch('linkedin_url') && (
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                    <LinkIcon className="w-4 h-4 text-slate-400" />
                    <a href={watch('linkedin_url')} target="_blank" rel="noopener noreferrer" className="truncate hover:text-blue-600 hover:underline">
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-5">
                <CardTitle>Edit Information</CardTitle>
                <CardDescription>
                  Ensure your details are up to date to get the best connections.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                {error && (
                  <div className="p-4 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5" />
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-300">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="full_name" 
                      className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                      placeholder="John Doe"
                      {...register('full_name')}
                    />
                  </div>
                  {errors.full_name && <p className="text-xs text-red-500 font-medium">{errors.full_name.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="job_role" className="text-slate-700 dark:text-slate-300">
                      {userType === 'student' ? 'Major / Field of Study' : 'Job Title'}
                    </Label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        id="job_role" 
                        className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                        placeholder={userType === 'student' ? 'Computer Science' : 'Software Engineer'}
                        {...register('job_role')}
                      />
                    </div>
                  </div>

                  {userType === 'alumni' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="company" className="text-slate-700 dark:text-slate-300">Current Company</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          id="company" 
                          className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                          placeholder="Google, Microsoft, etc."
                          {...register('company')}
                        />
                      </div>
                    </div>
                  )}

                  {userType === 'student' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="graduation_year" className="text-slate-700 dark:text-slate-300">Graduation Year</Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          id="graduation_year" 
                          type="number"
                          className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                          placeholder="2024"
                          {...register('graduation_year', { valueAsNumber: true })}
                        />
                      </div>
                      {errors.graduation_year && <p className="text-xs text-red-500 font-medium">{errors.graduation_year.message}</p>}
                    </div>
                  )}
                </div>

                {userType === 'student' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="target_roles" className="text-slate-700 dark:text-slate-300">Target Roles (comma separated)</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        id="target_roles" 
                        className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                        placeholder="Frontend Developer, UX Designer"
                        {...register('target_roles')}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="industry" className="text-slate-700 dark:text-slate-300">Industry</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="industry" 
                      className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                      placeholder="Tech, Finance, Healthcare"
                      {...register('industry')}
                    />
                  </div>
                  {errors.industry && <p className="text-xs text-red-500 font-medium">{errors.industry.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tech_skills" className="text-slate-700 dark:text-slate-300">Skills / Tech Stack (comma separated)</Label>
                  <div className="relative">
                    <Code2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <Textarea 
                      id="tech_skills" 
                      className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 min-h-[80px]"
                      placeholder="React, Node.js, Python, Figma"
                      {...register('tech_skills')}
                    />
                  </div>
                  {errors.tech_skills && <p className="text-xs text-red-500 font-medium">{errors.tech_skills.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="linkedin_url" className="text-slate-700 dark:text-slate-300">LinkedIn URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="linkedin_url" 
                      type="url"
                      className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
                      placeholder="https://linkedin.com/in/username"
                      {...register('linkedin_url')}
                    />
                  </div>
                  {errors.linkedin_url && <p className="text-xs text-red-500 font-medium">{errors.linkedin_url.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-slate-700 dark:text-slate-300">Bio</Label>
                  <Textarea 
                    id="bio" 
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 min-h-[100px]"
                    placeholder="Tell us a bit about yourself..."
                    {...register('bio')}
                  />
                </div>
                
              </CardContent>
              <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-5 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
                <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
