"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from 'react-dom';
import { type Fixture, type Team, type LiveMatchState } from "@/lib/tournament";
import { Clock, Bell, X, Trophy, ChevronLeft, AlertCircle, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Scorecard } from "@/components/scorecard";
import { InningsBreakOverlay } from "@/components/innings-break-overlay";
import { MatchOverOverlay } from "@/components/match-over-overlay";

export default function LiveViewerClient({ fixtures, teams, initialMatchId }: { fixtures: Fixture[], teams: Team[], initialMatchId?: string }) {
    const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showScorecard, setShowScorecard] = useState(false);
    const [animationEvent, setAnimationEvent] = useState<{ type: '4' | '6' | 'W', player: string } | null>(null);

    // C4 FIX: Use a ref to track the latest match state for animation detection
    // This avoids the stale closure problem in the polling useEffect
    const liveMatchRef = useRef<LiveMatchState | null>(null);
    useEffect(() => { liveMatchRef.current = liveMatch; }, [liveMatch]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const colorOf = useCallback((name?: string) => teams.find(t => t.teamName === name)?.color ?? "#EAB308", [teams]);
    const shortNameOf = useCallback((name?: string) => teams.find(t => t.teamName === name)?.shortName ?? (name || "???").substring(0, 3).toUpperCase(), [teams]);

    useEffect(() => {
        let isMounted = true;
        const fetchLiveStatus = async () => {
            try {
                let matchIdToFetch = initialMatchId;
                
                if (!matchIdToFetch) {
                    const activeRes = await fetch("/api/active-match");
                    if (!activeRes.ok) throw new Error();
                    const { activeMatchId } = await activeRes.json();
                    matchIdToFetch = activeMatchId;
                }

                if (!matchIdToFetch) {
                    if (isMounted) { setLiveMatch(null); setLoading(false); }
                    return;
                }

                const res = await fetch(`/api/live-score?matchId=${encodeURIComponent(matchIdToFetch)}`);
                if (res.ok) {
                    const data: LiveMatchState = await res.json();
                    
                    const prev = liveMatchRef.current;
                    
                    // PERFORMANCE GUARD: Only update state if data has actually changed
                    // We check timeline length (new ball), status, and current innings
                    const hasChanged = !prev || 
                                     data.timeline.length !== prev.timeline.length || 
                                     data.status !== prev.status || 
                                     data.currentInnings !== prev.currentInnings ||
                                     data.innings1.runs !== prev.innings1.runs ||
                                     data.innings2.runs !== prev.innings2.runs ||
                                     data.winner !== prev.winner;

                    if (prev && data.timeline.length > prev.timeline.length) {
                        const lastBall = data.timeline[data.timeline.length - 1];
                        if (lastBall.isWicket) {
                            setAnimationEvent({ type: 'W', player: lastBall.playerOut || lastBall.striker });
                            setTimeout(() => setAnimationEvent(null), 4000);
                        } else if (lastBall.runs === 6) {
                            setAnimationEvent({ type: '6', player: lastBall.striker });
                            setTimeout(() => setAnimationEvent(null), 4000);
                        } else if (lastBall.runs === 4) {
                            setAnimationEvent({ type: '4', player: lastBall.striker });
                            setTimeout(() => setAnimationEvent(null), 4000);
                        }
                    }
                    
                    if (isMounted && hasChanged) {
                        setLiveMatch(data);
                    }
                } else {
                    if (isMounted) setLiveMatch(null);
                }
            } catch (e) {
                console.error("Live fetch error", e);
                if (isMounted) setLiveMatch(null);
            }
            if (isMounted) setLoading(false);
        };

        const fetchNotifications = async () => {
            try {
                const res = await fetch("/api/notify");
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) setNotifications(data);
                }
            } catch (e) { }
        };

        fetchLiveStatus();
        fetchNotifications();

        const interval = setInterval(() => {
            fetchLiveStatus();
            fetchNotifications();
        }, 3000); // Slightly relaxed polling to reduce load
        return () => { isMounted = false; clearInterval(interval); };
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

    const renderInningsScorecard = (inn: LiveMatchState["innings1"], idx: number) => {
        return (
            <Scorecard 
                innings={inn} 
                inningsNum={idx} 
                teamColor={colorOf(inn.teamName)} 
                winnerName={liveMatch.winner}
                isLive
            />
        );
    };

    const formatScheduledTime = (isoString?: string) => {
        if (!isoString) return null;
        try {
            const date = new Date(isoString);
            const day = date.getDate();
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
            const month = date.toLocaleString('en-US', { month: 'short' });
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${day}${suffix} ${month} ${hours}:${minutes} ${ampm}`;
        } catch (e) {
            return isoString;
        }
    };

    // SCHEDULED VIEW
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
                <h2 className="text-5xl md:text-6xl text-white font-bold mb-4 tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
                    {formatScheduledTime(liveMatch.scheduledTime) || "SOON"}
                </h2>
                <h3 className="text-2xl text-zinc-400 max-w-sm mt-4 font-medium" style={{ fontFamily: "var(--font-heading)" }}>
                    {liveMatch.innings1.teamName} <span className="text-zinc-600 mx-2 text-lg">vs</span> {liveMatch.innings2.teamName}
                </h3>
            </main>
        );
    }

    // STARTING SOON / TOSS VIEW (LIVE status but no balls bowled)
    if (liveMatch.status === "LIVE" && liveMatch.timeline.length === 0 && !showScorecard) {
        return (
            <main className="min-h-screen pt-32 pb-16 px-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                
                <p className="text-[12px] tracking-[0.6em] text-amber-500 mb-8 font-black uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    MATCH {liveMatch.matchId} · STARTING SOON
                </p>
                
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-12">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl shadow-2xl border-4 border-white/5" style={{ backgroundColor: colorOf(liveMatch.innings1.teamName) }} />
                        <h2 className="text-4xl font-black text-white uppercase italic" style={{ fontFamily: "var(--font-display)" }}>{liveMatch.innings1.teamName}</h2>
                    </div>
                    <div className="text-zinc-800 text-4xl font-black italic tracking-tighter">VS</div>
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl shadow-2xl border-4 border-white/5" style={{ backgroundColor: colorOf(liveMatch.innings2.teamName) }} />
                        <h2 className="text-4xl font-black text-white uppercase italic" style={{ fontFamily: "var(--font-display)" }}>{liveMatch.innings2.teamName}</h2>
                    </div>
                </div>

                {liveMatch.tossWinner ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/60 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                    >
                        <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                        <p className="text-[10px] text-zinc-500 font-black tracking-widest uppercase mb-2">TOSS UPDATE</p>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                            {liveMatch.tossWinner} WON THE TOSS
                        </h3>
                        <p className="text-amber-500 font-bold tracking-widest text-xs uppercase">
                            OPTED TO {liveMatch.tossDecision === 'BAT' ? 'BAT' : 'BOWL'} FIRST
                        </p>
                        <button
                            onClick={() => setShowScorecard(true)}
                            className="mt-6 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
                        >
                            View Teams
                        </button>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-3 text-zinc-600 bg-white/5 px-6 py-3 rounded-full border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Waiting for Toss</span>
                        </div>
                        <button
                            onClick={() => setShowScorecard(true)}
                            className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
                        >
                            View Teams
                        </button>
                    </div>
                )}
            </main>
        );
    }

    // INNINGS BREAK VIEW
    if (liveMatch.status === "INNINGS_BREAK" && !showScorecard) {
        return (
            <div className="relative min-h-screen">
                <InningsBreakOverlay 
                    teamName={liveMatch.innings1.teamName}
                    runs={liveMatch.innings1.runs}
                    wickets={liveMatch.innings1.wickets}
                    overs={liveMatch.innings1.overs}
                    targetTeam={liveMatch.innings2.teamName}
                    teamColor={colorOf(liveMatch.innings1.teamName)}
                />
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[250]">
                    <button
                        onClick={() => setShowScorecard(true)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-[0.3em] px-8 py-4 rounded-full border border-white/20 transition-all uppercase"
                    >
                        View Scorecard
                    </button>
                </div>
            </div>
        );
    }

    // MATCH OVER VIEW
    if (liveMatch.status === "COMPLETED" && !showScorecard) {
        return (
            <MatchOverOverlay 
                result={liveMatch.result || ""}
                innings1={liveMatch.innings1}
                innings2={liveMatch.innings2}
                winnerColor={liveMatch.winner ? colorOf(liveMatch.winner) : "#EAB308"}
                onShowScorecard={() => setShowScorecard(true)}
            />
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
                        <span className="text-sm font-bold tracking-[0.3em] text-red-500 uppercase">
                            LIVE {liveMatch.matchId}
                        </span>
                        <span className="text-zinc-500 font-bold text-xs tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
                            {shortNameOf(liveMatch.innings1.teamName)} vs {shortNameOf(liveMatch.innings2.teamName)}
                        </span>
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
                                    < Bell className="w-4 h-4" />
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

                {/* Big Event Animation Backdrop (Full Page) - PORTALED FOR MOBILE SUPPORT */}
                {mounted && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {animationEvent && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" />
                                
                                {/* Flash Bang Effect */}
                                <motion.div
                                    initial={{ opacity: 1 }}
                                    animate={{ opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="absolute inset-0 bg-white"
                                />

                                {/* Abstract Shapes/Particles Move */}
                                <div className="absolute inset-0 overflow-hidden">
                                    {[...Array(12)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ 
                                                x: Math.random() * 100 - 50 + "vw",
                                                y: Math.random() * 100 - 50 + "vh",
                                                scale: 0,
                                                rotate: Math.random() * 360
                                            }}
                                            animate={{ 
                                                x: [null, (Math.random() * 200 - 100) + "vw"],
                                                y: [null, (Math.random() * 200 - 100) + "vh"],
                                                scale: [0, 2, 0],
                                                opacity: [0, 0.5, 0]
                                            }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                            className="absolute w-32 md:w-64 h-32 md:h-64 border border-white/20 rounded-full"
                                        />
                                    ))}
                                </div>

                                {/* Center Content */}
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0, y: 100 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 1.5, opacity: 0, y: -100 }}
                                    transition={{ type: "spring", damping: 15, stiffness: 200 }}
                                    className="relative flex flex-col items-center z-10"
                                >
                                    <div className="absolute -inset-20 bg-black/80 blur-2xl rounded-full" />
                                    
                                    <motion.h2 
                                        className="text-[25vw] md:text-[20vw] font-black italic text-white leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative"
                                        style={{ fontFamily: "var(--font-display)" }}
                                        animate={{ 
                                            scale: [1, 1.1, 1],
                                            rotate: [-2, 2, -2]
                                        }}
                                        transition={{ duration: 0.5, repeat: 4 }}
                                    >
                                        {animationEvent.type === 'W' ? 'WICKET!' : animationEvent.type === '6' ? 'SIX!!' : 'FOUR!'}
                                    </motion.h2>

                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="relative px-8 md:px-12 py-3 md:py-4 bg-white text-black font-black text-xl md:text-5xl uppercase tracking-[0.2em] skew-x-[-12deg] shadow-2xl mt-4 md:mt-0"
                                    >
                                        {animationEvent.player}
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Standardized Scorecard Overlay */}
                <AnimatePresence>
                    {showScorecard && liveMatch && (
                        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-zinc-950 border border-zinc-800 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]"
                            >
                                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                    <div>
                                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>MATCH SCORECARD</h2>
                                        <p className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase mt-1">Full Summary</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowScorecard(false)} 
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all border border-white/5 group"
                                    >
                                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
                                    <div className="space-y-8">
                                        {renderInningsScorecard(liveMatch.innings1, 1)}
                                        {(liveMatch.currentInnings === 2 || (liveMatch.status as string) === "COMPLETED") && (
                                            renderInningsScorecard(liveMatch.innings2, 2)
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Score Big Board with Glassmorphism and 3D Depth */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative w-full rounded-[2.5rem] overflow-hidden bg-zinc-900/40 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
                >
                    {/* Multi-layered Ambient Backgrounds */}
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={battingColor}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute inset-0 pointer-events-none"
                        >
                            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px] mix-blend-screen opacity-20" style={{ backgroundColor: battingColor }} />
                            <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-[120px] mix-blend-screen opacity-10" style={{ backgroundColor: battingColor }} />
                        </motion.div>
                    </AnimatePresence>

                    {/* Mesh Gradient Overlay - Reduced to simple opacity */}
                    <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-white blur-3xl" />

                    <div className="p-8 md:p-14 relative z-10 flex flex-col items-center text-center">
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center mb-6"
                        >
                            <span className="text-[10px] font-black tracking-[0.5em] text-zinc-500 uppercase mb-3">NOW BATTING</span>
                            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-2xl" style={{ fontFamily: "var(--font-display)" }}>
                                {currentInningsData.teamName}
                            </h2>
                        </motion.div>

                        <div className="flex items-baseline justify-center gap-1 md:gap-3 mb-4">
                            <motion.div 
                                key={currentInningsData.runs}
                                initial={{ y: 40, opacity: 0, rotateX: -45 }}
                                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                                className="perspective-[1000px] flex items-center"
                            >
                                <span className="text-[30vw] md:text-[14rem] font-black text-white leading-[0.8] tracking-tighter inline-block bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent tabular-nums" 
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    {String(currentInningsData.runs)}
                                </span>
                            </motion.div>

                            <motion.div 
                                key={currentInningsData.wickets}
                                initial={{ scale: 1.5, opacity: 0, x: 20 }}
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                transition={{ type: 'spring', damping: 15 }}
                                className="flex items-end pb-[2vw] md:pb-4"
                            >
                                <span className="text-[15vw] md:text-9xl font-black text-zinc-600 leading-none" 
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    -{currentInningsData.wickets}
                                </span>
                            </motion.div>
                        </div>

                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-row items-center gap-4 md:gap-10"
                        >
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-xl md:text-3xl font-black tabular-nums text-white/90">
                                    {currentInningsData.overs.toFixed(1)}
                                </span>
                                <span className="text-[10px] md:text-xs font-black tracking-widest text-zinc-500 uppercase">OVERS COMPLETED</span>
                            </div>
                            
                            <div className="w-px h-6 bg-white/10" />

                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-xl md:text-3xl font-black tabular-nums text-amber-500">
                                    {currentInningsData.lrr?.toFixed(2) || "0.00"}
                                </span>
                                <span className="text-[10px] md:text-xs font-black tracking-widest text-zinc-500 uppercase">RUN RATE</span>
                            </div>
                        </motion.div>

                        {/* 2nd Innings Chasing Info with Premium Banner */}
                        {liveMatch.currentInnings === 2 && (() => {
                            const runsNeeded = (liveMatch.innings1.runs + 1) - currentInningsData.runs;
                            const totalBalls = liveMatch.matchOvers * 6;
                            const ballsBowled = Math.floor(currentInningsData.overs) * 6 + Math.round((currentInningsData.overs % 1) * 10);
                            const ballsRemaining = totalBalls - ballsBowled;
                            const reqRate = ballsRemaining > 0 ? (runsNeeded / (ballsRemaining / 6)).toFixed(2) : '∞';
                            
                            return (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-12 w-full max-w-2xl px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/20 backdrop-blur-lg"
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-amber-500 font-black tracking-[0.4em] text-[10px] uppercase mb-1 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                                            TARGET CHASE
                                        </div>
                                        <div className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase" style={{ fontFamily: "var(--font-display)" }}>
                                            NEED {runsNeeded} <span className="text-amber-500">RUNS</span> IN {ballsRemaining} <span className="text-zinc-500">BALLS</span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">REQUIRED RATE</span>
                                                <span className="text-sm font-black text-white tabular-nums">{reqRate}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}
                    </div>
                </motion.div>

                {/* Player Stats Grid with Glassmorphism */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* BATSMEN */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
                        <h3 className="text-[10px] font-black tracking-[0.3em] text-zinc-500 mb-6 border-b border-white/5 pb-3 uppercase">PROJECTED BATSMEN</h3>
                        <div className="space-y-4 relative z-10">
                            <div className={`group flex justify-between items-center p-4 rounded-2xl border transition-all duration-500 ${activeStriker ? 'border-amber-500/30 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'border-white/5 bg-black/20'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-8 rounded-full transition-all ${activeStriker ? 'bg-amber-500' : 'bg-zinc-800'}`} />
                                    <div className="flex flex-col">
                                        <span className="text-white font-black text-xl tracking-tight leading-none mb-1">
                                            {activeStriker ? activeStriker.name : "WAITING..."}
                                            {activeStriker && <span className="text-amber-500 ml-1 italic">*</span>}
                                        </span>
                                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">ON STRIKE</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-black text-2xl tabular-nums block leading-none">
                                        {activeStriker ? activeStriker.runs : "0"}
                                    </span>
                                    <span className="text-zinc-500 font-bold text-[10px] tabular-nums">
                                        {activeStriker ? activeStriker.balls : "0"} BALLS
                                    </span>
                                </div>
                            </div>

                            <div className={`flex justify-between items-center p-4 rounded-2xl border transition-all duration-500 ${activeNonStriker ? 'border-white/10 bg-black/40' : 'border-white/5 bg-black/20 text-zinc-600'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-8 rounded-full bg-zinc-800" />
                                    <div className="flex flex-col">
                                        <span className="text-zinc-300 font-black text-lg tracking-tight leading-none mb-1">
                                            {activeNonStriker ? activeNonStriker.name : "WAITING..."}
                                        </span>
                                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">NON-STRIKER</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-zinc-300 font-black text-xl tabular-nums block leading-none">
                                        {activeNonStriker ? activeNonStriker.runs : "0"}
                                    </span>
                                    <span className="text-zinc-600 font-bold text-[10px] tabular-nums">
                                        {activeNonStriker ? activeNonStriker.balls : "0"} BALLS
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* BOWLER */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />
                        <h3 className="text-[10px] font-black tracking-[0.3em] text-zinc-500 mb-6 border-b border-white/5 pb-3 uppercase">ACTIVE BOWLER</h3>
                        <div className="flex-1 flex flex-col justify-center">
                            <div className={`flex justify-between items-center p-5 rounded-2xl border transition-all duration-500 ${activeBowler ? 'border-blue-500/30 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.05)]' : 'border-white/5 bg-black/20'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-10 rounded-full transition-all ${activeBowler ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-zinc-800'}`} />
                                    <div className="flex flex-col">
                                        <span className="text-blue-50 font-black text-2xl tracking-tight leading-none mb-1">
                                            {activeBowler ? activeBowler.name : "WAITING..."}
                                        </span>
                                        <span className="text-[9px] font-bold text-blue-500/70 tracking-widest uppercase italic">PELTING SPEED</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-white font-black text-3xl tabular-nums leading-none">
                                            {activeBowler ? activeBowler.wickets : "0"}
                                        </span>
                                        <span className="text-zinc-500 font-bold text-xl tabular-nums leading-none">-</span>
                                        <span className="text-white font-black text-3xl tabular-nums leading-none">
                                            {activeBowler ? activeBowler.runs : "0"}
                                        </span>
                                    </div>
                                    <span className="text-blue-500/50 font-black text-[10px] tabular-nums tracking-widest mt-1 block">
                                        {activeBowler ? activeBowler.overs.toFixed(1) : "0.0"} OVERS
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Recent Balls Timeline with Glassmorphism */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-10 bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 shadow-inner overflow-hidden relative"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    
                    {liveMatch.timeline.length === 0 ? (
                        <div className="flex flex-col items-center justify-center w-full py-4 opacity-30">
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-500 animate-spin mb-2" />
                            <span className="text-zinc-500 text-[10px] font-bold tracking-[0.2em] uppercase">Awaiting first delivery</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[10px] font-black tracking-[0.4em] text-zinc-500 uppercase">RECENT DELIVERIES</h3>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-[8px] font-bold text-zinc-500 tracking-widest uppercase">WICKET</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="text-[8px] font-bold text-zinc-500 tracking-widest uppercase">BOUNDARY</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1">
                                {[...liveMatch.timeline].reverse().slice(0, 12).map((ball, idx) => (
                                    <motion.div 
                                        key={ball.id} 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center gap-2 min-w-[56px]"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border-2 shadow-2xl transition-all duration-300 transform hover:scale-110 ${
                                            ball.isWicket ? 'bg-red-600 border-red-400 text-white shadow-red-900/40 rotate-3' : 
                                            ball.runs >= 4 ? 'bg-amber-500 border-amber-300 text-black shadow-amber-900/20 -rotate-3' : 
                                            'bg-white/5 border-white/10 text-zinc-100'
                                        }`}>
                                            {ball.isWicket ? 'W' : ball.extras > 0 ? (ball.runs || ball.extraType) : ball.runs}
                                        </div>
                                        <span className="text-[9px] font-black text-zinc-500 font-mono tracking-tighter">
                                            {`${Math.floor(ball.over)}.${Math.round((ball.over % 1) * 10) + 1}`}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </main >
    );
}

