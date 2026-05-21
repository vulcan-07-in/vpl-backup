"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Users, BarChart3, RefreshCw, Zap, Trash2, Monitor, Smartphone, Tablet,
    TrendingUp, Eye, ChevronRight, ArrowLeft, ShieldAlert, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalyticsData {
    totalConcurrent: number;
    concurrentsByPage: Record<string, number>;
    pageHits: Record<string, number>;
    deviceBreakdown: Record<string, number>;
    squadViews: Record<string, number>;
}

const PAGE_LABELS: Record<string, string> = {
    "/": "Home",
    "/live": "Live Match",
    "/auction": "Auction",
    "/squads": "Squads",
    "/points": "Standings",
    "/matches": "Matches",
    "/stats": "Stats",
    "/scorer": "Scorer",
};

const PAGE_COLORS: Record<string, string> = {
    "/": "#6366f1",
    "/live": "#ef4444",
    "/auction": "#f59e0b",
    "/squads": "#10b981",
    "/points": "#3b82f6",
    "/matches": "#8b5cf6",
    "/stats": "#ec4899",
    "/scorer": "#f97316",
};

function DeviceIcon({ device }: { device: string }) {
    if (device === "Mobile") return <Smartphone size={16} className="text-blue-400" />;
    if (device === "Tablet") return <Tablet size={16} className="text-purple-400" />;
    return <Monitor size={16} className="text-emerald-400" />;
}

export default function AnalyticsDashboard() {
    const [authenticated, setAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionMsg, setActionMsg] = useState("");
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

    useEffect(() => {
        fetch("/api/admin/check")
            .then(res => { if (res.ok) setAuthenticated(true); })
            .finally(() => setCheckingAuth(false));
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/analytics");
            if (res.ok) {
                setData(await res.json());
                setLastRefreshed(new Date());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authenticated) {
            fetchData();
            const interval = setInterval(fetchData, 20_000);
            return () => clearInterval(interval);
        }
    }, [authenticated, fetchData]);

    async function handleControl(action: string) {
        const confirmed = action === "reset"
            ? confirm("⚠️ This will wipe all analytics data. Are you sure?")
            : true;
        if (!confirmed) return;

        setActionMsg("");
        const res = await fetch("/api/admin/analytics/control", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        const json = await res.json();
        setActionMsg(json.message || json.error || "Done");
        setTimeout(() => setActionMsg(""), 4000);
        await fetchData();
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError("");
        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (res.ok) setAuthenticated(true);
            else setAuthError("Invalid password");
        } catch {
            setAuthError("Error connecting to server");
        } finally {
            setAuthLoading(false);
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
                    <h1 className="text-2xl font-black text-center mb-2 tracking-widest">ANALYTICS ACCESS</h1>
                    <p className="text-zinc-500 text-center text-sm mb-8">Admin credentials required.</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Master Password"
                            className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-center tracking-[0.5em] font-mono focus:border-amber-500/50 outline-none transition-all"
                        />
                        {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
                        <button type="submit" disabled={authLoading || !password}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl tracking-widest uppercase transition-colors disabled:opacity-50">
                            {authLoading ? "Authenticating..." : "Authorize"}
                        </button>
                    </form>
                    <Link href="/admin" className="flex items-center justify-center gap-2 mt-6 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                        <ArrowLeft size={12} /> Back to Admin Hub
                    </Link>
                </div>
            </div>
        );
    }

    // ── Derived metrics ──────────────────────────────────────────────────────
    const totalPageHits = Object.values(data?.pageHits || {}).reduce((a, b) => a + Number(b), 0);
    const totalDevices = Object.values(data?.deviceBreakdown || {}).reduce((a, b) => a + Number(b), 0);

    const sortedPages = Object.entries(data?.concurrentsByPage || {})
        .sort(([, a], [, b]) => Number(b) - Number(a));

    const sortedHits = Object.entries(data?.pageHits || {})
        .sort(([, a], [, b]) => Number(b) - Number(a));

    const sortedSquads = Object.entries(data?.squadViews || {})
        .sort(([, a], [, b]) => Number(b) - Number(a));

    const maxHits = Math.max(...sortedHits.map(([, v]) => Number(v)), 1);
    const maxSquad = Math.max(...sortedSquads.map(([, v]) => Number(v)), 1);

    return (
        <main className="min-h-screen bg-[#050505] text-white pt-24 pb-16 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 mb-3 transition-colors">
                            <ArrowLeft size={12} /> Admin Hub
                        </Link>
                        <h1 className="text-3xl font-black tracking-widest uppercase flex items-center gap-3">
                            <BarChart3 className="text-amber-500" /> Viewer Analytics
                        </h1>
                        <p className="text-zinc-500 mt-1 text-sm">
                            {lastRefreshed ? `Last updated ${lastRefreshed.toLocaleTimeString()}` : "Loading…"}
                            {" — "}auto-refreshes every 20s
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchData} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold tracking-widest hover:border-zinc-600 transition-all disabled:opacity-50">
                            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> REFRESH
                        </button>
                    </div>
                </div>

                {/* Action message toast */}
                <AnimatePresence>
                    {actionMsg && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mb-6 px-5 py-3 bg-emerald-900/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-bold">
                            ✓ {actionMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                        className="bg-zinc-900/50 border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
                        <div className="flex items-center gap-2 mb-3">
                            <Eye size={14} className="text-amber-500" />
                            <span className="text-[10px] font-black tracking-widest text-amber-500/70 uppercase">Live Now</span>
                        </div>
                        <p className="text-4xl font-mono font-black text-white">{data?.totalConcurrent ?? "—"}</p>
                        <p className="text-xs text-zinc-600 mt-1">concurrent viewers</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-blue-400" />
                            <span className="text-[10px] font-black tracking-widest text-blue-400/70 uppercase">Total Views</span>
                        </div>
                        <p className="text-4xl font-mono font-black text-white">{totalPageHits.toLocaleString()}</p>
                        <p className="text-xs text-zinc-600 mt-1">page views all time</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={14} className="text-emerald-400" />
                            <span className="text-[10px] font-black tracking-widest text-emerald-400/70 uppercase">Squad Views</span>
                        </div>
                        <p className="text-4xl font-mono font-black text-white">
                            {Object.values(data?.squadViews || {}).reduce((a, b) => a + Number(b), 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">team squad opens</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Smartphone size={14} className="text-purple-400" />
                            <span className="text-[10px] font-black tracking-widest text-purple-400/70 uppercase">Mobile %</span>
                        </div>
                        <p className="text-4xl font-mono font-black text-white">
                            {totalDevices > 0 ? Math.round((Number(data?.deviceBreakdown?.Mobile ?? 0) / totalDevices) * 100) : "—"}
                            {totalDevices > 0 && <span className="text-xl text-zinc-500">%</span>}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">on mobile devices</p>
                    </motion.div>
                </div>

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                    {/* Live Concurrent Viewers by Page */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <h2 className="text-sm font-black tracking-widest uppercase">Live by Page</h2>
                            <span className="ml-auto text-xs text-zinc-600">{data?.totalConcurrent ?? 0} total</span>
                        </div>
                        {sortedPages.length === 0 ? (
                            <p className="text-zinc-700 text-sm text-center py-8">No active viewers yet</p>
                        ) : (
                            <div className="space-y-3">
                                {sortedPages.map(([page, count]) => {
                                    const pct = data?.totalConcurrent
                                        ? Math.round((Number(count) / data.totalConcurrent) * 100)
                                        : 0;
                                    const color = PAGE_COLORS[page] ?? "#6366f1";
                                    return (
                                        <div key={page}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-zinc-300">{PAGE_LABELS[page] ?? page}</span>
                                                <span className="text-xs font-mono text-zinc-500">{count} · {pct}%</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>

                    {/* All-Time Page Hits */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp size={14} className="text-blue-400" />
                            <h2 className="text-sm font-black tracking-widest uppercase">All-Time Page Views</h2>
                        </div>
                        {sortedHits.length === 0 ? (
                            <p className="text-zinc-700 text-sm text-center py-8">No data yet</p>
                        ) : (
                            <div className="space-y-3">
                                {sortedHits.map(([page, count]) => {
                                    const pct = Math.round((Number(count) / maxHits) * 100);
                                    const color = PAGE_COLORS[page] ?? "#6366f1";
                                    return (
                                        <div key={page}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-zinc-300">{PAGE_LABELS[page] ?? page}</span>
                                                <span className="text-xs font-mono text-zinc-500">{Number(count).toLocaleString()}</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                                    className="h-full rounded-full opacity-60"
                                                    style={{ backgroundColor: color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                    {/* Device Breakdown */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Monitor size={14} className="text-emerald-400" />
                            <h2 className="text-sm font-black tracking-widest uppercase">Device Breakdown</h2>
                        </div>
                        <div className="flex gap-4">
                            {["Mobile", "Desktop", "Tablet"].map(dev => {
                                const count = Number(data?.deviceBreakdown?.[dev] ?? 0);
                                const pct = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
                                return (
                                    <div key={dev} className="flex-1 bg-zinc-800/50 rounded-xl p-4 flex flex-col items-center gap-2">
                                        <DeviceIcon device={dev} />
                                        <p className="text-2xl font-mono font-black">{pct}%</p>
                                        <p className="text-[10px] text-zinc-500 tracking-widest font-bold uppercase">{dev}</p>
                                        <p className="text-xs text-zinc-700 font-mono">{count.toLocaleString()}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Squad Fan Engagement */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Users size={14} className="text-amber-400" />
                            <h2 className="text-sm font-black tracking-widest uppercase">Squad Fan Engagement</h2>
                        </div>
                        {sortedSquads.length === 0 ? (
                            <p className="text-zinc-700 text-sm text-center py-8">No squad views tracked yet</p>
                        ) : (
                            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                {sortedSquads.map(([team, count], idx) => {
                                    const pct = Math.round((Number(count) / maxSquad) * 100);
                                    return (
                                        <div key={team} className="flex items-center gap-3">
                                            <span className="text-[10px] font-mono text-zinc-700 w-4 text-right shrink-0">{idx + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold text-zinc-300 truncate">{team}</span>
                                                    <span className="text-xs font-mono text-amber-500 ml-2 shrink-0">{Number(count).toLocaleString()}</span>
                                                </div>
                                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                                        className="h-full rounded-full bg-amber-500/60"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* ── Controls ── */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <ShieldAlert size={14} className="text-zinc-500" />
                        <h2 className="text-sm font-black tracking-widest uppercase text-zinc-400">Dashboard Controls</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleControl("inject_mock")}
                            className="flex items-center gap-3 px-5 py-4 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:border-amber-500/60 hover:bg-amber-500/15 transition-all text-left group"
                        >
                            <Zap size={18} className="text-amber-500 shrink-0" />
                            <div>
                                <p className="text-sm font-black text-amber-400">Inject Mock Data</p>
                                <p className="text-xs text-zinc-600 mt-0.5">Simulate 280 viewers for demo/testing</p>
                            </div>
                            <ChevronRight size={14} className="ml-auto text-amber-500/50 group-hover:text-amber-500 transition-colors" />
                        </button>
                        <button
                            onClick={() => handleControl("reset")}
                            className="flex items-center gap-3 px-5 py-4 bg-red-500/5 border border-red-500/20 rounded-xl hover:border-red-500/40 hover:bg-red-500/10 transition-all text-left group"
                        >
                            <Trash2 size={18} className="text-red-500 shrink-0" />
                            <div>
                                <p className="text-sm font-black text-red-400">Reset Analytics</p>
                                <p className="text-xs text-zinc-600 mt-0.5">Wipe all data before match day</p>
                            </div>
                            <ChevronRight size={14} className="ml-auto text-red-500/30 group-hover:text-red-500 transition-colors" />
                        </button>
                    </div>
                </motion.div>

            </div>
        </main>
    );
}
