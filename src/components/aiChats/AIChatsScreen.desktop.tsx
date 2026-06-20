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
    deleteAgent, cloneAgent,
    searchMarketplace, installAgent, loadUsageStats,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text && !imagePreview) return
    setInputText('')
    const img = imagePreview
    setImagePreview(null)
    await sendMessage(text, img || undefined)
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
    await createNewChat()
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

            <div className="scrollable" style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
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
                  <button onClick={stopStreaming} style={{
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
                <button onClick={() => {}} style={{
                  width: '100%', padding: '8px 0', borderRadius: 8,
                  background: 'rgba(107,92,231,0.15)', border: 'none',
                  color: '#6b5ce7', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8,
                }}>+ Новый агент</button>
                {agents.filter((a) => a.isPreset).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Пресеты</div>
                    {agents.filter((a) => a.isPreset).map((agent) => (
                      <AgentRow key={agent.id} agent={agent} selected={selectedAgentId === agent.id} onSelect={() => { selectAgent(agent.id) }} onEdit={() => {}} onClone={() => cloneAgent(agent.id)} />
                    ))}
                  </div>
                )}
                {agents.filter((a) => !a.isPreset).length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Мои агенты</div>
                    {agents.filter((a) => !a.isPreset).map((agent) => (
                      <AgentRow key={agent.id} agent={agent} selected={selectedAgentId === agent.id} onSelect={() => { selectAgent(agent.id) }} onEdit={() => {}} onDelete={() => deleteAgent(agent.id)} onClone={() => cloneAgent(agent.id)} />
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

function AgentRow({ agent, selected, onSelect, onEdit, onDelete, onClone }: {
  agent: AIAgentV2
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete?: () => void
  onClone: () => void
}) {
  return (
    <div onClick={onSelect} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 6px', borderRadius: 6, cursor: 'pointer',
      background: selected ? 'rgba(107,92,231,0.1)' : 'transparent',
      marginBottom: 2,
    }}>
      <span style={{ fontSize: 16 }}>{agent.emoji || '🤖'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
        <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.model || agent.providerType}
        </div>
      </div>
      {selected && <span style={{ color: '#6b5ce7', fontSize: 12 }}>✓</span>}
      <div style={{ display: 'flex', gap: 2 }}>
        <button onClick={(e) => { e.stopPropagation(); onEdit() }} style={{ color: '#888', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
        <button onClick={(e) => { e.stopPropagation(); onClone() }} style={{ color: '#888', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>📋</button>
        {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ color: '#e74c3c', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>}
      </div>
    </div>
  )
}
