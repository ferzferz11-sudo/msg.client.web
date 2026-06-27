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

const TG = {
  bg: '#0E1621',
  headerBg: '#17212B',
  outgoing: '#2B5278',
  incoming: '#182533',
  text: '#F5F5F5',
  textSecondary: '#6C7883',
  accent: '#5EB5F7',
  border: '#0E1621',
}

export function PinnedMessagesScreen({ chatId, onBack }: PinnedMessagesScreenProps) {
  const { pinnedMessages, isLoading, loadPinnedMessages, unpinMessage } = usePinnedMessages(chatId)

  useEffect(() => {
    loadPinnedMessages()
  }, [loadPinnedMessages])

  return (
    <Screen header={<PinnedHeader onBack={onBack} />}>
      <div style={{ padding: 16, color: TG.text, background: TG.bg, height: '100%', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: TG.textSecondary }}>Загрузка...</div>
        ) : pinnedMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: TG.textSecondary }}>
            Нет закреплённых сообщений
          </div>
        ) : (
          pinnedMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 0', borderBottom: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: TG.accent, marginBottom: 4 }}>
                  {msg.user}
                </div>
                {msg.text && (
                  <div style={{ fontSize: 15, color: TG.text, lineHeight: 1.4 }}>
                    {msg.text}
                  </div>
                )}
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, marginTop: 4 }} />
                )}
                <div style={{ fontSize: 11, color: TG.textSecondary, marginTop: 4 }}>
                  {new Date(msg.createdAt).toLocaleString('ru')}
                </div>
              </div>
              <button
                onClick={() => unpinMessage(msg.id)}
                style={{
                  padding: '4px 8px', background: 'rgba(229,57,53,0.15)', color: '#E53935',
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
      background: TG.headerBg,
      borderBottom: `1px solid ${TG.border}`,
    }}>
      <button onClick={onBack} style={{ color: TG.accent, fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
        ← Назад
      </button>
      <span style={{ fontSize: 17, fontWeight: 600, color: TG.text }}>📌 Закреплённые</span>
      <div style={{ width: 40 }} />
    </div>
  )
}
