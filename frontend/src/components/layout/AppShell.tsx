import { NavLink, useNavigate } from 'react-router-dom'
import type { PropsWithChildren } from 'react'

import { useAuthStore } from '../../app/store/auth.store'
import { logout } from '../../services/api/auth'
import { Button } from '../ui/Button'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/asset-hub', label: 'Asset Hub' },
  { to: '/settings', label: 'Settings' },
]

function ShellNavLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'rounded-xl px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-white/95 text-[var(--glass-text-primary)] shadow-[var(--glass-shadow-sm)]'
            : 'text-[var(--glass-text-secondary)] hover:bg-white/70',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  )
}

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  return (
    <div className="glass-page relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-28 top-8 h-72 w-72 rounded-full bg-sky-300/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-36 h-80 w-80 rounded-full bg-blue-300/16 blur-3xl" />
      <header className="glass-nav sticky top-0 z-20">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <strong className="text-sm tracking-wide text-[var(--glass-text-primary)]">director</strong>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => (
                <ShellNavLink key={item.to} to={item.to} label={item.label} />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--glass-text-secondary)]">{user?.username ?? 'Guest'}</span>
            {user ? (
              <Button variant="secondary" onClick={handleLogout}>
                Sign Out
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
