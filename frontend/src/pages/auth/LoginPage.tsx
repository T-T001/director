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
      const payload = await login(username, password)
      setAuth(payload.user, payload.access_token)
      navigate('/dashboard')
    } catch {
      setError('登录失败，请确认账号和密码。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-page flex min-h-screen items-center justify-center px-4">
      <form className="glass-surface-strong grid w-full max-w-md gap-4 rounded-2xl p-6" onSubmit={handleSubmit}>
        <div>
          <h1 className="text-xl font-semibold">登录 director</h1>
          <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">先用后端种子账号进入项目骨架。</p>
        </div>

        <label className="grid gap-1">
          <span className="text-sm text-[var(--glass-text-secondary)]">用户名</span>
          <input className="glass-input" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-[var(--glass-text-secondary)]">密码</span>
          <input
            className="glass-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <div className="glass-danger rounded-xl px-3 py-2 text-sm">{error}</div> : null}

        <Button disabled={loading} type="submit" block>
          {loading ? '登录中...' : '登录'}
        </Button>
      </form>
    </div>
  )
}
