'use client'

import { Suspense } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Panel } from '@/components/tui/Panel'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  async function handleSignIn() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <pre className="text-terminal-green text-xs leading-tight inline-block text-left">
{`╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ███████╗ ██████╗ ██████╗ ███╗   ██╗                    ║
║   ██╔════╝██╔════╝██╔═══██╗████╗  ██║                    ║
║   █████╗  ██║     ██║   ██║██╔██╗ ██║                    ║
║   ██╔══╝  ██║     ██║   ██║██║╚██╗██║                    ║
║   ███████╗╚██████╗╚██████╔╝██║ ╚████║                    ║
║   ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝                    ║
║                                                          ║
║        ECONOMICS STRATEGY GAME                           ║
║        Multiplayer Cabinet Management                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝`}
        </pre>
      </div>

      <div className="w-full max-w-md">
        <Panel title="AUTHENTICATION REQUIRED" borderStyle="double">
          <div className="space-y-4 text-sm text-center">
            {error && (
              <div className="text-terminal-red text-xs border border-terminal-red px-2 py-1">
                {error === 'auth_failed' ? 'Authentication failed. Please try again.' : 'An error occurred.'}
              </div>
            )}

            <p className="text-terminal-bright-black text-xs">
              Sign in with your Google account to access the game.
            </p>

            <button
              onClick={handleSignIn}
              className="w-full px-4 py-3 bg-terminal-green text-terminal-background font-bold text-sm hover:bg-terminal-green/80 transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
