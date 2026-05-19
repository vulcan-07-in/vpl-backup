"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import { AUCTION_CONSTANTS, calculateMaxBid, getBasePrice, getBidIncrement } from "@/lib/auction";
import { motion, AnimatePresence } from "framer-motion";
import { Hammer, Undo2, Ban, UserCircle2, Loader2, RefreshCw, Shuffle, Eye, EyeOff, Settings, Zap, Play, Pause } from "lucide-react";

interface Player {
    accountId: string;
    name: string;
    role: string;
    tier: string;
    gender: string;
    teamName: string;
    price: number;
    isCaptain: boolean;
}

interface Team {
    id: string;
    name: string;
    color: string;
    shortName: string;
    purse: number;
    paddleNumber?: number;
}

export default function AuctioneerClient({ players: initialPlayers, teams }: { players: Player[], teams: Team[] }) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [auctionState, setAuctionState] = useState<any>({ status: 'IDLE', active_player_id: null, current_bid: 0, leading_team_id: null, active_pool: 'MARQUEE', show_pool_to_viewers: true, bid_increment: null });
    const [selectedPool, setSelectedPool] = useState<string>("MARQUEE");
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [showForcePanel, setShowForcePanel] = useState(false);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [wipeConfirm, setWipeConfirm] = useState(false);
    const [undoConfirm, setUndoConfirm] = useState(false);
    const [forceTeamId, setForceTeamId] = useState("");
    const [forceBidAmount, setForceBidAmount] = useState("");
    const [customIncrement, setCustomIncrement] = useState<number | null>(null);
    const [poolQueue, setPoolQueue] = useState<Player[]>([]);
    const [customBasePrice, setCustomBasePrice] = useState<string>("");

    // Bid inflight lock — prevents rapid double-tap race conditions
    const bidInflight = useRef(false);
    const bidLockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const auctionStateRef = useRef(auctionState);
    useEffect(() => { auctionStateRef.current = auctionState; }, [auctionState]);

    const pools = useMemo(() => {
        const tierSet = new Set(players.map(p => p.tier?.toUpperCase()).filter(Boolean));
        const arr = Array.from(tierSet);
        arr.push("PASSED");
        return arr;
    }, [players]);

    // Set default base price when pool changes
    useEffect(() => {
        if (selectedPool && selectedPool !== "PASSED") {
            setCustomBasePrice(getBasePrice(selectedPool).toString());
        }
    }, [selectedPool]);

    const fetchHistory = () => {
        supabase.from('vpl_auction_history').select('*').order('timestamp', { ascending: false }).limit(10).then(({ data }) => {
            if (data) setHistoryLogs(data);
        });
    };

    useEffect(() => {
        supabase.from('vpl_auction_state').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
            if (data) { setAuctionState(data); if (data.active_pool) setSelectedPool(data.active_pool); }
        });
        fetchHistory();

        const channel = supabase.channel('auctioneer_state')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vpl_auction_state' }, (payload) => {
                setAuctionState(payload.new);
                // Release bid lock when server echo arrives
                if (bidInflight.current) {
                    bidInflight.current = false;
                    if (bidLockTimeout.current) clearTimeout(bidLockTimeout.current);
                }
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vpl_auction_history' }, () => { fetchHistory(); })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Build pool queue
    useEffect(() => {
        let pool: Player[];
        if (selectedPool === "PASSED") {
            pool = players.filter(p => p.teamName === 'PASSED' && !p.isCaptain);
        } else {
            pool = players.filter(p => p.tier?.toUpperCase() === selectedPool && p.teamName === 'UNSOLD' && !p.isCaptain);
        }
        setPoolQueue(pool);
    }, [players, selectedPool]);

    const activePlayer = useMemo(() => players.find(p => p.accountId === auctionState.active_player_id), [players, auctionState.active_player_id]);

    const teamStats = useMemo(() => {
        const stats: Record<string, { spent: number, count: number, currentPurse: number, maxBid: number }> = {};
        teams.forEach(t => {
            const roster = players.filter(p => p.teamName === t.name);
            const spent = roster.reduce((sum, p) => sum + p.price, 0);
            const count = roster.length;
            const currentPurse = t.purse - spent;
            const minBasePrice = Math.min(...Object.values(AUCTION_CONSTANTS.BASE_PRICES));
            const maxBid = calculateMaxBid(currentPurse, count, minBasePrice);
            stats[t.id] = { spent, count, currentPurse, maxBid };
        });
        return stats;
    }, [players, teams]);

    const performAction = async (action: string, payload: any = {}): Promise<boolean> => {
        setLoadingAction(action);
        try {
            const res = await fetch('/api/admin/auction/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, payload })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(`❌ ${data.error || 'Unknown error'}`);
                return false;
            }
            return true;
        } catch (e: any) {
            alert(`❌ Network error: ${e.message}`);
            return false;
        } finally {
            setLoadingAction(null);
        }
    };

    const shuffleAndDraw = () => {
        if (poolQueue.length === 0) { alert(`No more players in ${selectedPool}.`); return; }
        const randomIndex = Math.floor(Math.random() * poolQueue.length);
        const player = poolQueue[randomIndex];
        performAction('DRAW', { accountId: player.accountId, tier: player.tier, basePrice: parseInt(customBasePrice, 10) || undefined });
    };

    const selectPlayer = (player: Player) => {
        performAction('DRAW', { accountId: player.accountId, tier: player.tier, basePrice: parseInt(customBasePrice, 10) || undefined });
    };

    const handleBid = useCallback((teamId: string) => {
        // Drop click if a bid is already inflight — prevents rapid-fire race conditions
        if (bidInflight.current) return;

        const state = auctionStateRef.current;
        if (!state.active_player_id) return;

        const team = teamStats[teamId];
        const increment = getBidIncrement(state.current_bid, customIncrement || state.bid_increment);
        const nextBid = state.leading_team_id === null
            ? state.current_bid
            : state.current_bid + increment;

        if (nextBid > team.maxBid) { alert(`❌ ${teams.find(t => t.id === teamId)?.name}: Ceiling reached! Max bid: ${team.maxBid}`); return; }
        if (team.count >= AUCTION_CONSTANTS.MAX_PLAYERS) { alert(`❌ Roster full!`); return; }

        // Lock immediately before optimistic update
        bidInflight.current = true;
        // Safety valve: auto-release lock after 2s if realtime echo never arrives
        if (bidLockTimeout.current) clearTimeout(bidLockTimeout.current);
        bidLockTimeout.current = setTimeout(() => { bidInflight.current = false; }, 2000);

        // Optimistic update for zero latency feel
        setAuctionState((prev: any) => ({ ...prev, current_bid: nextBid, leading_team_id: teamId }));

        performAction('BID', { amount: nextBid, teamId }).then((ok) => {
            if (!ok) {
                // Roll back optimistic update on server rejection
                bidInflight.current = false;
                if (bidLockTimeout.current) clearTimeout(bidLockTimeout.current);
                setAuctionState((prev: any) => ({ ...prev, current_bid: state.current_bid, leading_team_id: state.leading_team_id }));
            }
        });
    }, [teamStats, customIncrement, teams]);

    const handleForceSell = () => {
        if (!forceTeamId || !forceBidAmount) { alert("Select team and enter amount."); return; }
        performAction('FORCE_SELL', { teamId: forceTeamId, amount: parseInt(forceBidAmount, 10) });
        setShowForcePanel(false);
        setForceTeamId("");
        setForceBidAmount("");
    };

    const currentIncrement = getBidIncrement(auctionState.current_bid, customIncrement || auctionState.bid_increment);

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-20 pb-[300px] px-4 md:px-6">
            <div className="max-w-[1600px] mx-auto flex flex-col gap-4">

                {/* Top Section: Controls, Player, and History */}
                <div className="flex flex-col xl:flex-row gap-4">
                    {/* Left Col: Player & Controls */}
                    <div className="flex-[3] flex flex-col gap-4">
                    {/* Top bar: Pool selector + controls */}
                    <div className="flex flex-wrap items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 gap-3">
                        <div className="flex items-center gap-4">
                            <Hammer className="text-amber-500" />
                            <h2 className="text-lg font-bold tracking-widest uppercase">Auctioneer</h2>
                        </div>
                        <div className="flex gap-2 flex-wrap items-center">
                            <select
                                value={selectedPool}
                                onChange={(e) => setSelectedPool(e.target.value)}
                                className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm font-bold tracking-widest"
                            >
                                {pools.map(p => <option key={p} value={p}>{p} ({p === "PASSED" ? players.filter(pl => pl.teamName === 'PASSED' && !pl.isCaptain).length : players.filter(pl => pl.tier?.toUpperCase() === p && pl.teamName === 'UNSOLD' && !pl.isCaptain).length})</option>)}
                            </select>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Base:</span>
                                <input
                                    type="number"
                                    value={customBasePrice}
                                    onChange={e => setCustomBasePrice(e.target.value)}
                                    placeholder="Base Price"
                                    className="w-20 bg-black border border-zinc-800 rounded-lg px-2 py-2 text-sm font-bold text-amber-500 text-center"
                                />
                            </div>
                            <button
                                onClick={shuffleAndDraw}
                                disabled={auctionState.status !== 'IDLE' || loadingAction === 'DRAW'}
                                className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                                {loadingAction === 'DRAW' ? <Loader2 className="animate-spin" size={16}/> : <Shuffle size={16}/>}
                                DRAW
                            </button>
                            {auctionState.status === 'WAITING' && (
                                <button
                                    onClick={() => performAction('START')}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                                >
                                    <Play size={16}/> START AUCTION
                                </button>
                            )}
                            {(auctionState.status === 'IDLE' || auctionState.status === 'PAUSED' || auctionState.status === 'BIDDING') && (
                                <button
                                    onClick={() => performAction(auctionState.status === 'PAUSED' ? 'START' : 'PAUSE')}
                                    className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${auctionState.status === 'PAUSED' ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-amber-500'}`}
                                >
                                    {auctionState.status === 'PAUSED' ? <Play size={16}/> : <Pause size={16}/>}
                                    {auctionState.status === 'PAUSED' ? 'RESUME' : 'PAUSE'}
                                </button>
                            )}
                            <button
                                onClick={() => performAction('UPDATE_CONFIG', { show_pool_to_viewers: !auctionState.show_pool_to_viewers })}
                                className={`p-2 rounded-lg border transition-all ${auctionState.show_pool_to_viewers ? 'border-emerald-500 text-emerald-500' : 'border-zinc-700 text-zinc-500'}`}
                                title={auctionState.show_pool_to_viewers ? "Pool visible to viewers" : "Pool hidden from viewers"}
                            >
                                {auctionState.show_pool_to_viewers ? <Eye size={16}/> : <EyeOff size={16}/>}
                            </button>
                        </div>
                    </div>

                    {/* Pool Queue (collapsible) */}
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Queue · {poolQueue.length} remaining</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-600">Increment:</span>
                                <div className="flex gap-1">
                                    {[50, 100, 200].map(inc => (
                                        <button
                                            key={inc}
                                            onClick={() => setCustomIncrement(inc)}
                                            className={`px-2 py-1 text-[10px] font-bold rounded ${customIncrement === inc ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                        >
                                            +{inc}
                                        </button>
                                    ))}
                                    <button onClick={() => setCustomIncrement(null)} className={`px-2 py-1 text-[10px] font-bold rounded ${!customIncrement ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                                        Auto
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={customIncrement || ""}
                                    onChange={e => setCustomIncrement(e.target.value ? parseInt(e.target.value, 10) : null)}
                                    placeholder="Custom"
                                    className="w-16 bg-black border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-amber-500 ml-1"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {poolQueue.slice(0, 15).map(p => (
                                <button 
                                    key={p.accountId} 
                                    onClick={() => { if (auctionState.status === 'IDLE') selectPlayer(p); }}
                                    disabled={auctionState.status !== 'IDLE'}
                                    className="shrink-0 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-left hover:border-amber-500 disabled:opacity-50 disabled:hover:border-zinc-800 transition-colors"
                                >
                                    <p className="font-bold truncate max-w-[100px]">{p.name}</p>
                                    <p className="text-zinc-500 text-[10px]">{p.role}</p>
                                </button>
                            ))}
                            {poolQueue.length > 15 && <div className="shrink-0 flex items-center px-3 text-zinc-600 text-xs">+{poolQueue.length - 15} more</div>}
                        </div>
                    </div>

                    {/* Active Player Card */}
                    <AnimatePresence mode="wait">
                        {activePlayer ? (
                            <motion.div
                                key={activePlayer.accountId}
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    <div>
                                        <div className="flex gap-2 mb-4">
                                            <span className="bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded tracking-widest">{activePlayer.tier}</span>
                                            <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-3 py-1 rounded tracking-widest">{activePlayer.role}</span>
                                            <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-3 py-1 rounded tracking-widest">{activePlayer.gender}</span>
                                        </div>
                                        <h1 className="text-4xl md:text-5xl font-black mb-2 leading-none">{activePlayer.name}</h1>
                                        <div className="bg-black/50 border border-zinc-800 rounded-2xl p-5 mt-4">
                                            <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-2">Current Bid</p>
                                            <div className="text-6xl font-mono font-bold text-amber-500">{auctionState.current_bid}</div>
                                            <p className="text-xs text-zinc-600 mt-1">Increment: +{currentIncrement}</p>
                                            {auctionState.leading_team_id && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: teams.find(t => t.id === auctionState.leading_team_id)?.color }} />
                                                    <span className="font-bold text-zinc-300">{teams.find(t => t.id === auctionState.leading_team_id)?.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-end gap-3">
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setAuctionState((prev: any) => ({ ...prev, status: 'IDLE' }));
                                                    performAction('PASS');
                                                }}
                                                disabled={loadingAction === 'PASS' || auctionState.leading_team_id !== null}
                                                className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white disabled:opacity-50 py-3 rounded-xl font-black tracking-widest transition-all flex items-center justify-center gap-2"
                                            >
                                                <Ban size={18} /> PASS
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAuctionState((prev: any) => ({ ...prev, status: 'IDLE' }));
                                                    performAction('SOLD');
                                                }}
                                                disabled={loadingAction === 'SOLD' || !auctionState.leading_team_id}
                                                className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 py-3 rounded-xl font-black tracking-[0.2em] transition-transform active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Hammer size={18} /> SOLD
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setShowForcePanel(!showForcePanel)}
                                            className="text-xs text-zinc-500 hover:text-amber-500 py-2 flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <Zap size={12} /> Manual Override
                                        </button>
                                        {showForcePanel && (
                                            <div className="bg-black border border-amber-500/30 rounded-xl p-4 space-y-3">
                                                <select value={forceTeamId} onChange={e => setForceTeamId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm">
                                                    <option value="">Select Team</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                <input type="number" value={forceBidAmount} onChange={e => setForceBidAmount(e.target.value)} placeholder="Final bid amount" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm font-mono" />
                                                <button onClick={handleForceSell} className="w-full bg-amber-500 text-black py-2 rounded-lg font-bold text-sm">FORCE FINALIZE</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl h-[300px] flex flex-col items-center justify-center text-zinc-600">
                                <UserCircle2 size={64} className="mb-4 opacity-50" />
                                <p className="font-bold tracking-widest uppercase">No Player Active</p>
                                <p className="text-sm mt-2">Draw a player from the pool above.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Controls bar */}
                    <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-4">
                            {resetConfirm ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500">Confirm Reset?</span>
                                    <button onClick={() => { performAction('RESET'); setResetConfirm(false); }} className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">YES</button>
                                    <button onClick={() => setResetConfirm(false)} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-bold">NO</button>
                                </div>
                            ) : (
                                <button onClick={() => setResetConfirm(true)} className="text-amber-500/80 hover:text-amber-400 flex items-center gap-2 text-[10px] font-bold tracking-widest transition-colors uppercase">
                                    ⚠️ Reset Current
                                </button>
                            )}

                            {wipeConfirm ? (
                                <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
                                    <span className="text-xs text-red-500 font-bold">Wipe ALL data?</span>
                                    <button onClick={() => { performAction('WIPE_ALL'); setWipeConfirm(false); }} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">DO IT</button>
                                    <button onClick={() => setWipeConfirm(false)} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-bold">CANCEL</button>
                                </div>
                            ) : (
                                <button onClick={() => setWipeConfirm(true)} className="text-red-500/60 hover:text-red-400 flex items-center gap-2 text-[10px] font-bold tracking-widest transition-colors uppercase border-l border-zinc-800 pl-4">
                                    ☢️ WIPE ALL DATA
                                </button>
                            )}
                        </div>

                        {undoConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500">Confirm Undo?</span>
                                <button onClick={() => { performAction('UNDO'); setUndoConfirm(false); }} className="bg-amber-500 text-black px-2 py-1 rounded text-xs font-bold">YES</button>
                                <button onClick={() => setUndoConfirm(false)} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-bold">NO</button>
                            </div>
                        ) : (
                            <button onClick={() => setUndoConfirm(true)} disabled={loadingAction === 'UNDO' || auctionState.status !== 'IDLE'} className="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-bold tracking-widest transition-colors disabled:opacity-50">
                                <Undo2 size={14} /> UNDO LAST SALE
                            </button>
                        )}
                    </div>

                        {showForcePanel && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-zinc-900 border border-amber-500/30 p-4 rounded-xl mt-4">
                                <h4 className="text-amber-500 font-bold tracking-widest uppercase text-xs flex items-center gap-2 mb-4"><Zap size={14}/> Manual Override</h4>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Force Sell To</label>
                                        <select value={forceTeamId} onChange={e => setForceTeamId(e.target.value)} className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm font-bold">
                                            <option value="">Select Team...</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Amount</label>
                                        <input type="number" value={forceBidAmount} onChange={e => setForceBidAmount(e.target.value)} className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm font-bold font-mono text-emerald-400" placeholder="0" />
                                    </div>
                                    <button onClick={handleForceSell} className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded font-bold text-sm h-[38px]">EXECUTE</button>
                                    <button onClick={() => { setAuctionState((prev: any) => ({ ...prev, status: 'IDLE' })); performAction('PASS'); setShowForcePanel(false); }} className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded font-bold text-sm h-[38px] transition-colors border border-red-500/50">FORCE PASS</button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Col: Recent Sales */}
                    <div className="flex-[1] flex flex-col gap-4">
                        <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-4 flex-1">
                            <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase mb-3">Recent Sales</h3>
                            <div className="space-y-2">
                                {historyLogs.length === 0 ? <p className="text-sm text-zinc-600">No sales yet.</p> : historyLogs.slice(0, 8).map(log => {
                                    const p = players.find(pl => pl.accountId === log.player_id);
                                    const t = teams.find(tm => tm.id === log.team_id);
                                    return (
                                        <div key={log.id} className="flex items-center justify-between bg-black/50 p-2.5 rounded-lg border border-zinc-800/50">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm truncate max-w-[120px]">{p?.name || log.player_id}</span>
                                                <span className="text-[9px] text-zinc-500">{p?.tier}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="font-mono font-bold text-amber-500 text-sm">{log.bid_amount}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t?.color || '#555' }} />
                                                    <span className="text-[9px] text-zinc-400 uppercase tracking-wider">{t?.shortName}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM FLOATING PANEL: Team Paddles Grid */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-xl border-t border-zinc-800 z-50 p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                    <div className="max-w-[1600px] mx-auto">
                        <h3 className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase mb-3 flex items-center justify-between">
                            <span>Team Paddles</span>
                            <span>{currentIncrement > 0 ? `Current Inc: +${currentIncrement}` : 'Auto Inc'}</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {teams.sort((a, b) => (a.paddleNumber || 999) - (b.paddleNumber || 999)).map(team => {
                                const stats = teamStats[team.id];
                                const isCapped = stats.count >= AUCTION_CONSTANTS.MAX_PLAYERS;
                                const isBankrupt = stats.maxBid <= 0;
                                const isDisabled = !activePlayer || isCapped || isBankrupt;
                                const isLeading = auctionState.leading_team_id === team.id;

                                return (
                                    <button
                                        key={team.id}
                                        onClick={() => handleBid(team.id)}
                                        disabled={isDisabled}
                                        className={`relative w-full p-3 rounded-xl border transition-all text-left flex flex-col justify-between h-[85px] overflow-hidden group ${
                                            isLeading
                                                ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500'
                                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-500 disabled:opacity-30 disabled:hover:border-zinc-800'
                                        }`}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: team.color }} />
                                        
                                        <div className="flex justify-between items-start pl-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black ${isLeading ? 'text-amber-500' : 'text-white'}`}>{team.paddleNumber ? `#${team.paddleNumber}` : team.shortName}</span>
                                            </div>
                                            <span className="font-mono font-black text-emerald-400 text-sm">₹{stats.currentPurse}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-end pl-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-zinc-400 font-bold truncate max-w-[80px]">{team.shortName}</span>
                                                <span className="text-[9px] text-zinc-600 tracking-wider">{stats.count}/{AUCTION_CONSTANTS.MAX_PLAYERS}</span>
                                            </div>
                                            {isLeading && (
                                                <div className="bg-amber-500 text-black text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded shadow-lg shadow-amber-500/20 animate-pulse">
                                                    BIDDING
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
