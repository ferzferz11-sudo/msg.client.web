// ============================================
// useDevices — Device Management Hook
// ============================================

import { useState, useCallback, useEffect } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'
import { useAuthStore } from '@/store/authStore'

export interface Device {
  deviceId: string
  deviceName: string
  deviceType: string
  lastActiveAt: string
  isCurrent: boolean
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const addError = useErrorStore((s) => s.addError)
  const user = useAuthStore((s) => s.user)

  const loadDevices = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const result = await grpcClient.getDevices(user.id)
      setDevices(result)
    } catch (err) {
      console.error('Failed to load devices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const revokeDevice = useCallback(async (deviceId: string) => {
    try {
      const success = await grpcClient.revokeDevice(deviceId)
      if (success) await loadDevices()
      return success
    } catch (err) {
      addError({ message: 'Не удалось отозвать устройство', type: 'network' })
      return false
    }
  }, [loadDevices, addError])

  const deleteOtherDevices = useCallback(async () => {
    try {
      const success = await grpcClient.deleteOtherDevices()
      if (success) await loadDevices()
      return success
    } catch (err) {
      addError({ message: 'Не удалось удалить другие устройства', type: 'network' })
      return false
    }
  }, [loadDevices, addError])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  return {
    devices,
    isLoading,
    loadDevices,
    revokeDevice,
    deleteOtherDevices,
  }
}
