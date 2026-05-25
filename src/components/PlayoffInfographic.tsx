"use client";

import { motion } from "framer-motion";
import { Info, FastForward, Swords, ArrowRightLeft, Trophy, Crown } from "lucide-react";

export default function PlayoffInfographic() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-16"
        >
            <div className="flex items-center gap-4 mb-8">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
                    <Info size={12} className="text-amber-500" />
                    Tournament Progression
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            <div className="relative">
                {/* Connecting Line for Desktop */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-white/[0.02] via-amber-500/20 to-white/[0.02] -translate-y-1/2 z-0" />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                    
                    {/* Phase 1 */}
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-amber-500 transition-colors">
                                <FastForward size={14} />
                            </div>
                            <h3 className="text-sm font-bold tracking-widest uppercase text-white" style={{ fontFamily: "var(--font-heading)" }}>1. Qualification</h3>
                        </div>
                        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                            Top 2 from each group advance. They are <strong className="text-amber-500">Ranked 1-6</strong> overall by Points & NRR.
                        </p>
                        <div className="flex gap-1 flex-wrap">
                            {[1,2,3,4,5,6].map(r => (
                                <span key={r} className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-mono text-zinc-500">R{r}</span>
                            ))}
                        </div>
                    </div>

                    {/* Phase 2 */}
                    <div className="bg-[#0a0a0a] border border-red-900/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-red-950/50 border border-red-900/50 flex items-center justify-center text-red-500">
                                <Swords size={14} />
                            </div>
                            <h3 className="text-sm font-bold tracking-widest uppercase text-white" style={{ fontFamily: "var(--font-heading)" }}>2. Eliminators</h3>
                        </div>
                        <p className="text-[11px] text-zinc-400 mb-4">Sudden death matches based on qualification rank:</p>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-black/40 px-3 py-2 rounded border border-white/5">
                                <span className="text-[10px] font-bold text-zinc-300">E1</span>
                                <span className="text-[10px] font-mono text-zinc-500">R1 vs R6</span>
                            </div>
                            <div className="flex justify-between items-center bg-black/40 px-3 py-2 rounded border border-white/5">
                                <span className="text-[10px] font-bold text-zinc-300">E2</span>
                                <span className="text-[10px] font-mono text-zinc-500">R2 vs R5</span>
                            </div>
                            <div className="flex justify-between items-center bg-black/40 px-3 py-2 rounded border border-white/5">
                                <span className="text-[10px] font-bold text-zinc-300">E3</span>
                                <span className="text-[10px] font-mono text-zinc-500">R3 vs R4</span>
                            </div>
                        </div>
                    </div>

                    {/* Phase 3 */}
                    <div className="bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden group md:-translate-y-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-amber-950/50 border border-amber-900/50 flex items-center justify-center text-amber-500">
                                <ArrowRightLeft size={14} />
                            </div>
                            <h3 className="text-sm font-bold tracking-widest uppercase text-white" style={{ fontFamily: "var(--font-heading)" }}>3. Re-Ranking</h3>
                        </div>
                        <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
                            The 3 Eliminator Winners are <strong className="text-amber-500">re-ranked</strong> based on their Total Tournament NRR.
                        </p>
                        <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mb-1">Qualifier 1</p>
                            <p className="text-xs text-white font-mono">1st NRR vs 2nd NRR</p>
                            <div className="my-2 h-px bg-amber-900/30" />
                            <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mb-1">Qualifier 2</p>
                            <p className="text-xs text-white font-mono">Q1 Loser vs 3rd NRR</p>
                        </div>
                    </div>

                    {/* Phase 4 */}
                    <div className="bg-gradient-to-b from-amber-500/10 to-black border border-amber-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Crown size={64} />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                                <Trophy size={14} />
                            </div>
                            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-500" style={{ fontFamily: "var(--font-heading)" }}>4. The Final</h3>
                        </div>
                        <div className="flex flex-col h-[100px] justify-center items-center bg-black/60 border border-amber-500/20 rounded-xl relative z-10">
                            <span className="text-[10px] text-zinc-500 tracking-widest mb-2 uppercase">Championship Match</span>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm text-white font-bold">Q1 Winner</span>
                                <span className="text-amber-500 text-xs">vs</span>
                                <span className="font-mono text-sm text-white font-bold">Q2 Winner</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </motion.div>
    );
}
