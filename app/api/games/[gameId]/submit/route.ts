import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validatePolicies } from '@/lib/game-logic/validation'

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  // Upsert submission
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

  // Check if all players have submitted
  const { data: allPlayers } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', params.gameId)
    .eq('is_active', true)

  const { data: allSubmissions } = await supabase
    .from('player_submissions')
    .select('id')
    .eq('quarter_id', quarter.id)

  const allSubmitted = allPlayers && allSubmissions &&
    allSubmissions.length >= allPlayers.length

  // If all submitted, trigger early resolution
  if (allSubmitted) {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    fetch(`${baseUrl}/api/resolve-quarter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quarterId: quarter.id,
        gameId: params.gameId,
      }),
    }).catch(console.error) // Fire and forget
  }

  return NextResponse.json({
    success: true,
    allSubmitted: !!allSubmitted,
  })
}
