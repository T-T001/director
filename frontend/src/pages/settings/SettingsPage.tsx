import { useState } from 'react'

import { SectionCard } from '../../components/common/PageState'
import { DefaultModelSection } from './sections/DefaultModelSection'
import { ProviderSection } from './sections/ProviderSection'
import { RenderStrategySection } from './sections/RenderStrategySection'

type Section = 'providers' | 'defaults' | 'strategy' | 'about'

type NavItem = {
  key: Section
  label: string
  description: string
  icon: string
}

const navItems: NavItem[] = [
  {
    key: 'providers',
    label: '模型服务',
    description: '管理 OpenAI 兼容供应商与每个模型的请求路径',
    icon: '🧩',
  },
  {
    key: 'defaults',
    label: '默认模型',
    description: '给分析 / 图像 / 视频 / 音频指定默认模型',
    icon: '🎯',
  },
  {
    key: 'strategy',
    label: '出片策略',
    description: '画风、画面比例、分辨率',
    icon: '🎬',
  },
  {
    key: 'about',
    label: '关于',
    description: '版本信息与帮助链接',
    icon: 'ℹ️',
  },
]

export function SettingsPage() {
  const [section, setSection] = useState<Section>('providers')

  return (
    <div className="grid gap-4 pb-12 animate-page-enter md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="self-start rounded-2xl border border-[var(--glass-stroke-soft)] bg-white/60 p-2">
        <div className="px-2 pb-2 pt-1">
          <h1 className="text-base font-semibold">设置中心</h1>
          <p className="mt-0.5 text-xs text-[var(--glass-text-tertiary)]">
            全局模型与出片策略配置
          </p>
        </div>
        <nav className="grid gap-1">
          {navItems.map((item) => {
            const active = item.key === section
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`grid gap-0.5 rounded-xl px-3 py-2 text-left transition-colors ${
                  active
                    ? 'bg-white shadow-sm ring-1 ring-[var(--glass-accent-from)]/30'
                    : 'hover:bg-white/80'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </span>
                <span className="pl-6 text-[11px] text-[var(--glass-text-tertiary)]">
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
    <SectionCard className="grid gap-3">
      <h2 className="text-lg font-semibold">关于</h2>
      <p className="text-sm text-[var(--glass-text-secondary)]">
        Director — AI 短剧工作台。当前模型服务兼容 OpenAI 协议的 Base URL + Request Path 组合，
        允许把任意 OpenAI 兼容 relay 接入，同时支持每个模型独立自定义请求路径。
      </p>
      <ul className="ml-5 list-disc text-sm text-[var(--glass-text-secondary)]">
        <li>
          <span className="font-semibold">Base URL + Request Path</span>：最终请求 URL 由两者拼接而成，
          例如 Gemini 通过 OpenAI 兼容 relay 使用时，Base URL 指向 relay，Request Path 写
          <code className="mx-1 rounded bg-[var(--glass-bg-muted)] px-1 py-0.5 text-xs">
            /v1/chat/completions
          </code>
          即可。
        </li>
        <li>
          <span className="font-semibold">能力 (capability)</span>：模型按 chat / image / image_edit / video /
          tts / stt / embedding / lipsync 分类，决定它在默认模型中属于哪一类。
        </li>
        <li>
          <span className="font-semibold">额外 Headers / 默认参数</span>：可写入 JSON 在每次请求时附加（例如
          Azure 的 api-key header 或默认 temperature）。
        </li>
      </ul>
    </SectionCard>
  )
}
