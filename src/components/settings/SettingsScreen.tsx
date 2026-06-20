// ============================================
// SettingsScreen — App Settings
// ============================================

import { Screen } from '@/components/common'
import { useProfile } from '@/hooks/useProfile'
import { useDevices } from '@/hooks/useDevices'
import { useState } from 'react'

interface SettingsScreenProps {
  onBack: () => void
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings, updateSettings, deleteProfile } = useProfile()
  const { devices, revokeDevice, deleteOtherDevices } = useDevices()
  const [showDevices, setShowDevices] = useState(false)
  const [showDanger, setShowDanger] = useState(false)

  return (
    <Screen header={<SettingsHeader onBack={onBack} />}>
      <div style={{ padding: 16, color: '#fff' }}>
        {/* Appearance */}
        <SectionTitle>Внешний вид</SectionTitle>
        <SettingRow
          label="Язык"
          value={settings.locale === 'ru' ? 'Русский' : 'English'}
          onClick={() => updateSettings({ locale: settings.locale === 'ru' ? 'en' : 'ru' })}
        />
        <SettingRow
          label="Тема"
          value={settings.themeId || 'По умолчанию'}
          onClick={() => {}}
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
            padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 4,
          }}>
            <div>
              <div style={{ fontSize: 14, color: '#fff' }}>{d.deviceName || d.deviceId}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{d.deviceType} • {d.isCurrent ? 'Текущее' : d.lastActiveAt}</div>
            </div>
            {!d.isCurrent && (
              <button onClick={() => revokeDevice(d.deviceId)} style={{
                padding: '4px 8px', background: 'rgba(255,100,100,0.2)', color: '#f66',
                border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
              }}>
                Отозвать
              </button>
            )}
          </div>
        ))}
        {devices.length > 1 && (
          <button onClick={deleteOtherDevices} style={{
            marginTop: 8, padding: '8px 16px',
            background: 'rgba(255,100,100,0.15)', color: '#f66',
            border: '1px solid rgba(255,100,100,0.3)', borderRadius: 8,
            fontSize: 13, cursor: 'pointer', width: '100%',
          }}>
            Завершить все другие сессии
          </button>
        )}

        {/* Password */}
        <SectionTitle>Безопасность</SectionTitle>
        <SettingRow label="Сменить пароль" value="" onClick={() => {}} />

        {/* Danger Zone */}
        <SectionTitle>Опасная зона</SectionTitle>
        <button onClick={() => setShowDanger(!showDanger)} style={{
          padding: '8px 16px', background: 'rgba(255,100,100,0.1)', color: '#f66',
          border: '1px solid rgba(255,100,100,0.2)', borderRadius: 8,
          fontSize: 13, cursor: 'pointer', width: '100%',
        }}>
          Удалить аккаунт
        </button>
        {showDanger && (
          <div style={{ marginTop: 8, padding: 12, background: 'rgba(255,0,0,0.1)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: '#f66', marginBottom: 8 }}>
              Это действие необратимо. Все данные будут удалены.
            </p>
            <button onClick={deleteProfile} style={{
              padding: '8px 16px', background: '#f00', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
            }}>
              Подтвердить удаление
            </button>
          </div>
        )}
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
      <div style={{ width: 40 }} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, color: '#6b5ce7',
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: 20, marginBottom: 8,
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
