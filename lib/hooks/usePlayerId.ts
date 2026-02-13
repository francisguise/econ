'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'gt-player-id'

function generateUUID(): string {
  return crypto.randomUUID()
}

export function usePlayerId(): { playerId: string | null; isLoaded: boolean } {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = generateUUID()
      localStorage.setItem(STORAGE_KEY, id)
    }
    setPlayerId(id)
    setIsLoaded(true)
  }, [])

  return { playerId, isLoaded }
}
