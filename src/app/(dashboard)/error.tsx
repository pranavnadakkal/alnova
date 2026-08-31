'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 rounded-full bg-destructive/15 p-4 text-destructive"><AlertTriangle className="size-7" /></div>
      <h1 className="text-2xl font-bold">We couldn&apos;t load this page</h1>
      <p className="mt-2 text-white/65">The issue may be temporary. Please try again.</p>
      <Button onClick={retry} className="mt-6 bg-white text-black hover:bg-white/90"><RefreshCw className="size-4" />Try again</Button>
    </div>
  )
}
