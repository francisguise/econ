import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { gameId: string } }
) {
  const supabase = createServiceClient()

  // Fetch game with players
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', params.gameId)
    .single()

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  // Fetch players
  const { data: players, error: playersError } = await supabase
    .from('game_players')
    .select('*')
    .eq('game_id', params.gameId)
    .order('player_score', { ascending: false })

  if (playersError) {
    console.error('Error fetching players:', playersError)
  }

  // Fetch current quarter
  const { data: currentQuarter } = await supabase
    .from('quarters')
    .select('*')
    .eq('game_id', params.gameId)
    .eq('status', 'active')
    .single()

  // Fetch submissions for current quarter
  let submissions: Record<string, unknown>[] = []
  if (currentQuarter) {
    const { data } = await supabase
      .from('player_submissions')
      .select('player_id, submitted_at')
      .eq('quarter_id', currentQuarter.id)

    submissions = data || []
  }

  // Fetch snapshots for charts
  const { data: snapshots } = await supabase
    .from('quarter_snapshots')
    .select('*')
    .eq('game_id', params.gameId)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    game,
    players: players || [],
    playerCount: (players || []).length,
    currentQuarter,
    submissions: submissions || [],
    snapshots: snapshots || [],
  })
}
