// ============================================
// ChatList — Desktop Stub
// ============================================

import type { Chat } from '@/shared/types'

interface ChatListProps {
  chats: Chat[]
  isLoading: boolean
  onChatClick: (chatId: string) => void
}

export function ChatList(_props: ChatListProps) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Chat List</h2>
      <p>Desktop version coming soon.</p>
    </div>
  )
}
