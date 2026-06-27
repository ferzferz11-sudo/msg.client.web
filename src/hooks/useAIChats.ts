import { useState, useCallback, useRef, useEffect } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'
import { useAuthStore } from '@/store/authStore'
import type { Chat, AIAgentV2, AIMessage, AIMarketplaceAgent, AIUsageStatsResponse } from '@/shared/types'

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
      const list = await grpcClient.listAIV2Chats()
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
      const list = await grpcClient.listAIAgents(true)
      setAgents(list)
    } catch (err) {
      addError({ message: 'Не удалось загрузить агентов', type: 'network' })
    }
  }, [addError])

  const createNewChat = useCallback(async (agentId?: string): Promise<string | null> => {
    try {
      const body: any = { sessionId: '', message: 'Начать новый чат' }
      const targetAgent = agentId || selectedAgentId
      if (targetAgent) body.agentId = targetAgent

      let chatId = ''
      for await (const chunk of grpcClient.chatWithAIV2(body)) {
        if (chunk.id) chatId = chunk.id
        if (chunk.isStreaming === false) break
      }

      if (chatId) {
        await loadChats()
        setActiveChatId(chatId)
        setMessages([])
        return chatId
      }
    } catch (err) {
      console.error('Failed to create AI chat:', err)
      addError({ message: 'Не удалось создать AI чат', type: 'network' })
    }
    return null
  }, [selectedAgentId, loadChats, addError])

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

    try {
      const body: any = {
        sessionId: activeChatId,
        message: text,
      }
      if (selectedAgentId) body.agentId = selectedAgentId
      if (imageBase64) body.images = [imageBase64]

      for await (const chunk of grpcClient.chatWithAIV2(body)) {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsgId
            ? {
                ...m,
                content: chunk.content || m.content,
                agentId: chunk.agentId || m.agentId,
                agentName: chunk.agentName || m.agentName,
                modelUsed: chunk.modelUsed || m.modelUsed,
                tokenCount: chunk.tokenCount || m.tokenCount,
                hasRagContext: chunk.hasRagContext || m.hasRagContext,
                imageUrl: chunk.imageUrl || m.imageUrl,
                isStreaming: chunk.isStreaming,
              }
            : m)
        )
        if (chunk.toolCalls && chunk.toolCalls.length > 0) {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsgId
              ? { ...m, toolCalls: chunk.toolCalls, content: m.content || '(выполнение инструментов...)' }
              : m)
          )
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsgId
          ? { ...m, content: `Ошибка: ${err.message || 'Не удалось получить ответ'}` }
          : m)
      )
    } finally {
      setIsStreaming(false)
    }
  }, [activeChatId, selectedAgentId])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const list = await grpcClient.getAIV2ChatHistory(sessionId)
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
      await grpcClient.renameAIChat(chatId, newName)
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, name: newName } : c))
      return true
    } catch {
      addError({ message: 'Не удалось переименовать чат', type: 'network' })
      return false
    }
  }, [addError])

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const user = useAuthStore.getState().user
      await grpcClient.deleteChat(chatId, user?.username || '', user?.id || '')
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
      const newId = await grpcClient.createAIAgent({
        name: agent.name || '',
        description: agent.description || '',
        providerType: agent.providerType || 'openrouter',
        model: agent.model || '',
        systemPrompt: agent.systemPrompt || '',
        toolsEnabled: agent.toolsEnabled ?? false,
        ragEnabled: agent.ragEnabled ?? false,
        maxTokens: agent.maxTokens || 4096,
        temperature: agent.temperature || 0.7,
        tags: agent.tags || [],
      })
      if (newId) await loadAgents()
      return newId
    } catch {
      addError({ message: 'Не удалось создать агента', type: 'network' })
      return null
    }
  }, [loadAgents, addError])

  const updateAgent = useCallback(async (agentId: string, updates: Partial<AIAgentV2>): Promise<boolean> => {
    try {
      await grpcClient.updateAIAgent(agentId, {
        name: updates.name,
        description: updates.description,
        providerType: updates.providerType,
        model: updates.model,
        systemPrompt: updates.systemPrompt,
        toolsEnabled: updates.toolsEnabled,
        ragEnabled: updates.ragEnabled,
        maxTokens: updates.maxTokens,
        temperature: updates.temperature,
      })
      await loadAgents()
      return true
    } catch {
      addError({ message: 'Не удалось обновить агента', type: 'network' })
      return false
    }
  }, [loadAgents, addError])

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      await grpcClient.deleteAIAgent(agentId)
      setAgents((prev) => prev.filter((a) => a.id !== agentId))
      return true
    } catch {
      addError({ message: 'Не удалось удалить агента', type: 'network' })
      return false
    }
  }, [addError])

  const cloneAgent = useCallback(async (agentId: string, newName?: string): Promise<string | null> => {
    try {
      const newId = await grpcClient.cloneAIAgent(agentId, newName || '')
      if (newId) await loadAgents()
      return newId
    } catch {
      addError({ message: 'Не удалось клонировать агента', type: 'network' })
      return null
    }
  }, [loadAgents, addError])

  const searchMarketplace = useCallback(async (query: string, limit = 20, offset = 0) => {
    try {
      const result = await grpcClient.listMarketplaceAgents(query, limit, offset)
      const agents: AIMarketplaceAgent[] = (result.agents || []).map((a: any) => ({
        id: a.id || '',
        name: a.name || '',
        description: a.description || '',
        providerType: a.providerType || '',
        model: a.model || '',
        isPublic: a.isPublic ?? true,
        avgRating: a.avgRating || 0,
        reviewCount: a.reviewCount || 0,
        installCount: a.installCount || 0,
        tags: a.tags || [],
        createdBy: a.createdBy || '',
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
      const newId = await grpcClient.installAIAgent(agentId)
      await loadAgents()
      return newId
    } catch {
      addError({ message: 'Не удалось установить агента', type: 'network' })
      return null
    }
  }, [loadAgents, addError])

  const rateAgent = useCallback(async (agentId: string, rating: number, review?: string): Promise<boolean> => {
    try {
      await grpcClient.rateAIAgent(agentId, rating, review || '')
      return true
    } catch {
      addError({ message: 'Не удалось оценить агента', type: 'network' })
      return false
    }
  }, [addError])

  const loadUsageStats = useCallback(async () => {
    try {
      const result = await grpcClient.getAIUsageStats()
      setUsageStats({
        totalTokens: result.totalTokens,
        totalRequests: result.totalRequests,
        stats: result.stats.map((s) => ({
          agentId: s.agentId,
          agentName: s.agentName,
          tokens: s.tokenCount,
          requests: s.requestCount,
        })),
      })
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
