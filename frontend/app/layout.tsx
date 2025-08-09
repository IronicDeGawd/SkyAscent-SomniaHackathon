import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixelify",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sky-ascent-somnia-hackathon.vercel.app/"),
  title: "Sky Ascent - Farcaster Mini App",
  description:
    "Navigate your balloon through obstacles, collect powerups, and compete on blockchain leaderboards",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Sky Ascent - Farcaster Mini App",
    description:
      "Navigate your balloon through obstacles, collect powerups, and compete on blockchain leaderboards",
    images: ["/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sky Ascent - Farcaster Mini App",
    description:
      "Navigate your balloon through obstacles, collect powerups, and compete on blockchain leaderboards",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <meta
          name="fc:miniapp"
          content='{"version":"1","name":"Sky Ascent","iconUrl":"https://sky-ascent-somnia-hackathon.vercel.app/logo.png","homeUrl":"https://sky-ascent-somnia-hackathon.vercel.app","imageUrl":"https://sky-ascent-somnia-hackathon.vercel.app/logo.png","button":{"text":"🎈 Play Now","action":"play"}}'
        />
      </head>
      <body className={`${pixelifySans.variable} font-pixelify`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
