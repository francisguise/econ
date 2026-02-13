import type { Metadata } from "next";
import { JetBrains_Mono } from 'next/font/google'
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
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="font-mono bg-terminal-background text-terminal-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
