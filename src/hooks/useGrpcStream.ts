// ============================================
// useGrpcStream — gRPC Stream Lifecycle Hook
// ============================================
// Manages server-side streaming with proper
// cleanup on unmount and iOS background handling.
//
// Features:
// - Opens stream on mount / chatId change
// - Closes stream on unmount / chatId change
// - Closes stream when app goes to background (visibilitychange)
// - Reopens stream + fetches missed messages on foreground
// ============================================

import { useEffect, useRef, useCallback } from 'react'
import type { StreamCallback, StreamEvent, Message } from '@/shared/types'

interface UseGrpcStreamOptions {
  chatId: string
  onEvent: StreamCallback
  /** Called when stream reconnects — returns missed messages */
  onMissedMessages?: (messages: Message[]) => void
  enabled?: boolean
}

export function useGrpcStream({
  chatId,
  onEvent,
  onMissedMessages,
  enabled = true,
}: UseGrpcStreamOptions) {
  const cleanupRef = useRef<(() => void) | null>(null)
  const onEventRef = useRef(onEvent)
  const onMissedMessagesRef = useRef(onMissedMessages)
  const lastMessageTimestampRef = useRef<string | null>(null)
  const isHiddenRef = useRef(false)

  onEventRef.current = onEvent
  onMissedMessagesRef.current = onMissedMessages

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

      const cleanup = grpcClient.openReceiveStream(chatId, handleEvent)
      cleanupRef.current = cleanup
    })
  }, [chatId, enabled, handleEvent])

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
      const response = await grpcClient.getHistory(chatId, 50)
      if (response.messages.length > 0 && onMissedMessagesRef.current) {
        onMissedMessagesRef.current(response.messages)
      }
    } catch (err) {
      console.error('Failed to fetch missed messages:', err)
    }
  }, [chatId])

  // Main effect: open/close stream on mount/unmount/chatId change
  useEffect(() => {
    if (!enabled || !chatId) {
      closeStream()
      return
    }

    openStream()

    return () => {
      closeStream()
    }
  }, [chatId, enabled, openStream, closeStream])

  // iOS background/foreground handling
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
