import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { fetchFixtures, fetchTeams, fetchAllLiveStates } from "@/lib/data";
import {
    computeBaseSeeds,
    computePlayoffRankings,
    resolveS2Playoffs,
} from "@/lib/tournament";

export const dynamic = 'force-dynamic';

// Diagnostic endpoint: exposes full playoff seeding trace for debugging.
export async function GET() {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const fixtures = await fetchFixtures(2);
        const teams = await fetchTeams(2);
        const liveStates = await fetchAllLiveStates();

        const groupMatches = fixtures.filter(f => ["A", "B", "C"].includes(f.group) && !f.isFunMatch);
        const groupStageComplete = groupMatches.length > 0 && groupMatches.every(f => !!(f.winner));

        const baseSeeds = computeBaseSeeds(fixtures, teams, liveStates);
        const resolvedFixtures = resolveS2Playoffs(fixtures, teams, liveStates);
        const liveRanks = computePlayoffRankings(resolvedFixtures, teams, liveStates);
        const survivors = liveRanks.filter(r => !r.isEliminated);

        // Show raw eliminator fixture data (before resolution)
        const rawEliminators = fixtures.filter(f => f.stage.startsWith("Eliminator") && !f.isFunMatch);
        const rawElimInfo = rawEliminators.map(f => {
            const cleanId = String(f.matchNo).trim().replace(/[^A-Za-z0-9]/g, "").toLowerCase();
            const ls = liveStates[cleanId] ?? liveStates[String(f.matchNo).trim()] ?? null;
            return {
                matchNo: f.matchNo,
                stage: f.stage,
                team1_in_db: f.team1,
                team2_in_db: f.team2,
                winner_in_db: f.winner,
                liveState_winner: ls?.winner ?? null,
                liveState_status: ls?.status ?? null,
            };
        });

        // Show resolved eliminator fixtures (after Pass 1)
        const resolvedEliminators = resolvedFixtures.filter(f => f.stage.startsWith("Eliminator"));

        const qualifiers = resolvedFixtures.filter(f => f.stage.startsWith("Qualifier"));

        return NextResponse.json({
            groupStageComplete,
            groupMatchCount: groupMatches.length,
            groupMatchesCompleted: groupMatches.filter(f => f.winner).length,
            baseSeeds,
            rawElimInfo,
            resolvedEliminators,
            liveRanks,
            survivors,
            qualifiers,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}

