import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { validateAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const redis = new Redis(process.env.REDIS_URL || "");

async function deletePattern(pattern: string) {
    let cursor = "0";
    do {
        const [newCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
        cursor = newCursor;
        if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
}

export async function POST(req: NextRequest) {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await req.json();

    if (action === "reset") {
        await Promise.all([
            deletePattern("s2:active_viewer:*"),
            redis.del("s2:page_hits"),
            redis.del("s2:device_breakdown"),
            redis.del("s2:squad_views"),
        ]);
        return NextResponse.json({ ok: true, message: "Analytics reset." });
    }

    if (action === "inject_mock") {
        const pipeline = redis.pipeline();

        // Inject mock concurrent viewers (fake visitor IDs, 25s TTL)
        const mockPages: Record<string, number> = {
            "/": 28,
            "/live": 142,
            "/auction": 67,
            "/squads": 19,
            "/points": 11,
            "/matches": 8,
            "/stats": 5,
        };
        for (const [page, count] of Object.entries(mockPages)) {
            for (let i = 0; i < count; i++) {
                pipeline.set(`s2:active_viewer:mock-${page.replace(/\//g, "_")}-${i}:${page}`, "1", "EX", 25);
            }
        }

        // Inject historical page hits
        pipeline.hset("s2:page_hits",
            "/", 1240,
            "/live", 8830,
            "/auction", 3410,
            "/squads", 920,
            "/points", 540,
            "/matches", 380,
            "/stats", 210,
        );

        // Inject device breakdown
        pipeline.hset("s2:device_breakdown",
            "Mobile", 6840,
            "Desktop", 3120,
            "Tablet", 580,
        );

        // Inject squad views (top teams)
        pipeline.hset("s2:squad_views",
            "Thunderbolts", 142,
            "Royal Strikers", 98,
            "Phoenix FC", 87,
            "Storm Riders", 76,
            "Golden Eagles", 65,
            "Iron Warriors", 54,
            "Blue Blaze", 43,
            "Red Lions", 38,
            "Silver Arrows", 29,
            "Dark Knights", 22,
        );

        await pipeline.exec();
        return NextResponse.json({ ok: true, message: "Mock data injected." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
