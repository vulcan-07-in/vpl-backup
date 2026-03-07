import { fetchSquadsData } from "@/lib/tournament";
import SquadsClient from "./squads-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Squads | Varchasva Premier League",
    description: "Complete team rosters, captains, and players for Varchasva.",
};

export default async function SquadsPage() {
    // Fetch data perfectly on the server with ISR (revalidates every 60s)
    const teams = await fetchSquadsData();

    return <SquadsClient teams={teams} />;
}
