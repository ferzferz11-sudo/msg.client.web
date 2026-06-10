// ============================================
// useIOSKeyboard — iOS Keyboard + Viewport Hook
// ============================================
// Tracks visual viewport changes on iOS Safari.
// When keyboard opens/closes, updates CSS custom
// properties on :root for use in components.
//
// CSS variables set:
//   --vv-height      — visualViewport.height (px)
//   --vv-width       — visualViewport.width (px)
//   --vv-offset-top  — visualViewport.offsetTop (px)
//   --keyboard-height — estimated keyboard height (px)
//   --viewport-available-height — usable height (px)
//
// Usage in CSS:
//   .my-element {
//     height: calc(var(--viewport-available-height) - 60px);
//   }
// ============================================

import { useEffect, useState, useCallback } from 'react'

interface IOSKeyboardState {
  keyboardHeight: number
  isKeyboardOpen: boolean
  viewportHeight: number
  viewportWidth: number
  availableHeight: number
}

export function useIOSKeyboard(): IOSKeyboardState {
  const [state, setState] = useState<IOSKeyboardState>({
    keyboardHeight: 0,
    isKeyboardOpen: false,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    availableHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  const updateViewport = useCallback(() => {
    const vv = window.visualViewport
    if (!vv) return

    const windowHeight = window.innerHeight
    const vvHeight = vv.height
    const vvWidth = vv.width
    const vvOffsetTop = vv.offsetTop

    // Keyboard height = window height - visual viewport height - offset top
    // The offsetTop accounts for the URL bar shrinking on scroll
    const keyboardHeight = Math.max(0, windowHeight - vvHeight - vvOffsetTop)

    // Threshold: > 80px difference means keyboard is open
    // (smaller threshold catches the keyboard earlier)
    const isKeyboardOpen = keyboardHeight > 80

    // Available height for content = visual viewport height
    // This is the actual visible area above the keyboard
    const availableHeight = vvHeight

    // Update CSS custom properties on :root
    const root = document.documentElement
    root.style.setProperty('--vv-height', `${vvHeight}px`)
    root.style.setProperty('--vv-width', `${vvWidth}px`)
    root.style.setProperty('--vv-offset-top', `${vvOffsetTop}px`)
    root.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
    root.style.setProperty('--viewport-available-height', `${availableHeight}px`)

    setState({
      keyboardHeight,
      isKeyboardOpen,
      viewportHeight: vvHeight,
      viewportWidth: vvWidth,
      availableHeight,
    })
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    // Listen to viewport changes (keyboard open/close, URL bar resize)
    vv.addEventListener('resize', updateViewport)
    vv.addEventListener('scroll', updateViewport)

    // Also listen to window resize (orientation change)
    window.addEventListener('resize', updateViewport)

    // Initial calculation
    updateViewport()

    return () => {
      vv.removeEventListener('resize', updateViewport)
      vv.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [updateViewport])

  return state
}
