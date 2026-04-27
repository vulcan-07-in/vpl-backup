import { fetchFixtures, fetchTeams, fetchSquads } from "@/lib/data";
import SquadsClient from "./squads-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Squads | Varchasva Premier League",
    description: "Complete team rosters, captains, and players for Varchasva.",
};

export default async function SquadsPage() {
    const data = await fetchSquads();
    return <SquadsClient initialData={data} />;
}
