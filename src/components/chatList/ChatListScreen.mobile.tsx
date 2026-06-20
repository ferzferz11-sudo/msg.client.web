// ============================================
// ChatListScreen — Mobile (iOS Native Style)
// ============================================

import { Screen } from '@/components/common'
import { ChatList } from '@/components/chatList/ChatList'
import { useChats } from '@/hooks/useChats'
import { useChatStore } from '@/store/chatStore'

interface ChatListScreenProps {
  onChatSelect: (chatId: string) => void
  onLogout?: () => void
  onSearch?: () => void
  onProfile?: () => void
  onArchive?: () => void
}

export function ChatListScreen({ onChatSelect, onSearch, onProfile, onArchive }: ChatListScreenProps) {
  const { chats, isLoadingChats, openChat } = useChats()
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)

  const handleChatClick = (chatId: string) => {
    openChat(chatId)
    setActiveChatId(chatId)
    onChatSelect(chatId)
  }

  return (
    <Screen header={<ChatListHeader onSearch={onSearch} onProfile={onProfile} onArchive={onArchive} />}>
      <ChatList
        chats={chats}
        isLoading={isLoadingChats}
        onChatClick={handleChatClick}
      />
    </Screen>
  )
}

// --- Header ---

function ChatListHeader({ onSearch, onProfile, onArchive }: {
  onSearch?: () => void
  onProfile?: () => void
  onArchive?: () => void
}) {
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
      <button onClick={onProfile} style={{
        color: '#6b5ce7', fontSize: 13, fontWeight: 600,
        background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        Профиль
      </button>
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
        🦞 Лава
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSearch} style={{
          color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer',
        }}>
          🔍
        </button>
        <button onClick={onArchive} style={{
          color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer',
        }}>
          📦
        </button>
      </div>
    </div>
  )
}
