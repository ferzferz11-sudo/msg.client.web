// ============================================
// Screen — Code Splitting Entry
// ============================================

import React, { Suspense, lazy } from 'react'

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

interface ScreenProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

function createLazyLoader(
  loader: () => Promise<{ [key: string]: React.ComponentType<any> }>
): React.LazyExoticComponent<React.ComponentType<any>> {
  return lazy(() => loader().then((mod) => ({ default: Object.values(mod)[0] })))
}

const MobileScreen = createLazyLoader(() => import('./Screen.mobile'))
const DesktopScreen = createLazyLoader(() => import('./Screen.desktop'))

export function Screen(props: ScreenProps) {
  if (isMobile()) {
    return (
      <Suspense fallback={<div style={{ height: '100dvh', background: '#1a1a2e' }} />}>
        <MobileScreen {...props} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopScreen {...props} />
    </Suspense>
  )
}
