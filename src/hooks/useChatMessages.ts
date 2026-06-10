// ============================================
// useChatMessages — Chat Messages Hook
// ============================================
// Loads message history + real-time streaming + pagination.
// Features:
// - Loads initial history on mount
// - Subscribes to real-time stream via useGrpcStream
// - Fetches missed messages on foreground reconnect
// - Supports pagination (load more on scroll to top)
// ============================================

import { useEffect, useCallback, useRef, useState } from 'react'
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
  const prependMessages = useChatStore((s) => s.prependMessages)
  const setLoadingMessages = useChatStore((s) => s.setLoadingMessages)
  const setSendingMessage = useChatStore((s) => s.setSendingMessage)
  const updateChat = useChatStore((s) => s.updateChat)

  // Pagination state
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const oldestMessageIdRef = useRef<string | null>(null)

  const chatIdRef = useRef(chatId)
  chatIdRef.current = chatId

  // Load message history when chat opens
  useEffect(() => {
    if (!chatId) return

    let cancelled = false
    setLoadingMessages(true)
    setHasMore(true)
    oldestMessageIdRef.current = null

    grpcClient
      .getMessages(chatId, 50)
      .then(({ messages: msgs, hasMore: more }) => {
        if (cancelled || chatIdRef.current !== chatId) return
        setMessages(chatId, msgs)
        setHasMore(more)
        // Track oldest message for pagination
        if (msgs.length > 0) {
          oldestMessageIdRef.current = msgs[0].id
        }
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
      if (chatIdRef.current !== chatId) return
      for (const msg of missedMessages) {
        addMessage(msg)
      }
    },
    [addMessage, chatId]
  )

  // Subscribe to real-time stream
  useGrpcStream({
    chatId: chatId || '',
    onEvent: handleStreamEvent,
    onMissedMessages: handleMissedMessages,
    enabled: !!chatId,
  })

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!chatId || isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    try {
      const { messages: olderMsgs, hasMore: more } = await grpcClient.getMessages(
        chatId,
        50,
        oldestMessageIdRef.current || undefined
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
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMore,
  }
}
