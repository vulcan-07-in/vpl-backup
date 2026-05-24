import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fetchFixtures } from "@/lib/data";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// GET — return S2 fixtures from Supabase
export async function GET() {
    try {
        const fixtures = await fetchFixtures(2);
        return NextResponse.json(fixtures);
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
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "create_match") {
            const now = new Date().toISOString();
            const { error } = await supabase.from("Match").insert({
                id: randomUUID(),
                matchNo: payload.matchNo,
                stage: payload.stage,
                group: payload.group || null,
                team1Id: payload.team1Id,
                team2Id: payload.team2Id,
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

        if (payload.action === "delete_match") {
            const { error } = await supabase
                .from("Match")
                .delete()
                .eq("matchNo", payload.matchNo);
            if (error) throw new Error(error.message);
            
            // Redis cleanup
            try {
                const redis = new (require("ioredis").default)(process.env.REDIS_URL || "");
                const matchId = String(payload.matchNo).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                await redis.del(`s2:live_match_${matchId}`);
            } catch (e) {
                console.error("Redis delete match error", e);
            }

            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "delete_all") {
            const { error } = await supabase.from("Match").delete().neq("id", "0");
            if (error) throw new Error(error.message);
            
            // Note: We might want to clear all redis s2:live_match keys but typically wipe all is only used at start.
            
            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "clear_winner") {
            const { error } = await supabase
                .from("Match")
                .update({ winnerId: null, status: "SCHEDULED" })
                .eq("matchNo", payload.matchNo);
            if (error) throw new Error(error.message);
            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/stats");
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
            const redis = new (require("ioredis").default)(process.env.REDIS_URL || "");
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
            const redis = new (require("ioredis").default)(process.env.REDIS_URL || "");
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
            const redis = new (require("ioredis").default)(process.env.REDIS_URL || "");
            let state = await redis.get(`s2:live_match_${matchId}`);
            
            if (!state) {
                const { data } = await supabase.from("Match").select("liveState").eq("matchNo", payload.matchNo).single();
                if (data?.liveState) {
                    state = JSON.stringify(data.liveState);
                }
            }
            
            return NextResponse.json({ ok: true, liveState: state ? JSON.parse(state) : null });
        }

        if (payload.action === "swap_sequence") {
            const { match1, match2 } = payload;
            if (!match1 || !match2) throw new Error("Missing match numbers");

            // Swap using a temporary matchNo to avoid unique constraint violations
            const tempMatchNo = `TEMP_${Date.now()}`;
            
            // 1. match1 -> TEMP
            const { error: err1 } = await supabase.from("Match").update({ matchNo: tempMatchNo }).eq("matchNo", match1);
            if (err1) throw new Error(err1.message);

            // 2. match2 -> match1
            const { error: err2 } = await supabase.from("Match").update({ matchNo: match1 }).eq("matchNo", match2);
            if (err2) throw new Error(err2.message);

            // 3. TEMP -> match2
            const { error: err3 } = await supabase.from("Match").update({ matchNo: match2 }).eq("matchNo", tempMatchNo);
            if (err3) throw new Error(err3.message);

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
                    purse: 0,
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
                
                return {
                    id: crypto.randomUUID(),
                    matchNo: f.matchNo,
                    stage: f.stage,
                    group: f.group === "-" ? null : f.group,
                    team1Id: team1Id,
                    team2Id: team2Id,
                    status: "SCHEDULED",
                    isFunMatch: false,
                    createdAt: now,
                    updatedAt: now,
                };
            }).filter(m => m.team1Id && m.team2Id); // This will now include knockouts because of TBD fallback

            if (inserts.length > 0) {
                const { error } = await supabase.from("Match").insert(inserts);
                if (error) throw new Error(error.message);
            }

            revalidatePath("/matches");
            revalidatePath("/");
            return NextResponse.json({ ok: true, generated: inserts.length });
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
