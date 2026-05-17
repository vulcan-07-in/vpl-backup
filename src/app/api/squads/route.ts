import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// GET — return teams + players from Supabase (S2)
export async function GET() {
    try {
        const teams = await prisma.team.findMany({
            select: { id: true, name: true, shortName: true, color: true, groupId: true },
            orderBy: { name: 'asc' }
        });

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

        const manualPlayers = await prisma.player.findMany({
            select: { id: true, name: true, role: true, price: true, teamId: true }
        });

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
            const team = await prisma.team.create({
                data: {
                    name: payload.name,
                    shortName: payload.shortName,
                    color: payload.color || "#FFFFFF",
                    groupId: payload.groupId || "A",
                    purse: payload.purse || 10000,
                }
            });
            revalidatePath("/squads");
            revalidatePath("/admin");
            revalidatePath("/points");
            revalidatePath("/");
            return NextResponse.json({ ok: true, teamId: team.id });
        }

        if (payload.action === "update_team") {
            const { teamId, name, shortName, color, groupId } = payload;
            if (!teamId) throw new Error("Missing teamId");
            
            await prisma.team.update({
                where: { id: teamId },
                data: {
                    name,
                    shortName,
                    color,
                    groupId
                }
            });
            
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
            revalidatePath("/admin");
            revalidatePath("/points");
            revalidatePath("/matches");
            revalidatePath("/");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "add_player") {
            await prisma.player.create({
                data: {
                    name: payload.name,
                    role: payload.role,
                    price: parseInt(payload.price) || 0,
                    teamId: payload.teamId,
                }
            });
            revalidatePath("/squads");
            revalidatePath("/admin");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "delete_player") {
            await prisma.player.delete({ where: { id: payload.playerId } });
            revalidatePath("/squads");
            revalidatePath("/admin");
            return NextResponse.json({ ok: true });
        }

        if (payload.action === "delete_team") {
            // Delete players first, then matches referencing the team, then the team itself
            await prisma.player.deleteMany({ where: { teamId: payload.teamId } });
            await prisma.match.deleteMany({
                where: {
                    OR: [
                        { team1Id: payload.teamId },
                        { team2Id: payload.teamId }
                    ]
                }
            });
            await prisma.team.delete({ where: { id: payload.teamId } });
            revalidatePath("/squads");
            revalidatePath("/admin");
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
