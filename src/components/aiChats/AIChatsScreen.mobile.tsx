import { useState, useRef, useEffect } from 'react'
import { Screen } from '@/components/common'
import { useAIChats } from '@/hooks/useAIChats'
import { grpcClient } from '@/shared/api/grpcClient'
import type { AIMessage, AIAgentV2 } from '@/shared/types'

type MobileView = 'chats' | 'chat' | 'agents' | 'agent-edit' | 'marketplace' | 'usage' | 'ai-settings'

interface Props {
  onBack: () => void
}

export default function AIChatsScreenMobile({ onBack }: Props) {
  const {
    chats, agents, activeChatId, messages, isStreaming, selectedAgentId, isLoading,
    marketplaceResults, usageStats,
    loadAgents, createNewChat, sendMessage, stopStreaming,
    loadChatMessages, renameChat, deleteChat, selectAgent,
    createAgent, updateAgent, deleteAgent, cloneAgent,
    searchMarketplace, installAgent, loadUsageStats,
    multiSelectedIds, isMultiMode, multiAgentMessages, activeMultiTab,
    toggleMultiAgent, clearMultiSelection, sendMultiAgentMessage, stopMultiStreaming,
    setActiveMultiTab, setIsMultiMode,
  } = useAIChats()

  const [view, setView] = useState<MobileView>('chats')
  const [inputText, setInputText] = useState('')
  const [editingAgent, setEditingAgent] = useState<AIAgentV2 | null>(null)
  const [agentForm, setAgentForm] = useState({
    name: '', description: '', providerType: 'openrouter', model: '',
    systemPrompt: '', toolsEnabled: false, ragEnabled: false,
    temperature: 0.7, maxTokens: 4096, emoji: '🤖',
  })
  const [marketplaceQuery, setMarketplaceQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [aiSettings, setAiSettings] = useState<{ apiKey: string; model: string; remaining: number; limit: number } | null>(null)
  const [settingsApiKey, setSettingsApiKey] = useState('')
  const [settingsModel, setSettingsModel] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadAISettings = async (sessionId: string) => {
    try {
      const settings = await grpcClient.getAIChatSettings(sessionId, '')
      setAiSettings({ apiKey: settings.userApiKey, model: settings.model, remaining: settings.remaining, limit: settings.limit })
      setSettingsApiKey(settings.userApiKey)
      setSettingsModel(settings.model)
      setSettingsMessage('')
    } catch (err) {
      console.error('Failed to load AI settings:', err)
    }
  }

  const saveAISettings = async () => {
    if (!activeChatId) return
    try {
      const result = await grpcClient.updateAIChatSettings(activeChatId, '', settingsApiKey, settingsModel)
      setSettingsMessage(result.message || (result.success ? 'Сохранено' : 'Ошибка'))
      if (result.success) {
        setAiSettings((prev) => prev ? { ...prev, apiKey: settingsApiKey, model: settingsModel } : prev)
      }
    } catch (err) {
      setSettingsMessage('Ошибка сохранения')
    }
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text && !imagePreview) return
    setInputText('')
    const img = imagePreview
    setImagePreview(null)
    if (isMultiMode && multiSelectedIds.length > 0) {
      await sendMultiAgentMessage(text, img || undefined)
    } else {
      await sendMessage(text, img || undefined)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleNewChat = async () => {
    setShowNewChatModal(true)
  }

  const handleNewChatWithAgent = async (agentId?: string) => {
    setShowNewChatModal(false)
    await createNewChat(agentId)
    setView('chat')
  }

  const handleChatClick = (chatId: string) => {
    loadChatMessages(chatId)
    setView('chat')
  }

  const handleSaveAgent = async () => {
    if (!agentForm.name.trim()) return
    if (editingAgent) {
      await updateAgent(editingAgent.id, agentForm)
    } else {
      await createAgent(agentForm)
    }
    setEditingAgent(null)
    setAgentForm({ name: '', description: '', providerType: 'openrouter', model: '', systemPrompt: '', toolsEnabled: false, ragEnabled: false, temperature: 0.7, maxTokens: 4096, emoji: '🤖' })
    setView('agents')
  }

  const handleRename = async (chatId: string) => {
    if (newName.trim()) {
      await renameChat(chatId, newName.trim())
      setRenamingId(null)
      setNewName('')
    }
  }

  if (view === 'chats') {
    return (
      <Screen header={
        <div className="safe-top" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44, padding: '0 16px',
          background: 'rgba(26, 26, 46, 0.95)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={onBack} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Назад
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>AI чаты</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { if (activeChatId) { loadAISettings(activeChatId); setView('ai-settings') } }} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>🔑</button>
            <button onClick={() => { loadAgents(); setView('agents') }} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>⚙️</button>
            <button onClick={() => { loadUsageStats(); setView('usage') }} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>📊</button>
          </div>
        </div>
      }>
        <div style={{ padding: '12px 16px' }}>
          <button onClick={handleNewChat} style={{
            width: '100%', padding: '12px 0', borderRadius: 12,
            background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
            border: 'none', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', marginBottom: 12,
          }}>
            + Новый чат
          </button>
        </div>
        <div className="scrollable" style={{ flex: 1, padding: '0 16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Загрузка...</div>
          ) : chats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Нет AI чатов</div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div onClick={() => handleChatClick(chat.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: 'linear-gradient(135deg, #6b5ce7, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    🤖
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {renamingId === chat.id ? (
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={() => handleRename(chat.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(chat.id)}
                        autoFocus
                        style={{
                          background: 'rgba(255,255,255,0.08)', border: '1px solid #6b5ce7',
                          borderRadius: 4, color: '#fff', fontSize: 15, padding: '2px 6px', width: '100%',
                        }}
                      />
                    ) : (
                      <>
                        <div style={{ fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {chat.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {chat.lastMessageText || 'Нет сообщений'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => { setRenamingId(chat.id); setNewName(chat.name) }} style={{
                  padding: '4px 8px', background: 'rgba(107,92,231,0.2)', color: '#6b5ce7',
                  border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                }}>✏️</button>
                <button onClick={() => deleteChat(chat.id)} style={{
                  padding: '4px 8px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c',
                  border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                }}>🗑️</button>
              </div>
            ))
          )}
        </div>
      </Screen>
    )
  }

  if (view === 'chat') {
    return (
      <Screen header={
        <div className="safe-top" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44, padding: '0 16px',
          background: 'rgba(26, 26, 46, 0.95)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={() => setView('chats')} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Чаты
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
            {chats.find((c) => c.id === activeChatId)?.name || 'AI Chat'}
          </span>
          {isMultiMode ? (
            <button onClick={() => { loadAgents(); setView('agents') }} style={{
              padding: '4px 8px', background: '#6b5ce7', color: '#fff',
              border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600,
            }}>
              🔀 {multiSelectedIds.length} агентов
            </button>
          ) : (
            <button onClick={() => { loadAgents(); setView('agents') }} style={{
              padding: '4px 8px', background: 'rgba(107,92,231,0.2)', color: '#6b5ce7',
              border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
            }}>
              {agents.find((a) => a.id === selectedAgentId)?.name || 'Выбрать агента'}
            </button>
          )}
        </div>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {isMultiMode && Object.keys(multiAgentMessages).length > 0 && (
            <div style={{
              display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(26,26,46,0.5)',
            }}>
              {Object.keys(multiAgentMessages).map((agentId) => {
                const agent = agents.find((a) => a.id === agentId)
                const isActive = activeMultiTab === agentId
                const msgs = multiAgentMessages[agentId] || []
                const lastMsg = msgs[msgs.length - 1]
                const isDone = lastMsg && !lastMsg.isStreaming
                return (
                  <button key={agentId} onClick={() => setActiveMultiTab(agentId)} style={{
                    padding: '10px 14px', background: 'none', border: 'none',
                    borderBottom: isActive ? '2px solid #6b5ce7' : '2px solid transparent',
                    color: isActive ? '#6b5ce7' : '#888',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {agent?.emoji || '🤖'} {agent?.name || agentId.slice(0, 6)}
                    {!isDone && <span style={{ fontSize: 9 }}>⏳</span>}
                    {isDone && <span style={{ fontSize: 9 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}

          <div className="scrollable" style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
            {isMultiMode && activeMultiTab && multiAgentMessages[activeMultiTab] ? (
              <>
                {multiAgentMessages[activeMultiTab].map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </>
            ) : !isMultiMode ? (
              <>
                {messages.length === 0 && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100%', color: '#888',
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                    <div style={{ fontSize: 16, marginBottom: 8 }}>AI Assistant</div>
                    <div style={{ fontSize: 13 }}>Начните диалог</div>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: '#888',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔀</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Multi-Agent Mode</div>
                <div style={{ fontSize: 12 }}>Выберите агентов и отправьте сообщение</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {imagePreview && (
            <div style={{ padding: '8px 16px', position: 'relative' }}>
              <img src={imagePreview} alt="" style={{ height: 80, borderRadius: 8, objectFit: 'cover' }} />
              <button onClick={() => setImagePreview(null)} style={{
                position: 'absolute', top: 4, left: 60,
                width: 20, height: 20, borderRadius: 10,
                background: 'rgba(0,0,0,0.7)', color: '#fff',
                border: 'none', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          )}

          <div className="safe-bottom" style={{
            padding: '8px 12px',
            background: 'rgba(26, 26, 46, 0.95)', backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <button onClick={() => fileInputRef.current?.click()} style={{
                width: 36, height: 36, borderRadius: 18,
                background: 'rgba(255,255,255,0.08)', border: 'none',
                color: '#6b5ce7', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>📎</button>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Сообщение..."
                rows={1}
                style={{
                  flex: 1, minHeight: 36, maxHeight: 120, padding: '8px 12px',
                  borderRadius: 18, background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
                  fontSize: 15, resize: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
              {isStreaming ? (
                <button onClick={isMultiMode ? stopMultiStreaming : stopStreaming} style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: '#e74c3c', border: 'none',
                  color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>■</button>
              ) : (
                <button onClick={handleSend} style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: (inputText.trim() || imagePreview) ? 'linear-gradient(135deg, #6b5ce7, #8b7cf7)' : 'rgba(255,255,255,0.08)',
                  border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>↑</button>
              )}
            </div>
          </div>
        </div>
      </Screen>
    )
  }

  if (view === 'agents' || view === 'agent-edit') {
    return (
      <Screen header={
        <div className="safe-top" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44, padding: '0 16px',
          background: 'rgba(26, 26, 46, 0.95)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={() => setView(activeChatId ? 'chat' : 'chats')} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Назад
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
            {view === 'agent-edit' ? (editingAgent ? 'Редактировать' : 'Новый агент') : 'Агенты'}
          </span>
          {view === 'agents' && (
            <button onClick={() => { setEditingAgent(null); setAgentForm({ name: '', description: '', providerType: 'openrouter', model: '', systemPrompt: '', toolsEnabled: false, ragEnabled: false, temperature: 0.7, maxTokens: 4096, emoji: '🤖' }); setView('agent-edit') }} style={{
              padding: '4px 10px', background: 'rgba(107,92,231,0.2)', color: '#6b5ce7',
              border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer', fontWeight: 600,
            }}>+ Новый</button>
          )}
          {view === 'agents' && (
            <button onClick={() => { loadAgents(); setView('marketplace') }} style={{
              padding: '4px 8px', background: 'rgba(107,92,231,0.2)', color: '#6b5ce7',
              border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
            }}>🏪</button>
          )}
        </div>
      }>
        {view === 'agents' ? (
          <div className="scrollable" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => {
                if (isMultiMode) {
                  clearMultiSelection()
                } else {
                  setIsMultiMode(true)
                }
              }} style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                background: isMultiMode ? '#6b5ce7' : 'rgba(107,92,231,0.15)',
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}>
                {isMultiMode ? `Multi-Agent (${multiSelectedIds.length})` : '🔀 Multi-Agent'}
              </button>
              {isMultiMode && multiSelectedIds.length > 0 && (
                <button onClick={() => { setView('chat') }} style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}>→ Чат</button>
              )}
            </div>
            {agents.filter((a) => a.isPreset).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Пресеты</div>
                {agents.filter((a) => a.isPreset).map((agent) => (
                  <AgentCard key={agent.id} agent={agent} selected={selectedAgentId === agent.id} onSelect={() => { if (!isMultiMode) { selectAgent(agent.id); if (activeChatId) setView('chat') } }} onEdit={() => { if (!isMultiMode) { setEditingAgent(agent); setAgentForm({ name: agent.name, description: agent.description, providerType: agent.providerType, model: agent.model, systemPrompt: agent.systemPrompt, toolsEnabled: agent.toolsEnabled, ragEnabled: agent.ragEnabled, temperature: agent.temperature, maxTokens: agent.maxTokens, emoji: agent.emoji }); setView('agent-edit') } }} onClone={() => cloneAgent(agent.id)} multiMode={isMultiMode} multiSelected={multiSelectedIds.includes(agent.id)} onToggleMulti={() => toggleMultiAgent(agent.id)} />
                ))}
              </div>
            )}
            {agents.filter((a) => !a.isPreset).length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Мои агенты</div>
                {agents.filter((a) => !a.isPreset).map((agent) => (
                  <AgentCard key={agent.id} agent={agent} selected={selectedAgentId === agent.id} onSelect={() => { if (!isMultiMode) { selectAgent(agent.id); if (activeChatId) setView('chat') } }} onEdit={() => { if (!isMultiMode) { setEditingAgent(agent); setAgentForm({ name: agent.name, description: agent.description, providerType: agent.providerType, model: agent.model, systemPrompt: agent.systemPrompt, toolsEnabled: agent.toolsEnabled, ragEnabled: agent.ragEnabled, temperature: agent.temperature, maxTokens: agent.maxTokens, emoji: agent.emoji }); setView('agent-edit') } }} onDelete={() => deleteAgent(agent.id)} onClone={() => cloneAgent(agent.id)} multiMode={isMultiMode} multiSelected={multiSelectedIds.includes(agent.id)} onToggleMulti={() => toggleMultiAgent(agent.id)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="scrollable" style={{ padding: '12px 16px' }}>
            <AgentForm
              form={agentForm}
              onChange={setAgentForm}
              onSave={handleSaveAgent}
              onCancel={() => { setEditingAgent(null); setView('agents') }}
            />
          </div>
        )}
      </Screen>
    )
  }

  if (view === 'marketplace') {
    return (
      <Screen header={
        <div className="safe-top" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44, padding: '0 16px',
          background: 'rgba(26, 26, 46, 0.95)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={() => setView('agents')} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Агенты
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Маркетплейс</span>
          <div style={{ width: 40 }} />
        </div>
      }>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={marketplaceQuery}
              onChange={(e) => setMarketplaceQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMarketplace(marketplaceQuery)}
              placeholder="Поиск агентов..."
              style={{
                flex: 1, height: 40, borderRadius: 10, padding: '0 14px',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 15, outline: 'none',
              }}
            />
            <button onClick={() => searchMarketplace(marketplaceQuery)} style={{
              padding: '0 16px', height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Поиск</button>
          </div>
        </div>
        <div className="scrollable" style={{ padding: '0 16px' }}>
          {marketplaceResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              {marketplaceQuery ? 'Ничего не найдено' : 'Введите запрос для поиска'}
            </div>
          ) : (
            marketplaceResults.map((agent) => (
              <div key={agent.id} style={{
                padding: '12px', marginBottom: 8, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 24 }}>{agent.emoji || '🤖'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{agent.model} · ⭐ {agent.avgRating.toFixed(1)} · 📥 {agent.installCount}</div>
                  </div>
                  <button onClick={() => installAgent(agent.id)} style={{
                    padding: '6px 14px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
                    border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>Установить</button>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{agent.description}</div>
                {agent.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {agent.tags.map((tag) => (
                      <span key={tag} style={{
                        padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(107,92,231,0.15)', color: '#6b5ce7',
                        fontSize: 11,
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Screen>
    )
  }

  if (view === 'usage') {
    return (
      <Screen header={
        <div className="safe-top" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44, padding: '0 16px',
          background: 'rgba(26, 26, 46, 0.95)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={() => setView('chats')} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Назад
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Статистика</span>
          <div style={{ width: 40 }} />
        </div>
      }>
        <div className="scrollable" style={{ padding: '16px' }}>
          {usageStats ? (
            <>
              <div style={{
                display: 'flex', gap: 12, marginBottom: 16,
              }}>
                <div style={{
                  flex: 1, padding: '16px', borderRadius: 12,
                  background: 'rgba(107,92,231,0.1)', border: '1px solid rgba(107,92,231,0.2)',
                }}>
                  <div style={{ fontSize: 12, color: '#888' }}>Всего запросов</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#6b5ce7' }}>{usageStats.totalRequests}</div>
                </div>
                <div style={{
                  flex: 1, padding: '16px', borderRadius: 12,
                  background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                }}>
                  <div style={{ fontSize: 12, color: '#888' }}>Всего токенов</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#a855f7' }}>{usageStats.totalTokens.toLocaleString()}</div>
                </div>
              </div>
              {usageStats.stats.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>По агентам</div>
                  {usageStats.stats.map((stat) => (
                    <div key={stat.agentId} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <span style={{ fontSize: 14, color: '#fff' }}>{stat.agentName}</span>
                      <div style={{ fontSize: 13, color: '#888' }}>{stat.requests} · {stat.tokens.toLocaleString()} tok</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Загрузка...</div>
          )}
        </div>
      </Screen>
    )
  }

  if (view === 'ai-settings') {
    return (
      <Screen header={
        <div className="safe-top" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44, padding: '0 16px',
          background: 'rgba(26, 26, 46, 0.95)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={() => setView('chats')} style={{ color: '#6b5ce7', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Назад
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Настройки AI</span>
          <div style={{ width: 40 }} />
        </div>
      }>
        <div className="scrollable" style={{ padding: '16px' }}>
          {aiSettings && (
            <div style={{
              padding: '12px', marginBottom: 16, borderRadius: 12,
              background: 'rgba(107,92,231,0.1)', border: '1px solid rgba(107,92,231,0.2)',
            }}>
              <div style={{ fontSize: 12, color: '#888' }}>Использование</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#6b5ce7' }}>
                {aiSettings.remaining} / {aiSettings.limit}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>запросов осталось</div>
            </div>
          )}

          <FormField label="Свой API ключ (OpenRouter)">
            <input
              value={settingsApiKey}
              onChange={(e) => setSettingsApiKey(e.target.value)}
              placeholder="sk-or-..."
              type="password"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Модель">
            <input
              value={settingsModel}
              onChange={(e) => setSettingsModel(e.target.value)}
              placeholder="anthropic/claude-sonnet-4"
              style={inputStyle}
            />
          </FormField>

          {settingsMessage && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, marginBottom: 12,
              background: settingsMessage.includes('Ошибка') ? 'rgba(231,76,60,0.15)' : 'rgba(76,175,80,0.15)',
              color: settingsMessage.includes('Ошибка') ? '#e74c3c' : '#4caf50',
              fontSize: 13,
            }}>
              {settingsMessage}
            </div>
          )}

          <button onClick={saveAISettings} style={{
            width: '100%', height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', marginTop: 8,
          }}>
            Сохранить
          </button>
        </div>
      </Screen>
    )
  }

  return (
    <>
      {showNewChatModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setShowNewChatModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxHeight: '70vh',
            background: '#1e1e36', borderRadius: '16px 16px 0 0',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Новый AI чат</span>
              <button onClick={() => setShowNewChatModal(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 18, padding: 4,
              }}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => handleNewChatWithAgent()} style={{
                width: '100%', padding: '12px 0', borderRadius: 12,
                background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
              }}>Без агента (по умолчанию)</button>
            </div>
            <div className="scrollable" style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', maxHeight: '50vh' }}>
              {agents.filter((a) => a.isPreset).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, padding: '6px 4px' }}>Пресеты</div>
                  {agents.filter((a) => a.isPreset).map((agent) => (
                    <ChatAgentRow key={agent.id} agent={agent} onSelect={() => handleNewChatWithAgent(agent.id)} />
                  ))}
                </div>
              )}
              {agents.filter((a) => !a.isPreset).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, padding: '6px 4px' }}>Мои агенты</div>
                  {agents.filter((a) => !a.isPreset).map((agent) => (
                    <ChatAgentRow key={agent.id} agent={agent} onSelect={() => handleNewChatWithAgent(agent.id)} />
                  ))}
                </div>
              )}
              {agents.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: '#888', fontSize: 13 }}>Нет агентов</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className="message-appear" style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{ maxWidth: '82%' }}>
        {!isUser && message.agentName && (
          <div style={{ fontSize: 11, color: '#6b5ce7', marginBottom: 2, fontWeight: 600 }}>
            {message.agentName}
          </div>
        )}
        <div style={{
          padding: '10px 14px', borderRadius: 16,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          background: isUser
            ? 'linear-gradient(135deg, #6b5ce7, #8b7cf7)'
            : 'rgba(255,255,255,0.08)',
          color: '#fff', fontSize: 15, lineHeight: 1.45,
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {message.content || (message.role === 'assistant' ? '...' : '')}
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {message.toolCalls.map((tc) => (
              <div key={tc.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 6,
                background: 'rgba(107,92,231,0.15)', color: '#6b5ce7',
                fontSize: 11, marginTop: 2,
              }}>
                🔧 {tc.name}
              </div>
            ))}
          </div>
        )}
        {message.modelUsed && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {message.modelUsed}{message.tokenCount ? ` · ${message.tokenCount} tok` : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentCard({ agent, selected, onSelect, onEdit, onDelete, onClone, multiMode, multiSelected, onToggleMulti }: {
  agent: AIAgentV2
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete?: () => void
  onClone: () => void
  multiMode?: boolean
  multiSelected?: boolean
  onToggleMulti?: () => void
}) {
  const handleClick = multiMode ? (onToggleMulti || onSelect) : onSelect
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div onClick={handleClick} style={{
        display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer',
        opacity: selected || multiSelected ? 1 : 0.85,
      }}>
        {multiMode && (
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            border: `2px solid ${multiSelected ? '#6b5ce7' : 'rgba(255,255,255,0.3)'}`,
            background: multiSelected ? '#6b5ce7' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#fff', flexShrink: 0,
          }}>
            {multiSelected && '✓'}
          </div>
        )}
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: multiSelected ? 'linear-gradient(135deg, #6b5ce7, #a855f7)' : selected ? 'linear-gradient(135deg, #6b5ce7, #a855f7)' : 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>
          {agent.emoji || '🤖'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
          <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {agent.model || agent.providerType}
          </div>
        </div>
        {!multiMode && selected && <span style={{ color: '#6b5ce7', fontSize: 14 }}>✓</span>}
      </div>
      {!multiMode && (
        <>
          <button onClick={onEdit} style={{ color: '#888', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
          <button onClick={onClone} style={{ color: '#888', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>📋</button>
          {onDelete && <button onClick={onDelete} style={{ color: '#e74c3c', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>}
        </>
      )}
    </div>
  )
}

function AgentForm({ form, onChange, onSave, onCancel }: {
  form: { name: string; description: string; providerType: string; model: string; systemPrompt: string; toolsEnabled: boolean; ragEnabled: boolean; temperature: number; maxTokens: number; emoji: string }
  onChange: (f: typeof form) => void
  onSave: () => void
  onCancel: () => void
}) {
  const providers = ['openrouter', 'mimo', 'local', 'webhook']
  return (
    <div>
      <FormField label="Название">
        <input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="Имя агента" style={inputStyle} />
      </FormField>
      <FormField label="Описание">
        <input value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} placeholder="Описание" style={inputStyle} />
      </FormField>
      <FormField label="Emoji">
        <input value={form.emoji} onChange={(e) => onChange({ ...form, emoji: e.target.value })} style={{ ...inputStyle, width: 60 }} />
      </FormField>
      <FormField label="Провайдер">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {providers.map((p) => (
            <button key={p} onClick={() => onChange({ ...form, providerType: p })} style={{
              padding: '6px 12px', borderRadius: 8,
              background: form.providerType === p ? '#6b5ce7' : 'rgba(255,255,255,0.08)',
              border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer',
            }}>{p}</button>
          ))}
        </div>
      </FormField>
      <FormField label="Модель">
        <input value={form.model} onChange={(e) => onChange({ ...form, model: e.target.value })} placeholder="anthropic/claude-sonnet-4" style={inputStyle} />
      </FormField>
      <FormField label="System Prompt">
        <textarea
          value={form.systemPrompt}
          onChange={(e) => onChange({ ...form, systemPrompt: e.target.value })}
          placeholder="Ты полезный ассистент..."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
        />
      </FormField>
      <FormField label="Temperature">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range" min="0" max="2" step="0.1"
            value={form.temperature}
            onChange={(e) => onChange({ ...form, temperature: parseFloat(e.target.value) })}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 14, color: '#fff', minWidth: 30, textAlign: 'right' }}>{form.temperature}</span>
        </div>
      </FormField>
      <FormField label="Max Tokens">
        <input
          type="number" min="256" max="128000"
          value={form.maxTokens}
          onChange={(e) => onChange({ ...form, maxTokens: parseInt(e.target.value) || 4096 })}
          style={inputStyle}
        />
      </FormField>
      <FormField label="Инструменты">
        <ToggleSwitch checked={form.toolsEnabled} onChange={(v) => onChange({ ...form, toolsEnabled: v })} />
      </FormField>
      <FormField label="RAG">
        <ToggleSwitch checked={form.ragEnabled} onChange={(v) => onChange({ ...form, ragEnabled: v })} />
      </FormField>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={onCancel} style={{
          flex: 1, height: 44, borderRadius: 12,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>Отмена</button>
        <button onClick={onSave} disabled={!form.name.trim()} style={{
          flex: 1, height: 44, borderRadius: 12,
          background: form.name.trim() ? 'linear-gradient(135deg, #6b5ce7, #8b7cf7)' : 'rgba(107,92,231,0.3)',
          border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: form.name.trim() ? 'pointer' : 'default',
        }}>Сохранить</button>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>{label}</label>
      {children}
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 44, height: 26, borderRadius: 13,
      background: checked ? '#6b5ce7' : 'rgba(255,255,255,0.15)',
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11,
        background: '#fff', position: 'absolute', top: 2,
        left: checked ? 20 : 2, transition: 'left 0.2s',
      }} />
    </div>
  )
}

function ChatAgentRow({ agent, onSelect }: { agent: AIAgentV2; onSelect: () => void }) {
  return (
    <div onClick={onSelect} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 4px', borderRadius: 8, cursor: 'pointer',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 20,
        background: 'linear-gradient(135deg, #6b5ce7, #a855f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
      }}>{agent.emoji || '🤖'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
        <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.description || agent.model || agent.providerType}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, borderRadius: 10, padding: '0 12px',
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', fontSize: 15, outline: 'none',
}
