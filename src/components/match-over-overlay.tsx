"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, ChevronLeft, Users, AlertCircle } from "lucide-react";

interface MatchOverOverlayProps {
    result: string;
    innings1: { teamName: string; runs: number; wickets: number };
    innings2: { teamName: string; runs: number; wickets: number };
    winnerColor: string;
    onShowScorecard: () => void;
    onBack?: () => void;
    onCopyLink?: () => void;
    isScorer?: boolean;
    onStartSuperOver?: () => void;
}

export const MatchOverOverlay = React.memo(function MatchOverOverlay({
    result,
    innings1,
    innings2,
    winnerColor,
    onShowScorecard,
    onBack,
    onCopyLink,
    isScorer,
    onStartSuperOver
}: MatchOverOverlayProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-start justify-center p-6 text-center overflow-y-auto custom-scrollbar"
        >
            {/* Winner Ambient Glow */}
            <motion.div
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="fixed inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${winnerColor}50 0%, transparent 70%)` }}
            />

            <div className="relative z-10 flex flex-col items-center max-w-4xl w-full py-12">
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                    className="mb-8"
                >
                    <div className="relative">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 blur-2xl rounded-full"
                            style={{ backgroundColor: winnerColor }}
                        />
                        <Trophy className="w-32 h-32 text-white relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
                    </div>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-amber-500 font-black tracking-[0.8em] uppercase mb-4 text-sm"
                >
                    Match Complete
                </motion.p>

                <motion.h1
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-7xl md:text-9xl font-black text-white italic tracking-tighter leading-none mb-8"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    MATCH <br /> OVER
                </motion.h1>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden w-full max-w-lg"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />

                    <p className="text-xl md:text-3xl font-black text-white mb-8 tracking-tight uppercase italic">
                        {result}
                    </p>

                    {/* Stacked boxes to prevent overflow */}
                    <div className="flex flex-col gap-4 mb-10">
                        <div className="bg-black/40 rounded-2xl p-4 border border-zinc-800 flex justify-between items-center transition-all hover:border-zinc-700">
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{innings1.teamName}</p>
                            <p className="text-xl font-black text-white">{innings1.runs}<span className="text-zinc-600 font-bold">/{innings1.wickets}</span></p>
                        </div>
                        <div className="bg-black/40 rounded-2xl p-4 border border-zinc-800 flex justify-between items-center transition-all hover:border-zinc-700">
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{innings2.teamName}</p>
                            <p className="text-xl font-black text-white">{innings2.runs}<span className="text-zinc-600 font-bold">/{innings2.wickets}</span></p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onShowScorecard}
                            className="flex items-center justify-center gap-3 bg-white text-black font-black px-8 py-5 rounded-2xl tracking-widest uppercase text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/10 w-full"
                        >
                            <Users className="w-5 h-5" /> Full Scorecard
                        </button>
                        
                        {isScorer ? (
                            <>
                                <button
                                    onClick={onCopyLink}
                                    className="flex items-center justify-center gap-3 bg-blue-500/10 text-blue-400 font-black px-8 py-5 rounded-2xl tracking-widest uppercase text-xs border border-blue-500/20 hover:bg-blue-500/20 transition-all w-full"
                                >
                                    <AlertCircle className="w-5 h-5" /> Copy Public Link
                                </button>
                                <button
                                    onClick={onBack}
                                    className="flex items-center justify-center gap-3 bg-amber-500 text-black font-black px-8 py-5 rounded-2xl tracking-widest uppercase text-xs hover:scale-[1.02] active:scale-95 transition-all w-full"
                                >
                                    Back to Dashboard
                                </button>
                                {result.includes("Tied") && onStartSuperOver && (
                                    <button
                                        onClick={onStartSuperOver}
                                        className="flex items-center justify-center gap-3 bg-red-500 text-white font-black px-8 py-5 rounded-2xl tracking-widest uppercase text-xs hover:scale-[1.02] active:scale-95 transition-all w-full shadow-lg shadow-red-500/20 animate-pulse mt-2"
                                    >
                                        START SUPER OVER
                                    </button>
                                )}
                            </>
                        ) : (
                            <a
                                href="/matches"
                                className="flex items-center justify-center gap-3 bg-zinc-800 text-white font-black px-8 py-5 rounded-2xl tracking-widest uppercase text-xs border border-white/10 hover:bg-zinc-700 transition-all w-full"
                            >
                                <ChevronLeft className="w-5 h-5" /> All Matches
                            </a>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Confetti-like particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -100 }}
                        animate={{
                            y: [null, 1000],
                            x: [Math.random() * 100 + "%", (Math.random() * 100 + Math.sin(i) * 10) + "%"],
                            opacity: [0, 1, 0],
                            rotate: [0, 360 * 2]
                        }}
                        transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5 }}
                        className="absolute w-2 h-2 rounded-sm"
                        style={{ backgroundColor: i % 3 === 0 ? winnerColor : i % 2 === 0 ? '#EAB308' : '#ffffff' }}
                    />
                ))}
            </div>
        </motion.div>
    );
});
