"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import type { Fixture, PlayoffRank } from "@/lib/tournament";

export default function PlayoffInfographic({
    fixtures = [],
    ranks = [],
    isGroupStageComplete = false,
}: {
    fixtures?: Fixture[];
    ranks?: PlayoffRank[];
    isGroupStageComplete?: boolean;
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
            // Highly robust matching to detect if this team won
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
        return { title: stage, t1, t2, color, isLive: f && !f.winner && f.team1 && f.team2 && f.team1 !== "TBD" && f.team2 !== "TBD" && !f.team1.includes("Rank") };
    };

    const e1 = getMatchBoxProps("Eliminator 1", getRankTeam(1), getRankTeam(6), "red");
    const e2 = getMatchBoxProps("Eliminator 2", getRankTeam(2), getRankTeam(5), "red");
    const e3 = getMatchBoxProps("Eliminator 3", getRankTeam(3), getRankTeam(4), "red");
    const q1 = getMatchBoxProps("Qualifier 1", "1st Ranked", "2nd Ranked", "amber");
    const q2 = getMatchBoxProps("Qualifier 2", "Q1 Loser", "3rd Ranked", "amber");

    // Check final
    const finalMatch = fixtures.find(x => x.stage === "Final");
    const fT1 = finalMatch?.team1 && finalMatch.team1 !== "TBD" && !finalMatch.team1.includes("Winner") ? finalMatch.team1 : "Q1 Winner";
    const fT2 = finalMatch?.team2 && finalMatch.team2 !== "TBD" && !finalMatch.team2.includes("Winner") ? finalMatch.team2 : "Q2 Winner";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-16 w-full overflow-x-auto pb-6 scrollbar-hide"
        >
            <div className="flex items-center gap-4 mb-8 min-w-[800px]">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
                    <Info size={12} className="text-amber-500" />
                    Playoff Structure Diagram
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            <div className="md:hidden flex items-center justify-center gap-2 mb-4 text-[10px] text-amber-500/70 tracking-widest uppercase animate-pulse">
                <span>Swipe to view full bracket</span>
                <span>→</span>
            </div>

            {/* Desktop Bracket Diagram Container */}
            <div className="min-w-[850px] bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative shadow-2xl flex items-center justify-between">
                
                {/* Stage 1: Qualification Ranks */}
                <div className="flex flex-col gap-6 relative z-10 w-[140px]">
                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest text-center mb-2">Qualifications</div>
                    <RankBox rank={1} name={getRankTeam(1)} />
                    <RankBox rank={6} name={getRankTeam(6)} />
                    
                    <div className="h-4" /> {/* Spacer */}
                    
                    <RankBox rank={2} name={getRankTeam(2)} />
                    <RankBox rank={5} name={getRankTeam(5)} />

                    <div className="h-4" /> {/* Spacer */}
                    
                    <RankBox rank={3} name={getRankTeam(3)} />
                    <RankBox rank={4} name={getRankTeam(4)} />
                </div>

                {/* SVG Connecting Lines (Layered behind boxes) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    {/* E1 Lines */}
                    <path d="M 160 115 C 200 115, 200 142.5, 240 142.5" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="2" />
                    <path d="M 160 170 C 200 170, 200 142.5, 240 142.5" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="2" />
                    
                    {/* E2 Lines */}
                    <path d="M 160 240 C 200 240, 200 267.5, 240 267.5" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="2" />
                    <path d="M 160 295 C 200 295, 200 267.5, 240 267.5" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="2" />

                    {/* E3 Lines */}
                    <path d="M 160 365 C 200 365, 200 392.5, 240 392.5" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="2" />
                    <path d="M 160 420 C 200 420, 200 392.5, 240 392.5" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="2" />

                    {/* Re-ranking convergence (Dotted lines from E1, E2, E3 to Re-Ranking) */}
                    <path d="M 390 142.5 C 440 142.5, 430 267.5, 470 267.5" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 390 267.5 L 470 267.5" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 390 392.5 C 440 392.5, 430 267.5, 470 267.5" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" strokeDasharray="4 4" />

                    {/* Qualifiers Lines */}
                    <path d="M 610 200 C 650 200, 650 240, 690 240" fill="none" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="2" />
                    <path d="M 610 335 C 650 335, 650 280, 690 280" fill="none" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="2" />
                    <path d="M 540 230 C 540 335, 470 335, 470 335" fill="none" stroke="rgba(255, 50, 50, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
                </svg>

                {/* Stage 2: Eliminators */}
                <div className="flex flex-col gap-10 relative z-10 w-[150px] mt-6">
                    <div className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mb-[-10px] absolute -top-8 w-full">Eliminators</div>
                    <MatchBox {...e1} />
                    <MatchBox {...e2} />
                    <MatchBox {...e3} />
                </div>

                {/* Stage 3: Re-Ranking */}
                <div className="flex flex-col relative z-10 w-[140px] items-center justify-center h-full mt-6">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center mb-4">Tiebreaker Re-Ranking</div>
                    <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 text-center shadow-lg">
                        <div className="text-xs text-white font-mono mb-2">1. Highest Points</div>
                        <div className="text-xs text-white font-mono">2. Highest NRR</div>
                        <div className="mt-3 text-[9px] text-zinc-500 uppercase">3 Winners Ranked</div>
                    </div>
                </div>

                {/* Stage 4: Qualifiers */}
                <div className="flex flex-col gap-[75px] relative z-10 w-[150px] mt-6">
                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest text-center mb-[-60px] absolute -top-8 w-full">Qualifiers</div>
                    
                    <div className="mt-2">
                        <MatchBox {...q1} />
                        <div className="text-[9px] text-center text-zinc-500 mt-2 uppercase tracking-widest">Loser falls to Q2</div>
                    </div>
                    
                    <div>
                        <MatchBox {...q2} />
                    </div>
                </div>

                {/* Stage 5: Final */}
                <div className="flex flex-col relative z-10 w-[150px] items-center justify-center mt-6">
                    <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest text-center mb-4 absolute -top-8 w-full">Championship</div>
                    <div className={`bg-gradient-to-br from-amber-500/20 to-black border ${finalMatch?.winner ? 'border-amber-400' : 'border-amber-500/50'} rounded-xl p-4 w-full shadow-[0_0_30px_rgba(245,158,11,0.15)] text-center relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 p-2 opacity-20"><TrophyIcon /></div>
                        <div className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mb-3 relative z-10">THE FINAL</div>
                        
                        <div className={`bg-black/60 rounded px-2 py-2 text-white font-mono text-xs border border-white/5 mb-1 relative z-10 ${finalMatch?.winner === fT1 ? 'ring-1 ring-amber-500 text-amber-400' : finalMatch?.winner && finalMatch.winner !== fT1 ? 'opacity-30 line-through' : ''}`}>{fT1}</div>
                        <div className="text-[10px] text-zinc-600 my-1 font-bold relative z-10">VS</div>
                        <div className={`bg-black/60 rounded px-2 py-2 text-white font-mono text-xs border border-white/5 relative z-10 ${finalMatch?.winner === fT2 ? 'ring-1 ring-amber-500 text-amber-400' : finalMatch?.winner && finalMatch.winner !== fT2 ? 'opacity-30 line-through' : ''}`}>{fT2}</div>
                        
                        {finalMatch?.winner && (
                            <div className="mt-3 text-[10px] text-amber-400 font-bold tracking-widest animate-pulse">{finalMatch.winner} WINS</div>
                        )}
                    </div>
                </div>

            </div>
        </motion.div>
    );
}

function RankBox({ rank, name }: { rank: number, name: string }) {
    return (
        <div className="bg-black border border-white/10 rounded-lg py-2.5 px-3 flex flex-col shadow-md text-center">
            <span className="text-zinc-500 text-[8px] uppercase tracking-widest mb-1">Rank {rank}</span>
            <span className="text-white font-bold text-xs truncate max-w-full" style={{ fontFamily: "var(--font-heading)" }}>{name}</span>
        </div>
    );
}

function MatchBox({ title, t1, t2, color, isLive }: any) {
    const borderColor = color === 'red' ? 'border-red-900/50' : 'border-amber-900/50';
    const bgColor = color === 'red' ? 'bg-red-950/20' : 'bg-amber-950/20';
    const titleColor = color === 'red' ? 'text-red-500' : 'text-amber-500';

    return (
        <div className={`border ${borderColor} ${bgColor} rounded-xl p-3 shadow-lg relative ${isLive ? 'ring-1 ring-red-500/50' : ''}`}>
            {isLive && <div className="absolute -top-2 -right-2 bg-red-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-pulse uppercase">Live</div>}
            <div className={`text-[9px] ${titleColor} uppercase tracking-widest font-bold mb-2 text-center truncate`}>{title}</div>
            <div className="flex flex-col gap-1">
                <div className={`bg-black/60 rounded px-2 py-1.5 text-white font-mono text-xs border border-white/5 text-center truncate ${t1.isWinner ? 'text-amber-400 font-bold' : t1.isLoser ? 'opacity-30 line-through' : ''}`}>
                    {t1.name}
                </div>
                <div className={`bg-black/60 rounded px-2 py-1.5 text-white font-mono text-xs border border-white/5 text-center truncate ${t2.isWinner ? 'text-amber-400 font-bold' : t2.isLoser ? 'opacity-30 line-through' : ''}`}>
                    {t2.name}
                </div>
            </div>
        </div>
    );
}

function TrophyIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
        </svg>
    );
}
