'use client'

import { MinisterRole } from '@/lib/types/cabinet'
import { ministerDefinitions } from '@/lib/assets/minister-roles'

interface MinisterNotificationProps {
  minister: MinisterRole
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  onDismiss?: () => void
}

const typeStyles = {
  info: 'border-terminal-cyan text-terminal-cyan',
  success: 'border-terminal-green text-terminal-green',
  warning: 'border-terminal-yellow text-terminal-yellow',
  error: 'border-terminal-red text-terminal-red',
}

export function MinisterNotification({ minister, message, type = 'info', onDismiss }: MinisterNotificationProps) {
  const ministerInfo = ministerDefinitions[minister]

  return (
    <div className={`font-mono text-sm p-2 border-l-4 ${typeStyles[type]} bg-terminal-background`}>
      <div className="flex items-start gap-2">
        <span className="text-2xl shrink-0">{ministerInfo.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xs">{ministerInfo.title}:</div>
          <div className="text-terminal-foreground text-xs">{message}</div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-terminal-bright-black hover:text-terminal-foreground text-xs"
          >
            [x]
          </button>
        )}
      </div>
    </div>
  )
}
