'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'

interface PresenceState {
  onlinePlayers: string[]
  playerStatus: Record<string, 'online' | 'idle' | 'submitted'>
}

export function usePresence(gameId: string, userId: string): PresenceState {
  const supabase = createBrowserSupabase()
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([])
  const [playerStatus, setPlayerStatus] = useState<Record<string, 'online' | 'idle' | 'submitted'>>({})

  useEffect(() => {
    const channel = supabase.channel(`presence:${gameId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const players = Object.values(state).flat().map((p: Record<string, string>) => p.user_id)
        setOnlinePlayers(players)

        const statuses: Record<string, 'online' | 'idle' | 'submitted'> = {}
        Object.values(state).flat().forEach((p: Record<string, string>) => {
          statuses[p.user_id] = (p.status as 'online' | 'idle' | 'submitted') || 'online'
        })
        setPlayerStatus(statuses)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, status: 'online' })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, userId, supabase])

  return { onlinePlayers, playerStatus }
}
