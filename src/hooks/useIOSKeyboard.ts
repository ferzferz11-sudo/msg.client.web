// ============================================
// useIOSKeyboard — iOS Keyboard Handling
// ============================================
// Tracks visual viewport height changes when
// iOS keyboard opens/closes. Updates CSS variable
// for proper input positioning.
// ============================================

import { useEffect, useState } from 'react'

export function useIOSKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    // Use Visual Viewport API (supported in iOS Safari 13+)
    const viewport = window.visualViewport
    if (!viewport) return

    const handleResize = () => {
      const windowHeight = window.innerHeight
      const viewportHeight = viewport.height
      const diff = windowHeight - viewportHeight

      // Threshold: > 100px difference means keyboard is open
      const keyboardOpen = diff > 100
      setIsKeyboardOpen(keyboardOpen)
      setKeyboardHeight(keyboardOpen ? diff : 0)

      // Update CSS variable for use in styles
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardOpen ? diff : 0}px`)
    }

    const handleScroll = () => {
      // Keep scroll position stable when keyboard opens
      if (isKeyboardOpen) {
        window.scrollTo(0, 0)
      }
    }

    viewport.addEventListener('resize', handleResize)
    viewport.addEventListener('scroll', handleScroll)

    // Initial calculation
    handleResize()

    return () => {
      viewport.removeEventListener('resize', handleResize)
      viewport.removeEventListener('scroll', handleScroll)
    }
  }, [isKeyboardOpen])

  return { keyboardHeight, isKeyboardOpen }
}
