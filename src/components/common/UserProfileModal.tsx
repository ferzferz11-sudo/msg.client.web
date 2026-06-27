import { useState, useEffect } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import type { UserProfile } from '@/shared/types'

interface UserProfileModalProps {
  username: string
  onClose: () => void
}

const TG = {
  bg: '#1a1a2e',
  card: '#17212B',
  text: '#fff',
  textSecondary: '#8b97a6',
  accent: '#6b5ce7',
  border: '#0E1621',
  green: '#4FAE4E',
}

export function UserProfileModal({ username, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    grpcClient.getUserProfile(username)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: TG.card, borderRadius: 16, padding: 24, minWidth: 280, maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: `1px solid ${TG.border}` }} onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: TG.textSecondary }}>Загрузка...</div>
        ) : !profile ? (
          <div style={{ textAlign: 'center', padding: 20, color: TG.textSecondary }}>Профиль не найден</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: (profile.fullAvatarUrl || profile.avatarUrl) ? `url(${profile.fullAvatarUrl || profile.avatarUrl}) center/cover` : TG.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 600, color: '#fff',
              }}>
                {!profile.fullAvatarUrl && !profile.avatarUrl && username.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: TG.text }}>{profile.username}</div>
              {profile.status && (
                <div style={{ fontSize: 13, color: TG.green }}>{profile.status}</div>
              )}
              {profile.bio && (
                <div style={{ fontSize: 13, color: TG.textSecondary, textAlign: 'center', lineHeight: 1.4 }}>{profile.bio}</div>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button onClick={onClose} style={{ padding: '8px 24px', background: TG.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Закрыть</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
