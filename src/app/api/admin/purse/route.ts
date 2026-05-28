import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateAdminRequest } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { teamPursesKey } from "@/lib/redis-keys";
import { AUCTION_CONSTANTS } from "@/lib/auction";

// Purse is stored in Redis to bypass Supabase schema constraints
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: teams, error } = await supabase
            .from("Team")
            .select("id")
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);

        const pursesHash = await redis.hgetall(teamPursesKey());
        
        const purses: Record<string, number> = {};
        for (const t of teams || []) {
            if (pursesHash[t.id]) {
                purses[t.id] = parseInt(pursesHash[t.id], 10);
            } else {
                purses[t.id] = AUCTION_CONSTANTS.MAX_BUDGET;
            }
        }
        return NextResponse.json(purses);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { teamId, purse } = body;

        if (!teamId || typeof purse !== 'number') {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        await redis.hset(teamPursesKey(), teamId, purse);

        return NextResponse.json({ status: "SUCCESS" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
