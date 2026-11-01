'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters' }),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setServerError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setServerError(error.message)
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    toast.success('Successfully logged in!')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const userIdProfile = await supabase
        .from('profiles')
        .select('user_id, role')
        .eq('user_id', user.id)
        .maybeSingle()
      const profile = userIdProfile.data

      if (!profile) {
        router.push('/onboarding')
      } else {
        router.push(
          profile.role === 'alumni'
            ? '/alumni-dashboard'
            : profile.role === 'teacher'
              ? '/announcements'
              : '/student-dashboard'
        )
      }
    } else {
      router.push('/student-dashboard')
    }
  }

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#4361ee] flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-xl tracking-tight">A</span>
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-[28px] font-bold text-[#1a1a2e] text-center mb-1">
        Welcome back!
      </h1>
      <p className="text-[#6b7280] text-sm text-center mb-8">
        Don&apos;t have an account yet?{' '}
        <Link href="/register" className="text-[#4361ee] hover:underline font-medium">
          Sign up now
        </Link>
      </p>

      {/* Server/Auth Error Alert */}
      {serverError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <span className="leading-snug">{serverError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <div className="relative">
            <input
              id="login-email"
              type="email"
              placeholder="Email address"
              autoComplete="email"
              className={cn(
                "w-full h-[52px] px-4 rounded-xl border bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none transition-all",
                errors.email
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  : "border-[#d1d5db] focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee]"
              )}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5 ml-1 flex items-center gap-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              className={cn(
                "w-full h-[52px] px-4 pr-12 rounded-xl border bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none transition-all",
                errors.password
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  : "border-[#d1d5db] focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee]"
              )}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1.5 ml-1 flex items-center gap-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-[#d1d5db] text-[#4361ee] focus:ring-[#4361ee]/30 accent-[#4361ee]"
            />
            <span className="text-sm text-[#374151]">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-[#4361ee] hover:underline font-medium">
            Forgot password?
          </Link>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[48px] rounded-full bg-[#4361ee] text-white text-sm font-semibold hover:bg-[#3a56d4] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4361ee]/25"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Signing in...' : 'Log in'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#e5e7eb]" />
          <span className="text-xs text-[#9ca3af] uppercase tracking-wider font-medium">or</span>
          <div className="flex-1 h-px bg-[#e5e7eb]" />
        </div>

        {/* SSO Link */}
        <div className="text-center">
          <Link href="/sso" className="text-sm text-[#4361ee] hover:underline font-medium">
            Log in with SSO
          </Link>
        </div>
      </form>
    </div>
  )
}
