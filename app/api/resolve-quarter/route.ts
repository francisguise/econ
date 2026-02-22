import { NextResponse } from 'next/server'
import { executeQuarterResolution } from '@/lib/game-logic/resolveQuarter'

export async function POST(request: Request) {
  const { quarterId, gameId } = await request.json()

  if (!quarterId || !gameId) {
    return NextResponse.json({ error: 'Missing quarterId or gameId' }, { status: 400 })
  }

  try {
    const result = await executeQuarterResolution(quarterId, gameId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Resolution error:', error)
    return NextResponse.json({ error: 'Resolution failed' }, { status: 500 })
  }
}
