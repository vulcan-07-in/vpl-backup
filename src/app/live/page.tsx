import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import LiveViewerClient from "./live-client";
import { Metadata } from "next";

export const revalidate = 0;

export const metadata: Metadata = {
    title: "Live Match | Varchasva Premier League",
    description: "Watch live scores from the ongoing Varchasva Premier League match.",
};

export default async function LivePage({ searchParams }: { searchParams: Promise<{ matchId?: string }> }) {
    const fixtures = await fetchFixtures();
    const teams = await fetchTeams();
    const params = await searchParams;

    return <LiveViewerClient fixtures={fixtures} teams={teams} initialMatchId={params.matchId} />;
}
