'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error('Application error:', error) }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#111827', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
        <main style={{ maxWidth: 440, padding: 24, textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p style={{ color: '#cbd5e1' }}>Please try again. If the issue continues, refresh the page.</p>
          <button onClick={retry} style={{ border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>Try again</button>
        </main>
      </body>
    </html>
  )
}
