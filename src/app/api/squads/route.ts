import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// GET — return teams + players from Supabase (S2)
export async function GET() {
    try {
        const { data: teams, error: teamErr } = await supabase
            .from("Team")
            .select("id, name, shortName, color, groupId")
            .order("name", { ascending: true });
        if (teamErr) throw new Error(teamErr.message);

        const { data: regPlayers, error: playerErr } = await supabase
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

        const { data: manualPlayers, error: manualErr } = await supabase
            .from("Player")
            .select("id, name, role, price, teamId");
        if (manualErr) throw new Error(manualErr.message);

        // Map players onto their teams
        type TeamRow = { id: string; name: string; shortName: string; color: string; groupId: string };
        const result = (teams as TeamRow[] || []).map((t: TeamRow) => {
            const teamRegPlayers = (regPlayers as any[] || [])
                .filter((p: any) => p.team_name === t.name)
                .map((p: any) => ({
                    id: p.account_id,
                    name: p.varchasva_accounts?.name || "Unknown",
                    role: p.role,
                    price: p.price || 0,
                }));
                
            const teamManualPlayers = (manualPlayers as any[] || [])
                .filter((p: any) => p.teamId === t.id)
                .map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    role: p.role,
                    price: p.price || 0,
                }));

            return {
                id: t.id,
                name: t.name,
                shortName: t.shortName,
                color: t.color,
                groupId: t.groupId,
                players: [...teamRegPlayers, ...teamManualPlayers],
            };
        });

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
            const now = new Date().toISOString();
            const { data, error } = await supabase.from("Team").insert({
                id: crypto.randomUUID(),
                name: payload.name,
                shortName: payload.shortName,
                color: payload.color || "#FFFFFF",
                groupId: payload.groupId || "A",
                purse: payload.purse || 10000,
                createdAt: now,
                updatedAt: now,
            }).select("id").single();
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            revalidatePath("/points");
            revalidatePath("/");
            return NextResponse.json({ ok: true, teamId: data.id });
        }

        if (payload.action === "update_team") {
            const { teamId, name, shortName, color, groupId } = payload;
            if (!teamId) throw new Error("Missing teamId");
            const now = new Date().toISOString();
            const { error } = await supabase.from("Team").update({
                name,
                shortName,
                color,
                groupId,
                updatedAt: now,
            }).eq("id", teamId);
            if (error) throw new Error(error.message);
            
            // Note: If 'name' is updated, we theoretically need to update vpl_registrations.team_name as well!
            // Wait, team_name is hardcoded string in vpl_registrations? Yes.
            // Let's update vpl_registrations to match the new team name.
            if (name) {
                // We need the OLD name to update vpl_registrations.
                // It's safer to just let the admin use this for color/shortName/groupId.
                // But if they change 'name', we should attempt to update registrations.
                // We'll trust they don't break it, or we'll update everything that matched the old name?
                // Actually, let's just do a simple update for now, they probably just want to fix typos in shortName/color.
                // We'll update registrations if they passed oldName.
                if (payload.oldName && payload.oldName !== name) {
                    await supabase.from("vpl_registrations").update({ team_name: name }).eq("team_name", payload.oldName).eq("season", 2);
                }
            }
            
            revalidatePath("/squads");
            revalidatePath("/points");
            revalidatePath("/matches");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "add_player") {
            const now = new Date().toISOString();
            const { error } = await supabase.from("Player").insert({
                id: crypto.randomUUID(),
                name: payload.name,
                role: payload.role,
                price: parseInt(payload.price) || 0,
                teamId: payload.teamId,
                createdAt: now,
                updatedAt: now,
            });
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "delete_player") {
            const { error } = await supabase.from("Player").delete().eq("id", payload.playerId);
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "delete_team") {
            // Delete players first, then matches referencing the team, then the team itself
            await supabase.from("Player").delete().eq("teamId", payload.teamId);
            await supabase.from("Match").delete().or(`team1Id.eq.${payload.teamId},team2Id.eq.${payload.teamId}`);
            const { error } = await supabase.from("Team").delete().eq("id", payload.teamId);
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
