// ============================================
// Zustand Store — Authentication State
// ============================================
// Persists auth state to localStorage so user
// remains logged in when closing PWA on iPhone.
// ============================================

import { create } from 'zustand'
import type { User } from '@/shared/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean

  // Actions
  setAuth: (user: User, accessToken: string) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state — try to restore from localStorage
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  accessToken: localStorage.getItem('auth_access_token'),
  isAuthenticated: !!localStorage.getItem('auth_access_token'),

  setAuth: (user, accessToken) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    localStorage.setItem('auth_access_token', accessToken)
    set({ user, accessToken, isAuthenticated: true })
  },

  setAccessToken: (token) => {
    localStorage.setItem('auth_access_token', token)
    set({ accessToken: token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_access_token')
    set({ user: null, accessToken: null, isAuthenticated: false })
  },
}))
