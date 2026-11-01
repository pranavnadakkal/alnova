'use client'

import { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileUp, FileText, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface ResumeReviewModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  defaultAlumniId?: string
  onSuccess?: () => void
}

interface AlumniOption {
  id: string
  full_name: string
  company?: string | null
  role?: string | null
}

type AlumniProfileRow = {
  profile_id: string
  company?: string | null
  job_title?: string | null
  profile?: { full_name?: string; role?: string } | null
}

export default function ResumeReviewModal({
  isOpen,
  onClose,
  studentId,
  defaultAlumniId,
  onSuccess,
}: ResumeReviewModalProps) {
  const supabase = createClient()
  const [alumniList, setAlumniList] = useState<AlumniOption[]>([])
  const [selectedAlumniId, setSelectedAlumniId] = useState(defaultAlumniId || '')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [loadingAlumni, setLoadingAlumni] = useState(false)

  useEffect(() => {
    if (defaultAlumniId) {
      setSelectedAlumniId(defaultAlumniId)
    }
  }, [defaultAlumniId])

  useEffect(() => {
    if (!isOpen) return

    const fetchAlumni = async () => {
      setLoadingAlumni(true)
      try {
        const { data: alumniRows } = await supabase
          .from('alumni_profiles')
          .select('profile_id, company, job_title, profile:profiles(id, full_name, avatar_url, role)')

        if (alumniRows && alumniRows.length > 0) {
          const list = (alumniRows as unknown as AlumniProfileRow[]).map((a) => {
            const p = a.profile || {}
            return {
              id: a.profile_id,
              full_name: p.full_name || 'Alumni Member',
              company: a.company || null,
              role: a.job_title || p.role || 'Alumni',
            }
          })
          setAlumniList(list)
          if (!selectedAlumniId && list.length > 0) {
            setSelectedAlumniId(list[0].id)
          }
        } else {
          // Fallback to profiles table where role='alumni'
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('role', 'alumni')

          if (profiles) {
            const list = profiles.map((p) => ({
              id: p.id,
              full_name: p.full_name,
              company: null,
              role: p.role,
            }))
            setAlumniList(list)
            if (!selectedAlumniId && list.length > 0) {
              setSelectedAlumniId(list[0].id)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching alumni for resume review:', err)
      } finally {
        setLoadingAlumni(false)
      }
    }

    fetchAlumni()
  }, [isOpen, supabase, selectedAlumniId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF document.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB.')
        return
      }
      setResumeFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !selectedAlumniId || !resumeFile) {
      toast.error('Please select an alumni reviewer and choose a PDF file.')
      return
    }

    setIsUploading(true)
    try {
      // 1. Upload to Supabase Storage bucket 'resumes'
      const fileExt = resumeFile.name.split('.').pop()
      const fileName = `${studentId}-${Date.now()}.${fileExt}`
      const filePath = `reviews/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, resumeFile, { upsert: true })

      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('resumes').getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      // 2. Insert into resume_reviews table
      const { error: reviewError } = await supabase.from('resume_reviews').insert({
        student_id: studentId,
        alumni_id: selectedAlumniId,
        status: 'pending',
      })

      // 3. Also insert into requests table with document URL and message
      const { error: requestError } = await supabase.from('requests').insert({
        student_id: studentId,
        alumni_id: selectedAlumniId,
        type: 'resume',
        message: notes.trim() || 'Please review my resume.',
        document_url: publicUrl,
      })
      if (requestError) throw requestError

      if (reviewError) throw reviewError

      toast.success('Resume submitted for review!')
      setResumeFile(null)
      setNotes('')
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      toast.error('Failed to submit resume', { description: msg })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Submit Resume for Review
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Get tailored feedback from an experienced industry alumnus.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Select Reviewer */}
          <div className="space-y-1.5">
            <Label htmlFor="resume-reviewer" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Alumni Reviewer *
            </Label>
            {loadingAlumni ? (
              <div className="h-9 flex items-center text-xs text-slate-400">Loading alumni...</div>
            ) : (
              <Select value={selectedAlumniId} onValueChange={(value) => value && setSelectedAlumniId(value)}>
                <SelectTrigger id="resume-reviewer" className="h-10 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Choose an alumni mentor" />
                </SelectTrigger>
                <SelectContent>
                  {alumniList.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.full_name} {a.company ? `(${a.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* File Upload Box */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Resume Document (PDF, max 5MB) *
            </Label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
              {resumeFile ? (
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="truncate max-w-[280px]">{resumeFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setResumeFile(null)}
                    className="text-xs text-slate-400 hover:text-red-500 h-6 px-1.5 ml-1"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-1.5">
                  <FileText className="w-6 h-6 text-slate-400" />
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
                    Click to browse and upload PDF
                  </span>
                  <span className="text-[11px] text-slate-400">PDF up to 5MB</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Specific Questions / Target Role */}
          <div className="space-y-1.5">
            <Label htmlFor="resume-notes" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Role & Questions for Reviewer
            </Label>
            <Textarea
              id="resume-notes"
              rows={3}
              placeholder="e.g. Applying for junior backend roles in fintech. Please review my project descriptions and formatting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none leading-relaxed"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 dark:border-slate-700">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !resumeFile || !selectedAlumniId}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs sm:text-sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Submit for Review'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
