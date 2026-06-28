import { useState, useEffect, useCallback } from 'react'
import { Screen } from '@/components/common'
import { useAdminUsers, type AdminUser } from '@/hooks/useAdminUsers'
import { AdminUserCard } from './AdminUserCard'
import { grpcClient } from '@/shared/api/grpcClient'

interface AdminPanelProps {
  onBack: () => void
}

type SortBy = 'lastSeenAt' | 'username' | 'chatCount'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'lastSeenAt', label: 'Последняя активность' },
  { value: 'username', label: 'Имя пользователя' },
  { value: 'chatCount', label: 'Количество чатов' },
]

export function AdminPanel({ onBack }: AdminPanelProps) {
  const { users, isLoading, hasMore, loadUsers } = useAdminUsers()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('lastSeenAt')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    loadUsers({ sortBy })
  }, [])

  const handleSearch = useCallback(() => {
    loadUsers({ query, sortBy })
  }, [query, sortBy, loadUsers])

  const handleSortChange = useCallback((newSort: SortBy) => {
    setSortBy(newSort)
    setShowSortMenu(false)
    loadUsers({ query, sortBy: newSort })
  }, [query, loadUsers])

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadUsers({ query, sortBy, append: true })
    }
  }, [isLoading, hasMore, query, sortBy, loadUsers])

  return (
    <Screen header={<AdminHeader onBack={onBack} />}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0E1621' }}>
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            placeholder="Поиск по имени или email..."
            style={{
              flex: 1, height: 40, borderRadius: 10,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 14, padding: '0 12px', outline: 'none',
            }}
          />
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            style={{
              height: 40, padding: '0 12px', borderRadius: 10,
              background: 'rgba(107,92,231,0.2)', border: '1px solid rgba(107,92,231,0.4)',
              color: '#a78bfa', fontSize: 13, cursor: 'pointer', position: 'relative',
            }}
          >
            ↕
          </button>
          {showSortMenu && (
            <div style={{
              position: 'absolute', top: 52, right: 16,
              background: '#1a2332', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              overflow: 'hidden', zIndex: 10, minWidth: 200,
            }}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSortChange(opt.value)}
                  style={{
                    display: 'block', width: '100%', padding: '10px 16px',
                    background: sortBy === opt.value ? 'rgba(107,92,231,0.2)' : 'transparent',
                    border: 'none', color: '#fff', fontSize: 14,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {opt.label} {sortBy === opt.value && '✓'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '4px 16px 8px', fontSize: 13, color: '#666' }}>
          {users.length > 0 ? `${users.length} пользователей` : isLoading ? 'Загрузка...' : 'Нет результатов'}
        </div>

        <div className="scrollable" style={{ flex: 1, overflow: 'auto' }}>
          {users.map((user) => (
            <AdminUserCard
              key={user.userId}
              {...user}
              onClick={() => setSelectedUser(user)}
            />
          ))}

          {hasMore && !isLoading && (
            <button
              onClick={handleLoadMore}
              style={{
                display: 'block', width: '100%', padding: '12px',
                background: 'transparent', border: 'none',
                color: '#6b5ce7', fontSize: 14, cursor: 'pointer',
              }}
            >
              Загрузить ещё
            </button>
          )}

          {isLoading && (
            <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 14 }}>
              Загрузка...
            </div>
          )}
        </div>

        {selectedUser && (
          <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
        )}
      </div>
    </Screen>
  )
}

function AdminHeader({ onBack }: { onBack: () => void }) {
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
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Админ-панель</span>
      <div style={{ width: 60 }} />
    </div>
  )
}

function UserProfileModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [sessions, setSessions] = useState<{
    deviceId: string
    deviceName: string
    deviceType: string
    clientVersion: string
    ipAddress: string
    lastSeenAt: string
    isOnline: boolean
  }[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  useEffect(() => {
    if (!user.userId) return
    setLoadingSessions(true)
    grpcClient.getAdminUserSessions(user.userId)
      .then((result) => setSessions(result.sessions))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false))
  }, [user.userId])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a2332', borderRadius: 16, padding: 24,
          minWidth: 320, maxWidth: '90vw', maxHeight: '80vh',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: user.avatarUrl ? 'transparent' : '#6b5ce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff', fontWeight: 600, overflow: 'hidden',
          }}>
            {user.avatarUrl
              ? <img src={user.fullAvatarUrl || user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : user.username[0]?.toUpperCase()
            }
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{user.username}</span>
              {user.isSuperAdmin && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#a78bfa',
                  background: 'rgba(167,139,250,0.15)', padding: '2px 8px', borderRadius: 4,
                }}>ADMIN</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{user.email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'auto' }}>
          <InfoRow label="Статус" value={user.isOnline ? 'Онлайн' : 'Офлайн'} />
          <InfoRow label="Последний визит" value={user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('ru-RU') : '—'} />
          <InfoRow label="Приложение" value={user.lastClientVersion || '—'} />
          <InfoRow label="Чатов" value={String(user.chatCount)} />
          {user.lastMessageText && (
            <InfoRow label="Последнее сообщение" value={user.lastMessageText} />
          )}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6b5ce7', marginBottom: 8 }}>
              Устройства ({loadingSessions ? '...' : sessions.length})
            </div>
            {loadingSessions ? (
              <div style={{ fontSize: 13, color: '#666', padding: '8px 0' }}>Загрузка...</div>
            ) : sessions.length === 0 ? (
              <div style={{ fontSize: 13, color: '#666', padding: '8px 0' }}>Нет активных сессий</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map((s) => (
                  <div key={s.deviceId} style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
                        {s.deviceName || s.deviceType || s.deviceId.slice(0, 8)}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 4,
                        background: s.isOnline ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                        color: s.isOnline ? '#4ade80' : '#666',
                      }}>
                        {s.isOnline ? 'Онлайн' : 'Офлайн'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {s.clientVersion && <span>v{s.clientVersion}</span>}
                      {s.ipAddress && <span>IP: {s.ipAddress}</span>}
                      {s.lastSeenAt && <span>{new Date(s.lastSeenAt).toLocaleString('ru-RU')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20, width: '100%', padding: '10px 0',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            borderRadius: 10, color: '#888', fontSize: 14, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: '#fff', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}
