import { create } from 'zustand'
import {
  GamePlayer,
  PlayerResources,
  DEFAULT_PLAYER_RESOURCES,
  PolicyChoices,
  ScoringWeights,
  ScoringPreset,
  SCORING_PRESETS,
  GameEvent,
} from '@/lib/types/game'
import { CabinetAssignment, Cabinet, MinisterRole } from '@/lib/types/cabinet'
import { LogEntry } from '@/components/tui/ActionLog'
import { resolveQuarterLogic, ResolutionInput } from '@/lib/game-logic/resolution'
import { ministerDefinitions } from '@/lib/assets/minister-roles'

// AI opponent strategies
const AI_STRATEGIES: Record<string, CabinetAssignment> = {
  balanced: {
    warrior: { focus: 2, assignment: 'tariff_management' },
    mage: { focus: 3, assignment: 'interest_rate_control' },
    engineer: { focus: 3, assignment: 'infrastructure' },
    diplomat: { focus: 2, assignment: 'trade_negotiations' },
  },
  growth: {
    warrior: { focus: 1, assignment: 'tariff_management' },
    mage: { focus: 2, assignment: 'interest_rate_control' },
    engineer: { focus: 4, assignment: 'infrastructure' },
    diplomat: { focus: 3, assignment: 'immigration_policy' },
  },
  stability: {
    warrior: { focus: 2, assignment: 'currency_defense' },
    mage: { focus: 4, assignment: 'inflation_targeting' },
    engineer: { focus: 2, assignment: 'infrastructure' },
    diplomat: { focus: 2, assignment: 'trade_negotiations' },
  },
  trade: {
    warrior: { focus: 3, assignment: 'tariff_management' },
    mage: { focus: 2, assignment: 'interest_rate_control' },
    engineer: { focus: 1, assignment: 'infrastructure' },
    diplomat: { focus: 4, assignment: 'trade_negotiations' },
  },
}

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
  tariffRate: 0,
}

interface Notification {
  id: number
  minister: MinisterRole
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface DemoPlayer {
  id: string
  name: string
  emoji: string
  resources: PlayerResources
  score: number
  aiStrategy: string
  policies: PolicyChoices
}

interface GameStore {
  // Game state
  quarter: number
  totalQuarters: number
  scoringPreset: ScoringPreset
  scoringWeights: ScoringWeights
  gameOver: boolean

  // Player state
  player: DemoPlayer
  aiPlayers: DemoPlayer[]
  cabinet: Cabinet

  // UI state
  policies: PolicyChoices
  logEntries: LogEntry[]
  notifications: Notification[]
  lastQuarterEvents: GameEvent[]
  previousResources: PlayerResources | null
  notificationCounter: number

  // Actions
  setPolicies: (policies: PolicyChoices) => void
  advanceQuarter: () => void
  resetGame: (preset?: ScoringPreset) => void
  dismissNotification: (id: number) => void
  getAllPlayers: () => GamePlayer[]
}

function makeAIPlayer(id: string, name: string, emoji: string, strategy: string): DemoPlayer {
  // Slight variation in starting resources for AI
  const variation = () => 0.95 + Math.random() * 0.1
  const resources = {
    ...DEFAULT_PLAYER_RESOURCES,
    gdp: DEFAULT_PLAYER_RESOURCES.gdp * variation(),
    population: DEFAULT_PLAYER_RESOURCES.population * variation(),
  }
  resources.gdpPerCapita = resources.gdp / resources.population

  return {
    id,
    name,
    emoji,
    resources,
    score: 0,
    aiStrategy: strategy,
    policies: {
      ...DEFAULT_POLICIES,
      cabinetAssignment: AI_STRATEGIES[strategy] || AI_STRATEGIES.balanced,
      interestRate: 3.5 + Math.random() * 2,
      cbrfAutopilot: true,
      taxRate: 25 + Math.floor(Math.random() * 10),
      immigrationPolicy: (['restrictive', 'moderate', 'open'] as const)[Math.floor(Math.random() * 3)],
      capitalControls: (['open', 'moderate', 'strict'] as const)[Math.floor(Math.random() * 3)],
      qeStance: (['tightening', 'neutral', 'easing'] as const)[Math.floor(Math.random() * 3)],
      tariffRate: Math.floor(Math.random() * 15),
    },
  }
}

function makeAIPolicies(player: DemoPlayer, quarter: number): PolicyChoices {
  const base = AI_STRATEGIES[player.aiStrategy] || AI_STRATEGIES.balanced
  // AI adjusts policies based on economic state
  let interestRate = player.resources.interestRate
  if (player.resources.inflation > 4) interestRate = Math.min(20, interestRate + 0.5)
  else if (player.resources.inflation < 1) interestRate = Math.max(-1, interestRate - 0.5)

  // Occasional strategy shifts
  const shift = Math.random()
  let assignment = base
  if (shift < 0.1 && quarter > 5) {
    // 10% chance to shake things up
    const strategies = Object.keys(AI_STRATEGIES)
    const newStrat = strategies[Math.floor(Math.random() * strategies.length)]
    assignment = AI_STRATEGIES[newStrat]
  }

  // AI adjusts tariff rate based on trade balance
  let tariffRate = player.policies.tariffRate
  if (player.resources.tradeBalance < -2) tariffRate = Math.min(25, tariffRate + 2)
  else if (player.resources.tradeBalance > 3) tariffRate = Math.max(0, tariffRate - 1)

  // AI adjusts QE stance based on inflation/growth
  let qeStance = player.policies.qeStance
  if (player.resources.inflation > 5) qeStance = 'tightening'
  else if (player.resources.inflation < 1 && player.resources.unemployment > 7) qeStance = 'easing'
  else qeStance = 'neutral'

  // AI adjusts capital controls based on exchange rate volatility
  let capitalControls = player.policies.capitalControls
  if (player.resources.exchangeRate < 0.8 || player.resources.exchangeRate > 1.3) {
    capitalControls = 'strict'
  } else if (player.resources.exchangeRate < 0.9 || player.resources.exchangeRate > 1.2) {
    capitalControls = 'moderate'
  } else {
    capitalControls = 'open'
  }

  return {
    ...player.policies,
    cabinetAssignment: assignment,
    interestRate,
    cbrfAutopilot: true,
    tariffRate,
    qeStance,
    capitalControls,
  }
}

function formatTimestamp(quarter: number): string {
  const h = String(Math.floor(quarter / 4) % 24).padStart(2, '0')
  const m = String((quarter % 4) * 15).padStart(2, '0')
  return `${h}:${m}`
}

export const useGameStore = create<GameStore>((set, get) => ({
  quarter: 1,
  totalQuarters: 40,
  scoringPreset: 'balanced_growth',
  scoringWeights: SCORING_PRESETS.balanced_growth,
  gameOver: false,

  player: {
    id: 'player-1',
    name: 'You',
    emoji: '👑',
    resources: { ...DEFAULT_PLAYER_RESOURCES },
    score: 0,
    aiStrategy: 'human',
    policies: { ...DEFAULT_POLICIES },
  },

  aiPlayers: [
    makeAIPlayer('ai-bob', 'Bob', '🎯', 'growth'),
    makeAIPlayer('ai-charlie', 'Charlie', '🌟', 'stability'),
    makeAIPlayer('ai-diana', 'Diana', '🎪', 'trade'),
  ],

  cabinet: {
    playerId: 'player-1',
    ministers: {
      warrior: { role: 'warrior', emoji: '⚔️', name: 'General Marcus', title: 'Trade & Competition', level: 1, experience: 0 },
      mage: { role: 'mage', emoji: '🔮', name: 'Archmage Elena', title: 'Central Bank', level: 1, experience: 0 },
      engineer: { role: 'engineer', emoji: '🔧', name: 'Chief Engineer Chen', title: 'Development', level: 1, experience: 0 },
      diplomat: { role: 'diplomat', emoji: '🤝', name: 'Ambassador Sophia', title: 'Foreign Affairs', level: 1, experience: 0 },
    },
  },

  policies: { ...DEFAULT_POLICIES },
  logEntries: [],
  notifications: [],
  lastQuarterEvents: [],
  previousResources: null,
  notificationCounter: 0,

  setPolicies: (policies) => set({ policies }),

  advanceQuarter: () => {
    const state = get()
    if (state.gameOver) return

    const currentQuarter = state.quarter
    const ts = formatTimestamp(currentQuarter)

    // Build resolution inputs for all players
    const allDemoPlayers = [state.player, ...state.aiPlayers]

    const inputs: ResolutionInput[] = allDemoPlayers.map((p) => ({
      playerId: p.id,
      resources: p.resources,
      policies: p.id === 'player-1' ? state.policies : makeAIPolicies(p, currentQuarter),
      startingResources: DEFAULT_PLAYER_RESOURCES,
      quartersPlayed: currentQuarter,
    }))

    // Run the resolution engine
    const result = resolveQuarterLogic(inputs, state.scoringWeights)

    // Extract player outcome
    const playerOutcome = result.playerOutcomes['player-1']
    const previousResources = { ...state.player.resources }

    // Build log entries from this quarter
    const newLogEntries: LogEntry[] = []
    const roles: MinisterRole[] = ['warrior', 'mage', 'engineer', 'diplomat']
    const assignment = state.policies.cabinetAssignment

    for (const role of roles) {
      const a = assignment[role]
      const def = ministerDefinitions[role]
      const assignmentDef = def.assignments.find(x => x.id === a.assignment)
      const focusLabel = a.focus === 4 ? ' ⚡HEROIC' : a.focus === 3 ? ' (enhanced)' : ''
      newLogEntries.push({
        timestamp: ts,
        minister: role,
        action: `${assignmentDef?.name || a.assignment} [Focus ${a.focus}]${focusLabel}`,
        result: 'success',
      })
    }

    // Build notifications from events and key economic changes
    const newNotifications: Notification[] = []
    let notifId = state.notificationCounter

    // Inflation notification
    const inflDiff = playerOutcome.resources.inflation - previousResources.inflation
    if (Math.abs(inflDiff) > 0.3) {
      notifId++
      newNotifications.push({
        id: notifId,
        minister: 'mage',
        message: inflDiff > 0
          ? `Inflation rose to ${playerOutcome.resources.inflation.toFixed(1)}% (↑${inflDiff.toFixed(1)}%)`
          : `Inflation fell to ${playerOutcome.resources.inflation.toFixed(1)}% (↓${Math.abs(inflDiff).toFixed(1)}%)`,
        type: playerOutcome.resources.inflation > 3.5 ? 'warning' : inflDiff < 0 ? 'success' : 'info',
      })
    }

    // GDP notification
    const gdpChange = ((playerOutcome.resources.gdp - previousResources.gdp) / previousResources.gdp) * 100
    notifId++
    newNotifications.push({
      id: notifId,
      minister: 'engineer',
      message: gdpChange >= 0
        ? `GDP grew ${gdpChange.toFixed(2)}% this quarter to ${(playerOutcome.resources.gdp / 1e12).toFixed(3)}T`
        : `GDP contracted ${gdpChange.toFixed(2)}% this quarter to ${(playerOutcome.resources.gdp / 1e12).toFixed(3)}T`,
      type: gdpChange >= 0 ? 'success' : 'warning',
    })

    // Population notification
    const popChange = ((playerOutcome.resources.population - previousResources.population) / previousResources.population) * 100
    if (Math.abs(popChange) > 0.1) {
      notifId++
      newNotifications.push({
        id: notifId,
        minister: 'diplomat',
        message: `Population ${popChange >= 0 ? 'grew' : 'shrank'} ${Math.abs(popChange).toFixed(2)}% to ${(playerOutcome.resources.population / 1e6).toFixed(1)}M`,
        type: popChange >= 0 ? 'info' : 'warning',
      })
    }

    // Event notifications
    for (const event of playerOutcome.events) {
      notifId++
      newNotifications.push({
        id: notifId,
        minister: event.type === 'crisis' ? 'warrior' : event.type === 'shock' ? 'mage' : 'engineer',
        message: `${event.title}: ${event.description}`,
        type: event.type === 'crisis' ? 'error' : event.type === 'shock' ? 'warning' : 'success',
      })
      newLogEntries.push({
        timestamp: ts,
        minister: event.type === 'crisis' ? 'warrior' : 'mage',
        action: event.title,
        result: event.type === 'crisis' ? 'failure' : 'success',
      })
    }

    // Ranking notification
    const allOutcomes = Object.entries(result.playerOutcomes)
      .sort(([, a], [, b]) => b.score - a.score)
    const playerRank = allOutcomes.findIndex(([id]) => id === 'player-1') + 1
    notifId++
    newNotifications.push({
      id: notifId,
      minister: 'warrior',
      message: `Quarter ${currentQuarter} complete. You are ranked #${playerRank} of ${allOutcomes.length}.`,
      type: playerRank === 1 ? 'success' : 'info',
    })

    // Update cabinet experience
    const newCabinet = { ...state.cabinet, ministers: { ...state.cabinet.ministers } }
    for (const role of roles) {
      const focus = assignment[role].focus
      const minister = { ...newCabinet.ministers[role] }
      minister.experience += focus
      if (minister.experience >= minister.level * 10) {
        minister.level = Math.min(4, minister.level + 1)
        minister.experience = 0
        notifId++
        newNotifications.push({
          id: notifId,
          minister: role,
          message: `${minister.name} leveled up to Level ${minister.level}!`,
          type: 'success',
        })
      }
      newCabinet.ministers[role] = minister
    }

    // Update AI players
    const updatedAI = state.aiPlayers.map((ai) => {
      const outcome = result.playerOutcomes[ai.id]
      if (!outcome) return ai
      return {
        ...ai,
        resources: outcome.resources,
        score: outcome.score,
      }
    })

    const newQuarter = currentQuarter + 1
    const isGameOver = newQuarter > state.totalQuarters

    set({
      quarter: newQuarter,
      gameOver: isGameOver,
      player: {
        ...state.player,
        resources: playerOutcome.resources,
        score: playerOutcome.score,
      },
      aiPlayers: updatedAI,
      cabinet: newCabinet,
      previousResources,
      logEntries: [...state.logEntries, ...newLogEntries],
      notifications: newNotifications,
      lastQuarterEvents: playerOutcome.events,
      notificationCounter: notifId,
    })
  },

  resetGame: (preset) => {
    const scoringPreset = preset || 'balanced_growth'
    set({
      quarter: 1,
      totalQuarters: 40,
      scoringPreset,
      scoringWeights: SCORING_PRESETS[scoringPreset],
      gameOver: false,
      player: {
        id: 'player-1',
        name: 'You',
        emoji: '👑',
        resources: { ...DEFAULT_PLAYER_RESOURCES },
        score: 0,
        aiStrategy: 'human',
        policies: { ...DEFAULT_POLICIES },
      },
      aiPlayers: [
        makeAIPlayer('ai-bob', 'Bob', '🎯', 'growth'),
        makeAIPlayer('ai-charlie', 'Charlie', '🌟', 'stability'),
        makeAIPlayer('ai-diana', 'Diana', '🎪', 'trade'),
      ],
      cabinet: {
        playerId: 'player-1',
        ministers: {
          warrior: { role: 'warrior', emoji: '⚔️', name: 'General Marcus', title: 'Trade & Competition', level: 1, experience: 0 },
          mage: { role: 'mage', emoji: '🔮', name: 'Archmage Elena', title: 'Central Bank', level: 1, experience: 0 },
          engineer: { role: 'engineer', emoji: '🔧', name: 'Chief Engineer Chen', title: 'Development', level: 1, experience: 0 },
          diplomat: { role: 'diplomat', emoji: '🤝', name: 'Ambassador Sophia', title: 'Foreign Affairs', level: 1, experience: 0 },
        },
      },
      policies: { ...DEFAULT_POLICIES },
      logEntries: [],
      notifications: [],
      lastQuarterEvents: [],
      previousResources: null,
      notificationCounter: 0,
    })
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  getAllPlayers: () => {
    const state = get()
    const all = [state.player, ...state.aiPlayers]
    return all.map((p) => ({
      id: p.id,
      gameId: 'demo',
      userId: p.id,
      playerName: p.name,
      playerEmoji: p.emoji,
      playerScore: Math.round(p.score),
      playerResources: p.resources,
      joinedAt: '',
      isActive: true,
    }))
  },
}))
