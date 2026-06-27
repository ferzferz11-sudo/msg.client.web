// ============================================
// useWebRTC — WebRTC Call Management Hook
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import { CallMessage_Type } from '@/shared/api/gen/proto/messenger_pb'

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'

interface UseWebRTCOptions {
  onCallStateChange?: (state: CallState) => void
}

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

async function fetchICEServers(): Promise<RTCIceServer[]> {
  try {
    const tokens = useAuthStore.getState().tokens
    const response = await fetch('/turn-credentials', {
      headers: { Authorization: `Bearer ${tokens?.accessToken || ''}` },
    })
    if (!response.ok) return FALLBACK_ICE_SERVERS
    const data = await response.json()
    return data.iceServers || FALLBACK_ICE_SERVERS
  } catch {
    return FALLBACK_ICE_SERVERS
  }
}

export function useWebRTC({ onCallStateChange }: UseWebRTCOptions = {}) {
  const user = useAuthStore((s) => s.user)
  const [callState, setCallState] = useState<CallState>('idle')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const callIdRef = useRef<string>('')
  const callCleanupRef = useRef<(() => void) | null>(null)
  const stateRef = useRef<CallState>('idle')
  const targetUserRef = useRef<{ id: string; username: string } | null>(null)
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS)

  const updateState = useCallback((newState: CallState) => {
    stateRef.current = newState
    setCallState(newState)
    onCallStateChange?.(newState)
  }, [onCallStateChange])

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    setRemoteStream(null)
    setIsMuted(false)
    setIsVideoEnabled(true)
    callCleanupRef.current?.()
    callCleanupRef.current = null
  }, [])

  const ensureICEServers = useCallback(async () => {
    if (iceServersRef.current.length > 1) return
    const servers = await fetchICEServers()
    iceServersRef.current = servers
  }, [])

  const createPeerConnection = useCallback((targetId: string, targetUsername: string) => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    pcRef.current = pc

    pc.onicecandidate = (event) => {
      if (event.candidate && callIdRef.current) {
        const msg = {
          callId: callIdRef.current,
          senderId: user?.id || '',
          receiverId: targetId,
          senderName: user?.username || '',
          receiverName: targetUsername,
          roomId: '',
          type: CallMessage_Type.ICE_CANDIDATE,
          payload: JSON.stringify(event.candidate.toJSON()),
        }
        grpcClient.callSession((async function* () { yield msg })()).next().catch(() => {})
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0] || null)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        updateState('connected')
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        updateState('ended')
        cleanup()
      }
    }

    return pc
  }, [user, updateState, cleanup])

  const startCall = useCallback(async (targetId: string, targetUsername: string, withVideo = false) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Для звонков необходим HTTPS. Откройте сайт по HTTPS или через localhost.')
      updateState('ended')
      return
    }
    try {
      await ensureICEServers()
      targetUserRef.current = { id: targetId, username: targetUsername }
      callIdRef.current = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo,
      })
      localStreamRef.current = stream

      const pc = createPeerConnection(targetId, targetUsername)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      updateState('calling')

      const initiateMsg = {
        callId: callIdRef.current,
        senderId: user?.id || '',
        receiverId: targetId,
        senderName: user?.username || '',
        receiverName: targetUsername,
        roomId: '',
        type: CallMessage_Type.INITIATE,
        payload: '',
      }

      const cleanupStream = grpcClient.callSession((async function* () { yield initiateMsg })())
      callCleanupRef.current = () => { cleanupStream.return?.(undefined) }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const offerMsg = {
        callId: callIdRef.current,
        senderId: user?.id || '',
        receiverId: targetId,
        senderName: user?.username || '',
        receiverName: targetUsername,
        roomId: '',
        type: CallMessage_Type.OFFER,
        payload: JSON.stringify(offer),
      }
      grpcClient.callSession((async function* () { yield offerMsg })()).next().catch(() => {})
    } catch (err) {
      console.error('[WebRTC] Failed to start call:', err)
      cleanup()
      updateState('ended')
    }
  }, [user, createPeerConnection, updateState, cleanup, ensureICEServers])

  const answerCall = useCallback(async (callId: string, senderId: string, senderName: string) => {
    try {
      await ensureICEServers()
      callIdRef.current = callId
      targetUserRef.current = { id: senderId, username: senderName }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream

      const pc = createPeerConnection(senderId, senderName)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      updateState('connected')
    } catch (err) {
      console.error('[WebRTC] Failed to answer call:', err)
      cleanup()
      updateState('ended')
    }
  }, [createPeerConnection, updateState, cleanup, ensureICEServers])

  const endCall = useCallback(() => {
    if (callIdRef.current && targetUserRef.current) {
      const hangupMsg = {
        callId: callIdRef.current,
        senderId: user?.id || '',
        receiverId: targetUserRef.current.id,
        senderName: user?.username || '',
        receiverName: targetUserRef.current.username,
        roomId: '',
        type: CallMessage_Type.HANGUP,
        payload: '',
      }
      grpcClient.callSession((async function* () { yield hangupMsg })()).next().catch(() => {})
    }
    cleanup()
    updateState('ended')
  }, [user, cleanup, updateState])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach((t) => { t.enabled = isMuted })
    setIsMuted(!isMuted)
  }, [isMuted])

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getVideoTracks().forEach((t) => { t.enabled = !isVideoEnabled })
    setIsVideoEnabled(!isVideoEnabled)
  }, [isVideoEnabled])

  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  return {
    callState,
    remoteStream,
    localStream: localStreamRef.current,
    isMuted,
    isVideoEnabled,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    callId: callIdRef.current,
  }
}
