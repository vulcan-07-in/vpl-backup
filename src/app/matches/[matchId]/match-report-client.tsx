"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type Fixture, type Team, type LiveMatchState } from "@/lib/tournament";
import { ArrowLeft, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Scorecard } from "@/components/scorecard";
import { MatchOverOverlay } from "@/components/match-over-overlay";

interface Props {
    matchId: string;
    fixture: Fixture | null;
    teams: Team[];
}

export default function MatchReportClient({ matchId, fixture, teams }: Props) {
    const [matchState, setMatchState] = useState<LiveMatchState | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOverlay, setShowOverlay] = useState(true);

    const colorOf = (name?: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";

    useEffect(() => {
        const fetchMatchState = async () => {
            try {
                const res = await fetch(`/api/live-score?matchId=${encodeURIComponent(matchId)}`);
                if (res.ok) {
                    setMatchState(await res.json());
                }
            } catch (e) {
                console.error("Failed to fetch match state", e);
            }
            setLoading(false);
        };
        fetchMatchState();
    }, [matchId]);

    if (loading) {
        return (
            <main className="min-h-screen pt-32 pb-16 px-4 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent" />
            </main>
        );
    }

    if (!matchState && !fixture) {
        return (
            <main className="min-h-screen pt-32 pb-16 px-4 flex flex-col items-center justify-center text-center">
                <h2 className="text-3xl text-white font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                    MATCH NOT FOUND
                </h2>
                <p className="text-zinc-500 max-w-sm mb-8">
                    The requested match does not exist or has not been scored yet.
                </p>
                <Link href="/matches" className="text-amber-500 text-xs tracking-widest font-bold hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> BACK TO MATCHES
                </Link>
            </main>
        );
    }

    const c1 = colorOf(fixture?.team1);
    const c2 = colorOf(fixture?.team2);
    const isCompleted = matchState?.status === "COMPLETED" || !!fixture?.winner;
    let winnerName = matchState?.winner || fixture?.winner || null;
    
    // Fix winnerName if it's TBD
    if (winnerName && (winnerName === "TBD" || winnerName.startsWith("Rank") || winnerName.includes("Winner") || winnerName.includes("Loser"))) {
        if (matchState?.status === "COMPLETED") {
            const r1 = matchState.innings1.runs;
            const r2 = matchState.innings2.runs;
            if (r1 > r2) winnerName = fixture?.team1 || winnerName;
            else if (r2 > r1) winnerName = fixture?.team2 || winnerName;
        }
    }

    const renderInningsScorecard = (innings: LiveMatchState["innings1"], inningsNum: number) => {
        return (
            <Scorecard 
                innings={innings} 
                inningsNum={inningsNum} 
                teamColor={colorOf(innings.teamName)} 
                winnerName={winnerName}
            />
        );
    };

    const computeMVPStats = (state: LiveMatchState) => {
        let allBatsmen: any[] = [];
        let allBowlers: any[] = [];
        
        const extract = (innings: any) => {
            if (!innings) return;
            if (innings.batsmen) {
                Object.values(innings.batsmen).forEach((b: any) => allBatsmen.push(b));
            }
            if (innings.bowlers) {
                Object.values(innings.bowlers).forEach((b: any) => allBowlers.push(b));
            }
        };
        extract(state.innings1);
        extract(state.innings2);
        
        allBatsmen.sort((a, b) => b.runs - a.runs || a.balls - b.balls);
        allBowlers.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
        
        const topBatter = allBatsmen[0];
        const topBowler = allBowlers[0];
        
        let mvp = null;
        let maxPoints = -1;
        
        const playerStats = new Map();
        allBatsmen.forEach(b => playerStats.set(b.name, { runs: b.runs, name: b.name }));
        allBowlers.forEach(b => {
            const ext = playerStats.get(b.name) || { runs: 0, name: b.name };
            ext.wickets = b.wickets;
            ext.runsConceded = b.runs;
            playerStats.set(b.name, ext);
        });
        
        playerStats.forEach(p => {
            const pts = (p.runs || 0) + ((p.wickets || 0) * 20);
            if (pts > maxPoints) {
                maxPoints = pts;
                mvp = p;
            }
        });
        
        return { topBatter, topBowler, mvp };
    };

    const topPerformers = isCompleted && matchState ? computeMVPStats(matchState) : null;

    return (
        <main className="min-h-screen pt-28 pb-16 px-4 md:pt-32">
            <AnimatePresence>
                {showOverlay && matchState?.status === "COMPLETED" && (
                    <MatchOverOverlay 
                        result={matchState.result || ""}
                        innings1={matchState.innings1}
                        innings2={matchState.innings2}
                        winnerColor={matchState.winner ? colorOf(matchState.winner) : "#EAB308"}
                        onShowScorecard={() => setShowOverlay(false)}
                    />
                )}
            </AnimatePresence>

            <div className="max-w-3xl mx-auto">
                {/* Back Navigation */}
                <Link href="/matches" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 text-xs tracking-widest font-bold">
                    <ArrowLeft className="w-4 h-4" /> ALL MATCHES
                </Link>

                {/* Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8"
                >
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ background: `linear-gradient(110deg, ${c1} 0%, transparent 40%, transparent 60%, ${c2} 100%)` }} />

                    <div className="relative z-10 p-8 md:p-12 text-center">
                        <p className="text-[10px] tracking-[0.5em] text-zinc-500 font-bold mb-6 uppercase"
                            style={{ fontFamily: "var(--font-body)" }}>
                            {fixture?.group === "-" ? fixture.stage?.toUpperCase() : `GROUP ${fixture?.group}`} · MATCH {matchId}
                        </p>

                        <div className="flex items-center justify-center gap-6 md:gap-12 mb-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: c1 }} />
                                <span className={`text-2xl md:text-4xl font-bold tracking-wide ${winnerName && winnerName !== fixture?.team1 ? 'opacity-40' : 'text-white'}`}
                                    style={{ fontFamily: "var(--font-display)" }}>
                                    {fixture?.team1}
                                </span>
                                {matchState?.innings1 && (
                                    <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                                        {matchState.innings1.runs}-{matchState.innings1.wickets}
                                        <span className="text-zinc-500 text-sm ml-1">({matchState.innings1.overs.toFixed(1)})</span>
                                    </span>
                                )}
                                {winnerName === fixture?.team1 && <Trophy className="w-5 h-5 text-amber-400" />}
                            </div>

                            <div className="flex flex-col items-center">
                                <span className={`text-[10px] font-bold tracking-widest px-3 py-1 rounded border ${isCompleted ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-zinc-500 border-zinc-700 bg-zinc-900'}`}>
                                    {isCompleted ? "FULL TIME" : matchState?.status?.toUpperCase() || "VS"}
                                </span>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: c2 }} />
                                <span className={`text-2xl md:text-4xl font-bold tracking-wide ${winnerName && winnerName !== fixture?.team2 ? 'opacity-40' : 'text-white'}`}
                                    style={{ fontFamily: "var(--font-display)" }}>
                                    {fixture?.team2}
                                </span>
                                {matchState?.innings2 && (
                                    <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                                        {matchState.innings2.runs}-{matchState.innings2.wickets}
                                        <span className="text-zinc-500 text-sm ml-1">({matchState.innings2.overs.toFixed(1)})</span>
                                    </span>
                                )}
                                {winnerName === fixture?.team2 && <Trophy className="w-5 h-5 text-amber-400" />}
                            </div>
                        </div>

                        {/* Result String */}
                        {(matchState?.result || fixture?.winner) && (
                            <div className="mt-4">
                                <span className="text-xs text-amber-500/80 font-bold uppercase tracking-[0.3em]"
                                    style={{ fontFamily: "var(--font-body)" }}>
                                    {(() => {
                                        let resultStr = matchState?.result || (fixture?.winner === "TIE" ? "Match Tied" : fixture?.winner === "ABANDONED" ? "Match Abandoned" : `${fixture?.winner} Won`);
                                        if (resultStr && (resultStr.startsWith("TBD won") || resultStr.startsWith("Rank") || resultStr.includes("Winner") || resultStr.includes("Loser"))) {
                                            if (matchState?.status === "COMPLETED") {
                                                const r1 = matchState.innings1.runs;
                                                const r2 = matchState.innings2.runs;
                                                let actualWinner = null;
                                                if (r1 > r2) actualWinner = fixture?.team1;
                                                else if (r2 > r1) actualWinner = fixture?.team2;
                                                
                                                if (actualWinner && actualWinner !== "TBD") {
                                                    const wonByIndex = resultStr.indexOf(" won by");
                                                    if (wonByIndex !== -1) {
                                                        resultStr = `${actualWinner}${resultStr.substring(wonByIndex)}`;
                                                    }
                                                }
                                            }
                                        }
                                        return resultStr;
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Top Performers */}
                {topPerformers && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8 p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-amber-500/10 via-black to-zinc-900/50 border border-amber-500/20 shadow-2xl backdrop-blur-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
                        <div className="flex items-center justify-center gap-3 mb-8 relative z-10">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <h3 className="text-xs tracking-[0.4em] text-amber-500 font-bold uppercase" style={{fontFamily: "var(--font-body)"}}>Match Performers</h3>
                            <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center relative z-10">
                            {topPerformers.mvp && (
                                <div className="bg-black/60 rounded-2xl p-5 border border-amber-500/10 hover:border-amber-500/40 transition-colors shadow-inner flex flex-col items-center justify-center">
                                    <p className="text-[10px] text-amber-500/60 tracking-widest uppercase mb-2 font-bold">MVP</p>
                                    <p className="text-xl font-bold text-white mb-2" style={{fontFamily: "var(--font-heading)"}}>{topPerformers.mvp.name}</p>
                                    <div className="flex gap-2 text-xs font-mono">
                                        <span className="text-emerald-400">{topPerformers.mvp.runs} R</span>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-amber-400">{topPerformers.mvp.wickets || 0} W</span>
                                    </div>
                                </div>
                            )}
                            {topPerformers.topBatter && (
                                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 hover:border-white/20 transition-colors shadow-inner flex flex-col items-center justify-center">
                                    <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-2">Top Scorer</p>
                                    <p className="text-lg font-bold text-zinc-200 mb-2" style={{fontFamily: "var(--font-heading)"}}>{topPerformers.topBatter.name}</p>
                                    <div className="flex gap-2 text-xs font-mono">
                                        <span className="text-emerald-400">{topPerformers.topBatter.runs}</span>
                                        <span className="text-zinc-500">({topPerformers.topBatter.balls})</span>
                                    </div>
                                </div>
                            )}
                            {topPerformers.topBowler && (
                                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 hover:border-white/20 transition-colors shadow-inner flex flex-col items-center justify-center">
                                    <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-2">Best Bowler</p>
                                    <p className="text-lg font-bold text-zinc-200 mb-2" style={{fontFamily: "var(--font-heading)"}}>{topPerformers.topBowler.name}</p>
                                    <div className="flex gap-2 text-xs font-mono">
                                        <span className="text-amber-400">{topPerformers.topBowler.wickets}/{topPerformers.topBowler.runs}</span>
                                        <span className="text-zinc-500">({topPerformers.topBowler.overs} O)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Scorecards */}
                {matchState ? (
                    <div className="space-y-6">
                        <h3 className="text-xs tracking-[0.4em] text-zinc-600 font-bold uppercase mb-2">SCORECARD</h3>
                        {renderInningsScorecard(matchState.innings1, 1)}
                        {(matchState.currentInnings === 2 || matchState.status === "COMPLETED") && (
                            renderInningsScorecard(matchState.innings2, 2)
                        )}
                    </div>
                ) : (
                    <div className="py-16 text-center">
                        <p className="text-zinc-600 text-xs tracking-widest">
                            {fixture?.winner ? "SCORECARD DATA UNAVAILABLE — Match result was recorded without live scoring." : "THIS MATCH HAS NOT BEEN SCORED YET"}
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
