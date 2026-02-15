import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_PLAYER_RESOURCES } from '@/lib/types/game'

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const userId = request.headers.get('x-player-id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing player ID' }, { status: 401 })
  }

  const { playerName, playerEmoji = '🎯' } = await request.json()

  if (!playerName) {
    return NextResponse.json({ error: 'playerName is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check game exists and is waiting
  const { data: game } = await supabase
    .from('games')
    .select('*, game_players(id)')
    .eq('id', params.gameId)
    .single()

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  if (game.status !== 'waiting') {
    return NextResponse.json({ error: 'Game has already started', status: game.status }, { status: 400 })
  }

  if (game.game_players.length >= game.max_players) {
    return NextResponse.json({ error: 'Game is full', playerCount: game.game_players.length, maxPlayers: game.max_players }, { status: 400 })
  }

  // Check not already joined
  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', params.gameId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already joined this game', userId, existingId: existing.id }, { status: 400 })
  }

  // Join
  const { data: player, error } = await supabase
    .from('game_players')
    .insert({
      game_id: params.gameId,
      user_id: userId,
      player_name: playerName,
      player_emoji: playerEmoji,
      player_score: 0,
      player_resources: DEFAULT_PLAYER_RESOURCES,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create cabinet
  await supabase
    .from('cabinets')
    .insert({
      game_id: params.gameId,
      player_id: userId,
    })

  return NextResponse.json(player, { status: 201 })
}
