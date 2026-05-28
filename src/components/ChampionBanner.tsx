import { fetchFixtures, fetchTeams, fetchAllLiveStates } from "@/lib/data";
import { resolveS2Playoffs } from "@/lib/tournament";
import ChampionBannerClient from "./ChampionBannerClient";

export default async function ChampionBanner() {

    try {
        const teams = await fetchTeams(2);
        const rawFixtures = await fetchFixtures(2);
        const liveStates = await fetchAllLiveStates();
        
        // resolveS2Playoffs resolves real winners for eliminators/finals, stamping f.winner
        const fixtures = resolveS2Playoffs(rawFixtures, teams, liveStates);

        let champion: { name: string; color: string } | null = null;
        const final = fixtures.find(f => f.stage?.trim() === "Final");

        if (final && final.winner?.trim() && final.winner.trim() !== "TBD" && !final.winner.trim().includes("Winner")) {
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
