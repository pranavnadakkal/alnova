'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { client, tablesDB } from '@/lib/appwrite/client'
import { APPWRITE_TABLE_IDS } from '@/lib/appwrite/tables'
import { Query } from 'appwrite'
import { getOrCreateConversation, sendChatMessage } from '@/app/(dashboard)/messages/actions'
import { Profile } from '@/types'
import {
  Search,
  Send,
  Loader2,
  MessageSquare,
  CheckCheck,
  Sparkles,
  Circle,
  Clock,
  RotateCcw,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ChatInterfaceProps {
  userId: string
  userRole: 'student' | 'alumni' | 'teacher'
}

interface ConnectedUser {
  profile: Profile
  conversationId?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
}

interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  isOptimistic?: boolean
  error?: boolean
}

export default function ChatInterface({ userId, userRole }: ChatInterfaceProps) {
  const searchParams = useSearchParams()
  const targetAlumniId = searchParams.get('alumniId')
  const targetConvId = searchParams.get('conversationId')

  const [connections, setConnections] = useState<ConnectedUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeConnection, setActiveConnection] = useState<ConnectedUser | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }, 50)
  }, [])

  // 1. Fetch conversations and connected users
  useEffect(() => {
    const fetchConnections = async () => {
      setIsLoading(true)
      try {
        const idField = userRole === 'alumni' ? 'alumniId' : 'studentId'
        const otherIdField = userRole === 'alumni' ? 'studentId' : 'alumniId'

        let connectedIds: string[]
        if (userRole === 'teacher') {
          const alumniProfiles = await tablesDB.listRows(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            'profiles',
            [Query.equal('role', 'alumni')],
          )
          connectedIds = alumniProfiles.rows
            .map((profile) => profile.userId as string)
            .filter(Boolean)
        } else {
          const [requests, sessions] = await Promise.all([
            tablesDB.listRows(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              'requests',
              [Query.equal(idField, userId)],
            ),
            tablesDB.listRows(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              'mentorship_sessions',
              [Query.equal(idField, userId)],
            ),
          ])

          connectedIds = Array.from(
            new Set([
              ...requests.rows.map((r) => r[otherIdField] as string),
              ...sessions.rows.map((s) => s[otherIdField] as string),
              ...(targetAlumniId ? [targetAlumniId] : []),
            ])
          ).filter(Boolean)
        }

        // If targetAlumniId is present but not in connectedIds, include it
        if (userRole !== 'teacher' && targetAlumniId && !connectedIds.includes(targetAlumniId)) {
          connectedIds.push(targetAlumniId)
        }

        // Fetch profiles
        let profiles: Record<string, unknown>[] = []
        if (connectedIds.length > 0) {
          const userIdProfiles = await tablesDB.listRows(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            'profiles',
            [Query.equal('userId', connectedIds)],
          )
          profiles = userIdProfiles.rows

        }

        // Fetch existing conversations
        const conversations = targetAlumniId || targetConvId
          ? await tablesDB.listRows(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              'conversations',
              [Query.equal(idField, userId)],
            )
          : { rows: [] }

        // Fetch last message preview for each conversation
        const convIds = conversations.rows.map((c) => c.$id)
        const lastMessagesMap = new Map<string, { content: string; time: string }>()

        if (convIds.length > 0) {
          const recentMsgs = await tablesDB.listRows(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            'messages',
            [Query.equal('conversationId', convIds), Query.orderDesc('$createdAt')],
          )
          if (recentMsgs.rows) {
            recentMsgs.rows.forEach((m) => {
              const conversationId = m.conversationId as string
              if (!lastMessagesMap.has(conversationId)) {
                lastMessagesMap.set(conversationId, {
                  content: m.content,
                  time: m.$createdAt,
                })
              }
            })
          }
        }

        const uniqueProfiles = Array.from(
          new Map(profiles.map((p) => [p.userId || p.user_id || p.id, p])).values(),
        )
        const list: ConnectedUser[] = uniqueProfiles.map((p) => {
          const profile: Profile = {
            user_id: String(p.userId || p.user_id || p.id || ''),
            full_name: String(p.fullName || p.full_name || 'Unknown user'),
            role: typeof p.role === 'string' ? p.role : undefined,
            company: typeof p.company === 'string' ? p.company : undefined,
            avatar_url: typeof p.avatarUrl === 'string' ? p.avatarUrl : undefined,
            tech_skills: Array.isArray(p.techSkills) ? p.techSkills as string[] : [],
          }
          const conv = conversations.rows.find((c) => c[otherIdField] === profile.user_id)
          const lastMsg = conv?.$id ? lastMessagesMap.get(conv.$id) : undefined
          return {
            profile,
            conversationId: conv?.$id,
            lastMessage: lastMsg?.content,
            lastMessageTime: lastMsg?.time,
          }
        })

        // Sort by most recent message
        list.sort((a, b) => {
          const tA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
          const tB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
          return tB - tA
        })

        setConnections(list)

        // Auto-select if URL params specify
        if (targetAlumniId) {
          const found = list.find((c) => c.profile.user_id === targetAlumniId)
          if (found) {
            handleSelectConnection(found)
          }
        } else if (targetConvId) {
          const found = list.find((c) => c.conversationId === targetConvId)
          if (found) {
            handleSelectConnection(found)
          }
        }
      } catch (err) {
        console.error('Failed to load chat connections:', err)
        toast.error('Failed to load conversations.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConnections()
  }, [userId, userRole, targetAlumniId, targetConvId])

  // 2. Fetch messages & subscribe to Realtime channel
  useEffect(() => {
    if (!userId || !activeConnection?.conversationId) {
      return
    }

    const conversationId = activeConnection.conversationId

    const fetchMessages = async () => {
      try {
        const result = await tablesDB.listRows(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          'messages',
          [Query.equal('conversationId', conversationId), Query.orderAsc('$createdAt')],
        )
        setMessages(result.rows.map((message) => ({
          id: message.$id,
          conversation_id: message.conversationId,
          sender_id: message.senderId,
          content: message.content,
          created_at: message.$createdAt,
        })))
        scrollToBottom(false)
      } catch {
        toast.error('Failed to load message history.')
      }
    }

    fetchMessages()

    // Realtime channel subscription
    const unsubscribe = client.subscribe(
      [`tablesdb.${process.env.NEXT_PUBLIC_DATABASE_ID}.tables.${APPWRITE_TABLE_IDS.messages}.rows`],
      (event) => {
          const item = event.payload as Record<string, unknown>
          if (item.conversationId !== conversationId || event.events.every((name) => !name.endsWith('.create'))) return
          const newMsg: ChatMessage = {
            id: String(item.$id),
            conversation_id: String(item.conversationId),
            sender_id: String(item.senderId),
            content: String(item.content),
            created_at: String(item.$createdAt),
          }
          setMessages((prev) => {
            // Replace optimistic message if match found
            const hasOptimistic = prev.some(
              (m) => m.isOptimistic && m.content === newMsg.content && m.sender_id === newMsg.sender_id
            )
            if (hasOptimistic) {
              return prev.map((m) =>
                m.isOptimistic && m.content === newMsg.content ? newMsg : m
              )
            }
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom(true)
      },
    )

    return () => {
      unsubscribe()
    }
  }, [userId, activeConnection?.conversationId, scrollToBottom])

  // Select connection and ensure conversation exists in DB
  async function handleSelectConnection(conn: ConnectedUser) {
    const currentConn = { ...conn }

    if (!currentConn.conversationId) {
      try {
        currentConn.conversationId = await getOrCreateConversation(currentConn.profile.user_id)

        setConnections((prev) =>
          prev.map((c) => (c.profile.user_id === currentConn.profile.user_id ? currentConn : c))
        )
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
            ? err.message
            : 'Unable to start this conversation.'
        console.error('Failed to initialize conversation:', {
          code: err && typeof err === 'object' && 'code' in err ? err.code : undefined,
          message,
          details: err && typeof err === 'object' && 'details' in err ? err.details : undefined,
        })
        toast.error('Could not start conversation.', {
          description: message,
        })
        return
      }
    }

    setActiveConnection(currentConn)
  }

  // 3. Send message with Optimistic UI updates
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() || !activeConnection?.conversationId || !userId) return

    const content = newMessage.trim()
    const tempId = `optimistic-${Date.now()}`
    const conversationId = activeConnection.conversationId

    // Optimistic message object
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    }

    // Update UI immediately
    setMessages((prev) => [...prev, optimisticMsg])
    setNewMessage('')
    setIsSending(true)
    scrollToBottom(true)

    // Update last message preview in left pane
    setConnections((prev) =>
      prev.map((c) =>
        c.conversationId === conversationId
          ? { ...c, lastMessage: content, lastMessageTime: optimisticMsg.created_at }
          : c
      )
    )

    try {
      const data = await sendChatMessage({ conversationId, content })

      // Replace optimistic message with confirmed row
      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? {
            id: data.$id,
            conversation_id: data.conversationId,
            sender_id: data.senderId,
            content: data.content,
            created_at: data.$createdAt,
            isOptimistic: false,
          } : m))
        )
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error('Failed to send message.')
      // Mark optimistic message with error
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, error: true } : m))
      )
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    }

    const handleRetryMessage = (message: ChatMessage) => {
      setMessages((prev) => prev.filter((item) => item.id !== message.id))
      setNewMessage(message.content)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }

    const handleDismissMessage = (messageId: string) => {
      setMessages((prev) => prev.filter((message) => message.id !== messageId))
  }

  const filteredConnections = connections.filter((c) => {
    const term = searchQuery.toLowerCase()
    return (
      !term ||
      c.profile.full_name.toLowerCase().includes(term) ||
      c.profile.company?.toLowerCase().includes(term) ||
      c.profile.role?.toLowerCase().includes(term)
    )
  })

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatConversationDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24))

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-xs text-slate-400">Loading your conversations...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      {/* =========================================
          LEFT PANE: Conversations List
         ========================================= */}
      <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Messages
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {connections.length} {connections.length === 1 ? 'chat' : 'chats'}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConnections.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {connections.length === 0 ? 'No connections yet' : 'No matching chats'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                {connections.length === 0
                  ? userRole === 'teacher'
                    ? 'No alumni have registered yet.'
                    : 'Connect with alumni mentors in the directory to begin chatting.'
                  : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            filteredConnections.map((conn) => {
              const isActive = activeConnection?.profile.user_id === conn.profile.user_id
              const initials = conn.profile.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'AL'

              return (
                <button
                  key={conn.profile.user_id}
                  onClick={() => handleSelectConnection(conn)}
                  className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all text-left group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'hover:bg-white dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xs shadow-sm transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {conn.profile.avatar_url ? (
                        <img
                          src={conn.profile.avatar_url}
                          alt={conn.profile.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                  </div>

                  {/* Info & Last message */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold truncate ${
                          isActive ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {conn.profile.full_name}
                      </span>
                      {conn.lastMessageTime && (
                        <span
                          className={`text-[10px] shrink-0 font-medium ${
                            isActive ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {formatConversationDate(conn.lastMessageTime)}
                        </span>
                      )}
                    </div>

                    <div
                      className={`text-[11px] truncate font-medium ${
                        isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {conn.profile.role}
                      {conn.profile.company && ` • ${conn.profile.company}`}
                    </div>

                    <div
                      className={`text-[11px] truncate leading-tight pt-0.5 ${
                        isActive ? 'text-blue-100/90' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {conn.lastMessage ? conn.lastMessage : 'Start conversation...'}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* =========================================
          RIGHT PANE: Active Chat Stream
         ========================================= */}
      <main className="flex-1 flex flex-col bg-white dark:bg-slate-950 min-w-0">
        {activeConnection ? (
          <>
            {/* Top Chat Header */}
            <header className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center font-bold text-xs text-blue-700 dark:text-blue-300 shrink-0">
                  {activeConnection.profile.avatar_url ? (
                    <img
                      src={activeConnection.profile.avatar_url}
                      alt={activeConnection.profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {activeConnection.profile.full_name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'AL'}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {activeConnection.profile.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                    <span>{activeConnection.profile.role || 'Alumni Mentor'}</span>
                    {activeConnection.profile.company && (
                      <span>• {activeConnection.profile.company}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                  Realtime Active
                </span>
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-slate-50/30 dark:bg-slate-950">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-16">
                  <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="text-center max-w-sm">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Start your conversation with {activeConnection.profile.full_name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Ask about their experience, request mentorship feedback, or follow up on scheduling.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === userId

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
                    >
                      <div
                        className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm space-y-1 ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-800 rounded-bl-xs'
                        } ${msg.error ? 'border-red-400 bg-red-500 text-white' : ''}`}
                      >
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>

                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] ${
                            isMine ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatMessageTime(msg.created_at)}</span>
                          {isMine && (
                            <span>
                              {msg.isOptimistic ? (
                                  <Clock className="w-3 h-3 text-blue-200 animate-pulse" />
                              ) : (
                                  <CheckCheck className="w-3 h-3 text-blue-200" />
                              )}
                            </span>
                          )}
                        </div>
                        {msg.error && (
                          <div className="flex items-center justify-end gap-2 text-[10px] text-red-600 dark:text-red-400">
                            <span>Not sent</span>
                            <button
                              type="button"
                              onClick={() => handleRetryMessage(msg)}
                              className="inline-flex items-center gap-1 font-semibold hover:text-red-700 dark:hover:text-red-300"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retry
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissMessage(msg.id)}
                              className="rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30"
                              aria-label="Dismiss failed message"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <footer className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
                    className="w-full text-xs sm:text-sm min-h-[42px] max-h-32 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 resize-none leading-relaxed focus-visible:ring-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="h-[42px] w-[42px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 shrink-0 flex items-center justify-center p-0 transition-all active:scale-95 disabled:opacity-50"
                  title="Send Message"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 ml-0.5" />
                  )}
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Your Direct Messages
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {userRole === 'teacher'
                  ? 'Select an alumni on the left to start a conversation.'
                  : 'Select an alumni conversation on the left, or visit the Alumni Directory to message a mentor.'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
