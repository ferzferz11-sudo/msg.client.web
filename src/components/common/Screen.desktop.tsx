// ============================================
// Screen — Desktop Layout
// ============================================
// Full-height flex container for desktop layout.
// ============================================

import type { ReactNode } from 'react'

interface ScreenProps {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
}

export function Screen({ children, header, footer }: ScreenProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: '#1a1a2e',
      }}
    >
      {header && (
        <div style={{ flexShrink: 0, zIndex: 10 }}>{header}</div>
      )}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {children}
      </div>
      {footer && (
        <div style={{ flexShrink: 0 }}>{footer}</div>
      )}
    </div>
  )
}
