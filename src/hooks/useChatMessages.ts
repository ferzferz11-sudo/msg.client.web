// ============================================
// useChatMessages — Chat Messages Hook
// Loads message history + real-time streaming + pagination.
// Features:
// - Loads initial history on mount
// - Opens a receive-only Chat stream via grpcClient for real-time messages
// - Sends messages via grpcClient.sendMessage (ephemeral BiDi stream)
// - Supports pagination (load more on scroll to top)
// - Draft support with debounce save/load/delete
// - Reactions, edit, delete, typing indicators
// - Message selection mode
// ============================================

import { useEffect, useCallback, useRef, useState } from 'react'
import { useChatStore } from '@/store/chatStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import type { Message } from '@/shared/types'

const DRAFT_DEBOUNCE_MS = 800
const TYPING_TIMEOUT_MS = 3000

interface UseChatMessagesOptions {
  chatId: string | null
  onServerShutdown?: () => void
  onReconnecting?: (isReconnecting: boolean) => void
  onStreamError?: (error: string) => void
}

export function useChatMessages({ chatId, onServerShutdown, onReconnecting, onStreamError }: UseChatMessagesOptions) {
  const messages = useChatStore((s) => (chatId ? s.getChatMessages(chatId) : []))
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const setMessages = useChatStore((s) => s.setMessages)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateMessage = useChatStore((s) => s.updateMessage)
  const removeMessageFromChat = useChatStore((s) => s.removeMessage)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const setLoadingMessages = useChatStore((s) => s.setLoadingMessages)
  const setSendingMessage = useChatStore((s) => s.setSendingMessage)
  const updateChat = useChatStore((s) => s.updateChat)
  const user = useAuthStore((s) => s.user)

  // Pagination state
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const oldestMessageIdRef = useRef<string | null>(null)

  // Draft state
  const [draft, setDraft] = useState('')
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  // Selection state
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [isSelecting, setIsSelecting] = useState(false)

  // Typing indicators
  const [typingUsers, setTypingUsers] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Reply state
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)

  const chatIdRef = useRef(chatId)
  chatIdRef.current = chatId

  const userIdRef = useRef(user?.id || '')
  userIdRef.current = user?.id || ''

  // Load draft when chat opens
  useEffect(() => {
    if (!chatId) return
    const savedDraft = localStorage.getItem(`draft_${chatId}`) || ''
    setDraft(savedDraft)
    return () => {
      setDraft('')
      setEditingMessageId(null)
      setEditingText('')
      setSelectedMessages([])
      setIsSelecting(false)
      setReplyToMessage(null)
    }
  }, [chatId])

  // Save draft with debounce
  const updateDraft = useCallback((text: string) => {
    setDraft(text)
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    if (chatIdRef.current) {
      draftTimerRef.current = setTimeout(() => {
        if (text.trim()) {
          localStorage.setItem(`draft_${chatIdRef.current}`, text)
        } else {
          localStorage.removeItem(`draft_${chatIdRef.current}`)
        }
      }, DRAFT_DEBOUNCE_MS)
    }
  }, [])

  // Clear draft on send
  const clearDraft = useCallback(() => {
    if (chatIdRef.current) {
      localStorage.removeItem(`draft_${chatIdRef.current}`)
    }
    setDraft('')
  }, [])

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

  const onServerShutdownRef = useRef(onServerShutdown)
  const onReconnectingRef = useRef(onReconnecting)
  const onStreamErrorRef = useRef(onStreamError)
  onServerShutdownRef.current = onServerShutdown
  onReconnectingRef.current = onReconnecting
  onStreamErrorRef.current = onStreamError

  const handleStreamEvent = useCallback(
    (event: { type: string; message?: Message; chatId?: string; userId?: string; isTyping?: boolean; error?: string }) => {
      if (event.type === 'error') {
        const errorMsg = event.error || ''
        if (errorMsg.includes('SERVER_SHUTTINGDOWN')) {
          onServerShutdownRef.current?.()
          return
        }
        if (errorMsg.includes('UNAVAILABLE')) {
          onStreamErrorRef.current?.(errorMsg)
          return
        }
      }
      if (event.type === 'message' && event.message) {
        if (event.message.roomId === chatIdRef.current) {
          addMessage(event.message)
        }
      }
      if (event.type === 'typing' && event.chatId === chatIdRef.current && event.userId !== userIdRef.current) {
        const userId = event.userId || ''
        setTypingUsers((prev) => {
          const next = new Map(prev)
          const existing = next.get(userId)
          if (existing) clearTimeout(existing)
          if (event.isTyping) {
            const timer = setTimeout(() => {
              setTypingUsers((current) => {
                const updated = new Map(current)
                updated.delete(userId)
                return updated
              })
            }, TYPING_TIMEOUT_MS)
            next.set(userId, timer)
          } else {
            next.delete(userId)
          }
          return next
        })
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
      clearDraft()
      try {
        const replyTo = replyToMessage
          ? { messageId: replyToMessage.id, user: replyToMessage.user, text: replyToMessage.text }
          : undefined
        const message = await grpcClient.sendMessage(
          chatId,
          content.trim(),
          userIdRef.current,
          replyTo,
        )
        addMessage(message)
        setReplyToMessage(null)
      } catch (err) {
        console.error('Failed to send message:', err)
      } finally {
        setSendingMessage(false)
      }
    },
    [chatId, addMessage, setSendingMessage, clearDraft, replyToMessage, setReplyToMessage]
  )

  // Edit message
  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!chatId || !newText.trim()) return
      try {
        const success = await grpcClient.editMessage(messageId, chatId, userIdRef.current, newText)
        if (success) {
          updateMessage(messageId, { text: newText, isEdited: true })
        }
        setEditingMessageId(null)
        setEditingText('')
      } catch (err) {
        console.error('Failed to edit message:', err)
      }
    },
    [chatId, updateMessage]
  )

  // Delete messages
  const deleteMessages = useCallback(
    async (messageIds: string[]) => {
      if (!chatId || messageIds.length === 0) return
      try {
        const success = await grpcClient.deleteMessages(messageIds, chatId, userIdRef.current)
        if (success) {
          for (const id of messageIds) {
            removeMessageFromChat(chatId, id)
          }
        }
        setSelectedMessages([])
        setIsSelecting(false)
      } catch (err) {
        console.error('Failed to delete messages:', err)
      }
    },
    [chatId, removeMessageFromChat]
  )

  // Toggle reaction — server upserts, broadcast updates all clients
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!chatId || !user?.username) return
      try {
        await grpcClient.setReaction(messageId, chatId, userIdRef.current, emoji)
      } catch (err) {
        console.error('Failed to set reaction:', err)
      }
    },
    [chatId, user]
  )

  // Selection helpers
  const toggleSelectMessage = useCallback((messageId: string) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    )
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedMessages([])
    setIsSelecting(false)
  }, [])

  // Start editing
  const startEditing = useCallback((messageId: string, text: string) => {
    setEditingMessageId(messageId)
    setEditingText(text)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null)
    setEditingText('')
  }, [])

  // Cleanup typing timers
  useEffect(() => {
    return () => {
      typingUsers.forEach((timer) => clearTimeout(timer))
    }
  }, [typingUsers])

  return {
    messages,
    isLoadingMessages,
    isSendingMessage,
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMore,
    draft,
    updateDraft,
    clearDraft,
    editingMessageId,
    editingText,
    setEditingText,
    editMessage,
    startEditing,
    cancelEditing,
    deleteMessages,
    toggleReaction,
    selectedMessages,
    isSelecting,
    setIsSelecting,
    toggleSelectMessage,
    clearSelection,
    typingUsers,
    replyToMessage,
    setReplyToMessage,
  }
}
