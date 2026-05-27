"use client";

import { motion } from "framer-motion";
import {
    computePlayoffRankings,
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

function PlayoffRankingSection({ ranks, isGroupStageComplete }: { ranks: PlayoffRank[], isGroupStageComplete: boolean }) {
    if (ranks.filter(s => s.team).length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    Playoff Rankings
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            {/* Seed list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {ranks.map(s => (
                    <div key={s.rank} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span
                            className="text-2xl font-bold tabular-nums text-amber-500/40 leading-none"
                            style={{ fontFamily: "var(--font-mono)" }}
                        >
                            {s.rank}
                        </span>
                        <div>
                            <p className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                                {isGroupStageComplete ? s.team : "TBD"}
                            </p>
                            <p className="text-[10px] text-zinc-600 tracking-widest">
                                {isGroupStageComplete ? `GRP ${s.group} · NRR ${s.nrr > 0 ? "+" : ""}${s.nrr.toFixed(3)}` : "AWAITING CONFIRMATION"}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Eliminator matchups */}
            <div className="flex items-center gap-4 mb-4">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    Eliminators
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ELIMINATOR_MATCHUPS.map(({ label, ranks: [s1, s2] }) => {
                    const t1 = ranks.find(s => s.rank === s1);
                    const t2 = ranks.find(s => s.rank === s2);
                    return (
                        <div key={label} className="px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <p className="text-[9px] tracking-[0.35em] text-zinc-600 mb-3 uppercase">{label}</p>
                            <div className="space-y-2">
                                {[t1, t2].map((t, i) => t ? (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#EAB308" }} />
                                        <span className="text-sm text-white font-semibold">{isGroupStageComplete ? t.team : `Rank ${t.rank}`}</span>
                                        <span className="text-[10px] text-zinc-600 ml-auto">#{t.rank}</span>
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

function PlayoffBracketSection({ fixtures }: { fixtures: Fixture[] }) {
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
                    const isLive = !f.winner && f.team1 && f.team2 && !f.team1.includes("Seed") && !f.team1.includes("Winner") && !f.team1.includes("Loser");
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

    const ranks = hasGroupC
        ? computePlayoffRankings(fixtures, teams, liveStates)
        : [];

    const resolvedFixtures = hasGroupC
        ? resolveS2Playoffs(fixtures, teams, liveStates)
        : fixtures;
        
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
                            <PlayoffRankingSection ranks={ranks} isGroupStageComplete={isGroupStageComplete} />
                        )}

                        <PlayoffInfographic fixtures={resolvedFixtures} ranks={ranks} isGroupStageComplete={isGroupStageComplete} />

                        <PlayoffBracketSection fixtures={resolvedFixtures} />
                    </div>
                )}
            </div>
        </main>
    );
}
