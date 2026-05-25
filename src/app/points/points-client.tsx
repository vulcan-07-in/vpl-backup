"use client";

import {
    calculateStandings,
    computePlayoffRankings,
    resolveS2Playoffs,
    type Fixture,
    type Team,
    type Standing,
    type PlayoffRank,
} from "@/lib/tournament";
import { motion } from "framer-motion";
import PlayoffInfographic from "@/components/PlayoffInfographic";

// ── Qualification logic ─────────────────────────────────────────────────────

function qualifiedTeams(groupLetter: "A" | "B" | "C", groupTeams: Standing[], fixtures: Fixture[], liveStates: Record<string, any>): Set<string> {
    const qualified = new Set<string>();
    if (groupTeams.length === 0) return qualified;

    // Filter fixtures for this group
    const groupFixtures = fixtures.filter(f => f.group === groupLetter && !f.isFunMatch);
    if (groupFixtures.length === 0) return qualified;

    const cleanId = (id: string) => String(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();

    // Parse status and winner for all fixtures in this group
    const parsedFixtures = groupFixtures.map(f => {
        const normNo = cleanId(f.matchNo);
        const lm = liveStates[normNo] || liveStates[String(f.matchNo).trim()] || liveStates[f.matchNo];
        const status = lm?.status || (f.winner ? "COMPLETED" : "SCHEDULED");
        const winner = f.winner || lm?.winner;
        return {
            team1: f.team1,
            team2: f.team2,
            winner,
            status,
        };
    });

    const completed = parsedFixtures.filter(f => f.winner || f.status === "COMPLETED" || f.status === "ABANDONED");
    const remaining = parsedFixtures.filter(f => !f.winner && f.status !== "COMPLETED" && f.status !== "ABANDONED");

    // If no matches have been played at all, no one is qualified
    if (completed.length === 0) {
        return qualified;
    }

    const teamNames = groupTeams.map(t => t.team);

    // Helper to calculate simulated points for a given set of outcomes
    const outcomes: Array<Record<string, number>> = [];

    const simulate = (index: number, currentPoints: Record<string, number>) => {
        if (index === remaining.length) {
            outcomes.push({ ...currentPoints });
            return;
        }

        const match = remaining[index];
        
        // Scenario 1: Team 1 wins
        const pts1 = { ...currentPoints };
        pts1[match.team1] = (pts1[match.team1] || 0) + 2;
        pts1[match.team2] = (pts1[match.team2] || 0) + 0;
        simulate(index + 1, pts1);

        // Scenario 2: Team 2 wins
        const pts2 = { ...currentPoints };
        pts2[match.team1] = (pts2[match.team1] || 0) + 0;
        pts2[match.team2] = (pts2[match.team2] || 0) + 2;
        simulate(index + 1, pts2);
    };

    // Calculate base points from completed matches
    const basePoints: Record<string, number> = {};
    teamNames.forEach(name => { basePoints[name] = 0; });

    completed.forEach(f => {
        if (f.winner === f.team1) {
            basePoints[f.team1] = (basePoints[f.team1] || 0) + 2;
        } else if (f.winner === f.team2) {
            basePoints[f.team2] = (basePoints[f.team2] || 0) + 2;
        } else if (f.winner === "TIE" || f.winner === "ABANDONED" || f.status === "ABANDONED") {
            basePoints[f.team1] = (basePoints[f.team1] || 0) + 1;
            basePoints[f.team2] = (basePoints[f.team2] || 0) + 1;
        }
    });

    // Start simulation
    simulate(0, basePoints);

    // For each team, check if they are in the top 2 in ALL simulated outcomes
    teamNames.forEach(team => {
        let qualifiedInAll = true;

        for (const outcome of outcomes) {
            // Sort teams based on points in this outcome
            const sorted = [...teamNames].sort((a, b) => {
                const ptsA = outcome[a] || 0;
                const ptsB = outcome[b] || 0;
                if (ptsA !== ptsB) return ptsB - ptsA; // Higher points first
                
                // Tiebreaker: current NRR
                const nrrA = groupTeams.find(t => t.team === a)?.nrr || 0;
                const nrrB = groupTeams.find(t => t.team === b)?.nrr || 0;
                return nrrB - nrrA;
            });

            // Is the team in the top 2?
            const rank = sorted.indexOf(team);
            if (rank > 1) {
                qualifiedInAll = false;
                break;
            }
        }

        if (qualifiedInAll) {
            qualified.add(team);
        }
    });

    return qualified;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-amber-400 font-bold">01</span>;
    if (rank === 2) return <span className="text-zinc-400 font-bold">02</span>;
    return <span className="text-zinc-700">{String(rank).padStart(2, "0")}</span>;
}

const tableRowVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

function GroupTable({
    standings,
    label,
    qualifiedSet,
}: {
    standings: Standing[];
    label: string;
    qualifiedSet: Set<string>;
}) {
    return (
        <div>
            <div className="flex items-center gap-4 mb-4">
                <span
                    className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase"
                    style={{ fontFamily: "var(--font-body)" }}
                >
                    {label}
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            <div className="relative overflow-hidden">
                <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                    <div className="min-w-[480px]">
                        <div
                            className="grid grid-cols-[2rem_1fr_repeat(5,3rem)] gap-2 px-5 pb-2 text-[10px] tracking-widest text-zinc-700 uppercase"
                            style={{ fontFamily: "var(--font-body)" }}
                        >
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
                                        <span
                                            className="text-sm md:text-base font-semibold text-white truncate"
                                            style={{ fontFamily: "var(--font-heading)" }}
                                        >
                                            {s.team}
                                        </span>
                                        {qualifiedSet.has(s.team) && (
                                            <span className="text-[10px] flex items-center justify-center w-4 h-4 text-amber-950 font-bold ml-1 rounded bg-amber-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                                                Q
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
                <div className="md:hidden absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-black pointer-events-none" />
            </div>
        </div>
    );
}

// ── Playoff Seedings Card ────────────────────────────────────────────────────

const ELIMINATOR_MATCHUPS = [
    { label: "Eliminator 1", ranks: [1, 6] },
    { label: "Eliminator 2", ranks: [2, 5] },
    { label: "Eliminator 3", ranks: [3, 4] },
];

function PlayoffRankingSection({ ranks }: { ranks: PlayoffRank[] }) {
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {ranks.map(s => (
                    <div key={s.rank} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span
                            className="text-2xl font-bold tabular-nums text-amber-500/40 leading-none"
                            style={{ fontFamily: "var(--font-mono)" }}
                        >
                            {s.rank}
                        </span>
                        <div>
                            <p className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>{s.team}</p>
                            <p className="text-[10px] text-zinc-600 tracking-widest">
                                GRP {s.group} · NRR {s.nrr > 0 ? "+" : ""}{s.nrr.toFixed(3)}
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
                                        <span className="text-sm text-white font-semibold">{t.team}</span>
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

// ── Playoff Bracket ─────────────────────────────────────────────────────────

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
                    Playoff Bracket
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

// ── Main Component ──────────────────────────────────────────────────────────

export default function PointsClient({
    fixtures,
    teams,
    liveStates = {},
}: {
    fixtures: Fixture[];
    teams: Team[];
    liveStates?: Record<string, any>;
}) {
    const { groupA, groupB, groupC } = calculateStandings(fixtures, teams, liveStates);

    const qualifiedA = qualifiedTeams("A", groupA, fixtures, liveStates);
    const qualifiedB = qualifiedTeams("B", groupB, fixtures, liveStates);
    const qualifiedC = qualifiedTeams("C", groupC, fixtures, liveStates);

    const hasGroupC = groupC.length > 0;

    // Compute playoff ranks (only if group stage has data)
    const ranks = hasGroupC
        ? computePlayoffRankings(fixtures, teams, liveStates)
        : [];

    // Resolve S2 bracket labels
    const resolvedFixtures = hasGroupC
        ? resolveS2Playoffs(fixtures, teams, liveStates)
        : fixtures;

    const noData = groupA.length === 0 && groupB.length === 0 && groupC.length === 0;

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28">
            <div className={`${hasGroupC ? "max-w-7xl" : "max-w-3xl"} mx-auto`}>
                {/* Header */}
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
                        STANDINGS
                    </h1>
                    <div className="mt-5 flex items-center gap-4">
                        <div className="h-px w-8 bg-amber-500" />
                        <span className="text-xs text-zinc-700 tracking-widest">POINTS TABLE</span>
                    </div>
                </motion.div>

                {noData ? (
                    <div className="py-24 text-center">
                        <p className="text-zinc-700 text-sm tracking-widest">STANDINGS NOT YET AVAILABLE</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Group Tables */}
                        <div className={`grid gap-8 ${hasGroupC ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"}`}>
                            {groupA.length > 0 && (
                                <GroupTable standings={groupA} label="Group A" qualifiedSet={qualifiedA} />
                            )}
                            {groupB.length > 0 && (
                                <GroupTable standings={groupB} label="Group B" qualifiedSet={qualifiedB} />
                            )}
                            {hasGroupC && (
                                <GroupTable standings={groupC} label="Group C" qualifiedSet={qualifiedC} />
                            )}
                        </div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-[10px] text-zinc-800 tracking-widest text-center"
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            {hasGroupC
                                ? "TOP 2 FROM EACH GROUP ADVANCE TO PLAYOFFS · NRR USED AS TIEBREAKER"
                                : "TOP 2 FROM EACH GROUP ADVANCE TO SEMI-FINALS · NRR USED AS TIEBREAKER"}
                        </motion.p>

                        {/* Playoff Seedings Section (S2 only) */}
                        {hasGroupC && ranks.length > 0 && (
                            <PlayoffRankingSection ranks={ranks} />
                        )}

                        {hasGroupC && (
                            <PlayoffInfographic />
                        )}

                        {/* Playoff Bracket */}
                        <PlayoffBracketSection fixtures={resolvedFixtures} />
                    </div>
                )}
            </div>
        </main>
    );
}
