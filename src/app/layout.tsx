import type { Metadata } from "next";
import { Geist, Geist_Mono, Bebas_Neue, Rajdhani } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ChampionBanner from "@/components/ChampionBanner";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Brand display font — used for VARCHASVA wordmark & hero titles
const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

// Section heading font — bold, condensed, sporty
const rajdhani = Rajdhani({
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Varchasva Premier League Season 2 (VPL S2)",
  description: "Official tournament hub for the Varchasva Premier League (VPL) Season 2. View live scores, standings, matches, squad sheets, and the live auction dashboard.",
  keywords: ["VPL", "Varchasva Premier League", "Varchasva", "Cricket", "College Cricket", "Live Scores", "Auction", "S2"],
  openGraph: {
    title: "Varchasva Premier League Season 2 (VPL S2)",
    description: "Official tournament hub for the Varchasva Premier League (VPL) Season 2. View live scores, standings, matches, squad sheets, and the live auction dashboard.",
    url: "https://varchasva-premier-league.vercel.app",
    siteName: "Varchasva Premier League",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Varchasva Premier League Season 2 (VPL S2)",
    description: "Official tournament hub for the Varchasva Premier League (VPL) Season 2. View live scores, standings, matches, squad sheets, and the live auction dashboard.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${rajdhani.variable} antialiased bg-black text-white`}
      >
        <div className="relative w-full overflow-x-hidden min-h-screen flex flex-col">
          <div className="ambient-bg" />
          <Navbar />
          {children}
          <ChampionBanner />
        </div>
        <AnalyticsTracker />
        <Analytics />
      </body>
    </html>
  );
}
