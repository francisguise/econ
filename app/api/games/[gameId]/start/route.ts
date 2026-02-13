import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const userId = request.headers.get('x-player-id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing player ID' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch game
  const { data: game } = await supabase
    .from('games')
    .select('*, game_players(id)')
    .eq('id', params.gameId)
    .single()

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  if (game.created_by !== userId) {
    return NextResponse.json({ error: 'Only the creator can start the game' }, { status: 403 })
  }

  if (game.status !== 'waiting') {
    return NextResponse.json({ error: 'Game has already started' }, { status: 400 })
  }

  if (game.game_players.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 })
  }

  const now = new Date()
  const endsAt = new Date(now.getTime() + game.quarter_duration_seconds * 1000)

  // Create first quarter
  const { error: quarterError } = await supabase
    .from('quarters')
    .insert({
      game_id: params.gameId,
      quarter_number: 1,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'active',
    })

  if (quarterError) {
    return NextResponse.json({ error: quarterError.message }, { status: 500 })
  }

  // Update game status
  const { error: gameError } = await supabase
    .from('games')
    .update({ status: 'active', current_quarter: 1 })
    .eq('id', params.gameId)

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Game started' })
}
