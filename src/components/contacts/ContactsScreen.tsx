// ============================================
// ContactsScreen — Contacts List + User Directory
// ============================================

import { Screen } from '@/components/common'
import { useContacts } from '@/hooks/useContacts'
import { useState, useEffect, useCallback } from 'react'

interface ContactsScreenProps {
  onBack: () => void
  onContactClick?: (userId: string) => void
  onStartChat?: (userId: string, username: string) => void
}

type Tab = 'contacts' | 'all'

export function ContactsScreen({ onBack, onContactClick, onStartChat }: ContactsScreenProps) {
  const {
    contacts,
    allUsers,
    isLoading,
    isLoadingUsers,
    loadContacts,
    loadAllUsers,
    addContact,
    removeContact,
  } = useContacts()
  const [activeTab, setActiveTab] = useState<Tab>('contacts')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredUsers, setFilteredUsers] = useState(allUsers)

  useEffect(() => {
    if (activeTab === 'all') {
      loadAllUsers()
    }
  }, [activeTab, loadAllUsers])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers)
      return
    }
    const q = searchQuery.toLowerCase()
    setFilteredUsers(
      allUsers.filter(
        (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    )
  }, [searchQuery, allUsers])

  const handleRefresh = useCallback(() => {
    if (activeTab === 'contacts') {
      loadContacts()
    } else {
      loadAllUsers()
    }
  }, [activeTab, loadContacts, loadAllUsers])

  const handleAddContact = useCallback(
    async (userId: string, username: string) => {
      await addContact(userId, username)
    },
    [addContact]
  )

  const handleStartChat = useCallback(
    (userId: string, username: string) => {
      onStartChat?.(userId, username)
    },
    [onStartChat]
  )

  return (
    <Screen header={<ContactsHeader onBack={onBack} />}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'contacts' ? (
          <ContactsTab
            contacts={contacts}
            isLoading={isLoading}
            onContactClick={onContactClick}
            onRemove={removeContact}
            onRefresh={handleRefresh}
          />
        ) : (
          <AllUsersTab
            users={filteredUsers}
            isLoading={isLoadingUsers}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddContact={handleAddContact}
            onStartChat={handleStartChat}
            onRefresh={handleRefresh}
            contacts={contacts}
          />
        )}
      </div>
    </Screen>
  )
}

function ContactsHeader({ onBack }: { onBack: () => void }) {
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
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Контакты</span>
      <div style={{ width: 50 }} />
    </div>
  )
}

function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      {(['contacts', 'all'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === tab ? '2px solid #6b5ce7' : '2px solid transparent',
            color: activeTab === tab ? '#6b5ce7' : '#888',
            fontSize: 14,
            fontWeight: activeTab === tab ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {tab === 'contacts' ? 'Мои контакты' : 'Все пользователи'}
        </button>
      ))}
    </div>
  )
}

interface ContactsTabProps {
  contacts: any[]
  isLoading: boolean
  onContactClick?: (userId: string) => void
  onRemove: (userId: string) => Promise<boolean>
  onRefresh: () => void
}

function ContactsTab({ contacts, isLoading, onContactClick, onRemove, onRefresh }: ContactsTabProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    onRefresh()
    setTimeout(() => setRefreshing(false), 500)
  }, [onRefresh])

  return (
    <div className="scrollable" style={{ flex: 1, padding: '0 16px' }}>
      <div
        style={{
          display: 'flex', justifyContent: 'center', padding: '8px 0',
          color: '#666', fontSize: 12,
        }}
        onClick={handleRefresh}
      >
        {refreshing ? 'Обновление...' : 'Потяните для обновления'}
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Загрузка...</div>
      ) : contacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          Нет контактов
        </div>
      ) : (
        contacts.map((contact: any) => (
          <div
            key={contact.id}
            onClick={() => onContactClick?.(contact.id)}
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
              {contact.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: '#fff' }}>{contact.username}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {contact.isOnline ? '🟢 В сети' : '⚪ Не в сети'}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(contact.id) }}
              style={{
                padding: '4px 8px', background: 'rgba(255,100,100,0.15)', color: '#f66',
                border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  )
}

interface AllUsersTabProps {
  users: any[]
  isLoading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddContact: (userId: string, username: string) => void
  onStartChat: (userId: string, username: string) => void
  onRefresh: () => void
  contacts: any[]
}

function AllUsersTab({
  users,
  isLoading,
  searchQuery,
  onSearchChange,
  onAddContact,
  onStartChat,
  onRefresh,
  contacts,
}: AllUsersTabProps) {
  const [refreshing, setRefreshing] = useState(false)
  const contactIds = new Set(contacts.map((c: any) => c.id))

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    onRefresh()
    setTimeout(() => setRefreshing(false), 500)
  }, [onRefresh])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 10,
        }}>
          <span style={{ color: '#888', fontSize: 16 }}>🔍</span>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск пользователей..."
            style={{
              flex: 1, background: 'none', border: 'none', color: '#fff',
              fontSize: 15, outline: 'none',
            }}
          />
        </div>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: '0 16px' }}>
        <div
          style={{
            display: 'flex', justifyContent: 'center', padding: '8px 0',
            color: '#666', fontSize: 12, cursor: 'pointer',
          }}
          onClick={handleRefresh}
        >
          {refreshing ? 'Обновление...' : 'Потяните для обновления'}
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Загрузка...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            Пользователи не найдены
          </div>
        ) : (
          users.map((user) => {
            const isContact = contactIds.has(user.id)
            return (
              <div
                key={user.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  background: '#6b5ce7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#fff',
                }}>
                  {user.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: '#fff' }}>{user.username}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {user.status || 'Нет статуса'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!isContact && (
                    <button
                      onClick={() => onAddContact(user.id, user.username)}
                      style={{
                        padding: '6px 10px', background: 'rgba(107,92,231,0.2)', color: '#6b5ce7',
                        border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      + Контакт
                    </button>
                  )}
                  <button
                    onClick={() => onStartChat(user.id, user.username)}
                    style={{
                      padding: '6px 10px', background: 'rgba(107,92,231,0.15)', color: '#fff',
                      border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    💬
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
