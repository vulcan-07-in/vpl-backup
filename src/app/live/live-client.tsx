"use client";

import { useState, useEffect } from "react";
import { type Fixture, type Team, type LiveMatchState } from "@/lib/tournament";
import { Clock } from "lucide-react";

export default function LiveViewerClient({ fixtures, teams }: { fixtures: Fixture[], teams: Team[] }) {
    const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(null);
    const [loading, setLoading] = useState(true);

    const colorOf = (name?: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";

    useEffect(() => {
        const fetchLiveStatus = async () => {
            const unplayedIds = fixtures.filter(f => !f.winner).map(f => f.matchNo);
            const matchesToCheck = unplayedIds.slice(0, 3);

            for (const id of matchesToCheck) {
                try {
                    const res = await fetch(`/api/live-score?matchId=${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === "LIVE" || data.status === "SCHEDULED") {
                            setLiveMatch(data);
                            setLoading(false);
                            return; // Stop after finding the first active or scheduled match
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }
            // If we checked the top 3 and found nothing:
            setLiveMatch(null);
            setLoading(false);
        };
        fetchLiveStatus();

        // Refresh exactly every 2 seconds for a fast, snappy real-time experience!
        const interval = setInterval(fetchLiveStatus, 2000);
        return () => clearInterval(interval);
    }, [fixtures]);

    if (loading) {
        return (
            <div className="min-h-screen pt-32 pb-16 px-4 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
        );
    }

    if (!liveMatch) {
        return (
            <main className="min-h-screen pt-32 pb-16 px-4 flex flex-col items-center justify-center text-center">
                <p className="text-[14px] tracking-[0.5em] text-zinc-600 mb-4 font-bold" style={{ fontFamily: "var(--font-body)" }}>
                    MATCH CENTER
                </p>
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                    <span className="text-3xl text-zinc-500">📡</span>
                </div>
                <h2 className="text-3xl text-white font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                    NO LIVE MATCH
                </h2>
                <p className="text-zinc-500 max-w-sm">
                    There are no ongoing matches at this moment. Check the Match schedule to see when the next game begins.
                </p>
            </main>
        );
    }

    if (liveMatch.status === "SCHEDULED") {
        return (
            <main className="min-h-screen pt-32 pb-16 px-4 flex flex-col items-center justify-center text-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                <p className="text-[12px] tracking-[0.5em] text-blue-400 mb-6 font-bold" style={{ fontFamily: "var(--font-body)" }}>
                    UPCOMING MATCH {liveMatch.matchId}
                </p>
                <div className="w-24 h-24 bg-black border border-blue-500/30 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    <Clock className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-6xl text-white font-bold mb-4 tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
                    {liveMatch.scheduledTime}
                </h2>
                <h3 className="text-2xl text-zinc-400 max-w-sm mt-4 font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                    {liveMatch.innings1.teamName} <span className="text-zinc-600 mx-2 text-lg">vs</span> {liveMatch.innings2.teamName}
                </h3>
            </main>
        );
    }

    // LIVE MATCH VIEW
    const currentInningsData = liveMatch.currentInnings === 1 ? liveMatch.innings1 : liveMatch.innings2;
    const battingColor = colorOf(currentInningsData.teamName);

    const activeStriker = currentInningsData.batsmen[currentInningsData.strikerRef || ""];
    const activeNonStriker = currentInningsData.batsmen[currentInningsData.nonStrikerRef || ""];
    const activeBowler = currentInningsData.bowlers[currentInningsData.currentBowlerRef || ""];

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:pt-32">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]" />
                        <span className="text-sm font-bold tracking-[0.3em] text-red-500 uppercase">LIVE MATCH {liveMatch.matchId}</span>
                    </div>
                </div>

                {/* Score Big Board */}
                <div className="relative w-full rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 10% -20%, ${battingColor}, transparent 60%)` }} />

                    <div className="p-8 md:p-12 relative z-10 flex flex-col items-center text-center">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                            {currentInningsData.teamName}
                        </h2>

                        <div className="flex items-baseline justify-center gap-2 mb-2">
                            <span className="text-8xl md:text-[12rem] font-bold text-white leading-none tracking-tighter drop-shadow-lg" style={{ fontFamily: "var(--font-display)" }}>
                                {currentInningsData.runs}
                            </span>
                            <span className="text-5xl md:text-8xl font-bold text-zinc-500 leading-none" style={{ fontFamily: "var(--font-display)" }}>
                                -{currentInningsData.wickets}
                            </span>
                        </div>

                        <div className="mt-2 flex items-center gap-6">
                            <span className="text-2xl md:text-3xl font-medium text-zinc-400 tabular-nums">
                                OVERS: {currentInningsData.overs.toFixed(1)} <span className="text-zinc-600 text-lg">/ {liveMatch.matchOvers}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Player Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* BATSMEN */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-500 mb-4 border-b border-zinc-800 pb-3">BATSMEN</h3>
                        <div className="space-y-3 relative z-10">
                            <div className={`flex justify-between items-center p-3 rounded-xl border ${activeStriker ? 'border-amber-500/30 bg-amber-500/10' : 'border-zinc-800 bg-black/50'} transition-all`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-lg">{activeStriker ? activeStriker.name : "Waiting..."}</span>
                                    {activeStriker && <span className="text-amber-500 text-xl leading-none -mt-1">*</span>}
                                </div>
                                <span className="text-white font-bold text-lg tabular-nums">
                                    {activeStriker ? `${activeStriker.runs}` : "0"}<span className="text-zinc-500 font-normal ml-2">({activeStriker?.balls || 0})</span>
                                </span>
                            </div>

                            <div className={`flex justify-between items-center p-3 rounded-xl border text-zinc-300 ${activeNonStriker ? 'border-zinc-700 bg-black' : 'border-zinc-800 bg-black/50'}`}>
                                <span>{activeNonStriker ? activeNonStriker.name : "Waiting..."}</span>
                                <span className="tabular-nums font-bold">
                                    {activeNonStriker ? `${activeNonStriker.runs}` : "0"}<span className="text-zinc-600 font-normal ml-2">({activeNonStriker?.balls || 0})</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* BOWLER */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-500 mb-4 border-b border-zinc-800 pb-3">CURRENT BOWLER</h3>
                        <div className={`flex justify-between items-center p-3 rounded-xl border ${activeBowler ? 'border-blue-500/30 bg-blue-500/10' : 'border-zinc-800 bg-black/50'} transition-all mt-2`}>
                            <span className="text-blue-100 font-bold text-lg">{activeBowler ? activeBowler.name : "Waiting..."}</span>
                            <div className="flex items-center gap-4 text-white font-bold text-lg tabular-nums">
                                <span>{activeBowler ? `${activeBowler.wickets}-${activeBowler.runs}` : "0-0"}</span>
                                <span className="text-zinc-500 font-normal text-sm">({activeBowler ? activeBowler.overs.toFixed(1) : "0.0"})</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
