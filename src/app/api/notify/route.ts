import { NextResponse } from "next/server";
import Redis from "ioredis";
import { validateAdminRequest } from "@/lib/auth";

const redis = new Redis(process.env.REDIS_URL || "");

export async function POST(req: Request) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { matchId, message, type } = await req.json();

        if (!matchId || !message) {
            return NextResponse.json({ error: "MatchId and Message required" }, { status: 400 });
        }

        const notifyKey = `s2:vpl_notifications`;
        const notification = {
            id: Date.now().toString(),
            matchId,
            message,
            type: type || "INFO",
            timestamp: Date.now()
        };

        // Push to a global notification list
        await redis.lpush(notifyKey, JSON.stringify(notification));
        await redis.ltrim(notifyKey, 0, 49); // Keep only last 50 notifications

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Notify error:", e);
        return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const notifyKey = `s2:vpl_notifications`;
        const notifications = await redis.lrange(notifyKey, 0, -1);
        return NextResponse.json(notifications.map(n => typeof n === 'string' ? JSON.parse(n) : n));
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}
