'use client'

import { Panel } from '@/components/tui/Panel'
import { QuarterSnapshot } from '@/lib/types/game'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useChartColors } from '@/lib/hooks/useChartColors'

interface EconomicsChartProps {
  localUserId: string
  snapshots: QuarterSnapshot[]
}

export function EconomicsChart({ localUserId, snapshots }: EconomicsChartProps) {
  const colors = useChartColors()

  // Filter to local player's snapshots
  const playerSnapshots = snapshots.filter(s => s.playerId === localUserId)

  if (playerSnapshots.length === 0) {
    return (
      <Panel title="YOUR ECONOMY">
        <div className="text-terminal-bright-black text-xs text-center py-4">
          No data yet.
        </div>
      </Panel>
    )
  }

  const chartData = playerSnapshots.map((snap, idx) => {
    const m = snap.metrics as unknown as Record<string, number>
    return {
      quarter: `Q${idx + 1}`,
      'GDP ($T)': Number((m.gdp / 1e12).toFixed(3)),
      'Inflation (%)': Number(m.inflation?.toFixed(1) || 0),
      'Pop (M)': Number((m.population / 1e6).toFixed(1)),
      'Unemployment (%)': Number(m.unemployment?.toFixed(1) || 0),
    }
  })

  return (
    <Panel title="YOUR ECONOMY">
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
            <Line type="monotone" dataKey="GDP ($T)" stroke={colors.green} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Inflation (%)" stroke={colors.red} dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="Pop (M)" stroke={colors.blue} dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="Unemployment (%)" stroke={colors.yellow} dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
