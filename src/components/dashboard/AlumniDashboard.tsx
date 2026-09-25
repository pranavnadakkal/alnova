import Link from 'next/link'
import { Users, UserPlus, FileText, ArrowRight, Activity, Zap, Sparkles } from 'lucide-react'
import { ConnectionRequest } from '@/types'

interface AlumniDashboardProps {
  profile: any
  requests: any[]
}

export default function AlumniDashboard({ profile, requests }: AlumniDashboardProps) {
  // Calculate stats
  const allRequests = requests || []
  const pendingRequests = allRequests.filter(r => r.status === 'pending').length
  const acceptedRequests = allRequests.filter(r => r.status === 'accepted' || r.status === 'completed').length

  const stats = [
    {
      label: 'Active Mentees',
      value: acceptedRequests,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10'
    },
    {
      label: 'Pending Requests',
      value: pendingRequests,
      icon: UserPlus,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10'
    },
    {
      label: 'Profile Views',
      value: '—',
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10'
    }
  ]

  const quickActions = [
    {
      title: 'Manage Requests',
      description: 'Review and respond to connection requests from students.',
      icon: FileText,
      href: '/requests',
      gradient: 'from-purple-600/20 to-pink-600/20',
      border: 'border-purple-500/20',
      hover: 'hover:border-purple-500/40 hover:shadow-purple-500/10'
    },
    {
      title: 'Update Profile',
      description: 'Keep your skills and experience up to date to attract mentees.',
      icon: Sparkles,
      href: '/profile',
      gradient: 'from-emerald-600/20 to-teal-600/20',
      border: 'border-emerald-500/20',
      hover: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10'
    }
  ]

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 border border-black/5 dark:border-white/10 glass shadow-xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">{profile.full_name?.split(' ')[0] || 'User'}</span>!
          </h1>
          <p className="text-slate-600 dark:text-white/70 text-lg max-w-2xl">
            Thanks for giving back to the community! Check out who's looking for your guidance today.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-2xl p-6 border border-black/5 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/[0.07] transition-all glass-card flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-white/60">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <Link 
                key={i} 
                href={action.href}
                className={`group block p-6 rounded-2xl border bg-white/40 dark:bg-black/20 ${action.border} ${action.hover} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl backdrop-blur-md relative overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-50 dark:opacity-100 mix-blend-multiply dark:mix-blend-normal`} />
                <div className="absolute top-4 right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10">
                  <ArrowRight className="w-5 h-5 text-slate-600 dark:text-white/70" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center mb-4 border border-black/5 dark:border-white/10 group-hover:scale-110 transition-transform duration-300 z-10 relative shadow-sm">
                  <action.icon className="w-6 h-6 text-slate-700 dark:text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-blue-700 dark:group-hover:text-white transition-colors z-10 relative">{action.title}</h3>
                <p className="text-sm text-slate-600 dark:text-white/70 z-10 relative">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            Recent Activity
          </h2>
          <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden glass-card">
            {allRequests.length > 0 ? (
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {allRequests.map((req: ConnectionRequest & { student: { full_name: string } | null }) => {
                  return (
                    <div key={req.id} className="p-4 hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                            {req.student?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                            {req.type.charAt(0).toUpperCase() + req.type.slice(1)} Request
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-wider ${
                          req.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                          req.status === 'pending' ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                          req.status === 'declined' ? 'bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                          'bg-slate-500/10 text-slate-700 dark:bg-white/10 dark:text-white/70'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-white/40 mt-3 flex items-center gap-1">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-white/50 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 shadow-sm border border-black/5 dark:border-white/10">
                  <Activity className="w-5 h-5 text-slate-400 dark:text-white/40" />
                </div>
                <p className="text-sm text-slate-500 dark:text-white/60">No recent activity</p>
                <Link href="/requests" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 inline-block font-medium">
                  Check your requests
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
