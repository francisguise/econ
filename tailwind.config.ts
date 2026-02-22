import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'terminal-background': 'var(--terminal-background)',
        'terminal-foreground': 'var(--terminal-foreground)',
        'terminal-border': 'var(--terminal-border)',
        'terminal-green': 'var(--terminal-green)',
        'terminal-cyan': 'var(--terminal-cyan)',
        'terminal-yellow': 'var(--terminal-yellow)',
        'terminal-red': 'var(--terminal-red)',
        'terminal-magenta': 'var(--terminal-magenta)',
        'terminal-blue': 'var(--terminal-blue)',
        'terminal-white': 'var(--terminal-white)',
        'terminal-bright-black': 'var(--terminal-bright-black)',
        'terminal-bright-red': 'var(--terminal-bright-red)',
        'terminal-bright-green': 'var(--terminal-bright-green)',
        'terminal-bright-yellow': 'var(--terminal-bright-yellow)',
        'terminal-bright-blue': 'var(--terminal-bright-blue)',
        'terminal-bright-magenta': 'var(--terminal-bright-magenta)',
        'terminal-bright-cyan': 'var(--terminal-bright-cyan)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
