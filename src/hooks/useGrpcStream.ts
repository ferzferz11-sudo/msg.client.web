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
// - Tracks lastMessageTimestamp for catch-up
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

  // Keep refs fresh without triggering effect re-runs
  onEventRef.current = onEvent
  onMissedMessagesRef.current = onMissedMessages

  const handleEvent = useCallback((event: StreamEvent) => {
    // Track the timestamp of the last received message
    if (event.type === 'message' && event.message) {
      lastMessageTimestampRef.current = event.message.createdAt
    }
    onEventRef.current(event)
  }, [])

  // --- Open stream helper ---
  const openStream = useCallback(() => {
    if (!enabled || !chatId) return

    import('@/shared/api/grpcClient').then(({ grpcClient }) => {
      if (!grpcClient.isConnected()) return
      // Don't open if already open (cleanupRef exists)
      if (cleanupRef.current) return

      const cleanup = grpcClient.streamChatMessages(chatId, handleEvent)
      cleanupRef.current = cleanup
    })
  }, [chatId, enabled, handleEvent])

  // --- Close stream helper ---
  const closeStream = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
  }, [])

  // --- Fetch missed messages helper ---
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

  // --- Main effect: open/close stream on mount/unmount/chatId change ---
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

  // --- iOS background/foreground handling ---
  useEffect(() => {
    if (!enabled || !chatId) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background — close stream to save battery
        isHiddenRef.current = true
        closeStream()
      } else if (isHiddenRef.current) {
        // App came to foreground — was hidden, now visible
        isHiddenRef.current = false

        // 1. First, fetch any messages we missed while in background
        fetchMissedMessages()

        // 2. Then reopen the real-time stream
        openStream()
      }
    }

    // iOS Safari specific: pagehide/pageshow fires more reliably
    // than visibilitychange on some iOS versions
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
