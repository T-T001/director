import type { PropsWithChildren } from 'react'

import { Navbar } from './Navbar'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="glass-page relative min-h-screen overflow-hidden">
      {/* 背景光晕 */}
      <div className="pointer-events-none absolute -left-32 top-4 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-96 w-96 rounded-full bg-blue-300/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-1/3 h-72 w-72 rounded-full bg-indigo-200/16 blur-3xl" />

      <Navbar />

      <main className="animate-page-enter mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
