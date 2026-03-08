"use client";

import { useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
    name: string;
    role: string;
    price?: string;
}

interface Team {
    teamName: string;
    players: Player[];
}

const ROLE_LABEL: Record<string, string> = {
    Batsman: "BAT",
    Bowler: "BOWL",
    "All Rounder": "AR",
    "All-Rounder": "AR",
    Wicketkeeper: "WK",
    WK: "WK",
};

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function SquadsClient({ initialData }: { initialData: Team[] }) {
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    return (
        <>
            <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28">
                <div className="max-w-4xl mx-auto">

                    {/* Page Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-12 md:mb-16"
                    >
                        <p
                            className="text-[11px] tracking-[0.5em] text-zinc-600 mb-3"
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            VARCHASVA PREMIER LEAGUE
                        </p>
                        <h1
                            className="text-6xl md:text-8xl text-white leading-none"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            SQUADS
                        </h1>
                        <div className="mt-5 flex items-center gap-4">
                            <div className="h-px w-8 bg-amber-500" />
                            <span className="text-xs text-zinc-700 tracking-widest">
                                {initialData.length} TEAMS
                            </span>
                        </div>
                    </motion.div>

                    {/* Team List */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-px"
                    >
                        {initialData.map((team, idx) => (
                            <motion.button
                                variants={itemVariants}
                                key={idx}
                                onClick={() => setSelectedTeam(team)}
                                className="group relative w-full h-40 md:h-56 transform hover:-translate-y-2 transition-transform duration-300 focus:outline-none"
                            >
                                <div className={`absolute inset-0 bg-[#EAB308]/20 rounded-3xl blur-xl group-hover:bg-[#EAB308]/30 transition-colors`} />
                                <div className={`relative h-full flex flex-col justify-end p-6 border-2 border-[#EAB308]/30 hover:border-[#EAB308]/50 rounded-3xl text-left bg-black`}>
                                    <div className="absolute top-6 left-6 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-[#EAB308]/10 text-[#EAB308]">
                                        {team.teamName.slice(0, 3).toUpperCase()}
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-widest">{team.teamName}</h3>
                                    <p className="text-[#EAB308] text-sm mt-2 font-medium tracking-widest">{team.players.length} PLAYERS</p>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                </div>
            </main>

            {/* ── Squad Modal ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedTeam && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
                        onClick={() => setSelectedTeam(null)}
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" />

                        {/* Panel */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative w-full md:max-w-xl bg-zinc-950 border-t md:border md:rounded-2xl overflow-hidden"
                            style={{ borderColor: `#EAB30825` }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Thin color bar at top */}
                            <div className="h-[2px] w-full" style={{ backgroundColor: `#EAB308` }} />

                            {/* Modal Header */}
                            <div className="relative h-48 md:h-64 bg-zinc-900 flex items-end">
                                {/* Header Image Gradient */}
                                <div className={`absolute inset-0 bg-gradient-to-b from-[#EAB308]/10 to-transparent`} />
                                <button
                                    onClick={() => setSelectedTeam(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <div className="absolute bottom-6 left-6 right-6">
                                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">{selectedTeam.teamName}</h2>
                                    <p className={`text-[#EAB308] mt-2 text-lg font-medium tracking-widest`}>FULL SQUAD 2025</p>
                                </div>
                            </div>

                            {/* Player Roster */}
                            <div className="max-h-[55vh] overflow-y-auto">
                                {selectedTeam.players.map((player, pIdx) => (
                                    <div
                                        key={pIdx}
                                        className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                                    >
                                        {/* Row number */}
                                        <span
                                            className="text-xs text-zinc-800 w-5 text-right shrink-0 tabular-nums"
                                            style={{ fontFamily: "var(--font-mono)" }}
                                        >
                                            {String(pIdx + 1).padStart(2, "0")}
                                        </span>

                                        {/* Player name */}
                                        <span className="font-bold text-white uppercase tracking-wider">{player.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest border border-zinc-700 px-2 py-1 rounded bg-black">
                                                {ROLE_LABEL[player.role] || "PLY"}
                                            </span>
                                            <span className={`text-sm font-black text-[#EAB308] tabular-nums min-w-[3rem] text-right`}>
                                                {player.price}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 flex items-center justify-between">
                                <span
                                    className="text-[10px] tracking-widest text-zinc-800"
                                    style={{ fontFamily: "var(--font-body)" }}
                                >
                                    VARCHASVA PREMIER LEAGUE
                                </span>
                                <button
                                    onClick={() => setSelectedTeam(null)}
                                    className="text-[10px] tracking-widest text-zinc-700 hover:text-white transition-colors"
                                    style={{ fontFamily: "var(--font-body)" }}
                                >
                                    CLOSE
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
