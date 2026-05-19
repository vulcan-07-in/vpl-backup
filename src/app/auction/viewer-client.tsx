"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import { AUCTION_CONSTANTS } from "@/lib/auction";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Coins, Trophy, Hammer, Crown, X, Clock, PauseCircle } from "lucide-react";

interface Player {
    accountId: string;
    name: string;
    teamName: string;
    price: number;
    tier: string;
    role: string;
    gender: string;
    isCaptain: boolean;
}

interface Team {
    id: string;
    name: string;
    color: string;
    shortName: string;
    purse: number;
    logoUrl?: string | null;
}

export default function ViewerClient({ teams, players: initialPlayers }: { teams: Team[], players: Player[] }) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [auctionState, setAuctionState] = useState<any>({ status: 'IDLE', active_player_id: null, current_bid: 0, leading_team_id: null, active_pool: null, show_pool_to_viewers: true });
    const [soldEvent, setSoldEvent] = useState<{ player: Player, team: Team, amount: number } | null>(null);
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    const playersRef = useRef(players);
    useEffect(() => { playersRef.current = players; }, [players]);

    // Timer logic for WAITING state
    useEffect(() => {
        const targetDate = new Date("2026-05-20T17:00:00+05:30").getTime();
        const updateCountdown = () => {
            if (auctionState?.status !== 'WAITING') return;
            const now = new Date().getTime();
            const diff = targetDate - now;
            if (diff <= 0) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
            } else {
                setTimeLeft({
                    d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    s: Math.floor((diff % (1000 * 60)) / 1000),
                });
            }
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [auctionState?.status]);

    useEffect(() => {
        supabase.from('vpl_auction_state').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
            if (data) setAuctionState(data);
        });

        const channel = supabase.channel('auction_viewer')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vpl_auction_state' }, (payload) => {
                setAuctionState(payload.new);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vpl_registrations' }, () => {
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
                    setTimeout(() => setSoldEvent(null), 7000);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const activePlayer = useMemo(() => players.find(p => p.accountId === auctionState.active_player_id), [players, auctionState.active_player_id]);

    const teamStats = useMemo(() => {
        const stats: Record<string, { spent: number, count: number, currentPurse: number }> = {};
        teams.forEach(t => {
            const roster = players.filter(p => p.teamName === t.name);
            const spent = roster.reduce((sum, p) => sum + p.price, 0);
            stats[t.id] = { spent, count: roster.length, currentPurse: t.purse - spent };
        });
        return stats;
    }, [players, teams]);

    const leadingTeam = useMemo(() => teams.find(t => t.id === auctionState.leading_team_id), [teams, auctionState.leading_team_id]);

    // Pool players for display
    const poolPlayers = useMemo(() => {
        if (!auctionState.show_pool_to_viewers || !auctionState.active_pool) return [];
        return players.filter(p => {
            if (p.isCaptain) return false;
            const matchesPool = p.tier?.toUpperCase() === auctionState.active_pool?.toUpperCase();
            return matchesPool && (p.teamName === 'UNSOLD' || p.teamName === 'PASSED' || p.teamName !== 'UNSOLD');
        });
    }, [players, auctionState.active_pool, auctionState.show_pool_to_viewers]);

    return (
        <div className="min-h-[100dvh] bg-[#020202] text-white flex flex-col md:flex-row md:overflow-hidden">

            {/* LEFT: Live Stage */}
            <div className="flex-[3] relative flex flex-col items-center justify-center p-4 md:p-8 border-b md:border-b-0 md:border-r border-white/5 min-h-[50vh] md:min-h-screen overflow-hidden">
                <div
                    className="absolute inset-0 opacity-20 blur-[150px] transition-colors duration-1000"
                    style={{ backgroundColor: leadingTeam?.color || '#3f3f46' }}
                />

                <div className="absolute top-8 left-8 flex items-center gap-4 border border-white/10 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full">
                    <Trophy className="text-amber-500" size={18} />
                    <span className="text-xs font-bold tracking-[0.3em] uppercase text-zinc-300">VPL S2 Auction</span>
                </div>

                <AnimatePresence mode="wait">
                    {auctionState.status === 'WAITING' ? (
                        <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center justify-center text-center">
                            <Clock size={48} className="text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                            <h2 className="text-3xl md:text-5xl font-black tracking-[0.2em] uppercase mb-8">Auction Begins In</h2>
                            {timeLeft && (
                                <div className="flex gap-4 md:gap-8">
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl md:text-8xl font-black text-white drop-shadow-2xl">{timeLeft.d}</span>
                                        <span className="text-[10px] md:text-sm text-amber-500 tracking-widest font-bold uppercase mt-2">Days</span>
                                    </div>
                                    <span className="text-5xl md:text-8xl font-black text-white/20">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl md:text-8xl font-black text-white drop-shadow-2xl">{timeLeft.h.toString().padStart(2, '0')}</span>
                                        <span className="text-[10px] md:text-sm text-amber-500 tracking-widest font-bold uppercase mt-2">Hours</span>
                                    </div>
                                    <span className="text-5xl md:text-8xl font-black text-white/20">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl md:text-8xl font-black text-white drop-shadow-2xl">{timeLeft.m.toString().padStart(2, '0')}</span>
                                        <span className="text-[10px] md:text-sm text-amber-500 tracking-widest font-bold uppercase mt-2">Mins</span>
                                    </div>
                                    <span className="text-5xl md:text-8xl font-black text-white/20">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl md:text-8xl font-black text-white drop-shadow-2xl">{timeLeft.s.toString().padStart(2, '0')}</span>
                                        <span className="text-[10px] md:text-sm text-amber-500 tracking-widest font-bold uppercase mt-2">Secs</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : auctionState.status === 'PAUSED' ? (
                        <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center justify-center text-center">
                            <PauseCircle size={64} className="text-amber-500 mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                            <h2 className="text-4xl md:text-6xl font-black tracking-[0.2em] uppercase mb-4 text-white">Auction Paused</h2>
                            <p className="text-sm md:text-lg tracking-[0.4em] uppercase text-zinc-400">We will resume shortly</p>
                        </motion.div>
                    ) : soldEvent ? (
                        <motion.div
                            key={`sold-${soldEvent.player.accountId}`}
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, filter: 'blur(10px)' }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center"
                        >
                            <div className="bg-gradient-to-r from-transparent via-zinc-900 to-transparent w-full h-[1px] mb-8 opacity-50" />
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-emerald-400 font-bold tracking-[0.5em] uppercase text-sm mb-4"
                            >
                                Player Sold
                            </motion.div>
                            <h1 className="text-6xl md:text-[90px] font-black mb-6 tracking-tighter uppercase leading-none drop-shadow-2xl">{soldEvent.player.name}</h1>
                            <div className="bg-gradient-to-r from-transparent via-zinc-900 to-transparent w-full h-[1px] mt-2 mb-10 opacity-50" />
                            
                            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 bg-black/40 backdrop-blur-xl border border-white/10 px-12 py-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                <div className="text-center md:text-left">
                                    <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs mb-2">Final Bid</p>
                                    <div className="text-6xl md:text-8xl font-black leading-none font-mono text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                                        ₹{soldEvent.amount}
                                    </div>
                                </div>
                                <div className="hidden md:block w-[1px] h-24 bg-white/10" />
                                <div className="flex flex-col items-center md:items-start">
                                    <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs mb-3">Purchased By</p>
                                    <div className="flex items-center gap-4">
                                        {soldEvent.team.logoUrl
                                            ? <img src={soldEvent.team.logoUrl} alt={soldEvent.team.name} className="w-16 h-16 rounded-full object-cover border border-white/20 shadow-lg" />
                                            : <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: soldEvent.team.color }} />}
                                        <span className="text-3xl font-bold tracking-wider">{soldEvent.team.name}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : activePlayer ? (
                        <motion.div
                            key={activePlayer.accountId}
                            initial={{ opacity: 0, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="relative z-10 w-full max-w-4xl flex flex-col items-center"
                        >
                            <div className="flex items-center justify-center gap-4 mb-8">
                                <span className="bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-bold px-4 py-1.5 rounded-sm tracking-widest uppercase">{activePlayer.tier}</span>
                                <span className="bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-bold px-4 py-1.5 rounded-sm tracking-widest uppercase">{activePlayer.role}</span>
                            </div>
                            
                            <h1 className="text-6xl md:text-[90px] font-black mb-12 tracking-tighter uppercase leading-none drop-shadow-2xl text-center">{activePlayer.name}</h1>
                            
                            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 px-16 py-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[300px]">
                                <p className="text-xs font-bold tracking-[0.4em] text-zinc-500 uppercase mb-4">Current Bid</p>
                                <motion.div
                                    key={auctionState.current_bid}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-7xl md:text-[100px] font-black leading-none font-mono text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                >
                                    ₹{auctionState.current_bid}
                                </motion.div>
                                
                                <div className="h-[40px] mt-6 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {leadingTeam && (
                                            <motion.div
                                                key={leadingTeam.id}
                                                initial={{ opacity: 0, scale: 0.9 }} 
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2 rounded-full"
                                            >
                                                {leadingTeam.logoUrl
                                                    ? <img src={leadingTeam.logoUrl} alt={leadingTeam.name} className="w-6 h-6 rounded-full object-cover shadow-lg" />
                                                    : <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: leadingTeam.color, color: leadingTeam.color }} />}
                                                <span className="text-sm font-bold tracking-widest uppercase" style={{ color: leadingTeam.color }}>{leadingTeam.name}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="relative z-10 flex flex-col items-center text-zinc-600">
                            <div className="w-px h-16 bg-gradient-to-b from-transparent to-zinc-800 mb-6" />
                            <p className="text-sm font-bold tracking-[0.4em] uppercase text-zinc-500">Waiting for next player</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pool display at bottom */}
                {auctionState.show_pool_to_viewers && auctionState.active_pool && !soldEvent && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={14} className="text-amber-500" />
                            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">{auctionState.active_pool} Pool</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {poolPlayers.map(p => {
                                const isSold = p.teamName !== 'UNSOLD' && p.teamName !== 'PASSED';
                                const isActive = p.accountId === auctionState.active_player_id;
                                return (
                                    <div key={p.accountId} className={`shrink-0 px-3 py-2 rounded-lg border text-xs transition-all ${
                                        isActive ? 'border-amber-500 bg-amber-500/10 text-amber-500' :
                                        isSold ? 'border-zinc-800 bg-zinc-900/50 text-zinc-600 line-through opacity-50' :
                                        'border-zinc-800 bg-zinc-900/50 text-zinc-300'
                                    }`}>
                                        <p className="font-bold">{p.name}</p>
                                        {isSold && <p className="text-[9px] text-zinc-600 mt-0.5">{p.teamName}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT: Live Purse Tracker */}
            <div className="flex-[1] bg-[#020202] border-l border-white/5 relative flex flex-col md:max-h-screen min-h-[50vh]">
                <div className="p-4 md:p-6 border-b border-white/5 bg-[#020202] sticky top-0 z-20 shadow-xl">
                    <h3 className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase flex items-center gap-2">
                        <Coins size={14}/> Live Purse Tracker
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-2 relative z-10">
                    {teams.map(team => {
                        const stats = teamStats[team.id];
                        return (
                            <div 
                                key={team.id} 
                                onClick={() => setSelectedTeam(team)}
                                className="bg-white/5 border border-white/5 rounded-xl p-4 relative overflow-hidden group hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <div className="relative z-10 flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {team.logoUrl
                                            ? <img src={team.logoUrl} alt={team.shortName} className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-sm" />
                                            : <div className="w-1.5 h-6 rounded-sm" style={{ backgroundColor: team.color }} />}
                                        <p className="font-bold text-sm tracking-widest uppercase">{team.shortName}</p>
                                    </div>
                                    <p className="font-mono font-black text-emerald-400 tracking-wider">₹{stats.currentPurse}</p>
                                </div>
                                <div className="relative z-10 flex items-center justify-between mt-3 text-[9px] text-zinc-500 font-bold tracking-[0.2em] uppercase">
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <Users size={12} /> {stats.count}/{AUCTION_CONSTANTS.MAX_PLAYERS}
                                    </div>
                                    <span>Spent: ₹{stats.spent}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Squad Modal */}
            <AnimatePresence>
                {selectedTeam && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedTeam(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0a0a0a] z-10">
                                <div className="flex items-center gap-4">
                                    {selectedTeam.logoUrl
                                        ? <img src={selectedTeam.logoUrl} alt={selectedTeam.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                                        : <div className="w-4 h-12 rounded-sm" style={{ backgroundColor: selectedTeam.color }} />}
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-wider">{selectedTeam.name}</h2>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-xs font-mono text-emerald-400">Purse: ₹{teamStats[selectedTeam.id].currentPurse}</span>
                                            <span className="text-xs font-mono text-zinc-500">Spent: ₹{teamStats[selectedTeam.id].spent}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTeam(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                                    <X size={20} className="text-zinc-400 hover:text-white" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                <h3 className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase mb-4 flex items-center justify-between">
                                    <span>Squad Roster</span>
                                    <span>{teamStats[selectedTeam.id].count} / {AUCTION_CONSTANTS.MAX_PLAYERS} Slots</span>
                                </h3>
                                
                                {players.filter(p => p.teamName === selectedTeam.name).length === 0 ? (
                                    <div className="text-center py-10 text-zinc-600 font-bold uppercase tracking-widest text-xs">
                                        No players drafted yet
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {players.filter(p => p.teamName === selectedTeam.name).map(p => (
                                            <div key={p.accountId} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm tracking-wide flex items-center gap-2">
                                                            {p.name} {p.isCaptain && <Crown size={12} className="text-amber-500"/>}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 tracking-wider uppercase mt-0.5">{p.role} · {p.tier}</span>
                                                    </div>
                                                </div>
                                                <span className="font-mono font-bold text-amber-500">₹{p.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
