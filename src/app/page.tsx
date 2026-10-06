import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-3xl space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium backdrop-blur-sm mb-4">
          <Sparkles className="w-4 h-4" />
          Alumni Mentorship &amp; Networking
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-emerald-300">ALNOVA</span>
        </h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
          The ultimate mentorship and networking portal connecting driven students with experienced alumni.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full bg-white/10 border border-white/25 text-white hover:bg-white/20 backdrop-blur-sm transition-all">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full bg-white text-blue-700 hover:bg-white/90 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] font-semibold">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
