'use client'

import { Panel } from '@/components/tui/Panel'
import { GamePlayer, QuarterSnapshot } from '@/lib/types/game'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useChartColors } from '@/lib/hooks/useChartColors'

const PLAYER_COLORS = [
  '#00FF00', '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FF6FB7', '#C490E4', '#FF9F45', '#45FFF4', '#B8B8B8',
]

interface ScoreChartProps {
  players: GamePlayer[]
  snapshots: QuarterSnapshot[]
}

export function ScoreChart({ players, snapshots }: ScoreChartProps) {
  const colors = useChartColors()

  if (snapshots.length === 0) {
    return (
      <Panel title="SCORE TRENDS">
        <div className="text-terminal-bright-black text-xs text-center py-4">
          No data yet — charts appear after the first quarter resolves.
        </div>
      </Panel>
    )
  }

  // Group snapshots by quarter
  const quarterMap = new Map<string, Record<string, number>>()
  for (const snap of snapshots) {
    const qId = snap.quarterId
    if (!quarterMap.has(qId)) {
      quarterMap.set(qId, {})
    }
    const metrics = snap.metrics as unknown as Record<string, number>
    quarterMap.get(qId)![snap.playerId] = metrics.score || 0
  }

  // Build chart data
  const chartData = Array.from(quarterMap.entries()).map(([, scores], idx) => ({
    quarter: `Q${idx + 1}`,
    ...scores,
  }))

  // Player color mapping
  const playerColorMap = new Map<string, string>()
  players.forEach((p, i) => {
    playerColorMap.set(p.userId, PLAYER_COLORS[i % PLAYER_COLORS.length])
  })

  return (
    <Panel title="SCORE TRENDS">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="quarter"
              tick={{ fill: colors.border, fontSize: 10 }}
              axisLine={{ stroke: colors.border }}
            />
            <YAxis
              tick={{ fill: colors.border, fontSize: 10 }}
              axisLine={{ stroke: colors.border }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                fontFamily: 'monospace',
                fontSize: 11,
              }}
              labelStyle={{ color: colors.cyan }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }}
            />
            {players.map(p => (
              <Line
                key={p.userId}
                type="monotone"
                dataKey={p.userId}
                name={`${p.playerEmoji} ${p.playerName}`}
                stroke={playerColorMap.get(p.userId) || '#808080'}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
