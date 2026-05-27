import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateAdminRequest } from "@/lib/auth";
import { fetchTeams, fetchAllLiveStates } from "@/lib/data";
import { resolveS2Playoffs, type Fixture } from "@/lib/tournament";

export const dynamic = 'force-dynamic';

export async function GET() {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: matches, error } = await supabase
            .from("Match")
            .select("*")
            .order("createdAt", { ascending: true });

        if (error) throw error;

        const sorted = (matches || []).sort((a: any, b: any) => {
            if (a.scheduledTime && b.scheduledTime) {
                const timeA = new Date(a.scheduledTime).getTime();
                const timeB = new Date(b.scheduledTime).getTime();
                if (timeA !== timeB) return timeA - timeB;
            }
            const numA = parseInt(a.matchNo.replace(/[^0-9]/g, "")) || 999;
            const numB = parseInt(b.matchNo.replace(/[^0-9]/g, "")) || 999;
            if (numA !== numB) return numA - numB;
            return a.matchNo.localeCompare(b.matchNo);
        });

        // Resolve S2 playoff seeding so auto-seeded names appear in admin panel
        const teams = await fetchTeams(2);
        const liveStates = await fetchAllLiveStates();
        
        // Build fixture-like objects from raw match data for resolveS2Playoffs
        const fixtureMapper = (m: any): Fixture => ({
            matchNo: m.matchNo,
            stage: m.stage,
            group: m.group || "-",
            team1: m.team1Name || m.team1Id || "TBD",
            team2: m.team2Name || m.team2Id || "TBD",
            winner: m.winnerName || "",
            sortOrder: 0,
            isFunMatch: m.isFunMatch || false,
            tossWinner: m.tossWinnerName || undefined,
            tossDecision: m.tossDecision || undefined,
            scheduledTime: m.scheduledTime || undefined,
        });

        // Check if we have team name fields already populated (from a joined query)
        // The raw admin data has team IDs, not names. We need to map them.
        const teamMap: Record<string, { name: string; shortName: string }> = {};
        teams.forEach(t => {
            if (t.id) teamMap[t.id] = { name: t.teamName, shortName: t.shortName };
        });

        const enriched = sorted.map((m: any) => ({
            ...m,
            team1Name: teamMap[m.team1Id]?.name || m.team1Id,
            team2Name: teamMap[m.team2Id]?.name || m.team2Id,
            team1ShortName: teamMap[m.team1Id]?.shortName || "?",
            team2ShortName: teamMap[m.team2Id]?.shortName || "?",
            winnerName: m.winnerId ? (teamMap[m.winnerId]?.name || m.winnerId) : "",
            tossWinnerName: m.tossWinnerId ? (teamMap[m.tossWinnerId]?.name || m.tossWinnerId) : "",
        }));

        // Build fixture list for seeding resolution
        const fixturesForResolve: Fixture[] = enriched.map(fixtureMapper);
        const resolved = resolveS2Playoffs(fixturesForResolve, teams, liveStates);

        // Apply resolved team names back to admin data
        const resolvedMap = new Map(resolved.map(f => [f.matchNo, f]));
        const finalData = enriched.map((m: any) => {
            const r = resolvedMap.get(m.matchNo);
            if (r) {
                return {
                    ...m,
                    team1Name: r.team1,
                    team2Name: r.team2,
                };
            }
            return m;
        });

        return NextResponse.json(finalData);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
