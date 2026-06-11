// ============================================
// LoginScreen — Code Splitting Entry
// ============================================

import React, { Suspense, lazy } from 'react'

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

interface LoginScreenProps {
  onLoginSuccess: (username: string, userId: string) => void
}

function createLazyLoader(
  loader: () => Promise<{ [key: string]: React.ComponentType<any> }>
): React.LazyExoticComponent<React.ComponentType<any>> {
  return lazy(() => loader().then((mod) => ({ default: Object.values(mod)[0] })))
}

const MobileLoginScreen = createLazyLoader(() => import('./LoginScreen.mobile'))
const DesktopLoginScreen = createLazyLoader(() => import('./LoginScreen.desktop'))

export function LoginScreen(props: LoginScreenProps) {
  if (isMobile()) {
    return (
      <Suspense fallback={<div style={{ height: '100dvh', background: '#1a1a2e' }} />}>
        <MobileLoginScreen {...props} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopLoginScreen {...props} />
    </Suspense>
  )
}
