// ============================================
// useGrpcStream — gRPC Stream Lifecycle Hook
// ============================================
// Manages server-side streaming with proper
// cleanup on unmount and iOS background handling.
// ============================================

import { useEffect, useRef, useCallback } from 'react'
import type { StreamCallback, StreamEvent } from '@/shared/types'

interface UseGrpcStreamOptions {
  chatId: string
  onEvent: StreamCallback
  enabled?: boolean
}

export function useGrpcStream({ chatId, onEvent, enabled = true }: UseGrpcStreamOptions) {
  const cleanupRef = useRef<(() => void) | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const handleEvent = useCallback((event: StreamEvent) => {
    onEventRef.current(event)
  }, [])

  useEffect(() => {
    if (!enabled || !chatId) return

    // Import grpcClient dynamically to avoid circular deps
    import('@/shared/api/grpcClient').then(({ grpcClient }) => {
      if (!grpcClient.isConnected()) return

      // Start the stream
      const cleanup = grpcClient.streamChatMessages(chatId, handleEvent)
      cleanupRef.current = cleanup
    })

    // Cleanup on unmount or chatId change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [chatId, enabled, handleEvent])

  // Handle iOS background/foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background — close stream to save battery
        if (cleanupRef.current) {
          cleanupRef.current()
          cleanupRef.current = null
        }
      } else if (enabled && chatId) {
        // App came to foreground — reopen stream
        import('@/shared/api/grpcClient').then(({ grpcClient }) => {
          if (!grpcClient.isConnected()) return
          const cleanup = grpcClient.streamChatMessages(chatId, handleEvent)
          cleanupRef.current = cleanup
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also handle page hide/show (iOS Safari specific)
    const handlePageHide = () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }

    const handlePageShow = () => {
      if (enabled && chatId) {
        import('@/shared/api/grpcClient').then(({ grpcClient }) => {
          if (!grpcClient.isConnected()) return
          const cleanup = grpcClient.streamChatMessages(chatId, handleEvent)
          cleanupRef.current = cleanup
        })
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [chatId, enabled, handleEvent])
}
