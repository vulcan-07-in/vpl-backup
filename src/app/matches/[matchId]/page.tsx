import { fetchFixtures, fetchTeams, resolveKnockouts } from "@/lib/tournament";
import { getAllLiveStates } from "@/lib/redis-server";
import MatchReportClient from "./match-report-client";
import { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
    const fixtures = await fetchFixtures();
    const resolvedParams = await params;
    
    const cleanId = (id: string) => decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const tId = cleanId(resolvedParams.matchId);
    
    const fixture = fixtures.find(f => cleanId(f.matchNo) === tId);
    const title = fixture
        ? `${fixture.team1} vs ${fixture.team2} – Match ${fixture.matchNo}`
        : `Match ${decodeURIComponent(resolvedParams.matchId)}`;
    return {
        title: `${title} | VPL`,
        description: `Full scorecard and match report for ${title} in the Varchasva Premier League.`,
    };
}

export default async function MatchReportPage({ params }: { params: Promise<{ matchId: string }> }) {
    const [fixtures, teams, liveStates, resolvedParams] = await Promise.all([
        fetchFixtures(),
        fetchTeams(),
        getAllLiveStates(),
        params
    ]);
    
    // Resolve knockouts so we get actual team names instead of TBD placeholders
    const resolvedFixtures = resolveKnockouts(fixtures, teams, {}, liveStates);

    // Robust cleanup to ignore spaces, special characters, and casing
    const cleanId = (id: string) => decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const tId = cleanId(resolvedParams.matchId);
    
    // Find from the RESOLVED list
    const fixture = resolvedFixtures.find(f => cleanId(f.matchNo) === tId);
    
    const exactMatchId = fixture ? fixture.matchNo : decodeURIComponent(resolvedParams.matchId).trim();

    return <MatchReportClient matchId={exactMatchId} fixture={fixture ?? null} teams={teams} />;
}
