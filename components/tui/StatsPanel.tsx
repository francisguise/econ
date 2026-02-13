'use client'

import { Panel } from './Panel'
import { boxChars } from '@/lib/assets/box-chars'
import { PlayerResources } from '@/lib/types/game'

interface StatsPanelProps {
  resources: PlayerResources
  previousResources?: PlayerResources
  score: number
  rank: number
  totalPlayers: number
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(1)
}

function getChangeIndicator(current: number, previous: number | undefined): string {
  if (previous === undefined) return ''
  const diff = current - previous
  if (diff > 0.01) return ` ${boxChars.triangleUp}`
  if (diff < -0.01) return ` ${boxChars.triangleDown}`
  return ' →'
}

function renderBar(value: number, max: number, width: number = 18): string {
  const filled = Math.round((value / max) * width)
  return boxChars.block.repeat(Math.min(filled, width)) + boxChars.shade.repeat(Math.max(0, width - filled))
}

export function StatsPanel({ resources, previousResources, score, rank, totalPlayers }: StatsPanelProps) {
  const stats = [
    { label: 'GDP', value: formatNumber(resources.gdp), raw: resources.gdp, prev: previousResources?.gdp },
    { label: 'GDP/Capita', value: `$${resources.gdpPerCapita.toLocaleString()}`, raw: resources.gdpPerCapita, prev: previousResources?.gdpPerCapita },
    { label: 'Population', value: formatNumber(resources.population), raw: resources.population, prev: previousResources?.population },
    { label: 'Inflation', value: `${resources.inflation.toFixed(1)}%`, raw: resources.inflation, prev: previousResources?.inflation, warning: resources.inflation > 3.5 },
    { label: 'Interest Rate', value: `${resources.interestRate.toFixed(1)}%`, raw: resources.interestRate, prev: previousResources?.interestRate },
    { label: 'Debt/GDP', value: `${resources.debtToGdp.toFixed(0)}%`, raw: resources.debtToGdp, prev: previousResources?.debtToGdp, warning: resources.debtToGdp > 100 },
    { label: 'Unemployment', value: `${resources.unemployment.toFixed(1)}%`, raw: resources.unemployment, prev: previousResources?.unemployment },
    { label: 'Exchange Rate', value: resources.exchangeRate.toFixed(3), raw: resources.exchangeRate, prev: previousResources?.exchangeRate },
  ]

  return (
    <Panel title="STATISTICS">
      <div className="font-mono text-xs space-y-1">
        {/* Score and Rank */}
        <div className="flex justify-between mb-2 pb-2 border-b border-terminal-border">
          <div>
            <span className="text-terminal-cyan">Score: </span>
            <span className="text-terminal-yellow font-bold">{score.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-terminal-cyan">Rank: </span>
            <span className="text-terminal-green">#{rank}/{totalPlayers}</span>
          </div>
        </div>

        {stats.map(stat => (
          <div key={stat.label} className="flex items-center gap-2">
            <span className="text-terminal-cyan w-24">{stat.label}:</span>
            <span className={stat.warning ? 'text-terminal-yellow' : 'text-terminal-foreground'}>
              {stat.value}
            </span>
            <span className={
              stat.prev !== undefined && stat.raw > stat.prev ? 'text-terminal-green' :
              stat.prev !== undefined && stat.raw < stat.prev ? 'text-terminal-red' :
              'text-terminal-bright-black'
            }>
              {getChangeIndicator(stat.raw, stat.prev)}
            </span>
            {stat.warning && <span className="text-terminal-yellow">⚠️</span>}
          </div>
        ))}

        {/* Quality bars */}
        <div className="mt-2 pt-2 border-t border-terminal-border">
          <div className="flex items-center gap-2">
            <span className="text-terminal-cyan w-24">Education:</span>
            <span className="text-terminal-green">{renderBar(resources.educationIndex, 100)}</span>
            <span className="text-terminal-foreground">{resources.educationIndex}/100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-terminal-cyan w-24">Healthcare:</span>
            <span className="text-terminal-green">{renderBar(resources.healthcareIndex, 100)}</span>
            <span className="text-terminal-foreground">{resources.healthcareIndex}/100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-terminal-cyan w-24">Infrastructure:</span>
            <span className="text-terminal-green">{renderBar(resources.infrastructureIndex, 100)}</span>
            <span className="text-terminal-foreground">{resources.infrastructureIndex}/100</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}
