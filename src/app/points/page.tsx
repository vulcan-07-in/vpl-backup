import { fetchFixtures, fetchTeams } from "@/lib/data";
import PointsClient from "./points-client";
import { Metadata } from "next";
import Redis from "ioredis";
import { supabase } from "@/lib/supabase";

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
    // Clean ID helper to ensure "M 5" matches "m5" against any drift
    const cleanId = (id: string) => String(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();

    let liveStates: Record<string, any> = {};

    try {
        // 1. Fetch persistent states from Supabase
        const { data: matches, error } = await supabase
            .from('Match')
            .select('matchNo, liveState')
            .not('liveState', 'is', null);

        if (!error && matches) {
            matches.forEach(m => {
                const matchId = cleanId(m.matchNo);
                if (m.liveState) {
                    liveStates[matchId] = m.liveState;
                }
            });
        }
    } catch (e) {
        console.error("Failed to fetch S2 live states from Supabase for points page", e);
    }

    try {
        // 2. Override with fresh states from Redis
        const keys = await redis.keys('s2:live_match_*');
        if (keys.length > 0) {
            const values = await redis.mget(...keys);

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
