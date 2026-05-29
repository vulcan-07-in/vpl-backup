import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fetchFixtures, fetchSquads, fetchTeams, fetchAllLiveStates } from "@/lib/data";
import { resolveS2Playoffs } from "@/lib/tournament";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { redis } from "@/lib/redis";

// GET — return S2 fixtures from Supabase
export async function GET() {
    try {
        const fixtures = await fetchFixtures(2);
        const teams = await fetchTeams(2);
        const liveStates = await fetchAllLiveStates();
        const resolved = resolveS2Playoffs(fixtures, teams, liveStates);
        return NextResponse.json(resolved);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// POST — write/update matches via Supabase (S2 admin only)
export async function POST(request: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = await request.json();

        if (payload.action === "sync_result" && payload.matchNo && payload.winner) {
            // Look up winner team ID
            const { data: teamRow, error: teamErr } = await supabase
                .from("Team")
                .select("id")
                .eq("name", payload.winner)
                .single();
            if (teamErr) throw new Error(teamErr.message);

            const { error } = await supabase
                .from("Match")
                .update({ winnerId: teamRow.id, status: "COMPLETED" })
                .eq("matchNo", payload.matchNo);
            if (error) throw new Error(error.message);

            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/stats");
            revalidatePath("/playoffs");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "create_match") {
            const now = new Date().toISOString();
            
            let group = payload.group || null;
            let team1Id = payload.team1Id;
            let team2Id = payload.team2Id;

            // Handle manual string entry for fun matches
            if (payload.isFunMatch) {
                const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                
                if (!isUuid(team1Id)) {
                    const { data: existing } = await supabase.from("Team").select("id").ilike("name", team1Id.trim()).single();
                    if (existing) {
                        team1Id = existing.id;
                    } else {
                        const newId = randomUUID();
                        const { error } = await supabase.from("Team").insert({ id: newId, name: team1Id.trim(), shortName: team1Id.trim().substring(0, 3).toUpperCase(), groupId: "-", purse: 0 });
                        if (error) throw new Error("Failed to create fun team 1: " + error.message);
                        team1Id = newId;
                    }
                }
                if (!isUuid(team2Id)) {
                    const { data: existing } = await supabase.from("Team").select("id").ilike("name", team2Id.trim()).single();
                    if (existing) {
                        team2Id = existing.id;
                    } else {
                        const newId = randomUUID();
                        const { error } = await supabase.from("Team").insert({ id: newId, name: team2Id.trim(), shortName: team2Id.trim().substring(0, 3).toUpperCase(), groupId: "-", purse: 0 });
                        if (error) throw new Error("Failed to create fun team 2: " + error.message);
                        team2Id = newId;
                    }
                }
            } else if (!group) {
                const { data: team1Row } = await supabase.from("Team").select("groupId").eq("id", team1Id).single();
                if (team1Row?.groupId) {
                    group = team1Row.groupId;
                } else {
                    group = "A"; // Fallback
                }
            }

            const { error } = await supabase.from("Match").insert({
                id: randomUUID(),
                matchNo: payload.matchNo,
                stage: payload.stage,
                group: group,
                team1Id: team1Id,
                team2Id: team2Id,
                scheduledTime: payload.scheduledTime
                    ? new Date(payload.scheduledTime).toISOString()
                    : null,
                status: "SCHEDULED",
                isFunMatch: payload.isFunMatch ?? false,
                createdAt: now,
                updatedAt: now,
            });
            if (error) throw new Error(error.message);
            revalidatePath("/matches");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "create_super_over") {
            const { matchNo } = payload;
            if (!matchNo) throw new Error("Missing matchNo");
            
            const { data: orig, error: origErr } = await supabase.from("Match").select("*").eq("matchNo", matchNo).single();
            if (origErr || !orig) throw new Error("Original match not found: " + origErr?.message);
            
            const now = new Date().toISOString();
            const soMatchNo = matchNo + "-SO";

            const { error: insertErr } = await supabase.from("Match").insert({
                id: randomUUID(),
                matchNo: soMatchNo,
                stage: orig.stage,
                group: orig.group,
                team1Id: orig.team1Id,
                team2Id: orig.team2Id,
                scheduledTime: now,
                status: "SCHEDULED",
                isFunMatch: orig.isFunMatch,
                createdAt: now,
                updatedAt: now
            });
            if (insertErr) throw new Error(insertErr.message);

            revalidatePath("/matches");
            revalidatePath("/");
            return NextResponse.json({ ok: true, matchNo: soMatchNo });
        }

        if (payload.action === "delete_match") {
            const { error } = await supabase
                .from("Match")
                .delete()
                .eq("matchNo", payload.matchNo);
            if (error) throw new Error(error.message);
            
            // Redis cleanup
            try {
                const matchId = String(payload.matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                await redis.del(`s2:live_match_${matchId}`);
            } catch (e) {
                console.error("Redis delete match error", e);
            }

            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/playoffs");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "update_match") {
            const { id, matchNo, stage, group, team1Id, team2Id, scheduledTime, isFunMatch, customTeam1Name, customTeam2Name } = payload;
            if (!id) throw new Error("Missing match ID");

            const now = new Date().toISOString();
            
            // Resolve team IDs from custom names if provided
            let resolvedTeam1Id = team1Id;
            let resolvedTeam2Id = team2Id;
            
            if (customTeam1Name && customTeam1Name.trim()) {
                const { data: t1 } = await supabase.from("Team").select("id").ilike("name", customTeam1Name.trim()).single();
                if (t1?.id) {
                    resolvedTeam1Id = t1.id;
                } else if (isFunMatch) {
                    const newId = randomUUID();
                    const { error } = await supabase.from("Team").insert({ id: newId, name: customTeam1Name.trim(), shortName: customTeam1Name.trim().substring(0, 3).toUpperCase(), groupId: "-", purse: 0 });
                    if (error) throw new Error("Failed to create fun team 1: " + error.message);
                    resolvedTeam1Id = newId;
                }
            }
            if (customTeam2Name && customTeam2Name.trim()) {
                const { data: t2 } = await supabase.from("Team").select("id").ilike("name", customTeam2Name.trim()).single();
                if (t2?.id) {
                    resolvedTeam2Id = t2.id;
                } else if (isFunMatch) {
                    const newId = randomUUID();
                    const { error } = await supabase.from("Team").insert({ id: newId, name: customTeam2Name.trim(), shortName: customTeam2Name.trim().substring(0, 3).toUpperCase(), groupId: "-", purse: 0 });
                    if (error) throw new Error("Failed to create fun team 2: " + error.message);
                    resolvedTeam2Id = newId;
                }
            }

            const { error } = await supabase
                .from("Match")
                .update({
                    matchNo,
                    stage,
                    group: group || null,
                    team1Id: resolvedTeam1Id,
                    team2Id: resolvedTeam2Id,
                    scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : null,
                    isFunMatch: isFunMatch ?? false,
                    updatedAt: now,
                })
                .eq("id", id);
            
            if (error) throw new Error(error.message);

            // If the match number changed, rename keys in Redis if they exist
            if (payload.oldMatchNo && payload.oldMatchNo !== matchNo) {
                try {
                    const oldMatchId = String(payload.oldMatchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                    const newMatchId = String(matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                    const stateStr = await redis.get(`s2:live_match_${oldMatchId}`);
                    if (stateStr) {
                        await redis.set(`s2:live_match_${newMatchId}`, stateStr);
                        await redis.del(`s2:live_match_${oldMatchId}`);
                    }
                } catch (e) {
                    console.error("Redis update match rename error", e);
                }
            }

            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/playoffs");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "delete_all") {
            // 1. Null out liveState before deleting to prevent stale data if matchNos are reused
            await supabase.from("Match").update({ liveState: null }).neq("id", "0");

            // 2. Delete all matches
            const { error } = await supabase.from("Match").delete().neq("id", "0");
            if (error) throw new Error(error.message);
            
            // 3. Clear all Redis keys to ensure stats are wiped
            try {
                const keys = await redis.keys("s2:live_match_*");
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
                // 4. Clear active broadcast so /live doesn't reference a deleted match
                await redis.del("s2:active_live_match_id");
            } catch (e) {
                console.error("Redis delete_all error", e);
            }
            
            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/playoffs");
            revalidatePath("/stats");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "clear_winner") {
            const { error } = await supabase
                .from("Match")
                .update({ winnerId: null, status: "SCHEDULED", liveState: null })
                .eq("matchNo", payload.matchNo);
            if (error) throw new Error(error.message);
            
            try {
                const matchId = String(payload.matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                await redis.del(`s2:live_match_${matchId}`);
            } catch (e) {
                console.error("Redis clear_winner error", e);
            }
            
            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/stats");
            revalidatePath("/playoffs");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "abandon_match") {
            const { error } = await supabase
                .from("Match")
                .update({ winnerId: null, status: "ABANDONED" })
                .eq("matchNo", payload.matchNo);
            if (error) throw new Error(error.message);
            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/stats");
            revalidatePath("/playoffs");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "update_live_state") {
            // Update live state manually
            if (!payload.matchNo || !payload.liveState) throw new Error("Missing parameters");
            
            // 1. Update Supabase
            const { error } = await supabase
                .from("Match")
                .update({ liveState: payload.liveState })
                .eq("matchNo", payload.matchNo);
            if (error) throw new Error(error.message);

            // 2. Update Redis
            const matchId = String(payload.matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            await redis.set(`s2:live_match_${matchId}`, JSON.stringify(payload.liveState));

            revalidatePath("/points");
            revalidatePath("/stats");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "log_toss") {
            const { matchNo, tossWinnerId, tossDecision } = payload;
            if (!matchNo || !tossWinnerId || !tossDecision) throw new Error("Missing toss details");

            // 1. Update Match row
            const { error } = await supabase
                .from("Match")
                .update({ tossWinnerId, tossDecision })
                .eq("matchNo", matchNo);
            if (error) throw new Error(error.message);

            // 2. Update LiveState if it exists
            const matchId = String(matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            const stateStr = await redis.get(`s2:live_match_${matchId}`);
            
            if (stateStr) {
                const state = JSON.parse(stateStr);
                // We need the team name to inject into liveState.tossWinner
                const { data: teamData } = await supabase.from("Team").select("name").eq("id", tossWinnerId).single();
                if (teamData) {
                    state.tossWinner = teamData.name;
                    state.tossDecision = tossDecision;
                    await redis.set(`s2:live_match_${matchId}`, JSON.stringify(state));
                    
                    // Sync to supabase
                    await supabase.from("Match").update({ liveState: state }).eq("matchNo", matchNo);
                }
            }

            revalidatePath("/matches");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "get_live_state") {
            // Fetch live state manually for editor
            if (!payload.matchNo) throw new Error("Missing matchNo");
            
            const matchId = String(payload.matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            let state = await redis.get(`s2:live_match_${matchId}`);
            
            if (!state) {
                const { data } = await supabase.from("Match").select("liveState").eq("matchNo", payload.matchNo).single();
                if (data?.liveState) {
                    state = JSON.stringify(data.liveState);
                }
            }
            
            return NextResponse.json({ ok: true, liveState: state ? JSON.parse(state) : null });
        }

        if (payload.action === "bulk_update_matches") {
            const { orderedMatches } = payload;
            if (!orderedMatches || !Array.isArray(orderedMatches)) throw new Error("Missing orderedMatches");

            // Fetch current matches in correct order
            const { data: dbMatches, error: fetchErr } = await supabase.from("Match").select("id, matchNo, scheduledTime").order("createdAt", { ascending: true });
            if (fetchErr) throw new Error(fetchErr.message);

            const sorted = (dbMatches || []).sort((a: any, b: any) => {
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

            // Map dragged items into the sorted slots
            for (let i = 0; i < sorted.length && i < orderedMatches.length; i++) {
                const slot = sorted[i];
                const draggedItem = orderedMatches[i];

                // Find the original DB row for the dragged item to check if its time was edited inline
                const originalItem = sorted.find(m => m.id === draggedItem.id);
                
                let originalTimeStr = originalItem?.scheduledTime ? new Date(originalItem.scheduledTime).toISOString() : null;
                let draggedTimeStr = draggedItem.scheduledTime ? new Date(draggedItem.scheduledTime).toISOString() : null;
                
                const wasTimeEdited = originalTimeStr !== draggedTimeStr;

                // If the time was edited, apply the new time to the slot. 
                // If it wasn't edited, keep the slot's original time (this allows teams to swap time slots when dragged)
                const timeToSave = wasTimeEdited ? draggedTimeStr : slot.scheduledTime;

                const { error: updErr } = await supabase.from("Match").update({
                    team1Id: draggedItem.team1Id,
                    team2Id: draggedItem.team2Id,
                    group: draggedItem.group,
                    isFunMatch: draggedItem.isFunMatch,
                    scheduledTime: timeToSave
                }).eq("id", slot.id);

                if (updErr) throw new Error(updErr.message);
            }

            revalidatePath("/matches");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "auto_generate") {
            // Delete all existing scheduled matches? Or just append?
            // Usually auto-generate should only happen on an empty tournament, 
            // but let's just generate and insert.
            const { data: teams, error: teamErr } = await supabase.from("Team").select("id, name, groupId");
            if (teamErr) throw new Error(teamErr.message);

            let tbdTeam = teams.find(t => t.name === "TBD");
            if (!tbdTeam) {
                const now = new Date().toISOString();
                const { data: newTbd, error: tbdErr } = await supabase.from("Team").insert({
                    id: randomUUID(),
                    name: "TBD",
                    shortName: "TBD",
                    color: "#333333",
                    groupId: "-",
                    createdAt: now,
                    updatedAt: now
                }).select("id, name, groupId").single();
                if (tbdErr) throw new Error("Failed to create TBD team: " + tbdErr.message);
                tbdTeam = newTbd;
                teams.push(tbdTeam);
            }

            const groupA = teams.filter(t => t.groupId === "A").map(t => t.name);
            const groupB = teams.filter(t => t.groupId === "B").map(t => t.name);
            const groupC = teams.filter(t => t.groupId === "C").map(t => t.name);

            // Dynamically import to avoid top-level issues if any
            const { generateFixtures } = await import("@/lib/tournament");
            const generated = generateFixtures(groupA, groupB, groupC);

            const nameToId = new Map(teams.map(t => [t.name, t.id]));
            const now = new Date().toISOString();

            const inserts = generated.map(f => {
                const team1Id = nameToId.get(f.team1) || tbdTeam?.id;
                const team2Id = nameToId.get(f.team2) || tbdTeam?.id;
                
                // Calculate dynamic time across 4 days (6 matches per day)
                const matchNum = parseInt(f.matchNo.replace(/[^0-9]/g, "")) || 1;
                let dayOffset = 0;
                let hourOffset = 0;
                if (matchNum <= 6) {
                    dayOffset = 0;
                    hourOffset = matchNum - 1;
                } else if (matchNum <= 12) {
                    dayOffset = 1;
                    hourOffset = matchNum - 7;
                } else if (matchNum <= 18) {
                    dayOffset = 2;
                    hourOffset = matchNum - 13;
                } else {
                    dayOffset = 3;
                    hourOffset = matchNum - 19;
                }
                const scheduledDate = new Date("2026-05-28T18:00:00.000Z");
                scheduledDate.setUTCDate(scheduledDate.getUTCDate() + dayOffset);
                scheduledDate.setUTCHours(scheduledDate.getUTCHours() + hourOffset);

                return {
                    id: randomUUID(),
                    matchNo: f.matchNo,
                    stage: f.stage,
                    group: f.group === "-" ? null : f.group,
                    team1Id: team1Id,
                    team2Id: team2Id,
                    status: "SCHEDULED",
                    isFunMatch: false,
                    scheduledTime: scheduledDate.toISOString(),
                    createdAt: now,
                    updatedAt: now,
                };
            }).filter(m => m.team1Id && m.team2Id); // This will now include knockouts because of TBD fallback

            // 1. Clean existing matches that have these match numbers (M1-M24) to avoid duplicate key conflicts
            const generatedMatchNos = generated.map(f => f.matchNo);
            const { error: deleteErr } = await supabase
                .from("Match")
                .delete()
                .in("matchNo", generatedMatchNos);
            if (deleteErr) throw new Error("Failed to clear existing auto-gen fixtures: " + deleteErr.message);

            // 2. Clean matching Redis keys to ensure fresh scorer state
            try {
                for (const mNo of generatedMatchNos) {
                    const matchId = String(mNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                    await redis.del(`s2:live_match_${matchId}`);
                }
            } catch (e) {
                console.error("Redis autogen clean error", e);
            }

            // 3. Insert newly generated matches
            if (inserts.length > 0) {
                const { error } = await supabase.from("Match").insert(inserts);
                if (error) throw new Error(error.message);
            }

            revalidatePath("/matches");
            revalidatePath("/playoffs");
            revalidatePath("/");
            return NextResponse.json({ ok: true, generated: inserts.length });
        }

        if (payload.action === "autoplay_match") {
            const { matchNo } = payload;
            if (!matchNo) throw new Error("Missing matchNo for autoplay");

            const { data: match, error: fetchErr } = await supabase
                .from("Match")
                .select("id, matchNo, team1Id, team2Id")
                .eq("matchNo", matchNo)
                .single();
                
            if (fetchErr) throw new Error(fetchErr.message);
            if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

            const { data: teams, error: teamsErr } = await supabase.from("Team").select("id, name");
            if (teamsErr) throw new Error(teamsErr.message);
            const teamMap = new Map(teams.map((t: any) => [t.id, t.name]));


            const now = new Date().toISOString();

            // Try to resolve dynamic playoff names if they are TBD
            let team1Name = teamMap.get(match.team1Id) || "Team 1";
            let team2Name = teamMap.get(match.team2Id) || "Team 2";
            
            if (team1Name === "TBD" || team2Name === "TBD") {
                const { resolveS2Playoffs } = await import("@/lib/tournament");
                const { fetchAllLiveStates, fetchTeams } = await import("@/lib/data");
                const fixs = await fetchFixtures(2);
                const tms = await fetchTeams(2);
                const liveStates = await fetchAllLiveStates();
                const resolvedFixs = resolveS2Playoffs(fixs, tms, liveStates);
                const targetFix = resolvedFixs.find(f => f.matchNo === match.matchNo);
                if (targetFix) {
                    team1Name = targetFix.team1 !== "TBD" ? targetFix.team1 : team1Name;
                    team2Name = targetFix.team2 !== "TBD" ? targetFix.team2 : team2Name;
                }
            }

            const squads = await fetchSquads(2);

            const generateFullInnings = (teamName: string, opponentName: string, inningsNum: 1 | 2, matchOvers: number) => {
                const squad = squads.find(s => s.teamName === teamName);
                const oppSquad = squads.find(s => s.teamName === opponentName);
                
                const players = squad && squad.players.length >= 8 ? squad.players.map(p => p.name) : Array.from({length: 8}, (_, i) => `${teamName} P${i+1}`);
                const oppPlayers = oppSquad && oppSquad.players.length >= 8 ? oppSquad.players.map(p => p.name) : Array.from({length: 8}, (_, i) => `${opponentName} P${i+1}`);
                
                let strikerIdx = 0;
                let nonStrikerIdx = 1;
                let nextBatsmanIdx = 2;
                let currentBowlerIdx = 0;
                
                let totalRuns = 0;
                let totalWickets = 0;
                const timeline: any[] = [];
                const batsmenStats: Record<string, any> = {};
                const bowlerStats: Record<string, any> = {};
                
                players.forEach(p => batsmenStats[p] = { name: p, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false });
                oppPlayers.forEach(p => bowlerStats[p] = { name: p, overs: 0, maidens: 0, runs: 0, wickets: 0 });

                let ballsInOver = 0;
                let currentOver = 0;
                let isAllOut = false;

                for (let ball = 1; ball <= matchOvers * 6; ball++) {
                    if (isAllOut) break;

                    const striker = players[strikerIdx];
                    const nonStriker = players[nonStrikerIdx];
                    const bowler = oppPlayers[currentBowlerIdx];

                    const rand = Math.random();
                    let runs = 0;
                    let isWicket = false;
                    
                    if (rand < 0.05) isWicket = true;
                    else if (rand < 0.3) runs = 0;
                    else if (rand < 0.6) runs = 1;
                    else if (rand < 0.75) runs = 2;
                    else if (rand < 0.85) runs = 4;
                    else runs = 6;

                    timeline.push({
                        id: `b${inningsNum}_${ball}`,
                        timestamp: Date.now() + ball * 1000 + (inningsNum === 2 ? 100000 : 0),
                        innings: inningsNum,
                        over: currentOver + (ballsInOver + 1) / 10,
                        striker,
                        nonStriker,
                        bowler,
                        runs,
                        extras: 0,
                        isWicket,
                        wicketType: isWicket ? "BOWLED" : undefined
                    });

                    batsmenStats[striker].balls++;
                    batsmenStats[striker].runs += runs;
                    if (runs === 4) batsmenStats[striker].fours++;
                    if (runs === 6) batsmenStats[striker].sixes++;
                    
                    bowlerStats[bowler].runs += runs;
                    totalRuns += runs;

                    ballsInOver++;
                    
                    if (isWicket) {
                        batsmenStats[striker].isOut = true;
                        bowlerStats[bowler].wickets++;
                        totalWickets++;
                        if (totalWickets >= 7) { // 8 player squad = 7 wickets for all out
                            isAllOut = true;
                        } else {
                            strikerIdx = nextBatsmanIdx++;
                        }
                    } else if (runs % 2 !== 0) {
                        const temp = strikerIdx;
                        strikerIdx = nonStrikerIdx;
                        nonStrikerIdx = temp;
                    }

                    if (ballsInOver === 6) {
                        bowlerStats[bowler].overs++;
                        currentOver++;
                        ballsInOver = 0;
                        currentBowlerIdx = (currentBowlerIdx + 1) % oppPlayers.length;
                        const temp = strikerIdx;
                        strikerIdx = nonStrikerIdx;
                        nonStrikerIdx = temp;
                    }
                }

                if (ballsInOver > 0) {
                    bowlerStats[oppPlayers[currentBowlerIdx]].overs += ballsInOver / 6;
                }

                return {
                    innings: { teamName, runs: totalRuns, wickets: totalWickets, overs: currentOver + ballsInOver / 10, batsmen: batsmenStats, bowlers: bowlerStats },
                    timeline
                };
            };

            const data1 = generateFullInnings(team1Name, team2Name, 1, 8);
            const data2 = generateFullInnings(team2Name, team1Name, 2, 8);
            const inn1 = data1.innings;
            const inn2 = data2.innings;
            const fullTimeline = [...data1.timeline, ...data2.timeline];

            const winnerId = inn1.runs > inn2.runs ? match.team1Id : (inn2.runs > inn1.runs ? match.team2Id : null);
            let winnerName = winnerId ? teamMap.get(winnerId) : "TIE";
            let result = winnerName === "TIE" ? "Match Tied" : `${winnerName} won by ${Math.abs(inn1.runs - inn2.runs)} runs`;

            const liveState = {
                matchId: match.matchNo,
                status: "COMPLETED",
                currentInnings: 2,
                innings1: inn1,
                innings2: inn2,
                timeline: fullTimeline,
                matchOvers: 8,
                winner: winnerName,
                result
            };

            const { error: updErr } = await supabase
                .from("Match")
                .update({ 
                    status: "COMPLETED", 
                    winnerId, 
                    liveState,
                    updatedAt: now
                })
                .eq("id", match.id);
            
            if (updErr) console.error("Error updating match", updErr);

            const matchIdStr = String(match.matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            await redis.set(`s2:live_match_${matchIdStr}`, JSON.stringify(liveState));

            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/playoffs");
            revalidatePath("/stats");
            revalidatePath("/");
            return NextResponse.json({ ok: true, generated: 1 });
        }

        if (Array.isArray(payload)) {
            return NextResponse.json({ ok: true, message: "Use individual match updates." });
        }

        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("Supabase Matches Write Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
