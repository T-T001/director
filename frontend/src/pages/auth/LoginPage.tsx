import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clapperboard, KeyRound, Lock, User } from 'lucide-react'

import { useAuthStore } from '../../app/store/auth.store'
import { login } from '../../services/api/auth'
import { Button } from '../../components/ui/Button'
import { CinematicBackdrop } from '../../components/layout/CinematicBackdrop'

const SLATE_FIELDS = [
  { k: 'SCENE', v: '01' },
  { k: 'TAKE', v: '01' },
  { k: 'ROLL', v: 'A' },
]

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
      setError('登录失败，请检查用户名与密码。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <CinematicBackdrop />

      <form
        className="glass-surface-elevated animate-page-enter relative z-10 w-full max-w-[460px] overflow-hidden rounded-[1.75rem]"
        onSubmit={handleSubmit}
      >
        {/* 拍板条纹 — the clapper stick */}
        <div
          className="relative h-10 w-full"
          style={{ background: 'repeating-linear-gradient(115deg, #0c0d12 0 20px, #efe4cc 20px 40px)' }}
        >
          <div className="absolute inset-x-0 bottom-0 h-px bg-black/50" />
        </div>
        {/* 合页高光线 */}
        <div className="h-0.5 w-full bg-gradient-to-r from-[var(--glass-accent-from)] via-[var(--glass-accent-to)] to-[var(--glass-accent-cyan)]" />

        {/* 场记板信息条 */}
        <div className="flex items-center gap-3 border-b border-[var(--glass-stroke-soft)] bg-black/30 px-5 py-2.5 font-mono">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.22em] text-[var(--glass-accent-red)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--glass-accent-red)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--glass-accent-red)]" />
            </span>
            REC
          </span>
          <div className="ml-auto flex items-center gap-3.5 text-[var(--glass-text-tertiary)]">
            {SLATE_FIELDS.map((field) => (
              <div key={field.k} className="flex items-baseline gap-1">
                <span className="text-[9px] tracking-[0.16em]">{field.k}</span>
                <span className="text-[11px] font-bold text-[var(--glass-text-secondary)]">{field.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute -right-20 top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,179,71,0.18),transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(72,209,204,0.14),transparent_70%)] blur-2xl" />

        {/* 正文 */}
        <div className="relative grid gap-6 p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/20 bg-gradient-to-br from-amber-300 to-orange-500 text-stone-950 shadow-[0_16px_34px_rgba(255,179,71,0.24)]">
              <Clapperboard className="h-5 w-5" strokeWidth={2.4} />
              <span className="pointer-events-none absolute inset-x-2 top-1 h-px bg-white/45" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-black tracking-[0.16em] text-[var(--glass-text-primary)]">导演助手</span>
              <span className="text-[10px] font-bold tracking-[0.26em] text-[var(--glass-accent-cyan)]">DIRECTOR CONSOLE</span>
            </div>
          </div>

          <div>
            <p className="field-label text-[var(--glass-accent-cyan)]">Operator sign-in</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--glass-text-primary)]">进入片场</h2>
            <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">登录后继续调度你的导演工作区。</p>
          </div>

          <label className="grid gap-2">
            <span className="field-label">用户名</span>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--glass-text-tertiary)]" />
              <input
                className="glass-input"
                style={{ paddingLeft: '2.75rem' }}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="请输入用户名"
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="field-label">密码</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--glass-text-tertiary)]" />
              <input
                className="glass-input"
                style={{ paddingLeft: '2.75rem' }}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="请输入密码"
              />
            </div>
          </label>

          {error ? (
            <div className="glass-danger rounded-2xl border border-[var(--glass-tone-danger-fg)]/20 px-3 py-2 text-sm font-semibold">{error}</div>
          ) : null}

          <Button disabled={loading} type="submit" block className="mt-1">
            {loading ? '登录中...' : <>启动控制台 <ArrowRight className="h-4 w-4" /></>}
          </Button>

          <div className="glass-field rounded-2xl px-3.5 py-3 text-xs leading-5 text-[var(--glass-text-tertiary)]">
            <div className="flex items-center gap-2 text-[var(--glass-text-secondary)]">
              <KeyRound className="h-3.5 w-3.5 text-[var(--glass-accent-from)]" />
              <span className="font-semibold">本地体验账号</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono">
              <span>账号 <b className="text-[var(--glass-text-primary)]">admin</b></span>
              <span>密码 <b className="text-[var(--glass-text-primary)]">admin123456</b></span>
            </div>
            <p className="mt-2">已预填默认账号；设置 VITE_SKIP_AUTH=true 可免登录直接进入主界面。</p>
          </div>
        </div>
      </form>
    </div>
  )
}
