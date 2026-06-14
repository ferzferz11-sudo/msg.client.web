// ============================================
// Zustand Store — Error State
// ============================================
// Global error state for displaying toasts,
// inline errors, and connection status.
// ============================================

import { create } from 'zustand'

export interface AppError {
  id: string
  message: string
  type: 'network' | 'auth' | 'rate_limit' | 'server' | 'unknown'
  timestamp: number
  dismissed: boolean
}

interface ErrorState {
  errors: AppError[]
  isOffline: boolean
  addError: (error: Omit<AppError, 'id' | 'timestamp' | 'dismissed'>) => void
  dismissError: (id: string) => void
  clearErrors: () => void
  setOffline: (offline: boolean) => void
}

export const useErrorStore = create<ErrorState>((set) => ({
  errors: [],
  isOffline: false,

  addError: (error) => {
    const id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set((state) => ({
      errors: [
        { ...error, id, timestamp: Date.now(), dismissed: false },
        ...state.errors,
      ].slice(0, 5), // Keep max 5 errors
    }))
  },

  dismissError: (id) => {
    set((state) => ({
      errors: state.errors.map((e) => (e.id === id ? { ...e, dismissed: true } : e)),
    }))
  },

  clearErrors: () => set({ errors: [] }),

  setOffline: (offline) => set({ isOffline: offline }),
}))
