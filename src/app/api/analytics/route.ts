import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { validateAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const redis = new Redis(process.env.REDIS_URL || "");

// ── POST: receive a viewer ping ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { visitorId, page, device, action, team } = body;

        if (!visitorId || !page) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Server-side Bot Detection
        const userAgent = req.headers.get("user-agent") || "";
        const uaLower = userAgent.toLowerCase();
        const isServerBot = [
            "bot", "crawler", "spider", "lighthouse", "chrome-lighthouse", 
            "prerender", "headless", "selenium", "puppeteer", "playwright",
            "axios", "curl", "wget", "uptime", "pingdom", "lately", 
            "semrush", "ahrefs", "screaming", "googlebot", "bingbot", 
            "yandex", "baidu", "facebookexternalhit", "twitterbot", 
            "linkedinbot", "discordbot", "telegrambot", "slackbot"
        ].some(keyword => uaLower.includes(keyword));

        if (isServerBot) {
            // Silently return ok but skip writing to Redis to prevent fake metrics
            return NextResponse.json({ ok: true, ignored: "bot" });
        }

        const pipeline = redis.pipeline();

        // 1. Maintain a short-lived key per visitor+page so we can count concurrents
        //    TTL of 300s — heartbeat fires every 120s with 25% sampling, so 5min TTL covers gaps
        const sessionKey = `s2:active_viewer:${visitorId}:${page}`;
        pipeline.set(sessionKey, "1", "EX", 300);

        // 2. Increment total page-view counter (persistent hash)
        pipeline.hincrby("s2:page_hits", page, 1);

        // 3. Device breakdown (Mobile / Tablet / Desktop)
        if (device) {
            pipeline.hincrby("s2:device_breakdown", device, 1);
        }

        // 4. Squad-view event tracking
        if (action === "squad_view" && team) {
            pipeline.hincrby("s2:squad_views", team, 1);
        }

        await pipeline.exec();

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[Analytics POST]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// ── GET: return aggregated analytics (admin-only) ────────────────────────────
export async function GET() {
    if (!(await validateAdminRequest())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Scan all active viewer keys
        const keys: string[] = [];
        let cursor = "0";
        do {
            const [newCursor, batch] = await redis.scan(cursor, "MATCH", "s2:active_viewer:*", "COUNT", 200);
            cursor = newCursor;
            keys.push(...batch);
        } while (cursor !== "0");

        // Count concurrents per page
        const concurrentsByPage: Record<string, number> = {};
        let totalConcurrent = 0;
        for (const key of keys) {
            // key format: s2:active_viewer:<visitorId>:<page>
            // page can contain slashes — split after the third ':'
            const parts = key.split(":");
            // parts[0]=s2, parts[1]=active_viewer, parts[2]=visitorId, parts[3..]=page
            const page = parts.slice(3).join(":") || "/";
            concurrentsByPage[page] = (concurrentsByPage[page] || 0) + 1;
            totalConcurrent++;
        }

        // Read persistent metrics
        const [pageHits, deviceBreakdown, squadViews] = await Promise.all([
            redis.hgetall("s2:page_hits"),
            redis.hgetall("s2:device_breakdown"),
            redis.hgetall("s2:squad_views"),
        ]);

        return NextResponse.json({
            totalConcurrent,
            concurrentsByPage,
            pageHits: pageHits || {},
            deviceBreakdown: deviceBreakdown || {},
            squadViews: squadViews || {},
        });
    } catch (err) {
        console.error("[Analytics GET]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
