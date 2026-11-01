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

const registerSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z
    .string()
    .min(1, { message: 'Please confirm your password' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setServerError(null)
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) {
      setServerError(error.message)
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    toast.success('Registration successful! Please check your email.')
    setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-[420px] mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#4361ee] flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-xl tracking-tight">A</span>
          </div>
        </div>

        {/* Success icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-[28px] font-bold text-[#1a1a2e] text-center mb-2">
          Check your email
        </h1>
        <p className="text-[#6b7280] text-sm text-center mb-8 leading-relaxed max-w-[340px] mx-auto">
          We&apos;ve sent a verification link to your email address. Please verify your account to continue.
        </p>

        <button
          onClick={() => router.push('/login')}
          className="w-full h-[48px] rounded-full border border-[#d1d5db] bg-white text-[#374151] text-sm font-semibold hover:bg-[#f9fafb] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Back to login
        </button>
      </div>
    )
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
        Create your account
      </h1>
      <p className="text-[#6b7280] text-sm text-center mb-8">
        Already have an account?{' '}
        <Link href="/login" className="text-[#4361ee] hover:underline font-medium">
          Sign in
        </Link>
      </p>

      {/* Server error alert */}
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
              id="register-email"
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
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="new-password"
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
          {!errors.password && (
            <p className="text-xs text-[#9ca3af] mt-1.5 ml-1">Must be at least 6 characters</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <div className="relative">
            <input
              id="register-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm password"
              autoComplete="new-password"
              className={cn(
                "w-full h-[52px] px-4 pr-12 rounded-xl border bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none transition-all",
                errors.confirmPassword
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  : "border-[#d1d5db] focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee]"
              )}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1.5 ml-1 flex items-center gap-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms */}
        <p className="text-xs text-[#9ca3af] text-center leading-relaxed">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-[#4361ee] hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-[#4361ee] hover:underline">Privacy Policy</Link>
        </p>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[48px] rounded-full bg-[#4361ee] text-white text-sm font-semibold hover:bg-[#3a56d4] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4361ee]/25"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
