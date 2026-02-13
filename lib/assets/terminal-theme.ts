export const terminalColors = {
  background: '#0C0C0C',
  foreground: '#CCCCCC',
  border: '#808080',

  black: '#000000',
  red: '#FF0000',
  green: '#00FF00',
  yellow: '#FFFF00',
  blue: '#0000FF',
  magenta: '#FF00FF',
  cyan: '#00FFFF',
  white: '#FFFFFF',

  brightBlack: '#808080',
  brightRed: '#FF8080',
  brightGreen: '#80FF80',
  brightYellow: '#FFFF80',
  brightBlue: '#8080FF',
  brightMagenta: '#FF80FF',
  brightCyan: '#80FFFF',
  brightWhite: '#FFFFFF',
} as const

export const semanticColors = {
  title: terminalColors.cyan,
  label: terminalColors.yellow,
  value: terminalColors.white,
  success: terminalColors.green,
  error: terminalColors.red,
  warning: terminalColors.yellow,
  inactive: terminalColors.brightBlack,
  highlight: terminalColors.magenta,
} as const
