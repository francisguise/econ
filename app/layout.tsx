import type { Metadata } from "next";
import { JetBrains_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: "Economics Strategy Game",
  description: "Multiplayer phase-based economics strategy game with cabinet ministers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#00FF00',
          colorBackground: '#0C0C0C',
          colorText: '#CCCCCC',
          colorInputBackground: '#0C0C0C',
          colorInputText: '#CCCCCC',
          fontFamily: 'JetBrains Mono, monospace',
        },
      }}
    >
      <html lang="en" className={jetbrainsMono.variable}>
        <body className="font-mono bg-terminal-background text-terminal-foreground min-h-screen">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
