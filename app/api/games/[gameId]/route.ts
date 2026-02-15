import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { gameId: string } }
) {
  const supabase = createServiceClient()

  // Fetch game with players in a single joined query (matches game list pattern)
  const { data: gameWithPlayers, error: gameError } = await supabase
    .from('games')
    .select('*, game_players(*)')
    .eq('id', params.gameId)
    .single()

  if (gameError || !gameWithPlayers) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  // Separate game and players from the joined result
  const { game_players: players, ...game } = gameWithPlayers

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
    players: (players || []).sort((a: { player_score: number }, b: { player_score: number }) => b.player_score - a.player_score),
    playerCount: (players || []).length,
    currentQuarter,
    submissions: submissions || [],
    snapshots: snapshots || [],
  })
}
