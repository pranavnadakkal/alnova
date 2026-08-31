import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">ALNOVA</span>
        </h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
          The ultimate mentorship and networking portal connecting driven students with experienced alumni.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full glass-card border border-white/20 hover:bg-white/20 transition-all">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
