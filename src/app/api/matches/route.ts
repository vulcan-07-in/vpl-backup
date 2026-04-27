import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminRequest } from "@/lib/auth";
import { fetchFixtures } from "@/lib/data";

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
        
        if (payload.action === 'sync_result' && payload.matchNo && payload.winner) {
            // Update a specific match winner
            const team = await prisma.team.findUnique({ where: { name: payload.winner } });
            if (team) {
                await prisma.match.update({
                    where: { matchNo: payload.matchNo },
                    data: { winnerId: team.id, status: 'COMPLETED' }
                });
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
            return NextResponse.json({ ok: true });
        }

        if (payload.action === 'delete_match') {
            await prisma.match.delete({ where: { matchNo: payload.matchNo } });
            return NextResponse.json({ ok: true });
        }

        if (payload.action === 'clear_winner') {
            await prisma.match.update({
                where: { matchNo: payload.matchNo },
                data: { winnerId: null, status: 'SCHEDULED' }
            });
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
