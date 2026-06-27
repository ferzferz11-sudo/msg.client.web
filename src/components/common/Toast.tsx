import { useEffect, useState, useRef } from 'react'
import { useErrorStore } from '@/store/errorStore'

export function ToastContainer() {
  const errors = useErrorStore((s) => s.errors)
  const dismissError = useErrorStore((s) => s.dismissError)
  const visible = errors.filter((e) => !e.dismissed)

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 2000, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 'calc(12px + var(--sat, 0px))',
    }}>
      {visible.slice(0, 3).map((err) => (
        <ToastItem key={err.id} error={err} onDismiss={() => dismissError(err.id)} />
      ))}
    </div>
  )
}

const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  network: { bg: 'rgba(231,76,60,0.95)', border: '#e74c3c', icon: '📡' },
  auth: { bg: 'rgba(231,76,60,0.95)', border: '#e74c3c', icon: '🔒' },
  rate_limit: { bg: 'rgba(255,180,50,0.95)', border: '#ffb432', icon: '⏳' },
  server: { bg: 'rgba(231,76,60,0.95)', border: '#e74c3c', icon: '⚠️' },
  unknown: { bg: 'rgba(120,120,120,0.95)', border: '#787878', icon: '❓' },
}

function ToastItem({ error, onDismiss }: { error: { id: string; message: string; type: string; timestamp: number }; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false)
  const outerRef = useRef<ReturnType<typeof setTimeout>>()
  const innerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    outerRef.current = setTimeout(() => {
      setExiting(true)
      innerRef.current = setTimeout(onDismiss, 300)
    }, 5000)
    return () => {
      clearTimeout(outerRef.current)
      clearTimeout(innerRef.current)
    }
  }, [onDismiss])

  const style = TYPE_COLORS[error.type] || TYPE_COLORS.unknown

  return (
    <div
      onClick={() => {
        clearTimeout(outerRef.current)
        clearTimeout(innerRef.current)
        setExiting(true)
        innerRef.current = setTimeout(onDismiss, 300)
      }}
      style={{
        pointerEvents: 'auto',
        maxWidth: 420, width: 'calc(100% - 32px)',
        marginBottom: 8, padding: '12px 16px',
        borderRadius: 12,
        background: style.bg,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${style.border}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'opacity 0.3s, transform 0.3s',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{style.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
          {error.message}
        </div>
      </div>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>✕</span>
    </div>
  )
}
