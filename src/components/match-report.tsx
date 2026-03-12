"use client";

import React from "react";
import { LiveMatchState, Team } from "@/lib/tournament";
import { Trophy, Users, Zap, ShieldCheck } from "lucide-react";

interface MatchReportProps {
    state: LiveMatchState;
    teams: Team[];
}

export function MatchReport({ state, teams }: MatchReportProps) {
    const getTeamColor = (name: string) => teams.find(t => t.teamName === name)?.color || "#EAB308";

    const inn1 = state.innings1;
    const inn2 = state.innings2;

    const findMVP = () => {
        // Simple MVP logic: Most runs + (wickets * 20)
        const players: Record<string, number> = {};

        [inn1, inn2].forEach(inn => {
            Object.values(inn.batsmen).forEach(b => {
                players[b.name] = (players[b.name] || 0) + b.runs;
            });
            Object.values(inn.bowlers).forEach(b => {
                players[b.name] = (players[b.name] || 0) + (b.wickets * 20);
            });
        });

        let best = { name: "N/A", score: 0 };
        Object.entries(players).forEach(([name, score]) => {
            if (score > best.score) best = { name, score };
        });
        return best.name;
    };

    const mvp = findMVP();

    return (
        <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-8 max-w-2xl mx-auto space-y-8 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* HEADER */}
            <div className="text-center space-y-2 border-b border-white/5 pb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-amber-500" />
                    <span className="text-[10px] tracking-[0.5em] text-zinc-500 font-bold uppercase">Match Official Report</span>
                </div>
                <h1 className="text-4xl font-bold text-white tracking-widest uppercase italic" style={{ fontFamily: "var(--font-heading)" }}>
                    {inn1.teamName} <span className="text-zinc-700 not-italic mx-2">VS</span> {inn2.teamName}
                </h1>
                <p className="text-amber-500 text-sm font-bold tracking-widest uppercase py-2 px-4 bg-amber-500/10 rounded-full inline-block mt-4">
                    {state.result}
                </p>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/5 p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">Toss</span>
                    <p className="text-xs text-white font-bold">{state.tossWinner} ({state.tossDecision})</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">Match Format</span>
                    <p className="text-xs text-white font-bold">{state.matchOvers} Overs</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl space-y-1 border border-amber-500/20">
                    <span className="text-[9px] text-amber-500/50 uppercase tracking-widest block font-bold">Match MVP</span>
                    <p className="text-xs text-amber-500 font-bold">{mvp}</p>
                </div>
            </div>

            {/* INNINGS BREAKDOWN */}
            <div className="space-y-6">
                {[inn1, inn2].map((inn, idx) => {
                    const topBatsman = Object.values(inn.batsmen).sort((a, b) => b.runs - a.runs)[0];
                    const topBowler = Object.values(inn.bowlers).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];

                    return (
                        <div key={idx} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-zinc-400 tracking-[0.3em] uppercase">
                                    Innings {idx + 1}: {inn.teamName}
                                </h3>
                                <span className="text-lg font-bold text-white tracking-widest font-mono">
                                    {inn.runs}/{inn.wickets} <span className="text-xs text-zinc-600 font-normal">({inn.overs} Ov)</span>
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Top Batsman</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm text-white font-bold">{topBatsman?.name || "-"}</span>
                                        <span className="text-xs text-amber-500 font-mono font-bold">{topBatsman?.runs || 0} ({topBatsman?.balls || 0})</span>
                                    </div>
                                </div>
                                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Zap className="w-3.5 h-3.5 text-zinc-500" />
                                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Top Bowler</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm text-white font-bold">{topBowler?.name || "-"}</span>
                                        <span className="text-xs text-blue-500 font-mono font-bold">{topBowler?.wickets || 0}/{topBowler?.runs || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* FOOTER */}
            <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Verified by VPL Scoring Engine</span>
                </div>
                <p className="text-[9px] text-zinc-700 font-mono">
                    {new Date(state.timeline[state.timeline.length - 1]?.timestamp || Date.now()).toLocaleString()}
                </p>
            </div>
        </div>
    );
}
