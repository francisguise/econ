'use client'

import { Panel } from '@/components/tui/Panel'
import { GamePlayer } from '@/lib/types/game'

interface SubmissionStatusProps {
  players: GamePlayer[]
  submittedPlayerIds: string[]
  onlinePlayerIds?: string[]
}

export function SubmissionStatus({ players, submittedPlayerIds, onlinePlayerIds = [] }: SubmissionStatusProps) {
  return (
    <Panel title="PLAYERS">
      <div className="space-y-1 text-xs">
        {players.map(player => {
          const submitted = submittedPlayerIds.includes(player.userId)
          const online = onlinePlayerIds.includes(player.userId)

          return (
            <div key={player.id} className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block ${
                    online ? 'bg-terminal-green' : 'bg-terminal-bright-black'
                  }`}
                />
                <span>{player.playerEmoji}</span>
                <span className="text-terminal-foreground">{player.playerName}</span>
              </div>
              <span className={submitted ? 'text-terminal-green' : 'text-terminal-yellow'}>
                {submitted ? '✓' : '⏳'}
              </span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
