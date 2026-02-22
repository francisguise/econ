export type ThemeId = 'classic' | 'solarized-dark' | 'solarized-light' | 'deep-purple' | 'amber-crt' | 'nord' | 'gruvbox'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  /** Preview swatch colors */
  preview: { bg: string; fg: string; accent: string }
}

export const themes: ThemeDefinition[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Original dark terminal',
    preview: { bg: '#0C0C0C', fg: '#CCCCCC', accent: '#00FF00' },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    description: 'Ethan Schoonover\'s dark palette',
    preview: { bg: '#002b36', fg: '#839496', accent: '#859900' },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    description: 'Ethan Schoonover\'s light palette',
    preview: { bg: '#fdf6e3', fg: '#586e75', accent: '#2aa198' },
  },
  {
    id: 'deep-purple',
    name: 'Deep Purple',
    description: 'Rich purple hacker vibes',
    preview: { bg: '#1a0a2e', fg: '#d4c4f0', accent: '#a78bfa' },
  },
  {
    id: 'amber-crt',
    name: 'Amber CRT',
    description: 'Retro amber phosphor monitor',
    preview: { bg: '#1a1000', fg: '#ffb000', accent: '#ffd700' },
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic, north-bluish palette',
    preview: { bg: '#2e3440', fg: '#d8dee9', accent: '#88c0d0' },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    description: 'Retro groove warm tones',
    preview: { bg: '#282828', fg: '#ebdbb2', accent: '#b8bb26' },
  },
]

export const DEFAULT_THEME: ThemeId = 'classic'
