import { fetchSquads, fetchAllLiveStates } from "@/lib/data";
import { calculateAllPlayerStats } from "@/lib/mvp";
import SquadsClient from "./squads-client";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: "Squads | Varchasva Premier League",
    description: "Complete team rosters, captains, and players for VPL Season 2.",
};

export default async function SquadsPage() {
    const data = await fetchSquads(2);
    const liveStates = await fetchAllLiveStates();
    const stats = calculateAllPlayerStats(liveStates);
    return <SquadsClient initialData={data} playerStats={stats} />;
}

