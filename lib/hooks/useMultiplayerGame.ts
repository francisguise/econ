'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useMultiplayerStore } from '@/lib/store/multiplayerStore'
import { Game, GamePlayer, Quarter } from '@/lib/types/game'

function mapGame(data: Record<string, unknown>): Game {
  return {
    id: data.id as string,
    name: data.name as string,
    status: data.status as Game['status'],
    currentQuarter: data.current_quarter as number,
    totalQuarters: data.total_quarters as number,
    quarterDurationSeconds: data.quarter_duration_seconds as number,
    visibilityMode: data.visibility_mode as Game['visibilityMode'],
    maxPlayers: data.max_players as number,
    scoringPreset: data.scoring_preset as Game['scoringPreset'],
    scoringWeights: data.scoring_weights as Game['scoringWeights'],
    createdBy: data.created_by as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

function mapPlayer(p: Record<string, unknown>): GamePlayer {
  return {
    id: p.id as string,
    gameId: p.game_id as string,
    userId: p.user_id as string,
    playerName: p.player_name as string,
    playerEmoji: p.player_emoji as string,
    playerScore: p.player_score as number,
    playerResources: p.player_resources as GamePlayer['playerResources'],
    joinedAt: p.joined_at as string,
    isActive: p.is_active as boolean,
  }
}

function mapQuarter(data: Record<string, unknown>): Quarter {
  return {
    id: data.id as string,
    gameId: data.game_id as string,
    quarterNumber: data.quarter_number as number,
    startsAt: data.starts_at as string,
    endsAt: data.ends_at as string,
    status: data.status as Quarter['status'],
    initialState: (data.initial_state || {}) as Record<string, unknown>,
    createdAt: data.created_at as string,
  }
}

export function useMultiplayerGame(gameId: string, userId: string) {
  const store = useMultiplayerStore()
  const supabaseRef = useRef(createBrowserSupabase())
  const supabase = supabaseRef.current

  // Set local user ID
  useEffect(() => {
    store.setLocalUserId(userId)
  }, [userId, store])

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`)
      if (!res.ok) return

      const data = await res.json()

      if (data.game) store.setGame(mapGame(data.game))
      if (data.players) store.setPlayers(data.players.map((p: Record<string, unknown>) => mapPlayer(p)))
      if (data.currentQuarter) store.setCurrentQuarter(mapQuarter(data.currentQuarter))
      else store.setCurrentQuarter(null)
      if (data.submissions) {
        store.setSubmittedPlayers(
          data.submissions.map((s: Record<string, unknown>) => s.player_id as string)
        )
      }
      if (data.snapshots) {
        store.setSnapshots(data.snapshots.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          quarterId: s.quarter_id as string,
          gameId: s.game_id as string,
          playerId: s.player_id as string,
          metrics: s.metrics as Record<string, unknown>,
          createdAt: s.created_at as string,
        })))
      }
    } catch (err) {
      console.error('Failed to load game data:', err)
    }
  }, [gameId, store])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`mp-game:${gameId}`)
      // Game updates
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      }, (payload) => {
        store.setGame(mapGame(payload.new as Record<string, unknown>))
        // Refetch players when game updates (quarter change = new scores)
        loadInitialData()
      })
      // Player joins/updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        // Refetch all players
        loadInitialData()
      })
      // Quarter updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quarters',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        loadInitialData()
      })
      // Submission updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_submissions',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        // Re-fetch submissions
        loadInitialData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase, store, loadInitialData])

  // Presence
  useEffect(() => {
    const channel = supabase.channel(`presence:${gameId}`)
    channel
      .on('presence', { event: 'sync' }, () => {
        // Presence state available via channel.presenceState()
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

  // Submit policies
  const submitPolicies = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-player-id': userId },
        body: JSON.stringify({ policies: store.policies }),
      })

      if (!res.ok) {
        const data = await res.json()
        store.addNotification('mage', `Submission failed: ${data.error}`, 'error')
        return false
      }

      store.setHasSubmitted(true)
      store.addNotification('mage', 'Policies submitted successfully!', 'success')
      return true
    } catch {
      store.addNotification('mage', 'Network error submitting policies', 'error')
      return false
    }
  }, [gameId, store])

  // Start game
  const startGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
        headers: { 'x-player-id': userId },
      })

      if (!res.ok) {
        const data = await res.json()
        store.addNotification('warrior', `Failed to start: ${data.error}`, 'error')
        return false
      }

      store.addNotification('warrior', 'Game started!', 'success')
      return true
    } catch {
      store.addNotification('warrior', 'Network error starting game', 'error')
      return false
    }
  }, [gameId, store])

  return {
    submitPolicies,
    startGame,
    refetch: loadInitialData,
  }
}
