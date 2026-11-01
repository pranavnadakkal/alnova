'use client'

import Link from 'next/link'
import { Search, ChevronDown, Menu, X } from 'lucide-react'
import { useState } from 'react'
import NotificationBell from '@/components/dashboard/NotificationBell'

interface TopBarProps {
  profile: {
    full_name: string
    role?: string
  }
}

export default function TopBar({ profile }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const initials = profile.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/50 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-40">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Logo */}
        <Link href={profile.role === 'alumni' ? '/alumni-dashboard' : profile.role === 'teacher' ? '/announcements' : '/student-dashboard'} className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md shadow-blue-600/20">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="text-base font-bold text-slate-900 dark:text-white">ALNOVA</span>
        </Link>

        {/* Search Bar */}
        <div className="hidden sm:flex flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for people, requests, and more..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-600/20">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{profile.full_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{profile.role || 'Student'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <nav
            className="w-64 h-full bg-white dark:bg-slate-900 shadow-2xl p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-4 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/25">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">ALNOVA</span>
              </div>
            </div>
            {(profile.role === 'admin' ? [
              { label: 'Admin Portal', href: '/dashboard/admin' },
              { label: 'Profile', href: '/profile' },
            ] : profile.role === 'teacher' ? [
              { label: 'Dashboard', href: '/teacher-dashboard' },
              { label: 'Announcements', href: '/announcements' },
              { label: 'Profile', href: '/profile' },
            ] : profile.role === 'alumni' ? [
              { label: 'Dashboard', href: '/alumni-dashboard' },
              { label: 'Directory', href: '/directory' },
              { label: 'Announcements', href: '/announcements' },
              { label: 'Messages', href: '/messages' },
              { label: 'Profile', href: '/profile' },
            ] : [
              { label: 'Dashboard', href: '/student-dashboard' },
              { label: 'Directory', href: '/directory' },
              { label: 'Requests', href: '/requests' },
              { label: 'Announcements', href: '/announcements' },
              { label: 'Messages', href: '/messages' },
              { label: 'Profile', href: '/profile' },
            ]).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
