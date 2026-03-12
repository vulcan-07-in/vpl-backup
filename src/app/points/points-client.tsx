"use client";

import { Trophy } from "lucide-react";
import { calculateStandings, type Fixture, type Team, type Standing } from "@/lib/tournament";
import { motion } from "framer-motion";

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-amber-400 font-bold">01</span>;
    if (rank === 2) return <span className="text-zinc-400 font-bold">02</span>;
    return <span className="text-zinc-700">{String(rank).padStart(2, "0")}</span>;
}

function qualifiedTeams(standings: Standing[], poolFixtures: Fixture[]): Set<string> {
    const third = standings[2];
    if (!third) return new Set();

    const thirdGamesLeft = 3 - third.played;
    const thirdMaxPoints = third.points + thirdGamesLeft * 2;

    const qualified = new Set<string>();
    standings.forEach((s, idx) => {
        if (idx < 2 && s.points > thirdMaxPoints) {
            qualified.add(s.team);
        }
    });
    return qualified;
}

const tableRowVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

function PoolTable({ standings, label, qualifiedSet, tiedForSecond }: { pool: "A" | "B"; standings: Standing[]; label: string; qualifiedSet: Set<string>; tiedForSecond: boolean }) {
    return (
        <div>
            <div className="flex items-center gap-4 mb-4">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    {label}
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            {/* Column headers with mobile fade hint */}
            <div className="relative overflow-hidden">
                <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                    <div className="min-w-[480px]">
                        <div className="grid grid-cols-[2rem_1fr_repeat(5,3rem)] gap-2 px-5 pb-2 text-[10px] tracking-widest text-zinc-700 uppercase"
                            style={{ fontFamily: "var(--font-body)" }}>
                            <span>#</span>
                            <span>Team</span>
                            <span className="text-center">P</span>
                            <span className="text-center">W</span>
                            <span className="text-center">L</span>
                            <span className="text-center">NRR</span>
                            <span className="text-center">Pts</span>
                        </div>

                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={{
                                hidden: { opacity: 0 },
                                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                            }}
                            className="space-y-px"
                        >
                            {standings.map((s, idx) => (
                                <motion.div
                                    variants={tableRowVariants}
                                    key={s.team}
                                    className={`grid grid-cols-[2rem_1fr_repeat(5,3rem)] gap-2 items-center px-5 py-4 border-b border-white/[0.04] transition-colors ${idx < 2
                                        ? "bg-amber-900/10 hover:bg-amber-900/20 shadow-[inset_0_0_15px_rgba(234,179,8,0.05)] border-t border-t-amber-500/10 border-b-amber-500/10"
                                        : "hover:bg-white/[0.02]"
                                        }`}
                                >
                                    {/* Rank */}
                                    <span className="text-xs tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                                        <RankBadge rank={idx + 1} />
                                    </span>

                                    {/* Team name + color dot */}
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                        <span className="text-sm md:text-base font-semibold text-white truncate"
                                            style={{ fontFamily: "var(--font-heading)" }}>
                                            {s.team}
                                        </span>
                                        {qualifiedSet.has(s.team) && (
                                            <span className="text-[10px] flex items-center justify-center w-4 h-4 text-amber-950 font-bold ml-1 rounded bg-amber-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                                                Q
                                            </span>
                                        )}
                                        {tiedForSecond && (idx === 1 || idx === 2) && (
                                            <span className="text-[9px] tracking-widest text-orange-400 font-bold ml-1 px-1.5 py-0.5 rounded border border-orange-500/30 bg-orange-500/10">
                                                TIED
                                            </span>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <span className="text-center text-sm text-zinc-500 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{s.played}</span>
                                    <span className="text-center text-sm text-zinc-400 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{s.won}</span>
                                    <span className="text-center text-sm text-zinc-700 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{s.lost}</span>
                                    <span className="text-center text-sm text-zinc-300 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{s.nrr > 0 ? "+" : ""}{s.nrr.toFixed(3)}</span>
                                    <span className="text-center text-sm font-bold text-amber-400 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{s.points}</span>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
                {/* Visual fade for mobile horizontal scrolling indication */}
                <div className="md:hidden absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-black pointer-events-none" />
            </div>
        </div>
    );
}

export default function PointsClient({ fixtures, teams }: { fixtures: Fixture[], teams: Team[] }) {
    const { poolA, poolB } = calculateStandings(fixtures, teams);

    const poolAFixtures = fixtures.filter(f => f.pool === "A");
    const poolBFixtures = fixtures.filter(f => f.pool === "B");
    const qualifiedA = qualifiedTeams(poolA, poolAFixtures);
    const qualifiedB = qualifiedTeams(poolB, poolBFixtures);

    const sfTeams = new Set(
        fixtures.filter(f => f.stage.startsWith("Semi-Final")).flatMap(f => [f.team1, f.team2])
    );
    sfTeams.forEach(t => {
        if (t && !t.includes("Pool") && t !== "TBD") {
            qualifiedA.add(t);
            qualifiedB.add(t);
        }
    });

    const isTiedA = poolA.length >= 3 && poolA[1].points === poolA[2].points;
    const isTiedB = poolB.length >= 3 && poolB[1].points === poolB[2].points;

    if (isTiedA && sfTeams.has(poolA[2].team)) {
        [poolA[1], poolA[2]] = [poolA[2], poolA[1]];
    }
    if (isTiedB && sfTeams.has(poolB[2].team)) {
        [poolB[1], poolB[2]] = [poolB[2], poolB[1]];
    }

    const tiedAResolved = isTiedA && (sfTeams.has(poolA[1].team) || sfTeams.has(poolA[2].team));
    const tiedBResolved = isTiedB && (sfTeams.has(poolB[1].team) || sfTeams.has(poolB[2].team));

    const tiedA = isTiedA && !tiedAResolved;
    const tiedB = isTiedB && !tiedBResolved;

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12 md:mb-16"
                >
                    <p className="text-[11px] tracking-[0.5em] text-zinc-600 mb-3" style={{ fontFamily: "var(--font-body)" }}>
                        VARCHASVA PREMIER LEAGUE
                    </p>
                    <h1 className="text-6xl md:text-8xl text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>
                        STANDINGS
                    </h1>
                    <div className="mt-5 flex items-center gap-4">
                        <div className="h-px w-8 bg-amber-500" />
                        <span className="text-xs text-zinc-700 tracking-widest">POINTS TABLE</span>
                    </div>
                </motion.div>

                {poolA.length === 0 && poolB.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-zinc-700 text-sm tracking-widest">STANDINGS NOT YET AVAILABLE</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        <PoolTable pool="A" standings={poolA} label="Pool A" qualifiedSet={qualifiedA} tiedForSecond={tiedA} />
                        <PoolTable pool="B" standings={poolB} label="Pool B" qualifiedSet={qualifiedB} tiedForSecond={tiedB} />
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-[10px] text-zinc-800 tracking-widest text-center"
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            TOP 2 FROM EACH POOL ADVANCE TO SEMI-FINALS · NRR USED AS TIEBREAKER
                        </motion.p>
                    </div>
                )}
            </div>
        </main>
    );
}
