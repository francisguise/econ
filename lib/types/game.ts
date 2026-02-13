import { CabinetAssignment, MinisterRole } from './cabinet'

export type GameStatus = 'waiting' | 'active' | 'resolving' | 'completed'
export type QuarterStatus = 'active' | 'resolving' | 'completed'
export type VisibilityMode = 'full' | 'blind' | 'partial'

export type ScoringPreset =
  | 'balanced_growth'
  | 'pure_prosperity'
  | 'population_power'
  | 'economic_powerhouse'
  | 'stability_doctrine'
  | 'custom'

export interface ScoringWeights {
  gdpGrowth: number
  gdpPerCapitaGrowth: number
  populationGrowth: number
  stabilityScore: number
}

export const SCORING_PRESETS: Record<ScoringPreset, ScoringWeights> = {
  balanced_growth: { gdpGrowth: 0.3, gdpPerCapitaGrowth: 0.3, populationGrowth: 0.2, stabilityScore: 0.2 },
  pure_prosperity: { gdpGrowth: 0.2, gdpPerCapitaGrowth: 0.5, populationGrowth: 0, stabilityScore: 0.3 },
  population_power: { gdpGrowth: 0.3, gdpPerCapitaGrowth: 0.2, populationGrowth: 0.4, stabilityScore: 0.1 },
  economic_powerhouse: { gdpGrowth: 0.6, gdpPerCapitaGrowth: 0.2, populationGrowth: 0, stabilityScore: 0.2 },
  stability_doctrine: { gdpGrowth: 0.15, gdpPerCapitaGrowth: 0.25, populationGrowth: 0.1, stabilityScore: 0.5 },
  custom: { gdpGrowth: 0.25, gdpPerCapitaGrowth: 0.25, populationGrowth: 0.25, stabilityScore: 0.25 },
}

export interface Game {
  id: string
  name: string
  status: GameStatus
  currentQuarter: number
  totalQuarters: number
  quarterDurationSeconds: number
  visibilityMode: VisibilityMode
  maxPlayers: number
  scoringPreset: ScoringPreset
  scoringWeights: ScoringWeights
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface GamePlayer {
  id: string
  gameId: string
  userId: string
  playerName: string
  playerEmoji: string
  playerScore: number
  playerResources: PlayerResources
  joinedAt: string
  isActive: boolean
}

export interface PlayerResources {
  gdp: number
  gdpPerCapita: number
  population: number
  inflation: number
  interestRate: number
  debtToGdp: number
  exchangeRate: number
  unemployment: number
  educationIndex: number
  healthcareIndex: number
  infrastructureIndex: number
  taxRate: number
  potentialGdp: number
}

export interface Quarter {
  id: string
  gameId: string
  quarterNumber: number
  startsAt: string
  endsAt: string
  status: QuarterStatus
  initialState: Record<string, unknown>
  createdAt: string
}

export interface MinisterAction {
  id: string
  quarterId: string
  gameId: string
  playerId: string
  ministerRole: MinisterRole
  actionType: string
  actionData: Record<string, unknown>
  submittedAt: string
  version: number
  isFinal: boolean
}

export interface QuarterResult {
  id: string
  quarterId: string
  gameId: string
  calculatedState: Record<string, unknown>
  playerOutcomes: Record<string, PlayerOutcome>
  resolutionMetadata: Record<string, unknown>
  resolvedAt: string
}

export interface PlayerOutcome {
  score: number
  resources: PlayerResources
  scoreBreakdown: ScoreBreakdown
  events: GameEvent[]
}

export interface ScoreBreakdown {
  gdpGrowthComponent: number
  gdpPerCapitaComponent: number
  populationComponent: number
  stabilityComponent: number
  penalties: number
  total: number
}

export interface GameEvent {
  type: 'shock' | 'achievement' | 'crisis' | 'info'
  title: string
  description: string
  impact: Record<string, number>
}

export interface QuarterSnapshot {
  id: string
  quarterId: string
  gameId: string
  playerId: string
  metrics: PlayerResources & { score: number; rank: number }
  createdAt: string
}

export const AVAILABLE_PLAYER_EMOJIS = [
  '👑', '🎯', '🌟', '🎪', '🔥', '⚡', '🌙', '☀️',
  '💎', '🎲', '🎨', '🏆', '🚀', '⭐', '💫', '🎭',
]

export const DEFAULT_PLAYER_RESOURCES: PlayerResources = {
  gdp: 2_000_000_000_000,
  gdpPerCapita: 40_000,
  population: 50_000_000,
  inflation: 2.0,
  interestRate: 4.0,
  debtToGdp: 60,
  exchangeRate: 1.0,
  unemployment: 5.0,
  educationIndex: 50,
  healthcareIndex: 50,
  infrastructureIndex: 50,
  taxRate: 28,
  potentialGdp: 2_000_000_000_000,
}

export interface PolicyChoices {
  cabinetAssignment: CabinetAssignment
  interestRate: number
  cbrfAutopilot: boolean
  govSpendingEducation: number
  govSpendingHealthcare: number
  govSpendingInfrastructure: number
  taxRate: number
  immigrationPolicy: 'restrictive' | 'moderate' | 'open'
  qeStance: 'tightening' | 'neutral' | 'easing'
  tariffs: Record<string, number>
  capitalControls: 'open' | 'moderate' | 'strict'
}
