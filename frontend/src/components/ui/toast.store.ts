import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'

export type ToastItem = {
  id: number
  tone: ToastTone
  message: string
}

type ToastState = {
  toasts: ToastItem[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
}

let nextToastId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = nextToastId++
    set((state) => ({ toasts: [...state.toasts.slice(-4), { id, tone, message }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    }, 5200)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

export function pushToast(message: string, tone: ToastTone = 'info') {
  useToastStore.getState().push(message, tone)
}
