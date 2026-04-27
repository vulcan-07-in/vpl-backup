import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminRequest } from "@/lib/auth";

// Returns teams with IDs for admin operations
export async function GET() {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const teams = await prisma.team.findMany({
            include: { players: true },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(teams);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
