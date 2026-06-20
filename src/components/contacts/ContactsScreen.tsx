// ============================================
// ContactsScreen — Contacts List
// ============================================

import { Screen } from '@/components/common'
import { useContacts } from '@/hooks/useContacts'
import { useState } from 'react'

interface ContactsScreenProps {
  onBack: () => void
  onContactClick?: (userId: string) => void
}

export function ContactsScreen({ onBack, onContactClick }: ContactsScreenProps) {
  const { contacts, isLoading, addContact, removeContact } = useContacts()
  const [showAdd, setShowAdd] = useState(false)
  const [newUsername, setNewUsername] = useState('')

  const handleAdd = async () => {
    if (!newUsername.trim()) return
    await addContact(newUsername, newUsername)
    setNewUsername('')
    setShowAdd(false)
  }

  return (
    <Screen header={<ContactsHeader onBack={onBack} onAdd={() => setShowAdd(!showAdd)} />}>
      <div style={{ padding: 16, color: '#fff' }}>
        {showAdd && (
          <div style={{
            display: 'flex', gap: 8, marginBottom: 16,
            padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8,
          }}>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Имя пользователя"
              style={{
                flex: 1, padding: '8px 12px',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            <button onClick={handleAdd} style={{
              padding: '8px 16px', background: '#6b5ce7', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
            }}>
              Добавить
            </button>
          </div>
        )}

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
                onClick={(e) => { e.stopPropagation(); removeContact(contact.id) }}
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
    </Screen>
  )
}

function ContactsHeader({ onBack, onAdd }: { onBack: () => void; onAdd: () => void }) {
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
      <button onClick={onAdd} style={{ color: '#6b5ce7', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>
        +
      </button>
    </div>
  )
}
