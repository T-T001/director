import { Suspense, lazy } from 'react'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'

import { LoginPage } from '../../pages/auth/LoginPage'
import { DashboardPage } from '../../pages/dashboard/DashboardPage'
import { AssetHubPage } from '../../pages/asset-hub/AssetHubPage'
import { EditorPage } from '../../pages/editor/EditorPage'
import { SettingsPage } from '../../pages/settings/SettingsPage'
import { ProjectDetailPage } from '../../pages/projects/ProjectDetailPage'
import { ProjectListPage } from '../../pages/projects/ProjectListPage'
import { WorkspaceLayout } from '../../pages/workspace/WorkspaceLayout'
import { LoadingState } from '../../components/common/PageState'
import { LegacyWorkspaceRedirect, ProtectedLayout } from './guards'

const CanvasModePage = lazy(() =>
  import('../../pages/workspace/canvas/CanvasModePage').then((module) => ({ default: module.CanvasModePage })),
)

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/projects',
        element: <ProjectListPage />,
      },
      {
        path: '/projects/:projectId',
        element: <ProjectDetailPage />,
      },
      {
        path: '/workspace/:projectId',
        element: <LegacyWorkspaceRedirect />,
      },
      {
        path: '/workspace/:projectId/:episodeId/canvas',
        element: (
          <Suspense fallback={<LoadingState message="正在加载画布模式..." />}>
            <CanvasModePage />
          </Suspense>
        ),
      },
      {
        path: '/workspace/:projectId/:episodeId/:stage',
        element: <WorkspaceLayout />,
      },
      {
        path: '/asset-hub',
        element: <AssetHubPage />,
      },
      {
        path: '/editor/:episodeId',
        element: <EditorPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
