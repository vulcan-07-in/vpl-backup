import { fetchFixtures, fetchTeams } from "@/lib/data";
import HomeClient from "./home-client";
import Redis from "ioredis";

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
  const redis = new Redis(process.env.REDIS_URL || "");
  const [startTimeStr, endTimeStr] = await Promise.all([
    redis.get("vpl_auction_start_time"),
    redis.get("vpl_auction_end_time"),
  ]);
  const auctionStartTime = startTimeStr || "2026-05-20T17:00:00+05:30";
  const auctionEndTime = endTimeStr || "2026-05-20T21:00:00+05:30";

  return <HomeClient champion={champion} auctionStartTime={auctionStartTime} auctionEndTime={auctionEndTime} />;
}
