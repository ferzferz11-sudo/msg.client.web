// ============================================
// useGrpcStream — gRPC Stream Lifecycle Hook
// ============================================

import { useEffect, useRef, useCallback } from 'react'
import type { StreamCallback, StreamEvent, Message } from '@/shared/types'

interface UseGrpcStreamOptions {
  chatId: string
  onEvent: StreamCallback
  onMissedMessages?: (messages: Message[]) => void
  onServerShutdown?: () => void
  onReconnecting?: (isReconnecting: boolean) => void
  enabled?: boolean
}

export function useGrpcStream({
  chatId,
  onEvent,
  onMissedMessages,
  onServerShutdown,
  onReconnecting,
  enabled = true,
}: UseGrpcStreamOptions) {
  const cleanupRef = useRef<(() => void) | null>(null)
  const onEventRef = useRef(onEvent)
  const onMissedMessagesRef = useRef(onMissedMessages)
  const onServerShutdownRef = useRef(onServerShutdown)
  const onReconnectingRef = useRef(onReconnecting)
  const lastMessageTimestampRef = useRef<string | null>(null)
  const isHiddenRef = useRef(false)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isReconnectingRef = useRef(false)

  onEventRef.current = onEvent
  onMissedMessagesRef.current = onMissedMessages
  onServerShutdownRef.current = onServerShutdown
  onReconnectingRef.current = onReconnecting

  const handleEvent = useCallback((event: StreamEvent) => {
    if (event.type === 'message' && event.message) {
      lastMessageTimestampRef.current = event.message.createdAt
    }
    onEventRef.current(event)
  }, [])

  const openStream = useCallback(() => {
    if (!enabled || !chatId) return

    import('@/shared/api/grpcClient').then(({ grpcClient }) => {
      if (!grpcClient.isConnected()) return
      if (cleanupRef.current) return

      const { cleanup } = grpcClient.openChatV2Stream(chatId, (event) => {
        if (event.type === 'error') {
          const errorMsg = event.error || ''
          if (errorMsg.includes('UNAVAILABLE') || errorMsg.includes('SERVER_SHUTTINGDOWN')) {
            if (errorMsg.includes('SERVER_SHUTTINGDOWN')) {
              onServerShutdownRef.current?.()
              return
            }
            if (!isReconnectingRef.current) {
              startReconnect()
            }
            return
          }
        }
        if (event.type === 'message' && event.message) {
          reconnectAttemptsRef.current = 0
          isReconnectingRef.current = false
          onReconnectingRef.current?.(false)
        }
        handleEvent(event)
      })
      cleanupRef.current = cleanup
    })
  }, [chatId, enabled, handleEvent])

  const startReconnect = useCallback(() => {
    if (isReconnectingRef.current) return
    isReconnectingRef.current = true
    onReconnectingRef.current?.(true)

    const attempt = reconnectAttemptsRef.current
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000)

    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      closeStream()

      import('@/shared/api/grpcClient').then(({ grpcClient }) => {
        if (!grpcClient.isConnected()) {
          isReconnectingRef.current = false
          onReconnectingRef.current?.(false)
          return
        }
        fetchMissedMessages().then(() => {
          openStream()
        })
      })
    }, delay)
  }, [openStream])

  const closeStream = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
  }, [])

  const fetchMissedMessages = useCallback(async () => {
    if (!chatId || !lastMessageTimestampRef.current) return

    const { grpcClient } = await import('@/shared/api/grpcClient')
    if (!grpcClient.isConnected()) return

    try {
      const response = await grpcClient.getHistoryV2(chatId, 50)
      if (response.messages.length > 0 && onMissedMessagesRef.current) {
        onMissedMessagesRef.current(response.messages)
      }
    } catch (err) {
      console.error('Failed to fetch missed messages:', err)
    }
  }, [chatId])

  useEffect(() => {
    if (!enabled || !chatId) {
      closeStream()
      return
    }

    reconnectAttemptsRef.current = 0
    isReconnectingRef.current = false
    onReconnectingRef.current?.(false)
    openStream()

    return () => {
      closeStream()
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [chatId, enabled, openStream, closeStream])

  useEffect(() => {
    if (!enabled || !chatId) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isHiddenRef.current = true
        closeStream()
      } else if (isHiddenRef.current) {
        isHiddenRef.current = false
        fetchMissedMessages()
        openStream()
      }
    }

    const handlePageHide = () => {
      isHiddenRef.current = true
      closeStream()
    }

    const handlePageShow = () => {
      if (isHiddenRef.current) {
        isHiddenRef.current = false
        fetchMissedMessages()
        openStream()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [chatId, enabled, openStream, closeStream, fetchMissedMessages])
}
