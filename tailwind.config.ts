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
        'terminal-background': '#0C0C0C',
        'terminal-foreground': '#CCCCCC',
        'terminal-border': '#808080',
        'terminal-green': '#00FF00',
        'terminal-cyan': '#00FFFF',
        'terminal-yellow': '#FFFF00',
        'terminal-red': '#FF0000',
        'terminal-magenta': '#FF00FF',
        'terminal-blue': '#0000FF',
        'terminal-white': '#FFFFFF',
        'terminal-bright-black': '#808080',
        'terminal-bright-red': '#FF8080',
        'terminal-bright-green': '#80FF80',
        'terminal-bright-yellow': '#FFFF80',
        'terminal-bright-blue': '#8080FF',
        'terminal-bright-magenta': '#FF80FF',
        'terminal-bright-cyan': '#80FFFF',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
