import { fetchFixtures, fetchTeams } from "@/lib/data";
import LiveViewerClient from "./live-client";
import { Metadata } from "next";

export const revalidate = 0;

export const metadata: Metadata = {
    title: "Live Match | Varchasva Premier League",
    description: "Watch live scores from the ongoing VPL Season 2 match.",
};

export default async function LivePage({ searchParams }: { searchParams: Promise<{ matchId?: string }> }) {
    const fixtures = await fetchFixtures(2);
    const teams = await fetchTeams(2);
    const params = await searchParams;

    return <LiveViewerClient fixtures={fixtures} teams={teams} initialMatchId={params.matchId} />;
}
