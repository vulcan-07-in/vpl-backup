"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Zap, Target, BarChart3, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { type LiveMatchState, type Team } from "@/lib/tournament";
import { calculateAllPlayerStats, getAchievements, type PlayerStats as MVPStats } from "@/lib/mvp";

export interface PlayerStats {
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
    catches?: number;
    stumpings?: number;
    runOuts?: number;
    totalDismissals?: number;
    gender?: string;
}

export default function StatsClient({ teams, initialStats, initialMvpState }: { teams: Team[], initialStats: PlayerStats[], initialMvpState: { player: string | null, published: boolean } }) {
    const [mvpState] = useState(initialMvpState);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const aggregatedStats = initialStats;

    const leaderboards = useMemo(() => {
        const femalePlayers = aggregatedStats.filter(p => p.gender === "Female");

        return {
            runs: [...aggregatedStats]
                .filter(p => p.balls >= 15)
                .sort((a, b) => b.runs - a.runs || a.balls - b.balls),
            strikeRate: [...aggregatedStats]
                .filter(p => p.balls >= 15)
                .sort((a, b) => b.strikeRate - a.strikeRate),
            wickets: [...aggregatedStats]
                .filter(p => p.ballsBowled >= 6) // 1 over minimum
                .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded),
            economy: [...aggregatedStats]
                .filter(p => p.ballsBowled >= 6) // 1 over minimum
                .sort((a, b) => a.economy - b.economy),
            sixes: [...aggregatedStats]
                .filter(p => p.sixes > 0)
                .sort((a, b) => b.sixes - a.sixes || a.balls - b.balls),
            boundaries: [...aggregatedStats]
                .filter(p => (p.fours + p.sixes) > 0)
                .sort((a, b) => (b.fours + b.sixes) - (a.fours + a.sixes) || a.balls - b.balls),
            fielding: [...aggregatedStats]
                .map(p => ({ ...p, totalDismissals: (p.catches || 0) + (p.stumpings || 0) + (p.runOuts || 0) }))
                .filter(p => (p.totalDismissals || 0) > 0)
                .sort((a, b) => (b.totalDismissals || 0) - (a.totalDismissals || 0)),
            femaleRuns: [...femalePlayers]
                .filter(p => p.balls > 0) // No strict minimum for female batsmanship
                .sort((a, b) => b.runs - a.runs || a.balls - b.balls),
            femaleWickets: [...femalePlayers]
                .filter(p => p.ballsBowled > 0)
                .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded),
        };
    }, [aggregatedStats]);



    const categories = [
        { id: "runs", title: "Highest Runs", icon: Trophy, data: leaderboards.runs, unit: "Runs", sub: "Min 15 balls" },
        { id: "strikeRate", title: "Best Strike Rate", icon: Zap, data: leaderboards.strikeRate, unit: "SR", sub: "Min 15 balls" },
        { id: "wickets", title: "Most Wickets", icon: Target, data: leaderboards.wickets, unit: "Wkts", sub: "Min 1 over" },
        { id: "economy", title: "Best Economy", icon: BarChart3, data: leaderboards.economy, unit: "Econ", sub: "Min 1 over" },
        { id: "sixes", title: "Maximum Sixes", icon: Zap, data: leaderboards.sixes, unit: "6s", sub: "Most 6s Hit" },
        { id: "boundaries", title: "Most Boundaries", icon: Trophy, data: leaderboards.boundaries, unit: "4s & 6s", sub: "Fours and Sixes" },
        { id: "fielding", title: "Best Fielder", icon: Target, data: leaderboards.fielding, unit: "D", sub: "C, St & RO" },
        { id: "femaleRuns", title: "Female Best Batsman", icon: Trophy, data: leaderboards.femaleRuns, unit: "Runs", sub: "Most Runs" },
        { id: "femaleWickets", title: "Female Best Bowler", icon: Target, data: leaderboards.femaleWickets, unit: "Wkts", sub: "Most Wickets" },
    ];

    const mvpLeaderboard = useMemo(() => {
        if (!initialStats || initialStats.length === 0) return [];
        return [...initialStats]
            .filter(p => (p as any).mvpPoints > 0)
            .sort((a, b) => (b as any).mvpPoints - (a as any).mvpPoints);
    }, [initialStats]);

    const mvpPlayer = mvpLeaderboard.length > 0 ? {
        ...mvpLeaderboard[0],
        achievements: getAchievements(mvpLeaderboard[0] as any)
    } : null;

    return (
        <main className="min-h-screen pt-24 pb-20 px-4 md:px-8 relative overflow-hidden bg-black">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-900/10 rounded-full blur-[150px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-16 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <p className="text-[11px] tracking-[0.5em] text-amber-500 mb-3 uppercase font-black">VPL Analytics</p>
                        <h1 className="text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-br from-white via-amber-100 to-amber-500 leading-none font-black drop-shadow-2xl" style={{ fontFamily: "var(--font-display)" }}>
                            PLAYER STATS
                        </h1>
                        <div className="mt-6 flex flex-col md:flex-row items-center gap-4">
                            <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent md:bg-amber-500 md:w-12 md:bg-none border-none" />
                            <span className="text-xs text-zinc-400 tracking-[0.3em] font-bold uppercase">Rankings & Leaderboards</span>
                        </div>
                    </div>
                </header>

                {/* MVP Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-20 relative group flex flex-col gap-8"
                >
                    {/* MVP Banner (Only show when published/Final over) */}
                    {mvpState.published && mvpPlayer && (
                        <div className="relative bg-black/60 backdrop-blur-3xl border border-amber-500/40 rounded-[2.5rem] overflow-hidden p-8 md:p-14 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                            {/* Glow effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 rounded-[3rem] blur-2xl opacity-30 pointer-events-none" />
                            
                            <div className="relative flex flex-col lg:flex-row gap-12 items-center z-10">
                                {/* Left: MVP Badge */}
                                <div className="shrink-0 relative">
                                    <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 p-1 shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                                        <div className="w-full h-full rounded-full bg-black flex flex-col items-center justify-center p-4">
                                            <Trophy className="w-14 h-14 md:w-24 md:h-24 text-amber-400 mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
                                            <span className="text-[10px] md:text-xs font-black text-amber-500 tracking-[0.4em] uppercase">TOURNAMENT</span>
                                            <span className="text-2xl md:text-4xl font-black text-white leading-none tracking-widest">MVP</span>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 w-14 h-14 md:w-20 md:h-20 rounded-full bg-amber-500 border-4 border-black flex items-center justify-center shadow-2xl">
                                        <Zap className="w-7 h-7 md:w-10 md:h-10 text-black fill-black" />
                                    </div>
                                </div>

                                {/* Right: Stats & Info */}
                                <div className="flex-1 text-center lg:text-left">
                                    <p className="text-amber-500 font-black tracking-[0.5em] text-[10px] md:text-xs uppercase mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">Player of the Season</p>
                                    <h2 className="text-6xl md:text-8xl text-white font-bold leading-none mb-6 drop-shadow-xl" style={{ fontFamily: "var(--font-display)" }}>
                                        {mvpPlayer.name}
                                    </h2>
                                    <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-10">
                                        <span className="px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs md:text-sm font-black text-zinc-300 tracking-[0.2em] uppercase shadow-lg">
                                            {mvpPlayer.team}
                                        </span>
                                        <span className="px-5 py-2 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-xs md:text-sm font-black text-amber-400 tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                            {(mvpPlayer as any).mvpPoints?.toFixed(1) || "0.0"} MVP POINTS
                                        </span>
                                    </div>

                                    {/* Achievements Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {mvpPlayer.achievements.slice(0, 4).map((ach, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col items-center lg:items-start hover:bg-white/[0.05] hover:border-amber-500/30 transition-all">
                                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mb-3 border border-amber-500/30">
                                                    <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fcd34d]" />
                                                </div>
                                                <p className="text-[10px] md:text-[11px] font-black text-white tracking-[0.1em] leading-tight uppercase text-center lg:text-left">{ach}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                        {/* Top 10 MVP Leaderboard */}
                        {mvpLeaderboard.length > 1 && (
                            <div className="relative mt-2 bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden p-6 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                                <h3 className="text-xl md:text-2xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-3">
                                    <BarChart3 className="w-6 h-6 text-amber-500" /> MVP Leaderboard Top 10
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {mvpLeaderboard.slice(0, 10).map((p, idx) => (
                                        <div key={p.name} className={`p-4 rounded-xl flex items-center justify-between border ${idx === 0 ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'} transition-all`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${idx === 0 ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' : idx === 1 ? 'bg-zinc-300 text-black' : idx === 2 ? 'bg-amber-800 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                                    #{idx + 1}
                                                </div>
                                                <div>
                                                    <p className={`font-bold uppercase tracking-tight ${idx === 0 ? 'text-amber-400' : 'text-white'}`}>{p.name}</p>
                                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{p.team}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xl font-black ${idx === 0 ? 'text-amber-500' : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-display)" }}>
                                                    {(p as any).mvpPoints?.toFixed(1) || "0.0"}
                                                </p>
                                                <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-0.5">PTS</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {categories.map((cat) => (
                        <motion.div 
                            key={cat.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col hover:border-amber-500/30 hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] transition-all duration-500 group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01] relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 group-hover:scale-110 transition-transform duration-500">
                                        <cat.icon className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-wide">{cat.title}</h3>
                                        {cat.sub && <p className="text-[9px] text-amber-500/80 uppercase font-bold tracking-[0.2em] mt-1">{cat.sub}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden p-2">
                                {cat.data.length === 0 ? (
                                    <div className="py-20 text-center text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-black">No eligible data yet</div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {/* U2 FIX: Default 5, expanded shows top 10 */}
                                        {cat.data.slice(0, expandedCategory === cat.id ? 10 : 5).map((player, idx) => (
                                            <div key={player.name} className={`p-4 flex items-center justify-between rounded-2xl hover:bg-white/5 transition-all ${idx === 0 ? 'bg-amber-500/15 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : idx < 3 ? 'bg-white/[0.03] border border-white/5' : 'border border-transparent'}`}>
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-black ${idx === 0 ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)]' : idx === 1 ? 'bg-zinc-300 text-black' : idx === 2 ? 'bg-amber-800 text-white' : 'bg-white/5 text-zinc-400 border border-white/10'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-bold text-white group-hover:text-amber-100 transition-colors tracking-tight uppercase">{player.name}</p>
                                                        <p className="text-[10px] text-zinc-400 font-bold tracking-[0.2em] uppercase mt-0.5">{player.team}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-2xl font-black tabular-nums leading-none ${idx === 0 ? 'text-amber-400' : 'text-white'}`} style={{ fontFamily: "var(--font-display)" }}>
                                                        {cat.id === "runs" || cat.id === "femaleRuns" ? player.runs : 
                                                         cat.id === "strikeRate" ? player.strikeRate.toFixed(1) :
                                                         cat.id === "wickets" || cat.id === "femaleWickets" ? player.wickets :
                                                         cat.id === "economy" ? player.economy.toFixed(2) :
                                                         cat.id === "sixes" ? player.sixes :
                                                         cat.id === "boundaries" ? ((player.fours || 0) + (player.sixes || 0)) :
                                                         cat.id === "fielding" ? player.totalDismissals :
                                                         0}
                                                    </p>
                                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">{cat.unit}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cat.data.length > 5 && (
                                <button
                                    onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                                    className="p-5 w-full bg-white/[0.01] hover:bg-amber-500 text-zinc-400 hover:text-black transition-all text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 border-t border-white/5 relative z-10"
                                >
                                    {expandedCategory === cat.id ? (
                                        <>SHOW LESS <ChevronUp className="w-4 h-4" /></>
                                    ) : (
                                        <>VIEW FULL STANDINGS <ChevronDown className="w-4 h-4" /></>
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
