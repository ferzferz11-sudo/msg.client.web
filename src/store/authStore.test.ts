import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.tokens).toBeNull()
  })

  it('sets tokens and user on login', () => {
    const response = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      accessExpiresAt: 1700000000,
      refreshExpiresAt: 1700100000,
      user: { id: 'u1', username: 'testuser', email: 'test@example.com' },
    }
    useAuthStore.getState().setTokens(response)
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.username).toBe('testuser')
    expect(state.tokens?.accessToken).toBe('access-123')
  })

  it('persists to localStorage', () => {
    const response = {
      accessToken: 'acc',
      refreshToken: 'ref',
      accessExpiresAt: 1700000000,
      refreshExpiresAt: 1700100000,
      user: { id: 'u1', username: 'persist', email: 'p@e.com' },
    }
    useAuthStore.getState().setTokens(response)
    expect(localStorage.getItem('auth_tokens')).toBeTruthy()
    expect(localStorage.getItem('auth_user')).toBeTruthy()
  })

  it('updates access token without resetting user', () => {
    useAuthStore.getState().setTokens({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      accessExpiresAt: 1700000000,
      refreshExpiresAt: 1700100000,
      user: { id: 'u1', username: 'test', email: 't@e.com' },
    })
    useAuthStore.getState().updateAccessToken({
      accessToken: 'new',
      refreshToken: 'new-refresh',
      accessExpiresAt: 1700200000,
      refreshExpiresAt: 1700300000,
    })
    const state = useAuthStore.getState()
    expect(state.tokens?.accessToken).toBe('new')
    expect(state.tokens?.refreshToken).toBe('new-refresh')
    expect(state.user?.username).toBe('test')
  })

  it('logout clears everything', () => {
    useAuthStore.getState().setTokens({
      accessToken: 'acc',
      refreshToken: 'ref',
      accessExpiresAt: 1700000000,
      refreshExpiresAt: 1700100000,
      user: { id: 'u1', username: 'test', email: 't@e.com' },
    })
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.tokens).toBeNull()
    expect(localStorage.getItem('auth_tokens')).toBeNull()
    expect(localStorage.getItem('auth_user')).toBeNull()
  })

  it('updateAccessToken is no-op when no tokens', () => {
    useAuthStore.getState().updateAccessToken({
      accessToken: 'new',
      refreshToken: 'new-refresh',
      accessExpiresAt: 1700000000,
      refreshExpiresAt: 1700100000,
    })
    expect(useAuthStore.getState().tokens).toBeNull()
  })
})
