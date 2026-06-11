// ============================================
// App — Root Component with Auth + Routing
// ============================================
// Auth flow:
// 1. Check localStorage for saved credentials
// 2. If exists -> auto-login -> show chat list
// 3. If not -> show login screen
// 4. After successful login -> save credentials -> show chat list
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { ChatListScreen } from '@/components/chatList/ChatListScreen'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { grpcClient } from '@/shared/api/grpcClient'
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard'
import '@/styles/global.css'

type Screen = 'login' | 'chatList' | 'chat'
type AuthState = 'checking' | 'authenticated' | 'unauthenticated'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [, setUsername] = useState<string>('')

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

  // Check for saved credentials and auto-login
  useEffect(() => {
    const savedUsername = localStorage.getItem('lavender_username')
    const savedPassword = localStorage.getItem('lavender_password')
    const savedServer = localStorage.getItem('lavender_server')

    if (savedUsername && savedPassword && savedServer) {
      // Auto-login with saved credentials
      autoLogin(savedUsername, savedPassword, savedServer)
    } else {
      setAuthState('unauthenticated')
      setCurrentScreen('login')
    }
  }, [])

  const autoLogin = async (user: string, pass: string, server: string) => {
    try {
      const baseUrl = server.startsWith('http') ? server : `http://${server}`
      await grpcClient.connect(baseUrl)
      const result = await grpcClient.login(user, pass)

      if (result.success) {
        setUsername(user)
        setAuthState('authenticated')
        setCurrentScreen('chatList')
      } else {
        // Clear invalid credentials
        localStorage.removeItem('lavender_username')
        localStorage.removeItem('lavender_password')
        localStorage.removeItem('lavender_server')
        setAuthState('unauthenticated')
        setCurrentScreen('login')
      }
    } catch (err) {
      console.error('Auto-login failed:', err)
      setAuthState('unauthenticated')
      setCurrentScreen('login')
    }
  }

  const handleLoginSuccess = useCallback((user: string, _userId: string) => {
    setUsername(user)
    setAuthState('authenticated')
    setCurrentScreen('chatList')
  }, [])

  const handleChatSelect = useCallback((chatId: string) => {
    setActiveChatId(chatId)
    setCurrentScreen('chat')
  }, [])

  const handleBack = useCallback(() => {
    setCurrentScreen('chatList')
    setActiveChatId(null)
  }, [])

  // Show loading while checking auth
  if (authState === 'checking') {
    return (
      <div style={{
        width: '100%',
        height: 'var(--viewport-available-height, 100dvh)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#888',
        fontSize: 14,
      }}>
        Подключение...
      </div>
    )
  }

  // Show login screen if not authenticated
  if (authState === 'unauthenticated' || currentScreen === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />
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
