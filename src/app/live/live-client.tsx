"use client";

import { useState, useEffect } from "react";
import { type Fixture, type Team, type LiveMatchState } from "@/lib/tournament";
import { Clock, Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveViewerClient({ fixtures, teams }: { fixtures: Fixture[], teams: Team[] }) {
    const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showScorecard, setShowScorecard] = useState(false);

    const colorOf = (name?: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308";

    useEffect(() => {
        const fetchLiveStatus = async () => {
            try {
                // 1. Get active match ID from scorer dashboard control
                const activeRes = await fetch("/api/active-match");
                if (!activeRes.ok) throw new Error();
                const { activeMatchId } = await activeRes.json();

                if (!activeMatchId) {
                    setLiveMatch(null);
                    setLoading(false);
                    return;
                }

                // 2. Fetch that specific match state
                const res = await fetch(`/api/live-score?matchId=${activeMatchId}`);
                if (res.ok) {
                    const data = await res.json();
                    setLiveMatch(data);
                } else {
                    setLiveMatch(null);
                }
            } catch (e) {
                console.error("Live fetch error", e);
                setLiveMatch(null);
            }
            setLoading(false);
        };

        const fetchNotifications = async () => {
            try {
                const res = await fetch("/api/notify");
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (e) { }
        };

        fetchLiveStatus();
        fetchNotifications();

        // Refresh exactly every 2 seconds for a fast, snappy real-time experience!
        const interval = setInterval(() => {
            fetchLiveStatus();
            fetchNotifications();
        }, 2000);
        return () => clearInterval(interval);
    }, [fixtures]);

    if (loading) {
        return (
            <div className="min-h-screen pt-32 pb-16 px-4 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
        );
    }

    if (!liveMatch) {
        // Find next upcoming match (not yet played)
        const upcomingMatches = fixtures.filter(f => !f.winner);

        return (
            <main className="min-h-screen pt-28 pb-16 px-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                {/* Ambient background pulse */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] animate-pulse pointer-events-none" />

                <p className="text-[12px] tracking-[0.5em] text-zinc-600 mb-6 font-bold" style={{ fontFamily: "var(--font-body)" }}>
                    MATCH CENTER
                </p>
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                    <span className="text-3xl text-zinc-500">📡</span>
                </div>
                <h2 className="text-4xl text-white font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
                    NO LIVE MATCH
                </h2>
                <p className="text-zinc-500 max-w-sm mb-8">
                    There are no ongoing matches at this moment.
                </p>

                {upcomingMatches.length > 0 && (
                    <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
                        <p className="text-[9px] tracking-[0.3em] text-blue-400 font-bold mb-3">NEXT UP</p>
                        <p className="text-xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                            {upcomingMatches[0].team1} <span className="text-zinc-600">vs</span> {upcomingMatches[0].team2}
                        </p>
                        <p className="text-[10px] text-zinc-600 tracking-widest">MATCH {upcomingMatches[0].matchNo}</p>
                    </div>
                )}

                <a href="/matches" className="text-amber-500 text-xs tracking-[0.3em] font-bold hover:text-amber-400 transition-colors">
                    VIEW ALL MATCHES →
                </a>
            </main>
        );
    }

    if (liveMatch.status === "SCHEDULED") {
        return (
            <main className="min-h-screen pt-32 pb-16 px-4 flex flex-col items-center justify-center text-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                <p className="text-[12px] tracking-[0.5em] text-blue-400 mb-6 font-bold" style={{ fontFamily: "var(--font-body)" }}>
                    UPCOMING MATCH {liveMatch.matchId}
                </p>
                <div className="w-24 h-24 bg-black border border-blue-500/30 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    <Clock className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-6xl text-white font-bold mb-4 tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
                    {liveMatch.scheduledTime}
                </h2>
                <h3 className="text-2xl text-zinc-400 max-w-sm mt-4 font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                    {liveMatch.innings1.teamName} <span className="text-zinc-600 mx-2 text-lg">vs</span> {liveMatch.innings2.teamName}
                </h3>
            </main>
        );
    }

    // LIVE MATCH VIEW
    const currentInningsData = liveMatch.currentInnings === 1 ? liveMatch.innings1 : liveMatch.innings2;
    const battingColor = colorOf(currentInningsData.teamName);

    const activeStriker = currentInningsData.batsmen[currentInningsData.strikerRef || ""];
    const activeNonStriker = currentInningsData.batsmen[currentInningsData.nonStrikerRef || ""];
    const activeBowler = currentInningsData.bowlers[currentInningsData.currentBowlerRef || ""];

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:pt-32">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]" />
                        <span className="text-sm font-bold tracking-[0.3em] text-red-500 uppercase">LIVE MATCH {liveMatch.matchId}</span>
                    </div>

                    <button
                        onClick={() => setShowScorecard(true)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-bold tracking-widest px-4 py-2 rounded-full border border-amber-500/30 transition-all uppercase"
                    >
                        View Full Scorecard
                    </button>
                </div>

                {/* Real-time Notifications */}
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 space-y-2 pointer-events-none">
                    <AnimatePresence>
                        {notifications.slice(0, 3).map((n, i) => (
                            <motion.div
                                key={n.id || i}
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`p-4 rounded-2xl border flex items-center gap-4 shadow-2xl backdrop-blur-xl ${n.type === 'SUCCESS' ? 'bg-amber-500/90 border-amber-400 text-black' : 'bg-blue-600/90 border-blue-500 text-white'}`}
                            >
                                <div className="bg-white/20 p-2 rounded-full">
                                    <Bell className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold leading-tight uppercase tracking-wide">
                                        {n.message}
                                    </p>
                                    <p className="text-[9px] opacity-70 mt-1 uppercase tracking-widest font-bold">
                                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Score Big Board */}
                <div className="relative w-full rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    {/* Dynamic Ambient Background Pulse */}
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={battingColor}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.25 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0 pointer-events-none" 
                            style={{ background: `radial-gradient(circle at 10% -20%, ${battingColor}, transparent 60%)` }} 
                        />
                    </AnimatePresence>

                    <div className="p-8 md:p-12 relative z-10 flex flex-col items-center text-center">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                            {currentInningsData.teamName}
                        </h2>

                        <div className="flex items-baseline justify-center gap-2 mb-2">
                            {/* Rolling Runs */}
                            <motion.span 
                                key={currentInningsData.runs}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-8xl md:text-[12rem] font-bold text-white leading-none tracking-tighter drop-shadow-lg inline-block" 
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                {currentInningsData.runs}
                            </motion.span>

                            <motion.span 
                                key={currentInningsData.wickets}
                                initial={{ scale: 1.5, color: '#ef4444' }}
                                animate={{ scale: 1, color: '#71717a' }}
                                transition={{ type: 'spring', damping: 10 }}
                                className="text-5xl md:text-8xl font-bold leading-none inline-block" 
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                -{currentInningsData.wickets}
                            </motion.span>
                        </div>

                        <div className="mt-2 flex flex-col md:flex-row items-center gap-4 md:gap-8">
                            <span className="text-2xl md:text-3xl font-medium text-zinc-400 tabular-nums">
                                OVERS: {currentInningsData.overs.toFixed(1)} <span className="text-zinc-600 text-lg">/ {liveMatch.matchOvers}</span>
                            </span>
                            <div className="hidden md:block w-px h-4 bg-zinc-800" />
                            <span className="text-lg md:text-xl font-bold tracking-[0.2em] text-amber-500/80 uppercase">
                                LRR: {currentInningsData.lrr?.toFixed(2) || "0.00"}
                            </span>
                        </div>

                        {/* 2nd Innings Chasing Info */}
                        {liveMatch.currentInnings === 2 && liveMatch.status !== "COMPLETED" && (
                            <div className="mt-8 flex flex-col items-center gap-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="text-amber-500 font-bold tracking-[0.3em] text-[10px] md:text-xs uppercase mb-1">
                                    THE CHASE IS ON
                                </div>
                                <div className="text-2xl md:text-4xl font-bold text-white tracking-widest uppercase">
                                    NEED {(liveMatch.innings1.runs + 1) - currentInningsData.runs} RUNS IN {(liveMatch.matchOvers * 6) - (Math.floor(currentInningsData.overs) * 6 + Math.round((currentInningsData.overs % 1) * 10))} BALLS
                                </div>
                                <div className="text-[10px] md:text-xs text-zinc-500 tracking-[0.2em] font-medium uppercase mt-1">
                                    Target: {liveMatch.innings1.runs + 1} • Required: {(((liveMatch.innings1.runs + 1) - currentInningsData.runs) / (((liveMatch.matchOvers * 6) - (Math.floor(currentInningsData.overs) * 6 + Math.round((currentInningsData.overs % 1) * 10))) / 6)).toFixed(2)} RPO
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Player Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* BATSMEN */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />
                        <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-500 mb-4 border-b border-zinc-800 pb-3 uppercase">BATSMEN</h3>
                        <div className="space-y-3 relative z-10">
                            <div className={`flex justify-between items-center p-3 rounded-xl border ${activeStriker ? 'border-amber-500/30 bg-amber-500/10' : 'border-zinc-800 bg-black/50'} transition-all`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-lg">{activeStriker ? activeStriker.name : "Waiting..."}</span>
                                    {activeStriker && <span className="text-amber-500 text-xl leading-none -mt-1">*</span>}
                                </div>
                                <span className="text-white font-bold text-lg tabular-nums">
                                    {activeStriker ? `${activeStriker.runs}` : "0"}<span className="text-zinc-500 font-normal ml-2">({activeStriker?.balls || 0})</span>
                                </span>
                            </div>

                            <div className={`flex justify-between items-center p-3 rounded-xl border text-zinc-300 ${activeNonStriker ? 'border-zinc-700 bg-black' : 'border-zinc-800 bg-black/50'}`}>
                                <span>{activeNonStriker ? activeNonStriker.name : "Waiting..."}</span>
                                <span className="tabular-nums font-bold">
                                    {activeNonStriker ? `${activeNonStriker.runs}` : "0"}<span className="text-zinc-600 font-normal ml-2">({activeNonStriker?.balls || 0})</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* BOWLER */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none" />
                        <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-500 mb-4 border-b border-zinc-800 pb-3 uppercase">CURRENT BOWLER</h3>
                        <div className={`flex justify-between items-center p-3 rounded-xl border ${activeBowler ? 'border-blue-500/30 bg-blue-500/10' : 'border-zinc-800 bg-black/50'} transition-all mt-2`}>
                            <span className="text-blue-100 font-bold text-lg">{activeBowler ? activeBowler.name : "Waiting..."}</span>
                            <div className="flex items-center gap-4 text-white font-bold text-lg tabular-nums">
                                <span>{activeBowler ? `${activeBowler.wickets}-${activeBowler.runs}` : "0-0"}</span>
                                <span className="text-zinc-500 font-normal text-sm">({activeBowler ? activeBowler.overs.toFixed(1) : "0.0"})</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Balls Timeline */}
                <div className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    {liveMatch.status === "COMPLETED" ? (
                        <div className="text-center py-4">
                            <h3 className="text-xs font-bold tracking-[0.3em] text-amber-500 mb-2 uppercase">MATCH RESULT</h3>
                            <p className="text-2xl md:text-4xl font-bold text-white tracking-widest uppercase" style={{ fontFamily: "var(--font-display)" }}>
                                {liveMatch.result}
                            </p>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4 uppercase">Recent Deliveries</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {liveMatch.timeline.length === 0 ? (
                                    <span className="text-zinc-600 text-xs italic tracking-widest">Awaiting first delivery...</span>
                                ) : (
                                    [...liveMatch.timeline].reverse().slice(0, 10).map((ball) => (
                                        <div key={ball.id} className="flex flex-col items-center gap-1 min-w-[48px]">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 shadow-inner transition-all ${ball.isWicket ? 'bg-red-500 border-red-400 text-white shadow-red-900/40' : ball.runs >= 4 ? 'bg-amber-500 border-amber-400 text-black shadow-amber-900/20' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                                                {ball.isWicket ? 'W' : ball.extras > 0 ? (ball.runs || ball.extraType) : ball.runs}
                                            </div>
                                            <span className="text-[9px] font-bold text-zinc-500 font-mono">{(ball.over - 0.1).toFixed(1)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Scorecard Overlay */}
                <AnimatePresence>
                    {showScorecard && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl p-4 md:p-8 flex items-center justify-center">
                            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                    <h2 className="text-xl font-bold tracking-tight uppercase" style={{ fontFamily: "var(--font-display)" }}>Full Scorecard</h2>
                                    <button onClick={() => setShowScorecard(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                    {[liveMatch.innings1, liveMatch.innings2].map((inn, innIdx) => (
                                        <div key={innIdx} className="space-y-4">
                                            <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
                                                <h3 className="text-amber-500 font-bold tracking-widest text-[10px] uppercase">{inn.teamName} Innings</h3>
                                                <span className="text-2xl font-bold text-white tabular-nums">{inn.runs}-{inn.wickets} <span className="text-zinc-500 text-sm font-normal">({inn.overs.toFixed(1)})</span></span>
                                            </div>

                                            <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-900/20">
                                                <table className="w-full text-left text-xs min-w-[500px]">
                                                    <thead>
                                                        <tr className="bg-zinc-900 text-zinc-500 font-bold uppercase tracking-widest">
                                                            <th className="px-4 py-2.5">Batter</th>
                                                            <th className="px-4 py-2.5 text-right">R</th>
                                                            <th className="px-4 py-2.5 text-right">B</th>
                                                            <th className="px-4 py-2.5 text-right">4s</th>
                                                            <th className="px-4 py-2.5 text-right">6s</th>
                                                            <th className="px-4 py-2.5 text-right">SR</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-900">
                                                        {Object.values(inn.batsmen).length === 0 ? (
                                                            <tr>
                                                                <td colSpan={6} className="px-4 py-4 text-center text-zinc-600 italic">Yet to bat</td>
                                                            </tr>
                                                        ) : (
                                                            Object.values(inn.batsmen).map((b, bIdx) => (
                                                                <tr key={bIdx} className={b.isOut ? 'text-zinc-600' : 'text-zinc-300'}>
                                                                    <td className="px-4 py-3 font-medium">
                                                                        {b.name} {b.isOut && <span className="text-[10px] ml-1 opacity-60">({b.dismissal})</span>}
                                                                        {(b.name === inn.strikerRef || b.name === inn.nonStrikerRef) && !b.isOut && <span className="text-amber-500 ml-1 italic font-bold">*</span>}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-bold text-white">{b.runs}</td>
                                                                    <td className="px-4 py-3 text-right">{b.balls}</td>
                                                                    <td className="px-4 py-3 text-right">{b.fours}</td>
                                                                    <td className="px-4 py-3 text-right">{b.sixes}</td>
                                                                    <td className="px-4 py-3 text-right tabular-nums opacity-60 font-mono">
                                                                        {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-900/20">
                                                <table className="w-full text-left text-xs min-w-[500px]">
                                                    <thead>
                                                        <tr className="bg-zinc-900 text-zinc-500 font-bold uppercase tracking-widest">
                                                            <th className="px-4 py-2.5">Bowler</th>
                                                            <th className="px-4 py-2.5 text-right">O</th>
                                                            <th className="px-4 py-2.5 text-right">M</th>
                                                            <th className="px-4 py-2.5 text-right">R</th>
                                                            <th className="px-4 py-2.5 text-right">W</th>
                                                            <th className="px-4 py-2.5 text-right">Econ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-900">
                                                        {Object.values(inn.bowlers).length === 0 ? (
                                                            <tr>
                                                                <td colSpan={6} className="px-4 py-4 text-center text-zinc-600 italic">Yet to bowl</td>
                                                            </tr>
                                                        ) : (
                                                            Object.values(inn.bowlers).map((bw, bwIdx) => (
                                                                <tr key={bwIdx} className="text-zinc-300">
                                                                    <td className="px-4 py-3 font-medium">{bw.name}</td>
                                                                    <td className="px-4 py-3 text-right font-bold text-white">{bw.overs.toFixed(1)}</td>
                                                                    <td className="px-4 py-3 text-right">{bw.maidens || 0}</td>
                                                                    <td className="px-4 py-3 text-right">{bw.runs}</td>
                                                                    <td className="px-4 py-3 text-right font-bold text-blue-400">{bw.wickets}</td>
                                                                    <td className="px-4 py-3 text-right tabular-nums opacity-60 font-mono">
                                                                        {bw.overs > 0 ? (bw.runs / (Math.floor(bw.overs) + (Math.round((bw.overs % 1) * 10)) / 6)).toFixed(2) : '0.00'}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main >
    );
}
