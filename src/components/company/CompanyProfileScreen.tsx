import { useState, useEffect, useCallback } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import type { Company, CompanyPosition, CompanyMember } from '@/shared/types'

interface CompanyProfileScreenProps {
  companyId: string
  onBack: () => void
}

const POSITION_LEVELS = [
  { level: 0, label: 'Сотрудник', emoji: '👤' },
  { level: 1, label: 'Менеджер', emoji: '👔' },
  { level: 2, label: 'Топ-менеджер', emoji: '🏆' },
  { level: 3, label: 'Владелец', emoji: '👑' },
]

const CHAT_ACCESS_LEVELS = [
  { value: 'member', label: 'Сотрудники', emoji: '👥' },
  { value: 'management', label: 'Руководство', emoji: '👔' },
  { value: 'owner_only', label: 'Только владелец', emoji: '👑' },
]

export function CompanyProfileScreen({ companyId, onBack }: CompanyProfileScreenProps) {
  const user = useAuthStore((s) => s.user)
  const [company, setCompany] = useState<Company | null>(null)
  const [positions, setPositions] = useState<CompanyPosition[]>([])
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'positions' | 'members' | 'chats'>('info')
  const [isPrimary, setIsPrimary] = useState(false)
  const [settingPrimary, setSettingPrimary] = useState(false)

  const loadCompany = useCallback(async () => {
    try {
      const result = await grpcClient.getCompany(companyId)
      setCompany(result.company)
      setPositions(result.positions)
      const companies = await grpcClient.getUserCompanies()
      const found = companies.find((c) => c.company.id === companyId)
      setIsPrimary(found?.isPrimary ?? false)
    } catch (err) {
      console.error('Failed to load company:', err)
    }
  }, [companyId])

  const loadMembers = useCallback(async () => {
    try {
      const result = await grpcClient.listMembers(companyId)
      setMembers(result.members)
    } catch (err) {
      console.error('Failed to load members:', err)
    }
  }, [companyId])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([loadCompany(), loadMembers()])
      setIsLoading(false)
    }
    load()
  }, [loadCompany, loadMembers])

  const isOwner = company?.ownerId === user?.id

  const handleSetPrimary = async () => {
    setSettingPrimary(true)
    try {
      await grpcClient.setPrimaryCompany(companyId)
      setIsPrimary(true)
    } catch (err) {
      console.error('Failed to set primary company:', err)
    } finally {
      setSettingPrimary(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#1a1a2e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#888', fontSize: 15 }}>Загрузка...</div>
      </div>
    )
  }

  if (!company) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#1a1a2e',
        display: 'flex', flexDirection: 'column',
      }}>
        <Header title="Компания" onBack={onBack} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
          Компания не найдена
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#1a1a2e',
      display: 'flex', flexDirection: 'column',
    }}>
      <Header title={company.name} onBack={onBack} />

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(26, 26, 46, 0.95)',
      }}>
        {(['info', 'positions', 'members', 'chats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '12px 8px',
              background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #6b5ce7' : '2px solid transparent',
              color: activeTab === tab ? '#6b5ce7' : '#888',
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            {tab === 'info' ? 'ℹ️ Инфо' : tab === 'positions' ? '📋 Должности' : tab === 'members' ? '👥 Участники' : '💬 Чаты'}
          </button>
        ))}
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 16 }}>
        {activeTab === 'info' && (
          <InfoTab company={company} isOwner={isOwner} isPrimary={isPrimary} onSetPrimary={handleSetPrimary} settingPrimary={settingPrimary} onCompanyUpdated={loadCompany} />
        )}
        {activeTab === 'positions' && (
          <PositionsTab
            companyId={companyId}
            positions={positions}
            isOwner={isOwner}
            onPositionsUpdated={loadCompany}
          />
        )}
        {activeTab === 'members' && (
          <MembersTab
            companyId={companyId}
            members={members}
            positions={positions}
            isOwner={isOwner}
            onMembersUpdated={loadMembers}
          />
        )}
        {activeTab === 'chats' && (
          <ChatsTab companyId={companyId} isOwner={isOwner} />
        )}
      </div>
    </div>
  )
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
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
      <span style={{ fontSize: 17, fontWeight: 600, color: '#fff', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <div style={{ width: 60 }} />
    </div>
  )
}

function InfoTab({ company, isOwner, isPrimary, onSetPrimary, settingPrimary, onCompanyUpdated }: { company: Company; isOwner: boolean; isPrimary: boolean; onSetPrimary: () => void; settingPrimary: boolean; onCompanyUpdated: () => void }) {
  const user = useAuthStore((s) => s.user)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(company.name)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await grpcClient.updateCompany(company.id, name.trim())
      setEditing(false)
      onCompanyUpdated()
    } catch (err) {
      console.error('Failed to update company:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Вы уверены? Компания будет удалена безвозвратно.')) return
    try {
      await grpcClient.deleteCompany(company.id)
    } catch (err) {
      console.error('Failed to delete company:', err)
    }
  }

  return (
    <div>
      {/* Company Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 40,
          background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 12,
        }}>
          🏢
        </div>
        {editing ? (
          <div style={{ width: '100%', maxWidth: 300 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              style={{
                width: '100%', height: 40, borderRadius: 8,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(107,92,231,0.5)',
                color: '#fff', fontSize: 16, padding: '0 12px', outline: 'none', textAlign: 'center',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setEditing(false); setName(company.name) }} style={{
                flex: 1, height: 32, borderRadius: 6,
                background: 'rgba(255,255,255,0.08)', border: 'none',
                color: '#888', fontSize: 13, cursor: 'pointer',
              }}>
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 1, height: 32, borderRadius: 6,
                background: '#6b5ce7', border: 'none',
                color: '#fff', fontSize: 13, cursor: 'pointer',
              }}>
                {saving ? '...' : 'Сохранить'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>{company.name}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
              {company.memberCount} участников
            </div>
          </>
        )}
      </div>

      {/* Info Fields */}
      <div style={{ marginBottom: 16 }}>
        <InfoField label="ID компании" value={company.id} />
        <InfoField label="Создана" value={formatDate(company.createdAt)} />
        <InfoField label="Владелец" value={company.ownerId === user?.id ? 'Вы' : company.ownerId} />
        <InfoField label="Статус" value={isPrimary ? '⭐ Основная компания' : 'Обычная компания'} />
      </div>

      {/* Set as Primary */}
      {!isPrimary && (
        <button onClick={onSetPrimary} disabled={settingPrimary} style={{
          width: '100%', padding: '12px 16px', borderRadius: 10,
          background: 'rgba(255,193,7,0.15)', border: '1px solid rgba(255,193,7,0.3)',
          color: '#FFC107', fontSize: 14, cursor: 'pointer', marginBottom: 16,
        }}>
          {settingPrimary ? '...' : '⭐ Сделать основной'}
        </button>
      )}

      {/* Actions */}
      {isOwner && !editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <button onClick={() => setEditing(true)} style={{
            width: '100%', padding: '12px 16px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: 'none',
            color: '#fff', fontSize: 14, cursor: 'pointer', textAlign: 'left',
          }}>
            ✏️ Редактировать
          </button>
          <button onClick={handleDelete} style={{
            width: '100%', padding: '12px 16px', borderRadius: 10,
            background: 'rgba(229,57,53,0.15)', border: 'none',
            color: '#E53935', fontSize: 14, cursor: 'pointer', textAlign: 'left',
          }}>
            🗑 Удалить компанию
          </button>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#fff', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

function PositionsTab({ companyId, positions, isOwner, onPositionsUpdated }: {
  companyId: string
  positions: CompanyPosition[]
  isOwner: boolean
  onPositionsUpdated: () => void
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newLevel, setNewLevel] = useState(0)
  const [newChatAccess, setNewChatAccess] = useState('member')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      await grpcClient.createPosition(companyId, newTitle.trim(), newLevel, newChatAccess)
      setNewTitle('')
      setNewLevel(0)
      setNewChatAccess('member')
      setShowCreate(false)
      onPositionsUpdated()
    } catch (err) {
      console.error('Failed to create position:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (positionId: string) => {
    if (!confirm('Удалить должность?')) return
    try {
      await grpcClient.deletePosition(positionId)
      onPositionsUpdated()
    } catch (err) {
      console.error('Failed to delete position:', err)
    }
  }

  return (
    <div>
      {isOwner && (
        <button onClick={() => setShowCreate(!showCreate)} style={{
          width: '100%', padding: '12px 16px', borderRadius: 10,
          background: showCreate ? 'rgba(107,92,231,0.15)' : 'rgba(255,255,255,0.06)',
          border: showCreate ? '1px solid rgba(107,92,231,0.3)' : 'none',
          color: '#fff', fontSize: 14, cursor: 'pointer', marginBottom: 16,
        }}>
          {showCreate ? '✕ Отмена' : '➕ Добавить должность'}
        </button>
      )}

      {showCreate && (
        <div style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          marginBottom: 16,
        }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Название должности"
            style={{
              width: '100%', height: 40, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(107,92,231,0.3)',
              color: '#fff', fontSize: 14, padding: '0 12px', outline: 'none', marginBottom: 8,
            }}
          />
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Уровень</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {POSITION_LEVELS.map((pl) => (
                <button
                  key={pl.level}
                  onClick={() => setNewLevel(pl.level)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 6,
                    background: newLevel === pl.level ? 'rgba(107,92,231,0.3)' : 'rgba(255,255,255,0.08)',
                    border: newLevel === pl.level ? '1px solid #6b5ce7' : '1px solid transparent',
                    color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  {pl.emoji} {pl.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Доступ к чатам</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {CHAT_ACCESS_LEVELS.map((ca) => (
                <button
                  key={ca.value}
                  onClick={() => setNewChatAccess(ca.value)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 6,
                    background: newChatAccess === ca.value ? 'rgba(107,92,231,0.3)' : 'rgba(255,255,255,0.08)',
                    border: newChatAccess === ca.value ? '1px solid #6b5ce7' : '1px solid transparent',
                    color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  {ca.emoji} {ca.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating || !newTitle.trim()} style={{
            width: '100%', height: 36, borderRadius: 8,
            background: creating ? 'rgba(107,92,231,0.5)' : '#6b5ce7',
            border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer',
          }}>
            {creating ? '...' : 'Создать'}
          </button>
        </div>
      )}

      {positions.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 14 }}>
          Должности не созданы
        </div>
      ) : (
        positions.map((pos) => (
          <div key={pos.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <div style={{ fontSize: 14, color: '#fff' }}>
                {POSITION_LEVELS.find((p) => p.level === pos.level)?.emoji || '👤'} {pos.title}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                Уровень {pos.level} · {CHAT_ACCESS_LEVELS.find((ca) => ca.value === pos.chatAccess)?.label || pos.chatAccess}
              </div>
            </div>
            {isOwner && (
              <button onClick={() => handleDelete(pos.id)} style={{
                padding: '6px 10px', borderRadius: 6,
                background: 'rgba(229,57,53,0.15)', border: 'none',
                color: '#E53935', fontSize: 12, cursor: 'pointer',
              }}>
                Удалить
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function MembersTab({ companyId, members, positions, isOwner, onMembersUpdated }: {
  companyId: string
  members: CompanyMember[]
  positions: CompanyPosition[]
  isOwner: boolean
  onMembersUpdated: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const [showAdd, setShowAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ userId: string; username: string; avatarUrl?: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const [selectedPositionId, setSelectedPositionId] = useState('')

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const allUsers = await grpcClient.getAllUsers()
      const filtered = allUsers
        .filter((u: any) => u.username.toLowerCase().includes(query.toLowerCase()))
        .filter((u: any) => !members.some((m) => m.userId === u.userId))
        .slice(0, 10)
      setSearchResults(filtered.map((u: any) => ({
        userId: u.userId || '',
        username: u.username || '',
        avatarUrl: u.avatarUrl || '',
      })))
    } catch (err) {
      console.error('Failed to search users:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    if (!selectedPositionId) return
    setAddingUserId(userId)
    try {
      await grpcClient.addMember(companyId, userId, selectedPositionId)
      setShowAdd(false)
      setSearchQuery('')
      setSearchResults([])
      setSelectedPositionId('')
      onMembersUpdated()
    } catch (err) {
      console.error('Failed to add member:', err)
    } finally {
      setAddingUserId(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Удалить участника?')) return
    try {
      await grpcClient.removeMember(companyId, userId)
      onMembersUpdated()
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  return (
    <div>
      {isOwner && (
        <button onClick={() => setShowAdd(!showAdd)} style={{
          width: '100%', padding: '12px 16px', borderRadius: 10,
          background: showAdd ? 'rgba(107,92,231,0.15)' : 'rgba(255,255,255,0.06)',
          border: showAdd ? '1px solid rgba(107,92,231,0.3)' : 'none',
          color: '#fff', fontSize: 14, cursor: 'pointer', marginBottom: 16,
        }}>
          {showAdd ? '✕ Отмена' : '➕ Добавить участника'}
        </button>
      )}

      {showAdd && (
        <div style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          marginBottom: 16,
        }}>
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск пользователя..."
            style={{
              width: '100%', height: 40, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(107,92,231,0.3)',
              color: '#fff', fontSize: 14, padding: '0 12px', outline: 'none', marginBottom: 8,
            }}
          />
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Должность</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setSelectedPositionId(pos.id)}
                  style={{
                    padding: '6px 10px', borderRadius: 6,
                    background: selectedPositionId === pos.id ? 'rgba(107,92,231,0.3)' : 'rgba(255,255,255,0.08)',
                    border: selectedPositionId === pos.id ? '1px solid #6b5ce7' : '1px solid transparent',
                    color: '#fff', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {POSITION_LEVELS.find((p) => p.level === pos.level)?.emoji} {pos.title}
                </button>
              ))}
            </div>
          </div>
          {searching && <div style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: 8 }}>Поиск...</div>}
          {searchResults.map((u) => (
            <div key={u.userId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 14, color: '#fff' }}>{u.username}</span>
              <button
                onClick={() => handleAddMember(u.userId)}
                disabled={addingUserId === u.userId || !selectedPositionId}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: '#6b5ce7', border: 'none',
                  color: '#fff', fontSize: 12, cursor: 'pointer',
                  opacity: !selectedPositionId ? 0.5 : 1,
                }}
              >
                {addingUserId === u.userId ? '...' : 'Добавить'}
              </button>
            </div>
          ))}
        </div>
      )}

      {members.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 14 }}>
          Нет участников
        </div>
      ) : (
        members.map((member) => (
          <div key={member.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18,
                background: member.avatarUrl ? 'none' : 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 14, color: '#fff' }}>{member.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#fff' }}>{member.username}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {POSITION_LEVELS.find((p) => p.level === member.position?.level)?.emoji || '👤'} {member.position?.title || 'Без должности'}
                </div>
              </div>
            </div>
            {isOwner && member.userId !== user?.id && (
              <button onClick={() => handleRemoveMember(member.userId)} style={{
                padding: '4px 10px', borderRadius: 6,
                background: 'rgba(229,57,53,0.15)', border: 'none',
                color: '#E53935', fontSize: 12, cursor: 'pointer',
              }}>
                Удалить
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function ChatsTab({ companyId, isOwner }: { companyId: string; isOwner: boolean }) {
  const [chats, setChats] = useState<{ chatId: string; accessLevel: string; minPositionLevel: number }[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newChatName, setNewChatName] = useState('')
  const [newChatAccess, setNewChatAccess] = useState('member')
  const [newChatMinLevel, setNewChatMinLevel] = useState(0)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const result = await grpcClient.getCompanyChats(companyId)
        setChats(result)
      } catch (err) {
        console.error('Failed to load company chats:', err)
      } finally {
        setIsLoadingChats(false)
      }
    }
    load()
  }, [companyId])

  const handleCreateChat = async () => {
    if (!newChatName.trim()) return
    setCreating(true)
    try {
      await grpcClient.createCompanyChat(companyId, newChatName.trim(), newChatAccess, newChatMinLevel)
      setNewChatName('')
      setNewChatAccess('member')
      setNewChatMinLevel(0)
      setShowCreate(false)
      // Reload chats
      const result = await grpcClient.getCompanyChats(companyId)
      setChats(result)
    } catch (err) {
      console.error('Failed to create company chat:', err)
    } finally {
      setCreating(false)
    }
  }

  if (isLoadingChats) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 14 }}>Загрузка...</div>
  }

  return (
    <div>
      {isOwner && (
        <button onClick={() => setShowCreate(!showCreate)} style={{
          width: '100%', padding: '12px 16px', borderRadius: 10,
          background: showCreate ? 'rgba(107,92,231,0.15)' : 'rgba(255,255,255,0.06)',
          border: showCreate ? '1px solid rgba(107,92,231,0.3)' : 'none',
          color: '#fff', fontSize: 14, cursor: 'pointer', marginBottom: 16,
        }}>
          {showCreate ? '✕ Отмена' : '➕ Создать корпоративный чат'}
        </button>
      )}

      {showCreate && (
        <div style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          marginBottom: 16,
        }}>
          <input
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            placeholder="Название чата"
            style={{
              width: '100%', height: 40, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(107,92,231,0.3)',
              color: '#fff', fontSize: 14, padding: '0 12px', outline: 'none', marginBottom: 8,
            }}
          />
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Видимость</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {CHAT_ACCESS_LEVELS.map((ca) => (
                <button
                  key={ca.value}
                  onClick={() => setNewChatAccess(ca.value)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 6,
                    background: newChatAccess === ca.value ? 'rgba(107,92,231,0.3)' : 'rgba(255,255,255,0.08)',
                    border: newChatAccess === ca.value ? '1px solid #6b5ce7' : '1px solid transparent',
                    color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  {ca.emoji} {ca.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Мин. уровень позиции: {newChatMinLevel}</div>
            <input
              type="range"
              min={0}
              max={3}
              value={newChatMinLevel}
              onChange={(e) => setNewChatMinLevel(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666' }}>
              {POSITION_LEVELS.map((pl) => (
                <span key={pl.level}>{pl.emoji}</span>
              ))}
            </div>
          </div>
          <button onClick={handleCreateChat} disabled={creating || !newChatName.trim()} style={{
            width: '100%', height: 36, borderRadius: 8,
            background: creating ? 'rgba(107,92,231,0.5)' : '#6b5ce7',
            border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer',
          }}>
            {creating ? '...' : 'Создать'}
          </button>
        </div>
      )}

      {chats.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 14 }}>
          Корпоративных чатов нет
        </div>
      ) : (
        chats.map((chat) => (
          <div key={chat.chatId} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <div style={{ fontSize: 14, color: '#fff' }}>
                💬 {chat.chatId.slice(0, 8)}...
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {CHAT_ACCESS_LEVELS.find((ca) => ca.value === chat.accessLevel)?.label || chat.accessLevel}
                {chat.minPositionLevel > 0 && ` · мин. уровень ${chat.minPositionLevel}`}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}