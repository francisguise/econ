'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Panel } from '@/components/tui/Panel'

export default function PendingPage() {
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserSupabase()
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { email?: string } | null } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? null)
    })
  }, [router])

  async function handleSignOut() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <Panel title="AWAITING APPROVAL" borderStyle="double">
          <div className="space-y-4 text-sm text-center">
            <p className="text-terminal-yellow text-xs">
              Your account has not been approved yet.
            </p>

            {email && (
              <p className="text-terminal-bright-black text-xs">
                Signed in as: <span className="text-terminal-cyan">{email}</span>
              </p>
            )}

            <p className="text-terminal-bright-black text-xs">
              Contact the game administrator to request access.
            </p>

            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 border border-terminal-border text-terminal-foreground hover:bg-terminal-bright-black text-sm"
            >
              Sign Out
            </button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
