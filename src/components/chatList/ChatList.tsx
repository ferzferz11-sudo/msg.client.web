import React, { Suspense, lazy } from 'react'
import type { Chat } from '@/shared/types'

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

export interface ChatListProps {
  chats: Chat[]
  isLoading: boolean
  onChatClick: (chatId: string) => void
  activeChatId?: string | null
  typingChats?: Record<string, boolean>
  onPin?: (chatId: string) => void
  onUnpin?: (chatId: string) => void
  onArchive?: (chatId: string) => void
  onMute?: (chatId: string) => void
  onDelete?: (chatId: string) => void
  onMarkRead?: (chatId: string) => void
}

function createLazyLoader(
  loader: () => Promise<{ [key: string]: React.ComponentType<any> }>
): React.LazyExoticComponent<React.ComponentType<any>> {
  return lazy(() => loader().then((mod) => ({ default: Object.values(mod)[0] })))
}

const MobileChatList = createLazyLoader(() => import('./ChatList.mobile'))
const DesktopChatList = createLazyLoader(() => import('./ChatList.desktop'))

export function ChatList(props: ChatListProps) {
  if (isMobile()) {
    return (
      <Suspense
        fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
            Загрузка...
          </div>
        }
      >
        <MobileChatList {...props} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopChatList {...props} />
    </Suspense>
  )
}
