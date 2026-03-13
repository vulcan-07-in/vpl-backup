"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Zap, Target, BarChart3, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { type LiveMatchState, type Team } from "@/lib/tournament";

interface PlayerStats {
    name: string;
    team: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    wickets: number;
    runsConceded: number;
    ballsBowled: number;
    strikeRate: number;
    economy: number;
}

export default function StatsClient({ teams }: { teams: Team[] }) {
    const [liveStates, setLiveStates] = useState<Record<string, LiveMatchState>>({});
    const [loading, setLoading] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllScores = async () => {
            try {
                const res = await fetch("/api/live-score/all");
                if (res.ok) {
                    const data = await res.json();
                    setLiveStates(data);
                }
            } catch (e) {
                console.error("Failed to fetch stats:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAllScores();
    }, []);

    const aggregatedStats = useMemo(() => {
        const statsMap: Record<string, PlayerStats> = {};

        Object.values(liveStates).forEach(match => {
            match.timeline.forEach(ball => {
                // Batsman Stats
                if (!statsMap[ball.striker]) {
                    statsMap[ball.striker] = {
                        name: ball.striker,
                        team: ball.innings === 1 ? match.innings1.teamName : match.innings2.teamName,
                        runs: 0, balls: 0, fours: 0, sixes: 0,
                        wickets: 0, runsConceded: 0, ballsBowled: 0,
                        strikeRate: 0, economy: 0
                    };
                }
                
                const b = statsMap[ball.striker];
                // C2 FIX: WD doesn't count for batsman at all.
                // NB counts runs but NOT balls faced.
                if (ball.extraType !== "WD" && ball.extraType !== "SWAP" && ball.extraType !== "DB") {
                    b.runs += ball.runs;
                    if (ball.extraType !== "NB") b.balls += 1; // NB does NOT count as ball faced
                    if (ball.runs === 4) b.fours += 1;
                    if (ball.runs === 6) b.sixes += 1;
                }

                // Bowler Stats
                if (!statsMap[ball.bowler]) {
                    statsMap[ball.bowler] = {
                        name: ball.bowler,
                        team: ball.innings === 1 ? match.innings2.teamName : match.innings1.teamName,
                        runs: 0, balls: 0, fours: 0, sixes: 0,
                        wickets: 0, runsConceded: 0, ballsBowled: 0,
                        strikeRate: 0, economy: 0
                    };
                }
                const bw = statsMap[ball.bowler];
                // Legal balls for bowler overs (WD/NB/DB/SWAP don't count)
                if (!ball.extraType || (ball.extraType !== "WD" && ball.extraType !== "NB" && ball.extraType !== "DB" && ball.extraType !== "SWAP")) {
                    bw.ballsBowled += 1;
                }
                
                // Runs conceded (skip DB and SWAP)
                if (ball.extraType !== "DB" && ball.extraType !== "SWAP") {
                    bw.runsConceded += (ball.runs + ball.extras);
                }
                
                // Wickets (Exclude run outs from bowler wickets)
                if (ball.isWicket && ball.wicketType !== "RUNOUT" && ball.wicketType !== "RETIRED_HURT") {
                    bw.wickets += 1;
                }
            });
        });

        // Calculate rates
        return Object.values(statsMap).map(s => ({
            ...s,
            strikeRate: s.balls > 0 ? (s.runs / s.balls) * 100 : 0,
            economy: s.ballsBowled > 0 ? (s.runsConceded / (s.ballsBowled / 6)) : 0
        }));
    }, [liveStates]);

    const leaderboards = useMemo(() => {
        return {
            runs: [...aggregatedStats]
                .filter(p => p.balls >= 15)
                .sort((a, b) => b.runs - a.runs || a.balls - b.balls),
            strikeRate: [...aggregatedStats]
                .filter(p => p.balls >= 15)
                .sort((a, b) => b.strikeRate - a.strikeRate),
            wickets: [...aggregatedStats]
                .filter(p => p.ballsBowled >= 18) // 3 overs
                .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded),
            economy: [...aggregatedStats]
                .filter(p => p.ballsBowled >= 18) // 3 overs
                .sort((a, b) => a.economy - b.economy)
        };
    }, [aggregatedStats]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-black">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-zinc-500 font-bold tracking-[0.3em] text-[10px] uppercase">Compiling Tournament Data</p>
            </div>
        );
    }

    const categories = [
        { id: "runs", title: "Highest Runs", icon: Trophy, data: leaderboards.runs, unit: "Runs", sub: "Min 15 balls" },
        { id: "strikeRate", title: "Best Strike Rate", icon: Zap, data: leaderboards.strikeRate, unit: "SR", sub: "Min 15 balls" },
        { id: "wickets", title: "Most Wickets", icon: Target, data: leaderboards.wickets, unit: "Wkts", sub: "Min 3 overs" },
        { id: "economy", title: "Best Economy", icon: BarChart3, data: leaderboards.economy, unit: "Econ", sub: "Min 3 overs" },
    ];

    return (
        <main className="min-h-screen pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-16">
                    <p className="text-[11px] tracking-[0.5em] text-zinc-600 mb-3 uppercase font-bold">VPL Analytics</p>
                    <h1 className="text-6xl md:text-8xl text-white leading-none font-bold" style={{ fontFamily: "var(--font-display)" }}>
                        PLAYER STATS
                    </h1>
                    <div className="mt-6 flex items-center gap-4">
                        <div className="h-px w-12 bg-amber-500 border-none" />
                        <span className="text-xs text-zinc-500 tracking-[0.2em] font-medium">RANKINGS & LEADERBOARDS</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {categories.map((cat) => (
                        <motion.div 
                            key={cat.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-white/5 flex justify-between items-end bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                        <cat.icon className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">{cat.title}</h3>
                                        {cat.sub && <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-0.5">{cat.sub}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden">
                                {cat.data.length === 0 ? (
                                    <div className="py-20 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold">No eligible data yet</div>
                                ) : (
                                    <div className="divide-y divide-white/[0.03]">
                                        {/* U2 FIX: Default 5, expanded shows top 10 */}
                                        {cat.data.slice(0, expandedCategory === cat.id ? 10 : 5).map((player, idx) => (
                                            <div key={player.name} className={`p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors ${idx < 3 ? 'bg-amber-500/[0.02]' : ''}`}>
                                                <div className="flex items-center gap-4">
                                                    <span className={`w-6 text-center font-mono text-xs ${idx === 0 ? 'text-amber-500 font-bold' : idx === 1 ? 'text-zinc-400' : idx === 2 ? 'text-amber-800' : 'text-zinc-700'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">{player.name}</p>
                                                        <p className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase">{player.team}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-white tabular-nums">
                                                        {cat.id === "runs" ? player.runs : 
                                                         cat.id === "strikeRate" ? player.strikeRate.toFixed(1) :
                                                         cat.id === "wickets" ? player.wickets :
                                                         player.economy.toFixed(2)}
                                                    </p>
                                                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">{cat.unit}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cat.data.length > 5 && (
                                <button
                                    onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                                    className="p-5 w-full bg-white/[0.03] hover:bg-white/[0.05] text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                                >
                                    {expandedCategory === cat.id ? (
                                        <>SHOW LESS <ChevronUp className="w-4 h-4" /></>
                                    ) : (
                                        <>VIEW TOP 10 <ChevronDown className="w-4 h-4" /></>
                                    )}
                                </button>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </main>
    );
}
