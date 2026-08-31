'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
})

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    toast.success('Successfully logged in!')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('user_id').eq('user_id', user.id).single()
      if (!profile) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
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

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <div className="relative">
            <input
              id="login-email"
              type="email"
              placeholder="Email address"
              autoComplete="email"
              className="w-full h-[52px] px-4 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full h-[52px] px-4 pr-12 rounded-xl border border-[#d1d5db] bg-white text-[#1a1a2e] placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]/30 focus:border-[#4361ee] transition-all"
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
          {errors.password && <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.password.message}</p>}
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
