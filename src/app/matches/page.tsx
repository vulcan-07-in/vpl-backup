import { fetchFixtures, fetchTeams } from "@/lib/data";
import MatchesClient from "./matches-client";
import { Metadata } from "next";
import { resolveS2Playoffs } from "@/lib/tournament";
import { supabase } from "@/lib/supabase";
import Redis from "ioredis";

export const metadata: Metadata = {
    title: "Matches | Varchasva Premier League",
    description: "Match schedule and live results for VPL Season 2.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const redis = new Redis(process.env.REDIS_URL || "");

export default async function MatchesPage() {
    const teams = await fetchTeams(2);
    const fixtures = await fetchFixtures(2);

    let liveStates: Record<string, any> = {};
    const cleanId = (id: string) => String(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();

    try {
        const { data: matches } = await supabase.from('Match').select('matchNo, liveState').not('liveState', 'is', null);
        if (matches) {
            matches.forEach(m => {
                if (m.liveState) liveStates[cleanId(m.matchNo)] = m.liveState;
            });
        }
    } catch (e) {}

    try {
        const keys = await redis.keys('s2:live_match_*');
        if (keys.length > 0) {
            const values = await redis.mget(...keys);
            keys.forEach((key, i) => {
                const matchId = key.replace('s2:live_match_', '');
                if (values[i]) liveStates[cleanId(matchId)] = JSON.parse(values[i]);
            });
        }
    } catch (e) {}

    const resolvedFixtures = resolveS2Playoffs(fixtures, teams, liveStates);

    return <MatchesClient fixtures={resolvedFixtures} teams={teams} />;
}
