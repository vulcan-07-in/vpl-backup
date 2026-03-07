import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import FixturesClient from "./fixtures-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Fixtures | Varchasva Premier League",
    description: "Match schedule and results for the Varchasva Premier League.",
};

export default async function FixturesPage() {
    // Fetch data perfectly on the server with ISR (revalidates every 60s)
    const teams = await fetchTeams();
    const fixtures = await fetchFixtures();

    return <FixturesClient fixtures={fixtures} teams={teams} />;
}
