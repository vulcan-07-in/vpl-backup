import { fetchFixtures, fetchTeams } from "@/lib/tournament";
import PointsClient from "./points-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Standings | Varchasva Premier League",
    description: "Current points table and group standings for the VPL.",
};

export default async function PointsPage() {
    // Fetch data perfectly on the server with ISR (revalidates every 60s)
    const teams = await fetchTeams();
    const fixtures = await fetchFixtures();

    // Fetch live states from our internal API (Redis) to ensure ground truth
    let liveStates = {};
    try {
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const host = process.env.VERCEL_URL || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;
        
        const res = await fetch(`${baseUrl}/api/live-score/all`, { cache: 'no-store' });
        if (res.ok) {
            liveStates = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch live states for points page", e);
    }

    return <PointsClient fixtures={fixtures} teams={teams} liveStates={liveStates} />;
}
