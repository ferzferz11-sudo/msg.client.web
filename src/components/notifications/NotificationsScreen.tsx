// ============================================
// NotificationsScreen — Server Notifications
// ============================================

import { Screen } from '@/components/common'
import { useNotifications } from '@/hooks/useNotifications'
import { useEffect } from 'react'

interface NotificationsScreenProps {
  onBack: () => void
  onChatClick?: (chatId: string) => void
}

export function NotificationsScreen({ onBack, onChatClick }: NotificationsScreenProps) {
  const { notifications, unreadCount, isLoading, loadHistory, markRead, markAllRead } = useNotifications()

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    // Mark all as read when opening
    if (unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)
      if (unreadIds.length > 0) markRead(unreadIds)
    }
  }, [])

  return (
    <Screen header={<NotificationsHeader onBack={onBack} onMarkAllRead={markAllRead} unreadCount={unreadCount} />}>
      <div style={{ padding: 16, color: '#fff' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Загрузка...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            Нет уведомлений
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => n.chatId && onChatClick?.(n.chatId)}
              style={{
                padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                cursor: n.chatId ? 'pointer' : 'default',
                opacity: n.isRead ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, color: '#fff', fontWeight: n.isRead ? 400 : 600 }}>
                  {n.title}
                </span>
                {!n.isRead && (
                  <span style={{
                    width: 8, height: 8, borderRadius: 4, background: '#6b5ce7',
                    flexShrink: 0, marginLeft: 8,
                  }} />
                )}
              </div>
              {n.body && (
                <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
                  {n.body}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                {new Date(n.createdAt).toLocaleString('ru')}
              </div>
            </div>
          ))
        )}
      </div>
    </Screen>
  )
}

function NotificationsHeader({ onBack, onMarkAllRead, unreadCount }: {
  onBack: () => void
  onMarkAllRead: () => void
  unreadCount: number
}) {
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
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
        🔔 Уведомления
        {unreadCount > 0 && (
          <span style={{
            marginLeft: 6, padding: '1px 6px', background: '#6b5ce7',
            borderRadius: 10, fontSize: 11,
          }}>
            {unreadCount}
          </span>
        )}
      </span>
      {unreadCount > 0 ? (
        <button onClick={onMarkAllRead} style={{
          color: '#6b5ce7', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer',
        }}>
          Прочитать все
        </button>
      ) : (
        <div style={{ width: 40 }} />
      )}
    </div>
  )
}
