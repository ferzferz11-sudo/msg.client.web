// ============================================
// Zustand Store — Authentication State (V2)
// ============================================
// Persists auth state to localStorage so user
// remains logged in when closing PWA on iPhone.
// V2: JWT access + refresh token pair.
// ============================================

import { create } from 'zustand'
import type { User, TokenPair } from '@/shared/types'

interface AuthState {
  user: User | null
  tokens: TokenPair | null
  isAuthenticated: boolean

  // Actions
  setTokens: (response: {
    accessToken: string
    refreshToken: string
    accessExpiresAt: number
    refreshExpiresAt: number
    user: User
  }) => void
  updateAccessToken: (response: {
    accessToken: string
    refreshToken: string
    accessExpiresAt: number
    refreshExpiresAt: number
  }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state — try to restore from localStorage
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  tokens: JSON.parse(localStorage.getItem('auth_tokens') || 'null'),
  isAuthenticated: !!localStorage.getItem('auth_tokens'),

  setTokens: (response) => {
    const tokens: TokenPair = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      accessExpiresAt: response.accessExpiresAt,
      refreshExpiresAt: response.refreshExpiresAt,
    }
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
    localStorage.setItem('auth_user', JSON.stringify(response.user))
    set({ user: response.user, tokens, isAuthenticated: true })
  },

  updateAccessToken: (response) => {
    set((state) => {
      if (!state.tokens) return state
      const tokens: TokenPair = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        accessExpiresAt: response.accessExpiresAt,
        refreshExpiresAt: response.refreshExpiresAt,
      }
      localStorage.setItem('auth_tokens', JSON.stringify(tokens))
      return { tokens }
    })
  },

  logout: () => {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_tokens')
    // Also clean up legacy keys
    localStorage.removeItem('auth_access_token')
    set({ user: null, tokens: null, isAuthenticated: false })
  },
}))
