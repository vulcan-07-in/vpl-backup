"use client";

import { Trophy } from "lucide-react";
import { type Fixture, type Team } from "@/lib/tournament";
import { motion } from "framer-motion";

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function FixturesClient({ fixtures, teams }: { fixtures: Fixture[], teams: Team[] }) {
    const colorOf = (name: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";

    // Derive pool team lists from fixtures
    const poolTeams: Record<"A" | "B", string[]> = { A: [], B: [] };
    fixtures.forEach(f => {
        if (f.pool === "A" || f.pool === "B") {
            if (!poolTeams[f.pool].includes(f.team1)) poolTeams[f.pool].push(f.team1);
            if (!poolTeams[f.pool].includes(f.team2)) poolTeams[f.pool].push(f.team2);
        }
    });

    const hasPoolData = poolTeams.A.length > 0 || poolTeams.B.length > 0;

    function renderFixture(fixture: Fixture, isFeaturedKnockout: boolean) {
        const played = !!fixture.winner;
        const c1 = colorOf(fixture.team1);
        const c2 = colorOf(fixture.team2);
        const win1 = played && fixture.winner === fixture.team1;
        const win2 = played && fixture.winner === fixture.team2;
        const isKnockout = fixture.pool === "-";

        let containerClasses = "relative overflow-hidden rounded-2xl border bg-black/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] hover:bg-black/60 group";

        if (isFeaturedKnockout) {
            containerClasses = "relative overflow-hidden rounded-2xl border border-amber-500/40 bg-black/60 backdrop-blur-3xl shadow-[0_0_40px_rgba(245,158,11,0.15)] transition-transform hover:scale-[1.02] hover:bg-black/80 hover:shadow-[0_0_60px_rgba(245,158,11,0.25)] group";
        } else {
            containerClasses = "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] hover:bg-black/60 group";
        }

        return (
            <motion.div
                variants={itemVariants}
                key={fixture.matchNo}
                className={containerClasses}
            >
                {/* Background gradient slash */}
                <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none ${isFeaturedKnockout ? 'opacity-20 blend-overlay' : ''}`} style={{ background: `linear-gradient(110deg, ${c1} 0%, transparent 40%, transparent 60%, ${c2} 100%)` }} />

                {/* Mobile layout (< md) */}
                <div className="md:hidden flex flex-col relative z-10 p-4 gap-3">
                    <div className="flex justify-between items-center w-full">
                        <span className={`text-[10px] ${isFeaturedKnockout ? 'text-amber-500 font-bold' : 'text-zinc-500'} tabular-nums uppercase`} style={{ fontFamily: "var(--font-mono)" }}>
                            MATCH {fixture.matchNo}
                        </span>
                        <span className={`text-[9px] tracking-widest ${isFeaturedKnockout ? 'text-amber-400 font-bold text-[11px]' : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-body)" }}>
                            {isKnockout ? fixture.stage.toUpperCase() : ""}
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className={`flex flex-col items-center gap-1.5 min-w-0 transition-opacity ${played && !win1 ? "opacity-40" : ""}`}>
                            <div className="w-5 h-5 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: c1, boxShadow: `0 0 ${isFeaturedKnockout ? '20' : '10'}px ${c1}80` }} />
                            <span className={`${isFeaturedKnockout ? 'text-3xl tracking-wider text-amber-50' : 'text-2xl'} font-bold truncate text-center w-full mt-1`}
                                style={{ fontFamily: "var(--font-display)", color: win1 ? c1 : "white", textShadow: win1 || isFeaturedKnockout ? `0 0 16px ${c1}80` : "none" }}>
                                {fixture.team1}
                            </span>
                            {win1 && <Trophy className={`w-4 h-4 shrink-0 text-amber-400 drop-shadow-md ${isFeaturedKnockout ? 'mt-1 w-6 h-6' : ''}`} strokeWidth={2.5} />}
                        </div>
                        <div className="text-center flex flex-col items-center justify-center pt-1">
                            <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${played ? "text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "text-zinc-500 border-white/10 bg-white/5"}`} style={{ fontFamily: "var(--font-body)" }}>
                                {played ? "FT" : "VS"}
                            </span>
                        </div>
                        <div className={`flex flex-col items-center gap-1.5 min-w-0 transition-opacity ${played && !win2 ? "opacity-40" : ""}`}>
                            <div className="w-5 h-5 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: c2, boxShadow: `0 0 ${isFeaturedKnockout ? '20' : '10'}px ${c2}80` }} />
                            <span className={`${isFeaturedKnockout ? 'text-3xl tracking-wider text-amber-50' : 'text-2xl'} font-bold truncate text-center w-full mt-1`}
                                style={{ fontFamily: "var(--font-display)", color: win2 ? c2 : "white", textShadow: win2 || isFeaturedKnockout ? `0 0 16px ${c2}80` : "none" }}>
                                {fixture.team2}
                            </span>
                            {win2 && <Trophy className={`w-4 h-4 shrink-0 text-amber-400 drop-shadow-md ${isFeaturedKnockout ? 'mt-1 w-6 h-6' : ''}`} strokeWidth={2.5} />}
                        </div>
                    </div>
                </div>

                {/* Desktop layout (md+) */}
                <div className={`hidden md:grid items-center px-6 relative z-10 ${isFeaturedKnockout ? 'py-8' : 'py-5'}`} style={{ gridTemplateColumns: "4rem 6rem 1fr 5rem 1fr" }}>
                    <span className={`text-sm tabular-nums font-medium ${isFeaturedKnockout ? 'text-amber-500 font-bold' : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-mono)" }}>
                        {fixture.matchNo}
                    </span>
                    <span className={`text-[10px] tracking-widest pr-2 ${isFeaturedKnockout ? 'text-amber-400 font-bold text-xs' : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-body)" }}>
                        {isKnockout ? fixture.stage.toUpperCase() : "POOL " + fixture.pool}
                    </span>
                    <div className={`flex items-center gap-4 justify-end min-w-0 transition-opacity ${played && !win1 ? "opacity-40" : ""}`}>
                        {win1 && <Trophy className={`w-6 h-6 shrink-0 text-amber-400 drop-shadow-md ${isFeaturedKnockout ? 'w-8 h-8' : ''}`} strokeWidth={2.5} />}
                        <span className={`${isFeaturedKnockout ? 'text-5xl tracking-widest text-amber-50' : 'text-4xl tracking-wide'} font-bold truncate text-right transition-colors`}
                            style={{ fontFamily: "var(--font-display)", color: win1 ? c1 : "white", textShadow: win1 || isFeaturedKnockout ? `0 0 20px ${c1}80` : "none", paddingTop: "0.2rem" }}>
                            {fixture.team1}
                        </span>
                        <div className={`rounded-full shrink-0 shadow-lg ${isFeaturedKnockout ? 'w-6 h-6' : 'w-4 h-4'}`} style={{ backgroundColor: c1, boxShadow: `0 0 12px ${c1}80` }} />
                    </div>
                    <div className="text-center flex justify-center">
                        <span className={`text-[10px] sm:text-xs font-bold tracking-widest px-3 py-1 rounded border ${played ? "text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "text-zinc-500 border-white/10 bg-white/5"} ${isFeaturedKnockout && !played ? '!text-amber-300 !border-amber-500/50 !bg-amber-900/10' : ''}`} style={{ fontFamily: "var(--font-body)" }}>
                            {played ? "FT" : "VS"}
                        </span>
                    </div>
                    <div className={`flex items-center gap-4 min-w-0 transition-opacity ${played && !win2 ? "opacity-40" : ""}`}>
                        <div className={`rounded-full shrink-0 shadow-lg ${isFeaturedKnockout ? 'w-6 h-6' : 'w-4 h-4'}`} style={{ backgroundColor: c2, boxShadow: `0 0 12px ${c2}80` }} />
                        <span className={`${isFeaturedKnockout ? 'text-5xl tracking-widest text-amber-50' : 'text-4xl tracking-wide'} font-bold truncate transition-colors`}
                            style={{ fontFamily: "var(--font-display)", color: win2 ? c2 : "white", textShadow: win2 || isFeaturedKnockout ? `0 0 20px ${c2}80` : "none", paddingTop: "0.2rem" }}>
                            {fixture.team2}
                        </span>
                        {win2 && <Trophy className={`w-6 h-6 shrink-0 text-amber-400 drop-shadow-md ${isFeaturedKnockout ? 'w-8 h-8' : ''}`} strokeWidth={2.5} />}
                    </div>
                </div>
            </motion.div>
        );
    }

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
                        FIXTURES
                    </h1>
                    <div className="mt-5 flex items-center gap-4">
                        <div className="h-px w-8 bg-amber-500" />
                        <span className="text-xs text-zinc-700 tracking-widest">
                            {fixtures.length} MATCHES
                        </span>
                    </div>
                </motion.div>

                {fixtures.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-zinc-700 text-sm tracking-widest">FIXTURES NOT YET PUBLISHED</p>
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-12"
                    >
                        {/* Pool summary cards */}
                        {hasPoolData && (
                            <div className="grid grid-cols-2 gap-4">
                                {(["A", "B"] as const).map(pool => (
                                    <motion.div variants={itemVariants} key={pool} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                                        <p className="text-[10px] tracking-[0.4em] text-zinc-600 mb-3" style={{ fontFamily: "var(--font-body)" }}>
                                            POOL {pool}
                                        </p>
                                        <div className="space-y-2">
                                            {poolTeams[pool].map(team => (
                                                <div key={team} className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(team) }} />
                                                    <span className="text-sm text-white font-medium truncate" style={{ fontFamily: "var(--font-heading)" }}>
                                                        {team}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-12">
                            {/* Knockout Stage - Only show if semi-finals are decided (teams don't contain "Pool") */}
                            {fixtures.filter(f => f.pool === "-" && !f.team1.includes("Pool") && !f.team2.includes("Pool") && !f.team1.includes("Winner") && !f.team2.includes("Winner")).length > 0 && (
                                <div>
                                    <motion.div variants={itemVariants} className="flex items-center gap-4 mb-4">
                                        <span className="text-[12px] tracking-[0.4em] text-amber-500 font-bold uppercase" style={{ fontFamily: "var(--font-body)" }}>
                                            KNOCKOUT STAGE
                                        </span>
                                        <div className="flex-1 h-px bg-amber-500/20" />
                                    </motion.div>
                                    <div className="space-y-6">
                                        {fixtures
                                            .filter(f => f.pool === "-" && !f.team1.includes("Pool") && !f.team2.includes("Pool") && !f.team1.includes("Winner") && !f.team2.includes("Winner"))
                                            .sort((a, b) => b.matchNo.localeCompare(a.matchNo)) // Final first, then SFs
                                            .map(fixture => renderFixture(fixture, true))}
                                    </div>
                                </div>
                            )}

                            {/* Pool Matches Schedule */}
                            <div>
                                <motion.div variants={itemVariants} className="flex items-center gap-4 mb-4">
                                    <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-body)" }}>
                                        POOL SCHEDULE
                                    </span>
                                    <div className="flex-1 h-px bg-white/[0.05]" />
                                </motion.div>

                                <div className="space-y-4">
                                    {fixtures
                                        .filter(f => f.pool !== "-" || f.team1.includes("Pool") || f.team2.includes("Pool") || f.team1.includes("Winner") || f.team2.includes("Winner"))
                                        .map(fixture => renderFixture(fixture, false))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </main>
    );
}
