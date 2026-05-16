import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

export async function GET() {
    // Public read - used by admin team management UI
    const { data: teams, error } = await supabase
        .from("Team")
        .select("id, name, shortName, color, groupId, purse")
        .order("groupId", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(teams || []);
}

export async function POST(req: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action } = body;

        if (action === "create") {
            const { name, shortName, color, groupId, purse } = body;
            if (!name || !shortName) {
                return NextResponse.json({ error: "Name and Short Name are required" }, { status: 400 });
            }

            const { data, error } = await supabase.from("Team").insert({
                name: name.trim(),
                shortName: shortName.trim().toUpperCase(),
                color: color || "#EAB308",
                groupId: groupId || "A",
                purse: purse || 10000,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }).select("id, name, shortName, color, groupId, purse").single();

            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            revalidatePath("/points");
            return NextResponse.json({ ok: true, team: data });
        }

        if (action === "update") {
            const { teamId, name, shortName, color, groupId, purse } = body;
            if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

            const updateData: any = { updatedAt: new Date().toISOString() };
            if (name !== undefined) updateData.name = name.trim();
            if (shortName !== undefined) updateData.shortName = shortName.trim().toUpperCase();
            if (color !== undefined) updateData.color = color;
            if (groupId !== undefined) updateData.groupId = groupId;
            if (purse !== undefined) updateData.purse = parseInt(purse, 10);

            const { error } = await supabase.from("Team").update(updateData).eq("id", teamId);
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            revalidatePath("/points");
            return NextResponse.json({ ok: true });
        }

        if (action === "delete") {
            const { teamId } = body;
            if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

            const { data: teamRow } = await supabase.from("Team").select("name").eq("id", teamId).single();
            if (teamRow?.name) {
                await supabase.from("vpl_registrations")
                    .update({ team_name: "UNSOLD", price: 0 })
                    .eq("team_name", teamRow.name)
                    .eq("season", 2);
            }
            await supabase.from("Player").delete().eq("teamId", teamId);
            await supabase.from("Match").delete().or(`team1Id.eq.${teamId},team2Id.eq.${teamId}`);
            const { error } = await supabase.from("Team").delete().eq("id", teamId);
            if (error) throw new Error(error.message);
            revalidatePath("/squads");
            revalidatePath("/points");
            revalidatePath("/matches");
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
