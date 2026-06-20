// ============================================
// PinnedMessagesScreen — Pinned Messages in Chat
// ============================================

import { Screen } from '@/components/common'
import { usePinnedMessages } from '@/hooks/usePinnedMessages'
import { useEffect } from 'react'

interface PinnedMessagesScreenProps {
  chatId: string
  onBack: () => void
}

export function PinnedMessagesScreen({ chatId, onBack }: PinnedMessagesScreenProps) {
  const { pinnedMessages, isLoading, loadPinnedMessages, unpinMessage } = usePinnedMessages(chatId)

  useEffect(() => {
    loadPinnedMessages()
  }, [loadPinnedMessages])

  return (
    <Screen header={<PinnedHeader onBack={onBack} />}>
      <div style={{ padding: 16, color: '#fff' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Загрузка...</div>
        ) : pinnedMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            Нет закреплённых сообщений
          </div>
        ) : (
          pinnedMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#6b5ce7', marginBottom: 4 }}>
                  {msg.user}
                </div>
                <div style={{ fontSize: 15, color: '#fff', lineHeight: 1.4 }}>
                  {msg.text}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                  {new Date(msg.createdAt).toLocaleString('ru')}
                </div>
              </div>
              <button
                onClick={() => unpinMessage(msg.id)}
                style={{
                  padding: '4px 8px', background: 'rgba(255,100,100,0.15)', color: '#f66',
                  border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Открепить
              </button>
            </div>
          ))
        )}
      </div>
    </Screen>
  )
}

function PinnedHeader({ onBack }: { onBack: () => void }) {
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
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>📌 Закреплённые</span>
      <div style={{ width: 40 }} />
    </div>
  )
}
