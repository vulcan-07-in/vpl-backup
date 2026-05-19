"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import { AUCTION_CONSTANTS } from "@/lib/auction";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Coins, Trophy, Crown, X, Clock, PauseCircle, ChevronRight, Gavel } from "lucide-react";

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
    const [bidFlash, setBidFlash] = useState(false);
    const playersRef = useRef(players);
    useEffect(() => { playersRef.current = players; }, [players]);

    useEffect(() => {
        const targetDate = new Date("2026-05-20T17:00:00+05:30").getTime();
        const update = () => {
            if (auctionState?.status !== 'WAITING') return;
            const diff = targetDate - Date.now();
            if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
            setTimeLeft({
                d: Math.floor(diff / 86400000),
                h: Math.floor((diff % 86400000) / 3600000),
                m: Math.floor((diff % 3600000) / 60000),
                s: Math.floor((diff % 60000) / 1000),
            });
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [auctionState?.status]);

    useEffect(() => {
        supabase.from('vpl_auction_state').select('*').eq('id', 1).maybeSingle().then(({ data }) => { if (data) setAuctionState(data); });
        const ch = supabase.channel('auction_viewer')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vpl_auction_state' }, (p) => {
                setAuctionState(p.new);
                setBidFlash(true);
                setTimeout(() => setBidFlash(false), 400);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vpl_registrations' }, () => {
                supabase.from("vpl_registrations").select("account_id, team_name, price").eq("season", 2).then(({ data }) => {
                    if (data) setPlayers(prev => prev.map(p => {
                        const u = data.find((d: any) => d.account_id === p.accountId);
                        return u ? { ...p, teamName: u.team_name, price: u.price || 0 } : p;
                    }));
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vpl_auction_history' }, (p) => {
                const h = p.new;
                const pl = playersRef.current.find(x => x.accountId === h.player_id);
                const t = teams.find(x => x.id === h.team_id);
                if (pl && t) { setSoldEvent({ player: pl, team: t, amount: h.bid_amount }); setTimeout(() => setSoldEvent(null), 8000); }
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);

    const activePlayer = useMemo(() => players.find(p => p.accountId === auctionState.active_player_id), [players, auctionState.active_player_id]);
    const leadingTeam = useMemo(() => teams.find(t => t.id === auctionState.leading_team_id), [teams, auctionState.leading_team_id]);
    const teamStats = useMemo(() => {
        const s: Record<string, { spent: number, count: number, currentPurse: number }> = {};
        teams.forEach(t => {
            const roster = players.filter(p => p.teamName === t.name);
            const spent = roster.reduce((sum, p) => sum + p.price, 0);
            s[t.id] = { spent, count: roster.length, currentPurse: t.purse - spent };
        });
        return s;
    }, [players, teams]);

    const poolPlayers = useMemo(() => {
        if (!auctionState.show_pool_to_viewers || !auctionState.active_pool) return [];
        return players.filter(p => !p.isCaptain && p.tier?.toUpperCase() === auctionState.active_pool?.toUpperCase());
    }, [players, auctionState.active_pool, auctionState.show_pool_to_viewers]);

    const accentColor = leadingTeam?.color || '#eab308';

    return (
        <div className="min-h-[100dvh] bg-[#080808] text-white flex flex-col md:flex-row md:overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                .bid-flash { animation: bidpulse 0.4s ease-out; }
                @keyframes bidpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
                .ticker-scroll { animation: ticker 20s linear infinite; }
                @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .sold-glow { animation: soldglow 1s ease-in-out infinite alternate; }
                @keyframes soldglow { from { text-shadow: 0 0 20px rgba(52,211,153,0.3); } to { text-shadow: 0 0 60px rgba(52,211,153,0.8), 0 0 120px rgba(52,211,153,0.3); } }
                ::-webkit-scrollbar { width: 3px; height: 3px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #333; border-radius: 99px; }
                .purse-bar { transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
            `}</style>

            {/* LEFT STAGE */}
            <div className="flex-[3] relative flex flex-col items-center justify-center min-h-[55vh] md:min-h-screen overflow-hidden">
                {/* Ambient */}
                <div className="absolute inset-0 transition-colors duration-2000" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${accentColor}18 0%, transparent 70%)` }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #080808 0%, transparent 30%, transparent 70%, #080808 100%)' }} />

                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        <span className="text-[10px] font-bold tracking-[0.4em] text-zinc-400 uppercase">Live Auction</span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/50 border border-white/8 backdrop-blur-md px-4 py-1.5 rounded-full">
                        <Trophy size={12} className="text-amber-500" />
                        <span className="text-[10px] font-bold tracking-[0.35em] text-zinc-300 uppercase">VPL Season 2</span>
                    </div>
                    {auctionState.active_pool && (
                        <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase">{auctionState.active_pool} Pool</span>
                        </div>
                    )}
                </div>

                {/* Center Content */}
                <AnimatePresence mode="wait">
                    {auctionState.status === 'WAITING' ? (
                        <motion.div key="waiting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="relative z-10 flex flex-col items-center text-center px-8">
                            <Clock size={40} className="text-amber-500 mb-8 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
                            <p className="text-[10px] font-bold tracking-[0.5em] text-amber-500 uppercase mb-4">Auction Begins In</p>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-10 text-white">Get Ready</h2>
                            {timeLeft && (
                                <div className="flex gap-3 md:gap-6">
                                    {[['d', timeLeft.d, 'Days'], ['h', timeLeft.h, 'Hours'], ['m', timeLeft.m, 'Mins'], ['s', timeLeft.s, 'Secs']].map(([key, val, label]) => (
                                        <div key={key as string} className="flex flex-col items-center">
                                            <div className="bg-white/5 border border-white/10 backdrop-blur rounded-2xl px-4 py-3 md:px-8 md:py-5 min-w-[60px] md:min-w-[100px]">
                                                <span className="text-4xl md:text-7xl font-black text-white tabular-nums">{typeof val === 'number' ? String(val).padStart(2, '0') : val}</span>
                                            </div>
                                            <span className="text-[9px] md:text-xs text-amber-500 tracking-[0.3em] font-bold uppercase mt-3">{label as string}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : auctionState.status === 'PAUSED' ? (
                        <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center text-center">
                            <PauseCircle size={56} className="text-amber-500/60 mb-6" />
                            <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-4">Paused</h2>
                            <p className="text-sm text-zinc-500 tracking-[0.3em] uppercase font-bold">We'll be back shortly</p>
                        </motion.div>
                    ) : soldEvent ? (
                        <motion.div
                            key={`sold-${soldEvent.player.accountId}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="relative z-10 flex flex-col items-center text-center px-8 w-full max-w-3xl"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="flex items-center gap-2 mb-6"
                            >
                                <Gavel size={14} className="text-emerald-400" />
                                <span className="sold-glow text-emerald-400 text-[11px] font-bold tracking-[0.5em] uppercase">Player Sold</span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="text-5xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none uppercase mb-10"
                                style={{ textShadow: '0 0 80px rgba(255,255,255,0.1)' }}
                            >
                                {soldEvent.player.name}
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12"
                            >
                                <div className="text-center">
                                    <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase mb-2">Sold For</p>
                                    <p className="text-5xl md:text-7xl font-black font-mono text-emerald-400">₹{soldEvent.amount}</p>
                                </div>
                                <div className="w-px h-16 bg-white/10 hidden sm:block" />
                                <div className="text-center">
                                    <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase mb-3">Bought By</p>
                                    <div className="flex items-center gap-3">
                                        {soldEvent.team.logoUrl
                                            ? <img src={soldEvent.team.logoUrl} alt={soldEvent.team.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20" />
                                            : <div className="w-4 h-12 rounded-sm" style={{ backgroundColor: soldEvent.team.color }} />}
                                        <span className="text-2xl md:text-3xl font-bold" style={{ color: soldEvent.team.color }}>{soldEvent.team.name}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : activePlayer ? (
                        <motion.div
                            key={activePlayer.accountId}
                            initial={{ opacity: 0, filter: 'blur(12px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, filter: 'blur(8px)' }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-3xl"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <span className="bg-white/5 border border-white/10 text-zinc-400 text-[9px] font-bold px-3 py-1 rounded-full tracking-[0.3em] uppercase">{activePlayer.tier}</span>
                                <span className="bg-white/5 border border-white/10 text-zinc-400 text-[9px] font-bold px-3 py-1 rounded-full tracking-[0.3em] uppercase">{activePlayer.role}</span>
                            </div>

                            <h1 className="text-5xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none uppercase mb-10">
                                {activePlayer.name}
                            </h1>

                            <div className="relative">
                                <div className={`bg-black/60 backdrop-blur-xl border rounded-2xl px-12 py-7 text-center min-w-[260px] transition-all duration-300 ${bidFlash ? 'border-amber-500/80 shadow-[0_0_40px_rgba(234,179,8,0.25)]' : 'border-white/8'}`}>
                                    <p className="text-[9px] font-bold tracking-[0.45em] text-zinc-500 uppercase mb-3">Current Bid</p>
                                    <motion.div
                                        key={auctionState.current_bid}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="text-6xl md:text-8xl font-black font-mono text-white leading-none"
                                    >
                                        ₹{auctionState.current_bid}
                                    </motion.div>
                                    <div className="mt-5 h-8 flex items-center justify-center">
                                        <AnimatePresence mode="wait">
                                            {leadingTeam ? (
                                                <motion.div
                                                    key={leadingTeam.id}
                                                    initial={{ opacity: 0, scale: 0.85 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/10 bg-white/5"
                                                >
                                                    {leadingTeam.logoUrl
                                                        ? <img src={leadingTeam.logoUrl} alt={leadingTeam.name} className="w-5 h-5 rounded-full object-cover" />
                                                        : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: leadingTeam.color }} />}
                                                    <span className="text-xs font-bold tracking-widest uppercase" style={{ color: leadingTeam.color }}>{leadingTeam.name}</span>
                                                    <span className="text-[9px] text-zinc-500 font-bold tracking-widest">LEADING</span>
                                                </motion.div>
                                            ) : (
                                                <span className="text-xs text-zinc-600 font-bold tracking-widest uppercase">Base Price</span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 flex flex-col items-center text-zinc-700">
                            <div className="w-px h-20 bg-gradient-to-b from-transparent to-zinc-800 mb-6" />
                            <p className="text-sm font-bold tracking-[0.4em] uppercase">Waiting for next player</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pool Ticker at bottom */}
                {auctionState.show_pool_to_viewers && auctionState.active_pool && poolPlayers.length > 0 && !soldEvent && (
                    <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 bg-black/70 backdrop-blur overflow-hidden">
                        <div className="flex overflow-hidden py-3 px-0">
                            <div className="ticker-scroll flex gap-0 whitespace-nowrap">
                                {[...poolPlayers, ...poolPlayers].map((p, i) => {
                                    const isSold = p.teamName !== 'UNSOLD' && p.teamName !== 'PASSED';
                                    const isActive = p.accountId === auctionState.active_player_id;
                                    return (
                                        <span key={`${p.accountId}-${i}`} className={`inline-flex items-center gap-2 px-5 text-xs font-bold border-r border-white/5 ${isActive ? 'text-amber-400' : isSold ? 'text-zinc-600 line-through' : 'text-zinc-400'}`}>
                                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />}
                                            {p.name}
                                            {isSold && <span className="text-[9px] text-zinc-600 ml-1 no-underline" style={{ textDecoration: 'none' }}>• {p.teamName}</span>}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="flex-[1] flex flex-col bg-[#0a0a0a] border-l border-white/5 md:max-h-screen">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2.5">
                    <Coins size={14} className="text-amber-500" />
                    <h3 className="text-[10px] font-bold tracking-[0.4em] text-zinc-400 uppercase">Purse Tracker</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {teams.map(team => {
                        const stats = teamStats[team.id];
                        const pct = Math.max(0, Math.min(100, (stats.currentPurse / team.purse) * 100));
                        return (
                            <div
                                key={team.id}
                                onClick={() => setSelectedTeam(team)}
                                className="group relative bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 rounded-xl p-4 cursor-pointer transition-all duration-200 overflow-hidden"
                            >
                                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5">
                                    <div className="purse-bar h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: team.color + 'aa' }} />
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        {team.logoUrl
                                            ? <img src={team.logoUrl} alt={team.shortName} className="w-7 h-7 rounded-full object-cover" />
                                            : <div className="w-1 h-7 rounded-full" style={{ backgroundColor: team.color }} />}
                                        <span className="text-sm font-bold tracking-wider uppercase">{team.shortName}</span>
                                    </div>
                                    <span className="font-mono font-black text-sm text-emerald-400">₹{stats.currentPurse}</span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-zinc-600 font-bold tracking-wider uppercase">
                                    <div className="flex items-center gap-1">
                                        <Users size={10} />
                                        <span>{stats.count}/{AUCTION_CONSTANTS.MAX_PLAYERS}</span>
                                    </div>
                                    <span>Spent ₹{stats.spent}</span>
                                </div>

                                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
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
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                        onClick={() => setSelectedTeam(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 24 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0d0d0d] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="relative p-5 border-b border-white/8 overflow-hidden">
                                <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${selectedTeam.color}44 0%, transparent 60%)` }} />
                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {selectedTeam.logoUrl
                                            ? <img src={selectedTeam.logoUrl} alt={selectedTeam.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10" />
                                            : <div className="w-2 h-11 rounded-sm" style={{ backgroundColor: selectedTeam.color }} />}
                                        <div>
                                            <h2 className="text-xl font-black uppercase tracking-wider">{selectedTeam.name}</h2>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[10px] font-mono text-emerald-400 font-bold">₹{teamStats[selectedTeam.id].currentPurse} left</span>
                                                <span className="text-[10px] text-zinc-600">·</span>
                                                <span className="text-[10px] text-zinc-500 font-bold">{teamStats[selectedTeam.id].count}/{AUCTION_CONSTANTS.MAX_PLAYERS} players</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedTeam(null)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                                        <X size={16} className="text-zinc-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto flex-1">
                                {players.filter(p => p.teamName === selectedTeam.name).length === 0 ? (
                                    <div className="text-center py-16 text-zinc-700 font-bold tracking-widest uppercase text-xs">
                                        No players yet
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {players.filter(p => p.teamName === selectedTeam.name).map(p => (
                                            <div key={p.accountId} className="flex items-center justify-between p-3 bg-white/3 hover:bg-white/5 border border-white/5 rounded-xl transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {p.isCaptain && (
                                                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedTeam.color + '22', border: `1px solid ${selectedTeam.color}44` }}>
                                                            <Crown size={12} style={{ color: selectedTeam.color }} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold tracking-wide">{p.name}</p>
                                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">{p.role} · {p.tier}</p>
                                                    </div>
                                                </div>
                                                <span className="font-mono font-bold text-amber-500 text-sm">₹{p.price}</span>
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
