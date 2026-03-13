import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import MatchReportClient from "./match-report-client";
import { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { matchId: string } }): Promise<Metadata> {
    const fixtures = await fetchFixtures();
    const cleanId = (id: string) => decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const tId = cleanId(params.matchId);
    
    const fixture = fixtures.find(f => cleanId(f.matchNo) === tId);
    const title = fixture
        ? `${fixture.team1} vs ${fixture.team2} – Match ${fixture.matchNo}`
        : `Match ${decodeURIComponent(params.matchId)}`;
    return {
        title: `${title} | VPL`,
        description: `Full scorecard and match report for ${title} in the Varchasva Premier League.`,
    };
}

export default async function MatchReportPage({ params }: { params: { matchId: string } }) {
    const fixtures = await fetchFixtures();
    const teams = await fetchTeams();
    
    // Robust cleanup to ignore spaces, special characters, and casing
    const cleanId = (id: string) => decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const tId = cleanId(params.matchId);
    
    const fixture = fixtures.find(f => cleanId(f.matchNo) === tId);
    
    // Use the raw exact matchNo from the fixture if available. This guarantees perfect Redis key matching
    // since the scorer saves match state using selectedMatch.matchNo.
    const exactMatchId = fixture ? fixture.matchNo : decodeURIComponent(params.matchId).trim();

    return <MatchReportClient matchId={exactMatchId} fixture={fixture ?? null} teams={teams} />;
}
