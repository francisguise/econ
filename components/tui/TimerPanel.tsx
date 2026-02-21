'use client'

import { useState, useEffect } from 'react'
import { Panel } from './Panel'
import { boxChars } from '@/lib/assets/box-chars'
import { ResolutionMode } from '@/lib/types/game'

interface TimerPanelProps {
  endsAt: string
  quarterNumber: number
  totalQuarters: number
  hasSubmitted: boolean
  onSubmit?: () => void
  resolutionMode?: ResolutionMode
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TimerPanel({ endsAt, quarterNumber, totalQuarters, hasSubmitted, onSubmit, resolutionMode = 'timer' }: TimerPanelProps) {
  const [remaining, setRemaining] = useState(0)
  const [totalDuration, setTotalDuration] = useState(1)

  useEffect(() => {
    function update() {
      const end = new Date(endsAt).getTime()
      const now = Date.now()
      const diff = Math.max(0, (end - now) / 1000)
      setRemaining(diff)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  useEffect(() => {
    // Estimate total duration from endsAt
    const end = new Date(endsAt).getTime()
    const now = Date.now()
    const diff = (end - now) / 1000
    if (diff > 0) setTotalDuration(Math.max(diff, 60))
  }, [endsAt])

  const progress = Math.max(0, Math.min(1, 1 - remaining / totalDuration))
  const barWidth = 20
  const filled = Math.round(progress * barWidth)
  const bar = boxChars.darkShade.repeat(filled) + boxChars.lightShade.repeat(barWidth - filled)
  const percentage = Math.round(progress * 100)

  const isUrgent = remaining < 60
  const isExpired = remaining <= 0

  const isAllSubmit = resolutionMode === 'all_submit'
  const panelTitle = isAllSubmit ? 'QUARTER STATUS' : 'QUARTER TIMER'

  return (
    <Panel title={panelTitle} borderStyle="double">
      <div className="font-mono text-center space-y-2">
        <div className="text-terminal-bright-black text-xs">
          Quarter {quarterNumber} / {totalQuarters}
        </div>

        {isAllSubmit && hasSubmitted ? (
          <div className="text-terminal-cyan text-2xl font-bold">
            WAITING FOR ALL PLAYERS
          </div>
        ) : (
          <div className={`text-3xl font-bold ${
            isExpired ? 'text-terminal-red' :
            isUrgent ? 'text-terminal-yellow animate-pulse' :
            'text-terminal-green'
          }`}>
            {isExpired ? 'RESOLVING...' : formatTime(remaining)}
          </div>
        )}

        {isAllSubmit ? (
          <div className="text-terminal-bright-black text-xs">
            {bar} DEADLINE {formatTime(remaining)}
          </div>
        ) : (
          <div className="text-terminal-green text-sm">
            {bar} {percentage}%
          </div>
        )}

        {hasSubmitted ? (
          <div className="text-terminal-green text-xs">✓ Policies Submitted</div>
        ) : (
          <button
            onClick={onSubmit}
            className="text-terminal-cyan text-xs hover:text-terminal-foreground"
          >
            [SPACE] Submit | [ESC] Cancel
          </button>
        )}
      </div>
    </Panel>
  )
}
