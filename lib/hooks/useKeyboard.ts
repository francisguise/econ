'use client'

import { useEffect, useCallback } from 'react'

type KeyHandler = (event: KeyboardEvent) => void

interface KeyMap {
  [key: string]: KeyHandler
}

export function useKeyboard(keyMap: KeyMap) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle keyboard shortcuts when user is typing in an input
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return
    }

    const key = event.key.toLowerCase()
    const handler = keyMap[key] || keyMap[event.code]

    if (handler) {
      event.preventDefault()
      handler(event)
    }
  }, [keyMap])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
