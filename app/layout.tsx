import type { Metadata } from 'next'
import { Pixelify_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const pixelifySans = Pixelify_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-pixelify',
  display: 'swap',
  preload: true
})

export const metadata: Metadata = {
  title: 'Sky Ascent - Farcaster Mini App',
  description: 'Navigate your balloon through the skies in this addictive arcade game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="fc:miniapp" content='{"version":"1","name":"Sky Ascent","iconUrl":"https://skyascent.game/icon.png","homeUrl":"https://skyascent.game","imageUrl":"https://skyascent.game/preview.png","button":{"text":"🎈 Play Now","action":"play"}}' />
      </head>
      <body className={`${pixelifySans.variable} font-pixelify`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}