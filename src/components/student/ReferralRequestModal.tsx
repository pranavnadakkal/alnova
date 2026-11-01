'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Loader2, Briefcase, Link as LinkIcon, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface ReferralRequestModalProps {
  alumni: {
    id: string
    full_name: string
    company?: string | null
    role?: string | null
    avatar_url?: string | null
  } | null
  isOpen: boolean
  onClose: () => void
  studentId: string
  onSuccess?: () => void
}

export default function ReferralRequestModal({
  alumni,
  isOpen,
  onClose,
  studentId,
  onSuccess,
}: ReferralRequestModalProps) {
  const supabase = createClient()
  const [jobTitle, setJobTitle] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alumni || !studentId) return
    if (!jobTitle.trim() || !message.trim()) {
      toast.error('Please provide the target job title and a personal note.')
      return
    }

    setIsSubmitting(true)
    try {
      const company = alumni.company || 'Company'

      // Also record in requests table with full referral details
      const { error: requestError } = await supabase.from('requests').insert({
        student_id: studentId,
        alumni_id: alumni.id,
        type: 'referral',
        message: `Referral Request for ${jobTitle.trim()} at ${company}${jobUrl.trim() ? ` (${jobUrl.trim()})` : ''}: ${message.trim()}`,
        document_url: resumeUrl.trim() || null,
      })
      if (requestError) throw requestError

      toast.success('Referral request submitted successfully!')
      setJobTitle('')
      setJobUrl('')
      setMessage('')
      setResumeUrl('')
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit referral request.'
      toast.error('Could not submit referral', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!alumni) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Request an Employee Referral
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                To <span className="font-semibold text-slate-700 dark:text-slate-300">{alumni.full_name}</span>
                {alumni.company && ` at ${alumni.company}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="space-y-1">
            <Label htmlFor="ref-job-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Job Title *
            </Label>
            <Input
              id="ref-job-title"
              required
              placeholder="e.g. Associate Software Engineer, Frontend Intern"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ref-job-url" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Job Posting URL (Optional)
            </Label>
            <div className="relative">
              <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="ref-job-url"
                type="url"
                placeholder="https://company.com/careers/job/123"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="pl-8 h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ref-resume-url" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Link to Resume / Portfolio (Optional)
            </Label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="ref-resume-url"
                type="url"
                placeholder="https://drive.google.com/your-resume or portfolio url"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                className="pl-8 h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ref-message" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Personal Note / Key Qualifications *
            </Label>
            <Textarea
              id="ref-message"
              required
              rows={3}
              placeholder="Highlight your top matching skills, relevant projects, and why you are excited about this opportunity..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none leading-relaxed"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 dark:border-slate-700">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !jobTitle.trim() || !message.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs sm:text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Submit Referral Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
