import { useState, useCallback } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'

export interface AdminUser {
  username: string
  email: string
  userId: string
  avatarUrl: string
  fullAvatarUrl: string
  isSuperAdmin: boolean
  lastClientVersion: string
  lastSeenAt: string
  isOnline: boolean
  lastMessageText: string
  lastMessageTime: string
  chatCount: number
}

type SortBy = 'lastSeenAt' | 'username' | 'chatCount'

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState('')
  const addError = useErrorStore((s) => s.addError)

  const loadUsers = useCallback(async (options: { query?: string; sortBy?: SortBy; append?: boolean } = {}) => {
    setIsLoading(true)
    try {
      const result = await grpcClient.getAdminUserList({
        query: options.query,
        sortBy: options.sortBy,
        limit: 50,
        cursor: options.append ? nextCursor : '',
      })
      if (options.append) {
        setUsers((prev) => [...prev, ...result.users])
      } else {
        setUsers(result.users)
      }
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
    } catch (err) {
      addError({ message: 'Не удалось загрузить пользователей', type: 'network' })
    } finally {
      setIsLoading(false)
    }
  }, [nextCursor, addError])

  return {
    users,
    isLoading,
    hasMore,
    loadUsers,
  }
}
