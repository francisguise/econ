import { create } from 'zustand'
import {
  Game,
  GamePlayer,
  Quarter,
  PolicyChoices,
  PlayerResources,
  GameEvent,
  QuarterSnapshot,
} from '@/lib/types/game'
import { Cabinet, MinisterRole, CabinetAssignment } from '@/lib/types/cabinet'
import { LogEntry } from '@/components/tui/ActionLog'

const DEFAULT_ASSIGNMENT: CabinetAssignment = {
  warrior: { focus: 2, assignment: 'tariff_management' },
  mage: { focus: 3, assignment: 'interest_rate_control' },
  engineer: { focus: 3, assignment: 'infrastructure' },
  diplomat: { focus: 2, assignment: 'trade_negotiations' },
}

const DEFAULT_POLICIES: PolicyChoices = {
  cabinetAssignment: DEFAULT_ASSIGNMENT,
  interestRate: 4.0,
  cbrfAutopilot: false,
  govSpendingEducation: 3,
  govSpendingHealthcare: 7,
  govSpendingInfrastructure: 5,
  taxRate: 28,
  immigrationPolicy: 'moderate',
  qeStance: 'neutral',
  tariffs: {},
  capitalControls: 'open',
}

interface Notification {
  id: number
  minister: MinisterRole
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface MultiplayerStore {
  // Game state (synced from Supabase)
  game: Game | null
  players: GamePlayer[]
  currentQuarter: Quarter | null
  submittedPlayers: string[] // user IDs who have submitted this quarter
  snapshots: QuarterSnapshot[]

  // Local player state
  localUserId: string | null
  policies: PolicyChoices
  hasSubmitted: boolean
  previousResources: PlayerResources | null

  // UI state
  logEntries: LogEntry[]
  notifications: Notification[]
  notificationCounter: number
  lastQuarterEvents: GameEvent[]

  // Cabinet
  cabinet: Cabinet

  // Batch setter for atomic updates (prevents intermediate renders)
  setGameData: (data: {
    game: Game
    players: GamePlayer[]
    currentQuarter: Quarter | null
    submittedPlayerIds: string[]
    snapshots: QuarterSnapshot[]
  }) => void

  // Setters
  setGame: (game: Game) => void
  setPlayers: (players: GamePlayer[]) => void
  setCurrentQuarter: (quarter: Quarter | null) => void
  setSubmittedPlayers: (playerIds: string[]) => void
  setSnapshots: (snapshots: QuarterSnapshot[]) => void
  setLocalUserId: (userId: string) => void
  setPolicies: (policies: PolicyChoices) => void
  setHasSubmitted: (submitted: boolean) => void
  setPreviousResources: (resources: PlayerResources | null) => void
  addNotification: (minister: MinisterRole, message: string, type: Notification['type']) => void
  dismissNotification: (id: number) => void
  addLogEntry: (entry: LogEntry) => void

  // Derived
  getLocalPlayer: () => GamePlayer | undefined
  getPlayerRank: () => number
  isCreator: () => boolean

  // Reset
  reset: () => void
}

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  game: null,
  players: [],
  currentQuarter: null,
  submittedPlayers: [],
  snapshots: [],

  localUserId: null,
  policies: { ...DEFAULT_POLICIES },
  hasSubmitted: false,
  previousResources: null,

  logEntries: [],
  notifications: [],
  notificationCounter: 0,
  lastQuarterEvents: [],

  cabinet: {
    playerId: '',
    ministers: {
      warrior: { role: 'warrior', emoji: '⚔️', name: 'General', title: 'Trade & Competition', level: 1, experience: 0 },
      mage: { role: 'mage', emoji: '🔮', name: 'Archmage', title: 'Central Bank', level: 1, experience: 0 },
      engineer: { role: 'engineer', emoji: '🔧', name: 'Chief Engineer', title: 'Development', level: 1, experience: 0 },
      diplomat: { role: 'diplomat', emoji: '🤝', name: 'Ambassador', title: 'Foreign Affairs', level: 1, experience: 0 },
    },
  },

  setGameData: ({ game, players, currentQuarter, submittedPlayerIds, snapshots }) => {
    const prev = get().currentQuarter
    const userId = get().localUserId
    const update: Partial<MultiplayerStore> = { game, players, snapshots }

    // Handle quarter change
    if (currentQuarter && prev && currentQuarter.id !== prev.id) {
      const localPlayer = players.find(p => p.userId === userId)
      Object.assign(update, {
        currentQuarter,
        hasSubmitted: false,
        submittedPlayers: [],
        previousResources: localPlayer?.playerResources || null,
      })
    } else {
      update.currentQuarter = currentQuarter
      update.submittedPlayers = submittedPlayerIds
      update.hasSubmitted = userId ? submittedPlayerIds.includes(userId) : false
    }

    set(update)
  },

  setGame: (game) => set({ game }),
  setPlayers: (players) => set({ players }),
  setCurrentQuarter: (quarter) => {
    const prev = get().currentQuarter
    // When quarter changes, reset submission state
    if (quarter && prev && quarter.id !== prev.id) {
      const localPlayer = get().getLocalPlayer()
      set({
        currentQuarter: quarter,
        hasSubmitted: false,
        submittedPlayers: [],
        previousResources: localPlayer?.playerResources || null,
      })
    } else {
      set({ currentQuarter: quarter })
    }
  },
  setSubmittedPlayers: (playerIds) => {
    const userId = get().localUserId
    set({
      submittedPlayers: playerIds,
      hasSubmitted: userId ? playerIds.includes(userId) : false,
    })
  },
  setSnapshots: (snapshots) => set({ snapshots }),
  setLocalUserId: (userId) => set({ localUserId: userId }),
  setPolicies: (policies) => set({ policies }),
  setHasSubmitted: (submitted) => set({ hasSubmitted: submitted }),
  setPreviousResources: (resources) => set({ previousResources: resources }),

  addNotification: (minister, message, type) => {
    const id = get().notificationCounter + 1
    set((state) => ({
      notifications: [...state.notifications.slice(-10), { id, minister, message, type }],
      notificationCounter: id,
    }))
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  addLogEntry: (entry) => {
    set((state) => ({
      logEntries: [...state.logEntries.slice(-50), entry],
    }))
  },

  getLocalPlayer: () => {
    const { players, localUserId } = get()
    return players.find(p => p.userId === localUserId)
  },

  getPlayerRank: () => {
    const { players, localUserId } = get()
    const sorted = [...players].sort((a, b) => b.playerScore - a.playerScore)
    return sorted.findIndex(p => p.userId === localUserId) + 1
  },

  isCreator: () => {
    const { game, localUserId } = get()
    return game?.createdBy === localUserId
  },

  reset: () => set({
    game: null,
    players: [],
    currentQuarter: null,
    submittedPlayers: [],
    snapshots: [],
    localUserId: null,
    policies: { ...DEFAULT_POLICIES },
    hasSubmitted: false,
    previousResources: null,
    logEntries: [],
    notifications: [],
    notificationCounter: 0,
    lastQuarterEvents: [],
  }),
}))
