import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Returns teams with IDs and players for admin operations (S2 — Supabase)
export async function GET() {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: teams, error: teamErr } = await supabase
            .from("Team")
            .select("id, name, shortName, color, groupId")
            .order("name", { ascending: true });
        if (teamErr) throw new Error(teamErr.message);

        const { data: players, error: playerErr } = await supabase
            .from("Player")
            .select("id, name, role, price, team_id");
        if (playerErr) throw new Error(playerErr.message);

        // Attach players to their teams
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
