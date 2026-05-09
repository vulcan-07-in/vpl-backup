"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { AUCTION_CONSTANTS, calculateMaxBid, getBasePrice } from "@/lib/auction";
import { motion, AnimatePresence } from "framer-motion";
import { Hammer, Undo2, Ban, Plus, Minus, UserCircle2, Loader2, RefreshCw } from "lucide-react";

interface Player {
    accountId: string;
    name: string;
    role: string;
    tier: string;
    teamName: string;
    price: number;
}

interface Team {
    id: string;
    name: string;
    color: string;
    shortName: string;
}

export default function AuctioneerClient({ players: initialPlayers, teams }: { players: Player[], teams: Team[] }) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [auctionState, setAuctionState] = useState<any>({ status: 'IDLE', active_player_id: null, current_bid: 0, leading_team_id: null });
    const [selectedSet, setSelectedSet] = useState<string>("MARQUEE");
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    // Sync state with DB in real-time
    useEffect(() => {
        // Initial fetch
        supabase.from('vpl_auction_state').select('*').eq('id', 1).single().then(({ data }) => {
            if (data) setAuctionState(data);
        });

        const channel = supabase.channel('auction_state')
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
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Derived logic
    const activePlayer = useMemo(() => players.find(p => p.accountId === auctionState.active_player_id), [players, auctionState.active_player_id]);
    
    // Team Budgets & Slots
    const teamStats = useMemo(() => {
        const stats: Record<string, { spent: number, count: number, currentPurse: number, maxBid: number }> = {};
        teams.forEach(t => {
            const roster = players.filter(p => p.teamName === t.name);
            const spent = roster.reduce((sum, p) => sum + p.price, 0);
            const count = roster.length;
            const currentPurse = AUCTION_CONSTANTS.MAX_BUDGET - spent;
            // Get minimum base price for dynamic ceiling calculation
            const minBasePrice = Math.min(...Object.values(AUCTION_CONSTANTS.BASE_PRICES));
            const maxBid = calculateMaxBid(currentPurse, count, minBasePrice);
            
            stats[t.id] = { spent, count, currentPurse, maxBid };
        });
        return stats;
    }, [players, teams]);

    const performAction = async (action: string, payload: any = {}) => {
        setLoadingAction(action);
        try {
            await fetch('/api/admin/auction/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, payload })
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAction(null);
        }
    };

    const drawPlayer = () => {
        let pool = players.filter(p => p.tier === selectedSet && p.teamName === 'UNSOLD');
        if (selectedSet === "PASSED") {
            pool = players.filter(p => p.teamName === 'PASSED');
        }
        
        if (pool.length === 0) {
            alert(`No more players available in ${selectedSet}.`);
            return;
        }

        // Shuffle logic (crypto random)
        const randomIndex = Math.floor(Math.random() * pool.length);
        const player = pool[randomIndex];

        performAction('DRAW', { accountId: player.accountId, tier: player.tier });
    };

    const handleBid = (teamId: string) => {
        const team = teamStats[teamId];
        const nextBid = auctionState.current_bid === 0 ? getBasePrice(activePlayer?.tier) : auctionState.current_bid + 100;

        if (nextBid > team.maxBid) {
            alert("Dynamic Ceiling Reached! Team does not have budget for this bid.");
            return;
        }
        if (team.count >= AUCTION_CONSTANTS.MAX_PLAYERS) {
            alert("Roster is full!");
            return;
        }

        performAction('BID', { amount: nextBid, teamId });
    };

    const setCustomBid = () => {
        const val = prompt("Enter custom bid amount:");
        if (val && !isNaN(parseInt(val))) {
            const amount = parseInt(val);
            if (auctionState.leading_team_id) {
                const team = teamStats[auctionState.leading_team_id];
                if (amount > team.maxBid) {
                    alert("Exceeds Dynamic Ceiling!");
                    return;
                }
                performAction('BID', { amount, teamId: auctionState.leading_team_id });
            } else {
                alert("Select a team first by clicking their paddle.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT: Player Under Hammer */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                        <div className="flex items-center gap-4">
                            <Hammer className="text-amber-500" />
                            <h2 className="text-xl font-bold tracking-widest uppercase">The Hammer</h2>
                        </div>
                        <div className="flex gap-2">
                            <select 
                                value={selectedSet}
                                onChange={(e) => setSelectedSet(e.target.value)}
                                className="bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:border-amber-500/50 font-bold tracking-widest"
                            >
                                <option value="MARQUEE">SET 1: MARQUEE</option>
                                <option value="FEMALE">SET 2: FEMALE</option>
                                <option value="TIER 1">SET 3: TIER 1</option>
                                <option value="TIER 2">SET 4: TIER 2</option>
                                <option value="PASSED">ROUND 2: PASSED</option>
                            </select>
                            <button 
                                onClick={drawPlayer}
                                disabled={auctionState.status !== 'IDLE' || loadingAction === 'DRAW'}
                                className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                                {loadingAction === 'DRAW' ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                                DRAW PLAYER
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {activePlayer ? (
                            <motion.div 
                                key={activePlayer.accountId}
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    <div>
                                        <div className="flex gap-2 mb-6">
                                            <span className="bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded tracking-widest">{activePlayer.tier}</span>
                                            <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-3 py-1 rounded tracking-widest">{activePlayer.role}</span>
                                        </div>
                                        <h1 className="text-5xl md:text-6xl font-black mb-2 leading-none">{activePlayer.name}</h1>
                                        <p className="text-zinc-500 font-mono mb-8">{activePlayer.accountId}</p>

                                        {/* Current Bid Display */}
                                        <div className="bg-black/50 border border-zinc-800 rounded-2xl p-6">
                                            <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-2">Current Bid</p>
                                            <div className="text-7xl font-mono font-bold text-amber-500">
                                                {auctionState.current_bid}
                                            </div>
                                            {auctionState.leading_team_id && (
                                                <div className="mt-4 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: teams.find(t => t.id === auctionState.leading_team_id)?.color }} />
                                                    <span className="font-bold text-zinc-300">
                                                        {teams.find(t => t.id === auctionState.leading_team_id)?.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-end gap-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => performAction('BID', { amount: auctionState.current_bid + 100, teamId: auctionState.leading_team_id })}
                                                disabled={!auctionState.leading_team_id}
                                                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 py-4 rounded-xl font-bold text-xl transition-colors"
                                            >
                                                + 100
                                            </button>
                                            <button 
                                                onClick={() => performAction('BID', { amount: auctionState.current_bid + 500, teamId: auctionState.leading_team_id })}
                                                disabled={!auctionState.leading_team_id}
                                                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 py-4 rounded-xl font-bold text-xl transition-colors"
                                            >
                                                + 500
                                            </button>
                                            <button 
                                                onClick={setCustomBid}
                                                disabled={!auctionState.leading_team_id}
                                                className="col-span-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 py-3 rounded-xl font-bold text-sm tracking-widest transition-colors"
                                            >
                                                CUSTOM BID
                                            </button>
                                        </div>

                                        <div className="flex gap-4 mt-8">
                                            <button 
                                                onClick={() => performAction('PASS')}
                                                disabled={loadingAction === 'PASS' || auctionState.leading_team_id !== null}
                                                className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white disabled:opacity-50 py-4 rounded-xl font-black tracking-widest transition-all flex items-center justify-center gap-2"
                                            >
                                                <Ban size={20} /> PASS
                                            </button>
                                            <button 
                                                onClick={() => performAction('SOLD')}
                                                disabled={loadingAction === 'SOLD' || !auctionState.leading_team_id}
                                                className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 py-4 rounded-xl font-black tracking-[0.2em] transition-transform active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Hammer size={20} /> SOLD
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl h-[400px] flex flex-col items-center justify-center text-zinc-600"
                            >
                                <UserCircle2 size={64} className="mb-4 opacity-50" />
                                <p className="font-bold tracking-widest uppercase">No Player Active</p>
                                <p className="text-sm mt-2">Draw a player from the sets above.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Undo Bar */}
                    <div className="flex justify-end">
                        <button 
                            onClick={() => performAction('UNDO')}
                            disabled={loadingAction === 'UNDO' || auctionState.status !== 'IDLE'}
                            className="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-bold tracking-widest transition-colors disabled:opacity-50"
                        >
                            <Undo2 size={14} /> UNDO LAST ACTION
                        </button>
                    </div>
                </div>

                {/* RIGHT: Team Paddles (Purse Tracker) */}
                <div className="lg:col-span-4 flex flex-col gap-4 h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                    <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase sticky top-0 bg-[#050505] py-2 z-10">
                        Team Paddles
                    </h3>
                    {teams.map(team => {
                        const stats = teamStats[team.id];
                        const isCapped = stats.count >= AUCTION_CONSTANTS.MAX_PLAYERS;
                        const isBankrupt = stats.maxBid <= 0;
                        const isDisabled = !activePlayer || isCapped || isBankrupt;

                        return (
                            <button
                                key={team.id}
                                onClick={() => handleBid(team.id)}
                                disabled={isDisabled}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                                    auctionState.leading_team_id === team.id 
                                        ? 'bg-amber-500/10 border-amber-500' 
                                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 disabled:opacity-40 disabled:hover:border-zinc-800'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: team.color }} />
                                    <div>
                                        <p className="font-bold">{team.shortName}</p>
                                        <p className="text-[10px] text-zinc-500 font-mono">{stats.count} / {AUCTION_CONSTANTS.MAX_PLAYERS} SQUAD</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-bold text-emerald-400">{stats.currentPurse}</p>
                                    <p className="text-[9px] text-zinc-600 tracking-widest uppercase">Max Bid: {stats.maxBid}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
