import Redis from "ioredis";
import { NextResponse } from "next/server";

const redis = new Redis(process.env.REDIS_URL || '');

export async function POST(req: Request) {
    try {
        const { matchId, action, details, timestamp, scorerId } = await req.json();

        if (!matchId || !action) {
            return NextResponse.json({ error: "MatchId and Action required" }, { status: 400 });
        }

        const logKey = `vpl_logs_${matchId}`;
        const logEntry = {
            id: Date.now().toString(),
            action,
            details,
            timestamp: timestamp || Date.now(),
            scorerId: scorerId || "anonymous"
        };

        // Store in a list in Redis
        await redis.lpush(logKey, JSON.stringify(logEntry));
        // Keep only last 1000 logs per match
        await redis.ltrim(logKey, 0, 999);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Log error:", e);
        return NextResponse.json({ error: "Failed to store log" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
        return NextResponse.json({ error: "MatchId required" }, { status: 400 });
    }

    try {
        const logKey = `vpl_logs_${matchId}`;
        const logs = await redis.lrange(logKey, 0, -1);
        return NextResponse.json(logs.map((l: any) => typeof l === 'string' ? JSON.parse(l) : l));
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
