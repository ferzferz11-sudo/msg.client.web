import { useState, useCallback, useRef, useEffect } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'
import { useAuthStore } from '@/store/authStore'
import type { Chat, AIAgentV2, AIMessage, AIMarketplaceAgent, AIUsageStatsResponse } from '@/shared/types'

function getApiBase(): string {
  return import.meta.env.VITE_API_URL || '/messenger'
}

async function aiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const tokens = useAuthStore.getState().tokens
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  }
  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`
  }
  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export function useAIChats() {
  const [chats, setChats] = useState<Chat[]>([])
  const [agents, setAgents] = useState<AIAgentV2[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [marketplaceResults, setMarketplaceResults] = useState<AIMarketplaceAgent[]>([])
  const [marketplaceTotal, setMarketplaceTotal] = useState(0)
  const [usageStats, setUsageStats] = useState<AIUsageStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const addError = useErrorStore((s) => s.addError)
  const abortRef = useRef<AbortController | null>(null)

  const loadChats = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await aiFetch<any>('/ai/v2/chats')
      const list: Chat[] = (result.chats || result || []).map((c: any) => ({
        id: c.session_id || c.id || '',
        name: c.name || c.title || 'AI Chat',
        type: 'ai',
        creatorId: '',
        participants: '[]',
        lastMessageText: c.last_message || '',
        lastMessageTime: c.updated_at || c.created_at || new Date().toISOString(),
        unreadCount: 0,
        agentId: c.agent_id || '',
        activeAgentId: c.agent_id || '',
      }))
      setChats(list)
    } catch {
      try {
        const list = await grpcClient.getAIChats()
        setChats(list)
      } catch (err) {
        addError({ message: 'Не удалось загрузить AI чаты', type: 'network' })
      }
    } finally {
      setIsLoading(false)
    }
  }, [addError])

  const loadAgents = useCallback(async () => {
    try {
      const result = await aiFetch<any>('/ai/v2/agents')
      const list: AIAgentV2[] = (result.agents || result || []).map((a: any) => ({
        id: a.id || '',
        name: a.name || '',
        description: a.description || '',
        providerType: a.provider_type || 'openrouter',
        model: a.model || '',
        systemPrompt: a.system_prompt || '',
        toolsEnabled: a.tools_enabled ?? false,
        ragEnabled: a.rag_enabled ?? false,
        isPreset: a.is_preset ?? false,
        isPublic: a.is_public ?? false,
        maxTokens: a.max_tokens || 4096,
        temperature: a.temperature || 0.7,
        createdBy: a.created_by || '',
        installCount: a.install_count || 0,
        avgRating: a.avg_rating || 0,
        reviewCount: a.review_count || 0,
        tags: a.tags || [],
        shareCode: a.share_code || '',
        emoji: a.emoji || '🤖',
      }))
      setAgents(list)
    } catch {
      try {
        const result = await (grpcClient as any).chatClient.listAgents({})
        const presetResult = await (grpcClient as any).chatClient.listAgentPresets({})
        const allAgents = [...(result.agents || []), ...(presetResult.agents || [])]
        setAgents(allAgents.map((a: any) => ({
          id: a.id || '',
          name: a.name || '',
          description: a.description || '',
          providerType: a.provider_type || 'openrouter',
          model: a.model || '',
          systemPrompt: a.system_prompt || '',
          toolsEnabled: a.tools_enabled ?? false,
          ragEnabled: false,
          isPreset: a.is_preset ?? false,
          isPublic: false,
          maxTokens: a.max_tokens || 4096,
          temperature: 0.7,
          createdBy: '',
          installCount: 0,
          avgRating: 0,
          reviewCount: 0,
          tags: [],
          shareCode: '',
          emoji: a.emoji || '🤖',
        })))
      } catch {
        addError({ message: 'Не удалось загрузить агентов', type: 'network' })
      }
    }
  }, [addError])

  const createNewChat = useCallback(async (agentId?: string): Promise<string | null> => {
    try {
      const result = await aiFetch<any>('/ai/v2/chats', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId || selectedAgentId || '' }),
      })
      const chatId = result.session_id || result.id || result.chat_id || ''
      if (chatId) {
        setChats((prev) => [{
          id: chatId,
          name: result.name || 'Новый чат',
          type: 'ai',
          creatorId: '',
          participants: '[]',
          lastMessageText: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          activeAgentId: agentId || selectedAgentId || '',
        }, ...prev])
        setActiveChatId(chatId)
        setMessages([])
        return chatId
      }
    } catch {
      // fallback: just set active chat locally
    }
    return null
  }, [selectedAgentId])

  const sendMessage = useCallback(async (text: string, imageBase64?: string) => {
    if (!activeChatId || (!text.trim() && !imageBase64)) return
    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    const assistantMsgId = `ai-${Date.now()}`
    const assistantMsg: AIMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      agentId: selectedAgentId || undefined,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, assistantMsg])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const body: any = {
        session_id: activeChatId,
        message: text,
      }
      if (selectedAgentId) body.agent_id = selectedAgentId
      if (imageBase64) body.images = [imageBase64]

      const res = await fetch(`${getApiBase()}/ai/v2/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(useAuthStore.getState().tokens?.accessToken
            ? { Authorization: `Bearer ${useAuthStore.getState().tokens!.accessToken}` }
            : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let modelUsed = ''
        let tokenCount = 0
        let agentId = ''
        let agentName = ''

        if (reader) {
          let toolCallBuffer: any[] = []
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.token) {
                    accumulated += data.token
                    setMessages((prev) =>
                      prev.map((m) => m.id === assistantMsgId
                        ? { ...m, content: accumulated }
                        : m)
                    )
                  }
                  if (data.finished) {
                    if (data.model_used) modelUsed = data.model_used
                    if (data.token_count) tokenCount = data.token_count
                    if (data.agent_id) agentId = data.agent_id
                    if (data.agent_name) agentName = data.agent_name
                  }
                  if (data.tool_calls && data.tool_calls.length > 0) {
                    toolCallBuffer = data.tool_calls
                    setMessages((prev) =>
                      prev.map((m) => m.id === assistantMsgId
                        ? { ...m, toolCalls: data.tool_calls, content: accumulated || '(выполнение инструментов...)' }
                        : m)
                    )
                  }
                  if (data.error) {
                    accumulated += `\nОшибка: ${data.error}`
                    setMessages((prev) =>
                      prev.map((m) => m.id === assistantMsgId
                        ? { ...m, content: accumulated }
                        : m)
                    )
                  }
                } catch {
                  accumulated += line
                  setMessages((prev) =>
                    prev.map((m) => m.id === assistantMsgId
                      ? { ...m, content: accumulated }
                      : m)
                  )
                }
              } else if (line.trim() && !line.startsWith(':')) {
                try {
                  const data = JSON.parse(line)
                  if (data.token) {
                    accumulated += data.token
                    setMessages((prev) =>
                      prev.map((m) => m.id === assistantMsgId
                        ? { ...m, content: accumulated }
                        : m)
                    )
                  }
                  if (data.finished) {
                    if (data.model_used) modelUsed = data.model_used
                    if (data.token_count) tokenCount = data.token_count
                    if (data.agent_id) agentId = data.agent_id
                    if (data.agent_name) agentName = data.agent_name
                  }
                  if (data.tool_calls && data.tool_calls.length > 0) {
                    toolCallBuffer = data.tool_calls
                  }
                  if (data.error) {
                    accumulated += `\nОшибка: ${data.error}`
                  }
                } catch {
                  accumulated += line
                }
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantMsgId
                    ? { ...m, content: accumulated }
                    : m)
                )
              }
            }
          }
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsgId
              ? { ...m, modelUsed, tokenCount, agentId, agentName, toolCalls: toolCallBuffer.length > 0 ? toolCallBuffer : m.toolCalls }
              : m)
          )
        }
      } else {
        const data = await res.json()
        const content = data.response || data.text || data.content || data.message || ''
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsgId
            ? {
                ...m,
                content,
                modelUsed: data.model_used || data.model || '',
                tokenCount: data.token_count || data.tokens || 0,
                agentId: data.agent_id || data.agent_id || '',
                agentName: data.agent_name || '',
                hasRagContext: data.has_rag_context || false,
              }
            : m)
        )
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsgId
            ? { ...m, content: `Ошибка: ${err.message || 'Не удалось получить ответ'}` }
            : m)
        )
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [activeChatId, selectedAgentId])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const result = await aiFetch<any>(`/ai/v2/chats/${sessionId}/messages`)
      const list: AIMessage[] = (result.messages || result || []).map((m: any, i: number) => ({
        id: m.id || `msg-${i}`,
        role: m.role || 'assistant',
        content: m.content || m.text || '',
        agentId: m.agent_id || '',
        agentName: m.agent_name || '',
        modelUsed: m.model_used || '',
        tokenCount: m.token_count || 0,
        toolCalls: m.tool_calls || [],
        toolResults: m.tool_results || [],
        hasRagContext: m.has_rag_context || false,
        timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
      }))
      setMessages(list)
    } catch {
      try {
        const result = await grpcClient.getHistory(sessionId, 50)
        const list: AIMessage[] = result.messages.map((m) => ({
          id: m.id,
          role: m.user === 'assistant' || m.user === 'ai' ? 'assistant' : 'user',
          content: m.text,
          agentId: m.agentId || '',
          timestamp: new Date(m.createdAt).getTime(),
        }))
        setMessages(list)
      } catch {
        addError({ message: 'Не удалось загрузить сообщения', type: 'network' })
      }
    }
  }, [addError])

  const renameChat = useCallback(async (chatId: string, newName: string) => {
    try {
      await aiFetch(`/ai/v2/chats/${chatId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
      })
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, name: newName } : c))
      return true
    } catch {
      try {
        await grpcClient.renameAIChat(chatId, newName)
        setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, name: newName } : c))
        return true
      } catch {
        addError({ message: 'Не удалось переименовать чат', type: 'network' })
        return false
      }
    }
  }, [addError])

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await aiFetch(`/ai/v2/chats/${chatId}`, { method: 'DELETE' })
      setChats((prev) => prev.filter((c) => c.id !== chatId))
      if (activeChatId === chatId) {
        setActiveChatId(null)
        setMessages([])
      }
      return true
    } catch {
      addError({ message: 'Не удалось удалить чат', type: 'network' })
      return false
    }
  }, [activeChatId, addError])

  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId)
  }, [])

  const createAgent = useCallback(async (agent: Partial<AIAgentV2>): Promise<string | null> => {
    try {
      const result = await aiFetch<any>('/ai/v2/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: agent.name,
          description: agent.description || '',
          provider_type: agent.providerType || 'openrouter',
          model: agent.model || '',
          system_prompt: agent.systemPrompt || '',
          tools_enabled: agent.toolsEnabled ?? false,
          rag_enabled: agent.ragEnabled ?? false,
          max_tokens: agent.maxTokens || 4096,
          temperature: agent.temperature || 0.7,
          emoji: agent.emoji || '🤖',
        }),
      })
      const newId = result.agent_id || result.id || ''
      if (newId) await loadAgents()
      return newId
    } catch {
      try {
        const result = await (grpcClient as any).chatClient.createAgent({
          name: agent.name || '',
          description: agent.description || '',
          providerType: agent.providerType || 'openrouter',
          model: agent.model || '',
          systemPrompt: agent.systemPrompt || '',
          toolsEnabled: agent.toolsEnabled ?? false,
          emoji: agent.emoji || '🤖',
        })
        const newId = result.agent_id || result.id || ''
        if (newId) await loadAgents()
        return newId
      } catch {
        addError({ message: 'Не удалось создать агента', type: 'network' })
        return null
      }
    }
  }, [loadAgents, addError])

  const updateAgent = useCallback(async (agentId: string, updates: Partial<AIAgentV2>): Promise<boolean> => {
    try {
      await aiFetch(`/ai/v2/agents/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
          provider_type: updates.providerType,
          model: updates.model,
          system_prompt: updates.systemPrompt,
          tools_enabled: updates.toolsEnabled,
          rag_enabled: updates.ragEnabled,
          max_tokens: updates.maxTokens,
          temperature: updates.temperature,
          emoji: updates.emoji,
        }),
      })
      await loadAgents()
      return true
    } catch {
      try {
        await (grpcClient as any).chatClient.updateAgent({
          agentId,
          name: updates.name || '',
          description: updates.description || '',
          systemPrompt: updates.systemPrompt || '',
          toolsEnabled: updates.toolsEnabled ?? false,
        })
        await loadAgents()
        return true
      } catch {
        addError({ message: 'Не удалось обновить агента', type: 'network' })
        return false
      }
    }
  }, [loadAgents, addError])

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      await aiFetch(`/ai/v2/agents/${agentId}`, { method: 'DELETE' })
      setAgents((prev) => prev.filter((a) => a.id !== agentId))
      return true
    } catch {
      try {
        await (grpcClient as any).chatClient.deleteAgent({ agentId })
        setAgents((prev) => prev.filter((a) => a.id !== agentId))
        return true
      } catch {
        addError({ message: 'Не удалось удалить агента', type: 'network' })
        return false
      }
    }
  }, [addError])

  const cloneAgent = useCallback(async (agentId: string, newName?: string): Promise<string | null> => {
    try {
      const result = await aiFetch<any>('/ai/v2/agents/clone', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId, new_name: newName || '' }),
      })
      const newId = result.agent_id || result.id || ''
      if (newId) await loadAgents()
      return newId
    } catch {
      addError({ message: 'Не удалось клонировать агента', type: 'network' })
      return null
    }
  }, [loadAgents, addError])

  const searchMarketplace = useCallback(async (query: string, limit = 20, offset = 0) => {
    try {
      const result = await aiFetch<any>(`/ai/v2/marketplace?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`)
      const agents: AIMarketplaceAgent[] = (result.agents || result || []).map((a: any) => ({
        id: a.id || '',
        name: a.name || '',
        description: a.description || '',
        providerType: a.provider_type || '',
        model: a.model || '',
        isPublic: a.is_public ?? true,
        avgRating: a.avg_rating || 0,
        reviewCount: a.review_count || 0,
        installCount: a.install_count || 0,
        tags: a.tags || [],
        createdBy: a.created_by || '',
        emoji: a.emoji || '🤖',
      }))
      setMarketplaceResults(agents)
      setMarketplaceTotal(result.total || agents.length)
    } catch {
      addError({ message: 'Не удалось загрузить маркетплейс', type: 'network' })
    }
  }, [addError])

  const installAgent = useCallback(async (agentId: string): Promise<string | null> => {
    try {
      const result = await aiFetch<any>('/ai/v2/marketplace/install', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId }),
      })
      await loadAgents()
      return result.agent_id || result.id || null
    } catch {
      addError({ message: 'Не удалось установить агента', type: 'network' })
      return null
    }
  }, [loadAgents, addError])

  const rateAgent = useCallback(async (agentId: string, rating: number, review?: string): Promise<boolean> => {
    try {
      await aiFetch('/ai/v2/agents/rate', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId, rating, review: review || '' }),
      })
      return true
    } catch {
      addError({ message: 'Не удалось оценить агента', type: 'network' })
      return false
    }
  }, [addError])

  const loadUsageStats = useCallback(async () => {
    try {
      const result = await aiFetch<AIUsageStatsResponse>('/ai/v2/usage')
      setUsageStats(result)
    } catch {
      setUsageStats(null)
    }
  }, [])

  const loadChatMessages = useCallback((chatId: string) => {
    setActiveChatId(chatId)
    loadMessages(chatId)
  }, [loadMessages])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return {
    chats,
    agents,
    activeChatId,
    messages,
    isStreaming,
    selectedAgentId,
    isLoading,
    marketplaceResults,
    marketplaceTotal,
    usageStats,
    loadChats,
    loadAgents,
    createNewChat,
    sendMessage,
    stopStreaming,
    loadMessages,
    loadChatMessages,
    renameChat,
    deleteChat,
    selectAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    cloneAgent,
    searchMarketplace,
    installAgent,
    rateAgent,
    loadUsageStats,
  }
}
