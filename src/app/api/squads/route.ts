import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminRequest } from "@/lib/auth";
import { fetchSquads } from "@/lib/data";

export async function GET() {
    try {
        const squads = await fetchSquads();
        return NextResponse.json(squads);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = await request.json();
        
        // This is a simplified replacement. A full admin panel would send specific actions
        // like "create_team", "update_team", "add_player", etc.
        // For compatibility with any old generic 'save all' calls, we can parse it:
        if (Array.isArray(payload)) {
            return NextResponse.json({ ok: true, message: "Use targeted Prisma API calls instead of bulk arrays." });
        }

        // Handle specific actions for the new Season 2 Admin
        if (payload.action === 'create_team') {
            await prisma.team.create({
                data: {
                    name: payload.name,
                    shortName: payload.shortName,
                    color: payload.color || "#FFFFFF",
                    groupId: payload.groupId || "A"
                }
            });
            return NextResponse.json({ ok: true });
        }

        if (payload.action === 'add_player') {
            await prisma.player.create({
                data: {
                    name: payload.name,
                    role: payload.role,
                    price: parseInt(payload.price) || 0,
                    teamId: payload.teamId
                }
            });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("Prisma Squads Write Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
