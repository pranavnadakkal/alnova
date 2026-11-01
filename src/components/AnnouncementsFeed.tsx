'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar,
  Megaphone,
  User,
  Building2,
  Clock,
  Inbox,
} from 'lucide-react'

interface AnnouncementRow {
  id: string
  author_id: string
  title: string
  content: string
  poster_url: string | null
  priority?: 'normal' | 'important' | 'urgent' | null
  event_date: string | null
  created_at: string
  author: { full_name: string } | null
  teacher_details: { department: string | null; title: string | null } | null
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------
function AnnouncementSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="py-14 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
        <Inbox className="w-7 h-7 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        No announcements yet
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
        Announcements from your teachers and department will appear here. Stay tuned!
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function relativeTime(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AnnouncementsFeed() {
  const supabase = useMemo(() => createClient(), [])
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAnnouncements() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching announcements:', error)
        } else {
          const authorIds = Array.from(new Set((data || []).map((announcement) => announcement.author_id)))
          const { data: profiles } = authorIds.length
            ? await supabase.from('profiles').select('id, full_name').in('id', authorIds)
            : { data: [] }
          const profileMap = new Map(
            (profiles || []).map((profile) => [profile.id, { full_name: profile.full_name }])
          )
          setAnnouncements(
            ((data || []) as unknown as AnnouncementRow[]).map((announcement) => ({
              ...announcement,
              author: profileMap.get(announcement.author_id) || null,
            }))
          )
        }
      } catch (err) {
        console.error('Failed to load announcements:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnnouncements()
  }, [supabase])

  return (
    <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            Announcements
          </CardTitle>
          {!isLoading && announcements.length > 0 && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800 uppercase tracking-wider">
              {announcements.length} new
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {isLoading ? (
          <AnnouncementSkeleton />
        ) : announcements.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="group relative p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-rose-200 dark:hover:border-rose-800/50 hover:bg-white dark:hover:bg-slate-800/60 transition-all duration-200"
              >
                {/* Event Date Banner */}
                {announcement.event_date && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200/60 dark:border-indigo-800/50">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                        Event date and time
                      </p>
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        {formatEventDate(announcement.event_date)}
                      </p>
                    </div>
                  </div>
                )}

                {announcement.priority && announcement.priority !== 'normal' && (
                  <div className={`mb-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    announcement.priority === 'urgent'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}>
                    {announcement.priority}
                  </div>
                )}

                {/* Title */}
                {announcement.poster_url && (
                  <img
                    src={announcement.poster_url}
                    alt=""
                    className="mb-4 max-h-72 w-full rounded-xl object-cover"
                  />
                )}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                  {announcement.title}
                </h3>

                {/* Content */}
                <div className="mt-4 rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    More details
                  </p>
                  <p className="whitespace-pre-wrap text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {announcement.content}
                  </p>
                </div>

                {/* Footer: Author & Timestamp */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/50 dark:to-pink-900/50 flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {announcement.author?.full_name || 'Admin'}
                      </span>
                      {announcement.teacher_details?.department && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                          <Building2 className="w-2.5 h-2.5" />
                          {announcement.teacher_details.department}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {relativeTime(announcement.created_at)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
