import { Clapperboard } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/dashboard" className="group flex items-center gap-2.5">
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-white shadow-[var(--glass-shadow-md)] transition-transform group-hover:scale-105">
        <Clapperboard className="h-5 w-5" strokeWidth={2.2} />
        <span className="pointer-events-none absolute -inset-1 rounded-xl bg-white/20 opacity-0 blur transition-opacity group-hover:opacity-100" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold tracking-wide text-[var(--glass-text-primary)]">导演助手</span>
        <span className="text-[10px] tracking-[0.18em] text-[var(--glass-text-tertiary)]">DIRECTOR · AI</span>
      </span>
    </Link>
  )
}
