import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminRequest } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fetchFixtures } from "@/lib/data";

import { revalidatePath } from "next/cache";

// GET — return fixtures from Prisma
export async function GET() {
    try {
        const fixtures = await fetchFixtures();
        return NextResponse.json(fixtures);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// POST — write full fixture list (admin only) or update a match
export async function POST(request: Request) {
  if (!(await validateAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const isSeason2 = payload.season === 2;

    // Helper to get team ID by name (used for Supabase)
    async function getTeamIdByName(name: string) {
      if (isSeason2) {
        const { data, error } = await supabase
          .from("team")
          .select("id")
          .eq("name", name)
          .single();
        if (error) throw new Error(error.message);
        return data.id;
      } else {
        const team = await prisma.team.findUnique({ where: { name } });
        return team?.id;
      }
    }

    if (payload.action === 'sync_result' && payload.matchNo && payload.winner) {
      const winnerId = await getTeamIdByName(payload.winner);
      if (isSeason2) {
        const { error } = await supabase
          .from("match")
          .update({ winner_id: winnerId, status: "COMPLETED" })
          .eq("matchNo", payload.matchNo);
        if (error) throw new Error(error.message);
      } else {
        const team = await prisma.team.findUnique({ where: { name: payload.winner } });
        if (team) {
          await prisma.match.update({
            where: { matchNo: payload.matchNo },
            data: { winnerId: team.id, status: 'COMPLETED' }
          });
        }
      }
      revalidatePath('/matches');
      revalidatePath('/points');
      revalidatePath('/stats');
      revalidatePath('/');
      return NextResponse.json({ ok: true });
    }

    if (payload.action === 'create_match') {
      if (isSeason2) {
        const { error } = await supabase.from('match').insert({
          matchNo: payload.matchNo,
          stage: payload.stage,
          group: payload.group || null,
          team1_id: payload.team1Id,
          team2_id: payload.team2Id,
          scheduledTime: payload.scheduledTime ? new Date(payload.scheduledTime).toISOString() : null,
          status: 'SCHEDULED'
        });
        if (error) throw new Error(error.message);
      } else {
        await prisma.match.create({
          data: {
            matchNo: payload.matchNo,
            stage: payload.stage,
            group: payload.group || null,
            team1Id: payload.team1Id,
            team2Id: payload.team2Id,
            scheduledTime: payload.scheduledTime ? new Date(payload.scheduledTime) : null,
            status: 'SCHEDULED'
          }
        });
      }
      revalidatePath('/matches');
      revalidatePath('/');
      return NextResponse.json({ ok: true });
    }

    if (payload.action === 'delete_match') {
      if (isSeason2) {
        const { error } = await supabase.from('match').delete().eq('matchNo', payload.matchNo);
        if (error) throw new Error(error.message);
      } else {
        await prisma.match.delete({ where: { matchNo: payload.matchNo } });
      }
      revalidatePath('/matches');
      revalidatePath('/points');
      revalidatePath('/');
      return NextResponse.json({ ok: true });
    }

    if (payload.action === 'clear_winner') {
      if (isSeason2) {
        const { error } = await supabase.from('match').update({ winner_id: null, status: 'SCHEDULED' }).eq('matchNo', payload.matchNo);
        if (error) throw new Error(error.message);
      } else {
        await prisma.match.update({
          where: { matchNo: payload.matchNo },
          data: { winnerId: null, status: 'SCHEDULED' }
        });
      }
      revalidatePath('/matches');
      revalidatePath('/points');
      revalidatePath('/stats');
      revalidatePath('/');
      return NextResponse.json({ ok: true });
    }

    if (Array.isArray(payload)) {
      return NextResponse.json({ ok: true, message: "Use individual match updates with Prisma or Supabase." });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(isSeason2 ? "Supabase Matches Write Error:" : "Prisma Matches Write Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = await request.json();
        
        if (payload.action === 'sync_result' && payload.matchNo && payload.winner) {
            // Update a specific match winner
            const team = await prisma.team.findUnique({ where: { name: payload.winner } });
            if (team) {
                await prisma.match.update({
                    where: { matchNo: payload.matchNo },
                    data: { winnerId: team.id, status: 'COMPLETED' }
                });
                revalidatePath('/matches');
                revalidatePath('/points');
                revalidatePath('/stats');
                revalidatePath('/');
            }
            return NextResponse.json({ ok: true });
        }

        if (payload.action === 'create_match') {
            await prisma.match.create({
                data: {
                    matchNo: payload.matchNo,
                    stage: payload.stage,
                    group: payload.group || null,
                    team1Id: payload.team1Id,
                    team2Id: payload.team2Id,
                    scheduledTime: payload.scheduledTime ? new Date(payload.scheduledTime) : null,
                    status: 'SCHEDULED'
                }
            });
            revalidatePath('/matches');
            revalidatePath('/');
            return NextResponse.json({ ok: true });
        }

        if (payload.action === 'delete_match') {
            await prisma.match.delete({ where: { matchNo: payload.matchNo } });
            revalidatePath('/matches');
            revalidatePath('/points');
            revalidatePath('/');
            return NextResponse.json({ ok: true });
        }

        if (payload.action === 'clear_winner') {
            await prisma.match.update({
                where: { matchNo: payload.matchNo },
                data: { winnerId: null, status: 'SCHEDULED' }
            });
            revalidatePath('/matches');
            revalidatePath('/points');
            revalidatePath('/stats');
            revalidatePath('/');
            return NextResponse.json({ ok: true });
        }
        
        // Handling full array of fixtures (if still used)
        if (Array.isArray(payload)) {
            // For now, returning ok to not break older client components if any
            return NextResponse.json({ ok: true, message: "Use individual match updates with Prisma." });
        }

        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("Prisma Matches Write Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
