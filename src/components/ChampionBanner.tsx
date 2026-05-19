import { fetchFixtures, fetchTeams } from "@/lib/data";
import ChampionBannerClient from "./ChampionBannerClient";

export default async function ChampionBanner() {

    try {
        const teams = await fetchTeams(2);
        const fixtures = await fetchFixtures(2);

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

        if (!champion) return null;

        return <ChampionBannerClient champion={champion} />;
    } catch (e) {
        // Silently fail during build / when DB is unavailable
        return null;
    }
}
