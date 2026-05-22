"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Zap, Crosshair, Award, Crown, Star, Sparkles, BarChart2 } from "lucide-react";
import { type PlayerStats } from "@/lib/mvp";
import { getAchievements } from "@/lib/mvp";

interface PlayerMeta {
    name: string;
    role: string;
    price: string;
    isCaptain?: boolean;
    accountId: string;
}

interface PlayerProfileModalProps {
    player: PlayerMeta;
    stats: PlayerStats | undefined;
    teamColor: string;
    teamLogo?: string;
    teamShortName: string;
    onClose: () => void;
}

export default function PlayerProfileModal({
    player,
    stats,
    teamColor,
    teamLogo,
    teamShortName,
    onClose,
}: PlayerProfileModalProps) {
    // Fill with zeroed out stats if this player hasn't featured in matches yet
    const activeStats: PlayerStats = stats || {
        name: player.name,
        team: teamShortName,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        runsConceded: 0,
        ballsBowled: 0,
        dotBalls: 0,
        maidens: 0,
        catches: 0,
        stumpings: 0,
        runOuts: 0,
        matchesWon: 0,
        mvpPoints: 0,
    };

    // Calculate rates
    const strikeRate = activeStats.balls > 0 ? (activeStats.runs / activeStats.balls) * 100 : 0;
    const economy = activeStats.ballsBowled > 0 ? activeStats.runsConceded / (activeStats.ballsBowled / 6) : 0;
    const oversBowledDecimal = activeStats.ballsBowled > 0 ? Math.floor(activeStats.ballsBowled / 6) + (activeStats.ballsBowled % 6) / 10 : 0;

    // Calculate custom skill scores (0 - 100) for visual card representation
    const baseSkill = 50;
    
    // Batting: based on runs, strike rate, boundaries
    const battingSkill = activeStats.runs === 0 ? 0 : Math.min(99, Math.round(
        Math.min(50, activeStats.runs) * 1.0 +
        Math.min(200, strikeRate) * 0.15 +
        activeStats.sixes * 3 +
        activeStats.fours * 1.5 +
        baseSkill * 0.4
    ));

    // Bowling: based on wickets, economy, dots, maidens
    const bowlingSkill = activeStats.ballsBowled === 0 ? 0 : Math.min(99, Math.round(
        Math.min(5, activeStats.wickets) * 13 +
        Math.max(0, 15 - economy) * 2.5 +
        activeStats.dotBalls * 0.7 +
        activeStats.maidens * 4 +
        baseSkill * 0.4
    ));

    // Fielding: based on catches, stumpings, runouts
    const fieldingSkill = Math.min(99, Math.round(
        baseSkill +
        activeStats.catches * 8 +
        activeStats.stumpings * 10 +
        activeStats.runOuts * 10
    ));

    // Impact / MVP: based on MVP points and matches won
    const impactSkill = Math.min(99, Math.round(
        baseSkill +
        activeStats.mvpPoints * 0.8 +
        activeStats.matchesWon * 7
    ));

    // Build achievements list using original logic + dynamic ones
    const achievements = getAchievements(activeStats);
    if (player.isCaptain) {
        achievements.unshift("Team Captain & Leader");
    }
    if (activeStats.mvpPoints > 80) {
        achievements.unshift("Tournament Gold Contender");
    } else if (activeStats.mvpPoints > 30) {
        achievements.unshift("Key Franchise Asset");
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
            />

            {/* Premium 3D Sports Card Frame */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                className="relative w-full max-w-2xl bg-zinc-950/80 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl group"
                style={{
                    boxShadow: `0 0 60px -15px ${teamColor}35, inset 0 0 30px ${teamColor}10`,
                    borderColor: `${teamColor}40`,
                }}
            >
                {/* Sleek top team color lighting accent */}
                <div className="h-[3px] w-full" style={{ backgroundColor: teamColor }} />

                {/* Main Card Layout */}
                <div className="p-6 md:p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            {teamLogo ? (
                                <img
                                    src={teamLogo}
                                    alt={teamShortName}
                                    className="w-14 h-14 rounded-full object-cover border-2 shrink-0 shadow-lg"
                                    style={{ borderColor: teamColor }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            ) : (
                                <div
                                    className="w-14 h-14 rounded-full flex items-center justify-center font-black text-white shrink-0 border shadow-lg"
                                    style={{ backgroundColor: `${teamColor}20`, borderColor: teamColor }}
                                >
                                    {teamShortName}
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-[9px] font-black tracking-[0.3em] px-2 py-0.5 rounded uppercase"
                                        style={{ backgroundColor: `${teamColor}25`, color: teamColor }}
                                    >
                                        {teamShortName} Franchise
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                        ID: {player.accountId}
                                    </span>
                                </div>
                                <h2 className="text-3xl md:text-4xl text-white font-extrabold tracking-tight mt-1 uppercase" style={{ fontFamily: "var(--font-heading)" }}>
                                    {player.name}
                                </h2>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Left Column: Player Info & Achievements */}
                        <div className="flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-3">Player Specification</p>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Role & Position</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Crosshair className="w-4 h-4 text-amber-500" />
                                            <span className="text-sm font-bold text-white uppercase">{player.role}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Draft Value</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {player.isCaptain ? (
                                                <>
                                                    <Crown className="w-4 h-4 text-amber-500" />
                                                    <span className="text-sm font-black text-amber-500 uppercase tracking-wider">Captain</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Award className="w-4 h-4 text-amber-400" />
                                                    <span className="text-sm font-black text-amber-400 font-mono">{player.price}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-3">Franchise Achievements</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {achievements.length === 0 ? (
                                        <div className="py-4 text-center text-xs text-zinc-600 font-bold tracking-widest uppercase bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                                            Awaiting Match Debut
                                        </div>
                                    ) : (
                                        achievements.map((ach, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 group-hover:bg-white/[0.03] transition-colors"
                                            >
                                                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${teamColor}15` }}>
                                                    <Sparkles className="w-3 h-3" style={{ color: teamColor }} />
                                                </div>
                                                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-tight">{ach}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Visual Skill Attributes */}
                        <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                            <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-5">Visual Attribute Rating</p>
                            <div className="space-y-5">
                                {[
                                    { name: "Batting Index", value: battingSkill, desc: "Runs / SR / Boundaries" },
                                    { name: "Bowling Index", value: bowlingSkill, desc: "Wickets / Econ / Dots" },
                                    { name: "Fielding Agility", value: fieldingSkill, desc: "Catches / Run Outs" },
                                    { name: "Match Impact", value: impactSkill, desc: "Wins / MVP Score" },
                                ].map((skill, index) => (
                                    <div key={index}>
                                        <div className="flex justify-between items-end mb-1">
                                            <div>
                                                <span className="text-xs font-bold text-white uppercase tracking-tight">{skill.name}</span>
                                                <span className="hidden sm:inline-block text-[8px] text-zinc-600 font-bold uppercase tracking-widest ml-2">{skill.desc}</span>
                                            </div>
                                            <span className="text-sm font-black font-mono tabular-nums" style={{ color: teamColor }}>
                                                {skill.value === 0 ? "—" : `${skill.value}/99`}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(skill.value / 99) * 100}%` }}
                                                transition={{ duration: 0.8, delay: 0.1 * index }}
                                                className="h-full rounded-full"
                                                style={{
                                                    background: `linear-gradient(to right, ${teamColor}b0, ${teamColor})`,
                                                    boxShadow: `0 0 10px ${teamColor}80`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid Footer */}
                    <div className="border-t border-white/10 pt-6">
                        <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-4">TOURNAMENT PERFORMANCE GRID</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                            {[
                                { label: "Runs Scored", val: activeStats.runs, sub: `${activeStats.balls}b` },
                                { label: "Strike Rate", val: strikeRate > 0 ? strikeRate.toFixed(1) : "0.0", sub: `${activeStats.sixes}x6 / ${activeStats.fours}x4` },
                                { label: "Wickets", val: activeStats.wickets, sub: `${oversBowledDecimal.toFixed(1)} Ov` },
                                { label: "Economy", val: economy > 0 ? economy.toFixed(2) : "0.0", sub: `${activeStats.dotBalls} dots` },
                                { label: "Catches/St", val: activeStats.catches + activeStats.stumpings, sub: `${activeStats.runOuts} ro` },
                                { label: "MVP Points", val: activeStats.mvpPoints.toFixed(1), sub: `${activeStats.matchesWon} wins`, highlight: true },
                            ].map((stat, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-2xl border transition-colors ${
                                        stat.highlight
                                            ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                                            : "bg-white/[0.01] border-white/5 hover:bg-white/[0.02]"
                                    }`}
                                >
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-1 truncate">{stat.label}</p>
                                    <p className={`text-lg font-black font-mono leading-none tabular-nums ${stat.highlight ? "text-amber-400" : "text-white"}`}>
                                        {stat.val}
                                    </p>
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1 truncate">{stat.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
