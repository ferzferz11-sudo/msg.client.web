// ============================================
// App — Root Component with Auth + Routing
// ============================================
// Auth flow:
// 1. Check Zustand authStore for saved credentials (persisted to localStorage)
// 2. If authenticated -> show chat list
// 3. If not -> show auth screen
// 4. After successful auth -> save to store -> show chat list
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { ChatListScreen } from '@/components/chatList/ChatListScreen'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { grpcClient } from '@/shared/api/grpcClient'
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard'
import { useAuthStore } from '@/store/authStore'
import '@/styles/global.css'

type Screen = 'auth' | 'chatList' | 'chat'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  // Auth state from Zustand store
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const logout = useAuthStore((s) => s.logout)

  // Initialize iOS keyboard/viewport tracking at root level
  useIOSKeyboard()

  // Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }
  }, [])

  // Handle navigation messages from Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NAVIGATE_TO_CHAT') {
          setActiveChatId(event.data.chatId)
          setCurrentScreen('chat')
        }
      }
      navigator.serviceWorker.addEventListener('message', handleMessage)
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [])

  // Update gRPC client with current token
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      const getToken = () => useAuthStore.getState().accessToken
      grpcClient.connect(undefined, getToken)
    }
  }, [isAuthenticated, accessToken])

  const handleAuthSuccess = useCallback(() => {
    setCurrentScreen('chatList')
  }, [])

  const handleLogout = useCallback(async () => {
    await grpcClient.logout()
    logout()
    setCurrentScreen('auth')
  }, [logout])

  const handleChatSelect = useCallback((chatId: string) => {
    setActiveChatId(chatId)
    setCurrentScreen('chat')
  }, [])

  const handleBack = useCallback(() => {
    setCurrentScreen('chatList')
    setActiveChatId(null)
  }, [])

  // Show auth screen if not authenticated
  if (!isAuthenticated || currentScreen === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />
  }

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
          <ChatListScreen onChatSelect={handleChatSelect} onLogout={handleLogout} />
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
