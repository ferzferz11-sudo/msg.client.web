// ============================================
// useChatMessages — Chat Messages Hook
// ============================================
// Loads message history and subscribes to
// real-time stream. Handles iOS lifecycle:
// - Fetches missed messages on foreground
// - Tracks last message timestamp
// - Delegates stream lifecycle to useGrpcStream
// ============================================

import { useEffect, useCallback, useRef } from 'react'
import { useChatStore } from '@/store/chatStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { useGrpcStream } from '@/hooks/useGrpcStream'
import type { Message } from '@/shared/types'

export function useChatMessages(chatId: string | null) {
  const messages = useChatStore((s) => (chatId ? s.getChatMessages(chatId) : []))
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const setMessages = useChatStore((s) => s.setMessages)
  const addMessage = useChatStore((s) => s.addMessage)
  const setLoadingMessages = useChatStore((s) => s.setLoadingMessages)
  const setSendingMessage = useChatStore((s) => s.setSendingMessage)
  const updateChat = useChatStore((s) => s.updateChat)

  const chatIdRef = useRef(chatId)
  chatIdRef.current = chatId

  // Load message history when chat opens
  useEffect(() => {
    if (!chatId) return

    let cancelled = false
    setLoadingMessages(true)

    grpcClient
      .getMessages(chatId, 50)
      .then((msgs) => {
        if (cancelled || chatIdRef.current !== chatId) return
        setMessages(chatId, msgs)
      })
      .catch((err) => {
        console.error('Failed to load messages:', err)
      })
      .finally(() => {
        if (!cancelled && chatIdRef.current === chatId) {
          setLoadingMessages(false)
        }
      })

    // Mark chat as read
    updateChat(chatId, { unreadCount: 0 })

    return () => {
      cancelled = true
    }
  }, [chatId, setMessages, setLoadingMessages, updateChat])

  // Handle incoming stream events
  const handleStreamEvent = useCallback(
    (event: { type: string; message?: Message }) => {
      if (event.type === 'message' && event.message) {
        // Only add if we're still on this chat
        if (chatIdRef.current === event.message.chatId) {
          addMessage(event.message)
        }
      }
    },
    [addMessage]
  )

  // Handle missed messages (from background reconnect)
  const handleMissedMessages = useCallback(
    (missedMessages: Message[]) => {
      // Only add if we're still on this chat
      if (chatIdRef.current !== chatId) return

      for (const msg of missedMessages) {
        addMessage(msg)
      }
    },
    [addMessage, chatId]
  )

  // Subscribe to real-time stream with lifecycle management
  useGrpcStream({
    chatId: chatId || '',
    onEvent: handleStreamEvent,
    onMissedMessages: handleMissedMessages,
    enabled: !!chatId,
  })

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!chatId || !content.trim()) return

      setSendingMessage(true)
      try {
        const message = await grpcClient.sendMessage(chatId, content.trim(), 'user-1')
        addMessage(message)
      } catch (err) {
        console.error('Failed to send message:', err)
      } finally {
        setSendingMessage(false)
      }
    },
    [chatId, addMessage, setSendingMessage]
  )

  return {
    messages,
    isLoadingMessages,
    isSendingMessage,
    sendMessage,
  }
}
