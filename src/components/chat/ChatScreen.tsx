// ============================================
// ChatScreen — Code Splitting Entry
// ============================================

import React, { Suspense, lazy } from 'react'
import { isMobile } from '@/shared/utils'

export interface ChatScreenProps {
  chatId: string
  onBack: () => void
  isSecret?: boolean
  onPinnedClick?: () => void
  onServerShutdown?: () => void
  onReconnecting?: (isReconnecting: boolean) => void
  onStreamError?: (error: string) => void
}

function createLazyLoader(
  loader: () => Promise<{ [key: string]: React.ComponentType<any> }>
): React.LazyExoticComponent<React.ComponentType<any>> {
  return lazy(() => loader().then((mod) => ({ default: Object.values(mod)[0] })))
}

const MobileChatScreen = createLazyLoader(() => import('./ChatScreen.mobile'))
const DesktopChatScreen = createLazyLoader(() => import('./ChatScreen.desktop'))

export function ChatScreen(props: ChatScreenProps) {
  if (isMobile()) {
    return (
      <Suspense
        fallback={
          <div style={{ height: '100dvh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            Загрузка...
          </div>
        }
      >
        <MobileChatScreen {...props} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopChatScreen {...props} />
    </Suspense>
  )
}
