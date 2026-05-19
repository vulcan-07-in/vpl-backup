import { fetchFixtures, fetchTeams } from "@/lib/data";
import HomeClient from "./home-client";

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

  return <HomeClient champion={champion} />;
}
