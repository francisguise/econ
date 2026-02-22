'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeId, DEFAULT_THEME } from '@/lib/assets/terminal-theme'

const STORAGE_KEY = 'gt-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null
    if (stored) {
      setThemeState(stored)
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    localStorage.setItem(STORAGE_KEY, id)
    document.documentElement.setAttribute('data-theme', id)
  }, [])

  return { theme, setTheme }
}
