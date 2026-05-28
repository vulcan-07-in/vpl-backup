import { fetchFixtures, fetchTeams, fetchAllLiveStates } from "@/lib/data";
import MatchesClient from "./matches-client";
import { Metadata } from "next";
import { resolveS2Playoffs } from "@/lib/tournament";

export const metadata: Metadata = {
    title: "Matches | Varchasva Premier League",
    description: "Match schedule and live results for VPL Season 2.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MatchesPage() {
    const teams = await fetchTeams(2);
    const fixtures = await fetchFixtures(2);
    const liveStates = await fetchAllLiveStates();

    const resolvedFixtures = resolveS2Playoffs(fixtures, teams, liveStates);

    return <MatchesClient fixtures={resolvedFixtures} teams={teams} />;
}
