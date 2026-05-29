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
      setError('登录失败，请检查用户名与密码。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-page animate-page-enter relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute left-[-12rem] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-amber-400/16 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10rem] bottom-[-8rem] h-[32rem] w-[32rem] rounded-full bg-cyan-300/12 blur-3xl" />

      <div className="grid w-full max-w-6xl gap-5 md:grid-cols-[minmax(0,1.08fr)_420px]">
        <section className="glass-surface-elevated hidden min-h-[620px] rounded-[2rem] p-8 md:grid md:content-between">
          <div>
            <p className="field-label text-[var(--glass-accent-cyan)]">Director · production console</p>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight text-[var(--glass-text-primary)]">
              把剧集生产线变成一块可调度的导演控制台。
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--glass-text-secondary)]">
              从项目、剧本、素材、分镜、提示词到配音与视频，在同一个片场工作台里推进每个制作阶段。
            </p>
          </div>

          <div className="grid gap-3">
            <article className="metric-card p-5">
              <p className="field-label">Pipeline</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['配置', '剧本', '素材', '分镜', '提示词', '配音', '视频'].map((item, index) => (
                  <span key={item} className="stage-pill">
                    <span className="text-[var(--glass-accent-cyan)]">{String(index + 1).padStart(2, '0')}</span>
                    {item}
                  </span>
                ))}
              </div>
            </article>
            <article className="inspector-panel p-5">
              <p className="field-label">Local access pass</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-[var(--glass-stroke-soft)] bg-black/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--glass-text-tertiary)]">User</p>
                  <p className="mt-1 font-black text-[var(--glass-text-primary)]">admin</p>
                </div>
                <div className="rounded-2xl border border-[var(--glass-stroke-soft)] bg-black/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--glass-text-tertiary)]">Password</p>
                  <p className="mt-1 font-black text-[var(--glass-text-primary)]">admin123456</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <form className="glass-surface-elevated grid gap-5 rounded-[2rem] p-6 md:p-7" onSubmit={handleSubmit}>
          <div>
            <p className="field-label text-[var(--glass-accent-cyan)]">Operator sign-in</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--glass-text-primary)]">进入片场</h2>
            <p className="mt-2 text-sm text-[var(--glass-text-tertiary)]">登录后继续调度你的导演工作区。</p>
          </div>

          <label className="grid gap-2">
            <span className="field-label">用户名</span>
            <input
              className="glass-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="请输入用户名"
            />
          </label>

          <label className="grid gap-2">
            <span className="field-label">密码</span>
            <input
              className="glass-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="请输入密码"
            />
          </label>

          {error ? <div className="glass-danger rounded-2xl border border-[var(--glass-tone-danger-fg)]/20 px-3 py-2 text-sm font-semibold">{error}</div> : null}

          <Button disabled={loading} type="submit" block>
            {loading ? '登录中...' : '启动控制台'}
          </Button>

          <div className="rounded-2xl border border-[var(--glass-stroke-soft)] bg-white/[0.035] px-3 py-2 text-xs leading-5 text-[var(--glass-text-tertiary)]">
            本地开发环境已预填默认账号；若设置了 VITE_SKIP_AUTH=true，可直接访问主界面无需登录。
          </div>
        </form>
      </div>
    </div>
  )
}
