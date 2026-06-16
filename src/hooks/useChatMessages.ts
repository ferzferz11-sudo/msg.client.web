// ============================================
// useChatMessages — Chat Messages Hook
// Loads message history + real-time streaming + pagination.
// Features:
// - Loads initial history on mount
// - Opens a receive-only Chat stream via grpcClient for real-time messages
// - Sends messages via grpcClient.sendMessage (ephemeral BiDi stream)
// - Supports pagination (load more on scroll to top)
// ============================================

import { useEffect, useCallback, useRef, useState } from 'react'
import { useChatStore } from '@/store/chatStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import type { Message } from '@/shared/types'

export function useChatMessages(chatId: string | null) {
  const messages = useChatStore((s) => (chatId ? s.getChatMessages(chatId) : []))
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const setMessages = useChatStore((s) => s.setMessages)
  const addMessage = useChatStore((s) => s.addMessage)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const setLoadingMessages = useChatStore((s) => s.setLoadingMessages)
  const setSendingMessage = useChatStore((s) => s.setSendingMessage)
  const updateChat = useChatStore((s) => s.updateChat)
  const user = useAuthStore((s) => s.user)

  // Pagination state
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const oldestMessageIdRef = useRef<string | null>(null)

  const chatIdRef = useRef(chatId)
  chatIdRef.current = chatId

  const userIdRef = useRef(user?.id || '')
  userIdRef.current = user?.id || ''

  // Load message history when chat opens
  useEffect(() => {
    if (!chatId) return

    let cancelled = false
    setLoadingMessages(true)
    setHasMore(true)
    oldestMessageIdRef.current = null

    grpcClient
      .getHistory(chatId, 50)
      .then(({ messages: msgs, hasMore: more }: { messages: Message[]; hasMore: boolean }) => {
        if (cancelled || chatIdRef.current !== chatId) return
        setMessages(chatId, msgs)
        setHasMore(more)
        // Track oldest message for pagination
        if (msgs.length > 0) {
          oldestMessageIdRef.current = msgs[0].id
        }
      })
      .catch((err) => {
        if (cancelled) return
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
        // Only add if it belongs to the current chat
        if (event.message.roomId === chatIdRef.current) {
          addMessage(event.message)
        }
      }
    },
    [addMessage]
  )

  // Subscribe to real-time stream via BiDi Chat stream
  useEffect(() => {
    if (!chatId) return

    const cleanup = grpcClient.openReceiveStream(chatId, handleStreamEvent)

    return () => {
      cleanup()
    }
  }, [chatId, handleStreamEvent])

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!chatId || isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    try {
      const { messages: olderMsgs, hasMore: more } = await grpcClient.getHistory(
        chatId,
        50
      )

      if (olderMsgs.length > 0) {
        prependMessages(chatId, olderMsgs)
        oldestMessageIdRef.current = olderMsgs[0].id
      }

      setHasMore(more)
    } catch (err) {
      console.error('Failed to load more messages:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [chatId, isLoadingMore, hasMore, prependMessages])

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!chatId || !content.trim()) return

      setSendingMessage(true)
      try {
        const message = await grpcClient.sendMessage(
          chatId,
          content.trim(),
          userIdRef.current
        )
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
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMore,
  }
}
