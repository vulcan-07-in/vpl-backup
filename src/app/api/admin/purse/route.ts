import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/auth";
import Redis from "ioredis";
import { teamPursesKey } from "@/lib/redis-keys";

// Singleton redis
const globalForRedis = global as unknown as { redis: Redis };
const redis = globalForRedis.redis || new Redis(process.env.REDIS_URL || "");
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export async function GET() {
    try {
        const purses = await redis.hgetall(teamPursesKey());
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

        await redis.hset(teamPursesKey(), teamId, purse.toString());
        return NextResponse.json({ status: "SUCCESS" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
