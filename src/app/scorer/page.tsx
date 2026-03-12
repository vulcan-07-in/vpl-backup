import { fetchFixtures, fetchTeams, fetchSquads } from "@/lib/tournament";
import ScorerClient from "./scorer-client";
import { Metadata } from "next";

export const revalidate = 0; // Ensure live data on refresh
export const metadata: Metadata = {
    title: "VPL Live Scorer",
    description: "Admin dashboard for live match scoring.",
};

export default async function ScorerPage() {
    const fixtures = await fetchFixtures();
    const teams = await fetchTeams();
    const squadsData = await fetchSquads();

    // Map squads into easily accessible dictionary of names with robust matching
    const squadDictionary: Record<string, string[]> = {};
    for (const team of teams) {
        const teamNameLower = team.teamName.trim().toLowerCase();
        const teamSquad = squadsData.find(s => s.teamName.trim().toLowerCase() === teamNameLower);
        squadDictionary[team.teamName] = teamSquad?.players?.map((p: any) => p.name) || [];
    }

    return <ScorerClient fixtures={fixtures} teams={teams} squads={squadDictionary} />;
}
