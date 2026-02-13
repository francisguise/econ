'use client'

import { Panel } from './Panel'
import { Cabinet, MinisterRole } from '@/lib/types/cabinet'
import { ministerDefinitions } from '@/lib/assets/minister-roles'

interface CabinetPanelProps {
  cabinet: Cabinet
  selectedMinister?: MinisterRole
  onSelectMinister?: (role: MinisterRole) => void
}

export function CabinetPanel({ cabinet, selectedMinister, onSelectMinister }: CabinetPanelProps) {
  const roles: MinisterRole[] = ['warrior', 'mage', 'engineer', 'diplomat']

  return (
    <Panel title="YOUR CABINET" borderStyle="single">
      <div className="font-mono text-sm space-y-2">
        {roles.map((role, i) => {
          const minister = cabinet.ministers[role]
          const def = ministerDefinitions[role]
          const isSelected = selectedMinister === role

          return (
            <div
              key={role}
              onClick={() => onSelectMinister?.(role)}
              className={`flex items-center gap-2 p-1 cursor-pointer transition-colors ${
                isSelected ? 'bg-terminal-bright-black' : 'hover:bg-terminal-bright-black/50'
              }`}
            >
              <span className="text-terminal-cyan">{i + 1}.</span>
              <span className="text-2xl">{def.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-terminal-foreground truncate">{minister.name}</div>
                <div className="text-terminal-bright-black text-xs">{def.title}</div>
              </div>
              <span className="text-terminal-green">Lv{minister.level}</span>
            </div>
          )
        })}

        <div className="mt-3 pt-2 border-t border-terminal-border text-terminal-magenta text-xs">
          [1-4] Select | [A]ssign Action | [I]nfo | [U]pgrade
        </div>
      </div>
    </Panel>
  )
}
