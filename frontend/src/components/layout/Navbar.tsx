import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { primaryNavItems } from '../../constants/nav'
import { Logo } from './Logo'
import { UserMenu } from './UserMenu'
import { VersionBadge } from './VersionBadge'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={['glass-nav sticky top-0 z-30 transition-all', scrolled ? 'glass-nav-scrolled' : ''].join(' ')}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="hidden items-center gap-2 md:flex">
            <VersionBadge />
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.description}
                className={({ isActive }) =>
                  ['nav-link-base', isActive ? 'nav-link-active' : ''].join(' ')
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
