// ============================================
// useChats — Chat List Hook
// ============================================

import { useEffect, useCallback } from 'react'
import { useChatStore } from '@/store/chatStore'
import { grpcClient } from '@/shared/api/grpcClient'

export function useChats() {
  const chatList = useChatStore((s) => s.getChatList())
  const isLoadingChats = useChatStore((s) => s.isLoadingChats)
  const setChats = useChatStore((s) => s.setChats)
  const setLoadingChats = useChatStore((s) => s.setLoadingChats)
  const addChat = useChatStore((s) => s.addChat)
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)

  // Load chats on mount
  useEffect(() => {
    let cancelled = false
    setLoadingChats(true)

    grpcClient
      .getChats('user-1')
      .then((chats) => {
        if (cancelled) return
        setChats(chats)
      })
      .catch((err) => {
        console.error('Failed to load chats:', err)
      })
      .finally(() => {
        if (!cancelled) setLoadingChats(false)
      })

    return () => {
      cancelled = true
    }
  }, [setChats, setLoadingChats])

  const openChat = useCallback(
    (chatId: string) => {
      setActiveChatId(chatId)
    },
    [setActiveChatId]
  )

  const createNewChat = useCallback(
    async (participants: string[], name?: string) => {
      const chat = await grpcClient.createChat(participants, name)
      addChat(chat)
      setActiveChatId(chat.id)
    },
    [addChat, setActiveChatId]
  )

  return {
    chats: chatList,
    isLoadingChats,
    openChat,
    createNewChat,
  }
}
