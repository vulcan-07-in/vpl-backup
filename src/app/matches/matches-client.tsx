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
    const groupTeams: Record<"A" | "B" | "C", string[]> = { A: [], B: [], C: [] };
    fixtures.forEach(f => {
        if (f.group === "A" || f.group === "B" || f.group === "C") {
            if (!groupTeams[f.group].includes(f.team1) && !f.team1.includes("Group") && !f.team1.includes("Pool")) groupTeams[f.group].push(f.team1);
            if (!groupTeams[f.group].includes(f.team2) && !f.team2.includes("Group") && !f.team2.includes("Pool")) groupTeams[f.group].push(f.team2);
        }
    });

    const hasGroupData = groupTeams.A.length > 0 || groupTeams.B.length > 0 || groupTeams.C.length > 0;

    const getLocalDateString = (isoString?: string) => {
        if (!isoString) return "TBD";
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString("en-CA"); // YYYY-MM-DD format
        } catch (e) {
            return "TBD";
        }
    };

    const formatDateHeader = (dateStr: string) => {
        if (dateStr === "TBD") return "To Be Decided";
        try {
            const date = new Date(dateStr + "T00:00:00");
            const day = date.getDate();
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
            const weekday = date.toLocaleString('en-US', { weekday: 'long' });
            const month = date.toLocaleString('en-US', { month: 'long' });
            return `${weekday}, ${month} ${day}${suffix}`;
        } catch (e) {
            return dateStr;
        }
    };

    const uniqueDates = Array.from(new Set(
        fixtures
            .map(f => getLocalDateString(f.scheduledTime))
            .filter(d => d !== "TBD")
    )).sort();

    const dateToDayNum = new Map<string, number>();
    uniqueDates.forEach((dateStr, idx) => {
        dateToDayNum.set(dateStr, idx + 1);
    });

    const groupedFixtures: Record<string, Fixture[]> = {};
    fixtures.forEach(f => {
        const dateKey = getLocalDateString(f.scheduledTime);
        if (!groupedFixtures[dateKey]) {
            groupedFixtures[dateKey] = [];
        }
        groupedFixtures[dateKey].push(f);
    });

    const sortedGroupKeys = Object.keys(groupedFixtures).sort((a, b) => {
        if (a === "TBD") return 1;
        if (b === "TBD") return -1;
        return a.localeCompare(b);
    });

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
        const sn1 = shortName(fixture.team1).substring(0, 4).toUpperCase();
        const sn2 = shortName(fixture.team2).substring(0, 4).toUpperCase();
        const lm = liveMatches[fixture.matchNo];
        const isLive = lm?.status === "LIVE";
        const isInningsBreak = lm?.status === "INNINGS_BREAK";
        const isCompleted = !!fixture.winner || lm?.status === "COMPLETED";
        const win1 = isCompleted && (fixture.winner === fixture.team1 || lm?.winner === fixture.team1);
        const win2 = isCompleted && (fixture.winner === fixture.team2 || lm?.winner === fixture.team2);
        const isKnockout = fixture.group === "-";
        const resultStr = lm?.result || (fixture.winner && fixture.winner !== "TIE" && fixture.winner !== "ABANDONED" ? `${fixture.winner} Won` : fixture.winner === "TIE" ? "Match Tied" : fixture.winner === "ABANDONED" ? "Abandoned" : null);

        const targetHref = (isLive || isInningsBreak) ? `/live?matchId=${encodeURIComponent(fixture.matchNo)}` : `/matches/${encodeURIComponent(fixture.matchNo)}`;

        // Score info
        const getTeamScore = (teamName: string) => {
            if (!lm) return null;
            if (lm.innings1.teamName === teamName) return lm.innings1;
            if (lm.innings2.teamName === teamName) return lm.innings2;
            return null;
        };
        const t1Score = getTeamScore(fixture.team1);
        const t2Score = getTeamScore(fixture.team2);

        // Toss info
        const actualTossWinner = lm?.tossWinner || fixture.tossWinner;
        const actualTossDecision = lm?.tossDecision || fixture.tossDecision;
        const tossStr = actualTossWinner && actualTossDecision ? `${actualTossWinner} elected to ${actualTossDecision.toLowerCase()}` : null;

        // Visual container styles
        let containerClasses = "relative overflow-hidden rounded-3xl border bg-zinc-950/40 border-white/[0.04] hover:border-amber-500/20 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:scale-[1.015] hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)] group block p-5 sm:p-7";
        if (isFeaturedKnockout) {
            containerClasses = "relative overflow-hidden rounded-3xl border border-amber-500/30 hover:border-amber-400 bg-zinc-950/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(245,158,11,0.08)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(245,158,11,0.15)] group block p-6 sm:p-8";
        } else if (isLive || isInningsBreak) {
            containerClasses = "relative overflow-hidden rounded-3xl border border-red-500/20 hover:border-red-500/50 bg-zinc-950/50 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:scale-[1.015] hover:shadow-[0_20px_50px_rgba(239,68,68,0.12)] group block p-5 sm:p-7";
        }

        const InnerContent = (
            <div className="flex flex-col gap-4 relative z-10">
                {/* Background high-tech overlay mesh */}
                <div 
                    className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none rounded-3xl" 
                    style={{ background: `radial-gradient(circle at 20% 50%, ${c1} 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${c2} 0%, transparent 50%)` }} 
                />

                {/* Top bar of the fixture card */}
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] ${isFeaturedKnockout ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' : 'text-zinc-500'}`}>
                            #{fixture.matchNo}
                        </span>
                        <span className={`font-black uppercase tracking-[0.2em] ${isFeaturedKnockout ? 'text-amber-500' : 'text-zinc-600'}`}>
                            {isKnockout ? fixture.stage : `GROUP ${fixture.group}`}
                        </span>
                    </div>

                    {/* Live/Status Pill */}
                    <div>
                        {isLive ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 font-extrabold tracking-widest text-[9px] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                LIVE
                            </div>
                        ) : isInningsBreak ? (
                            <div className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-extrabold tracking-widest text-[9px]">
                                BREAK
                            </div>
                        ) : isCompleted ? (
                            <div className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 font-extrabold tracking-widest text-[9px]">
                                FINISHED
                            </div>
                        ) : (
                            <div className="text-zinc-600 font-bold uppercase tracking-widest text-[9px]">
                                SCHEDULED
                            </div>
                        )}
                    </div>
                </div>

                {/* Teams Grid */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8 py-2">
                    {/* Team 1 Details */}
                    <div className={`flex items-center gap-3 sm:gap-5 justify-end min-w-0 transition-all duration-300 ${isCompleted && !win1 ? "opacity-35 blur-[0.3px]" : ""}`}>
                        {win1 && <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 animate-bounce" />}
                        <div className="flex flex-col items-end min-w-0 text-right">
                            <span className="text-base sm:text-2xl font-black text-white leading-tight truncate w-full tracking-wide font-display">
                                {fixture.team1}
                            </span>
                            {t1Score && (isCompleted || isLive || isInningsBreak) && (
                                <span className="text-xs sm:text-sm text-zinc-400 font-mono font-bold mt-1 tracking-widest">
                                    {t1Score.runs}/{t1Score.wickets} <span className="text-zinc-600 font-medium text-[10px] sm:text-xs">({t1Score.overs.toFixed(1)})</span>
                                </span>
                            )}
                        </div>
                        {/* High-tech Team Badge */}
                        <div 
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center font-black tracking-tighter text-sm sm:text-base border transition-all duration-500 shadow-xl"
                            style={{ 
                                backgroundColor: `${c1}15`, 
                                borderColor: `${c1}40`, 
                                color: c1,
                                boxShadow: `0 0 20px ${c1}10`
                            }}
                        >
                            {sn1}
                        </div>
                    </div>

                    {/* Match VS / Score Divider */}
                    <div className="flex flex-col items-center justify-center min-w-[40px]">
                        <div className="h-8 w-px bg-white/[0.05]" />
                        <span className="text-[10px] tracking-widest font-black text-zinc-700 py-1.5 uppercase font-mono">VS</span>
                        <div className="h-8 w-px bg-white/[0.05]" />
                    </div>

                    {/* Team 2 Details */}
                    <div className={`flex items-center gap-3 sm:gap-5 justify-start min-w-0 transition-all duration-300 ${isCompleted && !win2 ? "opacity-35 blur-[0.3px]" : ""}`}>
                        {/* High-tech Team Badge */}
                        <div 
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center font-black tracking-tighter text-sm sm:text-base border transition-all duration-500 shadow-xl"
                            style={{ 
                                backgroundColor: `${c2}15`, 
                                borderColor: `${c2}40`, 
                                color: c2,
                                boxShadow: `0 0 20px ${c2}10`
                            }}
                        >
                            {sn2}
                        </div>
                        <div className="flex flex-col items-start min-w-0 text-left">
                            <span className="text-base sm:text-2xl font-black text-white leading-tight truncate w-full tracking-wide font-display">
                                {fixture.team2}
                            </span>
                            {t2Score && (isCompleted || isLive || isInningsBreak) && (
                                <span className="text-xs sm:text-sm text-zinc-400 font-mono font-bold mt-1 tracking-widest">
                                    {t2Score.runs}/{t2Score.wickets} <span className="text-zinc-600 font-medium text-[10px] sm:text-xs">({t2Score.overs.toFixed(1)})</span>
                                </span>
                            )}
                        </div>
                        {win2 && <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 animate-bounce" />}
                    </div>
                </div>

                {/* Footer Ticker: Toss/Results */}
                {(resultStr || tossStr) && (
                    <div className="mt-1 pt-3 border-t border-white/[0.03] flex items-center justify-center">
                        {isCompleted && resultStr ? (
                            <span className="text-[10px] sm:text-xs text-amber-400/90 font-bold uppercase tracking-[0.15em] bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/20 text-center max-w-full truncate shadow-sm">
                                🎉 {resultStr}
                            </span>
                        ) : tossStr ? (
                            <span className="text-[9px] sm:text-[10px] text-zinc-500 font-semibold uppercase tracking-widest bg-white/[0.02] px-4 py-1.5 rounded-full border border-white/[0.04] text-center max-w-full truncate">
                                📢 {tossStr}
                            </span>
                        ) : null}
                    </div>
                )}

                {/* Click action indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-600 group-hover:text-amber-500">
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        );

        return (
            <motion.div variants={itemVariants} key={fixture.matchNo}>
                <Link href={targetHref} className={containerClasses}>
                    {InnerContent}
                </Link>
            </motion.div>
        );
    }

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28 relative overflow-hidden bg-black">
            {/* Ambient background decorative glow lights */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.02] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-red-500/[0.01] rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-3xl mx-auto relative z-10">
                {/* Stunning Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, type: "spring" }}
                    className="mb-16 md:mb-20 text-center relative"
                >
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
                    
                    <p className="text-xs tracking-[0.6em] text-amber-500/80 font-bold mb-4 uppercase font-mono">
                        VARCHASVA PREMIER LEAGUE S2
                    </p>
                    <h1 className="text-6xl md:text-9xl text-white font-black leading-none tracking-tighter uppercase font-display bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40">
                        FIXTURES
                    </h1>
                    
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <span className="px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                            📊 {fixtures.length} Total Matches
                        </span>
                        <span className="px-4 py-1.5 rounded-full bg-red-500/5 border border-red-500/20 text-[10px] text-red-400 font-mono tracking-widest uppercase animate-pulse">
                            🔴 Live Scores Enabled
                        </span>
                    </div>
                </motion.div>

                {fixtures.length === 0 ? (
                    <div className="py-24 text-center border border-white/[0.05] rounded-3xl bg-zinc-950/20 backdrop-blur-md">
                        <p className="text-zinc-600 text-sm tracking-widest uppercase font-mono">MATCHES NOT YET PUBLISHED</p>
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-16"
                    >
                        {/* High-tech Group Mini-Cards */}
                        {hasGroupData && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                                {(["A", "B", "C"] as const).map(group => (
                                    <motion.div 
                                        variants={itemVariants} 
                                        key={group} 
                                        className="relative overflow-hidden rounded-3xl border border-white/[0.04] bg-zinc-950/20 hover:border-amber-500/10 p-5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-[1.02]"
                                    >
                                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 mb-4">
                                            <p className="text-xs font-black tracking-widest text-amber-500 uppercase font-mono">
                                                GROUP {group}
                                            </p>
                                            <span className="text-[9px] text-zinc-500 font-mono font-bold">{groupTeams[group].length} TEAMS</span>
                                        </div>
                                        <div className="space-y-3">
                                            {groupTeams[group].map((team, idx) => (
                                                <div key={team} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: colorOf(team), boxShadow: `0 0 8px ${colorOf(team)}` }} />
                                                        <span className="text-sm text-zinc-300 font-medium truncate font-heading">
                                                             {team}
                                                         </span>
                                                     </div>
                                                     <span className="text-[9px] font-mono text-zinc-600 font-bold">#{idx + 1}</span>
                                                 </div>
                                             ))}
                                         </div>
                                     </motion.div>
                                 ))}
                             </div>
                         )}

                        {/* Chronological Day Sections */}
                        <div className="space-y-20">
                            {sortedGroupKeys.map(dateKey => {
                                const dayNum = dateToDayNum.get(dateKey);
                                const headerText = dayNum ? `DAY ${dayNum}` : "UNSCHEDULED MATCHES";
                                const subHeaderText = formatDateHeader(dateKey);

                                const sortedMatches = groupedFixtures[dateKey].sort((a, b) => {
                                    if (a.scheduledTime && b.scheduledTime) {
                                        const timeA = new Date(a.scheduledTime).getTime();
                                        const timeB = new Date(b.scheduledTime).getTime();
                                        if (timeA !== timeB) return timeA - timeB;
                                    }
                                    const numA = parseInt(a.matchNo.replace(/[^0-9]/g, "")) || 999;
                                    const numB = parseInt(b.matchNo.replace(/[^0-9]/g, "")) || 999;
                                    if (numA !== numB) return numA - numB;
                                    return a.matchNo.localeCompare(b.matchNo);
                                });

                                return (
                                    <div key={dateKey} className="space-y-8">
                                        {/* Premium Day Divider Banner */}
                                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/[0.06] pb-5">
                                            <div>
                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] tracking-widest text-amber-500 font-bold uppercase font-mono mb-2 shadow-sm">
                                                    ✨ {headerText}
                                                </span>
                                                <h2 className="text-3xl sm:text-5xl text-white font-black leading-none tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
                                                    {subHeaderText}
                                                </h2>
                                            </div>
                                            <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase sm:pb-1 font-bold">
                                                {sortedMatches.length} {sortedMatches.length === 1 ? "MATCH" : "MATCHES"}
                                            </span>
                                        </motion.div>

                                        {/* Scheduled Matches Cards Container */}
                                        <div className="space-y-8">
                                            {sortedMatches.map(fixture => {
                                                const isFeaturedKnockout = fixture.group === "-" && 
                                                    !fixture.team1.includes("Group") && !fixture.team1.includes("Pool") && !fixture.team1.includes("Winner") &&
                                                    !fixture.team2.includes("Group") && !fixture.team2.includes("Pool") && !fixture.team2.includes("Winner");
                                                
                                                return renderFixture(fixture, isFeaturedKnockout);
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </div>
        </main>
    );
}
