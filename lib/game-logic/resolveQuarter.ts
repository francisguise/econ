import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { resolveQuarterLogic, ResolutionInput } from './resolution'
import { DEFAULT_PLAYER_RESOURCES, PolicyChoices, ScoringWeights } from '@/lib/types/game'

const DEFAULT_POLICIES: PolicyChoices = {
  cabinetAssignment: {
    warrior: { focus: 2, assignment: 'tariff_management' },
    mage: { focus: 3, assignment: 'interest_rate_control' },
    engineer: { focus: 3, assignment: 'infrastructure' },
    diplomat: { focus: 2, assignment: 'trade_negotiations' },
  },
  interestRate: 4.0,
  cbrfAutopilot: true,
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

function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}

export interface ResolveResult {
  success: boolean
  error?: string
  playerOutcomes?: number
  quarter?: number
}

/**
 * Core quarter resolution logic. Called directly (no HTTP self-fetch).
 * Returns { success: true } or { success: false, error: '...' }.
 */
export async function executeQuarterResolution(quarterId: string, gameId: string): Promise<ResolveResult> {
  const supabase = createServiceClient()

  // 1. Atomically mark quarter as resolving (only if still active)
  const { data: updated, error: updateErr } = await supabase
    .from('quarters')
    .update({ status: 'resolving' })
    .eq('id', quarterId)
    .eq('status', 'active')
    .select('id')

  if (updateErr || !updated || updated.length === 0) {
    return { success: false, error: 'Quarter already resolving or completed' }
  }

  // 2. Get player submissions for this quarter
  const { data: submissions } = await supabase
    .from('player_submissions')
    .select('*')
    .eq('quarter_id', quarterId)

  const submissionMap = new Map<string, PolicyChoices>()
  if (submissions) {
    for (const sub of submissions) {
      submissionMap.set(sub.player_id, sub.policies as PolicyChoices)
    }
  }

  // 3. Load game state with players
  const { data: game } = await supabase
    .from('games')
    .select('*, game_players(*)')
    .eq('id', gameId)
    .single()

  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  // 4. Build resolution inputs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs: ResolutionInput[] = game.game_players.map((player: Record<string, any>) => ({
    playerId: player.user_id,
    resources: player.player_resources || DEFAULT_PLAYER_RESOURCES,
    policies: submissionMap.get(player.user_id) || DEFAULT_POLICIES,
    startingResources: DEFAULT_PLAYER_RESOURCES,
    quartersPlayed: game.current_quarter,
  }))

  // 5. Run resolution
  const scoringWeights: ScoringWeights = game.scoring_weights || {
    gdpGrowth: 0.3,
    gdpPerCapitaGrowth: 0.3,
    populationGrowth: 0.2,
    stabilityScore: 0.2,
  }

  const result = resolveQuarterLogic(inputs, scoringWeights)

  // 6. Update player scores and resources
  for (const [playerId, outcome] of Object.entries(result.playerOutcomes)) {
    await supabase
      .from('game_players')
      .update({
        player_score: Math.round(outcome.score),
        player_resources: outcome.resources,
      })
      .eq('game_id', gameId)
      .eq('user_id', playerId)
  }

  // 7. Store results
  await supabase.from('quarter_results').insert({
    quarter_id: quarterId,
    game_id: gameId,
    calculated_state: result.newState,
    player_outcomes: result.playerOutcomes,
  })

  // 8. Store snapshots for charts
  const snapshots = Object.entries(result.snapshots).map(([playerId, metrics]) => ({
    quarter_id: quarterId,
    game_id: gameId,
    player_id: playerId,
    metrics,
  }))
  if (snapshots.length > 0) {
    await supabase.from('quarter_snapshots').insert(snapshots)
  }

  // 9. Mark quarter complete
  await supabase
    .from('quarters')
    .update({ status: 'completed' })
    .eq('id', quarterId)

  // 10. Clean up submissions for this quarter
  await supabase
    .from('player_submissions')
    .delete()
    .eq('quarter_id', quarterId)

  // 11. Create next quarter or end game
  if (game.current_quarter < game.total_quarters) {
    const nextQuarterNumber = game.current_quarter + 1
    const now = new Date()
    const endsAt = new Date(now.getTime() + game.quarter_duration_seconds * 1000)

    await supabase.from('quarters').insert({
      game_id: gameId,
      quarter_number: nextQuarterNumber,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'active',
    })

    await supabase
      .from('games')
      .update({ current_quarter: nextQuarterNumber })
      .eq('id', gameId)
  } else {
    await supabase
      .from('games')
      .update({ status: 'completed' })
      .eq('id', gameId)
  }

  return {
    success: true,
    playerOutcomes: Object.keys(result.playerOutcomes).length,
    quarter: game.current_quarter,
  }
}
