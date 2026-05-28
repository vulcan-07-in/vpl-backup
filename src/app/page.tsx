import { fetchFixtures, fetchTeams } from "@/lib/data";
import HomeClient from "./home-client";
import { redis } from "@/lib/redis";

export const revalidate = 60;

export default async function Home() {
  // Fetch S2 data on the server with ISR
  const [teams, fixtures] = await Promise.all([
    fetchTeams(2),
    fetchFixtures(2),
  ]);

  let champion: { name: string; color: string } | null = null;
  const final = fixtures.find(f => f.stage?.trim() === "Final");

  if (final && final.winner?.trim()) {
    const winnerName = final.winner.trim();
    const team = teams.find(t => t.teamName === winnerName);
    champion = {
      name: winnerName,
      color: team?.color ?? "#EAB308",
    };
  }

  // Fetch auction timer from Redis
  const [startTimeStr, endTimeStr] = await Promise.all([
    redis.get("vpl_auction_start_time"),
    redis.get("vpl_auction_end_time"),
  ]);
  const auctionStartTime = startTimeStr || "2026-05-20T17:00:00+05:30";
  const auctionEndTime = endTimeStr || "2026-05-20T21:00:00+05:30";

  // Rich Schema.org sports event structured data for AI chatbots & search engines
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": "Varchasva Premier League Season 2 (S2)",
    "description": "Official hub for the Varchasva Premier League (VPL) Season 2. Track live scores, view the complete player auction dashboard, browse team standings, and view squad rosters.",
    "startDate": "2026-05-29T18:00:00+05:30",
    "endDate": "2026-06-01T21:00:00+05:30",
    "eventStatus": "https://schema.org/EventScheduled",
    "location": {
      "@type": "Place",
      "name": "Saraswati Hall / Tournament Grounds",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Tournament Venue",
        "addressCountry": "IN"
      }
    },
    "organizer": {
      "@type": "Organization",
      "name": "Varchasva",
      "url": "https://varchasva-premier-league.vercel.app"
    },
    "sponsor": [
      {
        "@type": "Organization",
        "name": "Patil Biryani"
      },
      {
        "@type": "Organization",
        "name": "Chitralaya Cineverse"
      },
      {
        "@type": "Organization",
        "name": "The Cafe Meraki",
        "description": "Rewards Partner"
      }
    ],
    "about": {
      "@type": "SportsOrganization",
      "name": "Varchasva Premier League",
      "sport": "Cricket"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient champion={champion} auctionStartTime={auctionStartTime} auctionEndTime={auctionEndTime} />
    </>
  );
}
