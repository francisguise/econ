import { PlayerResources, ScoringWeights, ScoreBreakdown } from '@/lib/types/game'

/**
 * Calculate stability score
 * stability = 100 - |inflation - 2%| × 10 - |debt/GDP - 60%| × 50 - |unemployment - 5%| × 10
 */
export function calculateStabilityScore(resources: PlayerResources): number {
  const inflationPenalty = Math.abs(resources.inflation - 2.0) * 10
  const debtPenalty = Math.abs(resources.debtToGdp - 60) * 0.5
  const unemploymentPenalty = Math.abs(resources.unemployment - 5.0) * 10

  return Math.max(0, Math.min(100, 100 - inflationPenalty - debtPenalty - unemploymentPenalty))
}

/**
 * Calculate the full score for a player given their current resources,
 * starting resources, and quarters played.
 */
export function calculateScore(
  current: PlayerResources,
  starting: PlayerResources,
  quartersPlayed: number,
  weights: ScoringWeights
): ScoreBreakdown {
  if (quartersPlayed === 0) {
    return {
      gdpGrowthComponent: 0,
      gdpPerCapitaComponent: 0,
      populationComponent: 0,
      stabilityComponent: 0,
      penalties: 0,
      total: 0,
    }
  }

  // Annualize growth rates (4 quarters per year)
  const yearsPlayed = quartersPlayed / 4

  // GDP growth (annualized average)
  const gdpGrowthTotal = (current.gdp - starting.gdp) / starting.gdp
  const gdpGrowthAnnual = yearsPlayed > 0 ? (Math.pow(1 + gdpGrowthTotal, 1 / yearsPlayed) - 1) * 100 : 0
  const gdpGrowthComponent = gdpGrowthAnnual * 3 * weights.gdpGrowth * 100

  // GDP per capita growth (annualized average)
  const pcGrowthTotal = (current.gdpPerCapita - starting.gdpPerCapita) / starting.gdpPerCapita
  const pcGrowthAnnual = yearsPlayed > 0 ? (Math.pow(1 + pcGrowthTotal, 1 / yearsPlayed) - 1) * 100 : 0
  const gdpPerCapitaComponent = pcGrowthAnnual * 3 * weights.gdpPerCapitaGrowth * 100

  // Population growth (total %)
  const populationGrowthPct = ((current.population - starting.population) / starting.population) * 100
  const populationComponent = populationGrowthPct * 0.2 * weights.populationGrowth * 100

  // Stability score (current quarter)
  const stability = calculateStabilityScore(current)
  const stabilityComponent = stability * 0.2 * weights.stabilityScore * 100

  // Penalties
  let penalties = 0
  if (current.debtToGdp > 150) penalties -= 50
  if (current.inflation > 20) penalties -= 100
  // Depression: GDP < 90% of potential for extended periods
  if (current.gdp < current.potentialGdp * 0.9) penalties -= 10

  const total = gdpGrowthComponent + gdpPerCapitaComponent + populationComponent + stabilityComponent + penalties

  return {
    gdpGrowthComponent,
    gdpPerCapitaComponent,
    populationComponent,
    stabilityComponent,
    penalties,
    total,
  }
}
