import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import PointsClient from "./points-client";
import { Metadata } from "next";
import Redis from "ioredis";
import fs from 'fs';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || "");

export const metadata: Metadata = {
    title: "Standings | Varchasva Premier League",
    description: "Current points table and group standings for the VPL.",
};

export default async function PointsPage() {
    // Fetch data perfectly on the server with ISR (revalidates every 60s)
    const teams = await fetchTeams();
    const fixtures = await fetchFixtures();

    // Fetch live states from our internal API (Redis) directly to bypass Vercel internal API limitations
    let liveStates: Record<string, any> = {};
    const cleanId = (id: string) => decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();

    // 1. Try Redis
    try {
        const keys = await redis.keys('live_match_*').catch(() => []);
        if (keys.length > 0) {
            const values = await redis.mget(...keys);
            keys.forEach((key, i) => {
                const matchId = key.replace('live_match_', '');
                const data = values[i];
                if (data) {
                    liveStates[cleanId(matchId)] = JSON.parse(data);
                }
            });
        }
    } catch (e) {
        console.error("Failed to fetch live states from Redis for points page", e);
    }

    // 2. Try static backup (Season 1)
    try {
        const backupPath = path.join(process.cwd(), 'src/data/season1.json');
        if (fs.existsSync(backupPath)) {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            Object.keys(backupData).forEach(key => {
                const matchId = key.replace('live_match_', '');
                const cleanMatchId = cleanId(matchId);
                if (!liveStates[cleanMatchId]) {
                    liveStates[cleanMatchId] = backupData[key];
                }
            });
        }
    } catch (e) {
        console.error("Failed to load static Season 1 backup for points page", e);
    }

    return <PointsClient fixtures={fixtures} teams={teams} liveStates={liveStates} />;
}
