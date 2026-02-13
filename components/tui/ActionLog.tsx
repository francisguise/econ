'use client'

import { Panel } from './Panel'
import { MinisterRole } from '@/lib/types/cabinet'
import { ministerDefinitions } from '@/lib/assets/minister-roles'

export interface LogEntry {
  timestamp: string
  minister: MinisterRole
  action: string
  result?: 'success' | 'failure' | 'partial'
}

interface ActionLogProps {
  entries: LogEntry[]
  maxEntries?: number
}

export function ActionLog({ entries, maxEntries = 20 }: ActionLogProps) {
  const displayed = entries.slice(-maxEntries)

  return (
    <Panel title="ACTION LOG">
      <div className="font-mono text-xs space-y-1 max-h-60 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="text-terminal-bright-black">No actions yet...</div>
        ) : (
          displayed.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-terminal-bright-black w-12 shrink-0">{entry.timestamp}</span>
              <span className="text-lg shrink-0">{ministerDefinitions[entry.minister]?.emoji}</span>
              <span className="text-terminal-foreground flex-1 truncate">{entry.action}</span>
              {entry.result && (
                <span className={
                  entry.result === 'success' ? 'text-terminal-green' :
                  entry.result === 'failure' ? 'text-terminal-red' :
                  'text-terminal-yellow'
                }>
                  {entry.result === 'success' ? '✓' : entry.result === 'failure' ? '✗' : '~'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </Panel>
  )
}
