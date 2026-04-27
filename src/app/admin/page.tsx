"use client";

import { useEffect, useState, useCallback } from "react";
import { LogOut, Plus, Trash2, Radio, ScrollText, Trophy, RefreshCw } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type Tab = "broadcast" | "matches" | "teams" | "logs" | "mvp";

interface DbTeam {
    id: string;
    name: string;
    shortName: string;
    color: string;
    groupId: string;
    players: { id: string; name: string; role: string; price: number }[];
}

export default function AdminPage() {
    const [authed, setAuthed] = useState(false);
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loggingIn, setLoggingIn] = useState(false);
    const [tab, setTab] = useState<Tab>("teams");
    const [teams, setTeams] = useState<DbTeam[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionMsg, setActionMsg] = useState("");

    // Form states
    const [newTeam, setNewTeam] = useState({ name: "", shortName: "", color: "#EAB308", groupId: "A" });
    const [newPlayer, setNewPlayer] = useState({ name: "", role: "Batsman", price: "0", teamId: "" });
    const [newMatch, setNewMatch] = useState({ matchNo: "", stage: "Group A", group: "A", team1Id: "", team2Id: "", scheduledTime: "" });

    // Broadcast state
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

    // Logs state
    const [logs, setLogs] = useState<any[]>([]);

    // MVP state
    const [mvpState, setMvpState] = useState<{ player: string | null; published: boolean }>({ player: null, published: false });
    const [mvpInput, setMvpInput] = useState("");

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoggingIn(true);
        setLoginError("");
        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (res.ok) setAuthed(true);
            else setLoginError("Incorrect password");
        } catch {
            setLoginError("Connection error");
        } finally {
            setLoggingIn(false);
        }
    }

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [teamsRes, matchesRes] = await Promise.all([
                fetch("/api/admin/teams"),
                fetch("/api/matches"),
            ]);
            if (teamsRes.ok) setTeams(await teamsRes.json());
            if (matchesRes.ok) setMatches(await matchesRes.json());
        } catch (e) {
            console.error("Load error:", e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!authed) return;
        loadData();
    }, [authed, loadData]);

    // Load tab-specific data
    useEffect(() => {
        if (!authed) return;
        if (tab === "broadcast") {
            fetch("/api/active-match").then(r => r.json()).then(d => setActiveMatchId(d.activeMatchId || null)).catch(() => {});
        }
        if (tab === "logs") {
            fetch("/api/logs").then(r => r.json()).then(d => setLogs(Array.isArray(d) ? d : [])).catch(() => setLogs([]));
        }
        if (tab === "mvp") {
            fetch("/api/mvp").then(r => r.json()).then(d => setMvpState(d)).catch(() => {});
        }
    }, [authed, tab]);

    function flash(msg: string) {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(""), 3000);
    }

    async function apiCall(url: string, body: any): Promise<{ ok: boolean; error?: string }> {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.ok) return { ok: true };
        try { const d = await res.json(); return { ok: false, error: d.error || `HTTP ${res.status}` }; }
        catch { return { ok: false, error: `HTTP ${res.status}` }; }
    }

    // ── TEAM ACTIONS ──
    async function createTeam() {
        if (!newTeam.name || !newTeam.shortName) return flash("Name & short name required");
        const r = await apiCall("/api/squads", { action: "create_team", ...newTeam });
        if (r.ok) { flash("Team created ✓"); setNewTeam({ name: "", shortName: "", color: "#EAB308", groupId: "A" }); loadData(); }
        else flash(`Failed: ${r.error}`);
    }

    async function deleteTeam(teamId: string) {
        if (!confirm("Delete this team and all its players?")) return;
        const r = await apiCall("/api/squads", { action: "delete_team", teamId });
        if (r.ok) { flash("Team deleted"); loadData(); } else flash(`Failed: ${r.error}`);
    }

    async function addPlayer() {
        if (!newPlayer.name || !newPlayer.teamId) return flash("Player name & team required");
        const r = await apiCall("/api/squads", { action: "add_player", ...newPlayer });
        if (r.ok) { flash("Player added ✓"); setNewPlayer(p => ({ ...p, name: "", price: "0" })); loadData(); }
        else flash(`Failed: ${r.error}`);
    }

    async function deletePlayer(playerId: string) {
        if (await apiCall("/api/squads", { action: "delete_player", playerId })) { flash("Player removed"); loadData(); }
    }

    // ── MATCH ACTIONS ──
    async function createMatch() {
        if (!newMatch.matchNo || !newMatch.team1Id || !newMatch.team2Id) return flash("Fill all match fields");
        if (newMatch.team1Id === newMatch.team2Id) return flash("Team 1 and Team 2 must be different");
        const r = await apiCall("/api/matches", { action: "create_match", ...newMatch });
        if (r.ok) { flash("Match created ✓"); setNewMatch({ matchNo: "", stage: "Group A", group: "A", team1Id: "", team2Id: "", scheduledTime: "" }); loadData(); }
        else flash(`Failed: ${r.error}`);
    }

    async function deleteMatch(matchNo: string) {
        if (!confirm("Delete this match?")) return;
        if (await apiCall("/api/matches", { action: "delete_match", matchNo })) { flash("Match deleted"); loadData(); }
    }

    // ── BROADCAST ACTIONS ──
    async function setActiveLiveMatch(matchNo: string | null) {
        await apiCall("/api/active-match", { activeMatchId: matchNo });
        setActiveMatchId(matchNo);
        flash(matchNo ? `Match ${matchNo} set as LIVE` : "Live match cleared");
    }

    // ── MVP ACTIONS ──
    async function updateMvp(player: string | null, published: boolean) {
        await apiCall("/api/mvp", { player, published });
        setMvpState({ player, published });
        flash(published ? `MVP published: ${player}` : "MVP unpublished");
    }

    // ── Styles ──
    const inputCls = "w-full bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50 transition-colors";
    const btnCls = "px-4 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-colors";
    const btnPrimary = `${btnCls} bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20`;
    const btnDanger = `${btnCls} bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20`;

    // ── LOGIN ──
    if (!authed) {
        return (
            <ErrorBoundary>
                <main className="min-h-screen flex items-center justify-center px-4">
                    <div className="w-full max-w-sm">
                        <div className="mb-10 text-center">
                            <h1 className="text-5xl text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>ADMIN</h1>
                            <p className="text-xs tracking-[0.4em] text-zinc-600">VARCHASVA S2</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={inputCls} />
                            {loginError && <p className="text-xs text-red-500 tracking-wider">{loginError}</p>}
                            <button type="submit" disabled={loggingIn} className={`w-full py-3.5 rounded-xl ${btnPrimary}`}>
                                {loggingIn ? "AUTHENTICATING..." : "ENTER"}
                            </button>
                        </form>
                    </div>
                </main>
            </ErrorBoundary>
        );
    }

    // ── ADMIN PANEL ──
    return (
        <ErrorBoundary>
            <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="relative z-10 mb-10 flex items-end justify-between">
                        <div>
                            <p className="text-[11px] tracking-[0.5em] text-zinc-600 mb-2">ADMIN PANEL S2</p>
                            <h1 className="text-5xl md:text-6xl text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>TOURNAMENT</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={loadData} className="text-zinc-700 hover:text-amber-400 transition-colors"><RefreshCw className="w-4 h-4" /></button>
                            <button onClick={() => setAuthed(false)} className="flex items-center gap-2 text-xs text-zinc-700 hover:text-white transition-colors">
                                <LogOut className="w-4 h-4" /><span className="hidden md:block tracking-widest">LOG OUT</span>
                            </button>
                        </div>
                    </div>

                    {/* Flash message */}
                    {actionMsg && (
                        <div className="mb-6 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs tracking-wider font-bold text-center">
                            {actionMsg}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-6 mb-8 border-b border-white/[0.05] overflow-x-auto custom-scrollbar">
                        {(["teams", "matches", "broadcast", "logs", "mvp"] as Tab[]).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className="pb-3 text-xs tracking-[0.3em] transition-colors whitespace-nowrap uppercase"
                                style={{ color: tab === t ? "#F59E0B" : "#52525B", borderBottom: tab === t ? "2px solid #F59E0B" : "2px solid transparent", marginBottom: "-1px" }}>
                                {t}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <p className="text-zinc-500 tracking-widest text-sm text-center py-20">LOADING DATA...</p>
                    ) : (
                        <div>
                            {/* ════════════════ TEAMS TAB ════════════════ */}
                            {tab === "teams" && (
                                <div className="space-y-8">
                                    {/* Create Team Form */}
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
                                        <h3 className="text-xs tracking-[0.3em] text-zinc-500 mb-4 uppercase font-bold flex items-center gap-2"><Plus className="w-3 h-3" /> Create Team</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                            <input className={inputCls} placeholder="Team Name" value={newTeam.name} onChange={e => setNewTeam(t => ({ ...t, name: e.target.value }))} />
                                            <input className={inputCls} placeholder="Short Name (3 chars)" value={newTeam.shortName} onChange={e => setNewTeam(t => ({ ...t, shortName: e.target.value }))} maxLength={4} />
                                            <input className={inputCls} placeholder="Group (e.g. A, B, C)" value={newTeam.groupId} onChange={e => setNewTeam(t => ({ ...t, groupId: e.target.value.toUpperCase() }))} maxLength={4} />
                                            <input className={inputCls} type="color" value={newTeam.color} onChange={e => setNewTeam(t => ({ ...t, color: e.target.value }))} />
                                        </div>
                                        <button onClick={createTeam} className={btnPrimary}>CREATE TEAM</button>
                                    </div>

                                    {/* Add Player Form */}
                                    {teams.length > 0 && (
                                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
                                            <h3 className="text-xs tracking-[0.3em] text-zinc-500 mb-4 uppercase font-bold flex items-center gap-2"><Plus className="w-3 h-3" /> Add Player</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                <input className={inputCls} placeholder="Player Name" value={newPlayer.name} onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))} />
                                                <select className={inputCls} value={newPlayer.role} onChange={e => setNewPlayer(p => ({ ...p, role: e.target.value }))}>
                                                    <option>Batsman</option><option>Bowler</option><option>All Rounder</option><option>Wicketkeeper</option>
                                                </select>
                                                <input className={inputCls} placeholder="Price" type="number" value={newPlayer.price} onChange={e => setNewPlayer(p => ({ ...p, price: e.target.value }))} />
                                                <select className={inputCls} value={newPlayer.teamId} onChange={e => setNewPlayer(p => ({ ...p, teamId: e.target.value }))}>
                                                    <option value="">Select Team</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                            <button onClick={addPlayer} className={btnPrimary}>ADD PLAYER</button>
                                        </div>
                                    )}

                                    {/* Team List */}
                                    <div className="space-y-4">
                                        {teams.map(t => (
                                            <div key={t.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: t.color, borderColor: `${t.color}60` }} />
                                                        <span className="font-bold tracking-wider text-white">{t.name}</span>
                                                        <span className="text-[10px] text-zinc-600 tracking-widest">{t.shortName} · GROUP {t.groupId}</span>
                                                    </div>
                                                    <button onClick={() => deleteTeam(t.id)} className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                                {t.players.length > 0 ? (
                                                    <div className="space-y-1 ml-7">
                                                        {t.players.map(p => (
                                                            <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/[0.03] last:border-0">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-zinc-300">{p.name}</span>
                                                                    <span className="text-[9px] text-zinc-600 tracking-widest uppercase">{p.role}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs text-amber-500 font-mono">{p.price}</span>
                                                                    <button onClick={() => deletePlayer(p.id)} className="text-zinc-800 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-zinc-700 text-xs ml-7 tracking-widest">NO PLAYERS YET</p>
                                                )}
                                            </div>
                                        ))}
                                        {teams.length === 0 && <p className="text-zinc-600 text-xs py-8 text-center tracking-widest">NO TEAMS — CREATE ONE ABOVE</p>}
                                    </div>
                                </div>
                            )}

                            {/* ════════════════ MATCHES TAB ════════════════ */}
                            {tab === "matches" && (
                                <div className="space-y-8">
                                    {teams.length >= 2 && (
                                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
                                            <h3 className="text-xs tracking-[0.3em] text-zinc-500 mb-4 uppercase font-bold flex items-center gap-2"><Plus className="w-3 h-3" /> Create Match</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                                <input className={inputCls} placeholder="Match No (e.g. M 1)" value={newMatch.matchNo} onChange={e => setNewMatch(m => ({ ...m, matchNo: e.target.value }))} />
                                                <input className={inputCls} placeholder="Stage (e.g. Group A, Final)" value={newMatch.stage} onChange={e => setNewMatch(m => ({ ...m, stage: e.target.value }))} />
                                                <input className={inputCls} placeholder="Group (e.g. A, B, -)" value={newMatch.group} onChange={e => setNewMatch(m => ({ ...m, group: e.target.value }))} maxLength={4} />
                                                <select className={inputCls} value={newMatch.team1Id} onChange={e => setNewMatch(m => ({ ...m, team1Id: e.target.value }))}>
                                                    <option value="">Team 1</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                <select className={inputCls} value={newMatch.team2Id} onChange={e => setNewMatch(m => ({ ...m, team2Id: e.target.value }))}>
                                                    <option value="">Team 2</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                <input className={inputCls} type="datetime-local" value={newMatch.scheduledTime} onChange={e => setNewMatch(m => ({ ...m, scheduledTime: e.target.value }))} />
                                            </div>
                                            <button onClick={createMatch} className={btnPrimary}>CREATE MATCH</button>
                                        </div>
                                    )}
                                    {teams.length < 2 && <p className="text-zinc-500 text-xs py-4 tracking-widest text-center">ADD AT LEAST 2 TEAMS BEFORE CREATING MATCHES</p>}

                                    <div className="space-y-2">
                                        {matches.map((m: any) => (
                                            <div key={m.matchNo} className="p-4 border border-white/10 rounded-lg flex justify-between items-center bg-black/20">
                                                <div>
                                                    <span className="text-xs text-zinc-500 mr-4 font-mono">{m.matchNo}</span>
                                                    <span className="text-sm font-bold tracking-wider">{m.team1} vs {m.team2}</span>
                                                    <span className="text-[10px] text-zinc-600 ml-3 tracking-widest">{m.stage}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs tracking-widest text-amber-500">{m.winner || "SCHEDULED"}</span>
                                                    <button onClick={() => deleteMatch(m.matchNo)} className="text-zinc-800 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {matches.length === 0 && <p className="text-zinc-600 text-xs py-8 text-center tracking-widest">NO MATCHES CREATED YET</p>}
                                    </div>
                                </div>
                            )}

                            {/* ════════════════ BROADCAST TAB ════════════════ */}
                            {tab === "broadcast" && (
                                <div className="space-y-8">
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 text-center">
                                        <Radio className="w-8 h-8 text-red-500 mx-auto mb-4" />
                                        <h3 className="text-xs tracking-[0.3em] text-zinc-500 mb-2 uppercase font-bold">LIVE BROADCAST CONTROL</h3>
                                        <p className="text-sm text-zinc-400 mb-6">
                                            Active Match: <span className={`font-bold ${activeMatchId ? "text-red-400" : "text-zinc-600"}`}>{activeMatchId || "NONE"}</span>
                                        </p>
                                        {activeMatchId && (
                                            <button onClick={() => setActiveLiveMatch(null)} className={`${btnDanger} mb-4`}>CLEAR LIVE MATCH</button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-zinc-600 tracking-widest uppercase mb-2">Select a match to broadcast live:</p>
                                        {matches.map((m: any) => (
                                            <button key={m.matchNo} onClick={() => setActiveLiveMatch(m.matchNo)}
                                                className={`w-full p-4 border rounded-lg flex justify-between items-center transition-all text-left ${activeMatchId === m.matchNo ? "border-red-500/40 bg-red-500/10" : "border-white/10 bg-black/20 hover:border-amber-500/30"}`}>
                                                <div>
                                                    <span className="text-xs text-zinc-500 mr-3 font-mono">{m.matchNo}</span>
                                                    <span className="text-sm font-bold tracking-wider">{m.team1} vs {m.team2}</span>
                                                </div>
                                                {activeMatchId === m.matchNo && <span className="text-[10px] text-red-400 font-bold tracking-widest animate-pulse">● LIVE</span>}
                                            </button>
                                        ))}
                                        {matches.length === 0 && <p className="text-zinc-600 text-xs py-8 text-center tracking-widest">NO MATCHES TO BROADCAST</p>}
                                    </div>
                                </div>
                            )}

                            {/* ════════════════ LOGS TAB ════════════════ */}
                            {tab === "logs" && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs tracking-[0.3em] text-zinc-500 uppercase font-bold flex items-center gap-2"><ScrollText className="w-3 h-3" /> Scoring Audit Trail</h3>
                                        <button onClick={() => fetch("/api/logs").then(r => r.json()).then(d => setLogs(Array.isArray(d) ? d : []))} className="text-zinc-700 hover:text-amber-400 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="max-h-[60vh] overflow-y-auto space-y-1 custom-scrollbar">
                                        {logs.map((log: any, i: number) => (
                                            <div key={i} className="p-3 border border-white/[0.04] rounded-lg bg-black/20 text-xs">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-zinc-400 font-bold uppercase tracking-wider">{log.action}</span>
                                                    <span className="text-[9px] text-zinc-700 font-mono">{log.matchId} · {new Date(log.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                {log.details && <p className="text-zinc-600 mt-1 text-[11px]">{typeof log.details === "string" ? log.details : JSON.stringify(log.details)}</p>}
                                            </div>
                                        ))}
                                        {logs.length === 0 && <p className="text-zinc-600 text-xs py-12 text-center tracking-widest">NO LOGS RECORDED YET</p>}
                                    </div>
                                </div>
                            )}

                            {/* ════════════════ MVP TAB ════════════════ */}
                            {tab === "mvp" && (
                                <div className="space-y-8">
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-8 text-center">
                                        <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-4" />
                                        <h3 className="text-xs tracking-[0.3em] text-zinc-500 mb-2 uppercase font-bold">TOURNAMENT MVP</h3>
                                        <p className="text-lg text-white font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                                            {mvpState.player || "NOT SET"}
                                        </p>
                                        <p className="text-[10px] text-zinc-600 tracking-widest mb-6">
                                            {mvpState.published ? "✅ PUBLISHED — VISIBLE ON STATS PAGE" : "🔒 NOT PUBLISHED"}
                                        </p>

                                        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
                                            <input className={`${inputCls} flex-1`} placeholder="Player name" value={mvpInput} onChange={e => setMvpInput(e.target.value)} />
                                            <button onClick={() => { updateMvp(mvpInput || null, false); }} className={btnPrimary}>SET MVP</button>
                                        </div>

                                        <div className="flex gap-3 justify-center">
                                            {mvpState.player && !mvpState.published && (
                                                <button onClick={() => updateMvp(mvpState.player, true)} className={btnPrimary}>PUBLISH MVP</button>
                                            )}
                                            {mvpState.published && (
                                                <button onClick={() => updateMvp(mvpState.player, false)} className={btnDanger}>UNPUBLISH</button>
                                            )}
                                            {mvpState.player && (
                                                <button onClick={() => { updateMvp(null, false); setMvpInput(""); }} className={btnDanger}>CLEAR MVP</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </ErrorBoundary>
    );
}
