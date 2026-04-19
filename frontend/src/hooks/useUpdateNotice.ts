import { useCallback, useEffect, useRef, useState } from 'react'

const CURRENT_VERSION: string = '0.1.0'
const LATEST_MOCK_VERSION: string = '0.2.0'
const RELEASE_URL = 'https://github.com/T-T001/director/releases'
const RELEASE_NAME = '导演助手 0.2.0 · 玻璃质感 UI 升级'
const PUBLISHED_AT = '2026-04-15'

const STORAGE_KEY = 'director.update-notice.dismissed'

type CheckState = 'idle' | 'checking' | 'up-to-date'

export function useUpdateNotice() {
  const [dismissed, setDismissed] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(STORAGE_KEY)
  })
  const [showModal, setShowModal] = useState(false)
  const [checkState, setCheckState] = useState<CheckState>('idle')
  const fadeTimer = useRef<number | null>(null)
  const clearTimer = useRef<number | null>(null)

  const hasUpdate = LATEST_MOCK_VERSION !== CURRENT_VERSION
  const update = hasUpdate
    ? {
        latestVersion: LATEST_MOCK_VERSION,
        releaseUrl: RELEASE_URL,
        releaseName: RELEASE_NAME,
        publishedAt: PUBLISHED_AT,
      }
    : null

  const shouldPulse = hasUpdate && dismissed !== LATEST_MOCK_VERSION

  const openModal = useCallback(() => {
    if (!hasUpdate) return
    setShowModal(true)
  }, [hasUpdate])

  const closeModal = useCallback(() => setShowModal(false), [])

  const dismissCurrentUpdate = useCallback(() => {
    if (!update) return
    window.localStorage.setItem(STORAGE_KEY, update.latestVersion)
    setDismissed(update.latestVersion)
    setShowModal(false)
  }, [update])

  const checkNow = useCallback(async () => {
    setCheckState('checking')
    await new Promise((r) => setTimeout(r, 1000))
    setCheckState(hasUpdate ? 'idle' : 'up-to-date')
    if (!hasUpdate) {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
      if (clearTimer.current) window.clearTimeout(clearTimer.current)
      clearTimer.current = window.setTimeout(() => setCheckState('idle'), 2400)
    }
  }, [hasUpdate])

  useEffect(() => {
    return () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
      if (clearTimer.current) window.clearTimeout(clearTimer.current)
    }
  }, [])

  return {
    currentVersion: CURRENT_VERSION,
    update,
    shouldPulse,
    showModal,
    openModal,
    closeModal,
    dismissCurrentUpdate,
    checkNow,
    checkState,
  }
}
