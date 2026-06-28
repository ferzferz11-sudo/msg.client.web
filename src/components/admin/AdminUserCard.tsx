import { LazyAvatar } from '@/components/common/LazyAvatar'

interface AdminUserCardProps {
  username: string
  email: string
  avatarUrl: string
  fullAvatarUrl: string
  isSuperAdmin: boolean
  lastSeenAt: string
  isOnline: boolean
  lastMessageText: string
  lastMessageTime: string
  chatCount: number
  onClick: () => void
}

function formatLastSeen(dateStr: string): string {
  if (!dateStr) return 'никогда'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин. назад`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} ч. назад`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD} дн. назад`
  return d.toLocaleDateString('ru-RU')
}

export function AdminUserCard({
  username, email, avatarUrl, fullAvatarUrl,
  isSuperAdmin, lastSeenAt, isOnline,
  lastMessageText, chatCount, onClick,
}: AdminUserCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)', border: 'none',
        borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <LazyAvatar
          src={fullAvatarUrl || avatarUrl}
          alt={username}
          size={44}
          style={{ borderRadius: 22 }}
        />
        {isOnline && (
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 12, height: 12, borderRadius: 6,
            background: '#4ade80', border: '2px solid #0E1621',
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{username}</span>
          {isSuperAdmin && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: '#a78bfa',
              background: 'rgba(167,139,250,0.15)', padding: '1px 6px',
              borderRadius: 4,
            }}>
              ADMIN
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lastMessageText || email}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: isOnline ? '#4ade80' : '#666' }}>
          {isOnline ? 'онлайн' : formatLastSeen(lastSeenAt)}
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
          {chatCount > 0 ? `${chatCount} чатов` : ''}
        </div>
      </div>
    </button>
  )
}
