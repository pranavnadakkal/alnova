import { redirect } from 'next/navigation'
import { createSessionClient } from '@/lib/appwrite/server'
import { Query } from 'node-appwrite'
import Sidebar from '@/components/dashboard/Sidebar'
import TopBar from '@/components/dashboard/TopBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  let sessionTables
  try {
    const sessionClient = await createSessionClient()
    const { account } = sessionClient
    sessionTables = sessionClient.tablesDB
    user = await account.get()
  } catch {
    redirect('/login')
  }

  const profiles = await sessionTables.listRows(
    process.env.NEXT_PUBLIC_DATABASE_ID!,
    'profiles',
    [Query.equal('userId', user.$id)],
  )
  const profile = profiles.rows[0]

  if (!profile) {
    redirect('/onboarding')
  }

  const userType = profile.role || 'student'

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar role={userType} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar profile={{ full_name: profile.fullName || profile.full_name, role: userType }} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
