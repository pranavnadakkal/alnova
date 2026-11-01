'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setServerError(null)
    
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setServerError(error.message)
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    toast.success('Password reset link sent! Please check your email.')
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
          We&apos;ve sent a password reset link to your email address. Please click the link to reset your password.
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
        Reset your password
      </h1>
      <p className="text-[#6b7280] text-sm text-center mb-8">
        Enter your email address and we&apos;ll send you a link to reset your password.
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
              id="reset-email"
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

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[48px] rounded-full bg-[#4361ee] text-white text-sm font-semibold hover:bg-[#3a56d4] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4361ee]/25"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Sending link...' : 'Send reset link'}
        </button>

        {/* Back to login */}
        <div className="text-center pt-2">
          <Link href="/login" className="text-sm text-[#4361ee] hover:underline font-medium">
            Back to login
          </Link>
        </div>
      </form>
    </div>
  )
}
