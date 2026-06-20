// ============================================
// useChats — Chat List Hook
// ============================================

import { useEffect, useCallback } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'

export function useChats() {
  const chatList = useChatStore((s) => s.getChatList())
  const isLoadingChats = useChatStore((s) => s.isLoadingChats)
  const setChats = useChatStore((s) => s.setChats)
  const setLoadingChats = useChatStore((s) => s.setLoadingChats)
  const addChat = useChatStore((s) => s.addChat)
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)
  const user = useAuthStore((s) => s.user)
  const addError = useErrorStore((s) => s.addError)

  // Load chats on mount and when user changes
  useEffect(() => {
    let cancelled = false
    setLoadingChats(true)

    const userId = user?.id || ''
    const username = user?.username || ''

    grpcClient
      .getChats(userId, username)
      .then((result) => {
        if (cancelled) return
        setChats(result.chats)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load chats:', err)
        addError({
          message: 'Не удалось загрузить список чатов',
          type: 'network',
        })
      })
      .finally(() => {
        if (!cancelled) setLoadingChats(false)
      })

    return () => {
      cancelled = true
    }
  }, [setChats, setLoadingChats, user?.id, user?.username, addError])

  const openChat = useCallback(
    (chatId: string) => {
      setActiveChatId(chatId)
    },
    [setActiveChatId]
  )

  const createNewChat = useCallback(
    async (participants: string[], _name?: string) => {
      if (!user) return
      const targetUsername = participants[0]
      const targetUserId = await grpcClient.getUserId(targetUsername)
      const chat = await grpcClient.createDirectChat(
        user.username,
        targetUsername,
        user.id,
        targetUserId
      )
      addChat(chat)
      setActiveChatId(chat.id)
    },
    [addChat, setActiveChatId, user]
  )

  return {
    chats: chatList,
    isLoadingChats,
    openChat,
    createNewChat,
  }
}
