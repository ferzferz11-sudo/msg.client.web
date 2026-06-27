import { useState } from 'react'
import { Screen } from '@/components/common'
import { ChatList } from '@/components/chatList/ChatList'
import { useChats } from '@/hooks/useChats'
import { useChatListV2 } from '@/hooks/useChatListV2'
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
  const { pinChat, unpinChat, archiveChat, setMutedChat, deleteChat } = useChatListV2()
  const [typingChats] = useState<Record<string, boolean>>({})

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
        typingChats={typingChats}
        onPin={pinChat}
        onUnpin={unpinChat}
        onArchive={archiveChat}
        onMute={(chatId) => {
          const chat = chats.find((c) => c.id === chatId)
          if (chat) setMutedChat(chatId, !chat.isMuted)
        }}
        onDelete={deleteChat}
      />
    </Screen>
  )
}

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
        <img src="/logo.png" alt="Lava" style={{ height: 22, width: 22, borderRadius: 4 }} /> Лава
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
