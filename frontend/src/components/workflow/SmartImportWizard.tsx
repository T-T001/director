import { useMemo } from 'react'
import { Sparkles, FileText, Zap, Edit3, ArrowRight, X, Plus, Trash2, BookOpen, Loader2 } from 'lucide-react'

import { countWords } from '../../lib/word-count'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useSmartImportWizard } from '../../hooks/useSmartImportWizard'
import type { EpisodeMarkerResult, SplitEpisode } from '../../lib/episode-marker-detector'
export type { SplitEpisode }

type Props = {
  open: boolean
  onClose: () => void
  onBatchSave: (episodes: SplitEpisode[]) => Promise<void>
  onManualCreate: () => void
}

const MAX_WORDS = 30000

export function SmartImportWizard({ open, onClose, onBatchSave, onManualCreate }: Props) {
  const wizard = useSmartImportWizard({ onBatchSave })

  const currentWordCount = useMemo(() => countWords(wizard.rawContent), [wizard.rawContent])
  const totalWords = useMemo(
    () => wizard.episodes.reduce((sum, ep) => sum + ep.wordCount, 0),
    [wizard.episodes],
  )
  const averageWords = wizard.episodes.length > 0
    ? Math.round(totalWords / wizard.episodes.length)
    : 0

  const active = wizard.episodes[wizard.selectedEpisode] ?? null

  const handleClose = () => {
    if (wizard.saving) return
    wizard.resetAll()
    onClose()
  }

  const handleManualCreate = () => {
    if (wizard.saving) return
    wizard.resetAll()
    onClose()
    onManualCreate()
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} width={1100}>
        <div className="relative">
          <button
            onClick={handleClose}
            className="absolute right-0 top-0 rounded-full p-1.5 text-[var(--glass-text-tertiary)] transition hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-text-primary)]"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>

          {wizard.stage === 'select' && (
            <div className="grid gap-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-3 py-1 text-xs text-[var(--glass-text-secondary)]">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--glass-accent-from)]" /> 剧集创建向导
                </div>
                <h1 className="mt-3 text-3xl font-bold text-[var(--glass-text-primary)]">
                  智能导入 · 一键拆集
                </h1>
                <p className="mt-2 text-sm text-[var(--glass-text-secondary)]">
                  粘贴整本小说或多集剧本，自动识别章节标记并拆分为剧集列表；也可选择手动逐集创建。
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={handleManualCreate}
                  className="group relative overflow-hidden rounded-2xl border-2 border-[var(--glass-stroke-base)] bg-white/[0.03] p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--glass-stroke-focus)] hover:shadow-[var(--glass-shadow-md)]"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)] transition group-hover:bg-[var(--glass-tone-info-bg)] group-hover:text-[var(--glass-tone-info-fg)]">
                    <Edit3 className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-[var(--glass-text-primary)]">手动创建</h3>
                  <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">逐集创建，精细控制每一集的名称、摘要与正文。</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--glass-accent-from)]">
                    去手动创建 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>

                <div className="rounded-2xl border-2 border-[var(--glass-accent-from)]/30 bg-gradient-to-br from-[var(--glass-bg-muted)] to-white/[0.05] p-6">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--glass-accent-from)] to-[var(--glass-accent-to)] text-white shadow-[var(--glass-shadow-md)]">
                      <Zap className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--glass-text-primary)]">智能导入</h3>
                      <p className="text-sm text-[var(--glass-text-tertiary)]">粘贴文本 → 自动检测章节标记 / 字数均分</p>
                    </div>
                  </div>

                  <textarea
                    value={wizard.rawContent}
                    onChange={(e) => wizard.setRawContent(e.target.value)}
                    className="glass-input mt-4 min-h-[220px] resize-none leading-relaxed"
                    placeholder="粘贴小说全文或多集剧本文本...&#10;&#10;例如：&#10;第一集 剧情开端&#10;(本集正文内容)&#10;&#10;第二集 冲突升级&#10;(本集正文内容)"
                  />

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className={[
                      'font-medium',
                      currentWordCount > MAX_WORDS ? 'text-[var(--glass-tone-danger-fg)]' : 'text-[var(--glass-text-tertiary)]',
                    ].join(' ')}>
                      {currentWordCount.toLocaleString()} 字 / {MAX_WORDS.toLocaleString()} 字
                    </span>
                    <button
                      onClick={() => void wizard.handleAnalyze()}
                      disabled={!wizard.rawContent.trim() || wizard.rawContent.length < 100}
                      className="glass-btn-base glass-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      开始智能分析
                    </button>
                  </div>

                  {wizard.error ? (
                    <div className="glass-danger mt-3 rounded-lg px-3 py-2 text-xs">{wizard.error}</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-4 py-3 text-xs text-[var(--glass-text-tertiary)]">
                <p className="font-semibold text-[var(--glass-text-secondary)]">支持的章节标记</p>
                <p className="mt-1">第X集 / 第X章 / 第X幕 / 1. 标题 / Episode X / Chapter X ——— 未识别时会按字数（约 5000 字/集）智能均分。</p>
              </div>
            </div>
          )}

          {wizard.stage === 'analyzing' && (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 py-12">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-12 w-3 rounded-full bg-gradient-to-t from-[var(--glass-accent-from)] to-[var(--glass-accent-to)]"
                    style={{ animation: `wizard-wave 1s ease-in-out ${i * 0.1}s infinite` }}
                  />
                ))}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-[var(--glass-text-primary)]">正在解析剧本结构...</h2>
                <p className="mt-2 text-sm text-[var(--glass-text-secondary)]">识别章节标记、拆分剧集、生成摘要中，马上就好。</p>
              </div>
              <style>{`
                @keyframes wizard-wave {
                  0%, 100% { transform: scaleY(0.4); }
                  50% { transform: scaleY(1); }
                }
              `}</style>
            </div>
          )}

          {wizard.stage === 'preview' && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-4 py-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--glass-text-primary)]">预览并编辑拆分结果</h2>
                  <p className="mt-0.5 text-sm text-[var(--glass-text-secondary)]">
                    共 <strong>{wizard.episodes.length}</strong> 集 · 总字数{' '}
                    <strong>{totalWords.toLocaleString()}</strong> · 平均{' '}
                    <strong>{averageWords.toLocaleString()}</strong> 字/集
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => wizard.setStage('select')} disabled={wizard.saving}>
                    重新分析
                  </Button>
                  <Button onClick={() => void wizard.handleConfirm()} disabled={wizard.saving}>
                    {wizard.saving ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" /> 保存中...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" /> 确认并创建 {wizard.episodes.length} 集
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {wizard.error ? (
                <div className="glass-danger rounded-xl px-3 py-2 text-sm">{wizard.error}</div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">剧集列表</h3>
                    <span className="text-xs text-[var(--glass-text-tertiary)]">{wizard.episodes.length} 项</span>
                  </div>
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {wizard.episodes.map((ep, index) => {
                      const isActive = index === wizard.selectedEpisode
                      return (
                        <div
                          key={index}
                          onClick={() => wizard.setSelectedEpisode(index)}
                          className={[
                            'group relative cursor-pointer rounded-xl border p-3 transition',
                            isActive
                              ? 'border-[var(--glass-accent-from)] bg-[var(--glass-bg-muted)] shadow-[var(--glass-shadow-sm)]'
                              : 'border-[var(--glass-stroke-base)] bg-white/[0.03] hover:border-[var(--glass-stroke-focus)] hover:bg-white/[0.07]',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={ep.number}
                              onChange={(e) => wizard.updateNumber(index, Math.max(1, Number(e.target.value) || 1))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-14 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-semibold text-[var(--glass-accent-from)] hover:border-[var(--glass-stroke-base)] focus:border-[var(--glass-stroke-focus)] focus:outline-none"
                            />
                            <span className="text-xs text-[var(--glass-text-tertiary)]">集</span>
                            <span className="ml-auto rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-[var(--glass-text-tertiary)]">
                              {ep.wordCount.toLocaleString()} 字
                            </span>
                            {wizard.episodes.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  wizard.openDeleteConfirm(index, ep.title || `第 ${ep.number} 集`)
                                }}
                                className="rounded p-1 text-[var(--glass-text-tertiary)] opacity-0 transition hover:bg-[var(--glass-tone-danger-bg)] hover:text-[var(--glass-tone-danger-fg)] group-hover:opacity-100"
                                title="删除该集"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={ep.title}
                            onChange={(e) => wizard.updateTitle(index, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="剧集名称"
                            className="mt-1.5 w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-[var(--glass-text-primary)] hover:border-[var(--glass-stroke-base)] focus:border-[var(--glass-stroke-focus)] focus:outline-none"
                          />
                          <input
                            type="text"
                            value={ep.summary}
                            onChange={(e) => wizard.updateSummary(index, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="一句话摘要（可选）"
                            className="mt-0.5 w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-[var(--glass-text-tertiary)] hover:border-[var(--glass-stroke-base)] focus:border-[var(--glass-stroke-focus)] focus:outline-none"
                          />
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={wizard.addEpisode}
                    className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--glass-stroke-base)] py-2.5 text-sm text-[var(--glass-text-tertiary)] transition hover:border-[var(--glass-accent-from)] hover:bg-[var(--glass-bg-muted)] hover:text-[var(--glass-accent-from)]"
                  >
                    <Plus className="h-4 w-4" /> 新增一集
                  </button>
                </div>

                <div className="rounded-2xl border border-[var(--glass-stroke-base)] bg-white/[0.05] p-4">
                  {active ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-[var(--glass-text-tertiary)]">当前编辑</p>
                          <h3 className="text-lg font-bold text-[var(--glass-text-primary)]">
                            第 {active.number} 集 · {active.title || '未命名'}
                          </h3>
                        </div>
                        <span className="glass-chip">
                          <FileText className="h-3 w-3" /> {active.wordCount.toLocaleString()} 字
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-[var(--glass-text-secondary)]">剧集标题</span>
                          <input
                            type="text"
                            value={active.title}
                            onChange={(e) => wizard.updateTitle(wizard.selectedEpisode, e.target.value)}
                            className="glass-input"
                            placeholder="例如：第 1 集 风起"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-[var(--glass-text-secondary)]">摘要（可选）</span>
                          <input
                            type="text"
                            value={active.summary}
                            onChange={(e) => wizard.updateSummary(wizard.selectedEpisode, e.target.value)}
                            className="glass-input"
                            placeholder="一句话概括本集主要剧情"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-[var(--glass-text-secondary)]">剧集正文</span>
                          <textarea
                            value={active.content}
                            onChange={(e) => wizard.updateContent(wizard.selectedEpisode, e.target.value)}
                            className="glass-input min-h-[320px] resize-y leading-relaxed"
                            placeholder="剧集正文..."
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center text-sm text-[var(--glass-text-tertiary)]">
                      请先从左侧选择一集进行编辑。
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {wizard.showMarkerConfirm && wizard.markerResult && (
        <Modal open onClose={wizard.closeMarkerConfirm} title="检测到章节标记" subtitle="可以直接按标记拆分，也可以退回使用字数均分" width={560}>
          <div className="grid gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--glass-tone-info-fg)]/30 bg-[var(--glass-tone-info-bg)]/30 px-4 py-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--glass-text-primary)]">
                  识别到 {wizard.markerResult.matches.length} 处「{wizard.markerResult.markerType}」标记
                </p>
                <p className="text-xs text-[var(--glass-text-tertiary)]">
                  置信度：{wizard.markerResult.confidence === 'high' ? '高' : wizard.markerResult.confidence === 'medium' ? '中' : '低'}
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] p-3 text-sm">
              {(wizard.markerResult as EpisodeMarkerResult).previewSplits.slice(0, 10).map((split, idx: number) => (
                <div key={idx} className="flex items-start gap-3 border-b border-[var(--glass-stroke-soft)] py-1.5 last:border-0">
                  <span className="w-16 font-semibold text-[var(--glass-tone-info-fg)]">第 {split.number} 集</span>
                  <span className="flex-1 truncate text-[var(--glass-text-secondary)]">{split.preview || split.title}</span>
                  <span className="text-xs text-[var(--glass-text-tertiary)]">~{split.wordCount.toLocaleString()} 字</span>
                </div>
              ))}
              {wizard.markerResult.previewSplits.length > 10 && (
                <p className="mt-2 text-center text-xs text-[var(--glass-text-tertiary)]">
                  ...余下 {wizard.markerResult.previewSplits.length - 10} 集未展示
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => void wizard.performMarkerSplit()}
                className="glass-btn-base glass-btn-primary flex flex-col items-center gap-1 py-3"
              >
                <span className="font-semibold">按标记拆分</span>
                <span className="text-[11px] font-normal opacity-90">精确使用识别到的章节边界</span>
              </button>
              <button
                onClick={() => void wizard.performFallbackSplit()}
                className="glass-btn-base glass-btn-secondary flex flex-col items-center gap-1 py-3"
              >
                <span className="font-semibold">字数均分</span>
                <span className="text-[11px] font-normal text-[var(--glass-text-tertiary)]">按约 5000 字/集切分</span>
              </button>
            </div>

            <button onClick={wizard.closeMarkerConfirm} className="text-sm text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]">
              取消
            </button>
          </div>
        </Modal>
      )}

      {wizard.deleteConfirm.show && (
        <Modal open onClose={wizard.closeDeleteConfirm} title="删除该剧集？" subtitle="此操作只会从拆分结果中移除，不影响已保存数据" width={420}>
          <div className="grid gap-4">
            <p className="text-sm text-[var(--glass-text-secondary)]">
              将移除「{wizard.deleteConfirm.title}」，是否继续？
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={wizard.closeDeleteConfirm}>取消</Button>
              <button
                onClick={wizard.confirmDeleteEpisode}
                className="glass-btn-base rounded-xl bg-[var(--glass-tone-danger-fg)] px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
              >
                删除
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
