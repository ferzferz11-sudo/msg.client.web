// ============================================
// usePinnedMessages — Pinned Messages Hook
// ============================================

import { useState, useCallback } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'
import type { Message } from '@/shared/types'

export function usePinnedMessages(chatId: string) {
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const addError = useErrorStore((s) => s.addError)

  const loadPinnedMessages = useCallback(async () => {
    if (!chatId) return
    setIsLoading(true)
    try {
      const messages = await grpcClient.getPinnedMessages(chatId)
      setPinnedMessages(messages)
    } catch (err) {
      console.error('Failed to load pinned messages:', err)
      addError({ message: 'Не удалось загрузить закреплённые сообщения', type: 'network' })
    } finally {
      setIsLoading(false)
    }
  }, [chatId, addError])

  const pinMessage = useCallback(async (messageId: string) => {
    if (!chatId) return false
    try {
      const success = await grpcClient.pinMessage(chatId, messageId)
      if (success) await loadPinnedMessages()
      return success
    } catch (err) {
      addError({ message: 'Не удалось закрепить сообщение', type: 'network' })
      return false
    }
  }, [chatId, loadPinnedMessages, addError])

  const unpinMessage = useCallback(async (messageId: string) => {
    if (!chatId) return false
    try {
      const success = await grpcClient.unPinMessage(chatId, messageId)
      if (success) await loadPinnedMessages()
      return success
    } catch (err) {
      addError({ message: 'Не удалось открепить сообщение', type: 'network' })
      return false
    }
  }, [chatId, loadPinnedMessages, addError])

  return {
    pinnedMessages,
    isLoading,
    loadPinnedMessages,
    pinMessage,
    unpinMessage,
  }
}
