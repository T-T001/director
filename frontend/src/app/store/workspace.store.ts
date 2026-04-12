import { create } from 'zustand'

import type { WorkspaceStage } from '../router/routes'

type WorkspaceUIState = {
  selectedPanelId: string | null
  activeStage: WorkspaceStage
  sidePanelOpen: boolean
  setSelectedPanelId: (panelId: string | null) => void
  setActiveStage: (stage: WorkspaceStage) => void
  setSidePanelOpen: (open: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceUIState>((set) => ({
  selectedPanelId: null,
  activeStage: 'config',
  sidePanelOpen: true,
  setSelectedPanelId: (selectedPanelId) => set({ selectedPanelId }),
  setActiveStage: (activeStage) => set({ activeStage }),
  setSidePanelOpen: (sidePanelOpen) => set({ sidePanelOpen }),
}))
