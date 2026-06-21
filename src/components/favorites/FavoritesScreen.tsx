import { useState, useEffect, useCallback, useRef } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import type { Message } from '@/shared/types'

const TG = {
  bg: '#0E1621', headerBg: '#17212B', inputBg: '#242F3D',
  outgoing: '#2B5278', incoming: '#182533',
  text: '#F5F5F5', textSecondary: '#6C7883', accent: '#5EB5F7',
  border: 'rgba(255,255,255,0.08)',
}

interface FavoritesScreenProps {
  onBack: () => void
}

export function FavoritesScreen({ onBack }: FavoritesScreenProps) {
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const favRoomId = user ? `favorites_${user.username}` : ''

  useEffect(() => {
    if (!user || !favRoomId) return
    let cancelled = false
    setIsLoading(true)
    grpcClient.getHistory(favRoomId, 100)
      .then(({ messages: msgs }) => {
        if (!cancelled) setMessages(msgs)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [user, favRoomId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !favRoomId || !user) return
    const text = inputText.trim()
    setInputText('')
    setIsSending(true)
    try {
      const msg = await grpcClient.sendMessage(favRoomId, text, user.id)
      setMessages((prev) => [...prev, msg])
    } catch (err) {
      console.error('Failed to send:', err)
      setInputText(text)
    } finally {
      setIsSending(false)
    }
  }, [inputText, favRoomId, user])

  const handleRemove = useCallback(async (messageId: string) => {
    if (!user) return
    try {
      const ok = await grpcClient.removeFavorite(user.id, messageId)
      if (ok) setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err) {
      console.error('Failed to remove:', err)
    }
  }, [user])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: TG.bg }}>
      <div className="safe-top" style={{
        display: 'flex', alignItems: 'center', height: 44, padding: '0 4px',
        background: TG.headerBg, borderBottom: `1px solid ${TG.border}`, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: TG.accent, padding: '8px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none"><path d="M10 2L2 10L10 18" stroke={TG.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 17 }}>Назад</span>
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: TG.text }}>⭐ Избранное</div>
          <div style={{ fontSize: 13, color: TG.textSecondary }}>Заметки для себя</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: TG.textSecondary }}>Загрузка...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: TG.textSecondary }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
            <div style={{ fontSize: 15 }}>Отправляйте сообщения себе</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Здесь будут ваши заметки</div>
          </div>
        ) : (
          <div style={{ padding: '0 12px' }}>
            {messages.map((msg) => {
              const isOwn = msg.user === user?.username || msg.userId === user?.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}
                  onContextMenu={(e) => { e.preventDefault(); handleRemove(msg.id) }}
                >
                  <div style={{
                    maxWidth: '78%', minWidth: 70, padding: '6px 10px',
                    background: isOwn ? TG.outgoing : TG.incoming,
                    borderRadius: 12, borderTopRightRadius: isOwn ? 4 : 12,
                    borderTopLeftRadius: isOwn ? 12 : 4,
                  }}>
                    <div style={{ fontSize: 15, color: TG.text, lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {msg.text || (msg.imageUrl ? '[Изображение]' : msg.voiceUrl ? '[Голосовое]' : '[Сообщение]')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(msg.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        background: TG.headerBg, borderTop: `1px solid ${TG.border}`, flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Заметка..."
          style={{
            flex: 1, height: 40, borderRadius: 20, border: 'none',
            background: TG.inputBg, color: TG.text, padding: '0 16px', fontSize: 15,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          style={{
            width: 40, height: 40, borderRadius: 20, border: 'none',
            background: inputText.trim() ? TG.accent : 'rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 18, cursor: inputText.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
