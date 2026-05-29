import { Clapperboard } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/dashboard" className="group flex items-center gap-3">
      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/20 bg-gradient-to-br from-amber-300 to-orange-500 text-stone-950 shadow-[0_16px_34px_rgba(255,179,71,0.22)] transition-transform group-hover:-rotate-3 group-hover:scale-105">
        <Clapperboard className="h-5 w-5" strokeWidth={2.4} />
        <span className="pointer-events-none absolute inset-x-2 top-1 h-px bg-white/45" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-black tracking-[0.16em] text-[var(--glass-text-primary)]">导演助手</span>
        <span className="text-[10px] font-bold tracking-[0.26em] text-[var(--glass-accent-cyan)]">DIRECTOR CONSOLE</span>
      </span>
    </Link>
  )
}
