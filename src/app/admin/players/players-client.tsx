"use client";

import { useState } from "react";
import {
    Search,
    Plus,
    CheckCircle2,
    Crown,
    Trash2,
    UserPlus,
    Loader2,
    CheckCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
    accountId: string;
    name: string;
    mobile: string;
    role: string;
    tier: string;
    gender: string;
    isApproved: boolean;
    isCaptain: boolean;
    teamName: string;
}

interface Team {
    id: string;
    name: string;
    color: string;
}

export default function PlayersClient({ initialPlayers, teams, serverError }: { initialPlayers: Player[], teams: Team[], serverError?: string | null }) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
    const [tierFilter, setTierFilter] = useState<string>("ALL");
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [bulkApproving, setBulkApproving] = useState(false);

    const [newPlayer, setNewPlayer] = useState({ name: "", mobile: "", role: "All Rounder", tier: "TIER 2", gender: "Male" });
    const [bulkConfirmPending, setBulkConfirmPending] = useState(false);

    const tiers = Array.from(new Set(players.map(p => p.tier).filter(Boolean))).sort();
    // Ensure standard tiers are always present even if no players have them yet
    const allTiers = Array.from(new Set(['MARQUEE', 'TIER 1', 'TIER 2', ...tiers]));

    const filteredPlayers = players.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.mobile?.includes(search);
        const matchesStatus = filter === "ALL" ? true : (filter === "APPROVED" ? p.isApproved : !p.isApproved);
        const matchesTier = tierFilter === "ALL" || p.tier === tierFilter;
        return matchesSearch && matchesStatus && matchesTier;
    });

    const updatePlayer = async (id: string, updates: Partial<Player>) => {
        setLoadingId(id);
        try {
            const res = await fetch(`/api/admin/players/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    is_approved: updates.isApproved,
                    tier: updates.tier,
                    is_captain: updates.isCaptain,
                    team_name: updates.teamName,
                    gender: updates.gender,
                })
            });
            if (res.ok) setPlayers(prev => prev.map(p => p.accountId === id ? { ...p, ...updates } : p));
        } catch (e) { console.error(e); }
        finally { setLoadingId(null); }
    };

    const deletePlayer = async (id: string) => {
        if (!confirm("Delete this player permanently?")) return;
        setLoadingId(id);
        try {
            const res = await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
            if (res.ok) setPlayers(prev => prev.filter(p => p.accountId !== id));
        } catch (e) { console.error(e); }
        finally { setLoadingId(null); }
    };

    const handleBulkApprove = async () => {
        const pending = filteredPlayers.filter(p => !p.isApproved);
        if (pending.length === 0) { alert("No pending players to approve."); return; }

        // Show in-UI confirmation instead of window.confirm()
        if (!bulkConfirmPending) {
            setBulkConfirmPending(true);
            return;
        }
        setBulkConfirmPending(false);

        setBulkApproving(true);
        for (const p of pending) {
            await fetch(`/api/admin/players/${p.accountId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_approved: true })
            });
        }
        setPlayers(prev => prev.map(p => {
            if (pending.find(pp => pp.accountId === p.accountId)) return { ...p, isApproved: true };
            return p;
        }));
        setBulkApproving(false);
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingId("NEW");
        try {
            const res = await fetch("/api/admin/players", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPlayer)
            });
            if (res.ok) {
                const data = await res.json();
                const freshPlayer: Player = {
                    accountId: data.account_id,
                    name: newPlayer.name,
                    mobile: newPlayer.mobile,
                    role: newPlayer.role,
                    tier: newPlayer.tier,
                    gender: newPlayer.gender,
                    isApproved: true,
                    isCaptain: false,
                    teamName: "UNSOLD"
                };
                setPlayers(prev => [freshPlayer, ...prev]);
                setIsAddModalOpen(false);
                setNewPlayer({ name: "", mobile: "", role: "All Rounder", tier: "TIER 2", gender: "Male" });
            }
        } catch (e) { console.error(e); }
        finally { setLoadingId(null); }
    };

    const pendingCount = players.filter(p => !p.isApproved).length;
    const approvedCount = players.filter(p => p.isApproved).length;

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-6">
            <div className="max-w-6xl mx-auto">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">Player Management</h1>
                        <p className="text-zinc-500 text-sm">
                            <span className="text-amber-500 font-bold">{pendingCount}</span> pending ·
                            <span className="text-emerald-500 font-bold ml-1">{approvedCount}</span> approved ·
                            <span className="font-bold ml-1">{players.length}</span> total
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleBulkApprove}
                            disabled={bulkApproving}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-full font-bold transition-all"
                        >
                            {bulkApproving ? <Loader2 size={18} className="animate-spin" /> : <CheckCheck size={18} />}
                            {bulkConfirmPending ? `Confirm Approve ${filteredPlayers.filter(p => !p.isApproved).length}?` : "Approve All Visible"}
                        </button>
                        {bulkConfirmPending && (
                            <button onClick={() => setBulkConfirmPending(false)} className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-3 rounded-full font-bold transition-all text-sm">
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-3 rounded-full font-bold transition-all"
                        >
                            <UserPlus size={18} /> Add Player
                        </button>
                    </div>
                </div>

                {serverError && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-8 font-mono text-sm">
                        Database Error: {serverError}
                    </div>
                )}

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                        <input
                            type="text"
                            placeholder="Search name..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-amber-500/50 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                        {["ALL", "PENDING", "APPROVED"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-widest transition-all ${filter === f ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <select
                        value={tierFilter}
                        onChange={e => setTierFilter(e.target.value)}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:border-amber-500/50"
                    >
                        <option value="ALL">All Tiers</option>
                        {tiers.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="flex items-center justify-end text-sm text-zinc-500">
                        Showing {filteredPlayers.length} of {players.length}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                        {filteredPlayers.map((player) => (
                            <motion.div
                                layout
                                key={player.accountId}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`relative bg-zinc-900/30 border ${player.isApproved ? 'border-zinc-800' : 'border-amber-500/20 bg-amber-500/[0.02]'} rounded-2xl p-5 transition-all group overflow-hidden`}
                            >
                                <div className="absolute top-4 right-4 flex gap-1.5">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                        player.tier === 'MARQUEE' ? 'bg-amber-500 text-black' :
                                        player.tier === 'TIER 1' ? 'bg-blue-500 text-white' :
                                        'bg-zinc-800 text-zinc-400'
                                    }`}>{player.tier}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        player.gender?.toLowerCase() === 'female' ? 'bg-pink-500/20 text-pink-400' : 'bg-zinc-800 text-zinc-500'
                                    }`}>{player.gender?.charAt(0)}</span>
                                </div>

                                <div className="flex items-start gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold border border-zinc-700">{player.name[0]}</div>
                                    <div>
                                        <h3 className="font-bold text-base leading-none mb-1">{player.name}</h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{player.role}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {!player.isApproved ? (
                                        <button
                                            onClick={() => updatePlayer(player.accountId, { isApproved: true })}
                                            className="w-full bg-white text-black py-2 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                                            disabled={loadingId === player.accountId}
                                        >
                                            {loadingId === player.accountId ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} APPROVE
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <select
                                                value={player.tier}
                                                onChange={(e) => updatePlayer(player.accountId, { tier: e.target.value })}
                                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 px-2 text-[10px] font-bold"
                                            >
                                                {allTiers.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <select
                                                value={player.gender || "Male"}
                                                onChange={(e) => updatePlayer(player.accountId, { gender: e.target.value })}
                                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 px-2 text-[10px] font-bold"
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex gap-2 opacity-100 transition-opacity">
                                        <button
                                            onClick={() => updatePlayer(player.accountId, { isApproved: false })}
                                            className="flex-1 bg-zinc-800 text-zinc-400 py-1.5 rounded-lg text-[10px] font-bold hover:text-white"
                                        >UNAPPROVE</button>
                                        <button
                                            onClick={() => deletePlayer(player.accountId)}
                                            className="w-9 bg-red-500/10 text-red-500 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                        ><Trash2 size={12} /></button>
                                    </div>
                                </div>

                                {player.isCaptain && (
                                    <div className="absolute -left-8 top-5 -rotate-45 bg-amber-500 text-black px-10 py-0.5 text-[10px] font-black tracking-widest shadow-lg">CAPTAIN</div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Add Player Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
                        >
                            <h2 className="text-2xl font-bold mb-6">Manual Player Entry</h2>
                            <form onSubmit={handleAddPlayer} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-widest uppercase">Full Name</label>
                                    <input required type="text" className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-amber-500/50" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-widest uppercase">Role</label>
                                        <select className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4" value={newPlayer.role} onChange={e => setNewPlayer({...newPlayer, role: e.target.value})}>
                                            <option>All Rounder</option><option>Batsman</option><option>Bowler</option><option>Wicketkeeper</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-widest uppercase">Tier</label>
                                        <select className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4" value={newPlayer.tier} onChange={e => setNewPlayer({...newPlayer, tier: e.target.value})}>
                                            {allTiers.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-2 tracking-widest uppercase">Gender</label>
                                    <select className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4" value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})}>
                                        <option>Male</option><option>Female</option>
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-xl font-bold mt-6 flex items-center justify-center gap-2" disabled={loadingId === "NEW"}>
                                    {loadingId === "NEW" ? <Loader2 className="animate-spin" /> : <Plus />} Create & Approve
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
