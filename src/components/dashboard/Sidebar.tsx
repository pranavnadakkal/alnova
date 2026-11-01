'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, MessageSquare, FileText, Settings, ChevronLeft, ChevronRight, Megaphone, GraduationCap, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  role: string
}

const studentNav = [
  { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'Alumni Directory', href: '/alumni', icon: Users },
  { label: 'Session Tracker', href: '/dashboard/student/sessions', icon: GraduationCap },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Profile', href: '/profile', icon: Settings },
]

const alumniNav = [
  { label: 'Dashboard', href: '/alumni-dashboard', icon: LayoutDashboard },
  { label: 'Directory', href: '/directory', icon: Users },
  { label: 'Requests', href: '/requests', icon: FileText },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Profile', href: '/profile', icon: Settings },
]

const teacherNav = [
  { label: 'Dashboard', href: '/teacher-dashboard', icon: LayoutDashboard },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Profile', href: '/profile', icon: Settings },
]

const adminNav = [
  { label: 'Admin Portal', href: '/dashboard/admin', icon: ShieldCheck },
  { label: 'Profile', href: '/profile', icon: Settings },
]

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const navItems = role === 'admin' ? adminNav : role === 'alumni' ? alumniNav : role === 'teacher' ? teacherNav : studentNav

  return (
    <aside
      className={`
        hidden lg:flex flex-col h-full bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-700/50
        transition-all duration-300 ease-in-out relative
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}
      `}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-50 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Logo */}
      <div className={`px-5 py-6 border-b border-slate-100 dark:border-slate-800 ${collapsed ? 'flex justify-center' : ''}`}>
        <Link href={role === 'alumni' ? '/alumni-dashboard' : role === 'teacher' ? '/announcements' : '/student-dashboard'} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/25 flex-shrink-0">
            <span className="text-white font-bold text-sm tracking-tight">A</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">ALNOVA</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 relative
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 dark:bg-blue-400 rounded-r-full" />
              )}
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className={`px-3 py-4 border-t border-slate-100 dark:border-slate-800 ${collapsed ? 'flex justify-center' : ''}`}>
        <Link
          href="/profile"
          title={collapsed ? 'Settings' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
