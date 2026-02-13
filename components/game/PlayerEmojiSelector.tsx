'use client'

import { Panel } from '@/components/tui/Panel'
import { AVAILABLE_PLAYER_EMOJIS } from '@/lib/types/game'

interface PlayerEmojiSelectorProps {
  onSelect: (emoji: string) => void
  current?: string
}

export function PlayerEmojiSelector({ onSelect, current }: PlayerEmojiSelectorProps) {
  return (
    <Panel title="Choose Your Emoji">
      <div className="grid grid-cols-8 gap-2">
        {AVAILABLE_PLAYER_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className={`text-3xl p-2 hover:bg-terminal-bright-black transition-colors ${
              current === emoji ? 'bg-terminal-bright-black ring-1 ring-terminal-cyan' : ''
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </Panel>
  )
}
