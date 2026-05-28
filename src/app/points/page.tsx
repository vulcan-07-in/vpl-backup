import { fetchFixtures, fetchTeams, fetchAllLiveStates } from "@/lib/data";
import PointsClient from "./points-client";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: "Standings | Varchasva Premier League",
    description: "Current points table and group standings for the VPL Season 2.",
};

export default async function PointsPage() {
    const teams = await fetchTeams(2);
    const fixtures = await fetchFixtures(2);
    const liveStates = await fetchAllLiveStates();

    return <PointsClient fixtures={fixtures} teams={teams} liveStates={liveStates} />;
}
