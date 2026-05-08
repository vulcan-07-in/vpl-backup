import { fetchFixtures, fetchTeams } from "@/lib/data";
import MatchesClient from "./matches-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Matches | Varchasva Premier League",
    description: "Match schedule and live results for VPL Season 2.",
};

export default async function MatchesPage() {
    const teams = await fetchTeams(2);
    const fixtures = await fetchFixtures(2);

    return <MatchesClient fixtures={fixtures} teams={teams} />;
}
