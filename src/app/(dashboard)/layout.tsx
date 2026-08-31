import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="min-h-16 border-b border-white/10 glass px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <Link href="/dashboard" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            ALNOVA
          </Link>
          <nav aria-label="Dashboard navigation" className="flex items-center gap-3 text-sm font-medium sm:gap-4">
            <Link href="/directory" className="text-white/80 hover:text-white transition-colors">
              Directory
            </Link>
            <Link href="/requests" className="text-white/80 hover:text-white transition-colors">
              Requests
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-sm text-right hidden sm:block">
            <div className="font-medium leading-none">{profile.full_name}</div>
            <div className="text-xs text-white/60 mt-1 capitalize">{profile.role || 'Student'}</div>
          </div>
          <Link href="/profile">
            <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white">
              Profile
            </Button>
          </Link>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  )
}
