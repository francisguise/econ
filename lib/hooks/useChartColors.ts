'use client'

import { useState, useEffect } from 'react'

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function useChartColors() {
  const [colors, setColors] = useState({
    background: '#0C0C0C',
    border: '#808080',
    cyan: '#00FFFF',
    green: '#00FF00',
    red: '#FF0000',
    yellow: '#FFFF00',
    blue: '#0000FF',
  })

  useEffect(() => {
    function read() {
      setColors({
        background: getCSSVar('--terminal-background') || '#0C0C0C',
        border: getCSSVar('--terminal-border') || '#808080',
        cyan: getCSSVar('--terminal-cyan') || '#00FFFF',
        green: getCSSVar('--terminal-green') || '#00FF00',
        red: getCSSVar('--terminal-red') || '#FF0000',
        yellow: getCSSVar('--terminal-yellow') || '#FFFF00',
        blue: getCSSVar('--terminal-blue') || '#0000FF',
      })
    }

    read()

    // Re-read when theme changes (observe data-theme attribute)
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return colors
}
