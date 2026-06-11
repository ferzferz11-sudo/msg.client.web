// ============================================
// AuthScreen — Code Splitting Entry
// ============================================

import React, { Suspense, lazy } from 'react'

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

interface AuthScreenProps {
  onAuthSuccess: () => void
}

function createLazyLoader(
  loader: () => Promise<{ [key: string]: React.ComponentType<any> }>
): React.LazyExoticComponent<React.ComponentType<any>> {
  return lazy(() => loader().then((mod) => ({ default: Object.values(mod)[0] })))
}

const MobileAuthScreen = createLazyLoader(() => import('./AuthScreen.mobile'))
const DesktopAuthScreen = createLazyLoader(() => import('./AuthScreen.desktop'))

export function AuthScreen(props: AuthScreenProps) {
  if (isMobile()) {
    return (
      <Suspense fallback={<div style={{ height: '100dvh', background: '#1a1a2e' }} />}>
        <MobileAuthScreen {...props} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopAuthScreen {...props} />
    </Suspense>
  )
}
