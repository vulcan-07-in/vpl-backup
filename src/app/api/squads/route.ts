import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// GET — return teams + players from Supabase (S2)
export async function GET() {
    try {
        const { data: teams, error: teamErr } = await supabase
            .from("team")
            .select("id, name, shortName, color, groupId")
            .order("name", { ascending: true });
        if (teamErr) throw new Error(teamErr.message);

        const { data: players, error: playerErr } = await supabase
            .from("player")
            .select("id, name, role, price, team_id");
        if (playerErr) throw new Error(playerErr.message);

        // Map players onto their teams
        type TeamRow = { id: string; name: string; shortName: string; color: string; groupId: string };
        type PlayerRow = { id: string; name: string; role: string; price: number; team_id: string };
        const result = (teams as TeamRow[] || []).map((t: TeamRow) => ({
            id: t.id,
            name: t.name,
            shortName: t.shortName,
            color: t.color,
            groupId: t.groupId,
            players: (players as PlayerRow[] || [])
                .filter((p: PlayerRow) => p.team_id === t.id)
                .map((p: PlayerRow) => ({
                    id: p.id,
                    name: p.name,
                    role: p.role,
                    price: p.price,
                })),
        }));

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// POST — CRUD actions via Supabase (S2 admin only)
export async function POST(request: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = await request.json();

        if (Array.isArray(payload)) {
            return NextResponse.json({ ok: true, message: "Use targeted actions instead of bulk arrays." });
        }

        if (payload.action === "create_team") {
            const { data, error } = await supabase.from("team").insert({
                name: payload.name,
                shortName: payload.shortName,
                color: payload.color || "#FFFFFF",
                groupId: payload.groupId || "A",
            }).select("id").single();
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            revalidatePath("/points");
            revalidatePath("/");
            return NextResponse.json({ ok: true, teamId: data.id });
        }

        if (payload.action === "add_player") {
            const { error } = await supabase.from("player").insert({
                name: payload.name,
                role: payload.role,
                price: parseInt(payload.price) || 0,
                team_id: payload.teamId,
            });
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "delete_player") {
            const { error } = await supabase.from("player").delete().eq("id", payload.playerId);
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "delete_team") {
            // Delete players first, then matches referencing the team, then the team itself
            await supabase.from("player").delete().eq("team_id", payload.teamId);
            await supabase.from("match").delete().or(`team1_id.eq.${payload.teamId},team2_id.eq.${payload.teamId}`);
            const { error } = await supabase.from("team").delete().eq("id", payload.teamId);
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            revalidatePath("/points");
            revalidatePath("/matches");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("Supabase Squads Write Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
