"use client";

import { motion } from "framer-motion";
import { Info, Trophy, Swords, FastForward } from "lucide-react";

export default function PlayoffInfographic() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
        >
            <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
                    <Info size={12} className="text-amber-500" />
                    How The Playoffs Work
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1: Qualification */}
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 to-zinc-600 group-hover:from-amber-600 group-hover:to-amber-500 transition-colors" />
                    <FastForward className="text-zinc-600 group-hover:text-amber-500 transition-colors mb-4" size={24} />
                    <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>1. Qualification</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        The <strong className="text-amber-400">Top 2</strong> teams from each of the 3 groups advance. These 6 teams are <strong className="text-white">Ranked 1 to 6</strong> across all groups based first on Points, then NRR.
                    </p>
                </div>

                {/* Step 2: Eliminators */}
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 to-zinc-600 group-hover:from-red-600 group-hover:to-orange-500 transition-colors" />
                    <Swords className="text-zinc-600 group-hover:text-red-500 transition-colors mb-4" size={24} />
                    <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>2. Eliminators</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        The 6 teams play 3 sudden-death Eliminators based on their rank:
                    </p>
                    <ul className="text-[10px] text-zinc-500 mt-2 space-y-1 tracking-wider uppercase font-mono">
                        <li><strong className="text-white">E1:</strong> Rank 1 vs Rank 6</li>
                        <li><strong className="text-white">E2:</strong> Rank 2 vs Rank 5</li>
                        <li><strong className="text-white">E3:</strong> Rank 3 vs Rank 4</li>
                    </ul>
                </div>

                {/* Step 3: Qualifiers & Final */}
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 to-zinc-600 group-hover:from-yellow-500 group-hover:to-amber-300 transition-colors" />
                    <Trophy className="text-zinc-600 group-hover:text-yellow-500 transition-colors mb-4" size={24} />
                    <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>3. Qualifiers & Final</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-2">
                        The 3 Eliminator winners are <strong className="text-white">Re-ranked</strong> by total NRR:
                    </p>
                    <ul className="text-[10px] text-zinc-500 space-y-1 tracking-wider uppercase font-mono mb-2">
                        <li><strong className="text-white">Q1:</strong> 1st NRR Winner vs 2nd NRR Winner</li>
                        <li><strong className="text-white">Q2:</strong> Q1 Loser vs 3rd NRR Winner</li>
                    </ul>
                    <p className="text-[10px] text-yellow-500 font-bold tracking-widest uppercase">
                        Final: Q1 Winner vs Q2 Winner
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
