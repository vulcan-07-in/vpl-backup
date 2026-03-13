"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Clock, ChevronRight } from "lucide-react";
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
    const shortName = (name: string) => teams.find(t => t.teamName === name)?.shortName ?? name.substring(0, 3).toUpperCase();

    const [liveMatches, setLiveMatches] = useState<Record<string, LiveMatchState>>({});

    useEffect(() => {
        const fetchLiveStatus = async () => {
            try {
                const res = await fetch("/api/live-score/all");
                if (res.ok) {
                    const data = await res.json();
                    setLiveMatches(data);
                }
            } catch (e) { /* ignore */ }
        };
        fetchLiveStatus();
        const interval = setInterval(fetchLiveStatus, 5000);
        return () => clearInterval(interval);
    }, [fixtures]);

    // Derive group team lists from fixtures
    const groupTeams: Record<"A" | "B", string[]> = { A: [], B: [] };
    fixtures.forEach(f => {
        if (f.group === "A" || f.group === "B") {
            if (!groupTeams[f.group].includes(f.team1) && !f.team1.includes("Group") && !f.team1.includes("Pool")) groupTeams[f.group].push(f.team1);
            if (!groupTeams[f.group].includes(f.team2) && !f.team2.includes("Group") && !f.team2.includes("Pool")) groupTeams[f.group].push(f.team2);
        }
    });

    const hasGroupData = groupTeams.A.length > 0 || groupTeams.B.length > 0;

    const formatScheduledTime = (isoString?: string) => {
        if (!isoString) return null;
        try {
            const date = new Date(isoString);
            const day = date.getDate();
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
            const month = date.toLocaleString('en-US', { month: 'short' });
            const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            return `${day}${suffix} ${month} ${time}`;
        } catch (e) {
            return null;
        }
    };

    function renderFixture(fixture: Fixture, isFeaturedKnockout: boolean) {
        const c1 = colorOf(fixture.team1);
        const c2 = colorOf(fixture.team2);
        const lm = liveMatches[fixture.matchNo];
        const isLive = lm?.status === "LIVE";
        const isInningsBreak = lm?.status === "INNINGS_BREAK";
        const isCompleted = !!fixture.winner || lm?.status === "COMPLETED";
        const win1 = isCompleted && (fixture.winner === fixture.team1 || lm?.winner === fixture.team1);
        const win2 = isCompleted && (fixture.winner === fixture.team2 || lm?.winner === fixture.team2);
        const isKnockout = fixture.group === "-";
        const resultStr = lm?.result || (fixture.winner && fixture.winner !== "TIE" && fixture.winner !== "ABANDONED" ? `${fixture.winner} Won` : fixture.winner === "TIE" ? "Match Tied" : fixture.winner === "ABANDONED" ? "Abandoned" : null);

        // Determine if match has any state in Redis
        const hasLiveState = !!lm;
        const isScheduled = lm?.status === "SCHEDULED";
        const canView = isCompleted || isLive || isInningsBreak || (hasLiveState && lm.timeline?.length > 0);
        const targetHref = (isLive || isInningsBreak) ? "/live" : `/matches/${fixture.matchNo}`;

        // Get score info
        const getTeamScore = (teamName: string) => {
            if (!lm) return null;
            if (lm.innings1.teamName === teamName) return lm.innings1;
            if (lm.innings2.teamName === teamName) return lm.innings2;
            return null;
        };
        const t1Score = getTeamScore(fixture.team1);
        const t2Score = getTeamScore(fixture.team2);

        let containerClasses = "relative overflow-hidden rounded-2xl border bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] group block";
        if (isFeaturedKnockout) {
            containerClasses = "relative overflow-hidden rounded-2xl border border-amber-500/40 bg-black/60 backdrop-blur-lg shadow-[0_0_40px_rgba(245,158,11,0.15)] transition-transform hover:scale-[1.02] group block";
        } else if (isCompleted) {
            containerClasses = "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] group block cursor-pointer hover:border-amber-500/30";
        } else if (isLive || isInningsBreak) {
            containerClasses = "relative overflow-hidden rounded-2xl border border-red-500/30 bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] group block cursor-pointer hover:border-red-500/50";
        } else {
            containerClasses = "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] group block";
        }

        const InnerContent = (
            <>
                {/* Background gradient slash */}
                <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none ${isFeaturedKnockout ? 'opacity-20' : ''}`} style={{ background: `linear-gradient(110deg, ${c1} 0%, transparent 40%, transparent 60%, ${c2} 100%)` }} />

                {/* Mobile layout (< md) */}
                <div className="md:hidden flex flex-col relative z-10 p-4 gap-2">
                    <div className="flex justify-between items-center w-full">
                        <span className={`text-[10px] ${isFeaturedKnockout ? 'text-amber-500 font-bold' : 'text-zinc-500'} tabular-nums uppercase`} style={{ fontFamily: "var(--font-mono)" }}>
                            {fixture.matchNo}
                        </span>
                        <span className={`text-[9px] tracking-widest ${isFeaturedKnockout ? 'text-amber-400 font-bold' : 'text-zinc-600'}`}>
                            {isKnockout ? fixture.stage.toUpperCase() : `GROUP ${fixture.group}`}
                        </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        {/* Team 1 */}
                        <div className={`relative flex flex-col items-center gap-1 min-w-0 transition-opacity ${isCompleted && !win1 ? "opacity-40" : ""}`}>
                            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c1, border: `1px solid ${c1}40` }} />
                            <span className={`${isFeaturedKnockout ? 'text-xl' : 'text-lg'} font-bold text-center w-full leading-tight relative z-10 truncate max-w-[100px]`}
                                style={{ fontFamily: "var(--font-display)", color: 'white' }}>
                                {fixture.team1}
                            </span>
                            {t1Score && (isCompleted || isLive || isInningsBreak) && (
                                <span className="text-xs text-zinc-400 font-mono tabular-nums">
                                    {t1Score.runs}/{t1Score.wickets}
                                    <span className="text-zinc-600 ml-1 text-[10px]">({t1Score.overs.toFixed(1)})</span>
                                </span>
                            )}
                            {win1 && <Trophy className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.5} />}
                        </div>
                        {/* Center */}
                        <div className="text-center flex flex-col items-center justify-center">
                            {isCompleted ? (
                                <span className="text-[9px] font-bold tracking-widest text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10">FT</span>
                            ) : isLive ? (
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgb(239,68,68)]" />
                                        <span className="text-[9px] font-bold tracking-widest text-red-500">LIVE</span>
                                    </div>
                                </div>
                            ) : isInningsBreak ? (
                                <span className="text-[9px] font-bold tracking-widest text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10">BREAK</span>
                            ) : isScheduled ? (
                                <div className="flex flex-col items-center gap-0.5">
                                    <Clock className="w-3 h-3 text-blue-400" />
                                    <span className="text-[8px] text-blue-400 font-bold leading-tight text-center">
                                        {formatScheduledTime(lm?.scheduledTime) || "SOON"}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] font-bold tracking-widest text-zinc-600">VS</span>
                            )}
                        </div>
                        {/* Team 2 */}
                        <div className={`relative flex flex-col items-center gap-1 min-w-0 transition-opacity ${isCompleted && !win2 ? "opacity-40" : ""}`}>
                            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c2, border: `1px solid ${c2}40` }} />
                            <span className={`${isFeaturedKnockout ? 'text-xl' : 'text-lg'} font-bold text-center w-full leading-tight relative z-10 truncate max-w-[100px]`}
                                style={{ fontFamily: "var(--font-display)", color: 'white' }}>
                                {fixture.team2}
                            </span>
                            {t2Score && (isCompleted || isLive || isInningsBreak) && (
                                <span className="text-xs text-zinc-400 font-mono tabular-nums">
                                    {t2Score.runs}/{t2Score.wickets}
                                    <span className="text-zinc-600 ml-1 text-[10px]">({t2Score.overs.toFixed(1)})</span>
                                </span>
                            )}
                            {win2 && <Trophy className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.5} />}
                        </div>
                    </div>
                    {/* Result line on mobile */}
                    {isCompleted && resultStr && (
                        <p className="text-[9px] text-amber-500/80 font-bold text-center uppercase tracking-wider mt-1 truncate">{resultStr}</p>
                    )}
                </div>

                {/* Desktop layout (md+) */}
                <div className={`hidden md:grid items-center px-10 relative z-10 ${isFeaturedKnockout ? 'py-10' : 'py-7'}`} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                    {/* Left: Team 1 */}
                    <div className={`relative flex items-center gap-6 justify-end min-w-0 transition-opacity ${isCompleted && !win1 ? "opacity-20" : ""}`}>
                        {win1 && (
                            <div className="absolute right-0 w-4/5 h-full bg-gradient-to-l from-white/5 to-transparent blur-2xl" style={{ backgroundImage: `linear-gradient(to left, ${c1}15, transparent)` }} />
                        )}
                        <div className="flex flex-col items-end min-w-0 max-w-[200px]">
                            <span className={`${isFeaturedKnockout ? 'text-6xl tracking-widest' : 'text-5xl tracking-wide'} font-bold py-2 px-1 relative z-10 leading-none truncate max-w-full`}
                                style={{ fontFamily: "var(--font-display)", color: 'white', textShadow: win1 ? `0 0 30px ${c1}50` : "none" }}>
                                {fixture.team1}
                            </span>
                            {t1Score && (isCompleted || isLive || isInningsBreak) && (
                                <span className="text-zinc-500 font-mono text-xs mt-1 tracking-widest relative z-10 tabular-nums">
                                    {t1Score.runs}/{t1Score.wickets} ({t1Score.overs.toFixed(1)})
                                </span>
                            )}
                        </div>
                        <div className={`relative z-10 rounded-full shrink-0 shadow-2xl ${isFeaturedKnockout ? 'w-8 h-8' : 'w-6 h-6'}`} style={{ backgroundColor: c1, border: `2px solid ${c1}40` }} />
                        {win1 && <Trophy className={`relative z-10 w-8 h-8 shrink-0 text-amber-400 drop-shadow-2xl ${isFeaturedKnockout ? 'w-10 h-10' : ''}`} strokeWidth={2.5} />}
                    </div>

                    {/* Center: Info/Score */}
                    <div className="text-center flex flex-col items-center justify-center px-4">
                        <div className="flex items-center gap-2 mb-2">
                             <span className={`text-[10px] tabular-nums font-bold tracking-[0.2em] ${isFeaturedKnockout ? 'text-amber-500' : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-mono)" }}>
                                #{fixture.matchNo}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <span className={`text-[9px] tracking-[0.3em] font-black uppercase ${isFeaturedKnockout ? 'text-amber-400' : 'text-zinc-600'}`}>
                                {isKnockout ? fixture.stage : "GROUP " + fixture.group}
                            </span>
                        </div>

                        <div className={`min-w-[120px] px-6 py-2 rounded-xl border transition-all duration-300 ${isCompleted ? "text-amber-400 border-amber-500/30 bg-amber-500/5" : isLive ? "text-red-500 border-red-500/30 bg-red-500/10" : isInningsBreak ? "text-blue-400 border-blue-500/30 bg-blue-500/10" : "text-zinc-500 border-white/5 bg-white/[0.02]"}`}>
                            {isCompleted ? (
                                <span className="text-xl font-black tracking-tight text-white" style={{ fontFamily: "var(--font-mono)" }}>FT</span>
                            ) : isLive ? (
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgb(239,68,68)]" />
                                        <span className="text-[10px] font-black tracking-[0.2em]">LIVE</span>
                                    </div>
                                </div>
                            ) : isInningsBreak ? (
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">INNINGS BREAK</span>
                                </div>
                            ) : isScheduled ? (
                                <div className="flex flex-col items-center gap-1">
                                    <Clock className="w-4 h-4 text-blue-400 mb-1" />
                                    <span className="text-xs font-bold tracking-wider text-blue-400">
                                        {formatScheduledTime(lm?.scheduledTime) || "SOON"}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-sm font-black tracking-[0.5em] opacity-40">VS</span>
                            )}
                        </div>

                        {isCompleted && resultStr && (
                            <div className="mt-3 flex flex-col items-center">
                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em] bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 text-center max-w-[250px] truncate">
                                    {resultStr}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Team 2 */}
                    <div className={`relative flex items-center gap-6 justify-start min-w-0 transition-opacity ${isCompleted && !win2 ? "opacity-20" : ""}`}>
                        {win2 && (
                            <div className="absolute left-0 w-4/5 h-full bg-gradient-to-r from-white/5 to-transparent blur-2xl" style={{ backgroundImage: `linear-gradient(to right, ${c2}15, transparent)` }} />
                        )}
                        <div className={`relative z-10 rounded-full shrink-0 shadow-2xl ${isFeaturedKnockout ? 'w-8 h-8' : 'w-6 h-6'}`} style={{ backgroundColor: c2, border: `2px solid ${c2}40` }} />
                        <div className="flex flex-col items-start min-w-0 max-w-[200px]">
                            <span className={`${isFeaturedKnockout ? 'text-6xl tracking-widest' : 'text-5xl tracking-wide'} font-bold py-2 px-1 relative z-10 leading-none truncate max-w-full`}
                                style={{ fontFamily: "var(--font-display)", color: 'white', textShadow: win2 ? `0 0 30px ${c2}50` : "none" }}>
                                {fixture.team2}
                            </span>
                            {t2Score && (isCompleted || isLive || isInningsBreak) && (
                                <span className="text-zinc-500 font-mono text-xs mt-1 tracking-widest relative z-10 tabular-nums">
                                    {t2Score.runs}/{t2Score.wickets} ({t2Score.overs.toFixed(1)})
                                </span>
                            )}
                        </div>
                        {win2 && <Trophy className={`relative z-10 w-8 h-8 shrink-0 text-amber-400 drop-shadow-2xl ${isFeaturedKnockout ? 'w-10 h-10' : ''}`} strokeWidth={2.5} />}
                    </div>
                </div>

                {/* Desktop hover indicator */}
                {canView && (
                    <div className="absolute top-4 right-4 text-zinc-800 group-hover:text-amber-500/40 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                )}
            </>
        );

        return (
            <motion.div variants={itemVariants} key={fixture.matchNo}>
                {canView ? (
                    <Link href={targetHref} className={containerClasses}>
                        {InnerContent}
                    </Link>
                ) : (
                    <div className={containerClasses}>
                        {InnerContent}
                    </div>
                )}
            </motion.div>
        );
    }

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28">
            <div className="max-w-3xl mx-auto">
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
                            {fixtures.filter(f => f.group === "-" && 
                                !f.team1.includes("Group") && !f.team1.includes("Pool") && !f.team1.includes("Winner") &&
                                !f.team2.includes("Group") && !f.team2.includes("Pool") && !f.team2.includes("Winner")).length > 0 && (
                                <div>
                                    <motion.div variants={itemVariants} className="flex items-center gap-4 mb-4">
                                        <span className="text-[12px] tracking-[0.4em] text-amber-500 font-bold uppercase" style={{ fontFamily: "var(--font-body)" }}>
                                            KNOCKOUT STAGE
                                        </span>
                                        <div className="flex-1 h-px bg-amber-500/20" />
                                    </motion.div>
                                    <div className="space-y-6">
                                        {fixtures
                                            .filter(f => f.group === "-" && 
                                                !f.team1.includes("Group") && !f.team1.includes("Pool") && !f.team1.includes("Winner") &&
                                                !f.team2.includes("Group") && !f.team2.includes("Pool") && !f.team2.includes("Winner"))
                                            .sort((a, b) => b.matchNo.localeCompare(a.matchNo))
                                            .map(fixture => renderFixture(fixture, true))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <motion.div variants={itemVariants} className="flex items-center gap-4 mb-4">
                                    <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-body)" }}>
                                        TOURNAMENT SCHEDULE
                                    </span>
                                    <div className="flex-1 h-px bg-white/[0.05]" />
                                </motion.div>

                                <div className="space-y-4">
                                    {fixtures
                                        .filter(f => {
                                            const isKnockout = f.group === "-";
                                            const isResolved = !f.team1.includes("Group") && !f.team1.includes("Pool") && !f.team1.includes("Winner") &&
                                                             !f.team2.includes("Group") && !f.team2.includes("Pool") && !f.team2.includes("Winner");
                                            return !isKnockout || !isResolved;
                                        })
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
