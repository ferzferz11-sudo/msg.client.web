// ============================================
// LazyAvatar — Lazy Loading Avatar Component
// ============================================

import { useState, useRef, useEffect } from 'react'

interface LazyAvatarProps {
  src?: string
  alt?: string
  size?: number
  borderRadius?: number
  fallback?: string
  backgroundColor?: string
  style?: React.CSSProperties
}

export function LazyAvatar({
  src,
  alt = '',
  size = 42,
  borderRadius,
  fallback,
  backgroundColor = '#6b5ce7',
  style,
}: LazyAvatarProps) {
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)
  const [error, setError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const showImage = src && inView && !error
  const br = borderRadius ?? size / 2

  return (
    <div
      ref={ref}
      style={{
        width: size,
        height: size,
        borderRadius: br,
        background: showImage && loaded ? 'transparent' : backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        color: '#fff',
        fontWeight: 600,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {showImage && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        />
      )}
      {(!showImage || !loaded) && (
        <span>{fallback || '?'}</span>
      )}
    </div>
  )
}
