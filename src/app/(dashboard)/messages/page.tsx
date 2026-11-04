import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createSessionClient } from '@/lib/appwrite/server'
import { Query } from 'node-appwrite'
import ChatInterface from '@/components/dashboard/ChatInterface'

export const metadata = {
  title: 'Messages | ALNOVA',
  description: 'Chat with your connections on ALNOVA',
}

export default async function MessagesPage() {
  let sessionClient
  try {
    sessionClient = await createSessionClient()
  } catch {
    redirect('/login')
  }
  const user = await sessionClient.account.get()

  const profiles = await sessionClient.tablesDB.listRows(
    process.env.NEXT_PUBLIC_DATABASE_ID!,
    'profiles',
    [Query.equal('userId', user.$id)],
  )
  const profile = profiles.rows[0]

  if (!profile) {
    redirect('/onboarding')
  }

  const normalizedRole = profile.role?.toLowerCase()
  const userRole = normalizedRole === 'alumni'
    ? 'alumni'
    : normalizedRole === 'teacher'
      ? 'teacher'
      : 'student'

  if (userRole === 'teacher') {
    redirect('/teacher-dashboard')
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Messages</h1>
        <p className="text-slate-500 mt-1">
          Chat with your ALNOVA connections.
        </p>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading messages...</div>}>
        <ChatInterface userId={user.$id} userRole={userRole} />
      </Suspense>
    </div>
  )
}
