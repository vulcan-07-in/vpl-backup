import { Suspense } from "react";
import StatsClient from "./stats-client";
import { fetchTeams, fetchAllLiveStates } from "@/lib/data";
import { calculateAllPlayerStats } from "@/lib/mvp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StatsPage() {
    const teams = await fetchTeams(2);
    const liveStates = await fetchAllLiveStates();
    
    const rawStats = calculateAllPlayerStats(liveStates);
    const formattedStats = rawStats.map(s => ({
        ...s,
        strikeRate: s.balls > 0 ? (s.runs / s.balls) * 100 : 0,
        economy: s.ballsBowled > 0 ? (s.runsConceded / (s.ballsBowled / 6)) : 0
    }));
    
    // Fetch MVP state server-side
    let mvpState = { player: null, published: false };
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mvp`);
        if (res.ok) {
            mvpState = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch MVP state for stats page", e);
    }
    
    return (
        <div className="min-h-screen bg-black overflow-x-hidden">
            <Suspense fallback={
                <div className="h-[70vh] flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                <StatsClient teams={teams} initialStats={formattedStats} initialMvpState={mvpState} />
            </Suspense>
        </div>
    );
}
