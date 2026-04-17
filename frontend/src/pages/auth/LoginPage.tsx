import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../../app/store/auth.store'
import { login } from '../../services/api/auth'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = await login(username.trim(), password)
      setAuth(payload.user, payload.access_token)
      navigate('/dashboard')
    } catch {
      setError('Login failed. Please verify your username and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-page animate-page-enter relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-28 top-12 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="grid w-full max-w-5xl gap-5 md:grid-cols-[minmax(0,1fr)_420px]">
        <section className="glass-surface-elevated hidden rounded-3xl p-8 md:grid md:content-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--glass-text-tertiary)]">Director Platform</p>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--glass-text-primary)]">Stage-Driven AI Production Workspace</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--glass-text-secondary)]">
              Manage projects, episodes, assets, prompts, voice, and video in one continuous pipeline. Start by signing in with your seeded account.
            </p>
          </div>
          <div className="grid gap-3">
            <article className="card-base p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Workflow</p>
              <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">
                Config to Script to Assets to Storyboard to Prompts to Voice to Video
              </p>
            </article>
            <article className="card-base p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">Default Seed</p>
              <p className="mt-1 text-sm text-[var(--glass-text-secondary)]">Username: admin</p>
              <p className="text-sm text-[var(--glass-text-secondary)]">Password: admin123456</p>
            </article>
          </div>
        </section>

        <form className="glass-surface-elevated grid gap-4 rounded-3xl p-6 md:p-7" onSubmit={handleSubmit}>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--glass-text-primary)]">Sign In</h2>
            <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">Access your director workspace.</p>
          </div>

          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Username</span>
            <input
              className="glass-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="Enter username"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-[var(--glass-text-secondary)]">Password</span>
            <input
              className="glass-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </label>

          {error ? <div className="glass-danger rounded-xl px-3 py-2 text-sm">{error}</div> : null}

          <Button disabled={loading} type="submit" block>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className="rounded-xl border border-[var(--glass-stroke-base)] bg-white/70 px-3 py-2 text-xs text-[var(--glass-text-tertiary)]">
            Tip: seeded login is prefilled for local development.
          </div>
        </form>
      </div>
    </div>
  )
}
