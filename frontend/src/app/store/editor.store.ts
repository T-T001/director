import { create } from 'zustand'

type EditorUIState = {
  playing: boolean
  currentTimeMs: number
  zoom: number
  selectedClipId: string | null
  setPlaying: (playing: boolean) => void
  setCurrentTimeMs: (ms: number) => void
  setZoom: (zoom: number) => void
  setSelectedClipId: (clipId: string | null) => void
}

export const useEditorStore = create<EditorUIState>((set) => ({
  playing: false,
  currentTimeMs: 0,
  zoom: 1,
  selectedClipId: null,
  setPlaying: (playing) => set({ playing }),
  setCurrentTimeMs: (currentTimeMs) => set({ currentTimeMs }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedClipId: (selectedClipId) => set({ selectedClipId }),
}))
