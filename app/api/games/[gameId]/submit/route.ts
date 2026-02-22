import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validatePolicies } from '@/lib/game-logic/validation'
import { executeQuarterResolution } from '@/lib/game-logic/resolveQuarter'

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const userId = request.headers.get('x-player-id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing player ID' }, { status: 401 })
  }

  const { policies } = await request.json()

  if (!policies) {
    return NextResponse.json({ error: 'policies is required' }, { status: 400 })
  }

  // Validate policies
  const errors = validatePolicies(policies)
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Invalid policies', details: errors }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch game to get resolution mode
  const { data: gameData } = await supabase
    .from('games')
    .select('resolution_mode')
    .eq('id', params.gameId)
    .single()

  const resolutionMode = gameData?.resolution_mode || 'timer'

  // Verify player is in this game
  const { data: player } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', params.gameId)
    .eq('user_id', userId)
    .single()

  if (!player) {
    return NextResponse.json({ error: 'You are not in this game' }, { status: 403 })
  }

  // Get active quarter
  const { data: quarter } = await supabase
    .from('quarters')
    .select('id')
    .eq('game_id', params.gameId)
    .eq('status', 'active')
    .single()

  if (!quarter) {
    return NextResponse.json({ error: 'No active quarter' }, { status: 400 })
  }

  // In all_submit mode, check if player already submitted (no resubmit allowed)
  if (resolutionMode === 'all_submit') {
    const { data: existing } = await supabase
      .from('player_submissions')
      .select('id')
      .eq('quarter_id', quarter.id)
      .eq('player_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
    }
  }

  // Upsert submission (in timer mode this allows resubmit; in all_submit mode we checked above)
  const { error: submitError } = await supabase
    .from('player_submissions')
    .upsert(
      {
        quarter_id: quarter.id,
        game_id: params.gameId,
        player_id: userId,
        policies,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'quarter_id,player_id' }
    )

  if (submitError) {
    return NextResponse.json({ error: submitError.message }, { status: 500 })
  }

  // In timer mode, don't trigger early resolution — wait for timer expiry
  if (resolutionMode === 'timer') {
    return NextResponse.json({
      success: true,
      allSubmitted: false,
    })
  }

  // In all_submit mode, check if all players have submitted and trigger resolution
  const { data: allPlayers } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', params.gameId)
    .eq('is_active', true)

  const { data: allSubmissions } = await supabase
    .from('player_submissions')
    .select('id')
    .eq('quarter_id', quarter.id)

  const playerCount = allPlayers?.length ?? 0
  const submissionCount = allSubmissions?.length ?? 0
  const allSubmitted = playerCount > 0 && submissionCount >= playerCount

  if (allSubmitted) {
    let resolutionError = false
    try {
      const resolveResult = await executeQuarterResolution(quarter.id, params.gameId)
      if (!resolveResult.success) {
        resolutionError = true
      }
    } catch {
      resolutionError = true
    }

    return NextResponse.json({
      success: true,
      allSubmitted: true,
      resolutionError,
      debug: { playerCount, submissionCount },
    })
  }

  return NextResponse.json({
    success: true,
    allSubmitted: false,
    debug: { playerCount, submissionCount },
  })
}
