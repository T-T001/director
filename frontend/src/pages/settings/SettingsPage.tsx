import { useState, type ComponentType } from 'react'
import { Info, Route, SlidersHorizontal, Target } from 'lucide-react'

import { SectionCard } from '../../components/common/PageState'
import { DefaultModelSection } from './sections/DefaultModelSection'
import { ProviderSection } from './sections/ProviderSection'
import { RenderStrategySection } from './sections/RenderStrategySection'

type Section = 'providers' | 'defaults' | 'strategy' | 'about'

type NavItem = {
  key: Section
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    key: 'providers',
    label: '模型服务',
    description: '管理 OpenAI 兼容供应商与每个模型的请求路径',
    icon: Route,
  },
  {
    key: 'defaults',
    label: '默认模型',
    description: '给分析 / 图像 / 视频 / 音频指定默认模型',
    icon: Target,
  },
  {
    key: 'strategy',
    label: '出片策略',
    description: '画风、画面比例、分辨率',
    icon: SlidersHorizontal,
  },
  {
    key: 'about',
    label: '关于',
    description: '版本信息与帮助链接',
    icon: Info,
  },
]

export function SettingsPage() {
  const [section, setSection] = useState<Section>('providers')

  return (
    <div className="grid gap-5 pb-12 animate-page-enter md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="glass-surface-elevated self-start rounded-[1.75rem] p-3 md:sticky md:top-24">
        <div className="px-3 pb-4 pt-2">
          <p className="field-label text-[var(--glass-accent-cyan)]">System routing</p>
          <h1 className="mt-2 text-xl font-black tracking-tight">设置中心</h1>
          <p className="mt-2 text-xs leading-5 text-[var(--glass-text-tertiary)]">
            全局模型、默认路由与出片策略配置
          </p>
        </div>
        <nav className="grid gap-2">
          {navItems.map((item) => {
            const active = item.key === section
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`grid gap-1 rounded-2xl border px-3 py-3 text-left transition-all ${
                  active
                    ? 'border-amber-200/30 bg-amber-200/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'border-transparent hover:border-[var(--glass-stroke-base)] hover:bg-white/[0.045]'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-black text-[var(--glass-text-primary)]">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${active ? 'border-amber-200/30 bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-stone-950' : 'border-[var(--glass-stroke-soft)] bg-black/18 text-[var(--glass-text-tertiary)]'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </span>
                <span className="pl-10 text-[11px] leading-5 text-[var(--glass-text-tertiary)]">
                  {item.description}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        {section === 'providers' ? <ProviderSection /> : null}
        {section === 'defaults' ? <DefaultModelSection /> : null}
        {section === 'strategy' ? <RenderStrategySection /> : null}
        {section === 'about' ? <AboutSection /> : null}
      </div>
    </div>
  )
}

function AboutSection() {
  return (
    <SectionCard className="grid gap-4">
      <div>
        <p className="field-label text-[var(--glass-accent-cyan)]">About console</p>
        <h2 className="mt-2 text-xl font-black">关于</h2>
      </div>
      <p className="text-sm leading-7 text-[var(--glass-text-secondary)]">
        Director — AI 短剧工作台。当前模型服务兼容 OpenAI 协议的 Base URL + Request Path 组合，
        允许把任意 OpenAI 兼容 relay 接入，同时支持每个模型独立自定义请求路径。
      </p>
      <ul className="ml-5 list-disc space-y-2 text-sm leading-7 text-[var(--glass-text-secondary)]">
        <li>
          <span className="font-black text-[var(--glass-text-primary)]">Base URL + Request Path</span>：最终请求 URL 由两者拼接而成，
          例如 Gemini 通过 OpenAI 兼容 relay 使用时，Base URL 指向 relay，Request Path 写
          <code className="mx-1 rounded bg-[var(--glass-bg-muted)] px-1 py-0.5 text-xs">
            /v1/chat/completions
          </code>
          即可。
        </li>
        <li>
          <span className="font-black text-[var(--glass-text-primary)]">能力 (capability)</span>：模型按 chat / image / image_edit / video /
          tts / stt / embedding / lipsync 分类，决定它在默认模型中属于哪一类。
        </li>
        <li>
          <span className="font-black text-[var(--glass-text-primary)]">额外 Headers / 默认参数</span>：可写入 JSON 在每次请求时附加（例如
          Azure 的 api-key header 或默认 temperature）。
        </li>
      </ul>
    </SectionCard>
  )
}
