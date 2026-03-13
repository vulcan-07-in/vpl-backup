"use client";

import { useEffect, useState, useCallback } from "react";
import Papa from "papaparse";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Check, LogOut, ChevronRight, X } from "lucide-react";
import { generateFixtures, resolveKnockouts, calculateStandings, SQUADS_CSV_URL, type Fixture, type Team } from "@/lib/tournament";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const ADMIN_API_KEY = "vpl_secret_2025";

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = "live" | "groups" | "fixtures" | "teams" | "players" | "logs";
type Overrides = Partial<Record<"A" | "B", string>>;

// ── Sortable fixture row ──────────────────────────────────────────────────────
function SortableRow({
    fixture, teams, onSetWinner, saving,
}: {
    fixture: Fixture;
    teams: Team[];
    onSetWinner: (matchNo: string, winner: string) => void;
    saving: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: fixture.matchNo });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const colorOf = (name: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";
    const shortNameOf = (name: string) => teams.find(t => t.teamName === name)?.shortName ?? name.slice(0, 4).toUpperCase();

    const isKnockout = fixture.group === "-";

    return (
        <div ref={setNodeRef} style={style}
            className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.05] hover:bg-white/[0.02] group">
            {/* Drag handle */}
            <button {...attributes} {...listeners} className="text-zinc-800 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical className="w-4 h-4" />
            </button>

            {/* Match no + stage */}
            <span className="text-xs text-zinc-700 w-8 shrink-0 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                {fixture.matchNo}
            </span>

            {/* Teams */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-semibold text-white truncate" style={{ fontFamily: "var(--font-heading)" }}>
                        {fixture.team1}
                    </span>
                    {!isKnockout && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colorOf(fixture.team1) }} />}
                </div>
                <span className="text-[10px] text-zinc-700 shrink-0 w-6 text-center" style={{ fontFamily: "var(--font-body)" }}>VS</span>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {!isKnockout && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colorOf(fixture.team2) }} />}
                    <span className="text-sm font-semibold text-white truncate" style={{ fontFamily: "var(--font-heading)" }}>
                        {fixture.team2}
                    </span>
                </div>
            </div>

            {/* Winner picker (only for group matches or if teams are known) */}
            {(!isKnockout || (!fixture.team1.includes("Group") && !fixture.team2.includes("Group") && fixture.team1 !== "TBD" && fixture.team2 !== "TBD")) ? (
                <div className="flex flex-col gap-1 shrink-0 items-end">
                    <div className="flex items-center gap-1">
                        {[fixture.team1, fixture.team2].map(team => (
                            <button
                                key={team}
                                disabled={saving}
                                onClick={() => onSetWinner(fixture.matchNo, fixture.winner === team ? "" : team)}
                                className="text-[10px] px-2 py-1 rounded font-bold tracking-wider transition-all"
                                style={{
                                    fontFamily: "var(--font-body)",
                                    color: colorOf(team),
                                    backgroundColor: fixture.winner === team ? `${colorOf(team)}25` : "transparent",
                                    border: `1px solid ${fixture.winner === team ? colorOf(team) + "40" : "rgba(255,255,255,0.06)"}`,
                                }}
                            >
                                {shortNameOf(team)}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <button
                            disabled={saving}
                            onClick={() => onSetWinner(fixture.matchNo, fixture.winner === "TIE" ? "" : "TIE")}
                            className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-widest border transition-all ${fixture.winner === "TIE" ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' : 'text-zinc-500 hover:text-white border-white/5 hover:border-white/20'}`}
                        >
                            TIE
                        </button>
                        <button
                            disabled={saving}
                            onClick={() => onSetWinner(fixture.matchNo, fixture.winner === "ABANDONED" ? "" : "ABANDONED")}
                            className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-widest border transition-all ${fixture.winner === "ABANDONED" ? 'bg-red-500/20 text-red-500 border-red-500/40' : 'text-zinc-500 hover:text-white border-white/5 hover:border-white/20'}`}
                        >
                            ABD
                        </button>
                    </div>
                </div>
            ) : (
                <span className="text-[10px] text-zinc-800 shrink-0 tracking-widest w-28 text-right"
                    style={{ fontFamily: "var(--font-body)" }}>
                    {fixture.stage.toUpperCase()}
                </span>
            )}
        </div>
    );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
    const [authed, setAuthed] = useState(false);
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loggingIn, setLoggingIn] = useState(false);

    const [teams, setTeams] = useState<Team[]>([]);
    const [groupA, setGroupA] = useState<string[]>([]);
    const [groupB, setGroupB] = useState<string[]>([]);
    const [unassigned, setUnassigned] = useState<string[]>([]);

    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [tab, setTab] = useState<Tab>("groups");
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");
    const [manualOverrides, setManualOverrides] = useState<Overrides>({});
    const [bracketMsg, setBracketMsg] = useState("");
    const [resetConfirm, setResetConfirm] = useState(false);

    // Phase 2: Squads management state
    const [fullSquads, setFullSquads] = useState<any[]>([]);
    const [selectedTeamForPlayers, setSelectedTeamForPlayers] = useState("");

    // Helpers for player parsing
    const parsePlayers = (str: string) => {
        if (!str) return [];
        return str.split(',').filter(p => p.trim()).map(p => {
            const parts = p.trim().split(':');
            return { 
                name: parts[0] || "", 
                role: parts[1] || "Batsman", 
                price: parts[2] || "0" 
            };
        }).filter(p => p.name);
    };

    const stringifyPlayers = (players: { name: string, role: string, price: string }[]) => {
        return players.filter(p => p.name).map(p => `${p.name}:${p.role}:${p.price}`).join(', ');
    };
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    
    // Broadcast / Live State
    const [activeLiveMatchId, setActiveLiveMatchId] = useState<string | null>(null);
    const [liveMatchStates, setLiveMatchStates] = useState<Record<string, any>>({});

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const res = await fetch("/api/logs");
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        if (tab === "logs") {
            fetchLogs();
        } else if (tab === "live") {
            fetch("/api/active-match").then(r => r.json()).then(d => setActiveLiveMatchId(d.activeMatchId)).catch(console.error);
            const fetchStatuses = async () => {
                const liveIds = fixtures.filter(f => !f.winner || (f.winner !== "ABANDONED" && f.winner !== "TIE" && !teams.some(t => t.teamName === f.winner))).map(f => f.matchNo);
                const newStates: Record<string, any> = {};
                for (const id of liveIds) {
                    try {
                        const r = await fetch(`/api/live-score?matchId=${id}`);
                        if (r.ok) {
                            newStates[id] = await r.json();
                        }
                    } catch {}
                }
                setLiveMatchStates(prev => ({ ...prev, ...newStates }));
            };
            fetchStatuses();
            const interval = setInterval(fetchStatuses, 10000);
            return () => clearInterval(interval);
        }
    }, [tab, fetchLogs, fixtures, teams]);

    const handleSetActiveMatch = async (matchId: string | null) => {
        try {
            await fetch("/api/active-match", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-vpl-internal-key": ADMIN_API_KEY },
                body: JSON.stringify({ activeMatchId: matchId })
            });
            setActiveLiveMatchId(matchId);
        } catch (e) { console.error(e); }
    };

    // Load teams from Squads sheet
    useEffect(() => {
        const loadSquads = async () => {
            try {
                const res = await fetch("/api/squads");
                if (res.ok) {
                    const data = await res.json();
                    setFullSquads(data);
                    const t = data.map((r: any) => ({
                        teamName: r.TeamName,
                        shortName: r.ShortName,
                        color: r.Color ?? "#EAB308",
                    }));
                    setTeams(t);
                    setUnassigned(t.map((t: any) => t.teamName));
                }
            } catch (e) {
                console.error("Failed to load squads:", e);
            }
        };
        loadSquads();
    }, []);

    // Sync teams state with fullSquads for fixture generation
    useEffect(() => {
        const t = fullSquads.map((r: any) => ({
            teamName: r.TeamName,
            shortName: r.ShortName,
            color: r.Color ?? "#EAB308",
        }));
        setTeams(t);
    }, [fullSquads]);

    // Load existing fixtures (if any)
    useEffect(() => {
        if (!authed) return;
        fetch("/api/matches")
            .then(r => r.json())
            .then((data: Fixture[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setFixtures(data);
                    // Rebuild group assignments from fixtures
                    const ga = new Set<string>();
                    const gb = new Set<string>();
                    data.filter(f => f.group === "A").forEach(f => { ga.add(f.team1); ga.add(f.team2); });
                    data.filter(f => f.group === "B").forEach(f => { gb.add(f.team1); gb.add(f.team2); });
                    setGroupA([...ga]);
                    setGroupB([...gb]);
                    setUnassigned([]);
                    setTab("fixtures");
                }
            })
            .catch(() => { });
    }, [authed]);

    // Auth
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

    // Group assignment
    const assignToGroup = (team: string, group: "A" | "B") => {
        if (group === "A" && groupA.length >= 4) return;
        if (group === "B" && groupB.length >= 4) return;
        setUnassigned(u => u.filter(t => t !== team));
        setGroupA(p => group === "A" ? [...p, team] : p.filter(t => t !== team));
        setGroupB(p => group === "B" ? [...p, team] : p.filter(t => t !== team));
    };
    const removeFromGroup = (team: string, group: "A" | "B") => {
        if (group === "A") setGroupA(p => p.filter(t => t !== team));
        else setGroupB(p => p.filter(t => t !== team));
        setUnassigned(u => [...u, team]);
    };

    const colorOf = (name: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";

    // Generate
    function handleGenerate() {
        if (groupA.length !== 4 || groupB.length !== 4) return;
        setFixtures(generateFixtures(groupA, groupB));
        setTab("fixtures");
    }

    // Drag reorder
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFixtures(items => {
                const ids = items.map(f => f.matchNo);
                return arrayMove(items, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
            });
        }
    }

    // Set winner + auto-resolve bracket
    const setWinner = useCallback((matchNo: string, winner: string) => {
        setFixtures(prev => {
            const updated = prev.map(f => f.matchNo === matchNo ? { ...f, winner } : f);
            const resolved = resolveKnockouts(updated, teams, manualOverrides);
            if (JSON.stringify(resolved) !== JSON.stringify(updated)) setBracketMsg("Bracket auto-updated ✓");
            return resolved;
        });
    }, [teams, manualOverrides]);

    // Re-resolve bracket when overrides change
    useEffect(() => {
        if (fixtures.length === 0) return;
        setFixtures(prev => resolveKnockouts(prev, teams, manualOverrides));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manualOverrides]);

    async function handleReset() {
        if (!resetConfirm) {
            setResetConfirm(true);
            setTimeout(() => setResetConfirm(false), 5000);
            return;
        }
        setResetConfirm(false);
        setSaving(true);
        setSaveMsg("");
        try {
            const res = await fetch("/api/matches", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify([]), // Empty array clears the sheet
            });
            if (res.ok) {
                setFixtures([]);
                setGroupA([]);
                setGroupB([]);
                setManualOverrides({});
                setUnassigned(teams.map(t => t.teamName));
                setBracketMsg("");
                setSaveMsg("All data reset successfully");
                setTab("groups");
            } else {
                setSaveMsg("Error resetting data");
            }
        } catch {
            setSaveMsg("Network error");
        } finally {
            setSaving(false);
        }
    }

    // Save to Sheets — renumber matchNo by play sequence so M1 = first match played
    async function handleSave() {
        setSaving(true);
        setSaveMsg("");
        try {
            const renumbered = fixtures.map((f, i) => ({
                ...f,
                matchNo: `M${i + 1}`,
                sortOrder: i + 1,
            }));
            // Update local state so UI reflects new numbers immediately
            setFixtures(renumbered);
            const res = await fetch("/api/matches", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify(renumbered),
            });

            if (res.ok) {
                setSaveMsg("Saved to Google Sheets ✓");
            } else {
                const data = await res.json();
                setSaveMsg(data.error || "Error saving — check Sheets API setup");
            }
        } catch {
            setSaveMsg("Network error");
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveSquads() {
        setSaving(true);
        setSaveMsg("");
        try {
            const res = await fetch("/api/squads", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify(fullSquads),
            });
            if (res.ok) setSaveMsg("Squads updated in Sheets ✓");
            else setSaveMsg("Error updating squads");
        } catch {
            setSaveMsg("Network error");
        } finally {
            setSaving(false);
        }
    }

    const updateTeam = (teamName: string, field: string, value: string) => {
        setFullSquads(prev => prev.map(t => t.TeamName === teamName ? { ...t, [field]: value } : t));
    };

    const addTeam = () => {
        const newName = `New Team ${fullSquads.length + 1}`;
        setFullSquads(prev => [...prev, { TeamName: newName, ShortName: "NEW", Color: "#EAB308", Players: "" }]);
    };

    const deleteTeam = (name: string) => {
        if (confirm(`Delete ${name}?`)) {
            setFullSquads(prev => prev.filter(t => t.TeamName !== name));
        }
    };

    const updatePlayers = (teamName: string, playersStr: string) => {
        setFullSquads(prev => prev.map(t => t.TeamName === teamName ? { ...t, Players: playersStr } : t));
    };

    // ── Login screen ─────────────────────────────────────────────────────────
    if (!authed) {
        return (
            <ErrorBoundary>
                <main className="min-h-screen flex items-center justify-center px-4">
                    <div className="w-full max-w-sm">
                    <div className="mb-10 text-center">
                        <h1 className="text-5xl text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                            ADMIN
                        </h1>
                        <p className="text-xs tracking-[0.4em] text-zinc-600" style={{ fontFamily: "var(--font-body)" }}>
                            VARCHASVA PREMIER LEAGUE
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50 transition-colors"
                            style={{ fontFamily: "var(--font-body)" }}
                        />
                        {loginError && (
                            <p className="text-xs text-red-500 tracking-wider" style={{ fontFamily: "var(--font-body)" }}>
                                {loginError}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={loggingIn}
                            className="w-full py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.3em] hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            {loggingIn ? "AUTHENTICATING..." : "ENTER"}
                        </button>
                    </form>
                </div>
            </main>
        </ErrorBoundary>
        );
    }

    // ── Admin panel ───────────────────────────────────────────────────────────
    return (
        <ErrorBoundary>
            <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28">
                <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="relative z-10 mb-10 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <p className="text-[11px] tracking-[0.5em] text-zinc-600" style={{ fontFamily: "var(--font-body)" }}>
                                ADMIN PANEL
                            </p>
                            {process.env.NEXT_PUBLIC_APP_ENV === "local" && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse" style={{ fontFamily: "var(--font-body)" }}>
                                    TEST DATABASE
                                </span>
                            )}
                        </div>
                        <h1 className="text-5xl md:text-6xl text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>
                            TOURNAMENT
                        </h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleReset}
                            disabled={saving}
                            className={`text-xs tracking-widest transition-colors disabled:opacity-50 ${resetConfirm ? "text-red-600 bg-red-500/10 px-3 py-1.5 rounded" : "text-red-500 hover:text-red-400"}`}
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            {resetConfirm ? "CLICK TO CONFIRM WIPE" : "RESET DATA"}
                        </button>
                        <button
                            onClick={() => setAuthed(false)}
                            className="flex items-center gap-2 text-xs text-zinc-700 hover:text-white transition-colors"
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden md:block tracking-widest">LOG OUT</span>
                        </button>
                    </div>
                </div>

                {saveMsg && (
                    <div className="mb-6 p-3 rounded bg-white/[0.03] border border-white/[0.05]">
                        <p className="text-xs text-zinc-400 tracking-widest text-center" style={{ fontFamily: "var(--font-body)" }}>
                            {saveMsg}
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-6 mb-8 border-b border-white/[0.05] overflow-x-auto custom-scrollbar">
                    {(["live", "fixtures", "groups", "teams", "players", "logs"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="pb-3 text-xs tracking-[0.3em] transition-colors whitespace-nowrap"
                            style={{
                                fontFamily: "var(--font-body)",
                                color: tab === t ? "#F59E0B" : "#52525B",
                                borderBottom: tab === t ? "2px solid #F59E0B" : "2px solid transparent",
                                marginBottom: "-1px",
                            }}
                        >
                            {t === "groups" ? "GROUPS" : t.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Live Broadcast ────────────────────────────────────── */}
                {tab === "live" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs tracking-[0.4em] text-zinc-600 font-bold uppercase">Broadcast Control</h2>
                        </div>
                        {fixtures.length === 0 ? (
                            <div className="py-16 text-center text-zinc-700 text-xs tracking-widest">
                                NO FIXTURES SCHEDULED
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {fixtures.map(f => (
                                    <div key={f.matchNo} className={`flex items-center justify-between p-5 bg-zinc-900 border rounded-xl transition-all ${activeLiveMatchId === f.matchNo ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800'}`}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">MATCH {f.matchNo}</span>
                                                {f.winner && (
                                                    <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">FIN</span>
                                                )}
                                                {activeLiveMatchId === f.matchNo && (
                                                    <span className="text-[9px] bg-red-500/20 text-red-500 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest animate-pulse">ON AIR</span>
                                                )}
                                                {liveMatchStates[f.matchNo] && (
                                                    <span title={`Status: ${liveMatchStates[f.matchNo].status}`} className={`text-[9px] border px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${Date.now() - (liveMatchStates[f.matchNo].lastSyncedAt || 0) < 30000 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'}`}>
                                                        {Date.now() - (liveMatchStates[f.matchNo].lastSyncedAt || 0) < 30000 ? 'SCORER ONLINE' : 'SCORER OFFLINE'}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xl font-bold text-white tracking-wide block" style={{ fontFamily: "var(--font-heading)" }}>
                                                {f.team1} <span className="text-zinc-600 mx-1">vs</span> {f.team2}
                                            </span>
                                            {f.winner && (
                                                <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mt-1 block">
                                                    {['ABANDONED', 'TIE'].includes(f.winner) ? f.winner : `${f.winner} WON`}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2 ml-4">
                                            <button
                                                onClick={() => handleSetActiveMatch(activeLiveMatchId === f.matchNo ? null : f.matchNo)}
                                                className={`text-[9px] font-bold px-4 py-2 rounded-lg border transition-all ${activeLiveMatchId === f.matchNo ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20'}`}
                                            >
                                                {activeLiveMatchId === f.matchNo ? 'REMOVE FROM BROADCAST' : 'SET AS LIVE'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Group Setup ─────────────────────────────────────── */}
                {tab === "groups" && (
                    <div>
                        {/* Unassigned teams */}
                        {unassigned.length > 0 && (
                            <div className="mb-8">
                                <p className="text-[10px] tracking-[0.4em] text-zinc-600 mb-3" style={{ fontFamily: "var(--font-body)" }}>
                                    UNASSIGNED TEAMS — click to assign
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {unassigned.map(team => (
                                        <div key={team} className="flex items-center gap-1">
                                            <button
                                                onClick={() => assignToGroup(team, "A")}
                                                className="text-[10px] px-3 py-2 rounded-lg border border-white/[0.07] text-zinc-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                                                style={{ fontFamily: "var(--font-body)" }}
                                                title="Add to Group A"
                                            >
                                                {team} → A
                                            </button>
                                            <button
                                                onClick={() => assignToGroup(team, "B")}
                                                className="text-[10px] px-3 py-2 rounded-lg border border-white/[0.07] text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                                                style={{ fontFamily: "var(--font-body)" }}
                                                title="Add to Group B"
                                            >
                                                → B
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Two group columns */}
                        <div className="grid grid-cols-2 gap-4">
                            {(["A", "B"] as const).map(group => {
                                const groupTeams = group === "A" ? groupA : groupB;
                                return (
                                    <div key={group} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-bold tracking-widest text-white" style={{ fontFamily: "var(--font-heading)" }}>
                                                GROUP {group}
                                            </span>
                                            <span className="text-[10px] text-zinc-700" style={{ fontFamily: "var(--font-body)" }}>
                                                {groupTeams.length}/4
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {groupTeams.map(team => (
                                                <div key={team}
                                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(team) }} />
                                                    <span className="flex-1 text-sm text-white font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                                                        {team}
                                                    </span>
                                                    <button
                                                        onClick={() => removeFromGroup(team, group)}
                                                        className="text-zinc-700 hover:text-red-400 transition-colors text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                            {Array.from({ length: 4 - groupTeams.length }).map((_, i) => (
                                                <div key={i} className="h-10 rounded-xl border border-dashed border-white/[0.04]" />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Generate button */}
                        <div className="mt-8 flex items-center gap-4">
                            <button
                                onClick={handleGenerate}
                                disabled={groupA.length !== 4 || groupB.length !== 4}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.3em] hover:bg-amber-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ fontFamily: "var(--font-body)" }}
                            >
                                GENERATE FIXTURES
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            {(groupA.length !== 4 || groupB.length !== 4) && (
                                <span className="text-xs text-zinc-700" style={{ fontFamily: "var(--font-body)" }}>
                                    Assign 4 teams to each group first
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tab: Fixtures ──────────────────────────────────────── */}
                {tab === "fixtures" && (
                    <div>
                        {fixtures.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-zinc-700 text-xs tracking-widest" style={{ fontFamily: "var(--font-body)" }}>
                                    NO FIXTURES YET — GO TO GROUPS TAB TO GENERATE
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-[10px] text-zinc-700 mb-4 tracking-widest" style={{ fontFamily: "var(--font-body)" }}>
                                    DRAG TO REORDER · CLICK TEAM NAME TO SET WINNER
                                </p>

                                {/* Bracket status */}
                                {bracketMsg && (
                                    <p className="text-[10px] text-emerald-400 tracking-widest mb-4" style={{ fontFamily: "var(--font-body)" }}>
                                        {bracketMsg}
                                    </p>
                                )}

                                {/* Tiebreaker panel — shown when 2nd/3rd tied in any group */}
                                {(() => {
                                    const { groupA: stA, groupB: stB } = calculateStandings(fixtures, teams);
                                    const tiedA = stA.length >= 3 && stA[1].points === stA[2].points;
                                    const tiedB = stB.length >= 3 && stB[1].points === stB[2].points;
                                    if (!tiedA && !tiedB) return null;
                                    return (
                                        <div className="mb-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                                            <p className="text-[10px] tracking-widest text-orange-400 mb-3" style={{ fontFamily: "var(--font-body)" }}>
                                                ⚡ TIE DETECTED — MANUALLY PROMOTE A TEAM TO SEMI-FINALS
                                            </p>
                                            <div className="space-y-3">
                                                {([["A", stA, tiedA], ["B", stB, tiedB]] as const).map(([group, st, tied]) => {
                                                    if (!tied || st.length < 3) return null;
                                                    const [, p2, p3] = st;
                                                    return (
                                                        <div key={group}>
                                                            <p className="text-[9px] tracking-widest text-zinc-600 mb-2" style={{ fontFamily: "var(--font-body)" }}>
                                                                GROUP {group} · 2ND PLACE ({p2.points} pts each)
                                                            </p>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {[p2, p3].map(s => (
                                                                    <button
                                                                        key={s.team}
                                                                        onClick={() => setManualOverrides(o => ({ ...o, [group]: o[group] === s.team ? undefined : s.team }))}
                                                                        className="text-[10px] px-3 py-1.5 rounded-lg font-bold tracking-wider transition-all"
                                                                        style={{
                                                                            fontFamily: "var(--font-body)",
                                                                            color: colorOf(s.team),
                                                                            backgroundColor: manualOverrides[group] === s.team ? `${colorOf(s.team)}25` : "transparent",
                                                                            border: `1px solid ${manualOverrides[group] === s.team ? colorOf(s.team) + "50" : "rgba(255,255,255,0.08)"}`,
                                                                        }}
                                                                    >
                                                                        {manualOverrides[group] === s.team ? "✓ " : ""}{s.team} → SF
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext
                                        items={fixtures.map(f => f.matchNo)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {fixtures.map(f => (
                                            <SortableRow
                                                key={f.matchNo}
                                                fixture={f}
                                                teams={teams}
                                                onSetWinner={setWinner}
                                                saving={saving}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>

                                <div className="mt-8 flex items-center gap-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.3em] hover:bg-amber-500/20 disabled:opacity-40 transition-all"
                                        style={{ fontFamily: "var(--font-body)" }}
                                    >
                                        <Check className="w-4 h-4" />
                                        {saving ? "SAVING..." : "SAVE TO SHEETS"}
                                    </button>
                                    {saveMsg && (
                                        <span className="text-xs text-zinc-500" style={{ fontFamily: "var(--font-body)" }}>
                                            {saveMsg}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Tab: Teams Management ──────────────────────────────────── */}
                {tab === "teams" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs tracking-[0.4em] text-zinc-600 font-bold uppercase">Tournament Teams</h2>
                            <button
                                onClick={addTeam}
                                className="text-[10px] px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold tracking-widest hover:bg-amber-500/20 transition-all"
                            >
                                + ADD TEAM
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {fullSquads.map((t, idx) => (
                                <div key={idx} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 flex items-center gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] text-zinc-600 tracking-widest uppercase mb-1.5 block">Team Name</label>
                                                <input
                                                    type="text"
                                                    value={t.TeamName}
                                                    onChange={(e) => updateTeam(t.TeamName, "TeamName", e.target.value)}
                                                    className="w-full bg-black/20 border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500/30 transition-all outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-600 tracking-widest uppercase mb-1.5 block">Short Name</label>
                                                <input
                                                    type="text"
                                                    value={t.ShortName}
                                                    onChange={(e) => updateTeam(t.TeamName, "ShortName", e.target.value)}
                                                    className="w-full bg-black/20 border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500/30 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-600 tracking-widest uppercase mb-1.5 block">Theme Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={t.Color}
                                                    onChange={(e) => updateTeam(t.TeamName, "Color", e.target.value)}
                                                    className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={t.Color}
                                                    onChange={(e) => updateTeam(t.TeamName, "Color", e.target.value)}
                                                    className="flex-1 bg-black/20 border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-zinc-400 font-mono outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteTeam(t.TeamName)}
                                        className="p-3 text-zinc-800 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-white/[0.05]">
                            <button
                                onClick={handleSaveSquads}
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-amber-500 text-black text-xs font-bold tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)]"
                            >
                                <Check className="w-4 h-4" />
                                {saving ? "UPDATING..." : "SAVE TEAMS TO SHEETS"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Tab: Players Management ────────────────────────────────── */}
                {tab === "players" && (
                    <div className="space-y-6">
                        <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                            {fullSquads.map((t) => (
                                <button
                                    key={t.TeamName}
                                    onClick={() => setSelectedTeamForPlayers(t.TeamName)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest whitespace-nowrap transition-all border ${selectedTeamForPlayers === t.TeamName ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white/[0.02] border-white/[0.05] text-zinc-600 hover:text-zinc-400'}`}
                                >
                                    {t.ShortName}
                                </button>
                            ))}
                        </div>

                                {selectedTeamForPlayers && (
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8">
                                        <div className="mb-6 flex justify-between items-end">
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)" }}>
                                                    {selectedTeamForPlayers} Squad
                                                </h3>
                                                <p className="text-[10px] text-zinc-600 tracking-[0.2em] font-medium leading-relaxed">
                                                    Manage players, roles, and auction prices for the team.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const team = fullSquads.find(t => t.TeamName === selectedTeamForPlayers);
                                                    if (!team) return;
                                                    const currentPlayers = parsePlayers(team.Players || "");
                                                    const updated = stringifyPlayers([...currentPlayers, { name: "New Player", role: "Batsman", price: "0" }]);
                                                    updatePlayers(selectedTeamForPlayers, updated);
                                                }}
                                                className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all"
                                            >
                                                + Add Player
                                            </button>
                                        </div>

                                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {parsePlayers(fullSquads.find(t => t.TeamName === selectedTeamForPlayers)?.Players || "").map((p, idx, arr) => (
                                                <div key={idx} className="flex gap-3 items-center bg-black/40 border border-white/[0.05] p-3 rounded-2xl group transition-all hover:border-white/[0.1]">
                                                    <input
                                                        value={p.name}
                                                        onChange={(e) => {
                                                            const newArr = [...arr];
                                                            newArr[idx].name = e.target.value;
                                                            updatePlayers(selectedTeamForPlayers, stringifyPlayers(newArr));
                                                        }}
                                                        className="flex-1 bg-transparent border-b border-white/10 text-white font-bold px-2 py-1 outline-none focus:border-amber-500/50 transition-all text-sm"
                                                        placeholder="Player Name"
                                                    />
                                                    <select
                                                        value={p.role}
                                                        onChange={(e) => {
                                                            const newArr = [...arr];
                                                            newArr[idx].role = e.target.value;
                                                            updatePlayers(selectedTeamForPlayers, stringifyPlayers(newArr));
                                                        }}
                                                        className="bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase py-1 px-3 rounded-lg border border-white/5 outline-none focus:border-amber-500/50"
                                                    >
                                                        <option value="Batsman">Batsman</option>
                                                        <option value="Bowler">Bowler</option>
                                                        <option value="All-Rounder">All-Rounder</option>
                                                        <option value="Wicket-Keeper">Wicket-Keeper</option>
                                                    </select>
                                                    <div className="flex items-center gap-1 bg-zinc-900 border border-white/5 px-2 py-1 rounded-lg">
                                                        <span className="text-[9px] text-zinc-600 font-bold">₹</span>
                                                        <input
                                                            value={p.price}
                                                            onChange={(e) => {
                                                                const newArr = [...arr];
                                                                newArr[idx].price = e.target.value;
                                                                updatePlayers(selectedTeamForPlayers, stringifyPlayers(newArr));
                                                            }}
                                                            className="w-16 bg-transparent text-amber-500 font-mono text-xs outline-none"
                                                            placeholder="Price"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newArr = arr.filter((_, i) => i !== idx);
                                                            updatePlayers(selectedTeamForPlayers, stringifyPlayers(newArr));
                                                        }}
                                                        className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-8 flex items-center justify-between">
                                            <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
                                                Changes are saved locally until you sync with Sheets
                                            </p>
                                            <button
                                                onClick={handleSaveSquads}
                                                disabled={saving}
                                                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-amber-500 text-black text-xs font-bold tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(245,158,11,0.15)]"
                                            >
                                                <Check className="w-4 h-4" />
                                                {saving ? "UPDATING..." : "SYNC SQUADS TO SHEETS"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                    </div>
                )}
                {/* ── Tab: Logs ─────────────────────────────────────────────── */}
                {tab === "logs" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs tracking-[0.4em] text-zinc-600 font-bold uppercase">Activity Logs</h2>
                            <button
                                onClick={fetchLogs}
                                disabled={loadingLogs}
                                className="text-[10px] px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-zinc-500 hover:text-white transition-all"
                            >
                                {loadingLogs ? "REFRESHING..." : "REFRESH"}
                            </button>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.03] border-b border-white/[0.05]">
                                        <th className="px-6 py-4 text-left text-[9px] tracking-widest text-zinc-600 uppercase">Timestamp</th>
                                        <th className="px-6 py-4 text-left text-[9px] tracking-widest text-zinc-600 uppercase">Match</th>
                                        <th className="px-6 py-4 text-left text-[9px] tracking-widest text-zinc-600 uppercase">Action</th>
                                        <th className="px-6 py-4 text-left text-[9px] tracking-widest text-zinc-600 uppercase">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-xs text-zinc-700 tracking-widest">
                                                NO LOGS RECORDED YET
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="px-6 py-4 text-[10px] tabular-nums text-zinc-500 font-mono">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-bold text-amber-500/80 tracking-widest bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">
                                                        MATCH {log.matchId}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold tracking-widest ${log.action === "SCORE_UPDATE" ? "text-emerald-400" : "text-blue-400"}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <pre className="text-[9px] text-zinc-400 font-mono max-w-md overflow-hidden text-ellipsis">
                                                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </main>
        </ErrorBoundary>
    );
}
