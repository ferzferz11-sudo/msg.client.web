// ============================================
// Screen — Base Screen Container (Mobile)
// ============================================

import React from 'react'

interface ScreenProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function Screen({ children, header, footer }: ScreenProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        background: '#1a1a2e',
        position: 'relative',
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
