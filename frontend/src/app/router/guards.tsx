import { useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { AppShell } from '../../components/layout/AppShell'
import { useAuthStore } from '../store/auth.store'
import { refreshAuth } from '../../services/api/auth'
import { getWorkspace } from '../../services/api/projects'
import { buildWorkspaceStagePath } from './routes'
import { LoadingState } from '../../components/common/PageState'

export function ProtectedLayout() {
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      if (user) {
        setCheckingAuth(false)
        return
      }
      try {
        const payload = await refreshAuth()
        if (active) {
          setAuth(payload.user, payload.access_token)
        }
      } catch {
        if (active) {
          clearAuth()
        }
      } finally {
        if (active) {
          setCheckingAuth(false)
        }
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [clearAuth, setAuth, user])

  if (checkingAuth) {
    return (
      <div className="glass-page min-h-screen p-6">
        <LoadingState message="Checking authentication..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export function LegacyWorkspaceRedirect() {
  const { projectId = '' } = useParams()

  const workspaceQuery = useQuery({
    queryKey: ['workspace', projectId],
    queryFn: () => getWorkspace(projectId),
    enabled: Boolean(projectId),
  })

  const sortedEpisodes = useMemo(
    () => [...(workspaceQuery.data?.episodes ?? [])].sort((left, right) => left.episode_number - right.episode_number),
    [workspaceQuery.data?.episodes],
  )

  if (!projectId) {
    return <Navigate to="/projects" replace />
  }

  if (workspaceQuery.isLoading) {
    return <LoadingState message="Preparing workspace..." />
  }

  if (workspaceQuery.isError) {
    return <Navigate to={`/projects/${projectId}`} replace />
  }

  const firstEpisode = sortedEpisodes[0]

  if (!firstEpisode) {
    return <Navigate to={`/projects/${projectId}`} replace />
  }

  return <Navigate to={buildWorkspaceStagePath(projectId, firstEpisode.id, 'config')} replace />
}
