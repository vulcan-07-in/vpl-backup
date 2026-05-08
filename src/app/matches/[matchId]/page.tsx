import { fetchFixtures, fetchTeams } from "@/lib/data";
import MatchReportClient from "./match-report-client";
import { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
    const fixtures = await fetchFixtures(2);
    const resolvedParams = await params;

    const cleanId = (id: string) => decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const tId = cleanId(resolvedParams.matchId);

    const fixture = fixtures.find(f => cleanId(f.matchNo) === tId);
    const title = fixture
        ? `${fixture.team1} vs ${fixture.team2} – Match ${fixture.matchNo}`
        : `Match ${decodeURIComponent(resolvedParams.matchId)}`;
    return {
        title: `${title} | VPL`,
        description: `Full scorecard and match report for ${title} in the Varchasva Premier League Season 2.`,
    };
}

export default async function MatchReportPage({ params }: { params: Promise<{ matchId: string }> }) {
    const fixtures = await fetchFixtures(2);
    const teams = await fetchTeams(2);
    const resolvedParams = await params;

    const cleanId = (id: string) => decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const tId = cleanId(resolvedParams.matchId);

    const fixture = fixtures.find(f => cleanId(f.matchNo) === tId);

    // Use the raw exact matchNo from the fixture for perfect Redis key matching
    const exactMatchId = fixture ? fixture.matchNo : decodeURIComponent(resolvedParams.matchId).trim();

    return <MatchReportClient matchId={exactMatchId} fixture={fixture ?? null} teams={teams} />;
}
