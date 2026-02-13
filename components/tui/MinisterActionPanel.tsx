'use client'

import { useState } from 'react'
import { Panel } from './Panel'
import { CabinetAssignment, MinisterRole, TOTAL_FOCUS_POINTS, MAX_FOCUS_PER_MINISTER, focusEffects } from '@/lib/types/cabinet'
import { ministerDefinitions } from '@/lib/assets/minister-roles'

interface MinisterActionPanelProps {
  assignment: CabinetAssignment
  onAssignmentChange: (assignment: CabinetAssignment) => void
  onSubmit: () => void
  quarterNumber: number
}

export function MinisterActionPanel({
  assignment,
  onAssignmentChange,
  onSubmit,
  quarterNumber,
}: MinisterActionPanelProps) {
  const [selectedRole, setSelectedRole] = useState<MinisterRole>('warrior')
  const roles: MinisterRole[] = ['warrior', 'mage', 'engineer', 'diplomat']

  const totalUsed = roles.reduce((sum, role) => sum + assignment[role].focus, 0)
  const remaining = TOTAL_FOCUS_POINTS - totalUsed

  function setFocus(role: MinisterRole, focus: number) {
    const clamped = Math.min(MAX_FOCUS_PER_MINISTER, Math.max(0, focus))
    const otherTotal = roles
      .filter(r => r !== role)
      .reduce((sum, r) => sum + assignment[r].focus, 0)

    if (otherTotal + clamped > TOTAL_FOCUS_POINTS) return

    onAssignmentChange({
      ...assignment,
      [role]: { ...assignment[role], focus: clamped },
    })
  }

  function setAssignmentType(role: MinisterRole, assignmentId: string) {
    onAssignmentChange({
      ...assignment,
      [role]: { ...assignment[role], assignment: assignmentId },
    })
  }

  const currentDef = ministerDefinitions[selectedRole]
  const currentAssignment = assignment[selectedRole]

  return (
    <Panel title={`CABINET ASSIGNMENTS - QUARTER ${quarterNumber}`} borderStyle="double">
      <div className="font-mono text-sm space-y-4">
        {/* Focus summary */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-terminal-cyan">Focus Points:</span>
          <span className={remaining === 0 ? 'text-terminal-green' : 'text-terminal-yellow'}>
            {totalUsed}/{TOTAL_FOCUS_POINTS} used
          </span>
          {remaining > 0 && (
            <span className="text-terminal-yellow">{remaining} remaining</span>
          )}
        </div>

        {/* Minister tabs */}
        <div className="flex gap-1">
          {roles.map(role => {
            const def = ministerDefinitions[role]
            const isActive = selectedRole === role
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex items-center gap-1 px-2 py-1 text-xs ${
                  isActive
                    ? 'bg-terminal-bright-black text-terminal-foreground'
                    : 'text-terminal-bright-black hover:text-terminal-foreground'
                }`}
              >
                <span>{def.emoji}</span>
                <span>{assignment[role].focus}</span>
              </button>
            )
          })}
        </div>

        {/* Selected minister detail */}
        <div className="border border-terminal-border p-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{currentDef.emoji}</span>
            <div>
              <div className="text-terminal-foreground font-bold">{currentDef.title}</div>
              <div className="text-terminal-bright-black text-xs">{currentDef.description}</div>
            </div>
          </div>

          {/* Focus slider */}
          <div className="mb-3">
            <div className="text-terminal-cyan text-xs mb-1">Focus Level:</div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  onClick={() => setFocus(selectedRole, level)}
                  className={`w-8 h-6 text-xs border ${
                    currentAssignment.focus >= level
                      ? level === 4
                        ? 'bg-terminal-yellow text-terminal-background border-terminal-yellow'
                        : 'bg-terminal-green text-terminal-background border-terminal-green'
                      : 'border-terminal-border text-terminal-bright-black'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="text-xs text-terminal-bright-black mt-1">
              {focusEffects[currentAssignment.focus]?.description}
              {currentAssignment.focus === 4 && (
                <span className="text-terminal-yellow ml-1">⚡ HEROIC</span>
              )}
            </div>
          </div>

          {/* Assignment selection */}
          <div>
            <div className="text-terminal-cyan text-xs mb-1">Assignment:</div>
            <div className="space-y-1">
              {currentDef.assignments.map(a => {
                const locked = a.minFocus !== undefined && currentAssignment.focus < a.minFocus
                const isActive = currentAssignment.assignment === a.id

                return (
                  <button
                    key={a.id}
                    onClick={() => !locked && setAssignmentType(selectedRole, a.id)}
                    disabled={locked}
                    className={`block w-full text-left px-2 py-1 text-xs ${
                      locked
                        ? 'text-terminal-bright-black cursor-not-allowed'
                        : isActive
                        ? 'bg-terminal-bright-black text-terminal-foreground'
                        : 'hover:bg-terminal-bright-black/50 text-terminal-foreground'
                    }`}
                  >
                    <span className="mr-2">{isActive ? '▶' : ' '}</span>
                    {a.name}
                    {locked && <span className="text-terminal-red ml-2">(Focus {a.minFocus}+ required)</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={onSubmit}
          disabled={remaining !== 0}
          className={`w-full py-2 text-sm font-bold ${
            remaining === 0
              ? 'bg-terminal-green text-terminal-background hover:bg-terminal-green/80'
              : 'bg-terminal-bright-black text-terminal-foreground cursor-not-allowed'
          }`}
        >
          {remaining === 0 ? '[SPACE] Submit Policies' : `Assign ${remaining} more focus points`}
        </button>
      </div>
    </Panel>
  )
}
