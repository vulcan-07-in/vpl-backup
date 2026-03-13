import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import MatchReportClient from "./match-report-client";
import { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { matchId: string } }): Promise<Metadata> {
    const fixtures = await fetchFixtures();
    const fixture = fixtures.find(f => f.matchNo === params.matchId);
    const title = fixture
        ? `${fixture.team1} vs ${fixture.team2} – Match ${fixture.matchNo}`
        : `Match ${params.matchId}`;
    return {
        title: `${title} | VPL`,
        description: `Full scorecard and match report for ${title} in the Varchasva Premier League.`,
    };
}

export default async function MatchReportPage({ params }: { params: { matchId: string } }) {
    const fixtures = await fetchFixtures();
    const teams = await fetchTeams();
    const fixture = fixtures.find(f => f.matchNo === params.matchId);

    return <MatchReportClient matchId={params.matchId} fixture={fixture ?? null} teams={teams} />;
}
