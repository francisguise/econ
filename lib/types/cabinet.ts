export type MinisterRole = 'warrior' | 'mage' | 'engineer' | 'diplomat'

export interface Minister {
  role: MinisterRole
  emoji: string
  name: string
  title: string
  level: number
  experience: number
  traits?: string[]
}

export interface Cabinet {
  playerId: string
  ministers: {
    warrior: Minister
    mage: Minister
    engineer: Minister
    diplomat: Minister
  }
}

export interface MinisterDefinition {
  emoji: string
  defaultName: string
  title: string
  description: string
  color: string
  actionTypes: string[]
  assignments: Assignment[]
}

export interface Assignment {
  id: string
  name: string
  description: string
  minFocus?: number
}

export interface CabinetAssignment {
  warrior: { focus: number; assignment: string }
  mage: { focus: number; assignment: string }
  engineer: { focus: number; assignment: string }
  diplomat: { focus: number; assignment: string }
}

export const TOTAL_FOCUS_POINTS = 10
export const MAX_FOCUS_PER_MINISTER = 4

export interface FocusEffect {
  effectiveness: number
  description: string
  specialAbility?: string
}

export const focusEffects: Record<number, FocusEffect> = {
  0: { effectiveness: 0.5, description: 'Autopilot (50%)' },
  1: { effectiveness: 0.75, description: 'Basic attention (75%)' },
  2: { effectiveness: 1.0, description: 'Standard performance (100%)' },
  3: { effectiveness: 1.3, description: 'Enhanced performance (130%)' },
  4: { effectiveness: 1.7, description: 'Heroic effort (170%)', specialAbility: 'Special ability unlocked' },
}
