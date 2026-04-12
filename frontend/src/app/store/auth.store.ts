import { create } from 'zustand'

import type { AuthUser } from '../../types/auth'

type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () =>
    set((state) => {
      if (state.user === null && state.accessToken === null) {
        return state
      }
      return { user: null, accessToken: null }
    }),
}))
