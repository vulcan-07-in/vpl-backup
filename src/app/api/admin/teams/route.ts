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
            .from("vpl_registrations")
            .select(`
                account_id,
                team_name,
                role,
                price,
                varchasva_accounts(name)
            `)
            .eq("season", 2);
        if (playerErr) throw new Error(playerErr.message);

        // Attach players to their teams
        type TeamRow = { id: string; name: string; shortName: string; color: string; groupId: string };
        const result = (teams as TeamRow[] || []).map((t: TeamRow) => ({
            id: t.id,
            name: t.name,
            shortName: t.shortName,
            color: t.color,
            groupId: t.groupId,
            players: (players as any[] || [])
                .filter((p: any) => p.team_name === t.name)
                .map((p: any) => ({
                    id: p.account_id,
                    name: p.varchasva_accounts?.name || "Unknown",
                    role: p.role,
                    price: p.price || 0,
                })),
        }));

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
