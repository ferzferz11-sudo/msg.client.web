// ============================================
// Screen — Base Screen Container (Mobile)
// ============================================
// Uses --viewport-available-height CSS variable
// set by useIOSKeyboard hook for proper iOS
// keyboard handling.
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
        /* Use CSS variable set by useIOSKeyboard hook.
           Falls back to 100dvh for browsers without VisualViewport API. */
        height: 'var(--viewport-available-height, 100dvh)',
        width: '100%',
        overflow: 'hidden',
        background: '#1a1a2e',
        position: 'fixed',
        top: 0,
        left: 0,
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
          minHeight: 0, /* Important for nested flex scrolling */
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
