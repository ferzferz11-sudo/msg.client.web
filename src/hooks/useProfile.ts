// ============================================
// useProfile — User Profile Hook
// ============================================

import { useState, useCallback, useEffect } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import { useErrorStore } from '@/store/errorStore'

export interface ProfileData {
  id: string
  username: string
  email: string
  avatarUrl: string
  fullAvatarUrl: string
  bio: string
  status: string
  locale: string
  isSuperAdmin: boolean
  createdAt: string
  lastSeenAt: string
}

export interface UserSettings {
  locale: string
  themeId: string
  pushEnabled: boolean
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [settings, setSettings] = useState<UserSettings>({ locale: 'ru', themeId: '', pushEnabled: true })
  const [isLoading, setIsLoading] = useState(false)
  const [serverInfo, setServerInfo] = useState<Record<string, string>>({})
  const addError = useErrorStore((s) => s.addError)

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    try {
      const p = await grpcClient.getProfile()
      setProfile({
        id: p.id || '',
        username: p.username || '',
        email: p.email || '',
        avatarUrl: p.avatarUrl || '',
        fullAvatarUrl: p.fullAvatarUrl || '',
        bio: p.bio || '',
        status: p.status || '',
        locale: p.locale || 'ru',
        isSuperAdmin: p.isSuperAdmin || false,
        createdAt: p.createdAt || '',
        lastSeenAt: p.lastSeenAt || '',
      })
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const s = await grpcClient.getUserSettings()
      setSettings(s)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [])

  const updateProfile = useCallback(async (updates: {
    username?: string
    bio?: string
    status?: string
    locale?: string
  }) => {
    try {
      const success = await grpcClient.updateProfile(updates)
      if (success) await loadProfile()
      return success
    } catch (err) {
      addError({ message: 'Не удалось обновить профиль', type: 'network' })
      return false
    }
  }, [loadProfile, addError])

  const updateAvatar = useCallback(async (avatarUrl: string, fullAvatarUrl?: string) => {
    try {
      const success = await grpcClient.updateAvatar(avatarUrl, fullAvatarUrl)
      if (success) await loadProfile()
      return success
    } catch (err) {
      addError({ message: 'Не удалось обновить аватар', type: 'network' })
      return false
    }
  }, [loadProfile, addError])

  const updateSettings = useCallback(async (updates: {
    locale?: string
    themeId?: string
    pushEnabled?: boolean
  }) => {
    try {
      const success = await grpcClient.updateUserSettings(updates)
      if (success) await loadSettings()
      return success
    } catch (err) {
      addError({ message: 'Не удалось обновить настройки', type: 'network' })
      return false
    }
  }, [loadSettings, addError])

  const updateUsername = useCallback(async (newUsername: string) => {
    try {
      const userId = useAuthStore.getState().user?.id || profile?.id || ''
      const success = await grpcClient.updateUsername(userId, newUsername)
      if (success) await loadProfile()
      return success
    } catch (err) {
      addError({ message: 'Не удалось изменить имя пользователя', type: 'network' })
      return false
    }
  }, [profile, loadProfile, addError])

  const updatePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    try {
      const userId = useAuthStore.getState().user?.id || profile?.id || ''
      const success = await grpcClient.updatePassword(userId, oldPassword, newPassword)
      return success
    } catch (err) {
      addError({ message: 'Не удалось изменить пароль', type: 'network' })
      return false
    }
  }, [profile, addError])

  const deleteProfile = useCallback(async (_password?: string) => {
    try {
      const success = await grpcClient.deleteProfile()
      if (success) {
        useAuthStore.getState().logout()
      }
      return success
    } catch (err) {
      addError({ message: 'Не удалось удалить профиль', type: 'network' })
      return false
    }
  }, [addError])

  const loadServerInfo = useCallback(async () => {
    try {
      const info = await grpcClient.fetchServerInfo()
      setServerInfo(info)
    } catch (err) {
      console.error('Failed to load server info:', err)
    }
  }, [])

  useEffect(() => {
    loadProfile()
    loadSettings()
    loadServerInfo()
  }, [loadProfile, loadSettings, loadServerInfo])

  return {
    profile,
    settings,
    isLoading,
    serverInfo,
    loadProfile,
    loadSettings,
    updateProfile,
    updateAvatar,
    updateSettings,
    updateUsername,
    updatePassword,
    deleteProfile,
  }
}
