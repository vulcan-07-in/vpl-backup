import { fetchFixtures, fetchTeams } from "@/lib/data";
import PointsClient from "./points-client";
import { Metadata } from "next";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "");

export const metadata: Metadata = {
    title: "Standings | Varchasva Premier League",
    description: "Current points table and group standings for the VPL Season 2.",
};

export default async function PointsPage() {
    // Fetch S2 data from Supabase
    const teams = await fetchTeams(2);
    const fixtures = await fetchFixtures(2);

    // Fetch live states from Redis using S2 prefix
    let liveStates: Record<string, any> = {};
    try {
        const keys = await redis.keys('s2:live_match_*');
        if (keys.length > 0) {
            const values = await redis.mget(...keys);

            // Clean ID helper to ensure "M 5" matches "m5" against any drift
            const cleanId = (id: string) =>
                decodeURIComponent(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();

            keys.forEach((key, i) => {
                const matchId = key.replace('s2:live_match_', '');
                const data = values[i];
                if (data) {
                    const parsed = JSON.parse(data);
                    liveStates[cleanId(matchId)] = parsed;
                }
            });
        }
    } catch (e) {
        console.error("Failed to fetch S2 live states from Redis for points page", e);
    }

    return <PointsClient fixtures={fixtures} teams={teams} liveStates={liveStates} />;
}
