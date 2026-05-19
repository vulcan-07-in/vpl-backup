import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { AUCTION_CONSTANTS } from "@/lib/auction";
import Redis from "ioredis";
import { teamPursesKey } from "@/lib/redis-keys";

export const dynamic = 'force-dynamic';

export async function GET() {
    // Fetch teams with their captain info
    const { data: teams, error } = await supabase
        .from("Team")
        .select("id, name, shortName, color, groupId")
        .order("groupId", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const redis = new Redis(process.env.REDIS_URL || "");
    const pursesHash = await redis.hgetall(teamPursesKey());

    // Fetch captains for each team
    const teamList = teams || [];
    const enrichedTeams = [];

    for (const team of teamList) {
        const { data: captain } = await supabase
            .from("vpl_registrations")
            .select("account_id, varchasva_accounts(name)")
            .eq("team_name", team.name)
            .eq("season", 2)
            .eq("is_captain", true)
            .maybeSingle();

        const purse = pursesHash[team.id] ? parseInt(pursesHash[team.id], 10) : AUCTION_CONSTANTS.MAX_BUDGET;

        enrichedTeams.push({
            ...team,
            purse,
            captainId: captain?.account_id || null,
            captainName: (captain as any)?.varchasva_accounts?.name || null,
        });
    }

    return NextResponse.json(enrichedTeams);
}

export async function POST(req: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action } = body;
        const redis = new Redis(process.env.REDIS_URL || "");

        if (action === "create") {
            const { name, shortName, color, groupId, purse, captainAccountId } = body;
            if (!name || !shortName) {
                return NextResponse.json({ error: "Name and Short Name are required" }, { status: 400 });
            }

            const teamId = crypto.randomUUID();

            // Create the team
            const { data, error } = await supabase.from("Team").insert({
                id: teamId,
                name: name.trim(),
                shortName: shortName.trim().toUpperCase(),
                color: color || "#EAB308",
                groupId: groupId || "A",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }).select("id, name, shortName, color, groupId").single();

            if (error) throw new Error(error.message);

            const initialPurse = purse || AUCTION_CONSTANTS.MAX_BUDGET;
            await redis.hset(teamPursesKey(), teamId, initialPurse);

            // If captain is specified, assign them
            let captainName = null;
            if (captainAccountId && data) {
                const { error: capErr } = await supabase
                    .from("vpl_registrations")
                    .update({
                        is_captain: true,
                        team_name: data.name,
                        price: 0
                    })
                    .eq("account_id", captainAccountId)
                    .eq("season", 2);

                if (capErr) {
                    console.error("Captain assignment error:", capErr.message);
                } else {
                    const { data: capData } = await supabase
                        .from("varchasva_accounts")
                        .select("name")
                        .eq("account_id", captainAccountId)
                        .single();
                    captainName = capData?.name || null;
                }
            }

            revalidatePath("/squads");
            revalidatePath("/points");
            return NextResponse.json({
                ok: true,
                team: { ...data, purse: initialPurse, captainId: captainAccountId || null, captainName }
            });
        }

        if (action === "update") {
            const { teamId, name, shortName, color, groupId, purse } = body;
            if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

            // Get old team name for updating registrations
            const { data: oldTeam } = await supabase
                .from("Team")
                .select("name")
                .eq("id", teamId)
                .single();

            const updateData: any = { updatedAt: new Date().toISOString() };
            if (name !== undefined) updateData.name = name.trim();
            if (shortName !== undefined) updateData.shortName = shortName.trim().toUpperCase();
            if (color !== undefined) updateData.color = color;
            if (groupId !== undefined) updateData.groupId = groupId;

            if (Object.keys(updateData).length > 1) { // More than just updatedAt
                const { error } = await supabase.from("Team").update(updateData).eq("id", teamId);
                if (error) throw new Error(error.message);
            }

            if (purse !== undefined) {
                await redis.hset(teamPursesKey(), teamId, parseInt(purse, 10));
            }

            // If name changed, update all player registrations
            if (name && oldTeam && name.trim() !== oldTeam.name) {
                await supabase
                    .from("vpl_registrations")
                    .update({ team_name: name.trim() })
                    .eq("team_name", oldTeam.name)
                    .eq("season", 2);
            }

            revalidatePath("/squads");
            revalidatePath("/points");
            return NextResponse.json({ ok: true });
        }

        if (action === "assign_captain") {
            const { teamId, captainAccountId } = body;
            if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

            // Get team name
            const { data: team } = await supabase
                .from("Team")
                .select("name")
                .eq("id", teamId)
                .single();
            if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

            // Remove existing captain for this team
            await supabase
                .from("vpl_registrations")
                .update({ is_captain: false, team_name: "UNSOLD", price: 0 })
                .eq("team_name", team.name)
                .eq("is_captain", true)
                .eq("season", 2);

            // If a new captain is selected (not clearing)
            if (captainAccountId) {
                const { error: capErr } = await supabase
                    .from("vpl_registrations")
                    .update({
                        is_captain: true,
                        team_name: team.name,
                        price: 0
                    })
                    .eq("account_id", captainAccountId)
                    .eq("season", 2);

                if (capErr) throw new Error(capErr.message);
            }

            return NextResponse.json({ ok: true });
        }

        if (action === "delete") {
            const { teamId } = body;
            if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

            // Get team name to reset players
            const { data: teamRow } = await supabase.from("Team").select("name").eq("id", teamId).single();
            if (teamRow?.name) {
                // Reset all players assigned to this team
                await supabase.from("vpl_registrations")
                    .update({ team_name: "UNSOLD", price: 0, is_captain: false })
                    .eq("team_name", teamRow.name)
                    .eq("season", 2);
            }

            // Delete related records
            await supabase.from("Player").delete().eq("teamId", teamId);
            await supabase.from("Match").delete().or(`team1Id.eq.${teamId},team2Id.eq.${teamId}`);
            const { error } = await supabase.from("Team").delete().eq("id", teamId);
            if (error) throw new Error(error.message);

            await redis.hdel(teamPursesKey(), teamId);

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
