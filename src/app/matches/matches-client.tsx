"use client";

import { useState, useEffect } from "react";
import { Trophy, Clock } from "lucide-react";
import { type Fixture, type Team, type LiveMatchState } from "@/lib/tournament";
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

export default function MatchesClient({ fixtures, teams }: { fixtures: Fixture[], teams: Team[] }) {
    const colorOf = (name: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";

    const [liveMatches, setLiveMatches] = useState<Record<string, LiveMatchState>>({});

    // Fetch live status for unplayed matches
    useEffect(() => {
        const fetchLiveStatus = async () => {
            const unplayedIds = fixtures.filter(f => !f.winner).map(f => f.matchNo);

            // We fetch the status for the next 3 upcoming matches to avoid spamming the DB
            const matchesToCheck = unplayedIds.slice(0, 3);

            const liveData: Record<string, LiveMatchState> = {};
            for (const id of matchesToCheck) {
                try {
                    const res = await fetch(`/api/live-score?matchId=${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        liveData[id] = data;
                    }
                } catch (e) {
                    // ignore
                }
            }
            setLiveMatches(liveData);
        };
        fetchLiveStatus();

        // Refresh every 3 seconds for better live experience
        const interval = setInterval(fetchLiveStatus, 3000);
        return () => clearInterval(interval);
    }, [fixtures]);

    // Derive group team lists from fixtures
    const groupTeams: Record<"A" | "B", string[]> = { A: [], B: [] };
    fixtures.forEach(f => {
        if (f.group === "A" || f.group === "B") {
            if (!groupTeams[f.group].includes(f.team1)) groupTeams[f.group].push(f.team1);
            if (!groupTeams[f.group].includes(f.team2)) groupTeams[f.group].push(f.team2);
        }
    });

    const hasGroupData = groupTeams.A.length > 0 || groupTeams.B.length > 0;

    function renderFixture(fixture: Fixture, isFeaturedKnockout: boolean) {
        const played = !!fixture.winner;
        const c1 = colorOf(fixture.team1);
        const c2 = colorOf(fixture.team2);
        const win1 = played && fixture.winner === fixture.team1;
        const win2 = played && fixture.winner === fixture.team2;
        const isKnockout = fixture.group === "-";

        let containerClasses = "relative overflow-hidden rounded-2xl border bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] hover:bg-black/60 group";

        if (isFeaturedKnockout) {
            containerClasses = "relative overflow-hidden rounded-2xl border border-amber-500/40 bg-black/60 backdrop-blur-lg shadow-[0_0_40px_rgba(245,158,11,0.15)] transition-transform hover:scale-[1.02] hover:bg-black/80 hover:shadow-[0_0_60px_rgba(245,158,11,0.25)] group";
        } else {
            containerClasses = "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] hover:bg-black/60 group";
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
                        <div className={`relative flex flex-col items-center gap-1.5 min-w-0 transition-opacity ${played && !win1 ? "opacity-40" : ""}`}>
                            {win1 && (
                                <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full" style={{ backgroundColor: `${c1}15` }} />
                            )}
                            <div className="w-5 h-5 rounded-full shrink-0 shadow-lg relative z-10" style={{ backgroundColor: c1, border: `1px solid ${c1}40` }} />
                            <span className={`${isFeaturedKnockout ? 'text-3xl tracking-wider text-amber-50' : 'text-2xl'} font-bold text-center w-full mt-1 py-1 px-1 relative z-10`}
                                style={{
                                    fontFamily: "var(--font-display)",
                                    color: win1 ? 'white' : "white",
                                    textShadow: win1
                                        ? `0 0 15px ${c1}60`
                                        : "none"
                                }}>
                                {fixture.team1}
                            </span>
                            {win1 && <Trophy className={`relative z-10 w-4 h-4 shrink-0 text-amber-400 drop-shadow-md ${isFeaturedKnockout ? 'mt-1 w-6 h-6' : ''}`} strokeWidth={2.5} />}
                        </div>
                        <div className="text-center flex flex-col items-center justify-center pt-1">
                            <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${played ? "text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : liveMatches[fixture.matchNo]?.status === "SCHEDULED" ? "text-blue-400 border-blue-500/30 bg-blue-500/10 flex items-center gap-1" : liveMatches[fixture.matchNo]?.status === "LIVE" ? "text-red-500 border-red-500/30 bg-red-500/10 animate-pulse" : "text-zinc-500 border-white/10 bg-white/5"}`} style={{ fontFamily: "var(--font-body)" }}>
                                {played ? (
                                    "FT"
                                ) : liveMatches[fixture.matchNo]?.status === "SCHEDULED" ? (
                                    <>
                                        <Clock className="w-3 h-3" />
                                        {liveMatches[fixture.matchNo]?.scheduledTime || "SOON"}
                                    </>
                                ) : liveMatches[fixture.matchNo]?.status === "LIVE" ? (
                                    "LIVE"
                                ) : (
                                    "VS"
                                )}
                            </span>
                        </div>
                        <div className={`relative flex flex-col items-center gap-1.5 min-w-0 transition-opacity ${played && !win2 ? "opacity-40" : ""}`}>
                            {win2 && (
                                <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full" style={{ backgroundColor: `${c2}15` }} />
                            )}
                            <div className="w-5 h-5 rounded-full shrink-0 shadow-lg relative z-10" style={{ backgroundColor: c2, border: `1px solid ${c2}40` }} />
                            <span className={`${isFeaturedKnockout ? 'text-3xl tracking-wider text-amber-50' : 'text-2xl'} font-bold text-center w-full mt-1 py-1 px-1 relative z-10`}
                                style={{
                                    fontFamily: "var(--font-display)",
                                    color: win2 ? 'white' : "white",
                                    textShadow: win2
                                        ? `0 0 15px ${c2}60`
                                        : "none"
                                }}>
                                {fixture.team2}
                            </span>
                            {win2 && <Trophy className={`relative z-10 w-4 h-4 shrink-0 text-amber-400 drop-shadow-md ${isFeaturedKnockout ? 'mt-1 w-6 h-6' : ''}`} strokeWidth={2.5} />}
                        </div>
                    </div>
                    {/* Result Text Mobile */}
                    {played && (
                        <div className="text-center">
                            <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest">
                                {liveMatches[fixture.matchNo]?.result || "Match Completed"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Desktop layout (md+) */}
                <div className={`hidden md:grid items-center px-6 relative z-10 ${isFeaturedKnockout ? 'py-8' : 'py-5'}`} style={{ gridTemplateColumns: "4rem 6rem 1fr 5rem 1fr" }}>
                    <span className={`text-sm tabular-nums font-medium ${isFeaturedKnockout ? 'text-amber-500 font-bold' : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-mono)" }}>
                        {fixture.matchNo}
                    </span>
                    <span className={`text-[10px] tracking-widest pr-2 ${isFeaturedKnockout ? 'text-amber-400 font-bold text-xs' : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-body)" }}>
                        {isKnockout ? fixture.stage.toUpperCase() : "GROUP " + fixture.group}
                    </span>
                    <div className={`relative flex items-center gap-4 justify-end min-w-0 transition-opacity ${played && !win1 ? "opacity-40" : ""}`}>
                        {win1 && (
                            <div className="absolute right-0 w-3/4 h-full bg-gradient-to-l from-white/5 to-transparent blur-xl" style={{ borderRight: `2px solid ${c1}30`, backgroundImage: `linear-gradient(to left, ${c1}15, transparent)` }} />
                        )}
                        {win1 && <Trophy className={`relative z-10 w-6 h-6 shrink-0 text-amber-400 drop-shadow-md ${isFeaturedKnockout ? 'w-8 h-8' : ''}`} strokeWidth={2.5} />}
                        <span className={`${isFeaturedKnockout ? 'text-5xl tracking-widest text-amber-50' : 'text-4xl tracking-wide'} font-bold text-right transition-colors py-2 px-1 relative z-10`}
                            style={{
                                fontFamily: "var(--font-display)",
                                color: 'white',
                                textShadow: win1
                                    ? `0 0 20px ${c1}50`
                                    : "none",
                                paddingTop: "0.2rem"
                            }}>
                            {fixture.team1}
                        </span>
                        <div className={`relative z-10 rounded-full shrink-0 shadow-lg ${isFeaturedKnockout ? 'w-6 h-6' : 'w-4 h-4'}`} style={{ backgroundColor: c1, border: `1px solid ${c1}40` }} />
                    </div>
                    <div className="text-center flex flex-col items-center justify-center w-24">
                        <span className={`text-[10px] sm:text-xs font-bold tracking-widest px-3 py-1 rounded border whitespace-nowrap ${played ? "text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : liveMatches[fixture.matchNo]?.status === "SCHEDULED" ? "text-blue-400 border-blue-500/30 bg-blue-500/10 flex items-center justify-center gap-2" : liveMatches[fixture.matchNo]?.status === "LIVE" ? "text-red-500 border-red-500/30 bg-red-500/10 flex items-center justify-center gap-2" : "text-zinc-500 border-white/10 bg-white/5"} ${isFeaturedKnockout && !played && !liveMatches[fixture.matchNo] ? '!text-amber-300 !border-amber-500/50 !bg-amber-900/10' : ''}`} style={{ fontFamily: "var(--font-body)" }}>
                            {played ? (
                                "FT"
                            ) : liveMatches[fixture.matchNo]?.status === "SCHEDULED" ? (
                                <>
                                    <Clock className="w-3 h-3" />
                                    {liveMatches[fixture.matchNo]?.scheduledTime || "SOON"}
                                </>
                            ) : liveMatches[fixture.matchNo]?.status === "LIVE" ? (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    LIVE
                                </>
                            ) : (
                                "VS"
                            )}
                        </span>
                        {played && (
                            <span className="text-[8px] text-amber-500/60 font-bold uppercase tracking-wider mt-1 block max-w-[80px] leading-tight">
                                {liveMatches[fixture.matchNo]?.result || "COMPLETED"}
                            </span>
                        )}
                    </div>
                    <div className={`relative flex items-center gap-4 min-w-0 transition-opacity ${played && !win2 ? "opacity-40" : ""}`}>
                        {win2 && (
                            <div className="absolute left-0 w-3/4 h-full bg-gradient-to-r from-white/5 to-transparent blur-xl" style={{ borderLeft: `2px solid ${c2}30`, backgroundImage: `linear-gradient(to right, ${c2}15, transparent)` }} />
                        )}
                        <div className={`relative z-10 rounded-full shrink-0 shadow-lg ${isFeaturedKnockout ? 'w-6 h-6' : 'w-4 h-4'}`} style={{ backgroundColor: c2, border: `1px solid ${c2}40` }} />
                        <span className={`${isFeaturedKnockout ? 'text-5xl tracking-widest text-amber-50' : 'text-4xl tracking-wide'} font-bold transition-colors py-2 px-1 relative z-10`}
                            style={{
                                fontFamily: "var(--font-display)",
                                color: 'white',
                                textShadow: win2
                                    ? `0 0 20px ${c2}50`
                                    : "none",
                                paddingTop: "0.2rem"
                            }}>
                            {fixture.team2}
                        </span>
                        {win2 && <Trophy className={`relative z-10 w-6 h-6 shrink-0 text-amber-400 drop-shadow-md ${isFeaturedKnockout ? 'w-8 h-8' : ''}`} strokeWidth={2.5} />}
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
                        MATCHES
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
                        <p className="text-zinc-700 text-sm tracking-widest">MATCHES NOT YET PUBLISHED</p>
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-12"
                    >
                        {/* Group summary cards */}
                        {hasGroupData && (
                            <div className="grid grid-cols-2 gap-4">
                                {(["A", "B"] as const).map(group => (
                                    <motion.div variants={itemVariants} key={group} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                                        <p className="text-[10px] tracking-[0.4em] text-zinc-600 mb-3" style={{ fontFamily: "var(--font-body)" }}>
                                            GROUP {group}
                                        </p>
                                        <div className="space-y-2">
                                            {groupTeams[group].map(team => (
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
                            {/* Knockout Stage - Only show if semi-finals are decided (teams don't contain "Group") */}
                            {fixtures.filter(f => f.group === "-" && !f.team1.includes("Group") && !f.team2.includes("Group") && !f.team1.includes("Winner") && !f.team2.includes("Winner")).length > 0 && (
                                <div>
                                    <motion.div variants={itemVariants} className="flex items-center gap-4 mb-4">
                                        <span className="text-[12px] tracking-[0.4em] text-amber-500 font-bold uppercase" style={{ fontFamily: "var(--font-body)" }}>
                                            KNOCKOUT STAGE
                                        </span>
                                        <div className="flex-1 h-px bg-amber-500/20" />
                                    </motion.div>
                                    <div className="space-y-6">
                                        {fixtures
                                            .filter(f => f.group === "-" && !f.team1.includes("Group") && !f.team2.includes("Group") && !f.team1.includes("Winner") && !f.team2.includes("Winner"))
                                            .sort((a, b) => b.matchNo.localeCompare(a.matchNo)) // Final first, then SFs
                                            .map(fixture => renderFixture(fixture, true))}
                                    </div>
                                </div>
                            )}

                            {/* Group Matches Schedule */}
                            <div>
                                <motion.div variants={itemVariants} className="flex items-center gap-4 mb-4">
                                    <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-body)" }}>
                                        GROUP SCHEDULE
                                    </span>
                                    <div className="flex-1 h-px bg-white/[0.05]" />
                                </motion.div>

                                <div className="space-y-4">
                                    {fixtures
                                        .filter(f => f.group !== "-" || f.team1.includes("Group") || f.team2.includes("Group") || f.team1.includes("Winner") || f.team2.includes("Winner"))
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
