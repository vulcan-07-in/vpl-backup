import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import PointsClient from "./points-client";
import { Metadata } from "next";
import Redis from "ioredis";

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
    try {
        const keys = await redis.keys('live_match_*');
        if (keys.length > 0) {
            const values = await redis.mget(...keys);
            
            // Clean ID helper to ensure "M 5" matches "m5" identically against CSV drifts
            const cleanId = (id: string) => decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
            
            keys.forEach((key, i) => {
                const matchId = key.replace('live_match_', '');
                const data = values[i];
                if (data) {
                    const parsed = JSON.parse(data);
                    // Map by clean ID to make NRR lookups invincible
                    liveStates[cleanId(matchId)] = parsed;
                }
            });
        }
    } catch (e) {
        console.error("Failed to fetch live states from Redis for points page", e);
    }

    return <PointsClient fixtures={fixtures} teams={teams} liveStates={liveStates} />;
}
