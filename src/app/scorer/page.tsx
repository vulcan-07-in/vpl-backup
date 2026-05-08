import { fetchFixtures, fetchTeams, fetchSquads } from "@/lib/data";
import ScorerClient from "./scorer-client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Metadata } from "next";

export const revalidate = 0;
export const metadata: Metadata = {
    title: "VPL Live Scorer",
    description: "Admin dashboard for live match scoring — Season 2.",
};

export default async function ScorerPage() {
    const fixtures = await fetchFixtures(2);
    const teams = await fetchTeams(2);
    const squadsData = await fetchSquads(2);

    // Map squads into easily accessible dictionary of names with robust matching
    const squadDictionary: Record<string, string[]> = {};
    for (const team of teams) {
        const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9 ]/gi, '');
        const teamNameNormalized = normalize(team.teamName);
        const teamSquad = squadsData.find(s => normalize(s.teamName) === teamNameNormalized);
        squadDictionary[team.teamName] = teamSquad?.players?.map((p: any) => p.name) || [];
    }

    return (
        <ErrorBoundary>
            <ScorerClient fixtures={fixtures} teams={teams} squads={squadDictionary} />
        </ErrorBoundary>
    );
}
