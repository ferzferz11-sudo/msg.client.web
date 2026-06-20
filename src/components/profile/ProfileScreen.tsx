export function ProfileScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ padding: 16, color: '#fff', background: '#1a1a2e', minHeight: '100vh' }}>
      <button onClick={onBack} style={{ color: '#6b5ce7', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}>
        ← Назад
      </button>
      <h2 style={{ marginTop: 20 }}>Профиль</h2>
      <p>Здесь будет профиль пользователя</p>
    </div>
  )
}
