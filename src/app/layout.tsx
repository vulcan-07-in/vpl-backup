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
  title: "Varchasva Premier League",
  description: "Official hub for the Varchasva college cricket tournament.",
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
