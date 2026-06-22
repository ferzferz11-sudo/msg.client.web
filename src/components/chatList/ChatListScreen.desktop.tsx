import { useState, useCallback, useEffect, useRef } from 'react'
import { ChatList } from '@/components/chatList/ChatList'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { ProfileScreen } from '@/components/profile/ProfileScreen'
import { ContactsScreen } from '@/components/contacts/ContactsScreen'
import { FavoritesScreen } from '@/components/favorites/FavoritesScreen'
import { useChats } from '@/hooks/useChats'
import { useChatListV2 } from '@/hooks/useChatListV2'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { t } from '@/shared/types'
import type { User } from '@/shared/types'

interface ChatListScreenProps {
  onChatSelect: (chatId: string) => void
  onLogout: () => void
  onProfile?: () => void
  onContacts?: () => void
  onFavorites?: () => void
  rightPanel?: 'profile' | 'contacts' | 'favorites' | null
  onCloseRightPanel?: () => void
}

export function ChatListScreen({ onChatSelect, onLogout, onProfile, onContacts, onFavorites, rightPanel, onCloseRightPanel }: ChatListScreenProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const { chats, isLoadingChats, openChat } = useChats()
  const { pinChat, unpinChat, archiveChat, setMutedChat, deleteChat } = useChatListV2()
  const setActiveChatIdInStore = useChatStore((s) => s.setActiveChatId)
  const updateChat = useChatStore((s) => s.updateChat)
  const user = useAuthStore((s) => s.user)
  const [typingChats, setTypingChats] = useState<Record<string, boolean>>({})
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const [showNewChat, setShowNewChat] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  const handleTypingEvent = useCallback((event: { roomId: string; username: string; isTyping: boolean }) => {
    if (!event.roomId) return
    if (event.username === user?.username) return
    const chatId = event.roomId
    const timerMap = typingTimersRef.current

    if (timerMap.has(chatId)) {
      clearTimeout(timerMap.get(chatId)!)
      timerMap.delete(chatId)
    }

    setTypingChats((prev) => ({ ...prev, [chatId]: event.isTyping || false }))

    if (event.isTyping) {
      const timer = setTimeout(() => {
        setTypingChats((prev) => ({ ...prev, [chatId]: false }))
        timerMap.delete(chatId)
      }, 3000)
      timerMap.set(chatId, timer)
    }
  }, [user?.username])

  useEffect(() => {
    try {
      const cleanup = grpcClient.openTypingStream(handleTypingEvent)
      return () => {
        cleanup()
        typingTimersRef.current.forEach((t) => clearTimeout(t))
      }
    } catch (err) {
      console.warn('[Typing] Stream init failed (BiDi not supported):', err)
      return () => {
        typingTimersRef.current.forEach((t) => clearTimeout(t))
      }
    }
  }, [handleTypingEvent])

  const handleChatClick = useCallback((chatId: string) => {
    openChat(chatId)
    setActiveChatId(chatId)
    setActiveChatIdInStore(chatId)
    onChatSelect(chatId)
  }, [openChat, setActiveChatId, setActiveChatIdInStore, onChatSelect])

  const handleBack = useCallback(() => {
    setActiveChatId(null)
  }, [])

  const handleMarkRead = useCallback((chatId: string) => {
    updateChat(chatId, { unreadCount: 0 })
  }, [updateChat])

  const handleOpenNewChat = useCallback(async () => {
    setShowNewChat(true)
    setUserSearch('')
    setLoadingUsers(true)
    try {
      const users = await grpcClient.getAllUsers()
      setAllUsers(users.filter((u) => u.id !== user?.id))
    } catch {
      setAllUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }, [user?.id])

  const handleStartChat = useCallback(async (targetUser: User) => {
    setShowNewChat(false)
    try {
      const chat = await grpcClient.createDirectChat(
        user!.username, targetUser.username, user!.id, targetUser.id,
      )
      handleChatClick(chat.id)
    } catch (err) {
      console.error('Failed to create chat:', err)
    }
  }, [user, handleChatClick])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          width: 320,
          minWidth: 260,
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          background: '#16162a',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
            padding: '0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
            <img src="/logo.png" alt="Lava" style={{ height: 28, width: 28, borderRadius: 6 }} /> Lava
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={handleOpenNewChat}
              title="Новый чат"
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#6b5ce7')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            {onContacts && (
              <button
                onClick={onContacts}
                title="Контакты"
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#6b5ce7')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
            )}
            {user && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0 }}>
                <button
                  onClick={onProfile}
                  style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.5)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '2px 8px', borderRadius: 6, lineHeight: '16px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#6b5ce7')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                >
                  {user.username}
                </button>
                <button
                  onClick={onProfile}
                  style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.3)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 8px', borderRadius: 6, lineHeight: '14px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#6b5ce7')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                >
                  Изменить профиль
                </button>
              </div>
            )}
            <button
              onClick={onLogout}
              title="Выйти"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                fontSize: 18,
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatList
            chats={chats}
            isLoading={isLoadingChats}
            onChatClick={handleChatClick}
            activeChatId={activeChatId}
            typingChats={typingChats}
            onPin={pinChat}
            onUnpin={unpinChat}
            onArchive={archiveChat}
            onMute={(chatId) => {
              const chat = chats.find((c) => c.id === chatId)
              if (chat) setMutedChat(chatId, !chat.isMuted)
            }}
            onDelete={deleteChat}
            onMarkRead={handleMarkRead}
          />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1a1a2e' }}>
        {rightPanel === 'profile' ? (
          <ProfileScreen onBack={onCloseRightPanel || (() => {})} onFavorites={onFavorites} />
        ) : rightPanel === 'contacts' ? (
          <ContactsScreen onBack={onCloseRightPanel || (() => {})} />
        ) : rightPanel === 'favorites' ? (
          <FavoritesScreen onBack={onCloseRightPanel || (() => {})} />
        ) : activeChatId ? (
          <ChatScreen chatId={activeChatId} onBack={handleBack} />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{t('selectChat')}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>
              {t('selectChatHint')}
            </div>
          </div>
        )}
      </div>

      {showNewChat && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowNewChat(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360, maxHeight: '70vh',
              background: '#1e1e36', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Новый чат</span>
              <button
                onClick={() => setShowNewChat(false)}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: 18, padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 16px 0' }}>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Поиск пользователя..."
                autoFocus
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 16px' }}>
              {loadingUsers ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 14 }}>Загрузка...</div>
              ) : allUsers.filter((u) =>
                  !userSearch || u.username.toLowerCase().includes(userSearch.toLowerCase())
                ).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 14 }}>
                  {userSearch ? 'Пользователи не найдены' : 'Нет пользователей'}
                </div>
              ) : (
                allUsers
                  .filter((u) => !userSearch || u.username.toLowerCase().includes(userSearch.toLowerCase()))
                  .slice(0, 50)
                  .map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleStartChat(u)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 18,
                        background: '#6b5ce7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, color: '#fff', fontWeight: 600, flexShrink: 0,
                      }}>
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, color: '#fff' }}>{u.username}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
