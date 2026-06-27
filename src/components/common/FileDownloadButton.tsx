import { useState, useCallback } from 'react'

interface FileDownloadButtonProps {
  url: string
  filename: string
  children: React.ReactNode
  style?: React.CSSProperties
}

export function FileDownloadButton({ url, filename, children, style }: FileDownloadButtonProps) {
  const [progress, setProgress] = useState<number | null>(null)

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    if (progress !== null) return
    setProgress(0)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Download failed')
      const contentLength = Number(res.headers.get('content-length')) || 0
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No body')
      const chunks: ArrayBuffer[] = []
      let received = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value.buffer)
        received += value.length
        if (contentLength > 0) setProgress(Math.round((received / contentLength) * 100))
      }
      const blob = new Blob(chunks)
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      setProgress(null)
    } catch {
      window.open(url, '_blank')
      setProgress(null)
    }
  }, [url, filename, progress])

  return (
    <div style={{ position: 'relative', ...style }}>
      <a href={url} onClick={handleClick} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        {children}
      </a>
      {progress !== null && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'rgba(255,255,255,0.1)', borderRadius: 2,
        }}>
          <div style={{
            height: '100%', borderRadius: 2, background: '#6b5ce7',
            width: `${progress}%`, transition: 'width 0.2s',
          }} />
        </div>
      )}
    </div>
  )
}
