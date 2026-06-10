// ============================================
// App — Root Component with Simple Routing
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { ChatListScreen } from '@/components/chatList/ChatListScreen'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { grpcClient } from '@/shared/api/grpcClient'
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard'
import '@/styles/global.css'

type Screen = 'chatList' | 'chat'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('chatList')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  // Initialize iOS keyboard/viewport tracking at root level
  useIOSKeyboard()

  // Connect to gRPC on mount
  useEffect(() => {
    grpcClient.connect('ws://localhost:50051')
    return () => {
      grpcClient.disconnect()
    }
  }, [])

  // Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      }).then((registration) => {
        console.log('[SW] Registered:', registration.scope)
      }).catch((err) => {
        console.log('[SW] Registration failed:', err)
      })
    }
  }, [])

  // Handle navigation messages from Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NAVIGATE_TO_CHAT') {
          const { chatId } = event.data
          if (chatId) {
            setActiveChatId(chatId)
            setCurrentScreen('chat')
          }
        }
      }
      navigator.serviceWorker.addEventListener('message', handleMessage)
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [])

  const handleChatSelect = useCallback((chatId: string) => {
    setActiveChatId(chatId)
    setCurrentScreen('chat')
  }, [])

  const handleBack = useCallback(() => {
    setCurrentScreen('chatList')
    setActiveChatId(null)
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: 'var(--viewport-available-height, 100dvh)',
        overflow: 'hidden',
        background: '#1a1a2e',
      }}
    >
      {currentScreen === 'chatList' && (
        <div key="list" className="screen-enter" style={{ width: '100%', height: '100%' }}>
          <ChatListScreen onChatSelect={handleChatSelect} />
        </div>
      )}

      {currentScreen === 'chat' && activeChatId && (
        <div key={`chat-${activeChatId}`} className="screen-enter" style={{ width: '100%', height: '100%' }}>
          <ChatScreen chatId={activeChatId} onBack={handleBack} />
        </div>
      )}
    </div>
  )
}
