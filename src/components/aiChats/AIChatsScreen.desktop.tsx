import { useState, useRef, useEffect } from 'react'
import { useAIChats } from '@/hooks/useAIChats'
import type { AIMessage, AIAgentV2 } from '@/shared/types'

type AgentTab = 'agents' | 'marketplace' | 'usage'

interface Props {
  onBack: () => void
}

export default function AIChatsScreenDesktop({ onBack }: Props) {
  const {
    chats, agents, activeChatId, messages, isStreaming, selectedAgentId, isLoading,
    marketplaceResults, usageStats,
    loadAgents,     createNewChat, sendMessage, stopStreaming,
    loadChatMessages, renameChat, deleteChat, selectAgent,
    createAgent, deleteAgent, cloneAgent,
    searchMarketplace, installAgent, loadUsageStats,
    multiSelectedIds, isMultiMode, multiAgentMessages, activeMultiTab,
    toggleMultiAgent, clearMultiSelection, sendMultiAgentMessage, stopMultiStreaming,
    setActiveMultiTab, setIsMultiMode,
  } = useAIChats()

  const [showAgentPanel, setShowAgentPanel] = useState(false)
  const [agentTab, setAgentTab] = useState<AgentTab>('agents')
  const [marketplaceQuery, setMarketplaceQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [inputText, setInputText] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: '', description: '', model: '', systemPrompt: '' })
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
  }

  const handleCreateAgent = async () => {
    if (!newAgent.name.trim()) return
    setIsCreatingAgent(true)
    try {
      const id = await createAgent({
        name: newAgent.name.trim(),
        description: newAgent.description.trim(),
        model: newAgent.model.trim(),
        systemPrompt: newAgent.systemPrompt.trim(),
      })
      if (id) {
        setShowCreateAgent(false)
        setNewAgent({ name: '', description: '', model: '', systemPrompt: '' })
        await loadAgents()
        selectAgent(id)
      }
    } finally {
      setIsCreatingAgent(false)
    }
  }

  const handleChatClick = (chatId: string) => {
    loadChatMessages(chatId)
  }

  const handleRename = async (chatId: string) => {
    if (newName.trim()) {
      await renameChat(chatId, newName.trim())
      setRenamingId(null)
      setNewName('')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1a1a2e', overflow: 'hidden' }}>
      <div style={{
        width: 300, borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div className="safe-top" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44, padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={onBack} style={{ color: '#6b5ce7', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Назад
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>AI чаты</span>
          <button onClick={() => { loadAgents(); setShowAgentPanel(!showAgentPanel); setAgentTab('agents') }} style={{
            color: '#6b5ce7', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer',
          }}>
            {showAgentPanel ? '✕' : '⚙️'}
          </button>
        </div>

        <div style={{ padding: '8px 12px' }}>
          <button onClick={handleNewChat} style={{
            width: '100%', padding: '10px 0', borderRadius: 10,
            background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}>+ Новый чат</button>
        </div>

        <div className="scrollable" style={{ flex: 1, padding: '0 8px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>Загрузка...</div>
          ) : chats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#888' }}>Нет AI чатов</div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleChatClick(chat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                  background: activeChatId === chat.id ? 'rgba(107,92,231,0.12)' : 'transparent',
                  marginBottom: 2,
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 17,
                  background: 'linear-gradient(135deg, #6b5ce7, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                }}>🤖</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renamingId === chat.id ? (
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={() => handleRename(chat.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(chat.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: 'rgba(255,255,255,0.08)', border: '1px solid #6b5ce7',
                        borderRadius: 4, color: '#fff', fontSize: 13, padding: '2px 6px', width: '100%',
                      }}
                    />
                  ) : (
                    <>
                      <div style={{
                        fontSize: 14, color: '#fff',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{chat.name}</div>
                      <div style={{
                        fontSize: 12, color: '#888',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{chat.lastMessageText || 'Нет сообщений'}</div>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); setRenamingId(chat.id); setNewName(chat.name) }} style={{
                    padding: '2px 4px', background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer',
                  }}>✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }} style={{
                    padding: '2px 4px', background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer',
                  }}>🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeChatId ? (
          <>
            <div style={{
              height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
                {chats.find((c) => c.id === activeChatId)?.name || 'AI Chat'}
              </span>
              <button onClick={() => { loadAgents(); setShowAgentPanel(!showAgentPanel); setAgentTab('agents') }} style={{
                padding: '4px 10px', background: 'rgba(107,92,231,0.2)', color: '#6b5ce7',
                border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              }}>
                {agents.find((a) => a.id === selectedAgentId)?.name || 'Агент'}
              </button>
            </div>

            {isMultiMode && Object.keys(multiAgentMessages).length > 0 && (
              <div style={{
                display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '0 16px', background: 'rgba(26,26,46,0.5)',
              }}>
                {Object.keys(multiAgentMessages).map((agentId) => {
                  const agent = agents.find((a) => a.id === agentId)
                  const isActive = activeMultiTab === agentId
                  const msgs = multiAgentMessages[agentId] || []
                  const lastMsg = msgs[msgs.length - 1]
                  const isDone = lastMsg && !lastMsg.isStreaming
                  return (
                    <button key={agentId} onClick={() => setActiveMultiTab(agentId)} style={{
                      padding: '10px 16px', background: 'none', border: 'none',
                      borderBottom: isActive ? '2px solid #6b5ce7' : '2px solid transparent',
                      color: isActive ? '#6b5ce7' : '#888',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {agent?.emoji || '🤖'} {agent?.name || agentId.slice(0, 8)}
                      {!isDone && <span style={{ fontSize: 10 }}>⏳</span>}
                      {isDone && <span style={{ fontSize: 10 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="scrollable" style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
              {isMultiMode && activeMultiTab && multiAgentMessages[activeMultiTab] ? (
                <>
                  {multiAgentMessages[activeMultiTab].map((msg) => (
                    <DesktopMessageBubble key={msg.id} message={msg} />
                  ))}
                </>
              ) : !isMultiMode ? (
                <>
                  {messages.length === 0 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', height: '100%', color: '#888',
                    }}>
                      <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
                      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#fff' }}>AI Assistant</div>
                      <div style={{ fontSize: 14 }}>Начните диалог с AI</div>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <DesktopMessageBubble key={msg.id} message={msg} />
                  ))}
                </>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', color: '#888',
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔀</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#fff' }}>Multi-Agent Mode</div>
                  <div style={{ fontSize: 13 }}>Выберите агентов и отправьте сообщение</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {imagePreview && (
              <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={imagePreview} alt="" style={{ height: 60, borderRadius: 8, objectFit: 'cover' }} />
                <button onClick={() => setImagePreview(null)} style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: 'rgba(255,255,255,0.1)', color: '#888',
                  border: 'none', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>
            )}

            <div className="safe-bottom" style={{
              padding: '12px 24px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()} style={{
                  width: 38, height: 38, borderRadius: 19,
                  background: 'rgba(255,255,255,0.08)', border: 'none',
                  color: '#6b5ce7', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>📎</button>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение..."
                  rows={1}
                  style={{
                    flex: 1, minHeight: 40, maxHeight: 160, padding: '10px 16px',
                    borderRadius: 20, background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
                    fontSize: 15, resize: 'none', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                {isStreaming ? (
                  <button onClick={isMultiMode ? stopMultiStreaming : stopStreaming} style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: '#e74c3c', border: 'none',
                    color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>■</button>
                ) : (
                  <button onClick={handleSend} style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: (inputText.trim() || imagePreview) ? 'linear-gradient(135deg, #6b5ce7, #8b7cf7)' : 'rgba(255,255,255,0.08)',
                    border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>↑</button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: '#888',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#fff' }}>AI Chat</div>
            <div style={{ fontSize: 14 }}>Выберите чат или создайте новый</div>
          </div>
        )}
      </div>

      {showAgentPanel && (
        <div style={{
          width: 320, borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            {(['agents', 'marketplace', 'usage'] as AgentTab[]).map((tab) => (
              <button key={tab} onClick={() => {
                setAgentTab(tab)
                if (tab === 'marketplace') searchMarketplace('')
                if (tab === 'usage') loadUsageStats()
              }} style={{
                flex: 1, padding: '12px 0',
                background: agentTab === tab ? 'rgba(107,92,231,0.1)' : 'transparent',
                border: 'none', borderBottom: agentTab === tab ? '2px solid #6b5ce7' : '2px solid transparent',
                color: agentTab === tab ? '#6b5ce7' : '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                {tab === 'agents' ? 'Агенты' : tab === 'marketplace' ? 'Маркетплейс' : 'Статистика'}
              </button>
            ))}
          </div>

          <div className="scrollable" style={{ flex: 1, padding: '12px' }}>
            {agentTab === 'agents' && (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button onClick={() => setShowCreateAgent(true)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    background: 'rgba(107,92,231,0.15)', border: 'none',
                    color: '#6b5ce7', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>+ Новый агент</button>
                  <button onClick={() => {
                    if (isMultiMode) {
                      clearMultiSelection()
                    } else {
                      setIsMultiMode(true)
                    }
                  }} style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: isMultiMode ? '#6b5ce7' : 'rgba(107,92,231,0.15)',
                    border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {isMultiMode ? `✓ ${multiSelectedIds.length}` : '🔀'}
                  </button>
                </div>
                {agents.filter((a) => a.isPreset).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Пресеты</div>
                    {agents.filter((a) => a.isPreset).map((agent) => (
                      <AgentRow key={agent.id} agent={agent} selected={selectedAgentId === agent.id} onSelect={() => { if (!isMultiMode) selectAgent(agent.id) }} onEdit={() => {}} onClone={() => cloneAgent(agent.id)} multiMode={isMultiMode} multiSelected={multiSelectedIds.includes(agent.id)} onToggleMulti={() => toggleMultiAgent(agent.id)} />
                    ))}
                  </div>
                )}
                {agents.filter((a) => !a.isPreset).length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Мои агенты</div>
                    {agents.filter((a) => !a.isPreset).map((agent) => (
                      <AgentRow key={agent.id} agent={agent} selected={selectedAgentId === agent.id} onSelect={() => { if (!isMultiMode) selectAgent(agent.id) }} onEdit={() => {}} onDelete={() => deleteAgent(agent.id)} onClone={() => cloneAgent(agent.id)} multiMode={isMultiMode} multiSelected={multiSelectedIds.includes(agent.id)} onToggleMulti={() => toggleMultiAgent(agent.id)} />
                    ))}
                  </div>
                )}
              </>
            )}

            {agentTab === 'marketplace' && (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input
                    value={marketplaceQuery}
                    onChange={(e) => setMarketplaceQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchMarketplace(marketplaceQuery)}
                    placeholder="Поиск..."
                    style={{
                      flex: 1, height: 36, borderRadius: 8, padding: '0 10px',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff', fontSize: 13, outline: 'none',
                    }}
                  />
                  <button onClick={() => searchMarketplace(marketplaceQuery)} style={{
                    padding: '0 12px', height: 36, borderRadius: 8,
                    background: '#6b5ce7', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>🔍</button>
                </div>
                {marketplaceResults.map((agent) => (
                  <div key={agent.id} style={{
                    padding: '10px', marginBottom: 6, borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{agent.emoji || '🤖'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>⭐ {agent.avgRating.toFixed(1)} · 📥 {agent.installCount}</div>
                      </div>
                      <button onClick={() => installAgent(agent.id)} style={{
                        padding: '4px 10px', borderRadius: 6,
                        background: '#6b5ce7', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>Уст.</button>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{agent.description}</div>
                  </div>
                ))}
                {marketplaceResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 13 }}>
                    {marketplaceQuery ? 'Ничего не найдено' : 'Поиск агентов'}
                  </div>
                )}
              </>
            )}

            {agentTab === 'usage' && usageStats && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    flex: 1, padding: '12px', borderRadius: 8,
                    background: 'rgba(107,92,231,0.1)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, color: '#888' }}>Запросов</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#6b5ce7' }}>{usageStats.totalRequests}</div>
                  </div>
                  <div style={{
                    flex: 1, padding: '12px', borderRadius: 8,
                    background: 'rgba(168,85,247,0.1)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, color: '#888' }}>Токенов</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7' }}>{usageStats.totalTokens.toLocaleString()}</div>
                  </div>
                </div>
                {usageStats.stats.map((stat) => (
                  <div key={stat.agentId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: 13, color: '#fff' }}>{stat.agentName}</span>
                    <span style={{ fontSize: 12, color: '#888' }}>{stat.requests} · {stat.tokens.toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {showNewChatModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowNewChatModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: 400, maxHeight: '80vh',
            background: '#1e1e36', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Новый AI чат</span>
              <button onClick={() => setShowNewChatModal(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 18, padding: 4,
              }}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => handleNewChatWithAgent()} style={{
                width: '100%', padding: '10px 0', borderRadius: 10,
                background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}>Без агента (по умолчанию)</button>
            </div>
            <div className="scrollable" style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', maxHeight: '60vh' }}>
              {agents.filter((a) => a.isPreset).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 4px' }}>Пресеты</div>
                  {agents.filter((a) => a.isPreset).map((agent) => (
                    <ChatAgentRow key={agent.id} agent={agent} onSelect={() => handleNewChatWithAgent(agent.id)} />
                  ))}
                </div>
              )}
              {agents.filter((a) => !a.isPreset).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 4px' }}>Мои агенты</div>
                  {agents.filter((a) => !a.isPreset).map((agent) => (
                    <ChatAgentRow key={agent.id} agent={agent} onSelect={() => handleNewChatWithAgent(agent.id)} />
                  ))}
                </div>
              )}
              {agents.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 13 }}>Нет агентов</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateAgent && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowCreateAgent(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: 400, maxHeight: '80vh',
            background: '#1e1e36', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Новый агент</span>
              <button onClick={() => setShowCreateAgent(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 18, padding: 4,
              }}>✕</button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
              <div>
                <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Имя *</label>
                <input
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  placeholder="Мой агент"
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Описание</label>
                <input
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  placeholder="Описание агента"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Модель</label>
                <input
                  value={newAgent.model}
                  onChange={(e) => setNewAgent({ ...newAgent, model: e.target.value })}
                  placeholder="openrouter/auto"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'block' }}>Системный промпт</label>
                <textarea
                  value={newAgent.systemPrompt}
                  onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                  placeholder="Ты полезный ассистент..."
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical',
                  }}
                />
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowCreateAgent(false)} style={{
                padding: '8px 16px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: '#888', fontSize: 14, cursor: 'pointer',
              }}>Отмена</button>
              <button onClick={handleCreateAgent} disabled={!newAgent.name.trim() || isCreatingAgent} style={{
                padding: '8px 16px', borderRadius: 8,
                background: newAgent.name.trim() ? '#6b5ce7' : 'rgba(107,92,231,0.3)',
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: newAgent.name.trim() ? 'pointer' : 'default',
              }}>{isCreatingAgent ? 'Создание...' : 'Создать'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DesktopMessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className="message-appear" style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      <div style={{ maxWidth: '65%' }}>
        {!isUser && message.agentName && (
          <div style={{ fontSize: 12, color: '#6b5ce7', marginBottom: 2, fontWeight: 600 }}>
            {message.agentName}
          </div>
        )}
        <div style={{
          padding: '12px 18px', borderRadius: 18,
          borderBottomRightRadius: isUser ? 6 : 18,
          borderBottomLeftRadius: isUser ? 18 : 6,
          background: isUser
            ? 'linear-gradient(135deg, #6b5ce7, #8b7cf7)'
            : 'rgba(255,255,255,0.08)',
          color: '#fff', fontSize: 15, lineHeight: 1.5,
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {message.content || (message.role === 'assistant' ? '...' : '')}
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {message.toolCalls.map((tc) => (
              <span key={tc.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 6,
                background: 'rgba(107,92,231,0.15)', color: '#6b5ce7', fontSize: 11,
              }}>
                🔧 {tc.name}
              </span>
            ))}
          </div>
        )}
        {message.modelUsed && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
            {message.modelUsed}{message.tokenCount ? ` · ${message.tokenCount} tok` : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentRow({ agent, selected, onSelect, onEdit, onDelete, onClone, multiMode, multiSelected, onToggleMulti }: {
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
    <div onClick={handleClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 6px', borderRadius: 6, cursor: 'pointer',
      background: multiSelected ? 'rgba(107,92,231,0.15)' : selected ? 'rgba(107,92,231,0.1)' : 'transparent',
      marginBottom: 2,
    }}>
      {multiMode && (
        <div style={{
          width: 18, height: 18, borderRadius: 4,
          border: `2px solid ${multiSelected ? '#6b5ce7' : 'rgba(255,255,255,0.3)'}`,
          background: multiSelected ? '#6b5ce7' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff', flexShrink: 0,
        }}>
          {multiSelected && '✓'}
        </div>
      )}
      <span style={{ fontSize: 16 }}>{agent.emoji || '🤖'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
        <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.model || agent.providerType}
        </div>
      </div>
      {!multiMode && selected && <span style={{ color: '#6b5ce7', fontSize: 12 }}>✓</span>}
      {!multiMode && (
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit() }} style={{ color: '#888', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
          <button onClick={(e) => { e.stopPropagation(); onClone() }} style={{ color: '#888', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>📋</button>
          {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ color: '#e74c3c', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>}
        </div>
      )}
    </div>
  )
}

function ChatAgentRow({ agent, onSelect }: { agent: AIAgentV2; onSelect: () => void }) {
  return (
    <div onClick={onSelect} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 18,
        background: 'linear-gradient(135deg, #6b5ce7, #a855f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
      }}>{agent.emoji || '🤖'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
        <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.description || agent.model || agent.providerType}
        </div>
      </div>
    </div>
  )
}
