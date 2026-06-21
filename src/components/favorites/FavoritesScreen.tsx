import { ChatScreen } from '@/components/chat/ChatScreen'
import { useAuthStore } from '@/store/authStore'

interface FavoritesScreenProps {
  onBack: () => void
  onServerShutdown?: () => void
  onReconnecting?: (isReconnecting: boolean) => void
  onStreamError?: (error: string) => void
}

export function FavoritesScreen({ onBack, onServerShutdown, onReconnecting, onStreamError }: FavoritesScreenProps) {
  const user = useAuthStore((s) => s.user)
  const favRoomId = user ? `favorites_${user.username}` : ''

  if (!favRoomId) return null

  return (
    <ChatScreen
      chatId={favRoomId}
      onBack={onBack}
      onServerShutdown={onServerShutdown}
      onReconnecting={onReconnecting}
      onStreamError={onStreamError}
    />
  )
}
