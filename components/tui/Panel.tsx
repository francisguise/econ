'use client'

import { ReactNode } from 'react'
import { BorderStyle } from '@/lib/assets/box-chars'

interface PanelProps {
  title?: string
  children: ReactNode
  borderStyle?: BorderStyle
  className?: string
}

export function Panel({ title, children, borderStyle = 'single', className = '' }: PanelProps) {
  const isDouble = borderStyle === 'double'

  const borderClass = isDouble
    ? 'border-2 border-terminal-border'
    : 'border border-terminal-border'

  return (
    <div className={`${borderClass} bg-terminal-background ${className}`}>
      {title && (
        <div className={`px-3 py-1 ${isDouble ? 'border-b-2' : 'border-b'} border-terminal-border`}>
          <span className="text-terminal-cyan font-bold text-sm tracking-wider">
            {isDouble ? '═ ' : '─ '}{title}{isDouble ? ' ═' : ' ─'}
          </span>
        </div>
      )}
      <div className="p-3">
        {children}
      </div>
    </div>
  )
}
