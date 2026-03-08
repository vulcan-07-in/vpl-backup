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
import { GripVertical, Check, LogOut, ChevronRight } from "lucide-react";
import { generateFixtures, resolveKnockouts, calculateStandings, SQUADS_CSV_URL, type Fixture, type Team } from "@/lib/tournament";

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = "pools" | "fixtures";
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

    const isKnockout = fixture.pool === "-";

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

            {/* Winner picker (only for pool matches or if teams are known) */}
            {(!isKnockout || (!fixture.team1.includes("Pool") && !fixture.team2.includes("Pool") && fixture.team1 !== "TBD" && fixture.team2 !== "TBD")) ? (
                <div className="flex items-center gap-1 shrink-0">
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
    const [poolA, setPoolA] = useState<string[]>([]);
    const [poolB, setPoolB] = useState<string[]>([]);
    const [unassigned, setUnassigned] = useState<string[]>([]);

    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [tab, setTab] = useState<Tab>("pools");
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");
    const [manualOverrides, setManualOverrides] = useState<Overrides>({});
    const [bracketMsg, setBracketMsg] = useState("");
    const [resetConfirm, setResetConfirm] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Load teams from Squads sheet
    useEffect(() => {
        Papa.parse<{ TeamName: string; ShortName: string; Color: string }>(`${SQUADS_CSV_URL}&t=${Date.now()}`, {
            download: true, header: true, skipEmptyLines: true,
            complete: ({ data }) => {
                const t = data.map(r => ({ teamName: r.TeamName, shortName: r.ShortName, color: r.Color ?? "#EAB308" }));
                setTeams(t);
                setUnassigned(t.map(t => t.teamName));
            },
        });
    }, []);

    // Load existing fixtures (if any)
    useEffect(() => {
        if (!authed) return;
        fetch("/api/matches")
            .then(r => r.json())
            .then((data: Fixture[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setFixtures(data);
                    // Rebuild pool assignments from fixtures
                    const pa = new Set<string>();
                    const pb = new Set<string>();
                    data.filter(f => f.pool === "A").forEach(f => { pa.add(f.team1); pa.add(f.team2); });
                    data.filter(f => f.pool === "B").forEach(f => { pb.add(f.team1); pb.add(f.team2); });
                    setPoolA([...pa]);
                    setPoolB([...pb]);
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

    // Pool assignment
    const assignToPool = (team: string, pool: "A" | "B") => {
        if (pool === "A" && poolA.length >= 4) return;
        if (pool === "B" && poolB.length >= 4) return;
        setUnassigned(u => u.filter(t => t !== team));
        setPoolA(p => pool === "A" ? [...p, team] : p.filter(t => t !== team));
        setPoolB(p => pool === "B" ? [...p, team] : p.filter(t => t !== team));
    };
    const removeFromPool = (team: string, pool: "A" | "B") => {
        if (pool === "A") setPoolA(p => p.filter(t => t !== team));
        else setPoolB(p => p.filter(t => t !== team));
        setUnassigned(u => [...u, team]);
    };

    const colorOf = (name: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";

    // Generate
    function handleGenerate() {
        if (poolA.length !== 4 || poolB.length !== 4) return;
        setFixtures(generateFixtures(poolA, poolB));
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([]), // Empty array clears the sheet
            });
            if (res.ok) {
                setFixtures([]);
                setPoolA([]);
                setPoolB([]);
                setManualOverrides({});
                setUnassigned(teams.map(t => t.teamName));
                setBracketMsg("");
                setSaveMsg("All data reset successfully");
                setTab("pools");
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
                headers: { "Content-Type": "application/json" },
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

    // ── Login screen ─────────────────────────────────────────────────────────
    if (!authed) {
        return (
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
        );
    }

    // ── Admin panel ───────────────────────────────────────────────────────────
    return (
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
                <div className="flex gap-6 mb-8 border-b border-white/[0.05]">
                    {(["pools", "fixtures"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="pb-3 text-xs tracking-[0.3em] transition-colors"
                            style={{
                                fontFamily: "var(--font-body)",
                                color: tab === t ? "#F59E0B" : "#52525B",
                                borderBottom: tab === t ? "2px solid #F59E0B" : "2px solid transparent",
                                marginBottom: "-1px",
                            }}
                        >
                            {t.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Pool Setup ─────────────────────────────────────── */}
                {tab === "pools" && (
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
                                                onClick={() => assignToPool(team, "A")}
                                                className="text-[10px] px-3 py-2 rounded-lg border border-white/[0.07] text-zinc-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                                                style={{ fontFamily: "var(--font-body)" }}
                                                title="Add to Pool A"
                                            >
                                                {team} → A
                                            </button>
                                            <button
                                                onClick={() => assignToPool(team, "B")}
                                                className="text-[10px] px-3 py-2 rounded-lg border border-white/[0.07] text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                                                style={{ fontFamily: "var(--font-body)" }}
                                                title="Add to Pool B"
                                            >
                                                → B
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Two pool columns */}
                        <div className="grid grid-cols-2 gap-4">
                            {(["A", "B"] as const).map(pool => {
                                const poolTeams = pool === "A" ? poolA : poolB;
                                return (
                                    <div key={pool} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-bold tracking-widest text-white" style={{ fontFamily: "var(--font-heading)" }}>
                                                POOL {pool}
                                            </span>
                                            <span className="text-[10px] text-zinc-700" style={{ fontFamily: "var(--font-body)" }}>
                                                {poolTeams.length}/4
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {poolTeams.map(team => (
                                                <div key={team}
                                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(team) }} />
                                                    <span className="flex-1 text-sm text-white font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                                                        {team}
                                                    </span>
                                                    <button
                                                        onClick={() => removeFromPool(team, pool)}
                                                        className="text-zinc-700 hover:text-red-400 transition-colors text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                            {Array.from({ length: 4 - poolTeams.length }).map((_, i) => (
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
                                disabled={poolA.length !== 4 || poolB.length !== 4}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.3em] hover:bg-amber-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ fontFamily: "var(--font-body)" }}
                            >
                                GENERATE FIXTURES
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            {(poolA.length !== 4 || poolB.length !== 4) && (
                                <span className="text-xs text-zinc-700" style={{ fontFamily: "var(--font-body)" }}>
                                    Assign 4 teams to each pool first
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
                                    NO FIXTURES YET — GO TO POOLS TAB TO GENERATE
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

                                {/* Tiebreaker panel — shown when 2nd/3rd tied in any pool */}
                                {(() => {
                                    const { poolA: stA, poolB: stB } = calculateStandings(fixtures, teams);
                                    const tiedA = stA.length >= 3 && stA[1].points === stA[2].points;
                                    const tiedB = stB.length >= 3 && stB[1].points === stB[2].points;
                                    if (!tiedA && !tiedB) return null;
                                    return (
                                        <div className="mb-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                                            <p className="text-[10px] tracking-widest text-orange-400 mb-3" style={{ fontFamily: "var(--font-body)" }}>
                                                ⚡ TIE DETECTED — MANUALLY PROMOTE A TEAM TO SEMI-FINALS
                                            </p>
                                            <div className="space-y-3">
                                                {([["A", stA, tiedA], ["B", stB, tiedB]] as const).map(([pool, st, tied]) => {
                                                    if (!tied || st.length < 3) return null;
                                                    const [, p2, p3] = st;
                                                    return (
                                                        <div key={pool}>
                                                            <p className="text-[9px] tracking-widest text-zinc-600 mb-2" style={{ fontFamily: "var(--font-body)" }}>
                                                                POOL {pool} · 2ND PLACE ({p2.points} pts each)
                                                            </p>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {[p2, p3].map(s => (
                                                                    <button
                                                                        key={s.team}
                                                                        onClick={() => setManualOverrides(o => ({ ...o, [pool]: o[pool] === s.team ? undefined : s.team }))}
                                                                        className="text-[10px] px-3 py-1.5 rounded-lg font-bold tracking-wider transition-all"
                                                                        style={{
                                                                            fontFamily: "var(--font-body)",
                                                                            color: colorOf(s.team),
                                                                            backgroundColor: manualOverrides[pool] === s.team ? `${colorOf(s.team)}25` : "transparent",
                                                                            border: `1px solid ${manualOverrides[pool] === s.team ? colorOf(s.team) + "50" : "rgba(255,255,255,0.08)"}`,
                                                                        }}
                                                                    >
                                                                        {manualOverrides[pool] === s.team ? "✓ " : ""}{s.team} → SF
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
            </div>
        </main>
    );
}
