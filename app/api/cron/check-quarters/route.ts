import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Find all active quarters that have expired
    const { data: quarters } = await supabase
      .from('quarters')
      .select('id, game_id')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())

    if (!quarters || quarters.length === 0) {
      return NextResponse.json({ resolved: 0, message: 'No quarters to resolve' })
    }

    // Resolve each expired quarter
    let resolved = 0
    for (const quarter of quarters) {
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const response = await fetch(`${baseUrl}/api/resolve-quarter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quarterId: quarter.id,
            gameId: quarter.game_id,
          }),
        })

        if (response.ok) {
          resolved++
        } else {
          console.error(`Failed to resolve quarter ${quarter.id}:`, await response.text())
        }
      } catch (error) {
        console.error(`Error resolving quarter ${quarter.id}:`, error)
      }
    }

    return NextResponse.json({
      resolved,
      total: quarters.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Cron check failed' }, { status: 500 })
  }
}
