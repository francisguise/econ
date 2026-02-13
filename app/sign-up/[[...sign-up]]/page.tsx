import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-terminal-background">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-[#1a1a1a] border border-terminal-border shadow-none',
            headerTitle: 'text-terminal-green font-mono',
            headerSubtitle: 'text-terminal-bright-black font-mono',
            formFieldLabel: 'text-terminal-cyan font-mono text-xs',
            formFieldInput: 'bg-terminal-background border-terminal-border text-terminal-foreground font-mono',
            formButtonPrimary: 'bg-terminal-green text-terminal-background font-mono hover:bg-terminal-green/80',
            footerActionLink: 'text-terminal-cyan font-mono',
          },
        }}
      />
    </div>
  )
}
