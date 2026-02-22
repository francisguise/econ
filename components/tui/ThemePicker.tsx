'use client'

import { useState } from 'react'
import { Panel } from './Panel'
import { themes, ThemeId } from '@/lib/assets/terminal-theme'
import { useTheme } from '@/lib/hooks/useTheme'

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const [expanded, setExpanded] = useState(false)

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-terminal-bright-black hover:text-terminal-foreground"
      >
        [Theme: {themes.find(t => t.id === theme)?.name || 'Classic'}]
      </button>
    )
  }

  return (
    <Panel title="THEME">
      <div className="space-y-1">
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => { setTheme(t.id as ThemeId); setExpanded(false) }}
            className={`flex items-center gap-2 w-full text-left px-2 py-1 text-xs ${
              theme === t.id
                ? 'bg-terminal-bright-black text-terminal-foreground'
                : 'text-terminal-bright-black hover:text-terminal-foreground hover:bg-terminal-bright-black/50'
            }`}
          >
            {/* Color swatches */}
            <span className="flex gap-0.5 shrink-0">
              <span className="w-3 h-3 inline-block border border-terminal-border" style={{ backgroundColor: t.preview.bg }} />
              <span className="w-3 h-3 inline-block border border-terminal-border" style={{ backgroundColor: t.preview.fg }} />
              <span className="w-3 h-3 inline-block border border-terminal-border" style={{ backgroundColor: t.preview.accent }} />
            </span>
            <span className="font-bold">{t.name}</span>
            <span className="text-terminal-bright-black">{t.description}</span>
            {theme === t.id && <span className="ml-auto text-terminal-green">*</span>}
          </button>
        ))}
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-terminal-bright-black hover:text-terminal-foreground mt-1"
        >
          [Close]
        </button>
      </div>
    </Panel>
  )
}
