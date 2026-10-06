'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { Search, Send, Loader2, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface ChatInterfaceProps {
  userId: string
  userRole: 'student' | 'alumni'
}

interface ConnectedUser {
  profile: Profile
  conversationId?: string
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export default function ChatInterface({ userId, userRole }: ChatInterfaceProps) {
  const supabase = useMemo(() => createClient(), [])
  const [connections, setConnections] = useState<ConnectedUser[]>([])
  const [activeConnection, setActiveConnection] = useState<ConnectedUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch connected users (accepted requests)
  useEffect(() => {
    const fetchConnections = async () => {
      setIsLoading(true)
      try {
        const idField = userRole === 'student' ? 'student_id' : 'alumni_id'
        const otherIdField = userRole === 'student' ? 'alumni_id' : 'student_id'

        // Fetch requests that indicate a connection
        const { data: requests, error } = await supabase
          .from('requests')
          .select('*')
          .eq(idField, userId)
          .in('status', ['accepted', 'completed', 'reviewing'])

        if (error) throw error

        if (requests && requests.length > 0) {
          // Extract unique connected user IDs
          const connectedIds = Array.from(new Set(requests.map(r => r[otherIdField])))

          // Fetch their profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', connectedIds)

          if (profilesError) throw profilesError

          // Fetch existing conversations
          const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .or(`${idField}.eq.${userId}`)

          if (convError) throw convError

          const connectionsList = (profiles || []).map(p => {
            const conv = conversations?.find(c => c[otherIdField] === p.user_id)
            return {
              profile: p,
              conversationId: conv?.id
            }
          })

          setConnections(connectionsList)
        }
      } catch (error) {
        console.error('Failed to load connections:', error)
        toast.error('Failed to load connections.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConnections()
  }, [supabase, userId, userRole])

  // 2. Fetch messages for active connection & subscribe to updates
  useEffect(() => {
    if (!activeConnection || !activeConnection.conversationId) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConnection.conversationId!)
        .order('created_at', { ascending: true })

      if (error) {
        toast.error('Failed to load messages')
      } else {
        setMessages(data || [])
        scrollToBottom()
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${activeConnection.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConnection.conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConnection, supabase])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSelectConnection = async (conn: ConnectedUser) => {
    let currentConn = { ...conn }

    // If no conversation exists, create it
    if (!currentConn.conversationId) {
      try {
        const student_id = userRole === 'student' ? userId : currentConn.profile.user_id
        const alumni_id = userRole === 'alumni' ? userId : currentConn.profile.user_id

        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({ student_id, alumni_id })
          .select()
          .single()

        if (error) {
          // Maybe it was created concurrently
          if (error.code === '23505') { // Unique violation
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('*')
              .eq('student_id', student_id)
              .eq('alumni_id', alumni_id)
              .single()
            
            if (existingConv) {
              currentConn.conversationId = existingConv.id
            }
          } else {
            throw error
          }
        } else if (newConv) {
          currentConn.conversationId = newConv.id
        }

        // Update in connections list
        setConnections(prev => prev.map(c => c.profile.user_id === currentConn.profile.user_id ? currentConn : c))
      } catch (error) {
        toast.error('Failed to start conversation')
        return
      }
    }

    setActiveConnection(currentConn)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConnection?.conversationId) return

    const content = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConnection.conversationId,
      sender_id: userId,
      content,
    })

    if (error) {
      toast.error('Failed to send message')
      setNewMessage(content) // restore
    }
    setIsSending(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      {/* Sidebar - Connections List */}
      <Card className="w-80 flex-shrink-0 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-lg">Messages</h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search connections..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {connections.length === 0 ? (
            <div className="text-center p-4 text-slate-500 text-sm">
              No active connections yet. Connect with others first!
            </div>
          ) : (
            connections.map(conn => {
              const isActive = activeConnection?.profile.user_id === conn.profile.user_id
              const initials = conn.profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'
              
              return (
                <button
                  key={conn.profile.user_id}
                  onClick={() => handleSelectConnection(conn)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isActive ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0 ${
                    isActive ? 'bg-blue-600' : 'bg-slate-400 dark:bg-slate-700'
                  }`}>
                    {initials}
                  </div>
                  <div className="flex-1 text-left truncate">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{conn.profile.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{conn.profile.company || conn.profile.role}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 relative">
        {activeConnection ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                {activeConnection.profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{activeConnection.profile.full_name}</h3>
                <p className="text-xs text-slate-500">{activeConnection.profile.company || activeConnection.profile.role}</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>Send a message to start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.sender_id === userId
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMine 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-bl-sm'
                      }`}>
                        <p className="text-[15px] leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-100' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!newMessage.trim() || isSending}
                  className="rounded-full h-11 w-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 flex-shrink-0"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Your Messages</h3>
              <p className="text-sm">Select a connection to start chatting</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
