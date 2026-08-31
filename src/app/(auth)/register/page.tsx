'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    setIsLoading(true)
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) {
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
      <Card className="w-full max-w-md glass-card border-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">
            Check your email
          </CardTitle>
          <CardDescription className="text-center text-white/70">
            We&apos;ve sent a verification link to your email address. Please verify to continue.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" className="w-full bg-white/5 border-white/20 hover:bg-white/10" onClick={() => router.push('/login')}>
            Back to login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md glass-card border-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Create an account
        </CardTitle>
        <CardDescription className="text-center text-white/70">
          Enter your details below to create your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="m@example.com" 
              className="bg-white/10 border-white/20 focus:border-white/40"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              className="bg-white/10 border-white/20 focus:border-white/40"
              {...register('password')}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              className="bg-white/10 border-white/20 focus:border-white/40"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
          <div className="text-center text-sm text-white/70">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
