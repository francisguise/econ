import { PlayerResources, PlayerOutcome, GameEvent, ScoringWeights, PolicyChoices, EconomicModel } from '@/lib/types/game'
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

  // Capital flows
  capitalFlowSensitivity: 0.01,
  capitalFlowGdpEffect: 0.002,
  capitalControlDampening: { open: 1.0, moderate: 0.4, strict: 0.1 } as const,

  // Trade
  tradeSensitivity: 0.5,
  tariffImportReduction: 0.005,
  tariffRetaliationPenalty: 0.003,

  // Migration
  migrationSensitivity: 0.01,
  immigrationGate: { restrictive: 0.2, moderate: 0.6, open: 1.0 } as const,

  // QE
  qeMoneyGrowth: { tightening: -0.02, neutral: 0.0, easing: 0.03 } as const,
  qeInflationFactor: 0.5,

  // Twin deficits
  tradeDeficitRiskPremium: 0.02,
  tradeDeficitDebtSpillover: 0.1,

  // Equilibrium convergence
  convergenceThreshold: 0.001,
  maxIterations: 5,
}

// --- WorldState ---

export interface WorldState {
  playerCount: number
  avgInterestRate: number
  avgInflation: number
  avgExchangeRate: number
  avgQualityOfLife: number
  totalGdp: number
  totalPopulation: number
  avgTariffRate: number
  players: Record<string, {
    gdp: number
    interestRate: number
    inflation: number
    exchangeRate: number
    population: number
    qualityOfLife: number
    capitalControls: 'open' | 'moderate' | 'strict'
    tariffRate: number
    immigrationPolicy: 'restrictive' | 'moderate' | 'open'
  }>
}

/**
 * Compute aggregate world state from all players' resources/policies.
 * GDP-weighted averages for interest rates, inflation, exchange rates.
 * Population-weighted average for quality of life.
 * Simple average for tariff rates.
 */
export function computeWorldState(inputs: ResolutionInput[]): WorldState {
  const n = inputs.length
  let totalGdp = 0
  let totalPopulation = 0
  let totalTariffRate = 0

  for (const input of inputs) {
    totalGdp += input.resources.gdp
    totalPopulation += input.resources.population
    totalTariffRate += input.policies.tariffRate
  }

  let avgInterestRate = 0
  let avgInflation = 0
  let avgExchangeRate = 0
  let avgQualityOfLife = 0

  const players: WorldState['players'] = {}

  for (const input of inputs) {
    const gdpWeight = totalGdp > 0 ? input.resources.gdp / totalGdp : 1 / n
    const popWeight = totalPopulation > 0 ? input.resources.population / totalPopulation : 1 / n

    avgInterestRate += input.resources.interestRate * gdpWeight
    avgInflation += input.resources.inflation * gdpWeight
    avgExchangeRate += input.resources.exchangeRate * gdpWeight
    avgQualityOfLife += input.resources.qualityOfLife * popWeight

    players[input.playerId] = {
      gdp: input.resources.gdp,
      interestRate: input.resources.interestRate,
      inflation: input.resources.inflation,
      exchangeRate: input.resources.exchangeRate,
      population: input.resources.population,
      qualityOfLife: input.resources.qualityOfLife,
      capitalControls: input.policies.capitalControls,
      tariffRate: input.policies.tariffRate,
      immigrationPolicy: input.policies.immigrationPolicy,
    }
  }

  return {
    playerCount: n,
    avgInterestRate,
    avgInflation,
    avgExchangeRate,
    avgQualityOfLife,
    totalGdp,
    totalPopulation,
    avgTariffRate: n > 0 ? totalTariffRate / n : 0,
    players,
  }
}

// --- Interaction Models ---

/**
 * Capital Flows (Uncovered Interest Rate Parity).
 *
 * Money flows toward higher real yields. The real interest rate differential
 * between a country and the world average drives capital inflows/outflows,
 * which move the exchange rate and affect investment.
 *
 * Capital controls dampen the flow: open=1.0, moderate=0.4, strict=0.1.
 */
export function computeCapitalFlows(
  resources: PlayerResources,
  policies: PolicyChoices,
  world: WorldState
): { exchangeRateChange: number; gdpEffect: number } {
  const domesticRealRate = resources.interestRate - resources.inflation
  const worldRealRate = world.avgInterestRate - world.avgInflation
  const realRateDiff = domesticRealRate - worldRealRate
  const dampening = PARAMS.capitalControlDampening[policies.capitalControls]
  const flowPressure = realRateDiff * dampening

  return {
    exchangeRateChange: flowPressure * PARAMS.capitalFlowSensitivity,
    gdpEffect: flowPressure * PARAMS.capitalFlowGdpEffect,
  }
}

/**
 * Trade / Net Exports.
 *
 * A weaker currency (relative to world average) makes exports cheaper and
 * imports more expensive, improving net exports. Tariffs reduce imports but
 * face retaliation from trading partners. Net exports feed directly into
 * the IS (Aggregate Demand) curve.
 */
export function computeNetExports(
  resources: PlayerResources,
  policies: PolicyChoices,
  world: WorldState
): { netExports: number; tradeBalance: number } {
  const relativeRate = world.avgExchangeRate > 0
    ? resources.exchangeRate / world.avgExchangeRate
    : 1.0
  const competitiveness = 1.0 - relativeRate
  const ownTariffEffect = policies.tariffRate * PARAMS.tariffImportReduction
  const worldTariffCost = world.avgTariffRate * PARAMS.tariffRetaliationPenalty
  const netExports = PARAMS.tradeSensitivity * competitiveness + ownTariffEffect - worldTariffCost
  const tradeBalance = netExports * 100

  return { netExports, tradeBalance }
}

/**
 * Population Migration.
 *
 * People move from lower quality-of-life countries to higher ones, gated
 * by immigration policy. Quality of life is a composite index of GDP per
 * capita, healthcare, education, employment, and price stability.
 */
export function computeMigration(
  resources: PlayerResources,
  policies: PolicyChoices,
  world: WorldState
): { netMigrationRate: number; qualityOfLife: number } {
  const normalize = (val: number, min: number, max: number) =>
    Math.max(0, Math.min(1, (val - min) / (max - min)))

  const qualityOfLife =
    0.4 * normalize(resources.gdpPerCapita, 20000, 80000) +
    0.2 * (resources.healthcareIndex / 100) +
    0.15 * (resources.educationIndex / 100) +
    0.15 * (1 - resources.unemployment / 25) +
    0.10 * Math.max(0, 1 - Math.abs(resources.inflation - 2) / 20)

  const migrationPull = qualityOfLife - world.avgQualityOfLife
  const gate = PARAMS.immigrationGate[policies.immigrationPolicy]
  const netMigrationRate = migrationPull * PARAMS.migrationSensitivity * gate

  return { netMigrationRate, qualityOfLife }
}

/**
 * QE / Money Supply effect on inflation.
 *
 * Quantitative easing expands the money supply. Excess money growth
 * (above real GDP growth) creates inflationary pressure, fed into the
 * Phillips Curve as a supply shock.
 */
export function computeQEEffect(
  resources: PlayerResources,
  policies: PolicyChoices,
  gdpGrowthRate: number
): { supplyShock: number; moneySupplyIndex: number } {
  const moneyGrowth = PARAMS.qeMoneyGrowth[policies.qeStance]
  const moneySupplyIndex = resources.moneySupplyIndex * (1 + moneyGrowth)
  const excessMoneyGrowth = moneyGrowth - gdpGrowthRate
  const supplyShock = excessMoneyGrowth * PARAMS.qeInflationFactor

  return { supplyShock, moneySupplyIndex }
}

// --- Random Events ---

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

// --- Resolution Interfaces ---

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

// --- Core Macro Functions ---

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
  const expectedInflation = resources.inflation * 0.7 + PARAMS.targetInflation * 0.3
  const newInflation = expectedInflation + lambda * outputGap * 100 + supplyShock
  return Math.max(-5, Math.min(50, newInflation))
}

/**
 * Apply the IS Curve (Aggregate Demand)
 * y = y* - β(i + RP - π - r*) + G + NX + capitalFlowGdpEffect
 *
 * Now accepts net exports and capital flow GDP effect from cross-country interactions.
 * Trade deficit risk premium: persistent trade deficits raise borrowing costs.
 */
function applyISCurve(
  resources: PlayerResources,
  policies: PolicyChoices,
  netExports: number = 0,
  capitalFlowGdpEffect: number = 0,
  beta: number = PARAMS.defaultBeta
): number {
  let riskPremium = resources.debtToGdp > 100 ? (resources.debtToGdp - 100) * 0.05 : 0
  // Twin deficit risk premium: trade deficit worsens borrowing conditions
  if (resources.tradeBalance < -3) {
    riskPremium += Math.abs(resources.tradeBalance + 3) * PARAMS.tradeDeficitRiskPremium
  }
  const realRateDiff = resources.interestRate + riskPremium - resources.inflation - PARAMS.neutralRealRate
  const govSpending = (policies.govSpendingEducation + policies.govSpendingHealthcare + policies.govSpendingInfrastructure) / 100

  const gdpGrowthRate = -beta * realRateDiff / 100 + govSpending * 0.3 + netExports + capitalFlowGdpEffect
  return resources.potentialGdp * (1 + gdpGrowthRate)
}

/**
 * Apply government budget identity
 * ΔD = G - T + iD + tradeDeficitSpillover
 *
 * Trade deficits spill into national debt (twin deficits hypothesis).
 */
function applyBudgetIdentity(
  resources: PlayerResources,
  policies: PolicyChoices,
  tradeBalance: number = 0
): number {
  const govSpendingPct = policies.govSpendingEducation + policies.govSpendingHealthcare + policies.govSpendingInfrastructure
  const taxRevenuePct = policies.taxRate
  const interestCostPct = resources.interestRate * resources.debtToGdp / 100
  const tradeDeficitSpillover = Math.max(0, -tradeBalance * PARAMS.tradeDeficitDebtSpillover)

  const deficit = govSpendingPct - taxRevenuePct + interestCostPct + tradeDeficitSpillover
  return Math.max(0, resources.debtToGdp + deficit / 4)
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

  // Mage effects (monetary policy) - enhanced CBRF when mage focus is high
  if (assignment.mage.assignment === 'inflation_targeting' && assignment.mage.focus >= 3) {
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

  // Diplomat effects (trade & immigration) — diplomat immigration bonus is now
  // handled through the migration system; keep the focus effect as a small direct boost
  const diplomatEffect = focusEffects[assignment.diplomat.focus].effectiveness
  if (assignment.diplomat.assignment === 'immigration_policy') {
    const baseImmigration = policies.immigrationPolicy === 'open' ? 0.025 : policies.immigrationPolicy === 'moderate' ? 0.01 : 0.0
    result.population = result.population * (1 + baseImmigration * diplomatEffect / 4)
  }

  return result
}

/**
 * Apply population dynamics with cross-country migration.
 * Natural birth/death rates remain; migration is additive from world context.
 */
function applyPopulationDynamics(
  resources: PlayerResources,
  netMigrationRate: number = 0
): number {
  const baseBirthRate = 0.01
  const baseDeathRate = 0.008
  const healthcareBonus = resources.healthcareIndex / 10000
  const deathRate = Math.max(0.002, baseDeathRate - healthcareBonus)

  const quarterlyGrowth = (baseBirthRate - deathRate + netMigrationRate) / 4
  return Math.max(1_000_000, resources.population * (1 + quarterlyGrowth))
}

// --- Player Resolution ---

/**
 * Resolve a single player's quarter against the world state.
 */
function resolvePlayer(input: ResolutionInput, scoringWeights: ScoringWeights, world: WorldState): PlayerOutcome {
  let resources = { ...input.resources }
  const events: GameEvent[] = []

  // 1. Cabinet effects
  resources = applyCabinetEffects(resources, input.policies, input.policies.cabinetAssignment)

  // 2. QE effect — compute supply shock and update money supply
  const prevGdp = resources.gdp
  const gdpGrowthRate = prevGdp > 0 ? (resources.gdp - resources.potentialGdp) / resources.potentialGdp : 0
  const qeEffect = computeQEEffect(resources, input.policies, gdpGrowthRate)

  // 3. CBRF or manual interest rate
  if (input.policies.cbrfAutopilot) {
    const mageEffect = focusEffects[input.policies.cabinetAssignment.mage.focus].effectiveness
    resources.interestRate = applyCBRF(resources, PARAMS.defaultAlpha * mageEffect, PARAMS.defaultGamma * mageEffect)
  } else {
    resources.interestRate = input.policies.interestRate
  }

  // 4. Capital flows (UIP)
  const capitalFlows = computeCapitalFlows(resources, input.policies, world)

  // 5. Net exports (trade)
  const trade = computeNetExports(resources, input.policies, world)

  // 6. IS Curve (AD) with NX + capital flow GDP effect
  resources.gdp = applyISCurve(resources, input.policies, trade.netExports, capitalFlows.gdpEffect)

  // 7. Phillips Curve with QE supply shock
  resources.inflation = applyPhillipsCurve(resources, PARAMS.defaultLambda, qeEffect.supplyShock)

  // 8. Migration
  const migration = computeMigration(resources, input.policies, world)

  // 9. Population dynamics with migration
  resources.population = applyPopulationDynamics(resources, migration.netMigrationRate)

  // 10. GDP per capita
  resources.gdpPerCapita = resources.gdp / resources.population

  // 11. Budget identity with trade deficit
  resources.debtToGdp = applyBudgetIdentity(resources, input.policies, trade.tradeBalance)

  // 12. Exchange rate from capital flows
  resources.exchangeRate = resources.exchangeRate * (1 + capitalFlows.exchangeRateChange)

  // 13. Unemployment via Okun's Law
  const outputRatio = resources.gdp / resources.potentialGdp
  resources.unemployment = Math.max(0, Math.min(25, (1 - Math.sqrt(outputRatio)) * 100 + 5))

  // 14. Store new fields
  resources.tradeBalance = trade.tradeBalance
  resources.moneySupplyIndex = qeEffect.moneySupplyIndex
  resources.qualityOfLife = migration.qualityOfLife

  // 15. Update tax rate
  resources.taxRate = input.policies.taxRate

  // 16. Apply random events
  for (const event of RANDOM_EVENTS) {
    if (Math.random() < event.probability) {
      const result = event.apply(resources)
      resources = result.resources
      events.push(result.event)
    }
  }

  // 17. Check for crises
  if (resources.debtToGdp > 150) {
    events.push({ type: 'crisis', title: 'Debt Crisis', description: 'Debt exceeds 150% of GDP. Austerity measures required.', impact: { debtToGdp: 5 } })
  }
  if (resources.inflation > 20) {
    events.push({ type: 'crisis', title: 'Hyperinflation', description: 'Inflation exceeds 20%. Currency collapsing.', impact: { inflation: 0 } })
  }

  // 18. Calculate score
  const scoreBreakdown = calculateScore(resources, input.startingResources, input.quartersPlayed, scoringWeights)

  return {
    score: scoreBreakdown.total,
    resources,
    scoreBreakdown,
    events,
  }
}

// --- Equilibrium Convergence ---

/**
 * Check if world state has converged between iterations.
 * Returns true if max absolute change across all averaged metrics < threshold.
 */
function worldStateHasConverged(prev: WorldState, next: WorldState, threshold: number): boolean {
  const diffs = [
    Math.abs(prev.avgInterestRate - next.avgInterestRate),
    Math.abs(prev.avgInflation - next.avgInflation),
    Math.abs(prev.avgExchangeRate - next.avgExchangeRate),
    Math.abs(prev.avgQualityOfLife - next.avgQualityOfLife),
  ]
  return Math.max(...diffs) < threshold
}

// --- Main Resolution ---

/**
 * Resolve an entire quarter for all players.
 *
 * Two economic model modes:
 * - 'lagged' (default): Single-pass. WorldState computed from previous-quarter resources.
 * - 'equilibrium': Iterative. Players resolved multiple times until WorldState stabilizes.
 */
export function resolveQuarterLogic(
  inputs: ResolutionInput[],
  scoringWeights: ScoringWeights,
  economicModel: EconomicModel = 'lagged'
): ResolutionResult {
  let playerOutcomes: Record<string, PlayerOutcome> = {}
  const snapshots: Record<string, PlayerResources & { score: number; rank: number }> = {}

  if (economicModel === 'equilibrium') {
    // Iterative convergence mode
    let world = computeWorldState(inputs)

    for (let iter = 0; iter < PARAMS.maxIterations; iter++) {
      playerOutcomes = {}
      for (const input of inputs) {
        playerOutcomes[input.playerId] = resolvePlayer(input, scoringWeights, world)
      }

      // Build updated inputs from outcomes for next world state computation
      const updatedInputs: ResolutionInput[] = inputs.map(input => ({
        ...input,
        resources: playerOutcomes[input.playerId].resources,
      }))
      const nextWorld = computeWorldState(updatedInputs)

      if (worldStateHasConverged(world, nextWorld, PARAMS.convergenceThreshold)) {
        break
      }
      world = nextWorld
    }
  } else {
    // Lagged mode (default): single pass with world state from current resources
    const world = computeWorldState(inputs)
    for (const input of inputs) {
      playerOutcomes[input.playerId] = resolvePlayer(input, scoringWeights, world)
    }
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
