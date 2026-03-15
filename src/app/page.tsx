import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import { getAllLiveStates } from "@/lib/redis-server";
import HomeClient from "./home-client";

export default async function Home() {
  // Fetch data on the server with ISR
  const [teams, fixtures, liveStates] = await Promise.all([
    fetchTeams(),
    fetchFixtures(),
    getAllLiveStates()
  ]);

  let champion: { name: string; color: string } | null = null;
  const final = fixtures.find(f => f.stage?.trim() === "Final");

  if (final) {
    const winnerName = final.winner?.trim() || liveStates[final.matchNo]?.winner?.trim();
    if (winnerName && winnerName !== "TIE" && winnerName !== "ABANDONED") {
      const team = teams.find(t => t.teamName === winnerName);
      champion = {
        name: winnerName,
        color: team?.color ?? "#EAB308",
      };
    }
  }

  return <HomeClient champion={champion} />;
}
