// ============================================
// App — Root Component with Simple Routing
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { ChatListScreen } from '@/components/chatList/ChatListScreen'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { grpcClient } from '@/shared/api/grpcClient'
import '@/styles/global.css'

type Screen = 'chatList' | 'chat'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('chatList')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  // Connect to gRPC on mount
  useEffect(() => {
    grpcClient.connect('ws://localhost:50051')

    return () => {
      grpcClient.disconnect()
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
        height: '100dvh',
        overflow: 'hidden',
        background: '#1a1a2e',
      }}
    >
      {currentScreen === 'chatList' && (
        <div
          key="list"
          className="screen-enter"
          style={{ width: '100%', height: '100%' }}
        >
          <ChatListScreen onChatSelect={handleChatSelect} />
        </div>
      )}

      {currentScreen === 'chat' && activeChatId && (
        <div
          key={`chat-${activeChatId}`}
          className="screen-enter"
          style={{ width: '100%', height: '100%' }}
        >
          <ChatScreen chatId={activeChatId} onBack={handleBack} />
        </div>
      )}
    </div>
  )
}
