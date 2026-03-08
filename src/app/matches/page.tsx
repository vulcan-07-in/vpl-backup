import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import MatchesClient from "./matches-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Matches | Varchasva Premier League",
    description: "Match schedule and live results for the Varchasva Premier League.",
};

export default async function MatchesPage() {
    // Fetch data perfectly on the server with ISR (revalidates every 60s)
    const teams = await fetchTeams();
    const fixtures = await fetchFixtures();

    return <MatchesClient fixtures={fixtures} teams={teams} />;
}
