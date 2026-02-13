'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { Game, GamePlayer, Quarter, MinisterAction } from '@/lib/types/game'

export function useGame(gameId: string) {
  const supabase = createBrowserSupabase()
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<GamePlayer[]>([])
  const [currentQuarter, setCurrentQuarter] = useState<Quarter | null>(null)
  const [actions] = useState<MinisterAction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGame = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (data) {
      setGame({
        id: data.id,
        name: data.name,
        status: data.status,
        currentQuarter: data.current_quarter,
        totalQuarters: data.total_quarters,
        quarterDurationSeconds: data.quarter_duration_seconds,
        visibilityMode: data.visibility_mode,
        maxPlayers: data.max_players,
        scoringPreset: data.scoring_preset,
        scoringWeights: data.scoring_weights,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      })
    }
  }, [gameId, supabase])

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('player_score', { ascending: false })

    if (data) {
      setPlayers(data.map(p => ({
        id: p.id,
        gameId: p.game_id,
        userId: p.user_id,
        playerName: p.player_name,
        playerEmoji: p.player_emoji,
        playerScore: p.player_score,
        playerResources: p.player_resources,
        joinedAt: p.joined_at,
        isActive: p.is_active,
      })))
    }
  }, [gameId, supabase])

  const fetchCurrentQuarter = useCallback(async () => {
    const { data } = await supabase
      .from('quarters')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'active')
      .single()

    if (data) {
      setCurrentQuarter({
        id: data.id,
        gameId: data.game_id,
        quarterNumber: data.quarter_number,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        status: data.status,
        initialState: data.initial_state,
        createdAt: data.created_at,
      })
    }
  }, [gameId, supabase])

  // Initial load
  useEffect(() => {
    async function load() {
      setLoading(true)
      await Promise.all([fetchGame(), fetchPlayers(), fetchCurrentQuarter()])
      setLoading(false)
    }
    load()
  }, [fetchGame, fetchPlayers, fetchCurrentQuarter])

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'minister_actions',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        // Refresh actions on change
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'quarters',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        fetchCurrentQuarter()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      }, () => {
        fetchGame()
        fetchPlayers()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        fetchPlayers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase, fetchGame, fetchPlayers, fetchCurrentQuarter])

  return {
    game,
    players,
    currentQuarter,
    actions,
    loading,
    refetch: () => Promise.all([fetchGame(), fetchPlayers(), fetchCurrentQuarter()]),
  }
}
