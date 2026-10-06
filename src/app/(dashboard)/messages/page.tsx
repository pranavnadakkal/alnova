import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatInterface from '@/components/dashboard/ChatInterface'

export const metadata = {
  title: 'Messages | ALNOVA',
  description: 'Chat with your connections on ALNOVA',
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const userRole = profile.role?.toLowerCase() === 'alumni' ? 'alumni' : 'student'

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Messages</h1>
        <p className="text-slate-500 mt-1">Chat with your ALNOVA connections.</p>
      </div>
      <ChatInterface userId={user.id} userRole={userRole} />
    </div>
  )
}
