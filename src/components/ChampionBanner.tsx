import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import { getAllLiveStates } from "@/lib/redis-server";
import ChampionBannerClient from "./ChampionBannerClient";

export default async function ChampionBanner() {
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

    if (!champion) return null;

    return <ChampionBannerClient champion={champion} />;
}
