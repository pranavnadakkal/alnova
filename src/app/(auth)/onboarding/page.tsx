'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, GraduationCap, Briefcase, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const onboardingSchema = z.object({
  role: z.enum(['student', 'alumni']),
  full_name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  bio: z.string().optional(),
  company: z.string().optional(),
  job_role: z.string().optional(),
  industry: z.string().min(2, { message: 'Industry is required' }),
  tech_skills: z.string().min(2, { message: 'Please add at least one skill' }),
  linkedin_url: z.string().url({ message: 'Must be a valid URL' }).optional().or(z.literal('')),
})

type FormData = z.infer<typeof onboardingSchema>

const TOTAL_STEPS = 3

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  const { register, handleSubmit, setValue, watch, formState: { errors }, trigger } = useForm<FormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: 'student',
      full_name: '',
      bio: '',
      company: '',
      job_role: '',
      industry: '',
      tech_skills: '',
      linkedin_url: '',
    }
  })

  const selectedRole = watch('role')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('user_id, role').eq('user_id', user.id).single()
      if (profile) {
        router.push(profile.role === 'alumni' ? '/alumni-dashboard' : '/student-dashboard')
      }
    }
    checkUser()
  }, [router, supabase])

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = []

    if (currentStep === 1) {
      fieldsToValidate = ['role']
    } else if (currentStep === 2) {
      fieldsToValidate = ['full_name', 'industry']
      if (selectedRole === 'alumni') {
        fieldsToValidate.push('company', 'job_role')
      } else {
        fieldsToValidate.push('job_role')
      }
    }

    const valid = await trigger(fieldsToValidate)
    if (valid) {
      setDirection('forward')
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
    }
  }

  const prevStep = () => {
    setDirection('backward')
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  const onSubmit = async (data: FormData) => {
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
    router.push(data.role === 'alumni' ? '/alumni-dashboard' : '/student-dashboard')
  }

  const stepLabels = ['Role', 'Details', 'Skills']

  return (
    <div className="w-full max-w-[500px] mx-auto">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#4361ee] flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-xl tracking-tight">A</span>
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-[28px] font-bold text-[#1a1a2e] text-center mb-1">
        Complete your profile
      </h1>
      <p className="text-[#6b7280] text-sm text-center mb-8">
        Tell us about yourself to find the best matches
      </p>

      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-10 px-4">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum === currentStep
          const isComplete = stepNum < currentStep
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-center gap-2">
                {/* Step indicator */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-300 ${
                    isComplete
                      ? 'bg-[#4361ee] text-white shadow-md shadow-[#4361ee]/25'
                      : isActive
                        ? 'bg-[#4361ee] text-white shadow-md shadow-[#4361ee]/25'
                        : 'bg-[#e5e7eb] text-[#9ca3af]'
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                {/* Connecting line */}
                {i < stepLabels.length - 1 && (
                  <div className="flex-1 h-[3px] rounded-full overflow-hidden bg-[#e5e7eb]">
                    <div
                      className="h-full bg-[#4361ee] transition-all duration-500 ease-out rounded-full"
                      style={{ width: isComplete ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
              <span className={`text-[11px] font-medium transition-colors duration-300 ${
                isActive || isComplete ? 'text-[#4361ee]' : 'text-[#9ca3af]'
              }`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="overflow-hidden">
          {/* Step 1: Role Selection */}
          <div
            className={`transition-all duration-400 ease-out ${
              currentStep === 1
                ? 'opacity-100 translate-x-0 h-auto'
                : currentStep > 1
                  ? 'opacity-0 -translate-x-8 h-0 overflow-hidden pointer-events-none'
                  : 'opacity-0 translate-x-8 h-0 overflow-hidden pointer-events-none'
            }`}
          >
            <p className="text-[15px] font-semibold text-[#1a1a2e] mb-1">I am a...</p>
            <p className="text-[13px] text-[#6b7280] mb-5">Choose the role that best describes you</p>

            <div className="grid grid-cols-2 gap-4">
              {/* Student Card */}
              <button
                type="button"
                onClick={() => setValue('role', 'student')}
                className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                  selectedRole === 'student'
                    ? 'border-[#4361ee] bg-[#4361ee]/[0.04] shadow-md shadow-[#4361ee]/10'
                    : 'border-[#e5e7eb] bg-white hover:border-[#c7d0f8] hover:bg-[#f8f9ff]'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors duration-200 ${
                  selectedRole === 'student'
                    ? 'bg-[#4361ee] text-white'
                    : 'bg-[#f0f2ff] text-[#4361ee]'
                }`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <p className="font-semibold text-[15px] text-[#1a1a2e] mb-0.5">Student</p>
                <p className="text-[12px] text-[#6b7280] leading-relaxed">
                  Currently studying or recently graduated
                </p>
                {/* Check indicator */}
                <div className={`absolute top-3.5 right-3.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                  selectedRole === 'student'
                    ? 'bg-[#4361ee] scale-100'
                    : 'bg-[#e5e7eb] scale-90'
                }`}>
                  {selectedRole === 'student' && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>

              {/* Alumni Card */}
              <button
                type="button"
                onClick={() => setValue('role', 'alumni')}
                className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                  selectedRole === 'alumni'
                    ? 'border-[#4361ee] bg-[#4361ee]/[0.04] shadow-md shadow-[#4361ee]/10'
                    : 'border-[#e5e7eb] bg-white hover:border-[#c7d0f8] hover:bg-[#f8f9ff]'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors duration-200 ${
                  selectedRole === 'alumni'
                    ? 'bg-[#4361ee] text-white'
                    : 'bg-[#f0f2ff] text-[#4361ee]'
                }`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <p className="font-semibold text-[15px] text-[#1a1a2e] mb-0.5">Alumni</p>
                <p className="text-[12px] text-[#6b7280] leading-relaxed">
                  Working professional & past graduate
                </p>
                {/* Check indicator */}
                <div className={`absolute top-3.5 right-3.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                  selectedRole === 'alumni'
                    ? 'bg-[#4361ee] scale-100'
                    : 'bg-[#e5e7eb] scale-90'
                }`}>
                  {selectedRole === 'alumni' && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Personal & Professional Info */}
          <div
            className={`transition-all duration-400 ease-out ${
              currentStep === 2
                ? 'opacity-100 translate-x-0 h-auto'
                : currentStep > 2
                  ? 'opacity-0 -translate-x-8 h-0 overflow-hidden pointer-events-none'
                  : 'opacity-0 translate-x-8 h-0 overflow-hidden pointer-events-none'
            }`}
          >
            <p className="text-[15px] font-semibold text-[#1a1a2e] mb-1">Personal details</p>
            <p className="text-[13px] text-[#6b7280] mb-5">
              {selectedRole === 'student'
                ? 'Tell us about yourself and your studies'
                : 'Tell us about yourself and your career'}
            </p>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="onb-name" className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="onb-name"
                  type="text"
                  placeholder="John Doe"
                  className="w-full h-[48px] px-4 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all"
                  {...register('full_name')}
                />
                {errors.full_name && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.full_name.message}</p>}
              </div>

              {/* Conditional fields based on role */}
              {selectedRole === 'student' ? (
                <div>
                  <label htmlFor="onb-major" className="block text-[13px] font-medium text-[#374151] mb-1.5">
                    Major / Field of Study
                  </label>
                  <input
                    id="onb-major"
                    type="text"
                    placeholder="e.g. Computer Science"
                    className="w-full h-[48px] px-4 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all"
                    {...register('job_role')}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="onb-company" className="block text-[13px] font-medium text-[#374151] mb-1.5">
                      Company
                    </label>
                    <input
                      id="onb-company"
                      type="text"
                      placeholder="e.g. Google"
                      className="w-full h-[48px] px-4 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all"
                      {...register('company')}
                    />
                  </div>
                  <div>
                    <label htmlFor="onb-jobtitle" className="block text-[13px] font-medium text-[#374151] mb-1.5">
                      Job Title
                    </label>
                    <input
                      id="onb-jobtitle"
                      type="text"
                      placeholder="e.g. Software Engineer"
                      className="w-full h-[48px] px-4 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all"
                      {...register('job_role')}
                    />
                  </div>
                </div>
              )}

              {/* Industry */}
              <div>
                <label htmlFor="onb-industry" className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  {selectedRole === 'student' ? 'Target Industry' : 'Industry'} <span className="text-red-400">*</span>
                </label>
                <input
                  id="onb-industry"
                  type="text"
                  placeholder="e.g. Tech, Finance, Healthcare"
                  className="w-full h-[48px] px-4 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all"
                  {...register('industry')}
                />
                {errors.industry && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.industry.message}</p>}
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="onb-bio" className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  Short Bio <span className="text-[#9ca3af] font-normal">(optional)</span>
                </label>
                <textarea
                  id="onb-bio"
                  rows={3}
                  placeholder="Tell us a little bit about yourself..."
                  className="w-full px-4 py-3 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all resize-none"
                  {...register('bio')}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Skills & Links */}
          <div
            className={`transition-all duration-400 ease-out ${
              currentStep === 3
                ? 'opacity-100 translate-x-0 h-auto'
                : currentStep > 3
                  ? 'opacity-0 -translate-x-8 h-0 overflow-hidden pointer-events-none'
                  : 'opacity-0 translate-x-8 h-0 overflow-hidden pointer-events-none'
            }`}
          >
            <p className="text-[15px] font-semibold text-[#1a1a2e] mb-1">Skills & links</p>
            <p className="text-[13px] text-[#6b7280] mb-5">Help us match you with the right people</p>

            <div className="space-y-4">
              {/* Skills */}
              <div>
                <label htmlFor="onb-skills" className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#4361ee]" />
                    Skills / Tech Stack <span className="text-red-400">*</span>
                  </span>
                </label>
                <textarea
                  id="onb-skills"
                  rows={3}
                  placeholder="e.g. React, Python, Data Analysis, Machine Learning"
                  className="w-full px-4 py-3 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all resize-none"
                  {...register('tech_skills')}
                />
                <p className="text-[11px] text-[#9ca3af] mt-1 ml-1">Separate skills with commas</p>
                {errors.tech_skills && <p className="text-xs text-red-500 mt-1 ml-1">{errors.tech_skills.message}</p>}
              </div>

              {/* LinkedIn */}
              <div>
                <label htmlFor="onb-linkedin" className="block text-[13px] font-medium text-[#374151] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#0a66c2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn Profile <span className="text-[#9ca3af] font-normal">(optional)</span>
                  </span>
                </label>
                <input
                  id="onb-linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  className="w-full h-[48px] px-4 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all"
                  {...register('linkedin_url')}
                />
                {errors.linkedin_url && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.linkedin_url.message}</p>}
              </div>

              {/* Summary preview */}
              <div className="mt-2 p-4 rounded-xl bg-[#f0f2ff] border border-[#4361ee]/10">
                <p className="text-[12px] font-semibold text-[#4361ee] mb-2 uppercase tracking-wider">Profile Preview</p>
                <div className="space-y-1.5">
                  <p className="text-[13px] text-[#374151]">
                    <span className="text-[#6b7280]">Role:</span>{' '}
                    <span className="font-medium capitalize">{selectedRole}</span>
                  </p>
                  <p className="text-[13px] text-[#374151]">
                    <span className="text-[#6b7280]">Name:</span>{' '}
                    <span className="font-medium">{watch('full_name') || '—'}</span>
                  </p>
                  <p className="text-[13px] text-[#374151]">
                    <span className="text-[#6b7280]">Industry:</span>{' '}
                    <span className="font-medium">{watch('industry') || '—'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3 mt-8">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="h-[48px] px-5 rounded-full border border-[#d1d5db] bg-white text-[#374151] text-sm font-semibold hover:bg-[#f9fafb] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 h-[48px] rounded-full bg-[#4361ee] text-white text-sm font-semibold hover:bg-[#3a56d4] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4361ee]/25"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-[48px] rounded-full bg-[#4361ee] text-white text-sm font-semibold hover:bg-[#3a56d4] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4361ee]/25"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Creating profile...' : 'Complete Profile'}
            </button>
          )}
        </div>

        {/* Step counter */}
        <p className="text-center text-[12px] text-[#9ca3af] mt-4">
          Step {currentStep} of {TOTAL_STEPS}
        </p>
      </form>
    </div>
  )
}
