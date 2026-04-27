import { NextResponse } from "next/server";
import Redis from "ioredis";
import { validateAdminRequest } from "@/lib/auth";

const redis = new Redis(process.env.REDIS_URL || "");

export async function POST(req: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { action, matchId, details } = body;

        const logEntry = {
            timestamp: Date.now(),
            action,
            matchId,
            details,
        };

        // Store logs in a list for the match
        await redis.lpush(`s2:vpl_logs_${matchId}`, JSON.stringify(logEntry));
        // Also a global list for the admin
        await redis.lpush(`s2:vpl_logs_global`, JSON.stringify(logEntry));
        // Trim to last 1000 logs
        await redis.ltrim(`s2:vpl_logs_global`, 0, 999);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to log action" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const isValid = await validateAdminRequest();
        if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const matchId = searchParams.get("matchId");
        
        const key = matchId ? `s2:vpl_logs_${matchId}` : `s2:vpl_logs_global`;
        const logs = await redis.lrange(key, 0, 100);

        return NextResponse.json(logs.map(l => typeof l === 'string' ? JSON.parse(l) : l));
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
