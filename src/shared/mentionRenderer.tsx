import type { ReactNode } from 'react'

export function renderMentionText(text: string, mentions?: string[]): ReactNode {
  if (!mentions || mentions.length === 0 || !text) return text
  const parts: ReactNode[] = []
  const regex = /@(\w+)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    const username = match[1]
    const isMention = mentions.includes(username)
    parts.push(
      <span
        key={match.index}
        style={isMention ? { color: '#5EB5F7', fontWeight: 500 } : undefined}
      >
        @{username}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  return parts
}
