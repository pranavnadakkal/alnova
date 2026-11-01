'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Announcement, AnnouncementPriority, Profile } from '@/types'
import {
  Megaphone, Plus, Search, Clock, User, AlertTriangle,
  AlertCircle, Info, Loader2, Trash2, Edit3, Pin, Filter, X, CheckCircle2, Image as ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'

type AnnouncementWithAuthor = Announcement & {
  profiles?: Profile
}

export default function AnnouncementsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | AnnouncementPriority>('all')

  // Create/Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formEventDate, setFormEventDate] = useState('')
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('normal')
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) return
        setUserId(user.id)

        // Get user role from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        let role = userData?.role
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle()

        if (!profileData && !profileError) {
          const legacyProfile = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('user_id', user.id)
            .maybeSingle()
          profileData = legacyProfile.data
          profileError = legacyProfile.error
        }
        if (profileData) {
          setUserName(profileData.full_name)
          role = role || profileData.role
        }
        if (userError && !profileData) {
          throw userError
        }
        setUserRole(role)

        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })

        if (announcementsError) throw announcementsError
        const authorIds = Array.from(new Set((announcementsData || []).map((a) => a.author_id)))
        let { data: authorProfiles, error: authorProfilesError } = authorIds.length
          ? await supabase.from('profiles').select('*').in('id', authorIds)
          : { data: [], error: null }
        if (!authorProfiles?.length && !authorProfilesError) {
          const legacyAuthors = authorIds.length
            ? await supabase.from('profiles').select('*').in('user_id', authorIds)
            : { data: [], error: null }
          authorProfiles = legacyAuthors.data
          authorProfilesError = legacyAuthors.error
        }
        if (authorProfilesError) throw authorProfilesError
        const authorMap = new Map((authorProfiles || []).map((profile) => [profile.user_id || profile.id, profile]))
        setAnnouncements((announcementsData || []).map((announcement) => ({
          ...announcement,
          profiles: authorMap.get(announcement.author_id)
            || (authorProfiles || []).find((profile) => profile.id === announcement.author_id),
        })))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load announcements.'
        setLoadError(message)
        toast.error('Could not load announcements', { description: message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  // Realtime subscription for new announcements
  useEffect(() => {
    const channel = supabase
      .channel('announcements-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new announcement with author profile
            const { data } = await supabase
              .from('announcements')
              .select('*')
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setAnnouncements(prev => [data, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const { data } = await supabase
              .from('announcements')
              .select('*')
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setAnnouncements(prev => prev.map(a => a.id === data.id ? data : a))
            }
          } else if (payload.eventType === 'DELETE') {
            setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const isTeacher = userRole === 'teacher'

  const handleCreateOrUpdate = async () => {
    if (!userId || !formTitle.trim() || !formContent.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    let uploadedPosterUrl = posterUrl

    if (posterFile) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(posterFile.type)) {
        toast.error('Poster must be a PNG, JPEG, or WebP image')
        setIsSubmitting(false)
        return
      }
      if (posterFile.size > 5 * 1024 * 1024) {
        toast.error('Poster must be smaller than 5 MB')
        setIsSubmitting(false)
        return
      }
      const path = `${userId}/${crypto.randomUUID()}-${posterFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
      const { error: uploadError } = await supabase.storage
        .from('announcement-posters')
        .upload(path, posterFile, { contentType: posterFile.type })
      if (uploadError) {
        toast.error('Failed to upload poster', { description: uploadError.message })
        setIsSubmitting(false)
        return
      }
      uploadedPosterUrl = supabase.storage.from('announcement-posters').getPublicUrl(path).data.publicUrl
    }

    if (editingId) {
      // Update existing
      const { error } = await supabase
        .from('announcements')
        .update({
          title: formTitle.trim(),
          content: formContent.trim(),
          event_date: formEventDate ? new Date(formEventDate).toISOString() : null,
          priority: formPriority,
          poster_url: uploadedPosterUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)

      if (error) {
        toast.error('Failed to update announcement', { description: error.message })
      } else {
        toast.success('Announcement updated successfully!')
        setDialogOpen(false)
        resetForm()
      }
    } else {
      // Create new
      const announcement = {
        author_id: userId,
        title: formTitle.trim(),
        content: formContent.trim(),
        event_date: formEventDate ? new Date(formEventDate).toISOString() : null,
        priority: formPriority,
        poster_url: uploadedPosterUrl,
      }
      let { error } = await supabase.from('announcements').insert(announcement)

      // Older databases may have the original three-column announcements table.
      if (error && /column .*announcements.*schema cache/i.test(error.message)) {
        const fallback = await supabase
          .from('announcements')
          .insert({
            author_id: announcement.author_id,
            title: announcement.title,
            content: announcement.content,
            ...(uploadedPosterUrl ? { poster_url: uploadedPosterUrl } : {}),
          })
        error = fallback.error
      }

      if (error) {
        toast.error('Failed to post announcement', { description: error.message })
      } else {
        toast.success('Announcement posted!')
        setDialogOpen(false)
        resetForm()
      }
    }

    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    const { error } = await supabase.from('announcements').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete announcement', { description: error.message })
    } else {
      toast.success('Announcement deleted')
      setDeletingId(null)
    }
    setIsDeleting(false)
  }

  const handleEdit = (announcement: AnnouncementWithAuthor) => {
    setEditingId(announcement.id)
    setFormTitle(announcement.title)
    setFormContent(announcement.content)
    setFormEventDate(announcement.event_date ? announcement.event_date.slice(0, 16) : '')
    setFormPriority(announcement.priority)
    setPosterUrl(announcement.poster_url || null)
    setPosterFile(null)
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormTitle('')
    setFormContent('')
    setFormEventDate('')
    setFormPriority('normal')
    setPosterFile(null)
    setPosterUrl(null)
    setEditingId(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getPriorityConfig = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
          strip: 'bg-red-500',
          glow: 'shadow-red-100 dark:shadow-red-900/20',
          label: 'Urgent',
        }
      case 'important':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
          strip: 'bg-amber-500',
          glow: 'shadow-amber-100 dark:shadow-amber-900/20',
          label: 'Important',
        }
      default:
        return {
          icon: <Info className="w-4 h-4" />,
          badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
          strip: 'bg-blue-500',
          glow: '',
          label: 'General',
        }
    }
  }

  // Filter & Search
  const filteredAnnouncements = announcements.filter((a) => {
    const term = searchQuery.toLowerCase()
    const matchText = a.title.toLowerCase().includes(term) ||
      a.content.toLowerCase().includes(term) ||
      a.profiles?.full_name?.toLowerCase().includes(term)
    if (filterPriority === 'all') return matchText
    return matchText && a.priority === filterPriority
  })

  // Sort: urgent first, then important, then normal — within each group by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    const priorityOrder = { urgent: 0, important: 1, normal: 2 }
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // ---- LOADING STATE ----
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-52 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-11 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ---- ERROR STATE ----
  if (loadError) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-slate-900 dark:text-white text-lg font-semibold">Couldn&apos;t load announcements</p>
        <p className="text-slate-500 mt-2">{loadError}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            Announcements
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isTeacher
              ? 'Post and manage announcements for all students and alumni.'
              : 'Stay updated with the latest announcements from teachers.'}
          </p>
        </div>

        {/* Create button — teachers only */}
        {isTeacher && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger render={
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 h-11 px-5" />
            }>
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {editingId ? 'Edit Announcement' : 'Create Announcement'}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? 'Update the announcement details below.'
                    : 'This announcement will be visible to all students and alumni.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Campus Placement Drive — October 2026"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11"
                  />
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <Label htmlFor="content" className="text-slate-700 dark:text-slate-300">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Write the announcement details here..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 min-h-[140px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="poster" className="text-slate-700 dark:text-slate-300">
                    Poster <span className="font-normal text-slate-400">(optional, PNG/JPEG/WebP up to 5 MB)</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="poster"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <ImageIcon className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                  {posterUrl && !posterFile && (
                    <p className="text-xs text-slate-500">A poster is attached. Choose another file to replace it.</p>
                  )}
                </div>

                {/* Event date */}
                <div className="space-y-1.5">
                  <Label htmlFor="event-date" className="text-slate-700 dark:text-slate-300">
                    Event date <span className="font-normal text-slate-400">(optional)</span>
                  </Label>
                  <Input
                    id="event-date"
                    type="datetime-local"
                    value={formEventDate}
                    onChange={(e) => setFormEventDate(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Priority Level</Label>
                  <div className="flex gap-2">
                    {(['normal', 'important', 'urgent'] as const).map((p) => {
                      const config = getPriorityConfig(p)
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormPriority(p)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            formPriority === p
                              ? p === 'urgent'
                                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : p === 'important'
                                ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                : 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {config.icon}
                          <span className="capitalize">{config.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setDialogOpen(false); resetForm() }}
                  className="border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrUpdate}
                  disabled={isSubmitting || !formTitle.trim() || !formContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting
                    ? (editingId ? 'Updating...' : 'Posting...')
                    : (editingId ? 'Update Announcement' : 'Post Announcement')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', 'urgent', 'important', 'normal'] as const).map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              onClick={() => setFilterPriority(p)}
              className={`text-xs capitalize whitespace-nowrap h-11 px-4 transition-all ${
                filterPriority === p
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
              }`}
            >
              {p === 'all' ? 'All' : getPriorityConfig(p as AnnouncementPriority).label}
            </Button>
          ))}
        </div>
      </div>

      {/* Announcements Feed */}
      {sortedAnnouncements.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
            <Megaphone className="w-9 h-9 text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">
            {announcements.length === 0
              ? 'No announcements yet'
              : 'No announcements match your search'}
          </p>
          <p className="text-slate-400 dark:text-slate-500 mt-1.5 text-sm max-w-sm mx-auto">
            {announcements.length === 0
              ? (isTeacher
                ? 'Click "New Announcement" to post your first announcement.'
                : 'Announcements from teachers will appear here.')
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAnnouncements.map((announcement) => {
            const config = getPriorityConfig(announcement.priority)
            const authorName = announcement.profiles?.full_name || 'Unknown Teacher'
            const authorInitials = authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            const isAuthor = announcement.author_id === userId

            return (
              <Card
                key={announcement.id}
                className={`border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${config.glow}`}
              >
                {/* Priority color strip */}
                <div className={`h-1 ${config.strip}`} />

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Author Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center flex-shrink-0">
                        {announcement.profiles?.avatar_url ? (
                          <img
                            src={announcement.profiles.avatar_url}
                            alt={authorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-blue-700 dark:text-blue-300 text-sm font-bold">
                            {authorInitials}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base leading-snug">{announcement.title}</CardTitle>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${config.badge}`}>
                            {config.icon}
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-slate-600 dark:text-slate-300">{authorName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(announcement.created_at)}
                          </span>
                          {announcement.updated_at && announcement.updated_at !== announcement.created_at && (
                            <>
                              <span>•</span>
                              <span className="italic">edited</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions — only for author (teacher) */}
                    {isAuthor && isTeacher && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(announcement.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-4">
                  {announcement.event_date && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-200/60 bg-indigo-50 px-3 py-2 dark:border-indigo-800/50 dark:bg-indigo-950/30">
                      <Clock className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Event date and time</p>
                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          {new Date(announcement.event_date).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {announcement.poster_url && (
                    <img
                      src={announcement.poster_url}
                      alt=""
                      className="mb-4 max-h-80 w-full rounded-xl object-cover"
                    />
                  )}
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">More details</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </CardContent>

                {/* Delete confirmation inline */}
                {deletingId === announcement.id && (
                  <CardFooter className="bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/30 py-3">
                    <div className="flex items-center justify-between w-full gap-3">
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                        Delete this announcement? This cannot be undone.
                      </p>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingId(null)}
                          className="text-xs h-8 border-red-200 dark:border-red-800"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDelete(announcement.id)}
                          disabled={isDeleting}
                          className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isDeleting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Stats bar at bottom for teachers */}
      {isTeacher && announcements.length > 0 && (
        <div className="flex items-center justify-center gap-4 py-4 text-xs text-slate-400 dark:text-slate-500">
          <span>{announcements.length} total</span>
          <span>•</span>
          <span>{announcements.filter(a => a.priority === 'urgent').length} urgent</span>
          <span>•</span>
          <span>{announcements.filter(a => a.priority === 'important').length} important</span>
          <span>•</span>
          <span>{announcements.filter(a => a.priority === 'normal').length} general</span>
        </div>
      )}
    </div>
  )
}
