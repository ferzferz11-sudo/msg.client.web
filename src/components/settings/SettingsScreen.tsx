import { Screen } from '@/components/common'
import { useProfile } from '@/hooks/useProfile'
import { useDevices } from '@/hooks/useDevices'
import { useState } from 'react'
import { APP_VERSION } from '@/shared/version'

interface SettingsScreenProps {
  onBack: () => void
  onAdmin?: () => void
}

const themes = [
  { id: '', name: 'По умолчанию', colors: ['#1a1a2e', '#6b5ce7'] },
  { id: 'midnight', name: 'Midnight', colors: ['#0d1117', '#58a6ff'] },
  { id: 'lavender', name: 'Lavender', colors: ['#2d1b69', '#a78bfa'] },
  { id: 'forest', name: 'Forest', colors: ['#0b3d2e', '#34d399'] },
  { id: 'sunset', name: 'Sunset', colors: ['#3b1a1a', '#f97316'] },
  { id: 'ocean', name: 'Ocean', colors: ['#0c1929', '#38bdf8'] },
]

export function SettingsScreen({ onBack, onAdmin }: SettingsScreenProps) {
  const { profile, settings, updateSettings, updateUsername, updatePassword, deleteProfile, serverInfo } = useProfile()
  const { devices, revokeDevice, deleteOtherDevices } = useDevices()

  const [showDevices, setShowDevices] = useState(false)
  const [showDanger, setShowDanger] = useState(false)
  const [showUsernameEdit, setShowUsernameEdit] = useState(false)
  const [showPasswordEdit, setShowPasswordEdit] = useState(false)
  const [showThemes, setShowThemes] = useState(false)

  const [newUsername, setNewUsername] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) return
    setSaving(true)
    const success = await updateUsername(newUsername.trim())
    setSaveMessage(success ? 'Имя пользователя изменено' : 'Ошибка')
    if (success) { setShowUsernameEdit(false); setNewUsername('') }
    setSaving(false)
    setTimeout(() => setSaveMessage(null), 2000)
  }

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || newPassword !== confirmPassword) return
    setSaving(true)
    const success = await updatePassword(oldPassword, newPassword)
    setSaveMessage(success ? 'Пароль изменён' : 'Ошибка смены пароля')
    if (success) { setShowPasswordEdit(false); setOldPassword(''); setNewPassword(''); setConfirmPassword('') }
    setSaving(false)
    setTimeout(() => setSaveMessage(null), 2000)
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) return
    setSaving(true)
    await deleteProfile(deletePassword)
    setSaving(false)
  }

  return (
    <Screen header={<SettingsHeader onBack={onBack} />}>
      <div className="scrollable" style={{ flex: 1, padding: 16, color: '#fff' }}>
        {saveMessage && (
          <div style={{
            padding: '10px 16px', marginBottom: 12, borderRadius: 10,
            background: saveMessage.includes('Ошибка') ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.15)',
            color: saveMessage.includes('Ошибка') ? '#ef4444' : '#4ade80',
            fontSize: 13,
          }}>
            {saveMessage}
          </div>
        )}

        {/* Account */}
        <SectionTitle>Аккаунт</SectionTitle>
        <SettingRow
          label="Имя пользователя"
          value={profile?.username || ''}
          onClick={() => { setShowUsernameEdit(!showUsernameEdit); setNewUsername(profile?.username || '') }}
        />
        {showUsernameEdit && (
          <div style={{ padding: '8px 0 12px' }}>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUsernameChange() }}
              placeholder="Новое имя"
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setShowUsernameEdit(false)} style={cancelBtnStyle}>Отмена</button>
              <button onClick={handleUsernameChange} disabled={saving || !newUsername.trim()} style={saveBtnStyle}>
                {saving ? '...' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}

        <SettingRow
          label="Сменить пароль"
          value=""
          onClick={() => setShowPasswordEdit(!showPasswordEdit)}
        />
        {showPasswordEdit && (
          <div style={{ padding: '8px 0 12px' }}>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Текущий пароль"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              style={inputStyle}
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Пароли не совпадают</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setShowPasswordEdit(false); setOldPassword(''); setNewPassword(''); setConfirmPassword('') }} style={cancelBtnStyle}>Отмена</button>
              <button onClick={handlePasswordChange} disabled={saving || !oldPassword || !newPassword || newPassword !== confirmPassword} style={saveBtnStyle}>
                {saving ? '...' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}

        {/* Appearance */}
        <SectionTitle>Внешний вид</SectionTitle>
        <SettingRow
          label="Тема"
          value={settings.themeId || 'По умолчанию'}
          onClick={() => setShowThemes(!showThemes)}
        />
        {showThemes && (
          <div style={{ padding: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => updateSettings({ themeId: t.id })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: settings.themeId === t.id ? 'rgba(107,92,231,0.2)' : 'rgba(255,255,255,0.04)',
                  border: settings.themeId === t.id ? '1px solid rgba(107,92,231,0.4)' : '1px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', gap: 2 }}>
                  {t.colors.map((c, i) => (
                    <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
                  ))}
                </div>
                <span style={{ fontSize: 14, color: '#fff' }}>{t.name}</span>
                {settings.themeId === t.id && <span style={{ marginLeft: 'auto', color: '#6b5ce7', fontSize: 16 }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        <SettingRow
          label="Язык"
          value={settings.locale === 'ru' ? 'Русский' : 'English'}
          onClick={() => updateSettings({ locale: settings.locale === 'ru' ? 'en' : 'ru' })}
        />

        {/* Notifications */}
        <SectionTitle>Уведомления</SectionTitle>
        <SettingRow
          label="Push-уведомления"
          value={settings.pushEnabled ? 'Вкл' : 'Выкл'}
          onClick={() => updateSettings({ pushEnabled: !settings.pushEnabled })}
        />

        {/* Devices */}
        <SectionTitle>Устройства</SectionTitle>
        <SettingRow
          label="Мои устройства"
          value={`${devices.length} шт.`}
          onClick={() => setShowDevices(!showDevices)}
        />
        {showDevices && devices.map((d: any) => (
          <div key={d.deviceId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 4,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.deviceName || d.deviceId}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {d.isCurrent ? 'Текущее устройство' : d.lastActiveAt || d.lastActive}
              </div>
            </div>
            {!d.isCurrent && (
              <button onClick={() => revokeDevice(d.deviceId)} style={{
                padding: '4px 10px', background: 'rgba(255,100,100,0.2)', color: '#f66',
                border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginLeft: 8, flexShrink: 0,
              }}>
                Отозвать
              </button>
            )}
          </div>
        ))}
        {devices.length > 1 && (
          <button onClick={deleteOtherDevices} style={{
            marginTop: 8, padding: '10px 16px',
            background: 'rgba(255,100,100,0.12)', color: '#f66',
            border: '1px solid rgba(255,100,100,0.25)', borderRadius: 10,
            fontSize: 13, cursor: 'pointer', width: '100%',
          }}>
            Завершить все другие сессии
          </button>
        )}

        {/* About */}
        <SectionTitle>О приложении</SectionTitle>
        <div style={{
          padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', fontSize: 14,
        }}>
          <span style={{ color: '#888' }}>Версия приложения</span>
          <span style={{ color: '#fff' }}>v{APP_VERSION}</span>
        </div>
        <div style={{
          padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', fontSize: 14,
        }}>
          <span style={{ color: '#888' }}>Версия сервера</span>
          <span style={{ color: '#fff' }}>{serverInfo.chat || serverInfo.version || '—'}</span>
        </div>

        {profile?.isSuperAdmin && onAdmin && (
          <>
            <SectionTitle>Администрирование</SectionTitle>
            <button onClick={onAdmin} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '12px 16px',
              background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: 10, cursor: 'pointer',
            }}>
              <span style={{ fontSize: 20 }}>⚙️</span>
              <span style={{ fontSize: 15, color: '#a78bfa' }}>Админ-панель</span>
              <span style={{ marginLeft: 'auto', fontSize: 14, color: '#666' }}>→</span>
            </button>
          </>
        )}

        {/* Danger Zone */}
        <SectionTitle>Опасная зона</SectionTitle>
        <button onClick={() => setShowDanger(!showDanger)} style={{
          padding: '10px 16px', background: 'rgba(255,100,100,0.08)', color: '#f66',
          border: '1px solid rgba(255,100,100,0.2)', borderRadius: 10,
          fontSize: 13, cursor: 'pointer', width: '100%',
        }}>
          Удалить аккаунт
        </button>
        {showDanger && (
          <div style={{
            marginTop: 8, padding: 14, background: 'rgba(255,0,0,0.08)', borderRadius: 10,
            border: '1px solid rgba(255,0,0,0.15)',
          }}>
            <p style={{ fontSize: 13, color: '#f66', marginBottom: 10, lineHeight: 1.4 }}>
              Это действие необратимо. Все данные будут удалены. Введите пароль для подтверждения.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Пароль"
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <button
              onClick={handleDeleteAccount}
              disabled={saving || !deletePassword}
              style={{
                padding: '10px 16px',
                background: deletePassword ? '#dc2626' : 'rgba(220,38,38,0.4)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, cursor: deletePassword ? 'pointer' : 'default', width: '100%',
              }}
            >
              {saving ? 'Удаление...' : 'Подтвердить удаление'}
            </button>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </Screen>
  )
}

function SettingsHeader({ onBack }: { onBack: () => void }) {
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
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Настройки</span>
      <div style={{ width: 60 }} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, color: '#6b5ce7',
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: 24, marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function SettingRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      width: '100%', padding: '12px 0',
      background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
      cursor: 'pointer', textAlign: 'left',
    }}>
      <span style={{ fontSize: 15, color: '#fff' }}>{label}</span>
      <span style={{ fontSize: 14, color: '#888' }}>{value} →</span>
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, borderRadius: 12,
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', fontSize: 15, padding: '0 16px', outline: 'none',
}

const cancelBtnStyle: React.CSSProperties = {
  flex: 1, height: 36, borderRadius: 8,
  background: 'rgba(255,255,255,0.08)', border: 'none',
  color: '#888', fontSize: 13, cursor: 'pointer',
}

const saveBtnStyle: React.CSSProperties = {
  flex: 1, height: 36, borderRadius: 8,
  background: '#6b5ce7', border: 'none',
  color: '#fff', fontSize: 13, cursor: 'pointer',
}
