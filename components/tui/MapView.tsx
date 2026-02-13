'use client'

import { Panel } from './Panel'
import { boxChars } from '@/lib/assets/box-chars'
import { GamePlayer } from '@/lib/types/game'

interface MapViewProps {
  players: GamePlayer[]
  currentQuarter: number
}

const TERRAIN_SCENES: Record<number, { terrain: string; base: string }> = {
  1: { terrain: '🏔️🏔️', base: 'FORTRESS' },
  2: { terrain: '🌊🌊🌊', base: 'TOWER' },
  3: { terrain: '🌾🌾🌾', base: 'WORKSHOP' },
  4: { terrain: '🏛️', base: 'EMBASSY' },
}

export function MapView({ players, currentQuarter }: MapViewProps) {
  const sorted = [...players].sort((a, b) => b.playerScore - a.playerScore)
  const maxScore = sorted[0]?.playerScore || 1

  return (
    <Panel title={`GAME STATE - QUARTER ${currentQuarter}`} borderStyle="double">
      <div className="font-mono text-sm space-y-1">
        {/* Rankings with bars */}
        {sorted.map((player, i) => {
          const barLength = Math.max(1, Math.floor((player.playerScore / maxScore) * 20))
          const emptyLength = 20 - barLength

          return (
            <div key={player.id} className="flex items-center gap-2">
              <span className="text-terminal-cyan w-8">#{i + 1}</span>
              <span className="text-2xl w-8">{player.playerEmoji}</span>
              <span className="text-terminal-foreground w-24 truncate">
                {player.playerName}
              </span>
              <span className="text-terminal-green">
                {boxChars.block.repeat(barLength)}
              </span>
              <span className="text-terminal-brightBlack">
                {boxChars.shade.repeat(emptyLength)}
              </span>
              <span className="text-terminal-yellow ml-2">
                {player.playerScore.toLocaleString()}
              </span>
            </div>
          )
        })}

        {/* Decorative scene for leader */}
        {sorted[0] && (
          <div className="mt-3 pt-2 border-t border-terminal-border">
            <div className="text-terminal-bright-black text-xs">Current Leader:</div>
            <div className="text-terminal-foreground mt-1">
              <pre className="text-xs leading-relaxed">
{`      ${TERRAIN_SCENES[1]?.terrain || '🏔️🏔️'}
   ${sorted[0].playerEmoji} ${sorted[0].playerName}
   [${TERRAIN_SCENES[1]?.base || 'FORTRESS'}]
   Score: ${sorted[0].playerScore.toLocaleString()}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
