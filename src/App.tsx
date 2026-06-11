// ============================================
// App — Root Component with Auth + Routing
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
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const setAuth = useAuthStore((s) => s.setAuth)

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

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_access_token')
    const userStr = localStorage.getItem('auth_user')
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        // Connect gRPC client with saved token
        const getToken = () => token
        grpcClient.connect(undefined, getToken)
        // Mark as authenticated (token will be validated on first API call)
        setAuth(user, token)
        setCurrentScreen('chatList')
      } catch (err) {
        console.error('Failed to restore session:', err)
        localStorage.removeItem('auth_access_token')
        localStorage.removeItem('auth_user')
      }
    }
    setIsLoading(false)
  }, [setAuth])

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

  // Show loading spinner while restoring session
  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
      }}>
        <div style={{ color: '#fff', fontSize: 18 }}>Загрузка...</div>
      </div>
    )
  }

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
