// ============================================
// useChatMessages — Chat Messages Hook
// Uses V2 methods exclusively.
// Supports E2EE encryption for secret chats.
// ============================================

import { useEffect, useCallback, useRef, useState } from 'react'
import { useChatStore } from '@/store/chatStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import { useErrorStore } from '@/store/errorStore'
import { loadSharedKey, aesEncrypt, aesDecrypt } from '@/shared/crypto'
import type { Message } from '@/shared/types'

const DRAFT_DEBOUNCE_MS = 800
const TYPING_TIMEOUT_MS = 3000

interface UseChatMessagesOptions {
  chatId: string | null
  isSecret?: boolean
  onServerShutdown?: () => void
  onReconnecting?: (isReconnecting: boolean) => void
  onStreamError?: (error: string) => void
}

export function useChatMessages({ chatId, isSecret = false, onServerShutdown, onReconnecting, onStreamError }: UseChatMessagesOptions) {
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
  const addError = useErrorStore((s) => s.addError)

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const nextCursorRef = useRef<string>('')

  const userMapRef = useRef<Record<string, string>>({})
  const userMapReadyRef = useRef(false)

  const [draft, setDraft] = useState('')
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [isSelecting, setIsSelecting] = useState(false)

  const [typingUsers, setTypingUsers] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)

  const chatIdRef = useRef(chatId)
  chatIdRef.current = chatId

  const userIdRef = useRef(user?.id || '')
  userIdRef.current = user?.id || ''

  const encryptKeyRef = useRef<CryptoKey | null>(null)
  const isSecretRef = useRef(isSecret)
  isSecretRef.current = isSecret

  const chatV2SendRef = useRef<((msg: any) => void) | null>(null)

  useEffect(() => {
    if (!chatId || !isSecret) { encryptKeyRef.current = null; return }
    loadSharedKey(chatId).then((key) => { encryptKeyRef.current = key }).catch(() => {})
  }, [chatId, isSecret])

  useEffect(() => {
    if (!chatId || !user?.id) return
    grpcClient.getDraft(user.id, chatId).then((d) => {
      if (d.hasDraft) setDraft(d.text)
    }).catch(() => {})
    return () => {
      setDraft('')
      setEditingMessageId(null)
      setEditingText('')
      setSelectedMessages([])
      setIsSelecting(false)
      setReplyToMessage(null)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      if (isTypingRef.current && chatIdRef.current && user) {
        isTypingRef.current = false
        if (chatV2SendRef.current) {
          chatV2SendRef.current({ typing: { isTyping: false } })
        }
      }
    }
  }, [chatId, user?.id])

  const updateDraft = useCallback((text: string) => {
    setDraft(text)
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    if (chatIdRef.current && user?.id) {
      draftTimerRef.current = setTimeout(() => {
        if (text.trim()) {
          grpcClient.saveDraft(user.id!, chatIdRef.current!, text).catch(() => {})
        } else {
          grpcClient.deleteDraft(user.id!, chatIdRef.current!).catch(() => {})
        }
      }, DRAFT_DEBOUNCE_MS)
    }
  }, [user?.id])

  const clearDraft = useCallback(() => {
    if (chatIdRef.current && user?.id) {
      grpcClient.deleteDraft(user.id, chatIdRef.current).catch(() => {})
    }
    setDraft('')
  }, [user?.id])

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!chatIdRef.current || !user) return

    if (isTyping && isTypingRef.current) return
    isTypingRef.current = isTyping

    if (chatV2SendRef.current) {
      chatV2SendRef.current({ typing: { isTyping } })
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false
        if (chatV2SendRef.current) {
          chatV2SendRef.current({ typing: { isTyping: false } })
        }
      }, TYPING_TIMEOUT_MS)
    }
  }, [user])

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
      .then(async ({ messages: msgs, nextCursor, hasMore: more }) => {
        if (cancelled || chatIdRef.current !== chatId) return
        let resolved = msgs
          .filter((m) => {
            const hasContent = m.text || m.imageUrl || m.voiceUrl || m.fileUrl ||
              (m.imageUrls && m.imageUrls.length > 0) || m.repliedToMessageId
            const hasReactions = m.reactions && Object.keys(m.reactions).length > 0
            return hasContent || !hasReactions
          })
          .map((m) => {
            const uid = m.userId || ''
            const user = userMapRef.current[uid]
            return {
              ...m,
              user: m.user || user || '',
              isOutgoing: uid === userIdRef.current,
            }
          })
        if (isSecretRef.current && encryptKeyRef.current) {
          resolved = await Promise.all(resolved.map(async (m) => {
            if (m.text) {
              try { return { ...m, text: await aesDecrypt(encryptKeyRef.current!, m.text) } } catch { return m }
            }
            return m
          }))
        }
        setMessages(chatId, resolved)
        setHasMore(more)
        nextCursorRef.current = nextCursor

        if (resolved.length > 0 && user?.username && user?.id) {
          const lastMsgId = resolved[resolved.length - 1]?.id || ''
          grpcClient.markRead(chatId, user.username, user.id, lastMsgId).catch(() => {})
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load messages:', err)
        addError({ message: 'Не удалось загрузить сообщения', type: 'network' })
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
    async (event: { type: string; message?: Message; chatId?: string; userId?: string; isTyping?: boolean; error?: string; messageId?: string; reactions?: Record<string, string[]>; onlineUserIds?: string[] }) => {
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
          const uid = msg.userId || ''
          msg = {
            ...msg,
            user: msg.user || userMapRef.current[uid] || '',
            isOutgoing: uid === userIdRef.current,
          }
          if (isSecretRef.current && encryptKeyRef.current && msg.text) {
            try {
              msg = { ...msg, text: await aesDecrypt(encryptKeyRef.current, msg.text) }
            } catch {}
          }
          if (!msg.text && !msg.imageUrl && !msg.voiceUrl && !msg.fileUrl) return

          const store = useChatStore.getState()
          const existingMsg = store.messages[msg.id]
          if (existingMsg) {
            updateMessage(msg.id, {
              reactions: msg.reactions,
              isRead: msg.isRead,
              isEdited: msg.isEdited,
            })
            return
          }

          const chatMsgIds = store.chatMessages[msg.roomId] || []
          for (const id of chatMsgIds) {
            const m = store.messages[id]
            if (m && m.userId === msg.userId && m.text === msg.text &&
                m.imageUrl === msg.imageUrl && m.voiceUrl === msg.voiceUrl &&
                m.fileUrl === msg.fileUrl) {
              updateMessage(id, {
                reactions: msg.reactions,
                isRead: msg.isRead,
                isEdited: msg.isEdited,
              })
              return
            }
          }

          addMessage(msg)
        }
      }
      if (event.type === 'reaction_update' && event.messageId && event.reactions) {
        updateMessage(event.messageId, { reactions: event.reactions })
      }
      if (event.type === 'typing' && event.chatId === chatIdRef.current && event.userId !== userIdRef.current) {
        const userId = event.userId || ''
        const displayName = userMapRef.current[userId] || userId
        setTypingUsers((prev) => {
          const next = new Map(prev)
          const existing = next.get(displayName)
          if (existing) clearTimeout(existing)
          if (event.isTyping) {
            const timer = setTimeout(() => {
              setTypingUsers((current) => {
                const updated = new Map(current)
                updated.delete(displayName)
                return updated
              })
            }, TYPING_TIMEOUT_MS)
            next.set(displayName, timer)
          } else {
            next.delete(displayName)
          }
          return next
        })
      }
    },
    [addMessage]
  )

  useEffect(() => {
    if (!chatId) return
    const { cleanup, send } = grpcClient.openChatV2Stream(chatId, handleStreamEvent)
    chatV2SendRef.current = send
    return () => { cleanup(); chatV2SendRef.current = null }
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
        let resolved = olderMsgs
          .filter((m) => {
            const hasContent = m.text || m.imageUrl || m.voiceUrl || m.fileUrl ||
              (m.imageUrls && m.imageUrls.length > 0) || m.repliedToMessageId
            const hasReactions = m.reactions && Object.keys(m.reactions).length > 0
            return hasContent || !hasReactions
          })
          .map((m) => {
            const uid = m.userId || ''
            const user = userMapRef.current[uid]
            return {
              ...m,
              user: m.user || user || '',
              isOutgoing: uid === userIdRef.current,
            }
          })
        if (isSecretRef.current && encryptKeyRef.current) {
          resolved = await Promise.all(resolved.map(async (m) => {
            if (m.text) {
              try { return { ...m, text: await aesDecrypt(encryptKeyRef.current!, m.text) } } catch { return m }
            }
            return m
          }))
        }
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
        let textToSend = content.trim()

        if (isSecretRef.current && encryptKeyRef.current) {
          textToSend = await aesEncrypt(encryptKeyRef.current, textToSend)
        }

        const message = await grpcClient.sendMessageV2(
          chatId,
          textToSend,
          replyToId,
        )

        if (isSecretRef.current && encryptKeyRef.current) {
          try {
            message.text = await aesDecrypt(encryptKeyRef.current, message.text)
          } catch {}
        }

        addMessage(message)
        setReplyToMessage(null)
      } catch (err: any) {
        const msg = err?.message || ''
        if (msg.includes('429')) addError({ message: 'Превышен лимит запросов', type: 'rate_limit' })
        else if (msg.includes('413') || msg.includes('too large')) addError({ message: 'Файл слишком большой', type: 'server' })
        else addError({ message: 'Не удалось отправить сообщение', type: 'network' })
      } finally {
        setSendingMessage(false)
      }
    },
    [chatId, addMessage, setSendingMessage, clearDraft, replyToMessage, setReplyToMessage]
  )

  const sendMediaMessage = useCallback(
    async (file: File, type: 'image' | 'file' | 'voice', duration?: number) => {
      if (!chatId) return

      setSendingMessage(true)
      try {
        let url = ''
        let mediaDuration = duration || 0

        if (type === 'image') {
          url = await grpcClient.uploadImage(file)
        } else if (type === 'voice') {
          if (file.size > grpcClient.maxUploadSize) {
            const maxMB = Math.round(grpcClient.maxUploadSize / (1024 * 1024))
            throw new Error(`Файл слишком большой (макс. ${maxMB} МБ)`)
          }
          const result = await fetch('/upload-audio', {
            method: 'POST',
            headers: { Authorization: `Bearer ${useAuthStore.getState().tokens?.accessToken || ''}` },
            body: (() => { const fd = new FormData(); fd.append('audio', file); fd.append('duration', String(duration || 0)); return fd })(),
          })
          if (!result.ok) throw new Error('Upload failed')
          const data = await result.json()
          url = data.url || ''
          mediaDuration = data.duration || duration || 0
        } else {
          url = await grpcClient.uploadFile_(file)
        }

        if (!url) throw new Error('Upload returned empty URL')

        const replyToId = replyToMessage?.id
        const message = await grpcClient.sendMessageV2Media(
          chatId,
          { type, url, duration: mediaDuration },
          replyToId,
        )
        addMessage(message)
        setReplyToMessage(null)
      } catch (err: any) {
        const msg = err?.message || ''
        if (msg.includes('413') || msg.includes('too large')) addError({ message: 'Файл слишком большой для загрузки', type: 'server' })
        else if (msg.includes('404')) addError({ message: 'Сервер загрузки недоступен', type: 'network' })
        else addError({ message: `Не удалось загрузить ${type === 'image' ? 'изображение' : type === 'voice' ? 'аудио' : 'файл'}`, type: 'network' })
      } finally {
        setSendingMessage(false)
      }
    },
    [chatId, addMessage, setSendingMessage, replyToMessage, setReplyToMessage]
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
      } catch (err: any) {
        addError({ message: 'Не удалось отредактировать сообщение', type: 'network' })
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
      } catch (err: any) {
        addError({ message: 'Не удалось удалить сообщение', type: 'network' })
      }
    },
    [chatId, removeMessageFromChat]
  )

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!chatId || !user?.username) return
      try {
        const result = await grpcClient.setReactionV2(messageId, emoji)
        if (result.success) {
          updateMessage(messageId, { reactions: result.reactions })
        }
      } catch (err: any) {
        addError({ message: 'Не удалось поставить реакцию', type: 'network' })
      }
    },
    [chatId, user, updateMessage]
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
    sendMediaMessage,
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
    sendTypingIndicator,
    replyToMessage,
    setReplyToMessage,
  }
}
