import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, UserCog, SlidersHorizontal } from 'lucide-react'

import { useAuthStore } from '../../app/store/auth.store'
import { logout } from '../../services/api/auth'

export function UserMenu() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const username = user?.username ?? '访客'
  const initial = username.slice(0, 1).toUpperCase()

  const handleLogout = async () => {
    setOpen(false)
    try {
      await logout()
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  if (!user) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="glass-btn-base glass-btn-primary px-4 py-1.5 text-sm"
      >
        登录
      </button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[var(--glass-stroke-base)] bg-white/70 py-1 pl-1 pr-2.5 text-sm transition hover:bg-white"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-[12px] font-semibold text-white">
          {initial}
        </span>
        <span className="max-w-[120px] truncate text-[var(--glass-text-secondary)]">{username}</span>
        <ChevronDown className={['h-3.5 w-3.5 text-[var(--glass-text-tertiary)] transition-transform', open ? 'rotate-180' : ''].join(' ')} />
      </button>

      {open && (
        <div
          className="dropdown-panel animate-modal-in absolute right-0 top-[calc(100%+8px)] w-56 p-1.5"
          role="menu"
        >
          <div className="px-3 pb-2 pt-1">
            <p className="text-[11px] uppercase tracking-wide text-[var(--glass-text-tertiary)]">已登录</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--glass-text-primary)]">{username}</p>
          </div>
          <div className="my-1 h-px bg-[var(--glass-stroke-soft)]" />
          <button className="dropdown-item" onClick={() => { setOpen(false); navigate('/settings') }}>
            <UserCog className="h-4 w-4" /> 个人资料
          </button>
          <button className="dropdown-item" onClick={() => { setOpen(false); navigate('/settings') }}>
            <SlidersHorizontal className="h-4 w-4" /> 偏好设置
          </button>
          <div className="my-1 h-px bg-[var(--glass-stroke-soft)]" />
          <button className="dropdown-item" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> 退出登录
          </button>
        </div>
      )}
    </div>
  )
}
