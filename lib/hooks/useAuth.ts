'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth(): { user: User | null; userId: string | null; isLoaded: boolean } {
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabase()

    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user)
      setIsLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: User } | null) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, userId: user?.id ?? null, isLoaded }
}
