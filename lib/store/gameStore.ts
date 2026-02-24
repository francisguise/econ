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

// AI personality configurations
interface AIPersonality {
  stimulateOutputGap: number
  stabilizeInflation: number
  stabilizeDebt: number
  protectTradeBalance: number
  spendingBias: 'education' | 'healthcare' | 'infrastructure'
  immigrationBias: 'restrictive' | 'moderate' | 'open'
  startingPolicies: {
    taxRate: number
    edu: number; health: number; infra: number
    immigration: 'restrictive' | 'moderate' | 'open'
    tariffRate: number
  }
}

const AI_PERSONALITIES: Record<string, AIPersonality> = {
  growth: {
    stimulateOutputGap: -0.01,
    stabilizeInflation: 5,
    stabilizeDebt: 110,
    protectTradeBalance: -5,
    spendingBias: 'infrastructure',
    immigrationBias: 'open',
    startingPolicies: { taxRate: 25, edu: 4, health: 5, infra: 6, immigration: 'moderate', tariffRate: 3 },
  },
  stability: {
    stimulateOutputGap: -0.05,
    stabilizeInflation: 3,
    stabilizeDebt: 90,
    protectTradeBalance: -5,
    spendingBias: 'healthcare',
    immigrationBias: 'moderate',
    startingPolicies: { taxRate: 30, edu: 4, health: 7, infra: 4, immigration: 'moderate', tariffRate: 5 },
  },
  trade: {
    stimulateOutputGap: -0.03,
    stabilizeInflation: 4,
    stabilizeDebt: 100,
    protectTradeBalance: -3,
    spendingBias: 'education',
    immigrationBias: 'moderate',
    startingPolicies: { taxRate: 28, edu: 4, health: 5, infra: 6, immigration: 'moderate', tariffRate: 8 },
  },
}

type MacroStance = 'STIMULATE' | 'STABILIZE' | 'PROTECT' | 'GROW'

function nudge(current: number, target: number, step: number): number {
  if (current < target) return Math.min(current + step, target)
  if (current > target) return Math.max(current - step, target)
  return current
}

const ORDERED_IMMIGRATION = ['restrictive', 'moderate', 'open'] as const
const ORDERED_CONTROLS = ['open', 'moderate', 'strict'] as const
const ORDERED_QE = ['tightening', 'neutral', 'easing'] as const

function stepCategorical<T extends string>(current: T, target: T, ordered: readonly T[]): T {
  const ci = ordered.indexOf(current)
  const ti = ordered.indexOf(target)
  if (ci === ti || ci === -1 || ti === -1) return current
  return ordered[ci + (ti > ci ? 1 : -1)]
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
  const variation = () => 0.95 + Math.random() * 0.1
  const resources = {
    ...DEFAULT_PLAYER_RESOURCES,
    gdp: DEFAULT_PLAYER_RESOURCES.gdp * variation(),
    population: DEFAULT_PLAYER_RESOURCES.population * variation(),
  }
  resources.gdpPerCapita = resources.gdp / resources.population

  const personality = AI_PERSONALITIES[strategy]
  const sp = personality?.startingPolicies

  return {
    id,
    name,
    emoji,
    resources,
    score: 0,
    aiStrategy: strategy,
    policies: {
      ...DEFAULT_POLICIES,
      cabinetAssignment: DEFAULT_ASSIGNMENT,
      cbrfAutopilot: true,
      taxRate: sp?.taxRate ?? 28,
      govSpendingEducation: sp?.edu ?? 4,
      govSpendingHealthcare: sp?.health ?? 6,
      govSpendingInfrastructure: sp?.infra ?? 5,
      immigrationPolicy: sp?.immigration ?? 'moderate',
      tariffRate: sp?.tariffRate ?? 5,
      capitalControls: 'open',
      qeStance: 'neutral',
    },
  }
}

function makeAIPolicies(player: DemoPlayer, _quarter: number, scoringWeights: ScoringWeights): PolicyChoices {
  const r = player.resources
  const p = player.policies
  const personality = AI_PERSONALITIES[player.aiStrategy] || AI_PERSONALITIES.growth

  // --- Phase 1: Diagnose ---
  const outputGap = (r.gdp - r.potentialGdp) / r.potentialGdp
  const indices = { education: r.educationIndex, healthcare: r.healthcareIndex, infrastructure: r.infrastructureIndex }
  const lowestIndex = (Object.keys(indices) as (keyof typeof indices)[])
    .reduce((a, b) => indices[a] <= indices[b] ? a : b)

  // --- Phase 2: Choose Macro Stance ---
  let stance: MacroStance = 'GROW'
  if (r.inflation > personality.stabilizeInflation || r.debtToGdp > personality.stabilizeDebt) {
    stance = 'STABILIZE'
  } else if (r.exchangeRate < 0.8 || r.tradeBalance < personality.protectTradeBalance) {
    stance = 'PROTECT'
  } else if (outputGap < personality.stimulateOutputGap || r.unemployment > 7) {
    stance = 'STIMULATE'
  }

  // --- Phase 3: Set All Policies from Stance ---

  // Fiscal policy
  const fiscalTargets: Record<MacroStance, { tax: number; total: number }> = {
    STIMULATE: { tax: 23, total: 18 },
    STABILIZE: { tax: 33, total: 12 },
    PROTECT:   { tax: 28, total: 15 },
    GROW:      { tax: 26, total: 16 },
  }
  const ft = fiscalTargets[stance]
  const taxRate = nudge(p.taxRate, ft.tax, 2)

  // Spending allocation weighted toward lowest index + personality bias
  const biasWeight: Record<string, Record<string, number>> = {
    education:      { education: 3, healthcare: 1, infrastructure: 1 },
    healthcare:     { education: 1, healthcare: 3, infrastructure: 1 },
    infrastructure: { education: 1, healthcare: 1, infrastructure: 3 },
  }
  const lowestWeight: Record<string, number> = { education: 0, healthcare: 0, infrastructure: 0 }
  lowestWeight[lowestIndex] = 2
  const weights = {
    education: (biasWeight[personality.spendingBias]?.education ?? 1) + lowestWeight.education,
    healthcare: (biasWeight[personality.spendingBias]?.healthcare ?? 1) + lowestWeight.healthcare,
    infrastructure: (biasWeight[personality.spendingBias]?.infrastructure ?? 1) + lowestWeight.infrastructure,
  }
  const totalWeight = weights.education + weights.healthcare + weights.infrastructure
  const targetEdu = Math.round(ft.total * weights.education / totalWeight)
  const targetHealth = Math.round(ft.total * weights.healthcare / totalWeight)
  const targetInfra = ft.total - targetEdu - targetHealth

  const govSpendingEducation = nudge(p.govSpendingEducation, targetEdu, 1)
  const govSpendingHealthcare = nudge(p.govSpendingHealthcare, targetHealth, 1)
  const govSpendingInfrastructure = nudge(p.govSpendingInfrastructure, targetInfra, 1)

  // Debt guard-rail
  const finalTax = r.debtToGdp > 110
    ? Math.max(taxRate, govSpendingEducation + govSpendingHealthcare + govSpendingInfrastructure)
    : taxRate

  // Cabinet assignment
  const cabinetFocus: Record<MacroStance, [number, number, number, number]> = {
    STIMULATE: [1, 2, 4, 3],
    STABILIZE: [2, 4, 2, 2],
    PROTECT:   [3, 2, 2, 3],
    GROW:      [2, 3, 3, 2],
  }
  const [wFocus, mFocus, eFocus, dFocus] = cabinetFocus[stance]

  // Minister assignments
  const engineerMap: Record<string, string> = {
    education: 'education_reform',
    healthcare: 'healthcare_system',
    infrastructure: 'infrastructure',
  }
  const allAbove70 = r.educationIndex > 70 && r.healthcareIndex > 70 && r.infrastructureIndex > 70
  const engineerAssignment = allAbove70 ? 'infrastructure' : (engineerMap[lowestIndex] || 'infrastructure')
  const mageAssignment = mFocus >= 3 ? 'inflation_targeting' : 'interest_rate_control'
  const diplomatAssignment = scoringWeights.populationGrowth >= 0.2 ? 'immigration_policy' : 'trade_negotiations'
  const warriorAssignment = stance === 'PROTECT' ? 'currency_defense' : 'tariff_management'

  const cabinetAssignment: CabinetAssignment = {
    warrior:  { focus: wFocus, assignment: warriorAssignment },
    mage:     { focus: mFocus, assignment: mageAssignment },
    engineer: { focus: eFocus, assignment: engineerAssignment },
    diplomat: { focus: dFocus, assignment: diplomatAssignment },
  }

  // Monetary / Trade / Migration
  const stanceMon: Record<MacroStance, { qe: 'tightening' | 'neutral' | 'easing'; controls: 'open' | 'moderate' | 'strict'; imm: 'restrictive' | 'moderate' | 'open'; tariffTarget: number }> = {
    STIMULATE: { qe: 'easing',     controls: 'open',     imm: 'open',        tariffTarget: 3 },
    STABILIZE: { qe: 'tightening', controls: 'moderate', imm: 'moderate',    tariffTarget: 5 },
    PROTECT:   { qe: 'neutral',    controls: 'strict',   imm: 'restrictive', tariffTarget: Math.min(25, p.tariffRate + 2) },
    GROW:      { qe: 'neutral',    controls: 'open',     imm: 'open',        tariffTarget: 5 },
  }
  const sm = stanceMon[stance]

  // Immigration: scoring-aware override for STIMULATE and GROW
  let immTarget = sm.imm
  if (stance === 'STIMULATE' || stance === 'GROW') {
    if (scoringWeights.populationGrowth >= 0.3) immTarget = 'open'
    else if (scoringWeights.populationGrowth >= 0.15) immTarget = 'moderate'
    else immTarget = personality.immigrationBias
  }
  if (r.unemployment > 8) immTarget = 'restrictive'

  const qeStance = stepCategorical(p.qeStance, sm.qe, ORDERED_QE)
  const capitalControls = stepCategorical(p.capitalControls, sm.controls, ORDERED_CONTROLS)
  const immigrationPolicy = stepCategorical(p.immigrationPolicy, immTarget, ORDERED_IMMIGRATION)
  const tariffRate = nudge(p.tariffRate, sm.tariffTarget, 2)

  return {
    ...p,
    cabinetAssignment,
    cbrfAutopilot: true,
    taxRate: finalTax,
    govSpendingEducation,
    govSpendingHealthcare,
    govSpendingInfrastructure,
    immigrationPolicy,
    qeStance,
    capitalControls,
    tariffRate,
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
      policies: p.id === 'player-1' ? state.policies : makeAIPolicies(p, currentQuarter, state.scoringWeights),
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
