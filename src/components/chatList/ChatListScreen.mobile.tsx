// ============================================
// ChatListScreen — Mobile (iOS Native Style)
// ============================================

import { Screen } from '@/components/common'
import { ChatList } from '@/components/chatList/ChatList'
import { useChats } from '@/hooks/useChats'
import { useChatStore } from '@/store/chatStore'

interface ChatListScreenProps {
  onChatSelect: (chatId: string) => void
}

export function ChatListScreen({ onChatSelect }: ChatListScreenProps) {
  const { chats, isLoadingChats, openChat } = useChats()
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)

  const handleChatClick = (chatId: string) => {
    openChat(chatId)
    setActiveChatId(chatId)
    onChatSelect(chatId)
  }

  return (
    <Screen header={<ChatListHeader />}>
      <ChatList
        chats={chats}
        isLoading={isLoadingChats}
        onChatClick={handleChatClick}
      />
    </Screen>
  )
}

// --- Header ---

function ChatListHeader() {
  return (
    <div
      className="safe-top"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        padding: '0 16px',
        background: 'rgba(26, 26, 46, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#6b5ce7',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Чаты
      </span>
      <span
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: '#fff',
        }}
      >
        Lavender
      </span>
      <div style={{ width: 40 }} /> {/* Spacer for balance */}
    </div>
  )
}
