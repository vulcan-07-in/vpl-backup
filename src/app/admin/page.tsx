"use client";

import { useEffect, useState, useCallback } from "react";
import { LogOut } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Basic Types
type Tab = "broadcast" | "matches" | "teams" | "logs" | "mvp";

export default function AdminPage() {
    const [authed, setAuthed] = useState(false);
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loggingIn, setLoggingIn] = useState(false);

    const [tab, setTab] = useState<Tab>("teams");
    const [teams, setTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
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

    // Load Data
    useEffect(() => {
        if (!authed) return;
        setLoading(true);
        Promise.all([
            fetch("/api/squads").then(r => r.json()),
            fetch("/api/matches").then(r => r.json())
        ]).then(([teamsData, matchesData]) => {
            setTeams(teamsData || []);
            setMatches(matchesData || []);
        }).finally(() => setLoading(false));
    }, [authed]);

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
                                VARCHASVA S2
                            </p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                            {loginError && <p className="text-xs text-red-500 tracking-wider">{loginError}</p>}
                            <button
                                type="submit"
                                disabled={loggingIn}
                                className="w-full py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.3em] hover:bg-amber-500/20"
                            >
                                {loggingIn ? "AUTHENTICATING..." : "ENTER"}
                            </button>
                        </form>
                    </div>
                </main>
            </ErrorBoundary>
        );
    }

    // ── Admin panel ─────────────────────────────────────────────────────────
    return (
        <ErrorBoundary>
            <main className="min-h-screen pt-24 pb-16 px-4 md:pt-28">
                <div className="max-w-4xl mx-auto">
                    <div className="relative z-10 mb-10 flex items-end justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <p className="text-[11px] tracking-[0.5em] text-zinc-600">ADMIN PANEL S2</p>
                            </div>
                            <h1 className="text-5xl md:text-6xl text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>
                                TOURNAMENT
                            </h1>
                        </div>
                        <button
                            onClick={() => setAuthed(false)}
                            className="flex items-center gap-2 text-xs text-zinc-700 hover:text-white transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden md:block tracking-widest">LOG OUT</span>
                        </button>
                    </div>

                    <div className="flex gap-6 mb-8 border-b border-white/[0.05] overflow-x-auto custom-scrollbar">
                        {(["broadcast", "matches", "teams", "logs", "mvp"] as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className="pb-3 text-xs tracking-[0.3em] transition-colors whitespace-nowrap uppercase"
                                style={{
                                    color: tab === t ? "#F59E0B" : "#52525B",
                                    borderBottom: tab === t ? "2px solid #F59E0B" : "2px solid transparent",
                                    marginBottom: "-1px",
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <p className="text-zinc-500 tracking-widest text-sm text-center py-20">LOADING DATA...</p>
                    ) : (
                        <div>
                            {tab === "teams" && (
                                <div className="space-y-6">
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 text-center">
                                        <p className="text-zinc-400 text-sm mb-4">Teams Management (S2 Database)</p>
                                        <p className="text-amber-500/80 text-xs tracking-wider mb-6">Connect Prisma to create dynamic teams instead of Google Sheets arrays.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                            {teams.map((t: any, i) => (
                                                <div key={i} className="p-4 border border-white/10 rounded-lg flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || "#ccc" }} />
                                                        <span className="font-bold tracking-wider">{t.teamName}</span>
                                                    </div>
                                                    <span className="text-xs text-zinc-500">{t.players?.length || 0} players</span>
                                                </div>
                                            ))}
                                            {teams.length === 0 && (
                                                <p className="text-zinc-600 text-xs py-4 col-span-2 text-center tracking-widest">NO TEAMS FOUND IN DATABASE</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tab === "matches" && (
                                <div className="space-y-6">
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 text-center">
                                        <p className="text-zinc-400 text-sm mb-4">Match Scheduling</p>
                                        <p className="text-amber-500/80 text-xs tracking-wider mb-6">Dynamically add new matches to PostgreSQL. Overwrites are no longer a problem.</p>
                                        <div className="space-y-2 text-left">
                                            {matches.map((m: any, i) => (
                                                <div key={i} className="p-4 border border-white/10 rounded-lg flex justify-between items-center bg-black/20">
                                                    <div>
                                                        <span className="text-xs text-zinc-500 mr-4 font-mono">{m.matchNo}</span>
                                                        <span className="text-sm font-bold tracking-wider">{m.team1} vs {m.team2}</span>
                                                    </div>
                                                    <span className="text-xs tracking-widest text-amber-500">{m.winner || "SCHEDULED"}</span>
                                                </div>
                                            ))}
                                            {matches.length === 0 && (
                                                <p className="text-zinc-600 text-xs py-4 text-center tracking-widest">NO MATCHES FOUND</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(tab === "broadcast" || tab === "logs" || tab === "mvp") && (
                                <div className="py-20 text-center border border-white/5 rounded-xl bg-white/[0.01]">
                                    <h3 className="text-zinc-500 tracking-[0.3em] text-xs font-bold uppercase">{tab} TAB</h3>
                                    <p className="text-zinc-600 text-xs mt-2">Migrating UI logic to Prisma architecture...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </ErrorBoundary>
    );
}
