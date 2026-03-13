"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { LiveMatchState } from "@/lib/tournament";

interface ScorecardProps {
    innings: LiveMatchState["innings1"];
    inningsNum: number;
    teamColor: string;
    winnerName?: string | null;
    isLive?: boolean;
}

export function Scorecard({ innings, inningsNum, teamColor, winnerName, isLive }: ScorecardProps) {
    const batsmen = Object.values(innings.batsmen);
    const bowlers = Object.values(innings.bowlers);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: inningsNum * 0.15 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm"
        >
            {/* Innings Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between"
                style={{ background: `linear-gradient(135deg, ${teamColor}15, transparent)` }}>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: teamColor }} />
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-lg tracking-wide leading-none uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                            {innings.teamName}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase mt-1">
                            {inningsNum === 1 ? 'FIRST' : 'SECOND'} INNINGS
                        </span>
                    </div>
                    {winnerName === innings.teamName && (
                        <Trophy className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                    )}
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                        {innings.runs}<span className="text-zinc-500 text-xl font-medium">/{innings.wickets}</span>
                    </span>
                    <span className="text-zinc-500 text-xs ml-2 tracking-wider font-bold">
                        ({innings.overs.toFixed(1)} ov)
                    </span>
                </div>
            </div>

            {/* Batting Table */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[480px] whitespace-nowrap">
                    <thead>
                        <tr className="bg-black/40 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                            <th className="px-6 py-3">Batter</th>
                            <th className="px-6 py-3 text-right">R</th>
                            <th className="px-6 py-3 text-right">B</th>
                            <th className="px-6 py-3 text-right">4s</th>
                            <th className="px-6 py-3 text-right">6s</th>
                            <th className="px-6 py-3 text-right">SR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {batsmen.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-zinc-600 italic font-medium uppercase tracking-widest">Yet to bat</td>
                            </tr>
                        ) : (
                            batsmen.map((b, i) => (
                                <tr key={i} className={`transition-colors ${b.isOut ? 'text-zinc-600' : 'text-zinc-100'}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold uppercase tracking-tight ${!b.isOut ? 'text-white' : ''}`}>{b.name}</span>
                                                {!b.isOut && (b.name === innings.strikerRef || b.name === innings.nonStrikerRef) && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                )}
                                            </div>
                                            {b.isOut && (
                                                <span className="text-[10px] text-zinc-500 font-medium italic mt-0.5">
                                                    {b.dismissal || "out"}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-amber-500 text-sm tabular-nums">{b.runs}</td>
                                    <td className="px-6 py-4 text-right font-bold tabular-nums">{b.balls}</td>
                                    <td className="px-6 py-4 text-right font-bold tabular-nums">{b.fours}</td>
                                    <td className="px-6 py-4 text-right font-bold tabular-nums">{b.sixes}</td>
                                    <td className="px-6 py-4 text-right tabular-nums font-black text-zinc-500">
                                        {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bowling Table */}
            <div className="border-t border-zinc-800 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[480px] whitespace-nowrap">
                    <thead>
                        <tr className="bg-black/40 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                            <th className="px-6 py-3">Bowler</th>
                            <th className="px-6 py-3 text-right">O</th>
                            <th className="px-6 py-3 text-right">M</th>
                            <th className="px-6 py-3 text-right">R</th>
                            <th className="px-6 py-3 text-right">W</th>
                            <th className="px-6 py-3 text-right">Econ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {bowlers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-zinc-600 italic font-medium uppercase tracking-widest">Yet to bowl</td>
                            </tr>
                        ) : (
                            bowlers.map((bw, i) => (
                                <tr key={i} className="text-zinc-200 transition-colors">
                                    <td className="px-6 py-4 font-bold uppercase tracking-tight">{bw.name}</td>
                                    <td className="px-6 py-4 text-right font-black text-white tabular-nums">{bw.overs.toFixed(1)}</td>
                                    <td className="px-6 py-4 text-right font-bold tabular-nums">{bw.maidens || 0}</td>
                                    <td className="px-6 py-4 text-right font-bold tabular-nums">{bw.runs}</td>
                                    <td className="px-6 py-4 text-right font-black text-blue-400 text-sm tabular-nums">{bw.wickets}</td>
                                    <td className="px-6 py-4 text-right tabular-nums font-black text-zinc-500">
                                        {bw.overs > 0 ? (bw.runs / (Math.floor(bw.overs) + (Math.round((bw.overs % 1) * 10)) / 6)).toFixed(2) : '0.00'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
