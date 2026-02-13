import { PlayerResources, PlayerOutcome, GameEvent, ScoringWeights, PolicyChoices } from '@/lib/types/game'
import { CabinetAssignment, focusEffects } from '@/lib/types/cabinet'
import { calculateScore } from './rankings'

// Economic model parameters
const PARAMS = {
  neutralRealRate: 2.0,    // r*
  targetInflation: 2.0,     // π*
  defaultAlpha: 1.5,        // CBRF inflation sensitivity
  defaultGamma: 0.5,        // CBRF output gap sensitivity
  defaultBeta: 1.0,         // IS curve interest rate sensitivity
  defaultLambda: 0.3,       // Phillips curve slope
  defaultChi: 0.5,          // Exchange rate sensitivity of NX
  defaultMu: 0.3,           // Foreign demand sensitivity of NX
}

// Random event types
const RANDOM_EVENTS: Array<{ name: string; probability: number; apply: (r: PlayerResources) => { resources: PlayerResources; event: GameEvent } }> = [
  {
    name: 'Oil Price Shock',
    probability: 0.01,
    apply: (r) => ({
      resources: { ...r, inflation: r.inflation + 3.0 },
      event: { type: 'shock', title: 'Oil Price Shock', description: 'Global oil prices surge, causing inflation spike', impact: { inflation: 3.0 } },
    }),
  },
  {
    name: 'Productivity Boom',
    probability: 0.01,
    apply: (r) => ({
      resources: { ...r, potentialGdp: r.potentialGdp * 1.02 },
      event: { type: 'shock', title: 'Productivity Boom', description: 'A wave of innovation boosts potential output', impact: { potentialGdp: 0.02 } },
    }),
  },
  {
    name: 'Financial Crisis',
    probability: 0.01,
    apply: (r) => ({
      resources: { ...r, gdp: r.gdp * 0.97, unemployment: r.unemployment + 2 },
      event: { type: 'crisis', title: 'Financial Crisis', description: 'Banking sector instability causes economic contraction', impact: { gdp: -0.03, unemployment: 2 } },
    }),
  },
  {
    name: 'Tech Breakthrough',
    probability: 0.01,
    apply: (r) => ({
      resources: { ...r, educationIndex: Math.min(100, r.educationIndex + 10), potentialGdp: r.potentialGdp * 1.005 },
      event: { type: 'achievement', title: 'Tech Breakthrough', description: 'Major technological innovation drives growth', impact: { educationIndex: 10, potentialGdp: 0.005 } },
    }),
  },
]

export interface ResolutionInput {
  playerId: string
  resources: PlayerResources
  policies: PolicyChoices
  startingResources: PlayerResources
  quartersPlayed: number
}

export interface ResolutionResult {
  playerOutcomes: Record<string, PlayerOutcome>
  newState: Record<string, unknown>
  snapshots: Record<string, PlayerResources & { score: number; rank: number }>
}

/**
 * Apply the Central Bank Reaction Function (CBRF)
 * i = r* + π* + α(π - π*) + γ(y - y*)
 */
function applyCBRF(
  resources: PlayerResources,
  alpha: number = PARAMS.defaultAlpha,
  gamma: number = PARAMS.defaultGamma
): number {
  const outputGap = (resources.gdp - resources.potentialGdp) / resources.potentialGdp
  const inflationGap = resources.inflation - PARAMS.targetInflation
  const rate = PARAMS.neutralRealRate + PARAMS.targetInflation + alpha * inflationGap + gamma * outputGap
  return Math.max(-1, Math.min(20, rate))
}

/**
 * Apply the Phillips Curve
 * π = πᵉ + λ(y - y*) + ε
 */
function applyPhillipsCurve(
  resources: PlayerResources,
  lambda: number = PARAMS.defaultLambda,
  supplyShock: number = 0
): number {
  const outputGap = (resources.gdp - resources.potentialGdp) / resources.potentialGdp
  const expectedInflation = resources.inflation * 0.7 + PARAMS.targetInflation * 0.3 // Adaptive expectations
  const newInflation = expectedInflation + lambda * outputGap * 100 + supplyShock
  return Math.max(-5, Math.min(50, newInflation))
}

/**
 * Apply the IS Curve (Aggregate Demand)
 * y = y* - β(i + RP - π - r*) + G + NX
 */
function applyISCurve(
  resources: PlayerResources,
  policies: PolicyChoices,
  beta: number = PARAMS.defaultBeta
): number {
  const riskPremium = resources.debtToGdp > 100 ? (resources.debtToGdp - 100) * 0.05 : 0
  const realRateDiff = resources.interestRate + riskPremium - resources.inflation - PARAMS.neutralRealRate
  const govSpending = (policies.govSpendingEducation + policies.govSpendingHealthcare + policies.govSpendingInfrastructure) / 100
  const netExports = resources.exchangeRate > 1.0 ? -0.01 : 0.01

  const gdpGrowthRate = -beta * realRateDiff / 100 + govSpending * 0.3 + netExports
  return resources.potentialGdp * (1 + gdpGrowthRate)
}

/**
 * Apply government budget identity
 * ΔD = G - T + iD
 */
function applyBudgetIdentity(
  resources: PlayerResources,
  policies: PolicyChoices
): number {
  const govSpendingPct = policies.govSpendingEducation + policies.govSpendingHealthcare + policies.govSpendingInfrastructure
  const taxRevenuePct = policies.taxRate
  const interestCostPct = resources.interestRate * resources.debtToGdp / 100

  const deficit = govSpendingPct - taxRevenuePct + interestCostPct
  return Math.max(0, resources.debtToGdp + deficit / 4) // Per quarter
}

/**
 * Apply cabinet focus effects to economic parameters
 */
function applyCabinetEffects(
  resources: PlayerResources,
  policies: PolicyChoices,
  assignment: CabinetAssignment
): PlayerResources {
  const result = { ...resources }

  // Warrior effects (trade) - tariff effectiveness scales with warrior focus
  // Higher focus improves NX via chi parameter (applied in IS curve indirectly)

  // Mage effects (monetary policy) - enhanced CBRF when mage focus is high
  if (assignment.mage.assignment === 'inflation_targeting' && assignment.mage.focus >= 3) {
    // Reduce Phillips curve sensitivity
    result.inflation = result.inflation * (1 - 0.05 * assignment.mage.focus)
  }

  // Engineer effects (development)
  const engineerEffect = focusEffects[assignment.engineer.focus].effectiveness
  if (assignment.engineer.assignment === 'infrastructure') {
    result.infrastructureIndex = Math.min(100, result.infrastructureIndex + 0.5 * engineerEffect)
    result.potentialGdp *= 1 + 0.001 * engineerEffect
  } else if (assignment.engineer.assignment === 'education') {
    result.educationIndex = Math.min(100, result.educationIndex + 0.5 * engineerEffect)
  } else if (assignment.engineer.assignment === 'healthcare') {
    result.healthcareIndex = Math.min(100, result.healthcareIndex + 0.5 * engineerEffect)
  }

  // Diplomat effects (trade & immigration)
  const diplomatEffect = focusEffects[assignment.diplomat.focus].effectiveness
  if (assignment.diplomat.assignment === 'immigration_policy') {
    const baseImmigration = policies.immigrationPolicy === 'open' ? 0.025 : policies.immigrationPolicy === 'moderate' ? 0.01 : 0.0
    result.population = result.population * (1 + baseImmigration * diplomatEffect / 4)
  }

  return result
}

/**
 * Apply population dynamics
 */
function applyPopulationDynamics(resources: PlayerResources, policies: PolicyChoices): number {
  const baseBirthRate = 0.01
  const baseDeathRate = 0.008
  const healthcareBonus = resources.healthcareIndex / 10000 // Small effect from healthcare
  const deathRate = Math.max(0.002, baseDeathRate - healthcareBonus)

  const immigrationRate =
    policies.immigrationPolicy === 'open' ? 0.02 :
    policies.immigrationPolicy === 'moderate' ? 0.01 :
    -0.005

  const quarterlyGrowth = (baseBirthRate - deathRate + immigrationRate) / 4
  return Math.max(1_000_000, resources.population * (1 + quarterlyGrowth))
}

/**
 * Resolve a single player's quarter
 */
function resolvePlayer(input: ResolutionInput, scoringWeights: ScoringWeights): PlayerOutcome {
  let resources = { ...input.resources }
  const events: GameEvent[] = []

  // 1. Apply cabinet effects
  resources = applyCabinetEffects(resources, input.policies, input.policies.cabinetAssignment)

  // 2. Apply CBRF or manual interest rate
  if (input.policies.cbrfAutopilot) {
    const mageEffect = focusEffects[input.policies.cabinetAssignment.mage.focus].effectiveness
    resources.interestRate = applyCBRF(resources, PARAMS.defaultAlpha * mageEffect, PARAMS.defaultGamma * mageEffect)
  } else {
    resources.interestRate = input.policies.interestRate
  }

  // 3. Apply IS curve (output/GDP)
  resources.gdp = applyISCurve(resources, input.policies)

  // 4. Apply Phillips curve (inflation)
  resources.inflation = applyPhillipsCurve(resources)

  // 5. Apply population dynamics
  resources.population = applyPopulationDynamics(resources, input.policies)

  // 6. Update GDP per capita
  resources.gdpPerCapita = resources.gdp / resources.population

  // 7. Apply budget identity (debt)
  resources.debtToGdp = applyBudgetIdentity(resources, input.policies)

  // 8. Update exchange rate (simplified UIP)
  const rateDiff = resources.interestRate - 4.0 // vs world average
  resources.exchangeRate = resources.exchangeRate * (1 + rateDiff * 0.01)

  // 9. Update unemployment (Okun's Law approximation)
  const outputRatio = resources.gdp / resources.potentialGdp
  resources.unemployment = Math.max(0, Math.min(25, (1 - Math.sqrt(outputRatio)) * 100 + 5))

  // 10. Update tax rate
  resources.taxRate = input.policies.taxRate

  // 11. Apply random events
  for (const event of RANDOM_EVENTS) {
    if (Math.random() < event.probability) {
      const result = event.apply(resources)
      resources = result.resources
      events.push(result.event)
    }
  }

  // 12. Check for crises
  if (resources.debtToGdp > 150) {
    events.push({ type: 'crisis', title: 'Debt Crisis', description: 'Debt exceeds 150% of GDP. Austerity measures required.', impact: { debtToGdp: 5 } })
  }
  if (resources.inflation > 20) {
    events.push({ type: 'crisis', title: 'Hyperinflation', description: 'Inflation exceeds 20%. Currency collapsing.', impact: { inflation: 0 } })
  }

  // 13. Calculate score
  const scoreBreakdown = calculateScore(resources, input.startingResources, input.quartersPlayed, scoringWeights)

  return {
    score: scoreBreakdown.total,
    resources,
    scoreBreakdown,
    events,
  }
}

/**
 * Resolve an entire quarter for all players
 */
export function resolveQuarterLogic(
  inputs: ResolutionInput[],
  scoringWeights: ScoringWeights
): ResolutionResult {
  const playerOutcomes: Record<string, PlayerOutcome> = {}
  const snapshots: Record<string, PlayerResources & { score: number; rank: number }> = {}

  // Resolve each player
  for (const input of inputs) {
    playerOutcomes[input.playerId] = resolvePlayer(input, scoringWeights)
  }

  // Calculate rankings
  const sorted = Object.entries(playerOutcomes)
    .sort(([, a], [, b]) => b.score - a.score)

  sorted.forEach(([playerId, outcome], index) => {
    snapshots[playerId] = {
      ...outcome.resources,
      score: outcome.score,
      rank: index + 1,
    }
  })

  return {
    playerOutcomes,
    newState: { resolvedAt: new Date().toISOString() },
    snapshots,
  }
}

/**
 * Get latest action version per player/minister
 */
export function getLatestActions(actions: Array<{ player_id: string; minister_role: string; version: number; [key: string]: unknown }>) {
  const map = new Map<string, typeof actions[0]>()
  for (const action of actions) {
    const key = `${action.player_id}-${action.minister_role}`
    if (!map.has(key) || action.version > map.get(key)!.version) {
      map.set(key, action)
    }
  }
  return Array.from(map.values())
}
