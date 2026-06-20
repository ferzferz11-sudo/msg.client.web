// ============================================
// SearchScreen — Chat Search
// ============================================

import { Screen } from '@/components/common'
import { useChatListV2 } from '@/hooks/useChatListV2'
import { useChatStore } from '@/store/chatStore'
import { useState, useEffect } from 'react'
import type { Chat } from '@/shared/types'

interface SearchScreenProps {
  onBack: () => void
  onChatSelect: (chatId: string) => void
}

export function SearchScreen({ onBack, onChatSelect }: SearchScreenProps) {
  const { searchChats } = useChatListV2()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Chat[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const chats = await searchChats(query)
      setResults(chats)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, searchChats])

  const handleChatClick = (chatId: string) => {
    setActiveChatId(chatId)
    onChatSelect(chatId)
  }

  return (
    <Screen header={<SearchHeader onBack={onBack} />}>
      <div style={{ padding: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск чатов..."
          autoFocus
          style={{
            width: '100%', padding: '10px 16px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, color: '#fff', fontSize: 16, outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ marginTop: 16 }}>
          {isSearching ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Поиск...</div>
          ) : query.trim() && results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Ничего не найдено</div>
          ) : (
            results.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleChatClick(chat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  background: '#6b5ce7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#fff',
                }}>
                  {chat.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: '#fff' }}>{chat.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {chat.type === 'group' ? 'Группа' : 'Чат'}
                    {chat.lastMessageUsername && ` • ${chat.lastMessageUsername}`}
                  </div>
                </div>
                {chat.isPinned && <span style={{ fontSize: 14 }}>📌</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </Screen>
  )
}

function SearchHeader({ onBack }: { onBack: () => void }) {
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
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Поиск</span>
      <div style={{ width: 40 }} />
    </div>
  )
}
