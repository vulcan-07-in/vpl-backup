"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import { AUCTION_CONSTANTS } from "@/lib/auction";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Coins, Trophy, Hammer } from "lucide-react";

interface Player {
    accountId: string;
    name: string;
    teamName: string;
    price: number;
    tier: string;
    role: string;
}

interface Team {
    id: string;
    name: string;
    color: string;
    shortName: string;
}

export default function ViewerClient({ teams, players: initialPlayers, initialPurses }: { teams: Team[], players: Player[], initialPurses: Record<string, number> }) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [auctionState, setAuctionState] = useState<any>({ status: 'IDLE', active_player_id: null, current_bid: 0, leading_team_id: null });
    const [soldEvent, setSoldEvent] = useState<{ player: Player, team: Team, amount: number } | null>(null);
    const [hasAuctionStarted, setHasAuctionStarted] = useState(true);

    useEffect(() => {
        const targetDate = new Date("2026-05-20T17:00:00+05:30").getTime();
        const checkTime = () => setHasAuctionStarted(Date.now() >= targetDate);
        checkTime();
        const interval = setInterval(checkTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const playersRef = useRef(players);
    useEffect(() => { playersRef.current = players; }, [players]);

    // Sync state with DB in real-time
    useEffect(() => {
        // Initial fetch
        supabase.from('vpl_auction_state').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
            if (data) setAuctionState(data);
        });

        const channel = supabase.channel('auction_viewer')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vpl_auction_state' }, (payload) => {
                setAuctionState(payload.new);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vpl_registrations' }, () => {
                // Refresh players silently if someone is sold
                supabase.from("vpl_registrations").select("account_id, team_name, price").eq("season", 2).then(({ data }) => {
                    if (data) {
                        setPlayers(prev => prev.map(p => {
                            const updated = data.find((d: any) => d.account_id === p.accountId);
                            return updated ? { ...p, teamName: updated.team_name, price: updated.price || 0 } : p;
                        }));
                    }
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vpl_auction_history' }, (payload) => {
                const history = payload.new;
                const p = playersRef.current.find(pl => pl.accountId === history.player_id);
                const t = teams.find(tm => tm.id === history.team_id);
                if (p && t) {
                    setSoldEvent({ player: p, team: t, amount: history.bid_amount });
                    setTimeout(() => setSoldEvent(null), 7000); // clear after 7 seconds
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Derived logic
    const activePlayer = useMemo(() => players.find(p => p.accountId === auctionState.active_player_id), [players, auctionState.active_player_id]);
    
    // Team Budgets & Slots
    const teamStats = useMemo(() => {
        const stats: Record<string, { spent: number, count: number, currentPurse: number }> = {};
        teams.forEach(t => {
            const roster = players.filter(p => p.teamName === t.name);
            const spent = roster.reduce((sum, p) => sum + p.price, 0);
            const count = roster.length;
            const startingPurse = initialPurses[t.id] ?? AUCTION_CONSTANTS.MAX_BUDGET;
            stats[t.id] = { spent, count, currentPurse: startingPurse - spent };
        });
        return stats;
    }, [players, teams, initialPurses]);

    const leadingTeam = useMemo(() => teams.find(t => t.id === auctionState.leading_team_id), [teams, auctionState.leading_team_id]);

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col md:flex-row overflow-hidden">
            
            {/* LEFT: Live Stage */}
            <div className="flex-[3] relative flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/5">
                {/* Background glow based on leading team */}
                <div 
                    className="absolute inset-0 opacity-20 blur-[150px] transition-colors duration-1000"
                    style={{ backgroundColor: leadingTeam?.color || '#3f3f46' }}
                />

                <div className="absolute top-8 left-8 flex items-center gap-4">
                    <Trophy className="text-amber-500" />
                    <span className="text-xs font-black tracking-[0.4em] uppercase">VPL S2 Auction</span>
                </div>

                <AnimatePresence mode="wait">
                    {soldEvent ? (
                        <motion.div 
                            key={`sold-${soldEvent.player.accountId}`}
                            initial={{ opacity: 0, scale: 0.5, rotate: -10 }} 
                            animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="relative z-10 w-full max-w-4xl text-center flex flex-col items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-[-1]" />
                            <motion.div 
                                initial={{ opacity: 0, scale: 3 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="border-8 border-red-500 text-red-500 text-8xl md:text-[150px] font-black tracking-tighter uppercase px-12 py-4 rotate-[-15deg] absolute z-20 shadow-[0_0_50px_rgba(239,68,68,0.5)]"
                                style={{ top: '20%', backdropFilter: 'blur(10px)' }}
                            >
                                SOLD
                            </motion.div>

                            <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
                                {soldEvent.player.name.toUpperCase()}
                            </h1>
                            
                            <p className="text-4xl text-zinc-400 mb-12">FOR</p>

                            <div className="text-8xl md:text-[130px] font-black leading-none tracking-tighter font-mono text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)] mb-12">
                                {soldEvent.amount}
                            </div>

                            <div className="inline-flex flex-col items-center gap-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-12 py-6 rounded-3xl shadow-2xl">
                                <p className="text-zinc-500 font-bold tracking-widest uppercase">To</p>
                                <div className="flex items-center gap-6">
                                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: soldEvent.team.color }} />
                                    <span className="text-4xl font-bold tracking-wider">{soldEvent.team.name}</span>
                                </div>
                            </div>
                        </motion.div>
                    ) : activePlayer ? (
                        <motion.div 
                            key={activePlayer.accountId}
                            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: -50, scale: 0.9 }}
                            transition={{ type: "spring", damping: 25 }}
                            className="relative z-10 w-full max-w-3xl text-center"
                        >
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                    {activePlayer.tier}
                                </span>
                                <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold px-4 py-1.5 rounded-full tracking-widest uppercase">
                                    {activePlayer.role}
                                </span>
                            </div>

                            <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
                                {activePlayer.name.toUpperCase()}
                            </h1>
                            
                            <div className="h-px w-32 bg-gradient-to-r from-transparent via-zinc-500 to-transparent mx-auto mb-12" />

                            <div className="relative inline-block">
                                <motion.div 
                                    key={auctionState.current_bid}
                                    initial={{ scale: 1.2, color: '#fff' }}
                                    animate={{ scale: 1, color: '#f59e0b' }}
                                    className="text-8xl md:text-[150px] font-black leading-none tracking-tighter font-mono drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                                >
                                    {auctionState.current_bid}
                                </motion.div>
                                <p className="text-sm font-bold tracking-[0.5em] text-zinc-500 uppercase mt-4">Current Bid</p>
                            </div>

                            {leadingTeam && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    className="mt-12 inline-flex items-center gap-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full shadow-2xl"
                                >
                                    <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: leadingTeam.color }} />
                                    <span className="text-2xl font-bold tracking-wider">{leadingTeam.name}</span>
                                </motion.div>
                            )}

                        </motion.div>
                    ) : !hasAuctionStarted ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="relative z-10 flex flex-col items-center text-amber-500"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="absolute top-10 w-64 h-64 bg-amber-500/20 rounded-full blur-[80px] -z-10"
                            />
                            <motion.div
                                animate={{ y: [0, -15, 0], rotateZ: [0, -15, 0] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            >
                                <Hammer size={120} className="mb-8 drop-shadow-[0_0_40px_rgba(245,158,11,0.8)]" />
                            </motion.div>
                            <motion.p 
                                animate={{ opacity: [0.7, 1, 0.7], textShadow: ["0 0 10px rgba(245,158,11,0.2)", "0 0 30px rgba(245,158,11,0.8)", "0 0 10px rgba(245,158,11,0.2)"] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="text-3xl md:text-5xl font-black tracking-[0.3em] uppercase text-center" 
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                Auction Begins Soon
                            </motion.p>
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                                className="flex items-center gap-3 mt-6 bg-amber-500/10 border border-amber-500/30 px-6 py-3 rounded-full backdrop-blur-sm"
                            >
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <p className="text-xs sm:text-sm font-bold tracking-widest text-amber-400 uppercase">20th May • 5:00 PM • Saraswati Hall</p>
                            </motion.div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="relative z-10 flex flex-col items-center text-zinc-600"
                        >
                            <Hammer size={80} className="mb-8 opacity-20" />
                            <p className="text-2xl font-black tracking-[0.5em] uppercase opacity-50">Waiting for next player</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* RIGHT: Live Purse Tracker */}
            <div className="flex-[1] bg-black relative flex flex-col max-h-screen">
                <div className="p-6 border-b border-white/5 bg-zinc-950 sticky top-0 z-20">
                    <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase flex items-center gap-2">
                        <Coins size={14}/> Live Purse Tracker
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 relative z-10">
                    {teams.map(team => {
                        const stats = teamStats[team.id];
                        const fillPercentage = (stats.count / AUCTION_CONSTANTS.MAX_PLAYERS) * 100;

                        return (
                            <div key={team.id} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                                {/* Subtle progress bar background */}
                                <div 
                                    className="absolute left-0 bottom-0 top-0 opacity-10 transition-all duration-1000"
                                    style={{ width: `${fillPercentage}%`, backgroundColor: team.color }}
                                />
                                
                                <div className="relative z-10 flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-6 rounded-full" style={{ backgroundColor: team.color }} />
                                        <p className="font-bold text-sm tracking-wide">{team.shortName}</p>
                                    </div>
                                    <p className="font-mono font-bold text-emerald-400">{stats.currentPurse}</p>
                                </div>

                                <div className="relative z-10 flex items-center justify-between text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
                                    <div className="flex items-center gap-1.5">
                                        <Users size={12} /> {stats.count} / {AUCTION_CONSTANTS.MAX_PLAYERS}
                                    </div>
                                    <span>Spent: {stats.spent}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
