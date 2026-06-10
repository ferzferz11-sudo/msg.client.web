// ============================================
// Screen — Desktop Stub
// ============================================

interface ScreenProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function Screen({ children }: ScreenProps) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>Lavender Messenger</h1>
      <p>Desktop version coming soon. Please use a mobile device.</p>
      {children}
    </div>
  )
}
