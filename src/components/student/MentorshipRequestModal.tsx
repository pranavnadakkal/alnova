'use client'

import { useState, useEffect } from 'react'
import { tablesDB } from '@/lib/appwrite/client'
import { Query } from 'appwrite'
import { sendMentorshipRequest } from '@/app/(dashboard)/requests/actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, MessageSquare, Clock, CheckCircle2, Sparkles, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface MentorshipRequestModalProps {
  alumni: {
    id: string
    full_name: string
    company?: string | null
    role?: string | null
    headline?: string | null
    avatar_url?: string | null
  } | null
  isOpen: boolean
  onClose: () => void
  studentId: string
  onSuccess?: () => void
}

const TOPICS = [
  'Career Transition & Growth',
  'Resume & Portfolio Deep-Dive',
  'Technical Architecture & Code Review',
  'Mock Technical Interview',
  'Mock Behavioral Interview',
  'Industry Insights & Day in the Life',
  'General Career Guidance',
]
type MentorshipStatus = 'pending' | 'accepted' | 'completed' | 'declined'

export default function MentorshipRequestModal({
  alumni,
  isOpen,
  onClose,
  studentId,
  onSuccess,
}: MentorshipRequestModalProps) {
  const [topic, setTopic] = useState('Career Transition & Growth')
  const [pitch, setPitch] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [existingStatus, setExistingStatus] = useState<'pending' | 'accepted' | 'completed' | 'declined' | null>(null)
  const [existingMessage, setExistingMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !alumni || !studentId) {
      return
    }

    const checkExisting = async () => {
      setIsChecking(true)
      try {
        // Check mentorship_sessions table
        const sessions = await tablesDB.listRows(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          'mentorship_sessions',
          [
            Query.equal('studentId', studentId),
            Query.equal('alumniId', alumni.id),
            Query.equal('status', ['pending', 'accepted', 'completed']),
            Query.orderDesc('$createdAt'),
            Query.limit(1),
          ],
        )
        const session = sessions.rows[0]

        if (session) {
          setExistingStatus(session.status as MentorshipStatus)
          setExistingMessage(session.pitch || session.message || session.topic || null)
        } else {
          const requests = await tablesDB.listRows(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            'requests',
            [
              Query.equal('studentId', studentId),
              Query.equal('alumniId', alumni.id),
              Query.equal('type', 'mentorship'),
              Query.orderDesc('$createdAt'),
              Query.limit(1),
            ],
          )
          const req = requests.rows[0]

          if (req) {
            setExistingStatus('pending')
            setExistingMessage(req.message || null)
          } else {
            setExistingStatus(null)
            setExistingMessage(null)
          }
        }
      } catch (err) {
        console.error('Error checking existing mentorship request:', err)
      } finally {
        setIsChecking(false)
      }
    }

    checkExisting()
  }, [isOpen, alumni, studentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alumni || !studentId) return

    if (!pitch.trim()) {
      toast.error('Please write a brief pitch for your mentor.')
      return
    }

    setIsSubmitting(true)
    try {
      await sendMentorshipRequest({
        alumniId: alumni.id,
        topic,
        pitch: pitch.trim(),
        proposedDate,
      })

      toast.success('Mentorship request sent successfully!')
      setPitch('')
      setProposedDate('')
      onSuccess?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit mentorship request.'
      toast.error('Could not send request', { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!alumni) return null

  const initials = alumni.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3.5 mb-1">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center flex-shrink-0 shadow-sm">
              {alumni.avatar_url ? (
                <img src={alumni.avatar_url} alt={alumni.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-700 dark:text-blue-300 font-bold text-base">{initials}</span>
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Request Mentorship
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Connect with <span className="font-semibold text-slate-700 dark:text-slate-300">{alumni.full_name}</span>
                {alumni.company && ` • ${alumni.company}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isChecking ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Checking mentorship status...</span>
          </div>
        ) : existingStatus === 'pending' ? (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Mentorship Request Already Pending</p>
                <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-1 leading-relaxed">
                  You already have a pending mentorship request with {alumni.full_name}. Please wait for their response or follow up via messages.
                </p>
                {existingMessage && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-100/70 dark:bg-amber-900/40 text-xs italic text-amber-900 dark:text-amber-200 border border-amber-200/50 dark:border-amber-700/50">
                    &ldquo;{existingMessage}&rdquo;
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose} className="border-slate-200 dark:border-slate-700">
                Close
              </Button>
              <Link href="/requests">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  View in Requests Tracker
                </Button>
              </Link>
            </DialogFooter>
          </div>
        ) : existingStatus === 'accepted' ? (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Mentorship Already Active</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400/90 mt-1 leading-relaxed">
                  {alumni.full_name} has already accepted your mentorship request! You can coordinate dates and chat directly in Messages.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose} className="border-slate-200 dark:border-slate-700">
                Close
              </Button>
              <Link href={`/messages?alumniId=${alumni.id}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat in Messages
                </Button>
              </Link>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Topic Select */}
            <div className="space-y-1.5">
              <Label htmlFor="mentorship-topic" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mentorship Focus Area
              </Label>
              <Select value={topic} onValueChange={(value) => value && setTopic(value)}>
                <SelectTrigger id="mentorship-topic" className="h-10 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Proposed Date */}
            <div className="space-y-1.5">
              <Label htmlFor="proposed-date" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Proposed Date & Time (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="proposed-date"
                  type="datetime-local"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="h-10 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Suggest an initial date. You can adjust the schedule later.
              </p>
            </div>

            {/* Pitch Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="mentorship-pitch" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Your Pitch & Specific Questions
                </Label>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Be concise and specific
                </span>
              </div>
              <Textarea
                id="mentorship-pitch"
                required
                rows={4}
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Hi! I am a final-year student interested in your journey into cloud architecture. I would love 20-30 minutes of your time to review my roadmap and ask a few targeted questions about..."
                className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none leading-relaxed"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 dark:border-slate-700">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !pitch.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4 mr-1.5" />
                    Send Mentorship Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
