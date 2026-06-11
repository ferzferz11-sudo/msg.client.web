// ============================================
// Zustand Store — Authentication State
// ============================================
// Persists auth state to localStorage so user
// remains logged in when closing PWA on iPhone.
// ============================================

import { create } from 'zustand'
import type { User } from '@/shared/api/gen/proto/messenger_pb'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state — try to restore from localStorage
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  accessToken: localStorage.getItem('auth_access_token'),
  refreshToken: localStorage.getItem('auth_refresh_token'),
  isAuthenticated: !!localStorage.getItem('auth_access_token'),

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    localStorage.setItem('auth_access_token', accessToken)
    localStorage.setItem('auth_refresh_token', refreshToken)
    set({ user, accessToken, refreshToken, isAuthenticated: true })
  },

  setAccessToken: (token) => {
    localStorage.setItem('auth_access_token', token)
    set({ accessToken: token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_access_token')
    localStorage.removeItem('auth_refresh_token')
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
  },
}))
