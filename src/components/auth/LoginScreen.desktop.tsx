// ============================================
// LoginScreen — Desktop Stub
// ============================================

interface LoginScreenProps {
  onLoginSuccess: (username: string, userId: string) => void
}

export function LoginScreen(_props: LoginScreenProps) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Login</h2>
      <p>Please use mobile device for authentication.</p>
    </div>
  )
}
