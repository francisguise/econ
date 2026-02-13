'use client'

import { useEffect, useState, useCallback } from 'react'
import { Panel } from '@/components/tui/Panel'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { GameStatus } from '@/lib/types/game'

interface GameListItem {
  id: string
  name: string
  status: GameStatus
  current_quarter: number
  total_quarters: number
  scoring_preset: string
  max_players: number
  created_by: string
  created_at: string
  game_players: Array<{
    id: string
    user_id: string
    player_name: string
    player_emoji: string
  }>
}

interface GameListProps {
  userId: string | null
  onJoin: (gameId: string) => void
  onResume: (gameId: string) => void
}

export function GameList({ userId, onJoin, onResume }: GameListProps) {
  const [games, setGames] = useState<GameListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'waiting' | 'active' | 'completed'>('waiting')

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games')
      if (res.ok) {
        const data = await res.json()
        setGames(data)
      }
    } catch (err) {
      console.error('Failed to fetch games:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  // Real-time updates
  useEffect(() => {
    const supabase = createBrowserSupabase()
    const channel = supabase
      .channel('game-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
      }, () => {
        fetchGames()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
      }, () => {
        fetchGames()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchGames])

  const filtered = games.filter(g => g.status === activeTab)

  const tabs: Array<{ key: typeof activeTab; label: string }> = [
    { key: 'waiting', label: 'Waiting' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <Panel title="GAME BROWSER">
      <div className="space-y-2">
        {/* Tabs */}
        <div className="flex gap-1 text-xs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 ${
                activeTab === tab.key
                  ? 'bg-terminal-bright-black text-terminal-green'
                  : 'text-terminal-bright-black hover:text-terminal-foreground'
              }`}
            >
              {tab.label} ({games.filter(g => g.status === tab.key).length})
            </button>
          ))}
        </div>

        {/* Games */}
        {loading ? (
          <div className="text-terminal-bright-black text-xs py-4 text-center">Loading games...</div>
        ) : filtered.length === 0 ? (
          <div className="text-terminal-bright-black text-xs py-4 text-center">
            No {activeTab} games found.
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(game => {
              const isInGame = userId && game.game_players.some(p => p.user_id === userId)
              const isFull = game.game_players.length >= game.max_players

              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between px-2 py-1 border border-terminal-border hover:bg-terminal-bright-black/30 text-xs"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-terminal-foreground font-bold truncate">{game.name}</span>
                    <span className="text-terminal-bright-black">
                      {game.game_players.map(p => p.player_emoji).join(' ')}
                    </span>
                    <span className="text-terminal-bright-black">
                      {game.game_players.length}/{game.max_players}
                    </span>
                    <span className="text-terminal-cyan">
                      {game.scoring_preset.replace(/_/g, ' ')}
                    </span>
                    {game.status === 'active' && (
                      <span className="text-terminal-yellow">
                        Q{game.current_quarter}/{game.total_quarters}
                      </span>
                    )}
                  </div>

                  <div>
                    {game.status === 'waiting' && isInGame && (
                      <button
                        onClick={() => onResume(game.id)}
                        className="px-2 py-0.5 text-terminal-green border border-terminal-green hover:bg-terminal-green hover:text-terminal-background"
                      >
                        Waiting...
                      </button>
                    )}
                    {game.status === 'waiting' && !isInGame && !isFull && (
                      <button
                        onClick={() => onJoin(game.id)}
                        className="px-2 py-0.5 text-terminal-cyan border border-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-background"
                      >
                        Join
                      </button>
                    )}
                    {game.status === 'waiting' && !isInGame && isFull && (
                      <span className="text-terminal-bright-black">Full</span>
                    )}
                    {game.status === 'active' && isInGame && (
                      <button
                        onClick={() => onResume(game.id)}
                        className="px-2 py-0.5 text-terminal-green border border-terminal-green hover:bg-terminal-green hover:text-terminal-background"
                      >
                        Resume
                      </button>
                    )}
                    {game.status === 'active' && !isInGame && (
                      <span className="text-terminal-bright-black">In progress</span>
                    )}
                    {game.status === 'completed' && isInGame && (
                      <button
                        onClick={() => onResume(game.id)}
                        className="px-2 py-0.5 text-terminal-bright-black border border-terminal-border hover:text-terminal-foreground"
                      >
                        View
                      </button>
                    )}
                    {game.status === 'completed' && !isInGame && (
                      <span className="text-terminal-bright-black">Ended</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Panel>
  )
}
