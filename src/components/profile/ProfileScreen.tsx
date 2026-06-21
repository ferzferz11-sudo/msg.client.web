import { useState, useRef } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useAuthStore } from '@/store/authStore'

interface ProfileScreenProps {
  onBack: () => void
  onSettings?: () => void
  onContacts?: () => void
  onAIChats?: () => void
  onFavorites?: () => void
}

export function ProfileScreen({ onBack, onSettings, onContacts, onAIChats, onFavorites }: ProfileScreenProps) {
  const { profile, updateProfile, updateAvatar, isLoading } = useProfile()
  const user = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const displayName = profile?.username || user?.username || ''
  const avatarUrl = profile?.fullAvatarUrl || profile?.avatarUrl || user?.avatarUrl || ''
  const bio = profile?.bio || ''
  const status = profile?.status || ''
  const createdAt = profile?.createdAt || ''

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field)
    setEditValue(currentValue)
  }

  const saveEdit = async () => {
    if (!editingField) return
    setSaving(true)
    if (editingField === 'username') {
      await updateProfile({ username: editValue })
    } else if (editingField === 'bio') {
      await updateProfile({ bio: editValue })
    } else if (editingField === 'status') {
      await updateProfile({ status: editValue })
    }
    setEditingField(null)
    setSaving(false)
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      await updateAvatar(dataUrl, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const formatMemberSince = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const renderEditableField = (field: string, label: string, value: string, multiline = false) => {
    if (editingField === field) {
      return (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#6b5ce7', marginBottom: 6 }}>{label}</div>
          {multiline ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={{
                width: '100%', minHeight: 80, borderRadius: 12,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(107,92,231,0.5)',
                color: '#fff', fontSize: 15, padding: '12px 16px', outline: 'none',
                resize: 'vertical',
              }}
              autoFocus
            />
          ) : (
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
              style={{
                width: '100%', height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(107,92,231,0.5)',
                color: '#fff', fontSize: 15, padding: '0 16px', outline: 'none',
              }}
              autoFocus
            />
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={cancelEdit} style={{
              flex: 1, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: '#888', fontSize: 13, cursor: 'pointer',
            }}>
              Отмена
            </button>
            <button onClick={saveEdit} disabled={saving} style={{
              flex: 1, height: 36, borderRadius: 8,
              background: saving ? 'rgba(107,92,231,0.5)' : '#6b5ce7',
              border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer',
            }}>
              {saving ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )
    }
    return (
      <button onClick={() => startEdit(field, value)} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', padding: '12px 0',
        background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 15, color: '#fff' }}>{value || 'Не указано'}</div>
        </div>
        <span style={{ fontSize: 14, color: '#6b5ce7' }}>→</span>
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#1a1a2e',
      display: 'flex', flexDirection: 'column',
    }}>
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
        <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Профиль</span>
        <div style={{ width: 60 }} />
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 16 }}>
        {isLoading && !profile ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 15 }}>
            Загрузка...
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 96, height: 96, borderRadius: 48,
                  background: avatarUrl ? 'none' : 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: 'pointer', position: 'relative',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 36, color: '#fff' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: 14,
                  background: '#6b5ce7', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #1a1a2e',
                }}>
                  <span style={{ fontSize: 14, color: '#fff' }}>+</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
              <div style={{ marginTop: 12, fontSize: 22, fontWeight: 600, color: '#fff' }}>
                {displayName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 4,
                  background: profile?.lastSeenAt ? '#4ade80' : '#888',
                }} />
                <span style={{ fontSize: 13, color: '#888' }}>
                  {profile?.lastSeenAt ? 'в сети' : 'не в сети'}
                </span>
              </div>
              {createdAt && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Участник с {formatMemberSince(createdAt)}
                </div>
              )}
            </div>

            {/* Editable Fields */}
            <div style={{ marginBottom: 24 }}>
              {renderEditableField('username', 'Имя пользователя', displayName)}
              {renderEditableField('bio', 'О себе', bio, true)}
              {renderEditableField('status', 'Статус', status)}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onFavorites && (
                <button onClick={onFavorites} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  color: '#fff', fontSize: 15, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 20 }}>⭐</span>
                  Избранное
                </button>
              )}
              {onSettings && (
                <button onClick={onSettings} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  color: '#fff', fontSize: 15, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 20 }}>⚙️</span>
                  Настройки
                </button>
              )}
              {onContacts && (
                <button onClick={onContacts} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  color: '#fff', fontSize: 15, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 20 }}>👥</span>
                  Контакты
                </button>
              )}
              {onAIChats && (
                <button onClick={onAIChats} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  color: '#fff', fontSize: 15, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 20 }}>🤖</span>
                  AI Чаты
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
