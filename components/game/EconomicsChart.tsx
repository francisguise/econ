'use client'

import { Panel } from '@/components/tui/Panel'
import { QuarterSnapshot } from '@/lib/types/game'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface EconomicsChartProps {
  localUserId: string
  snapshots: QuarterSnapshot[]
}

export function EconomicsChart({ localUserId, snapshots }: EconomicsChartProps) {
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
              tick={{ fill: '#808080', fontSize: 10 }}
              axisLine={{ stroke: '#808080' }}
            />
            <YAxis
              tick={{ fill: '#808080', fontSize: 10 }}
              axisLine={{ stroke: '#808080' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0C0C0C',
                border: '1px solid #808080',
                fontFamily: 'monospace',
                fontSize: 11,
              }}
              labelStyle={{ color: '#00FFFF' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }}
            />
            <Line type="monotone" dataKey="GDP ($T)" stroke="#00FF00" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Inflation (%)" stroke="#FF6B6B" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="Pop (M)" stroke="#4D96FF" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="Unemployment (%)" stroke="#FFD93D" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
