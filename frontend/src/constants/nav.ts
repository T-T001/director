import { LayoutDashboard, FolderKanban, FolderHeart, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  description: string
}

export const primaryNavItems: NavItem[] = [
  { to: '/dashboard', label: '工作区', icon: LayoutDashboard, description: '总览与最近活动' },
  { to: '/projects', label: '项目', icon: FolderKanban, description: '管理你的剧集与项目' },
  { to: '/asset-hub', label: '资产中心', icon: FolderHeart, description: '集中管理素材与模型' },
  { to: '/settings', label: '设置', icon: Settings, description: '个人偏好与系统配置' },
]
