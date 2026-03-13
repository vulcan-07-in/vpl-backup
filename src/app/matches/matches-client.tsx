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
            if (!groupTeams[f.group].includes(f.team1) && !f.team1.includes("Group") && !f.team1.includes("Pool")) groupTeams[f.group].push(f.team1);
            if (!groupTeams[f.group].includes(f.team2) && !f.team2.includes("Group") && !f.team2.includes("Pool")) groupTeams[f.group].push(f.team2);
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
        const isLive = liveMatches[fixture.matchNo]?.status === "LIVE";

        let containerClasses = "relative overflow-hidden rounded-2xl border bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] hover:bg-black/60 group block";

        if (isFeaturedKnockout) {
            containerClasses = "relative overflow-hidden rounded-2xl border border-amber-500/40 bg-black/60 backdrop-blur-lg shadow-[0_0_40px_rgba(245,158,11,0.15)] transition-transform hover:scale-[1.02] hover:bg-black/80 hover:shadow-[0_0_60px_rgba(245,158,11,0.25)] group block";
        } else if (played || isLive) {
            containerClasses = "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] hover:bg-black/60 group block cursor-pointer hover:border-amber-500/30";
        } else {
            containerClasses = "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-transform hover:scale-[1.01] hover:bg-black/60 group block";
        }

        const formatScheduledTime = (isoString?: string) => {
            if (!isoString) return "SOON";
            try {
                const date = new Date(isoString);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            } catch (e) {
                return "SOON";
            }
        };

        const InnerContent = (
            <>
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
                            <span className={`${isFeaturedKnockout ? 'text-3xl tracking-wider text-amber-50' : 'text-2xl'} font-bold text-center w-full mt-1 py-1 px-1 relative z-10 truncate max-w-[120px]`}
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
                            <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${played ? "text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : isLive ? "text-red-500 border-red-500/30 bg-red-500/10 animate-pulse" : liveMatches[fixture.matchNo]?.status === "SCHEDULED" ? "text-blue-400 border-blue-500/30 bg-blue-500/10 flex items-center gap-1" : "text-zinc-500 border-white/10 bg-white/5"}`} style={{ fontFamily: "var(--font-body)" }}>
                                {played ? (
                                    liveMatches[fixture.matchNo] ? (
                                        <div className="flex flex-col items-center">
                                            <span className="text-white font-bold">{liveMatches[fixture.matchNo].currentInnings === 2 ? liveMatches[fixture.matchNo].innings2.runs : liveMatches[fixture.matchNo].innings1.runs}-{liveMatches[fixture.matchNo].currentInnings === 2 ? liveMatches[fixture.matchNo].innings2.wickets : liveMatches[fixture.matchNo].innings1.wickets}</span>
                                            <span className="text-[8px] opacity-60">FT</span>
                                        </div>
                                    ) : "FT"
                                ) : isLive ? (
                                    <div className="flex flex-col items-center">
                                        <span className="text-red-500 font-bold">{liveMatches[fixture.matchNo].currentInnings === 2 ? liveMatches[fixture.matchNo].innings2.runs : liveMatches[fixture.matchNo].innings1.runs}-{liveMatches[fixture.matchNo].currentInnings === 2 ? liveMatches[fixture.matchNo].innings2.wickets : liveMatches[fixture.matchNo].innings1.wickets}</span>
                                        <span className="text-[8px] animate-pulse">LIVE</span>
                                    </div>
                                ) : liveMatches[fixture.matchNo]?.status === "SCHEDULED" ? (
                                    <div className="flex items-center gap-1.5 py-0.5">
                                        <Clock className="w-3 h-3 text-blue-400" />
                                        <span className="text-[10px]">{formatScheduledTime(liveMatches[fixture.matchNo]?.scheduledTime)}</span>
                                    </div>
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
                            <span className={`${isFeaturedKnockout ? 'text-3xl tracking-wider text-amber-50' : 'text-2xl'} font-bold text-center w-full mt-1 py-1 px-1 relative z-10 truncate max-w-[120px]`}
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
                </div>

                {/* Desktop layout (md+) */}
                <div className={`hidden md:grid items-center px-10 relative z-10 ${isFeaturedKnockout ? 'py-10' : 'py-7'}`} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                    {/* Left: Team 1 */}
                    <div className={`relative flex items-center gap-6 justify-end min-w-0 transition-opacity ${played && !win1 ? "opacity-20" : ""}`}>
                        {win1 && (
                            <div className="absolute right-0 w-4/5 h-full bg-gradient-to-l from-white/5 to-transparent blur-2xl" style={{ borderRight: `2px solid ${c1}30`, backgroundImage: `linear-gradient(to left, ${c1}15, transparent)` }} />
                        )}
                        <div className="flex flex-col items-end">
                            <span className={`${isFeaturedKnockout ? 'text-6xl tracking-widest' : 'text-5xl tracking-wide'} font-bold transition-colors py-2 px-1 relative z-10 leading-none truncate max-w-full`}
                                style={{
                                    fontFamily: "var(--font-display)",
                                    color: 'white',
                                    textShadow: win1 ? `0 0 30px ${c1}50` : "none"
                                }}>
                                {fixture.team1}
                            </span>
                            {played && liveMatches[fixture.matchNo] && (
                                <span className="text-zinc-500 font-mono text-xs mt-1 tracking-widest relative z-10">
                                    {liveMatches[fixture.matchNo].innings1.teamName === fixture.team1 ? 
                                        `${liveMatches[fixture.matchNo].innings1.runs}/${liveMatches[fixture.matchNo].innings1.wickets}` : 
                                        `${liveMatches[fixture.matchNo].innings2.runs}/${liveMatches[fixture.matchNo].innings2.wickets}`}
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
                            <span className={`text-[9px] tracking-[0.3em] font-black uppercase ${isFeaturedKnockout ? 'text-amber-400' : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-body)" }}>
                                {isKnockout ? fixture.stage : "GROUP " + fixture.group}
                            </span>
                        </div>

                        <div className={`min-w-[120px] px-6 py-2 rounded-xl border transition-all duration-300 ${played ? "text-amber-400 border-amber-500/30 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.05)]" : isLive ? "text-red-500 border-red-500/30 bg-red-500/10" : "text-zinc-500 border-white/5 bg-white/[0.02]"}`}>
                            {played ? (
                                <span className="text-xl font-black tracking-tight text-white" style={{ fontFamily: "var(--font-mono)" }}>FT</span>
                            ) : isLive ? (
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgb(239,68,68)]" />
                                        <span className="text-[10px] font-black tracking-[0.2em]">LIVE</span>
                                    </div>
                                    <span className="text-2xl font-black text-white tabular-nums">
                                        {liveMatches[fixture.matchNo]?.innings1.runs + (liveMatches[fixture.matchNo]?.innings2?.runs || 0)}
                                    </span>
                                </div>
                            ) : liveMatches[fixture.matchNo]?.status === "SCHEDULED" ? (
                                <div className="flex flex-col items-center gap-1">
                                    <Clock className="w-4 h-4 text-blue-400 mb-1" />
                                    <span className="text-xs font-black tracking-widest text-blue-400 uppercase">
                                        {formatScheduledTime(liveMatches[fixture.matchNo]?.scheduledTime)}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-sm font-black tracking-[0.5em] opacity-40">VS</span>
                            )}
                        </div>

                        {played && (
                            <div className="mt-3 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-700">
                                <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.3em] bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shadow-lg shadow-amber-500/5">
                                    {fixture.winner ? (
                                        fixture.winner === fixture.team1 ? `${fixture.team1} WON` : `${fixture.team2} WON`
                                    ) : (liveMatches[fixture.matchNo]?.result || "COMPLETED")}
                                </span>
                                {liveMatches[fixture.matchNo]?.result && (
                                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-2 px-4 italic text-center leading-relaxed">
                                        {liveMatches[fixture.matchNo].result}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Team 2 */}
                    <div className={`relative flex items-center gap-6 justify-start min-w-0 transition-opacity ${played && !win2 ? "opacity-20" : ""}`}>
                        {win2 && (
                            <div className="absolute left-0 w-4/5 h-full bg-gradient-to-r from-white/5 to-transparent blur-2xl" style={{ borderLeft: `2px solid ${c2}30`, backgroundImage: `linear-gradient(to right, ${c2}15, transparent)` }} />
                        )}
                        <div className={`relative z-10 rounded-full shrink-0 shadow-2xl ${isFeaturedKnockout ? 'w-8 h-8' : 'w-6 h-6'}`} style={{ backgroundColor: c2, border: `2px solid ${c2}40` }} />
                        <div className="flex flex-col items-start">
                            <span className={`${isFeaturedKnockout ? 'text-6xl tracking-widest' : 'text-5xl tracking-wide'} font-bold transition-colors py-2 px-1 relative z-10 leading-none truncate max-w-full`}
                                style={{
                                    fontFamily: "var(--font-display)",
                                    color: 'white',
                                    textShadow: win2 ? `0 0 30px ${c2}50` : "none"
                                }}>
                                {fixture.team2}
                            </span>
                             {played && liveMatches[fixture.matchNo] && (
                                <span className="text-zinc-500 font-mono text-xs mt-1 tracking-widest relative z-10">
                                    {liveMatches[fixture.matchNo].innings2.teamName === fixture.team2 ? 
                                        `${liveMatches[fixture.matchNo].innings2.runs}/${liveMatches[fixture.matchNo].innings2.wickets}` : 
                                        `${liveMatches[fixture.matchNo].innings1.runs}/${liveMatches[fixture.matchNo].innings1.wickets}`}
                                </span>
                            )}
                        </div>
                        {win2 && <Trophy className={`relative z-10 w-8 h-8 shrink-0 text-amber-400 drop-shadow-2xl ${isFeaturedKnockout ? 'w-10 h-10' : ''}`} strokeWidth={2.5} />}
                    </div>
                </div>

                {/* Desktop Link Indicaton Overlay */}
                {(played || isLive) && (
                    <div className="absolute top-4 right-4 text-zinc-800 group-hover:text-amber-500/40 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                )}
            </>
        );

        const targetHref = isLive ? "/live" : `/matches/${fixture.matchNo}`;
        const canView = played || isLive;

        return (
            <motion.div variants={itemVariants} key={fixture.matchNo}>
                {canView ? (
                    <Link href={targetHref} className={containerClasses}>
                        {InnerContent}
                        {/* Hover Indicator */}
                        <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors pointer-events-none flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                <span className="bg-amber-500 text-black text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-2xl">
                                    View Scorecard
                                </span>
                            </div>
                        </div>
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
                            {/* Knockout Stage - Only show if semi-finals are decided (teams don't contain "Group" or "Pool" or "Winner") */}
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
                                            .sort((a, b) => b.matchNo.localeCompare(a.matchNo)) // Final first, then SFs
                                            .map(fixture => renderFixture(fixture, true))}
                                    </div>
                                </div>
                            )}

                            {/* Group Matches & Pending Knockouts Schedule */}
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
                                            // Show it in result section only if it's NOT a resolved knockout (resolved knockouts go to the top section)
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
