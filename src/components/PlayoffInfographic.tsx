"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";

export default function PlayoffInfographic() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-16 w-full overflow-x-auto pb-6"
        >
            <div className="flex items-center gap-4 mb-8 min-w-[800px]">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
                    <Info size={12} className="text-amber-500" />
                    Playoff Structure Diagram
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            {/* Desktop Bracket Diagram Container */}
            <div className="min-w-[850px] bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative shadow-2xl flex items-center justify-between">
                
                {/* Stage 1: Qualification Ranks */}
                <div className="flex flex-col gap-6 relative z-10 w-[140px]">
                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest text-center mb-2">Qualifications</div>
                    <RankBox rank={1} />
                    <RankBox rank={6} />
                    
                    <div className="h-4" /> {/* Spacer */}
                    
                    <RankBox rank={2} />
                    <RankBox rank={5} />

                    <div className="h-4" /> {/* Spacer */}
                    
                    <RankBox rank={3} />
                    <RankBox rank={4} />
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
                    <MatchBox title="Eliminator 1" t1="Rank 1" t2="Rank 6" color="red" />
                    <MatchBox title="Eliminator 2" t1="Rank 2" t2="Rank 5" color="red" />
                    <MatchBox title="Eliminator 3" t1="Rank 3" t2="Rank 4" color="red" />
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
                        <MatchBox title="Qualifier 1" t1="1st Ranked" t2="2nd Ranked" color="amber" />
                        <div className="text-[9px] text-center text-zinc-500 mt-2 uppercase tracking-widest">Loser falls to Q2</div>
                    </div>
                    
                    <div>
                        <MatchBox title="Qualifier 2" t1="Q1 Loser" t2="3rd Ranked" color="amber" />
                    </div>
                </div>

                {/* Stage 5: Final */}
                <div className="flex flex-col relative z-10 w-[150px] items-center justify-center mt-6">
                    <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest text-center mb-4 absolute -top-8 w-full">Championship</div>
                    <div className="bg-gradient-to-br from-amber-500/20 to-black border border-amber-500/50 rounded-xl p-4 w-full shadow-[0_0_30px_rgba(245,158,11,0.15)] text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-20"><TrophyIcon /></div>
                        <div className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mb-3 relative z-10">THE FINAL</div>
                        <div className="bg-black/60 rounded px-2 py-2 text-white font-mono text-xs border border-white/5 mb-1 relative z-10">Q1 Winner</div>
                        <div className="text-[10px] text-zinc-600 my-1 font-bold relative z-10">VS</div>
                        <div className="bg-black/60 rounded px-2 py-2 text-white font-mono text-xs border border-white/5 relative z-10">Q2 Winner</div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}

function RankBox({ rank }: { rank: number }) {
    return (
        <div className="bg-black border border-white/10 rounded-lg py-2.5 px-4 flex items-center justify-between shadow-md">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Rank</span>
            <span className="text-white font-bold font-mono">{rank}</span>
        </div>
    );
}

function MatchBox({ title, t1, t2, color }: { title: string, t1: string, t2: string, color: 'red' | 'amber' }) {
    const borderColor = color === 'red' ? 'border-red-900/50' : 'border-amber-900/50';
    const bgColor = color === 'red' ? 'bg-red-950/20' : 'bg-amber-950/20';
    const titleColor = color === 'red' ? 'text-red-500' : 'text-amber-500';

    return (
        <div className={`border ${borderColor} ${bgColor} rounded-xl p-3 shadow-lg relative`}>
            <div className={`text-[9px] ${titleColor} uppercase tracking-widest font-bold mb-2 text-center`}>{title}</div>
            <div className="flex flex-col gap-1">
                <div className="bg-black/60 rounded px-2 py-1.5 text-white font-mono text-xs border border-white/5 text-center">{t1}</div>
                <div className="bg-black/60 rounded px-2 py-1.5 text-white font-mono text-xs border border-white/5 text-center">{t2}</div>
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
