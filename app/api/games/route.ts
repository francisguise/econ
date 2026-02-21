import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { SCORING_PRESETS, DEFAULT_PLAYER_RESOURCES, ScoringPreset } from '@/lib/types/game'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('games')
    .select('*, game_players(id, user_id, player_name, player_emoji)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-player-id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing player ID' }, { status: 401 })
  }

  const body = await request.json()
  const {
    name,
    scoringPreset = 'balanced_growth',
    totalQuarters = 40,
    quarterDurationSeconds = 300,
    maxPlayers = 10,
    visibilityMode = 'full',
    playerName,
    playerEmoji = '👑',
  } = body

  if (!name || !playerName) {
    return NextResponse.json({ error: 'Name and playerName are required' }, { status: 400 })
  }

  const weights = SCORING_PRESETS[scoringPreset as ScoringPreset] || SCORING_PRESETS.balanced_growth

  const supabase = createServiceClient()

  // Create game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      name,
      status: 'waiting',
      current_quarter: 0,
      total_quarters: totalQuarters,
      quarter_duration_seconds: quarterDurationSeconds,
      visibility_mode: visibilityMode,
      max_players: maxPlayers,
      scoring_preset: scoringPreset,
      scoring_weights: weights,
      created_by: userId,
    })
    .select()
    .single()

  if (gameError || !game) {
    return NextResponse.json({ error: gameError?.message || 'Failed to create game' }, { status: 500 })
  }

  // Auto-join creator
  const { error: joinError } = await supabase
    .from('game_players')
    .insert({
      game_id: game.id,
      user_id: userId,
      player_name: playerName,
      player_emoji: playerEmoji,
      player_score: 0,
      player_resources: DEFAULT_PLAYER_RESOURCES,
    })

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 })
  }

  // Create cabinet for creator
  await supabase
    .from('cabinets')
    .insert({
      game_id: game.id,
      player_id: userId,
    })

  return NextResponse.json(game, { status: 201 })
}
