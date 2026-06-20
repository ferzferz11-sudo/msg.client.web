// ============================================
// useNotifications — Server Notifications Hook
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  chatId?: string
  isRead: boolean
  createdAt: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const addError = useErrorStore((s) => s.addError)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const loadHistory = useCallback(async (limit = 50) => {
    setIsLoading(true)
    try {
      const items = await grpcClient.getNotificationHistory(limit)
      const mapped: Notification[] = items.map((n: any) => ({
        id: n.id || '',
        type: n.type || 'info',
        title: n.title || '',
        body: n.body || '',
        chatId: n.chatId || '',
        isRead: n.isRead || false,
        createdAt: n.createdAt || new Date().toISOString(),
      }))
      setNotifications(mapped)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markRead = useCallback(async (notificationIds: string[]) => {
    try {
      await grpcClient.markNotificationsRead(notificationIds)
      setNotifications((prev) =>
        prev.map((n) => (notificationIds.includes(n.id) ? { ...n, isRead: true } : n))
      )
    } catch (err) {
      addError({ message: 'Не удалось отметить уведомления', type: 'network' })
    }
  }, [addError])

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)
    if (unreadIds.length > 0) await markRead(unreadIds)
  }, [notifications, markRead])

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await grpcClient.getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      console.warn('[Notifications] Failed to refresh unread count:', err)
    }
  }, [])

  const subscribe = useCallback(async () => {
    try {
      const unsub = await grpcClient.subscribeNotifications((notification: any) => {
        const n: Notification = {
          id: notification.id || '',
          type: notification.type || 'info',
          title: notification.title || '',
          body: notification.body || '',
          chatId: notification.chatId || '',
          isRead: false,
          createdAt: notification.createdAt || new Date().toISOString(),
        }
        setNotifications((prev) => [n, ...prev])
        setUnreadCount((c) => c + 1)
      })
      unsubscribeRef.current = unsub
    } catch (err) {
      console.error('Failed to subscribe to notifications:', err)
    }
  }, [])

  const unsubscribe = useCallback(() => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
  }, [])

  // Auto-subscribe on mount, cleanup on unmount
  useEffect(() => {
    subscribe()
    loadHistory()
    refreshUnreadCount()
    return () => unsubscribe()
  }, [subscribe, loadHistory, refreshUnreadCount, unsubscribe])

  return {
    notifications,
    unreadCount,
    isLoading,
    loadHistory,
    markRead,
    markAllRead,
    refreshUnreadCount,
    subscribe,
    unsubscribe,
  }
}
