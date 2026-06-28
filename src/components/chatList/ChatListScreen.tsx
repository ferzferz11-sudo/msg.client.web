// ============================================
// ChatListScreen — Code Splitting Entry
// ============================================

import React, { Suspense, lazy } from 'react'
import { isMobile } from '@/shared/utils'

export interface ChatListScreenProps {
  onChatSelect: (chatId: string) => void
  onLogout?: () => void
  onSearch?: () => void
  onProfile?: () => void
  onContacts?: () => void
  onFavorites?: () => void
  onArchive?: () => void
  onAIChats?: () => void
  onSettings?: () => void
  onNotifications?: () => void
  onAdmin?: () => void
  rightPanel?: 'profile' | 'contacts' | 'favorites' | 'aiChats' | 'settings' | 'archive' | 'notifications' | 'search' | 'admin' | null
  onCloseRightPanel?: () => void
}

function createLazyLoader(
  loader: () => Promise<{ [key: string]: React.ComponentType<any> }>
): React.LazyExoticComponent<React.ComponentType<any>> {
  return lazy(() => loader().then((mod) => ({ default: Object.values(mod)[0] })))
}

const MobileChatListScreen = createLazyLoader(() => import('./ChatListScreen.mobile'))
const DesktopChatListScreen = createLazyLoader(() => import('./ChatListScreen.desktop'))

export function ChatListScreen(props: ChatListScreenProps) {
  if (isMobile()) {
    return (
      <Suspense fallback={<div style={{ height: '100dvh', background: '#1a1a2e' }} />}>
        <MobileChatListScreen {...props} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopChatListScreen {...props} />
    </Suspense>
  )
}
