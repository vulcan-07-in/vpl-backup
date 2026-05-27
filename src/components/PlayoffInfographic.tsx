"use client";

import { motion } from "framer-motion";
import { Info, Trophy, Swords, Crown, Skull } from "lucide-react";
import type { Fixture, PlayoffRank } from "@/lib/tournament";

export default function PlayoffInfographic({
    fixtures = [],
    ranks = [],
    isGroupStageComplete = false,
    liveStates = {},
}: {
    fixtures?: Fixture[];
    ranks?: PlayoffRank[];
    isGroupStageComplete?: boolean;
    liveStates?: Record<string, any>;
}) {
    const getRankTeam = (r: number) => {
        if (!isGroupStageComplete) return `Rank ${r}`;
        const team = ranks.find(x => x.rank === r)?.team;
        return team || `Rank ${r}`;
    };

    const getMatchTeam = (stage: string, teamNum: 1 | 2, fallback: string) => {
        const f = fixtures.find(x => x.stage === stage);
        if (!f) return { name: fallback, isLoser: false, isWinner: false };
        const name = teamNum === 1 ? f.team1 : f.team2;
        if (!name || name === "TBD" || name.startsWith("Rank") || name.includes("Winner") || name.includes("Loser")) {
            return { name: fallback, isLoser: false, isWinner: false };
        }
        
        const isCompleted = !!f.winner && f.winner !== "TBD";
        
        let isWinner = false;
        let isLoser = false;
        
        if (isCompleted) {
            const normalize = (s: string) => String(s || "").trim().toLowerCase();
            const nName = normalize(name);
            const nWinner = normalize(f.winner);
            
            if (nWinner === "tie" || nWinner === "abandoned") {
                isWinner = false;
                isLoser = false;
            } else if (nWinner.includes(nName) || nName.includes(nWinner.split(" won by")[0].trim())) {
                isWinner = true;
                isLoser = false;
            } else {
                isWinner = false;
                isLoser = true;
            }
        }
        
        return { name, isLoser, isWinner };
    };

    const getMatchBoxProps = (stage: string, fallbackT1: string, fallbackT2: string, color: 'red' | 'amber') => {
        const t1 = getMatchTeam(stage, 1, fallbackT1);
        const t2 = getMatchTeam(stage, 2, fallbackT2);
        const f = fixtures.find(x => x.stage === stage);
        const cleanId = f ? String(f.matchNo).trim().replace(/[^A-Za-z0-9]/g, '').toLowerCase() : '';
        const isLive = f ? (liveStates[cleanId]?.status === "LIVE" || liveStates[f.matchNo]?.status === "LIVE") : false;
        const isCompleted = !!f?.winner && f.winner !== "TBD";
        return { title: stage, t1, t2, color, isLive, isCompleted };
    };

    const e1 = getMatchBoxProps("Eliminator 1", getRankTeam(1), getRankTeam(6), "red");
    const e2 = getMatchBoxProps("Eliminator 2", getRankTeam(2), getRankTeam(5), "red");
    const e3 = getMatchBoxProps("Eliminator 3", getRankTeam(3), getRankTeam(4), "red");
    const q1 = getMatchBoxProps("Qualifier 1", "1st Ranked", "2nd Ranked", "amber");
    const q2 = getMatchBoxProps("Qualifier 2", "Q1 Loser", "3rd Ranked", "amber");

    const finalMatch = fixtures.find(x => x.stage === "Final");
    const fT1 = finalMatch?.team1 && finalMatch.team1 !== "TBD" && !finalMatch.team1.includes("Winner") ? finalMatch.team1 : "Q1 Winner";
    const fT2 = finalMatch?.team2 && finalMatch.team2 !== "TBD" && !finalMatch.team2.includes("Winner") ? finalMatch.team2 : "Q2 Winner";
    const finalIsLive = finalMatch ? (liveStates[String(finalMatch.matchNo).trim().replace(/[^A-Za-z0-9]/g, '').toLowerCase()]?.status === "LIVE" || liveStates[finalMatch.matchNo]?.status === "LIVE") : false;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-16 w-full"
        >
            <div className="flex items-center gap-4 mb-8">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
                    <Info size={12} className="text-amber-500" />
                    Playoff Bracket
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            {/* Phase 1: Eliminators */}
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <Skull size={14} className="text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-red-400 uppercase tracking-[0.3em]">Eliminators</h3>
                        <p className="text-[10px] text-zinc-500 tracking-wider">Lose and you&apos;re out</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MatchCard {...e1} />
                    <MatchCard {...e2} />
                    <MatchCard {...e3} />
                </div>
            </div>

            {/* Phase 2: Re-Ranking */}
            <div className="mb-12">
                <div className="flex items-center justify-center">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                    <div className="mx-6 bg-zinc-900 border border-zinc-700 rounded-full px-5 py-2 flex items-center gap-3">
                        <span className="text-[10px] text-zinc-400 font-bold tracking-[0.2em] uppercase">3 Winners Re-Ranked</span>
                        <span className="text-[9px] text-amber-500/60 font-mono">PTS → NRR</span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                </div>
            </div>

            {/* Phase 3: Qualifiers */}
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Swords size={14} className="text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-amber-400 uppercase tracking-[0.3em]">Qualifiers</h3>
                        <p className="text-[10px] text-zinc-500 tracking-wider">Road to the final</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <MatchCard {...q1} />
                        <p className="text-[9px] text-center text-zinc-600 mt-2 uppercase tracking-widest">Q1 Loser → Q2</p>
                    </div>
                    <MatchCard {...q2} />
                </div>
            </div>

            {/* Phase 4: The Final */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                        <Crown size={14} className="text-amber-300" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-amber-300 uppercase tracking-[0.3em]">Championship Final</h3>
                        <p className="text-[10px] text-zinc-500 tracking-wider">For the title</p>
                    </div>
                </div>
                <div className={`relative bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-950 border-2 ${finalMatch?.winner ? 'border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.15)]' : 'border-amber-500/30'} rounded-2xl p-6 md:p-8 max-w-lg mx-auto overflow-hidden`}>
                    {finalIsLive && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[9px] font-black text-red-500 tracking-widest">LIVE</span>
                        </div>
                    )}
                    <div className="text-[10px] text-amber-500 uppercase tracking-[0.3em] font-black mb-5 text-center">THE FINAL</div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`flex-1 bg-black/60 rounded-xl px-4 py-3 text-center border ${finalMatch?.winner === fT1 ? 'border-amber-400 text-amber-400 bg-amber-950/30' : finalMatch?.winner && finalMatch.winner !== fT1 ? 'border-zinc-800 opacity-40 line-through' : 'border-white/10'}`}>
                            <span className="text-sm font-bold tracking-wide">{fT1}</span>
                        </div>
                        <div className="text-xs font-black text-amber-500/50 tracking-widest shrink-0">VS</div>
                        <div className={`flex-1 bg-black/60 rounded-xl px-4 py-3 text-center border ${finalMatch?.winner === fT2 ? 'border-amber-400 text-amber-400 bg-amber-950/30' : finalMatch?.winner && finalMatch.winner !== fT2 ? 'border-zinc-800 opacity-40 line-through' : 'border-white/10'}`}>
                            <span className="text-sm font-bold tracking-wide">{fT2}</span>
                        </div>
                    </div>
                    
                    {finalMatch?.winner && finalMatch.winner !== "TIE" && (
                        <div className="mt-5 flex items-center justify-center gap-2">
                            <Trophy size={14} className="text-amber-400" />
                            <span className="text-sm font-black text-amber-400 tracking-widest uppercase animate-pulse">{finalMatch.winner} — Champions</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function MatchCard({ title, t1, t2, color, isLive, isCompleted }: {
    title: string;
    t1: { name: string; isWinner: boolean; isLoser: boolean };
    t2: { name: string; isWinner: boolean; isLoser: boolean };
    color: 'red' | 'amber';
    isLive: boolean;
    isCompleted: boolean;
}) {
    const accent = color === 'red' ? {
        border: isLive ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-red-500/20',
        bg: 'bg-red-950/20',
        title: 'text-red-400',
        dot: 'bg-red-500',
    } : {
        border: isLive ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-amber-500/20',
        bg: 'bg-amber-950/20',
        title: 'text-amber-400',
        dot: 'bg-amber-500',
    };

    return (
        <div className={`relative ${accent.bg} border ${accent.border} rounded-2xl p-4 transition-all ${isLive ? 'ring-1 ring-red-500/30' : ''}`}>
            {isLive && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-red-500 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full shadow-lg animate-pulse uppercase">
                    <span className="w-1 h-1 rounded-full bg-white" />
                    Live
                </div>
            )}
            {isCompleted && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-zinc-700 text-zinc-300 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full shadow-lg uppercase">
                    Done
                </div>
            )}
            <div className={`text-[10px] ${accent.title} uppercase tracking-[0.2em] font-bold mb-3 text-center`}>{title}</div>
            <div className="flex flex-col gap-2">
                <TeamSlot name={t1.name} isWinner={t1.isWinner} isLoser={t1.isLoser} />
                <div className="text-center text-[9px] text-zinc-600 font-bold tracking-widest">VS</div>
                <TeamSlot name={t2.name} isWinner={t2.isWinner} isLoser={t2.isLoser} />
            </div>
        </div>
    );
}

function TeamSlot({ name, isWinner, isLoser }: { name: string; isWinner: boolean; isLoser: boolean }) {
    return (
        <div className={`bg-black/50 rounded-lg px-3 py-2.5 text-center border transition-all ${
            isWinner ? 'border-amber-500/50 text-amber-400 font-bold bg-amber-950/30' 
            : isLoser ? 'border-zinc-800 opacity-40 line-through text-zinc-500' 
            : 'border-white/10 text-zinc-200'
        }`}>
            <span className="text-xs font-mono tracking-wide">{name}</span>
        </div>
    );
}
