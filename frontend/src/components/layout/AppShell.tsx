import type { PropsWithChildren } from 'react'

import { CinematicBackdrop } from './CinematicBackdrop'
import { Navbar } from './Navbar'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="glass-page relative min-h-screen overflow-hidden">
      <CinematicBackdrop />

      <Navbar />

      <main className="animate-page-enter relative z-10 mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
