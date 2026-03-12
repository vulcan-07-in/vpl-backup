import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import PointsClient from "./points-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Standings | Varchasva Premier League",
    description: "Current points table and group standings for the VPL.",
};

export default async function PointsPage() {
    // Fetch data perfectly on the server with ISR (revalidates every 60s)
    const teams = await fetchTeams();
    const fixtures = await fetchFixtures();

    return <PointsClient fixtures={fixtures} teams={teams} />;
}
