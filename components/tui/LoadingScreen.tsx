'use client'

import { useState, useEffect } from 'react'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-terminal-background">
      <div className="text-center space-y-2">
        <div className="text-terminal-green text-sm font-mono">
          <span className="animate-pulse">{'>'}</span> {message}{dots}
        </div>
        <div className="text-terminal-bright-black text-xs font-mono">
          ████████░░░░░░░░
        </div>
      </div>
    </div>
  )
}
