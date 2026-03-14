"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Clock } from "lucide-react";

interface InningsBreakOverlayProps {
    teamName: string;
    runs: number;
    wickets: number;
    overs: number;
    targetTeam: string;
    teamColor: string;
    onStartSecondInnings?: () => void;
    isScorer?: boolean;
}

export const InningsBreakOverlay = React.memo(function InningsBreakOverlay({
    teamName,
    runs,
    wickets,
    overs,
    targetTeam,
    teamColor,
    onStartSecondInnings,
    isScorer
}: InningsBreakOverlayProps) {
    const target = runs + 1;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center overflow-hidden"
        >
            {/* Dramatic Background Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.3, 0.1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${teamColor}40 0%, transparent 70%)` }}
            />

            <div className="relative z-10 space-y-8 max-w-2xl w-full">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
                    <p className="text-[12px] tracking-[0.8em] text-blue-400 font-bold uppercase ml-[0.8em]">End of Innings</p>
                </motion.div>

                <motion.h2
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-7xl md:text-9xl text-white font-black italic tracking-tighter leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    INNINGS 1 <br /> OVER
                </motion.h2>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

                    <div className="space-y-6">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">{teamName} SCORE</span>
                            <p className="text-6xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                                {runs}<span className="text-zinc-600">/</span>{wickets}
                            </p>
                            <span className="text-zinc-500 font-bold tracking-widest">({overs.toFixed(1)} OVERS)</span>
                        </div>

                        <div className="h-px bg-white/5 w-2/3 mx-auto" />

                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-amber-500 uppercase font-black tracking-widest mb-3">Target for {targetTeam}</span>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-1 bg-amber-500/20 rounded-full" />
                                <p className="text-5xl font-black text-white animate-pulse">{target}</p>
                                <div className="w-12 h-1 bg-amber-500/20 rounded-full" />
                            </div>
                            {isScorer ? (
                                <button
                                    onClick={onStartSecondInnings}
                                    className="mt-8 w-full bg-amber-500 text-black font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                                >
                                    Start 2nd Innings &rarr;
                                </button>
                            ) : (
                                <p className="text-[10px] text-zinc-500 tracking-[0.3em] uppercase mt-4 font-bold">Resuming shortly...</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Animated Particles */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            y: [-20, 1000],
                            x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
                            opacity: [0, 1, 0]
                        }}
                        transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 10 }}
                        className="absolute w-1 h-1 bg-white rounded-full"
                    />
                ))}
            </div>
        </motion.div>
    );
});
