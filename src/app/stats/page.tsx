import { Suspense } from "react";
import StatsClient from "./stats-client";
import { fetchTeams } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StatsPage() {
    const teams = await fetchTeams(2);
    
    return (
        <div className="min-h-screen bg-black overflow-x-hidden">
            <Suspense fallback={
                <div className="h-[70vh] flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                <StatsClient teams={teams} />
            </Suspense>
        </div>
    );
}
