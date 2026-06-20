// ============================================
// ArchiveScreen — Archived Chats
// ============================================

import { Screen } from '@/components/common'
import { useChatListV2 } from '@/hooks/useChatListV2'
import { useChatStore } from '@/store/chatStore'

interface ArchiveScreenProps {
  onBack: () => void
  onChatSelect: (chatId: string) => void
}

export function ArchiveScreen({ onBack, onChatSelect }: ArchiveScreenProps) {
  const { chats, isLoadingChats, unarchiveChat } = useChatListV2()
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)

  // Filter to show only archived
  const archivedChats = chats.filter((c) => c.isArchived)

  const handleChatClick = (chatId: string) => {
    setActiveChatId(chatId)
    onChatSelect(chatId)
  }

  return (
    <Screen header={<ArchiveHeader onBack={onBack} />}>
      <div style={{ padding: 16, color: '#fff' }}>
        {isLoadingChats ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Загрузка...</div>
        ) : archivedChats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            Архив пуст
          </div>
        ) : (
          archivedChats.map((chat) => (
            <div
              key={chat.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                onClick={() => handleChatClick(chat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  flex: 1, cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  background: '#555',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#fff',
                }}>
                  {chat.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: '#fff' }}>{chat.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {chat.lastMessageText || 'Нет сообщений'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => unarchiveChat(chat.id)}
                style={{
                  padding: '4px 8px', background: 'rgba(107,92,231,0.2)', color: '#6b5ce7',
                  border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                }}
              >
                Разархивировать
              </button>
            </div>
          ))
        )}
      </div>
    </Screen>
  )
}

function ArchiveHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="safe-top" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 44, padding: '0 16px',
      background: 'rgba(26, 26, 46, 0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <button onClick={onBack} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
        ← Назад
      </button>
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Архив</span>
      <div style={{ width: 40 }} />
    </div>
  )
}
