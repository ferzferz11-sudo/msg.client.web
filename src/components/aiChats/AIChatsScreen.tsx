import React, { Suspense, lazy } from 'react'
import { isMobile } from '@/shared/utils'

export interface AIChatsScreenProps {
  onBack: () => void
}

function createLazyLoader(
  loader: () => Promise<{ [key: string]: React.ComponentType<any> }>
): React.LazyExoticComponent<React.ComponentType<any>> {
  return lazy(() => loader().then((mod) => ({ default: Object.values(mod)[0] })))
}

const MobileAIChatsScreen = createLazyLoader(() => import('./AIChatsScreen.mobile'))
const DesktopAIChatsScreen = createLazyLoader(() => import('./AIChatsScreen.desktop'))

export function AIChatsScreen(props: AIChatsScreenProps) {
  if (isMobile()) {
    return (
      <Suspense fallback={<div style={{ height: '100dvh', background: '#1a1a2e' }} />}>
        <MobileAIChatsScreen {...props} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopAIChatsScreen {...props} />
    </Suspense>
  )
}
