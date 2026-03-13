"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type Fixture, type Team, type LiveMatchState } from "@/lib/tournament";
import { ArrowLeft, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
    matchId: string;
    fixture: Fixture | null;
    teams: Team[];
}

export default function MatchReportClient({ matchId, fixture, teams }: Props) {
    const [matchState, setMatchState] = useState<LiveMatchState | null>(null);
    const [loading, setLoading] = useState(true);

    const colorOf = (name?: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";

    useEffect(() => {
        const fetchMatchState = async () => {
            try {
                const res = await fetch(`/api/live-score?matchId=${matchId}`);
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
    const winnerName = matchState?.winner || fixture?.winner || null;

    const renderInningsScorecard = (innings: LiveMatchState["innings1"], inningsNum: number) => {
        const batsmen = Object.values(innings.batsmen);
        const bowlers = Object.values(innings.bowlers);

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: inningsNum * 0.15 }}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden"
            >
                {/* Innings Header */}
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between"
                    style={{ background: `linear-gradient(135deg, ${colorOf(innings.teamName)}10, transparent)` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorOf(innings.teamName) }} />
                        <span className="text-white font-bold text-lg tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                            {innings.teamName}
                        </span>
                        {winnerName === innings.teamName && (
                            <Trophy className="w-4 h-4 text-amber-400" />
                        )}
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                            {innings.runs}<span className="text-zinc-500 text-xl">-{innings.wickets}</span>
                        </span>
                        <span className="text-zinc-500 text-xs ml-2 tracking-wider">
                            ({innings.overs.toFixed(1)} ov)
                        </span>
                    </div>
                </div>

                {/* Batting Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[480px]">
                        <thead>
                            <tr className="bg-zinc-900 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                                <th className="px-4 py-2.5">Batter</th>
                                <th className="px-4 py-2.5 text-right">R</th>
                                <th className="px-4 py-2.5 text-right">B</th>
                                <th className="px-4 py-2.5 text-right">4s</th>
                                <th className="px-4 py-2.5 text-right">6s</th>
                                <th className="px-4 py-2.5 text-right">SR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {batsmen.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-4 text-center text-zinc-600 italic">Yet to bat</td>
                                </tr>
                            ) : (
                                batsmen.map((b, i) => (
                                    <tr key={i} className={b.isOut ? 'text-zinc-600' : 'text-zinc-300'}>
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-white">{b.name}</span>
                                                    {!b.isOut && (b.name === innings.strikerRef || b.name === innings.nonStrikerRef) && (
                                                        <span className="text-amber-500 italic font-bold text-[10px]">*</span>
                                                    )}
                                                </div>
                                                {b.isOut && (
                                                    <span className="text-[10px] text-zinc-500 font-medium italic mt-0.5">
                                                        {b.dismissal || "out"}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-white">{b.runs}</td>
                                        <td className="px-4 py-3 text-right">{b.balls}</td>
                                        <td className="px-4 py-3 text-right">{b.fours}</td>
                                        <td className="px-4 py-3 text-right">{b.sixes}</td>
                                        <td className="px-4 py-3 text-right tabular-nums opacity-60 font-mono">
                                            {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Bowling Table */}
                <div className="border-t border-zinc-800 overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[480px]">
                        <thead>
                            <tr className="bg-zinc-900 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                                <th className="px-4 py-2.5">Bowler</th>
                                <th className="px-4 py-2.5 text-right">O</th>
                                <th className="px-4 py-2.5 text-right">M</th>
                                <th className="px-4 py-2.5 text-right">R</th>
                                <th className="px-4 py-2.5 text-right">W</th>
                                <th className="px-4 py-2.5 text-right">Econ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {bowlers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-4 text-center text-zinc-600 italic">Yet to bowl</td>
                                </tr>
                            ) : (
                                bowlers.map((bw, i) => (
                                    <tr key={i} className="text-zinc-300">
                                        <td className="px-4 py-3 font-medium">{bw.name}</td>
                                        <td className="px-4 py-3 text-right font-bold text-white">{bw.overs.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-right">{bw.maidens || 0}</td>
                                        <td className="px-4 py-3 text-right">{bw.runs}</td>
                                        <td className="px-4 py-3 text-right font-bold text-blue-400">{bw.wickets}</td>
                                        <td className="px-4 py-3 text-right tabular-nums opacity-60 font-mono">
                                            {bw.overs > 0 ? (bw.runs / bw.overs).toFixed(2) : '0.00'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        );
    };

    return (
        <main className="min-h-screen pt-28 pb-16 px-4 md:pt-32">
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
                                    {matchState?.result || (fixture?.winner === "TIE" ? "Match Tied" : fixture?.winner === "ABANDONED" ? "Match Abandoned" : `${fixture?.winner} Won`)}
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>

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
