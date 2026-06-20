// ============================================
// AIChatsScreen — AI Chats List
// ============================================

import { Screen } from '@/components/common'
import { useAIChats } from '@/hooks/useAIChats'
import { useChatStore } from '@/store/chatStore'
import { useState } from 'react'

interface AIChatsScreenProps {
  onBack: () => void
  onChatSelect: (chatId: string) => void
}

export function AIChatsScreen({ onBack, onChatSelect }: AIChatsScreenProps) {
  const { aiChats, isLoading, renameAIChat } = useAIChats()
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const handleChatClick = (chatId: string) => {
    setActiveChatId(chatId)
    onChatSelect(chatId)
  }

  const handleRename = async (chatId: string) => {
    if (newName.trim()) {
      await renameAIChat(chatId, newName.trim())
      setRenamingId(null)
      setNewName('')
    }
  }

  return (
    <Screen header={<AIChatsHeader onBack={onBack} />}>
      <div style={{ padding: 16, color: '#fff' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Загрузка...</div>
        ) : aiChats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            Нет AI чатов
          </div>
        ) : (
          aiChats.map((chat) => (
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
                  background: 'linear-gradient(135deg, #6b5ce7, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  🤖
                </div>
                <div style={{ flex: 1 }}>
                  {renamingId === chat.id ? (
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={() => handleRename(chat.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(chat.id)}
                      autoFocus
                      style={{
                        background: 'rgba(255,255,255,0.08)', border: '1px solid #6b5ce7',
                        borderRadius: 4, color: '#fff', fontSize: 15, padding: '2px 6px',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <>
                      <div style={{ fontSize: 15, color: '#fff' }}>{chat.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {chat.lastMessageText || 'Нет сообщений'}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setRenamingId(chat.id); setNewName(chat.name) }}
                style={{
                  padding: '4px 8px', background: 'rgba(107,92,231,0.2)', color: '#6b5ce7',
                  border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                }}
              >
                ✏️
              </button>
            </div>
          ))
        )}
      </div>
    </Screen>
  )
}

function AIChatsHeader({ onBack }: { onBack: () => void }) {
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
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>🤖 AI чаты</span>
      <div style={{ width: 40 }} />
    </div>
  )
}
