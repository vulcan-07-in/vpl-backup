import { fetchSquads } from "@/lib/data";
import SquadsClient from "./squads-client";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: "Squads | Varchasva Premier League",
    description: "Complete team rosters, captains, and players for VPL Season 2.",
};

export default async function SquadsPage() {
    const data = await fetchSquads(2);
    return <SquadsClient initialData={data} />;
}
