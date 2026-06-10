// ============================================
// ChatListScreen — Desktop Stub
// ============================================

interface ChatListScreenProps {
  onChatSelect: (chatId: string) => void
}

export function ChatListScreen(_props: ChatListScreenProps) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>Lavender Messenger</h1>
      <p>Desktop version coming soon. Please use a mobile device.</p>
    </div>
  )
}
