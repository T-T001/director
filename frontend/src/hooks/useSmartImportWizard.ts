import { useCallback, useState } from 'react'

import {
  detectEpisodeMarkers,
  splitByMarkers,
  splitByWordCount,
  type EpisodeMarkerResult,
  type SplitEpisode,
} from '../lib/episode-marker-detector'
import { countWords } from '../lib/word-count'

export type WizardStage = 'select' | 'analyzing' | 'preview'

export interface DeleteConfirmState {
  show: boolean
  index: number
  title: string
}

export interface UseSmartImportWizardOptions {
  onBatchSave: (episodes: SplitEpisode[]) => Promise<void>
}

export function useSmartImportWizard({ onBatchSave }: UseSmartImportWizardOptions) {
  const [stage, setStage] = useState<WizardStage>('select')
  const [rawContent, setRawContent] = useState('')
  const [episodes, setEpisodes] = useState<SplitEpisode[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [markerResult, setMarkerResult] = useState<EpisodeMarkerResult | null>(null)
  const [showMarkerConfirm, setShowMarkerConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ show: false, index: -1, title: '' })
  const [saving, setSaving] = useState(false)

  const resetAll = useCallback(() => {
    setStage('select')
    setRawContent('')
    setEpisodes([])
    setSelectedEpisode(0)
    setError(null)
    setMarkerResult(null)
    setShowMarkerConfirm(false)
    setDeleteConfirm({ show: false, index: -1, title: '' })
    setSaving(false)
  }, [])

  const performFallbackSplit = useCallback(async () => {
    setStage('analyzing')
    setError(null)
    setShowMarkerConfirm(false)
    setMarkerResult(null)
    await new Promise((resolve) => setTimeout(resolve, 900))
    const result = splitByWordCount(rawContent, 5000)
    if (result.length === 0) {
      setError('内容过短或无法拆分，请检查文本。')
      setStage('select')
      return
    }
    setEpisodes(result)
    setSelectedEpisode(0)
    setStage('preview')
  }, [rawContent])

  const performMarkerSplit = useCallback(async () => {
    if (!markerResult) return
    setStage('analyzing')
    setShowMarkerConfirm(false)
    await new Promise((resolve) => setTimeout(resolve, 500))
    const result = splitByMarkers(rawContent, markerResult)
    if (result.length === 0) {
      setError('标记分割失败，请尝试均分拆分。')
      setStage('select')
      return
    }
    setEpisodes(result)
    setSelectedEpisode(0)
    setStage('preview')
  }, [markerResult, rawContent])

  const handleAnalyze = useCallback(async () => {
    if (!rawContent.trim() || rawContent.length < 100) {
      setError('请先粘贴至少 100 字的正文内容。')
      return
    }
    setError(null)
    const detection = detectEpisodeMarkers(rawContent)
    if (detection.hasMarkers) {
      setMarkerResult(detection)
      setShowMarkerConfirm(true)
      return
    }
    await performFallbackSplit()
  }, [performFallbackSplit, rawContent])

  const closeMarkerConfirm = useCallback(() => {
    setShowMarkerConfirm(false)
    setMarkerResult(null)
  }, [])

  const updateTitle = useCallback((index: number, title: string) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, title } : ep)))
  }, [])

  const updateSummary = useCallback((index: number, summary: string) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, summary } : ep)))
  }, [])

  const updateNumber = useCallback((index: number, number: number) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, number } : ep)))
  }, [])

  const updateContent = useCallback((index: number, content: string) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, content, wordCount: countWords(content) } : ep)))
  }, [])

  const addEpisode = useCallback(() => {
    setEpisodes((prev) => {
      const nextNumber = prev.length > 0 ? Math.max(...prev.map((ep) => ep.number)) + 1 : 1
      const nextList = [...prev, {
        number: nextNumber,
        title: `第 ${nextNumber} 集`,
        summary: '',
        content: '',
        wordCount: 0,
      }]
      setSelectedEpisode(nextList.length - 1)
      return nextList
    })
  }, [])

  const removeEpisode = useCallback((index: number) => {
    setEpisodes((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((_, i) => i !== index)
      setSelectedEpisode((current) => (current >= next.length ? Math.max(0, next.length - 1) : current))
      return next
    })
  }, [])

  const openDeleteConfirm = useCallback((index: number, title: string) => {
    setDeleteConfirm({ show: true, index, title })
  }, [])

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm({ show: false, index: -1, title: '' })
  }, [])

  const confirmDeleteEpisode = useCallback(() => {
    setDeleteConfirm((state) => {
      if (state.index >= 0) removeEpisode(state.index)
      return { show: false, index: -1, title: '' }
    })
  }, [removeEpisode])

  const handleConfirm = useCallback(async () => {
    if (saving) return
    if (episodes.length === 0) {
      setError('至少需要一个剧集才能保存。')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onBatchSave(episodes)
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败。'
      setError(message)
      setSaving(false)
      return
    }
    setSaving(false)
    resetAll()
  }, [episodes, onBatchSave, resetAll, saving])

  return {
    stage,
    setStage,
    rawContent,
    setRawContent,
    episodes,
    selectedEpisode,
    setSelectedEpisode,
    error,
    saving,
    markerResult,
    showMarkerConfirm,
    deleteConfirm,
    handleAnalyze,
    performFallbackSplit,
    performMarkerSplit,
    closeMarkerConfirm,
    updateTitle,
    updateSummary,
    updateNumber,
    updateContent,
    addEpisode,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDeleteEpisode,
    handleConfirm,
    resetAll,
  }
}
