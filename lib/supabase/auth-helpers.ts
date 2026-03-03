import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function createAuthClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can fail in Server Components (read-only cookies).
            // This is fine — the middleware handles refresh.
          }
        },
      },
    }
  )
}

export async function getAuthUser() {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
