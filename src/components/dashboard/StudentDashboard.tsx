import Link from 'next/link'
import { Users, UserPlus, FileText, ArrowRight, Activity, Zap, Sparkles, TrendingUp, Clock, ExternalLink } from 'lucide-react'
import { ConnectionRequest } from '@/types'

interface StudentDashboardProps {
  profile: any
  requests: any[]
}

export default function StudentDashboard({ profile, requests }: StudentDashboardProps) {
  const allRequests = requests || []

  const stats = [
    {
      label: 'Active Sessions',
      value: allRequests.filter(r => r.type === 'mentorship' && r.status === 'accepted').length,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      trend: '+2 this week'
    },
    {
      label: 'Pending Reviews',
      value: allRequests.filter(r => r.type === 'resume' && r.status === 'pending').length,
      icon: FileText,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      trend: 'Awaiting response'
    },
    {
      label: 'Active Referrals',
      value: allRequests.filter(r => r.type === 'referral' && (r.status === 'pending' || r.status === 'reviewing')).length,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      trend: 'In progress'
    }
  ]

  const quickActions = [
    {
      title: 'Browse Directory',
      description: 'Find and connect with alumni in your field of interest.',
      icon: Users,
      href: '/directory',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      title: 'Manage Requests',
      description: 'View and respond to your connection requests.',
      icon: FileText,
      href: '/requests',
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-500/10',
    },
    {
      title: 'Update Profile',
      description: 'Keep your skills and experience up to date.',
      icon: Sparkles,
      href: '/profile',
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, <span className="text-blue-600 dark:text-blue-400">{profile.full_name?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Ready to take the next step in your career? Connect with alumni who have been in your shoes.
          </p>
        </div>
        <Link
          href="/directory"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-200 whitespace-nowrap"
        >
          Find Alumni
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-600/5 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{stat.trend}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions — 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-600/5 transition-all duration-300 hover:-translate-y-0.5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity — 1 column */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Recent Activity
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            {allRequests.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {allRequests.map((req: ConnectionRequest & { alumni: { full_name: string } | null }) => (
                  <div key={req.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {req.alumni?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {req.type.charAt(0).toUpperCase() + req.type.slice(1)} Request
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${
                        req.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
                        req.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
                        req.status === 'declined' ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
                <Link href="/directory" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 inline-flex items-center gap-1 font-medium">
                  Find someone to connect with
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
