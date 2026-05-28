"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Gavel, FileSpreadsheet, MonitorPlay, Lock, ShieldAlert, ArrowRight, Activity, CalendarDays, Radio, Trophy, TerminalSquare, RotateCw, Coins, BarChart3, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "hub" | "matches" | "organize" | "broadcast" | "mvp" | "teams" | "squads" | "logs";

export default function AdminClient({ initialTeams }: { initialTeams: any[] }) {
    const [authenticated, setAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Check if already authenticated via cookie on mount
    useEffect(() => {
        fetch("/api/admin/check")
            .then(res => { if (res.ok) setAuthenticated(true); })
            .finally(() => setCheckingAuth(false));
    }, []);
    
    const [tab, setTab] = useState<Tab>("hub");
    const [stats, setStats] = useState({ registered: 0, approved: 0, captains: 0 });

    const getLocalDatetimeLocal = (isoString?: string) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return "";
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Match State
    const [matches, setMatches] = useState<any[]>([]);
    const [newMatch, setNewMatch] = useState({ matchNo: "", stage: "Group A", group: "A", team1Id: "", team2Id: "", scheduledTime: "", isFunMatch: false });
    const [tossMatch, setTossMatch] = useState<any | null>(null);
    const [editModal, setEditModal] = useState<{ isOpen: boolean; match: any | null }>({ isOpen: false, match: null });
    const [editingMatch, setEditingMatch] = useState({ id: "", matchNo: "", stage: "", group: "", team1Id: "", team2Id: "", scheduledTime: "", isFunMatch: false, customTeam1Name: "", customTeam2Name: "" });

    // Broadcast State
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

    // MVP & Logs
    const [mvpState, setMvpState] = useState<{ player: string | null; published: boolean }>({ player: null, published: false });
    const [logs, setLogs] = useState<any[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

    const [squads, setSquads] = useState<any[]>([]);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        actionText?: string;
        actionInputPlaceholder?: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
    });

    useEffect(() => {
        if (authenticated) {
            fetch("/api/admin/stats").then(res => res.json()).then(setStats);
            fetchMatches();
            fetch("/api/active-match").then(res => res.json()).then(data => setActiveMatchId(data.activeMatchId));
            fetch("/api/mvp").then(res => res.json()).then(setMvpState);
            fetchSquads();
        }
    }, [authenticated]);

    const fetchMatches = () => fetch("/api/admin/matches?t=" + Date.now()).then(res => res.json()).then(setMatches);
    const fetchLogs = () => fetch("/api/logs?t=" + Date.now()).then(res => res.json()).then(setLogs);
    const fetchSquads = () => fetch("/api/squads?t=" + Date.now()).then(res => res.json()).then(setSquads);

    useEffect(() => {
        if (tab === "logs") fetchLogs();
        if (tab === "squads") fetchSquads();
    }, [tab]);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (res.ok) setAuthenticated(true);
            else setError("Invalid password");
        } catch {
            setError("Error connecting to server");
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(endpoint: string, payload: any, refreshFn?: () => void, skipConfirm = false) {
        if (!skipConfirm) {
            setConfirmModal({
                isOpen: true,
                title: "Confirm Action",
                message: "Are you sure you want to perform this action?",
                onConfirm: async () => {
                    await executeAction(endpoint, payload, refreshFn);
                }
            });
            return;
        }
        await executeAction(endpoint, payload, refreshFn);
    }

    async function executeAction(endpoint: string, payload: any, refreshFn?: () => void) {
        setLoading(true);
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: res.statusText }));
                alert("❌ Error: " + (data.error || res.statusText));
            } else {
                if (refreshFn) refreshFn();
                router.refresh();
                if (payload.action === "auto_generate") {
                    alert("✅ Fixtures auto-generated successfully!");
                } else if (payload.action === "delete_all") {
                    alert("✅ All fixtures wiped successfully!");
                }
            }
        } catch (e: any) {
            alert("❌ " + e.message);
        } finally {
            setLoading(false);
        }
    }

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020202]">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white p-4">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                            <Lock className="text-zinc-400" size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-center mb-2 tracking-widest">ADMIN SECURE</h1>
                    <p className="text-zinc-500 text-center text-sm mb-8">Enter your credentials to access the VPL Command Center.</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Master Password"
                                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-center tracking-[0.5em] font-mono focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all"
                            />
                        </div>
                        {error && (
                            <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-bold">
                                <ShieldAlert size={16} /> {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl tracking-widest uppercase transition-colors disabled:opacity-50"
                        >
                            {loading ? "Authenticating..." : "Authorize Access"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/5 pb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-widest uppercase flex items-center gap-3">
                            <ShieldAlert className="text-amber-500" /> Unified Command
                        </h1>
                        <p className="text-zinc-500 mt-2 tracking-wide text-sm">Varchasva Premier League Season 2</p>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                        {['hub', 'matches', 'organize', 'broadcast', 'mvp', 'teams', 'squads', 'logs'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t as Tab)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${tab === t ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {tab === "hub" && (
                    <div className="space-y-8">
                        {/* Live Stats Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                                <span className="text-zinc-500 text-xs font-black tracking-widest uppercase mb-2">Total Pool</span>
                                <span className="text-4xl font-mono text-white">{stats.registered}</span>
                            </div>
                            <div className="bg-emerald-900/20 border border-emerald-900/50 rounded-2xl p-6 flex flex-col items-center justify-center">
                                <span className="text-emerald-500 text-xs font-black tracking-widest uppercase mb-2">Approved</span>
                                <span className="text-4xl font-mono text-emerald-400">{stats.approved}</span>
                            </div>
                            <div className="bg-amber-900/20 border border-amber-900/50 rounded-2xl p-6 flex flex-col items-center justify-center">
                                <span className="text-amber-500 text-xs font-black tracking-widest uppercase mb-2">Captains Set</span>
                                <span className="text-4xl font-mono text-amber-400">{stats.captains}</span>
                            </div>
                            <div className="bg-blue-900/20 border border-blue-900/50 rounded-2xl p-6 flex flex-col items-center justify-center">
                                <span className="text-blue-500 text-xs font-black tracking-widest uppercase mb-2">Active Teams</span>
                                <span className="text-4xl font-mono text-blue-400">12</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Link href="/admin/players" className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-3xl p-8 transition-all relative overflow-hidden block">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[100px] group-hover:bg-amber-500/20 transition-colors" />
                                <Users className="text-amber-500 mb-6 w-12 h-12" />
                                <h2 className="text-2xl font-black tracking-widest mb-2">PLAYER MANAGEMENT</h2>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-8">Approve registrations, assign tiers (Marquee, Tier 1, etc.), and set Team Captains before the auction begins. Includes Emergency Sub form.</p>
                                <div className="flex items-center text-xs font-bold text-amber-500 tracking-widest gap-2">
                                    OPEN DASHBOARD <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Link>

                            <Link href="/admin/auction" className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-3xl p-8 transition-all relative overflow-hidden block">
                                <Gavel className="text-amber-500 mb-6 w-12 h-12" />
                                <h2 className="text-2xl font-black tracking-widest mb-2">LIVE AUCTION ENGINE</h2>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-8">The command center for draft day. Draw random players by tier, execute bids, and finalize sales with automated dynamic purse enforcement.</p>
                                <div className="flex items-center text-xs font-bold text-amber-500 tracking-widest gap-2">
                                    START AUCTION <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Link>

                            <Link href="/admin/purse" className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-3xl p-8 transition-all relative overflow-hidden block">
                                <Coins className="text-amber-500 mb-6 w-12 h-12" />
                                <h2 className="text-2xl font-black tracking-widest mb-2">TEAM PURSE SETUP</h2>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-8">Configure custom starting budgets for each team before the draft begins.</p>
                                <div className="flex items-center text-xs font-bold text-amber-500 tracking-widest gap-2">
                                    OPEN PURSES <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Link>

                            <Link href="/scorer" className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-3xl p-8 transition-all relative overflow-hidden block">
                                <Activity className="text-amber-500 mb-6 w-12 h-12" />
                                <h2 className="text-2xl font-black tracking-widest mb-2">MATCH SCORER</h2>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-8">The live ball-by-ball scoring application used by officials during active tournament matches.</p>
                                <div className="flex items-center text-xs font-bold text-amber-500 tracking-widest gap-2">
                                    OPEN SCORER <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Link>

                            <Link href="/admin/teams" className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-3xl p-8 transition-all relative overflow-hidden block">
                                <Trophy className="text-amber-500 mb-6 w-12 h-12" />
                                <h2 className="text-2xl font-black tracking-widest mb-2">TEAM MANAGEMENT</h2>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-8">Create teams, edit details, assign colors, and drag & drop between groups.</p>
                                <div className="flex items-center text-xs font-bold text-amber-500 tracking-widest gap-2">
                                    MANAGE TEAMS <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Link>

                            <Link href="/admin/analytics" className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-3xl p-8 transition-all relative overflow-hidden block">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[100px] group-hover:bg-amber-500/20 transition-colors" />
                                <BarChart3 className="text-amber-500 mb-6 w-12 h-12" />
                                <h2 className="text-2xl font-black tracking-widest mb-2">VIEWER ANALYTICS</h2>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-8">Real-time concurrent viewer counts, all-time page hits, device breakdown, and fan squad engagement leaderboard.</p>
                                <div className="flex items-center text-xs font-bold text-amber-500 tracking-widest gap-2">
                                    OPEN DASHBOARD <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Link>

                            <Link href="/admin/import" className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-500 rounded-3xl p-8 transition-all relative overflow-hidden block">
                                <FileSpreadsheet className="text-zinc-500 mb-6 w-12 h-12" />
                                <h2 className="text-2xl font-black tracking-widest text-zinc-300 mb-2">DATA IMPORT UTILITY</h2>
                                <p className="text-zinc-600 text-sm leading-relaxed mb-8">Parse Google Form CSV dumps to generate VAR-XXX IDs and populate the initial staging database.</p>
                                <div className="flex items-center text-xs font-bold text-zinc-500 tracking-widest gap-2">
                                    OPEN IMPORT TOOL <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Link>
                        </div>
                    </div>
                )}

                {tab === "matches" && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black tracking-widest flex items-center gap-2"><CalendarDays className="text-amber-500"/> Schedule Match</h2>
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: "Auto-Generate Fixtures",
                                            message: "Are you sure you want to auto-generate all group and playoff fixtures? This will append the generated matches to your schedule.",
                                            onConfirm: async () => {
                                                await handleAction("/api/matches", { action: "auto_generate" }, fetchMatches, true);
                                            }
                                        });
                                    }} className="bg-zinc-800 hover:bg-zinc-700 text-xs font-bold px-3 py-1.5 rounded text-white tracking-widest uppercase transition-colors">
                                        Auto-Gen
                                    </button>
                                    <button onClick={() => {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: "Wipe All Fixtures",
                                            message: "⚠️ WARNING: This will permanently delete all scheduled and completed matches, reset points tables, and clear active broadcast status. This cannot be undone.",
                                            actionText: "DELETE ALL",
                                            actionInputPlaceholder: "DELETE ALL",
                                            onConfirm: async () => {
                                                await handleAction("/api/matches", { action: "delete_all" }, fetchMatches, true);
                                            }
                                        });
                                    }} className="bg-red-500/20 text-red-500 hover:bg-red-500/40 text-xs font-bold px-3 py-1.5 rounded tracking-widest uppercase transition-colors">
                                        Wipe
                                    </button>
                                </div>
                            </div>
                            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleAction("/api/matches", { action: "create_match", ...newMatch }, fetchMatches); }}>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Match No (e.g. 1)" value={newMatch.matchNo} onChange={e => setNewMatch({...newMatch, matchNo: e.target.value})} className="bg-black border border-zinc-800 rounded-xl p-3" required />
                                    <input type="text" placeholder="Stage (e.g. Group A)" value={newMatch.stage} onChange={e => setNewMatch({...newMatch, stage: e.target.value})} className="bg-black border border-zinc-800 rounded-xl p-3" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {newMatch.isFunMatch ? (
                                        <>
                                            <input type="text" placeholder="Custom Team 1 Name" value={newMatch.team1Id} onChange={e => setNewMatch({...newMatch, team1Id: e.target.value})} className="bg-black border border-zinc-800 rounded-xl p-3" required />
                                            <input type="text" placeholder="Custom Team 2 Name" value={newMatch.team2Id} onChange={e => setNewMatch({...newMatch, team2Id: e.target.value})} className="bg-black border border-zinc-800 rounded-xl p-3" required />
                                        </>
                                    ) : (
                                        <>
                                            <select value={newMatch.team1Id} onChange={e => setNewMatch({...newMatch, team1Id: e.target.value})} className="bg-black border border-zinc-800 rounded-xl p-3" required>
                                                <option value="">Select Team 1</option>
                                                {initialTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                            <select value={newMatch.team2Id} onChange={e => setNewMatch({...newMatch, team2Id: e.target.value})} className="bg-black border border-zinc-800 rounded-xl p-3" required>
                                                <option value="">Select Team 2</option>
                                                {initialTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </>
                                    )}
                                </div>
                                <input type="datetime-local" value={newMatch.scheduledTime} onChange={e => setNewMatch({...newMatch, scheduledTime: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3" required />
                                <label className="flex items-center gap-2 text-sm text-zinc-400">
                                    <input type="checkbox" checked={newMatch.isFunMatch} onChange={e => setNewMatch({...newMatch, isFunMatch: e.target.checked})} className="rounded bg-black border-zinc-800 text-amber-500" />
                                    Fun Match (No Points)
                                </label>
                                <button type="submit" className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl mt-4">CREATE MATCH</button>
                            </form>
                        </div>

                        {tossMatch && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 w-96">
                                    <h3 className="text-lg font-bold mb-4">Log Toss: Match {tossMatch.matchNo}</h3>
                                    <div className="space-y-4">
                                        <button onClick={() => handleAction("/api/matches", { action: "update_toss", matchNo: tossMatch.matchNo, tossWinnerId: tossMatch.team1Id, tossDecision: "BAT" }, () => { fetchMatches(); setTossMatch(null); })} className="w-full bg-zinc-800 p-3 rounded">Team 1 Bat</button>
                                        <button onClick={() => handleAction("/api/matches", { action: "update_toss", matchNo: tossMatch.matchNo, tossWinnerId: tossMatch.team1Id, tossDecision: "BOWL" }, () => { fetchMatches(); setTossMatch(null); })} className="w-full bg-zinc-800 p-3 rounded">Team 1 Bowl</button>
                                        <hr className="border-zinc-800" />
                                        <button onClick={() => handleAction("/api/matches", { action: "update_toss", matchNo: tossMatch.matchNo, tossWinnerId: tossMatch.team2Id, tossDecision: "BAT" }, () => { fetchMatches(); setTossMatch(null); })} className="w-full bg-zinc-800 p-3 rounded">Team 2 Bat</button>
                                        <button onClick={() => handleAction("/api/matches", { action: "update_toss", matchNo: tossMatch.matchNo, tossWinnerId: tossMatch.team2Id, tossDecision: "BOWL" }, () => { fetchMatches(); setTossMatch(null); })} className="w-full bg-zinc-800 p-3 rounded">Team 2 Bowl</button>
                                        <button onClick={() => setTossMatch(null)} className="w-full text-zinc-500 pt-4">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === "organize" && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h2 className="text-xl font-black tracking-widest mb-6 flex items-center gap-2"><RotateCw className="text-amber-500"/> Scheduled Matches & Toss</h2>
                        <div className="space-y-4">
                            {matches.map((m, i) => (
                                <div key={m.id} className="bg-black border border-zinc-800 p-4 rounded-xl flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-sm text-amber-500">{m.matchNo} - {m.stage}</p>
                                        <p className="font-bold">{m.team1Name || initialTeams.find(t=>t.id===m.team1Id)?.shortName || 'TBD'} vs {m.team2Name || initialTeams.find(t=>t.id===m.team2Id)?.shortName || 'TBD'}</p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            {m.scheduledTime ? new Date(m.scheduledTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : "Time TBD"} 
                                            <span className="mx-2">•</span> 
                                            {m.status}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {m.status === 'SCHEDULED' && !m.tossWinnerId && (
                                            <button onClick={() => setTossMatch(m)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-xs font-bold">LOG TOSS</button>
                                        )}
                                        {m.status !== 'COMPLETED' && m.status !== 'ABANDONED' && (
                                            <button onClick={() => handleAction("/api/matches", { action: "abandon_match", matchNo: m.matchNo }, fetchMatches)} className="text-red-500 hover:bg-red-500/10 px-3 py-1 rounded text-xs font-bold">ABANDON</button>
                                        )}
                                        {m.status === 'COMPLETED' && (
                                            <button onClick={() => handleAction("/api/matches", { action: "clear_winner", matchNo: m.matchNo }, fetchMatches)} className="text-orange-400 hover:bg-orange-500/10 px-3 py-1 rounded text-xs font-bold border border-orange-500/30">RESET</button>
                                        )}
                                        {m.status !== 'COMPLETED' && (
                                            <button onClick={() => handleAction("/api/matches", { action: "autoplay_match", matchNo: m.matchNo }, fetchMatches, true)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs font-bold border border-blue-500/30">AUTOPLAY</button>
                                        )}
                                        <button 
                                            onClick={() => {
                                                setEditingMatch({
                                                    id: m.id,
                                                    matchNo: m.matchNo,
                                                    stage: m.stage,
                                                    group: m.group || "",
                                                    team1Id: m.team1Id,
                                                    team2Id: m.team2Id,
                                                    scheduledTime: getLocalDatetimeLocal(m.scheduledTime),
                                                    isFunMatch: m.isFunMatch || false,
                                                    customTeam1Name: "",
                                                    customTeam2Name: ""
                                                });
                                                setEditModal({ isOpen: true, match: m });
                                            }} 
                                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1 rounded text-xs font-bold border border-amber-500/30"
                                        >
                                            EDIT
                                        </button>
                                        <button onClick={() => handleAction("/api/matches", { action: "delete_match", matchNo: m.matchNo }, fetchMatches)} className="text-zinc-500 hover:bg-zinc-800 px-3 py-1 rounded text-xs font-bold border border-zinc-800 mt-1">DELETE</button>
                                    </div>
                                    <div className="flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-2">
                                        {i > 0 && (
                                            <button 
                                                onClick={() => handleAction("/api/matches", { action: "swap_sequence", match1: m.matchNo, match2: matches[i-1].matchNo }, fetchMatches, true)}
                                                className="bg-zinc-800 hover:bg-zinc-700 text-white w-10 h-10 flex items-center justify-center rounded-lg shadow-lg active:scale-95 transition-transform"
                                                title="Move Up"
                                            >
                                                ↑
                                            </button>
                                        )}
                                        {i < matches.length - 1 && (
                                            <button 
                                                onClick={() => handleAction("/api/matches", { action: "swap_sequence", match1: m.matchNo, match2: matches[i+1].matchNo }, fetchMatches, true)}
                                                className="bg-zinc-800 hover:bg-zinc-700 text-white w-10 h-10 flex items-center justify-center rounded-lg shadow-lg active:scale-95 transition-transform"
                                                title="Move Down"
                                            >
                                                ↓
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {tossMatch && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                                <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 w-96">
                                    <h3 className="text-lg font-bold mb-4">Log Toss: Match {tossMatch.matchNo}</h3>
                                    <div className="space-y-4">
                                        <button onClick={() => handleAction("/api/matches", { action: "update_toss", matchNo: tossMatch.matchNo, tossWinnerId: tossMatch.team1Id, tossDecision: "BAT" }, () => { fetchMatches(); setTossMatch(null); })} className="w-full bg-zinc-800 p-3 rounded">Team 1 Bat</button>
                                        <button onClick={() => handleAction("/api/matches", { action: "update_toss", matchNo: tossMatch.matchNo, tossWinnerId: tossMatch.team1Id, tossDecision: "BOWL" }, () => { fetchMatches(); setTossMatch(null); })} className="w-full bg-zinc-800 p-3 rounded">Team 1 Bowl</button>
                                        <hr className="border-zinc-800" />
                                        <button onClick={() => handleAction("/api/matches", { action: "update_toss", matchNo: tossMatch.matchNo, tossWinnerId: tossMatch.team2Id, tossDecision: "BAT" }, () => { fetchMatches(); setTossMatch(null); })} className="w-full bg-zinc-800 p-3 rounded">Team 2 Bat</button>
                                        <button onClick={() => handleAction("/api/matches", { action: "update_toss", matchNo: tossMatch.matchNo, tossWinnerId: tossMatch.team2Id, tossDecision: "BOWL" }, () => { fetchMatches(); setTossMatch(null); })} className="w-full bg-zinc-800 p-3 rounded">Team 2 Bowl</button>
                                        <button onClick={() => setTossMatch(null)} className="w-full text-zinc-500 pt-4">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === "broadcast" && (
                    <div className="max-w-xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                        <Radio className="text-red-500 w-16 h-16 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-2xl font-black tracking-widest mb-2">LIVE BROADCAST CONTROL</h2>
                        <p className="text-zinc-400 text-sm mb-8">Select the match you want to stream to the public `/live` viewer page.</p>
                        
                        <div className="space-y-4">
                            <select 
                                value={activeMatchId || ""} 
                                onChange={(e) => setActiveMatchId(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-center font-bold text-lg focus:border-amber-500"
                            >
                                <option value="">--- NO MATCH LIVE ---</option>
                                {matches.map((m: any) => (
                                    <option key={m.id} value={m.id}>Match {m.matchNo}: {initialTeams.find(t=>t.id===m.team1Id)?.shortName} vs {initialTeams.find(t=>t.id===m.team2Id)?.shortName}</option>
                                ))}
                            </select>
                            
                            <button 
                                onClick={() => handleAction("/api/active-match", { activeMatchId }, () => alert("Broadcast updated!"))}
                                className="w-full bg-red-500 text-white font-black py-4 rounded-xl tracking-widest uppercase transition-colors hover:bg-red-400"
                            >
                                SET ACTIVE BROADCAST
                            </button>
                        </div>
                    </div>
                )}

                {tab === "mvp" && (
                    <div className="max-w-xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                        <Trophy className="text-amber-500 w-16 h-16 mx-auto mb-6" />
                        <h2 className="text-2xl font-black tracking-widest mb-6">MVP ASSIGNMENT</h2>
                        <input 
                            type="text" 
                            placeholder="Player Name" 
                            value={mvpState.player || ""} 
                            onChange={(e) => setMvpState({...mvpState, player: e.target.value})}
                            className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-center font-bold text-lg mb-4"
                        />
                        <label className="flex items-center justify-center gap-2 mb-8 text-zinc-400">
                            <input type="checkbox" checked={mvpState.published} onChange={e => setMvpState({...mvpState, published: e.target.checked})} className="rounded bg-black border-zinc-800" />
                            Publish to public site
                        </label>
                        <button 
                            onClick={() => handleAction("/api/mvp", mvpState, () => alert("MVP updated!"))}
                            className="w-full bg-amber-500 text-black font-black py-4 rounded-xl tracking-widest uppercase hover:bg-amber-400"
                        >
                            UPDATE MVP
                        </button>
                    </div>
                )}

                {tab === "teams" && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h2 className="text-xl font-black tracking-widest mb-6">Manage Teams</h2>
                        
                        <form className="bg-black border border-zinc-800 rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4" onSubmit={(e) => {
                            e.preventDefault();
                            const target = e.target as any;
                            handleAction("/api/squads", { 
                                action: "create_team", 
                                name: target.name.value, 
                                shortName: target.shortName.value, 
                                color: target.color.value, 
                                groupId: target.groupId.value 
                            }, () => router.refresh());
                        }}>
                            <input name="name" type="text" placeholder="Team Name" className="flex-[2] bg-zinc-900 border border-zinc-800 rounded px-3 py-2" required />
                            <input name="shortName" type="text" placeholder="Short (e.g. CSK)" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2" required />
                            <input name="color" type="color" className="w-12 h-10 bg-zinc-900 border border-zinc-800 rounded px-1" required />
                            <select name="groupId" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2">
                                <option value="A">Group A</option>
                                <option value="B">Group B</option>
                                <option value="C">Group C</option>
                            </select>
                            <button type="submit" className="bg-amber-500 text-black font-bold px-6 py-2 rounded hover:bg-amber-400">CREATE</button>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {initialTeams.map(t => {
                                const isEditing = editingTeamId === t.id;
                                return isEditing ? (
                                    <form key={`edit-${t.id}`} className="bg-black border border-amber-500/50 rounded-xl p-4 flex flex-col gap-3" onSubmit={(e) => {
                                        e.preventDefault();
                                        const target = e.target as any;
                                        handleAction("/api/squads", { 
                                            action: "update_team", 
                                            teamId: t.id,
                                            oldName: t.name,
                                            name: target.name.value, 
                                            shortName: target.shortName.value, 
                                            color: target.color.value, 
                                            groupId: target.groupId.value 
                                        }, () => {
                                            setEditingTeamId(null);
                                            router.refresh();
                                        });
                                    }}>
                                        <input name="name" type="text" defaultValue={t.name} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1" required />
                                        <div className="flex gap-2">
                                            <input name="shortName" type="text" defaultValue={t.shortName} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1" required />
                                            <input name="color" type="color" defaultValue={t.color} className="w-10 h-8 bg-zinc-900 border border-zinc-800 rounded px-1" required />
                                        </div>
                                        <select name="groupId" defaultValue={t.groupId} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
                                            <option value="A">Group A</option>
                                            <option value="B">Group B</option>
                                            <option value="C">Group C</option>
                                            <option value="-">None (-)</option>
                                        </select>
                                        <div className="flex gap-2 mt-2">
                                            <button type="submit" className="flex-1 bg-amber-500 text-black font-bold py-1.5 rounded hover:bg-amber-400 text-xs">SAVE</button>
                                            <button type="button" onClick={() => { setEditingTeamId(null); router.refresh(); }} className="flex-1 bg-zinc-800 text-white font-bold py-1.5 rounded hover:bg-zinc-700 text-xs">CANCEL</button>
                                        </div>
                                    </form>
                                ) : (
                                    <div key={t.id} className="bg-black border border-zinc-800 rounded-xl p-4 flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                                            <div>
                                                <p className="font-bold">{t.name}</p>
                                                <p className="text-xs text-zinc-500">{t.shortName} | Group {t.groupId}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => { setEditingTeamId(t.id); router.refresh(); }}
                                                className="bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white px-2 py-1 text-[10px] rounded transition-colors font-bold tracking-wider"
                                            >
                                                EDIT
                                            </button>
                                            <button 
                                                onClick={() => handleAction("/api/squads", { action: "delete_team", teamId: t.id }, () => router.refresh())}
                                                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 text-[10px] rounded transition-colors font-bold tracking-wider"
                                            >
                                                DELETE
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {tab === "squads" && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black tracking-widest flex items-center gap-2"><Users className="text-amber-500"/> Squad Editor</h2>
                            <button onClick={fetchSquads} className="text-xs font-bold text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/10">REFRESH</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {squads.map(team => (
                                <div key={team.id} className="bg-black border border-zinc-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                                        <h3 className="font-bold">{team.name}</h3>
                                        <span className="text-xs text-zinc-500 ml-auto">{team.players.length} Players</span>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        {team.players.map((p: any) => (
                                            <div key={p.id} className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded text-sm group">
                                                <div>
                                                    <span className="font-bold">{p.name}</span>
                                                    <span className="text-[10px] text-zinc-500 ml-2 block">{p.role} · ₹{p.price}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const action = p.id.startsWith('CUST-') || (p.id.includes('-') && p.id.length > 20) ? "delete_player" : "remove_registered_player";
                                                        handleAction("/api/squads", { action, playerId: p.id, accountId: p.id }, fetchSquads);
                                                    }}
                                                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                    title="Remove Player"
                                                ><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <form className="flex gap-2" onSubmit={(e) => {
                                        e.preventDefault();
                                        const t = e.target as any;
                                        handleAction("/api/squads", { 
                                            action: "add_player", 
                                            teamId: team.id, 
                                            name: t.pname.value, 
                                            role: t.prole.value, 
                                            price: 0 
                                        }, () => {
                                            fetchSquads();
                                            t.reset();
                                        }, true);
                                    }}>
                                        <input name="pname" type="text" placeholder="Name" className="flex-[2] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs" required />
                                        <select name="prole" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-xs">
                                            <option>All Rounder</option><option>Batsman</option><option>Bowler</option>
                                        </select>
                                        <button type="submit" className="bg-amber-500 text-black px-2 py-1 rounded text-xs font-bold">+</button>
                                    </form>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === "logs" && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-[700px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black tracking-widest flex items-center gap-2"><TerminalSquare className="text-amber-500"/> System Logs</h2>
                            <button onClick={fetchLogs} className="text-xs text-zinc-500 hover:text-white">REFRESH</button>
                        </div>
                        <div className="flex-1 bg-black border border-zinc-800 rounded-xl p-4 font-mono text-xs overflow-y-auto custom-scrollbar">
                            {logs.map(log => (
                                <div key={log.id} className="border-b border-zinc-800/50 py-2 flex gap-4">
                                    <span className="text-zinc-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className={log.level === 'ERROR' ? 'text-red-500' : 'text-blue-400'}>[{log.level}]</span>
                                    <span className="text-zinc-300">{log.action}</span>
                                    {log.details && <span className="text-zinc-600 break-all">{JSON.stringify(log.details)}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Premium Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                            <h3 className="text-xl font-black tracking-wider text-white mb-2 uppercase">{confirmModal.title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6">{confirmModal.message}</p>
                            
                            {confirmModal.actionText && (
                                <div className="mb-6">
                                    <input 
                                        type="text" 
                                        id="confirm-modal-input"
                                        placeholder={confirmModal.actionInputPlaceholder || `Type "${confirmModal.actionText}" to confirm`}
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-center tracking-widest font-mono text-sm uppercase text-amber-500 focus:border-amber-500/50 outline-none"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                const val = (e.target as HTMLInputElement).value;
                                                if (val.trim().toUpperCase() === confirmModal.actionText?.toUpperCase()) {
                                                    confirmModal.onConfirm();
                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                }
                                            }
                                        }}
                                    />
                                    <p className="text-[10px] text-zinc-500 mt-2">Type the exact phrase above and click Confirm (or press Enter)</p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-3.5 rounded-xl text-xs tracking-widest uppercase transition-all"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (confirmModal.actionText) {
                                            const el = document.getElementById("confirm-modal-input") as HTMLInputElement;
                                            if (el && el.value.trim().toUpperCase() === confirmModal.actionText.toUpperCase()) {
                                                setLoading(true);
                                                await confirmModal.onConfirm();
                                                setLoading(false);
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            } else {
                                                alert(`Please type "${confirmModal.actionText}" exactly to proceed.`);
                                            }
                                        } else {
                                            setLoading(true);
                                            await confirmModal.onConfirm();
                                            setLoading(false);
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        }
                                    }}
                                    disabled={loading}
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black py-3.5 rounded-xl text-xs tracking-widest uppercase shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50"
                                >
                                    {loading ? "PROCESSING..." : "Confirm"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {editModal.isOpen && editModal.match && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                            <h3 className="text-xl font-black tracking-wider text-white mb-6 uppercase text-center flex items-center justify-center gap-2">
                                <CalendarDays className="text-amber-500 w-5 h-5" /> Edit Match
                            </h3>
                            
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-widest font-bold">Match Number</label>
                                    <input 
                                        type="text" 
                                        value={editingMatch.matchNo} 
                                        onChange={e => setEditingMatch({ ...editingMatch, matchNo: e.target.value })} 
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500/50 outline-none font-semibold" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-widest font-bold">Stage</label>
                                    <input 
                                        type="text" 
                                        value={editingMatch.stage} 
                                        onChange={e => setEditingMatch({ ...editingMatch, stage: e.target.value })} 
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500/50 outline-none font-semibold" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-widest font-bold">Group</label>
                                    <select 
                                        value={editingMatch.group} 
                                        onChange={e => setEditingMatch({ ...editingMatch, group: e.target.value })} 
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500/50 outline-none"
                                    >
                                        <option value="A">Group A</option>
                                        <option value="B">Group B</option>
                                        <option value="C">Group C</option>
                                        <option value="-">None (Knockout)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-widest font-bold">Team 1</label>
                                        <select 
                                            value={editingMatch.team1Id} 
                                            onChange={e => setEditingMatch({ ...editingMatch, team1Id: e.target.value })} 
                                            className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500/50 outline-none"
                                        >
                                            {initialTeams.map(t => <option key={t.id} value={t.id}>{t.shortName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-widest font-bold">Team 2</label>
                                        <select 
                                            value={editingMatch.team2Id} 
                                            onChange={e => setEditingMatch({ ...editingMatch, team2Id: e.target.value })} 
                                            className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500/50 outline-none"
                                        >
                                            {initialTeams.map(t => <option key={t.id} value={t.id}>{t.shortName}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {/* Manual playoff team override for knockout matches */}
                                {(editingMatch.group === '-' || editingMatch.group === '') && (
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                                        <p className="text-[10px] text-amber-500/70 tracking-widest uppercase font-bold">Playoff Manual Override (overrides auto-seeding)</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] text-zinc-500 mb-1">Team 1 Name Override</label>
                                                <input
                                                    type="text"
                                                    placeholder="Leave blank for auto"
                                                    value={editingMatch.customTeam1Name}
                                                    onChange={e => setEditingMatch({ ...editingMatch, customTeam1Name: e.target.value })}
                                                    className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm focus:border-amber-500/50 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-zinc-500 mb-1">Team 2 Name Override</label>
                                                <input
                                                    type="text"
                                                    placeholder="Leave blank for auto"
                                                    value={editingMatch.customTeam2Name}
                                                    onChange={e => setEditingMatch({ ...editingMatch, customTeam2Name: e.target.value })}
                                                    className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm focus:border-amber-500/50 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-widest font-bold">Scheduled Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={editingMatch.scheduledTime} 
                                        onChange={e => setEditingMatch({ ...editingMatch, scheduledTime: e.target.value })} 
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-amber-500/50 outline-none" 
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-zinc-400 pt-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={editingMatch.isFunMatch} 
                                        onChange={e => setEditingMatch({ ...editingMatch, isFunMatch: e.target.checked })} 
                                        className="rounded bg-black border-zinc-800 text-amber-500" 
                                    />
                                    Fun Match (No Points)
                                </label>
                            </div>
                            
                            <div className="flex gap-4 mt-6">
                                <button 
                                    onClick={() => setEditModal({ isOpen: false, match: null })}
                                    className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-3 rounded-xl text-xs tracking-widest uppercase transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const res = await fetch("/api/matches", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    action: "update_match",
                                                    id: editingMatch.id,
                                                    oldMatchNo: editModal.match.matchNo,
                                                    matchNo: editingMatch.matchNo,
                                                    stage: editingMatch.stage,
                                                    group: editingMatch.group,
                                                    team1Id: editingMatch.team1Id,
                                                    team2Id: editingMatch.team2Id,
                                                    scheduledTime: editingMatch.scheduledTime ? new Date(editingMatch.scheduledTime).toISOString() : null,
                                                    isFunMatch: editingMatch.isFunMatch,
                                                    customTeam1Name: editingMatch.customTeam1Name || null,
                                                    customTeam2Name: editingMatch.customTeam2Name || null,
                                                }),
                                            });
                                            if (!res.ok) {
                                                const data = await res.json().catch(() => ({ error: res.statusText }));
                                                alert("❌ Error: " + (data.error || res.statusText));
                                            } else {
                                                fetchMatches();
                                                setEditModal({ isOpen: false, match: null });
                                            }
                                        } catch (e: any) {
                                            alert("❌ " + e.message);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black py-3 rounded-xl text-xs tracking-widest uppercase shadow-lg shadow-amber-500/10 transition-all"
                                    disabled={loading}
                                >
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
