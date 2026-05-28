"use client";

import { motion } from "framer-motion";
import {
    computePlayoffRankings,
    computeBaseSeeds,
    resolveS2Playoffs,
    type Fixture,
    type Team,
    type PlayoffRank,
} from "@/lib/tournament";
import PlayoffInfographic from "@/components/PlayoffInfographic";

const ELIMINATOR_MATCHUPS = [
    { label: "Eliminator 1", ranks: [1, 6] },
    { label: "Eliminator 2", ranks: [2, 5] },
    { label: "Eliminator 3", ranks: [3, 4] },
];

function PlayoffRankingSection({ ranks, baseSeeds, isGroupStageComplete }: { ranks: PlayoffRank[], baseSeeds: PlayoffRank[], isGroupStageComplete: boolean }) {
    if (ranks.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
        >
            <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
                    Live Playoff Rankings
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl mb-8">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="p-4 text-[10px] tracking-widest text-zinc-500 uppercase font-mono font-normal">Rank</th>
                                <th className="p-4 text-[10px] tracking-widest text-zinc-500 uppercase font-mono font-normal">Team</th>
                                <th className="p-4 text-[10px] tracking-widest text-zinc-500 uppercase font-mono font-normal text-center">Group</th>
                                <th className="p-4 text-[10px] tracking-widest text-amber-500 uppercase font-mono font-bold text-center">Pts</th>
                                <th className="p-4 text-[10px] tracking-widest text-zinc-500 uppercase font-mono font-normal text-right">NRR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranks.map((s, idx) => {
                                // Simple qualification logic: if they are rank 1 or 2, and group stage is complete, they are mathematically Q.
                                // If group stage is NOT complete, it's a live ranking.
                                const isQualified = isGroupStageComplete;
                                return (
                                    <tr key={s.rank} className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${idx < 6 ? 'bg-white/[0.01]' : 'opacity-50'}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-lg font-bold tabular-nums ${idx < 6 ? 'text-white' : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-mono)" }}>
                                                    {s.rank}
                                                </span>
                                                {s.isEliminated ? (
                                                    <span className="px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-500 text-[8px] font-bold tracking-widest border border-red-500/20">ELIMINATED</span>
                                                ) : isQualified && idx < 6 && (
                                                    <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 text-[8px] font-bold tracking-widest border border-emerald-500/20">Q</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-bold tracking-wide ${s.isEliminated ? 'text-zinc-600 line-through' : idx < 6 ? 'text-zinc-200' : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-heading)" }}>
                                                {s.team || "TBD"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-xs font-mono text-zinc-500">{s.group}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-sm font-bold text-amber-500 tabular-nums">{s.points}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`text-xs font-mono tabular-nums ${s.nrr > 0 ? 'text-emerald-400' : s.nrr < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                                {s.nrr > 0 ? "+" : ""}{s.nrr.toFixed(3)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {!isGroupStageComplete && (
                    <div className="p-3 bg-amber-500/5 border-t border-amber-500/10 text-center">
                        <span className="text-[10px] text-amber-500/80 uppercase tracking-widest animate-pulse">● LIVE PROJECTIONS - GROUP STAGE IN PROGRESS</span>
                    </div>
                )}
            </div>

            {/* Eliminator matchups */}
            <div className="flex items-center gap-4 mb-4">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    Eliminators Setup
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ELIMINATOR_MATCHUPS.map(({ label, ranks: [s1, s2] }) => {
                    const t1 = baseSeeds.find(s => s.rank === s1);
                    const t2 = baseSeeds.find(s => s.rank === s2);
                    return (
                        <div key={label} className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 hover:border-amber-500/30 transition-colors shadow-lg">
                            <p className="text-[9px] tracking-[0.35em] text-amber-500/70 mb-4 uppercase font-bold">{label}</p>
                            <div className="space-y-3">
                                {[t1, t2].map((t, i) => t ? (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0">
                                            <span className="text-[10px] text-zinc-400 font-mono font-bold">{t.rank}</span>
                                        </div>
                                        <span className={`text-sm font-semibold truncate ${isGroupStageComplete ? 'text-white' : 'text-zinc-400'}`}>
                                            {isGroupStageComplete ? t.team : `Rank ${t.rank} Projection`}
                                        </span>
                                    </div>
                                ) : (
                                    <div key={i} className="text-xs text-zinc-700">TBD</div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

const BRACKET_STAGES = [
    { stage: "Eliminator 1" as const, short: "E1" },
    { stage: "Eliminator 2" as const, short: "E2" },
    { stage: "Eliminator 3" as const, short: "E3" },
    { stage: "Qualifier 1" as const, short: "Q1" },
    { stage: "Qualifier 2" as const, short: "Q2" },
    { stage: "Final" as const, short: "FINAL" },
];

function PlayoffBracketSection({ fixtures, liveStates }: { fixtures: Fixture[], liveStates: Record<string, any> }) {
    const knockoutFixtures = fixtures.filter(f =>
        ["Eliminator 1", "Eliminator 2", "Eliminator 3", "Qualifier 1", "Qualifier 2", "Final"].includes(f.stage)
    );

    if (knockoutFixtures.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
        >
            <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    Playoff Matches
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            <div className="space-y-2">
                {BRACKET_STAGES.map(({ stage, short }) => {
                    const f = knockoutFixtures.find(x => x.stage === stage);
                    if (!f) return null;
                    const cleanId = (id: string) => String(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
                    const isLive = liveStates[cleanId(f.matchNo)]?.status === "LIVE";
                    const isCompleted = !!f.winner;

                    return (
                        <div
                            key={stage}
                            className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-colors ${isCompleted
                                ? "bg-white/[0.02] border-white/[0.05]"
                                : isLive
                                    ? "bg-red-900/10 border-red-500/20"
                                    : "bg-white/[0.01] border-white/[0.03]"
                                }`}
                        >
                            <span
                                className="text-[10px] text-zinc-600 tracking-widest w-16 shrink-0 uppercase"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                {short}
                            </span>
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                <span className={`text-sm font-semibold truncate ${f.winner === f.team1 ? "text-white" : "text-zinc-500"}`}>
                                    {f.team1 || "TBD"}
                                </span>
                                <span className="text-zinc-700 text-xs shrink-0">vs</span>
                                <span className={`text-sm font-semibold truncate ${f.winner === f.team2 ? "text-white" : "text-zinc-500"}`}>
                                    {f.team2 || "TBD"}
                                </span>
                            </div>
                            <div className="shrink-0">
                                {isCompleted ? (
                                    <span className="text-[10px] text-amber-400 font-bold tracking-widest">
                                        {f.winner} wins
                                    </span>
                                ) : isLive ? (
                                    <span className="text-[10px] text-red-400 font-bold tracking-widest animate-pulse">● LIVE</span>
                                ) : (
                                    <span className="text-[10px] text-zinc-700 tracking-widest">SCHEDULED</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

export default function PlayoffsClient({
    fixtures,
    teams,
    liveStates = {},
}: {
    fixtures: Fixture[];
    teams: Team[];
    liveStates?: Record<string, any>;
}) {
    const groupMatches = fixtures.filter(f => ["A", "B", "C"].includes(f.group) && !f.isFunMatch);
    
    // Group C existing means Season 2 playoffs structure
    const hasGroupC = groupMatches.some(f => f.group === "C");
    
    const isGroupStageComplete = groupMatches.length > 0 && groupMatches.every(f => {
        const cleanId = String(f.matchNo).trim().replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        const liveMatch = liveStates?.[cleanId] || liveStates?.[String(f.matchNo).trim()] || liveStates?.[f.matchNo];
        const status = liveMatch?.status || (f.winner ? "COMPLETED" : "SCHEDULED");
        return status === "COMPLETED" || status === "ABANDONED" || f.winner;
    });

    const resolvedFixtures = hasGroupC
        ? resolveS2Playoffs(fixtures, teams, liveStates)
        : fixtures;

    const baseSeeds = hasGroupC
        ? computeBaseSeeds(fixtures, teams, liveStates)
        : [];

    const ranks = hasGroupC
        ? computePlayoffRankings(resolvedFixtures, teams, liveStates)
        : [];
        
    const noPlayoffs = !hasGroupC;

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28 bg-black">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12 md:mb-16"
                >
                    <p className="text-[11px] tracking-[0.5em] text-zinc-600 mb-3" style={{ fontFamily: "var(--font-body)" }}>
                        VARCHASVA PREMIER LEAGUE · SEASON 2
                    </p>
                    <h1 className="text-6xl md:text-8xl text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>
                        PLAYOFFS
                    </h1>
                    <div className="mt-5 flex items-center gap-4">
                        <div className="h-px w-8 bg-amber-500" />
                        <span className="text-xs text-zinc-700 tracking-widest">ROAD TO THE CHAMPIONSHIP</span>
                    </div>
                </motion.div>

                {noPlayoffs ? (
                    <div className="py-24 text-center">
                        <p className="text-zinc-700 text-sm tracking-widest">PLAYOFFS DATA NOT YET AVAILABLE</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {ranks.length > 0 && (
                            <PlayoffRankingSection ranks={ranks} baseSeeds={baseSeeds} isGroupStageComplete={isGroupStageComplete} />
                        )}

                        <PlayoffInfographic fixtures={resolvedFixtures} ranks={ranks} isGroupStageComplete={isGroupStageComplete} liveStates={liveStates} />

                        <PlayoffBracketSection fixtures={resolvedFixtures} liveStates={liveStates} />
                    </div>
                )}
            </div>
        </main>
    );
}
