// ============================================
// CallScreen — Voice/Video Call UI
// ============================================

import { useRef, useEffect } from 'react'
import type { CallState } from '@/hooks/useWebRTC'

interface CallScreenProps {
  callState: CallState
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  isMuted: boolean
  isVideoEnabled: boolean
  targetUsername: string
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onAnswer?: () => void
  onReject?: () => void
  isIncoming?: boolean
}

export function CallScreen({
  callState, remoteStream, localStream,
  isMuted, isVideoEnabled, targetUsername,
  onEndCall, onToggleMute, onToggleVideo,
  onAnswer, onReject, isIncoming,
}: CallScreenProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  const formatState = () => {
    switch (callState) {
      case 'calling': return 'Вызов...'
      case 'ringing': return 'Входящий звонок'
      case 'connected': return 'Звонок'
      case 'ended': return 'Завершено'
      default: return ''
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#0a0a1a', zIndex: 2000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {remoteStream && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: '100%', objectFit: 'cover',
          }}
        />
      )}

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '24px 16px', paddingTop: 'calc(24px + var(--sat, 0px))',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
          {formatState()}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>
          {targetUsername}
        </div>
      </div>

      {localStream && isVideoEnabled && (
        <div style={{
          position: 'absolute', top: 80, right: 16,
          width: 120, height: 160, borderRadius: 12,
          overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)',
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '24px 16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
      }}>
        {isIncoming && callState === 'ringing' ? (
          <>
            <CallButton icon="✕" label="Отклонить" color="#E5533D" onClick={onReject || onEndCall} />
            <CallButton icon="📞" label="Принять" color="#4FAE4E" onClick={onAnswer || (() => {})} large />
          </>
        ) : (
          <>
            <CallButton
              icon={isMuted ? '🔇' : '🎤'}
              label={isMuted ? 'Вкл. микрофон' : 'Выкл. микрофон'}
              color={isMuted ? '#E5533D' : 'rgba(255,255,255,0.15)'}
              onClick={onToggleMute}
            />
            <CallButton
              icon={isVideoEnabled ? '📹' : '📷'}
              label={isVideoEnabled ? 'Выкл. видео' : 'Вкл. видео'}
              color={isVideoEnabled ? 'rgba(255,255,255,0.15)' : '#E5533D'}
              onClick={onToggleVideo}
            />
            <CallButton icon="📞" label="Завершить" color="#E5533D" onClick={onEndCall} large />
          </>
        )}
      </div>
    </div>
  )
}

function CallButton({ icon, label, color, onClick, large }: {
  icon: string; label: string; color: string; onClick: () => void; large?: boolean
}) {
  const size = large ? 64 : 48
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: color, border: 'none',
        cursor: 'pointer', fontSize: large ? 24 : 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon}
    </button>
  )
}
