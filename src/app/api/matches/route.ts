import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fetchFixtures } from "@/lib/data";
import { revalidatePath } from "next/cache";

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
                .update({ winner_id: teamRow.id, status: "COMPLETED" })
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
                id: crypto.randomUUID(),
                matchNo: payload.matchNo,
                stage: payload.stage,
                group: payload.group || null,
                team1_id: payload.team1Id,
                team2_id: payload.team2Id,
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
            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "clear_winner") {
            const { error } = await supabase
                .from("Match")
                .update({ winner_id: null, status: "SCHEDULED" })
                .eq("matchNo", payload.matchNo);
            if (error) throw new Error(error.message);
            revalidatePath("/matches");
            revalidatePath("/points");
            revalidatePath("/stats");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
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
