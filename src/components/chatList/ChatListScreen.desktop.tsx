import { useState, useCallback } from 'react'
import { ChatList } from '@/components/chatList/ChatList'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { ProfileScreen } from '@/components/profile/ProfileScreen'
import { ContactsScreen } from '@/components/contacts/ContactsScreen'
import { FavoritesScreen } from '@/components/favorites/FavoritesScreen'
import AIChatsScreenDesktop from '@/components/aiChats/AIChatsScreen.desktop'
import { SettingsScreen } from '@/components/settings/SettingsScreen'
import { ArchiveScreen } from '@/components/archive/ArchiveScreen'

import { SearchScreen } from '@/components/search/SearchScreen'
import { SecretChatScreen } from '@/components/secretChats/SecretChatScreen'
import { generateRSAKeyPair, storePrivateKey } from '@/shared/crypto'
import { useChats } from '@/hooks/useChats'
import { useChatListV2 } from '@/hooks/useChatListV2'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { t } from '@/shared/types'
import type { User } from '@/shared/types'
import { APP_VERSION } from '@/shared/version'

interface ChatListScreenProps {
  onChatSelect: (chatId: string) => void
  onLogout: () => void
  onProfile?: () => void
  onContacts?: () => void
  onFavorites?: () => void
  onAIChats?: () => void
  onSettings?: () => void
  onArchive?: () => void
  onSearch?: () => void
  rightPanel?: 'profile' | 'contacts' | 'favorites' | 'aiChats' | 'settings' | 'archive' | 'search' | null
  onCloseRightPanel?: () => void
}

export function ChatListScreen({ onChatSelect, onLogout, onProfile, onContacts, onFavorites, onAIChats, onSettings, onArchive, onSearch, rightPanel, onCloseRightPanel }: ChatListScreenProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const { chats, isLoadingChats, openChat } = useChats()
  const { pinChat, unpinChat, archiveChat, setMutedChat, deleteChat } = useChatListV2()
  const setActiveChatIdInStore = useChatStore((s) => s.setActiveChatId)
  const updateChat = useChatStore((s) => s.updateChat)
  const user = useAuthStore((s) => s.user)
  const [typingChats] = useState<Record<string, boolean>>({})

  const [showNewChat, setShowNewChat] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

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

  const handleStartSecretChat = useCallback(async (targetUser: User) => {
    setShowNewChat(false)
    try {
      const { publicKeyB64, privateKey } = await generateRSAKeyPair()
      const chatId = await grpcClient.createSecretChat(targetUser.username, targetUser.id, publicKeyB64)
      await storePrivateKey(chatId, privateKey)
      onChatSelect(`secret:${chatId}`)
    } catch (err) {
      console.error('Failed to create secret chat:', err)
    }
  }, [user, onChatSelect])

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
          <span
            onClick={() => { try { grpcClient.signOut(false) } catch {} ; localStorage.removeItem('auth_tokens'); localStorage.removeItem('auth_user'); window.location.reload() }}
            style={{ fontSize: 18, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
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

        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          padding: '6px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          {onAIChats && (
            <SidebarNavBtn icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1.27a7 7 0 01-6.46 4.28A7 7 0 018 18H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/><circle cx="12" cy="14" r="3"/></svg>} label="AI" onClick={onAIChats} />
          )}
          {onSearch && (
            <SidebarNavBtn icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>} label="Поиск" onClick={onSearch} />
          )}
          {onArchive && (
            <SidebarNavBtn icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>} label="Архив" onClick={onArchive} />
          )}
          {onSettings && (
            <SidebarNavBtn icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>} label="Настройки" onClick={onSettings} />
          )}
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
        ) : rightPanel === 'aiChats' ? (
          <AIChatsScreenDesktop onBack={onCloseRightPanel || (() => {})} />
        ) : rightPanel === 'settings' ? (
          <SettingsScreen onBack={onCloseRightPanel || (() => {})} />
        ) : rightPanel === 'archive' ? (
          <ArchiveScreen onBack={onCloseRightPanel || (() => {})} onChatSelect={(chatId) => { onCloseRightPanel?.(); handleChatClick(chatId); }} />
        ) : rightPanel === 'search' ? (
          <SearchScreen onBack={onCloseRightPanel || (() => {})} onChatSelect={(chatId) => { onCloseRightPanel?.(); handleChatClick(chatId); }} />
        ) : activeChatId ? (
          activeChatId.startsWith('secret:') ? (
            <SecretChatScreen chatId={activeChatId.slice(7)} onBack={handleBack} />
          ) : (
            <ChatScreen chatId={activeChatId} onBack={handleBack} />
          )
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
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', marginTop: 8 }}>
              v{APP_VERSION}
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
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 8px', borderRadius: 10,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        onClick={() => handleStartChat(u)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}
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
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartSecretChat(u) }}
                        title="Секретный чат"
                        style={{
                          background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                          cursor: 'pointer', padding: 4, borderRadius: 6,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#4FAE4E')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                      >
                        🔐
                      </button>
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

function SidebarNavBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
        cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#6b5ce7')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
    >
      {icon}
      {label}
    </button>
  )
}
