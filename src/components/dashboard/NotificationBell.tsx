'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadNotifications = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        if (active) setIsLoading(false)
        return
      }

      setUserId(user.id)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Failed to load notifications:', error)
      } else if (active) {
        setNotifications((data || []) as Notification[])
      }
      if (active) setIsLoading(false)
    }

    loadNotifications()
    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((current) => [
            payload.new as Notification,
            ...current.filter((notification) => notification.id !== payload.new.id),
          ].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  const markAsRead = async (notification: Notification) => {
    if (!notification.is_read) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id)

      if (error) {
        console.error('Failed to mark notification as read:', error)
        return
      }

      setNotifications((current) =>
        current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item)
      )
    }
    setIsOpen(false)
  }

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Failed to mark notifications as read:', error)
      return
    }

    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })))
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h2>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-[11px] font-semibold text-blue-600 disabled:text-slate-400"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading notifications
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-slate-500">You are all caught up.</p>
            ) : (
              notifications.map((notification) => {
                const content = (
                  <div
                    className={`flex gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 dark:border-slate-800 ${
                      notification.is_read ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/60 dark:bg-blue-950/20'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      notification.is_read ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                    }`}>
                      {notification.is_read ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{notification.content}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )

                return notification.link ? (
                  <Link key={notification.id} href={notification.link} onClick={() => markAsRead(notification)}>
                    {content}
                  </Link>
                ) : (
                  <button key={notification.id} type="button" className="block w-full" onClick={() => markAsRead(notification)}>
                    {content}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
