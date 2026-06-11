// ============================================
// AuthScreen — Desktop Stub
// ============================================

interface AuthScreenProps {
  onAuthSuccess: () => void
}

export function AuthScreen(_props: AuthScreenProps) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Authentication</h2>
      <p>Please use mobile device to sign in.</p>
    </div>
  )
}
