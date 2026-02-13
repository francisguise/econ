export const boxChars = {
  // Single line
  horizontal: '─',
  vertical: '│',
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  leftT: '├',
  rightT: '┤',
  topT: '┬',
  bottomT: '┴',
  cross: '┼',

  // Double line
  doubleHorizontal: '═',
  doubleVertical: '║',
  doubleTopLeft: '╔',
  doubleTopRight: '╗',
  doubleBottomLeft: '╚',
  doubleBottomRight: '╝',
  doubleCross: '╬',
  doubleLeftT: '╠',
  doubleRightT: '╣',
  doubleTopT: '╦',
  doubleBottomT: '╩',

  // Shading
  lightShade: '░',
  mediumShade: '▒',
  darkShade: '▓',
  block: '█',
  shade: '░',

  // Arrows
  leftArrow: '←',
  rightArrow: '→',
  upArrow: '↑',
  downArrow: '↓',

  // Other
  bullet: '•',
  diamond: '◆',
  star: '★',
  play: '▶',
  triangleUp: '▲',
  triangleDown: '▼',
} as const

export type BorderStyle = 'single' | 'double'

export function getBorderChars(style: BorderStyle) {
  if (style === 'double') {
    return {
      topLeft: boxChars.doubleTopLeft,
      topRight: boxChars.doubleTopRight,
      bottomLeft: boxChars.doubleBottomLeft,
      bottomRight: boxChars.doubleBottomRight,
      horizontal: boxChars.doubleHorizontal,
      vertical: boxChars.doubleVertical,
    }
  }
  return {
    topLeft: boxChars.topLeft,
    topRight: boxChars.topRight,
    bottomLeft: boxChars.bottomLeft,
    bottomRight: boxChars.bottomRight,
    horizontal: boxChars.horizontal,
    vertical: boxChars.vertical,
  }
}
