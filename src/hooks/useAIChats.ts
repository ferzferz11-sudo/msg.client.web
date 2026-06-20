// ============================================
// useAIChats — AI Chats List Hook
// ============================================

import { useState, useCallback, useEffect } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'
import type { Chat } from '@/shared/types'

export function useAIChats() {
  const [aiChats, setAiChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const addError = useErrorStore((s) => s.addError)

  const loadAIChats = useCallback(async () => {
    setIsLoading(true)
    try {
      const chats = await grpcClient.getAIChats()
      setAiChats(chats)
    } catch (err) {
      console.error('Failed to load AI chats:', err)
      addError({ message: 'Не удалось загрузить AI чаты', type: 'network' })
    } finally {
      setIsLoading(false)
    }
  }, [addError])

  const renameAIChat = useCallback(async (chatId: string, newName: string) => {
    try {
      const success = await grpcClient.renameAIChat(chatId, newName)
      if (success) {
        setAiChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, name: newName } : c))
        )
      }
      return success
    } catch (err) {
      addError({ message: 'Не удалось переименовать чат', type: 'network' })
      return false
    }
  }, [addError])

  useEffect(() => {
    loadAIChats()
  }, [loadAIChats])

  return {
    aiChats,
    isLoading,
    loadAIChats,
    renameAIChat,
  }
}
