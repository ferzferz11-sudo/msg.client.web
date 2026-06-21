// ============================================
// useChatMessages — Chat Messages Hook
// Uses V2 methods with V1 fallback for history.
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

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const nextCursorRef = useRef<string>('')
  const usingV2Ref = useRef<boolean>(true)

  const userMapRef = useRef<Record<string, string>>({})
  const userMapReadyRef = useRef(false)

  const [draft, setDraft] = useState('')
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [isSelecting, setIsSelecting] = useState(false)

  const [typingUsers, setTypingUsers] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)

  const chatIdRef = useRef(chatId)
  chatIdRef.current = chatId

  const userIdRef = useRef(user?.id || '')
  userIdRef.current = user?.id || ''

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

  const clearDraft = useCallback(() => {
    if (chatIdRef.current) {
      localStorage.removeItem(`draft_${chatIdRef.current}`)
    }
    setDraft('')
  }, [])

  useEffect(() => {
    if (!chatId) return

    let cancelled = false
    setLoadingMessages(true)
    setHasMore(true)
    nextCursorRef.current = ''

    if (!userMapReadyRef.current) {
      grpcClient.getAllUsers().then((users) => {
        if (cancelled) return
        const map: Record<string, string> = {}
        for (const u of users) {
          if (u.id) map[u.id] = u.username
        }
        userMapRef.current = map
        userMapReadyRef.current = true
      }).catch(() => {})
    }

    grpcClient
      .getHistoryV2(chatId, 50)
      .then(({ messages: msgs, nextCursor, hasMore: more }) => {
        if (cancelled || chatIdRef.current !== chatId) return
        const resolved = msgs.map((m) => {
          if (!m.user && m.userId && userMapRef.current[m.userId]) {
            return { ...m, user: userMapRef.current[m.userId] }
          }
          return m
        })
        setMessages(chatId, resolved)
        setHasMore(more)
        nextCursorRef.current = nextCursor
        usingV2Ref.current = nextCursor !== '' || resolved.length > 0
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
          let msg = event.message
          if (!msg.user && msg.userId && userMapRef.current[msg.userId]) {
            msg = { ...msg, user: userMapRef.current[msg.userId] }
          }
          addMessage(msg)
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

  useEffect(() => {
    if (!chatId) return
    const cleanup = grpcClient.openReceiveStream(chatId, handleStreamEvent)
    return () => { cleanup() }
  }, [chatId, handleStreamEvent])

  const loadMore = useCallback(async () => {
    if (!chatId || isLoadingMore || !hasMore || !nextCursorRef.current) return

    setIsLoadingMore(true)

    try {
      const { messages: olderMsgs, nextCursor, hasMore: more } = await grpcClient.getHistoryV2(
        chatId,
        50,
        nextCursorRef.current,
      )

      if (olderMsgs.length > 0) {
        const resolved = olderMsgs.map((m) => {
          if (!m.user && m.userId && userMapRef.current[m.userId]) {
            return { ...m, user: userMapRef.current[m.userId] }
          }
          return m
        })
        prependMessages(chatId, resolved)
      }

      nextCursorRef.current = nextCursor
      setHasMore(more)
    } catch (err) {
      console.error('Failed to load more messages:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [chatId, isLoadingMore, hasMore, prependMessages])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!chatId || !content.trim()) return

      setSendingMessage(true)
      clearDraft()
      try {
        const replyToId = replyToMessage?.id
        const message = await grpcClient.sendMessageV2(
          chatId,
          content.trim(),
          replyToId,
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

  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!chatId || !newText.trim()) return
      try {
        const success = await grpcClient.editMessageV2(messageId, newText)
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

  const deleteMessages = useCallback(
    async (messageIds: string[]) => {
      if (!chatId || messageIds.length === 0) return
      try {
        const success = await grpcClient.deleteMessageV2(messageIds, userIdRef.current)
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

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!chatId || !user?.username) return
      try {
        await grpcClient.setReactionV2(messageId, emoji)
      } catch (err) {
        console.error('Failed to set reaction:', err)
      }
    },
    [chatId, user]
  )

  const toggleSelectMessage = useCallback((messageId: string) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    )
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedMessages([])
    setIsSelecting(false)
  }, [])

  const startEditing = useCallback((messageId: string, text: string) => {
    setEditingMessageId(messageId)
    setEditingText(text)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null)
    setEditingText('')
  }, [])

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
