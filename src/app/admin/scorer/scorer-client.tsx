"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Minus, UserCircle2, ArrowRightLeft, Undo2, LogOut, CheckCircle, ShieldAlert, X } from "lucide-react";
import { Fixture, Team, LiveMatchState, MatchStatus, BallEvent, BatsmanStats } from "@/lib/tournament";

type ScorerScreen = "AUTH" | "SELECT_MATCH" | "TOSS_SETUP" | "LIVE_SCORING" | "EDIT_OVERRIDE" | "WICKET_MODAL";

export default function ScorerClient({ fixtures, teams, squads }: { fixtures: Fixture[], teams: Team[], squads: Record<string, string[]> }) {
    // ---- SCORER AUTH ----
    const [pin, setPin] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // ---- MATCH SELECT & SETUP ----
    const [screen, setScreen] = useState<ScorerScreen>("AUTH");
    const [selectedMatch, setSelectedMatch] = useState<Fixture | null>(null);
    const [liveState, setLiveState] = useState<LiveMatchState | null>(null);
    const [loading, setLoading] = useState(false);

    // Toss & Initial Setup
    const [tossWinner, setTossWinner] = useState<string>("");
    const [tossDecision, setTossDecision] = useState<"BAT" | "BOWL" | null>(null);
    const [openStriker, setOpenStriker] = useState("");
    const [openNonStriker, setOpenNonStriker] = useState("");
    const [openBowler, setOpenBowler] = useState("");

    // Live Engine Local States
    const [isScoringLocked, setIsScoringLocked] = useState(true);

    // Wicket Workflow States
    const [wicketPlayerOut, setWicketPlayerOut] = useState<string | null>(null);
    const [wicketType, setWicketType] = useState<BallEvent["wicketType"] | null>(null);
    const [wicketNewBatsman, setWicketNewBatsman] = useState<string | null>(null);

    // Initial State Builder (VPL 8-Overs Mode)
    const getInitialState = (match: Fixture, bat1: string, bat2: string): LiveMatchState => ({
        matchId: match.matchNo,
        status: "LIVE",
        tossWinner,
        tossDecision: tossDecision || "BAT",
        currentInnings: 1,
        matchOvers: 8,
        innings1: {
            teamName: bat1,
            runs: 0, wickets: 0, overs: 0,
            strikerRef: openStriker,
            nonStrikerRef: openNonStriker,
            currentBowlerRef: openBowler,
            batsmen: {
                [openStriker]: { name: openStriker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
                [openNonStriker]: { name: openNonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false }
            },
            bowlers: {
                [openBowler]: { name: openBowler, overs: 0, runs: 0, wickets: 0, maidens: 0 }
            }
        },
        innings2: {
            teamName: bat2,
            runs: 0, wickets: 0, overs: 0,
            batsmen: {}, bowlers: {}
        },
        timeline: []
    });

    const handleAuth = async () => {
        if (pin === "2025") { // Mock check for instant UI unlock
            setIsAuthenticated(true);
            setScreen("SELECT_MATCH");
        } else {
            alert("Incorrect PIN.");
            setPin("");
        }
    };

    const loadMatchData = async (matchId: string) => {
        setLoading(true);
        const matchDef = fixtures.find(f => f.matchNo === matchId);
        if (!matchDef) return;

        setSelectedMatch(matchDef);
        try {
            const res = await fetch(`/api/live-score?matchId=${matchId}`);
            if (res.ok) {
                const data = await res.json();
                setLiveState(data);
                setScreen("LIVE_SCORING");
            } else {
                // Not LIVE yet, go to Pre-Match Toss Setup
                setScreen("TOSS_SETUP");
            }
        } catch (e) {
            console.error(e);
            alert("KV connection failed.");
        } finally {
            setLoading(false);
        }
    };

    const beginLiveScoring = async () => {
        if (!selectedMatch || !tossWinner || !tossDecision) return;
        if (!openStriker || !openNonStriker || !openBowler) {
            alert("Please select the opening Batsmen and Bowler from the Squad lists.");
            return;
        }

        // Determine batting order
        let batFirst = selectedMatch.team1;
        let bowlFirst = selectedMatch.team2;

        if ((tossWinner === selectedMatch.team1 && tossDecision === "BOWL") ||
            (tossWinner === selectedMatch.team2 && tossDecision === "BAT")) {
            batFirst = selectedMatch.team2;
            bowlFirst = selectedMatch.team1;
        }

        const newState = getInitialState(selectedMatch, batFirst, bowlFirst);
        setLiveState(newState);
        setScreen("LIVE_SCORING");

        // Save fresh state to KV
        await fetch("/api/live-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newState)
        });
    };

    // ==========================================
    // DATA ENGINE LOGIC
    // ==========================================
    const pushUpdate = async (newState: LiveMatchState) => {
        setLiveState(newState); // Optimistic UI
        try {
            await fetch("/api/live-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newState)
            });
        } catch (e) {
            console.error("Failed to sync live state", e);
            alert("Warning: Failed to sync to cloud dashboard. Retrying...");
        }
    };

    const handleRun = (runs: number) => {
        if (!liveState || isScoringLocked) return;
        const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState; // Deep copy
        const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;

        if (!inn.strikerRef || !inn.currentBowlerRef) {
            alert("Please select Batsman AND Bowler first.");
            return;
        }

        // 1. Update Team Score
        inn.runs += runs;

        // 2. Update Batsman
        let strikerObj = inn.batsmen[inn.strikerRef];
        strikerObj.runs += runs;
        strikerObj.balls += 1;
        if (runs === 4) strikerObj.fours++;
        if (runs === 6) strikerObj.sixes++;

        // 3. Update Bowler & Overs
        let bowlerObj = inn.bowlers[inn.currentBowlerRef];
        bowlerObj.runs += runs;

        // Overs logic (balls goes up to 6, then over increments)
        let totalBalls = Math.round((inn.overs % 1) * 10) + 1;
        let bowlerBalls = Math.round((bowlerObj.overs % 1) * 10) + 1;

        let overCompleted = false;
        if (totalBalls === 6) {
            inn.overs = Math.floor(inn.overs) + 1;
            bowlerObj.overs = Math.floor(bowlerObj.overs) + 1;
            overCompleted = true;
        } else {
            inn.overs = Math.floor(inn.overs) + (totalBalls / 10);
            bowlerObj.overs = Math.floor(bowlerObj.overs) + (bowlerBalls / 10);
        }

        // 4. Record Timeline Event
        state.timeline.push({
            id: Date.now().toString(),
            timestamp: Date.now(),
            innings: state.currentInnings,
            over: inn.overs,
            striker: strikerObj.name,
            bowler: bowlerObj.name,
            runs,
            extras: 0,
            isWicket: false
        });

        // 5. Strike Rotation (Odd runs or Over completion)
        let swapStrike = runs % 2 !== 0;
        if (overCompleted) swapStrike = !swapStrike; // If odd runs on last ball, they stay on strike. If even, they swap.

        if (swapStrike && inn.nonStrikerRef) {
            const temp = inn.strikerRef;
            inn.strikerRef = inn.nonStrikerRef;
            inn.nonStrikerRef = temp;
        }

        // If over completed, prompt for new bowler (clear current bowler)
        if (overCompleted) {
            inn.currentBowlerRef = undefined;
            setIsScoringLocked(true); // Auto-lock at end of over
        }

        pushUpdate(state);
    };

    const handleWicket = () => {
        if (!liveState || isScoringLocked) return;
        setIsScoringLocked(true); // Force lock immediately
        setScreen("WICKET_MODAL");
    };

    // Extras helper: increments team runs but DOES NOT consume a legal ball.
    const handleExtra = (type: "WD" | "NB", runs: number = 1) => {
        if (!liveState || isScoringLocked) return;
        const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
        const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;

        if (!inn.strikerRef || !inn.currentBowlerRef) {
            alert("Please select Batsman AND Bowler first.");
            return;
        }

        inn.runs += runs;
        let bowlerObj = inn.bowlers[inn.currentBowlerRef];
        bowlerObj.runs += runs;

        state.timeline.push({
            id: Date.now().toString(),
            timestamp: Date.now(),
            innings: state.currentInnings,
            over: inn.overs,
            striker: inn.batsmen[inn.strikerRef].name,
            bowler: bowlerObj.name,
            runs: 0,
            extras: runs,
            extraType: type,
            isWicket: false
        });

        pushUpdate(state);
    };

    const submitWicket = () => {
        if (!liveState || !wicketPlayerOut || !wicketType || !wicketNewBatsman) {
            alert("Please fill out all Wicket details.");
            return;
        }

        const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
        const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;

        if (!inn.strikerRef || !inn.currentBowlerRef) return;

        // 1. Mark Wicket on Bowler & Team
        inn.wickets += 1;
        let bowlerObj = inn.bowlers[inn.currentBowlerRef];
        bowlerObj.wickets += 1;

        // 2. Add Legal Delivery Ball to Bowlers/Batsman
        let strikerObj = inn.batsmen[inn.strikerRef];
        strikerObj.balls += 1;

        let totalBalls = Math.round((inn.overs % 1) * 10) + 1;
        let bowlerBalls = Math.round((bowlerObj.overs % 1) * 10) + 1;
        let overCompleted = false;

        if (totalBalls === 6) {
            inn.overs = Math.floor(inn.overs) + 1;
            bowlerObj.overs = Math.floor(bowlerObj.overs) + 1;
            overCompleted = true;
        } else {
            inn.overs = Math.floor(inn.overs) + (totalBalls / 10);
            bowlerObj.overs = Math.floor(bowlerObj.overs) + (bowlerBalls / 10);
        }

        // 3. Register Timeline Event
        state.timeline.push({
            id: Date.now().toString(),
            timestamp: Date.now(),
            innings: state.currentInnings,
            over: inn.overs,
            striker: strikerObj.name,
            bowler: bowlerObj.name,
            runs: 0,
            extras: 0,
            isWicket: true,
            wicketType,
            playerOut: wicketPlayerOut,
            newBatsman: wicketNewBatsman
        });

        // 4. Update the actual Batsman references in the Innings object
        // Add new batsman to tracking if not exists
        if (!inn.batsmen[wicketNewBatsman]) {
            inn.batsmen[wicketNewBatsman] = {
                name: wicketNewBatsman, runs: 0, balls: 0, fours: 0, sixes: 0,
                isOut: false
            };
        }

        // Mark the out player
        inn.batsmen[wicketPlayerOut].isOut = true;
        inn.batsmen[wicketPlayerOut].dismissal = wicketType;

        // ICC Rule: New batsman ALWAYS takes strike on catch/bowled, EXCEPT if it's end of over.
        if (wicketPlayerOut === inn.strikerRef) {
            inn.strikerRef = wicketNewBatsman;
        } else if (wicketPlayerOut === inn.nonStrikerRef) {
            inn.nonStrikerRef = wicketNewBatsman;
        }

        if (overCompleted) {
            // Swap strike if over completed
            const temp = inn.strikerRef;
            inn.strikerRef = inn.nonStrikerRef;
            inn.nonStrikerRef = temp;
            inn.currentBowlerRef = undefined; // Force bowler select
        }

        // Reset Local States & Return
        setWicketPlayerOut(null);
        setWicketType(null);
        setWicketNewBatsman(null);
        setScreen("LIVE_SCORING");

        pushUpdate(state);
    };

    const handleSwapStrike = () => {
        if (!liveState || isScoringLocked) return;
        const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
        const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;

        if (inn.strikerRef && inn.nonStrikerRef) {
            const temp = inn.strikerRef;
            inn.strikerRef = inn.nonStrikerRef;
            inn.nonStrikerRef = temp;
            pushUpdate(state);
        }
    };

    const handleUndo = () => {
        if (!liveState || isScoringLocked || liveState.timeline.length === 0) return;

        if (!window.confirm("Undo the last action?")) return;

        const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
        const lastEvent = state.timeline.pop();
        if (!lastEvent) return;

        const inn = lastEvent.innings === 1 ? state.innings1 : state.innings2;

        // 1. Rollback Runs
        inn.runs -= (lastEvent.runs + lastEvent.extras);

        if (lastEvent.striker && inn.batsmen[lastEvent.striker]) {
            let strikerObj = inn.batsmen[lastEvent.striker];
            strikerObj.runs -= lastEvent.runs;
            if (lastEvent.runs === 4) strikerObj.fours--;
            if (lastEvent.runs === 6) strikerObj.sixes--;

            // Only decrement ball if it was a legal delivery
            if (!lastEvent.extras || lastEvent.extraType === undefined) {
                strikerObj.balls = Math.max(0, strikerObj.balls - 1);
            }
        }

        if (lastEvent.bowler && inn.bowlers[lastEvent.bowler]) {
            let bowlerObj = inn.bowlers[lastEvent.bowler];
            bowlerObj.runs -= (lastEvent.runs + lastEvent.extras);

            // Rollback Wickets
            if (lastEvent.isWicket) {
                inn.wickets = Math.max(0, inn.wickets - 1);
                bowlerObj.wickets = Math.max(0, bowlerObj.wickets - 1);
                if (lastEvent.playerOut && inn.batsmen[lastEvent.playerOut]) {
                    inn.batsmen[lastEvent.playerOut].isOut = false;
                    inn.batsmen[lastEvent.playerOut].dismissal = undefined;
                    // Note: Resetting exact strike order perfectly after a wicket is complex, we just revive them here.
                    // The scorer can use SWAP STRIKE to fix positioning.
                }
            }

            // Rollback Overs
            if (!lastEvent.extras) {
                // If it was a legal ball, roll back 1 ball from over
                const totalBalls = Math.round((inn.overs % 1) * 10);
                const bowlerBalls = Math.round((bowlerObj.overs % 1) * 10);

                if (totalBalls === 0) {
                    inn.overs = Math.floor(inn.overs) - 1 + 0.5; // From x.0 to (x-1).5
                    bowlerObj.overs = Math.floor(bowlerObj.overs) - 1 + 0.5;
                } else {
                    inn.overs = Math.floor(inn.overs) + ((totalBalls - 1) / 10);
                    bowlerObj.overs = Math.floor(bowlerObj.overs) + ((bowlerBalls - 1) / 10);
                }
            }
        }

        pushUpdate(state);
    };


    // ==========================================
    // RENDER: AUTHENTICATION
    // ==========================================
    if (screen === "AUTH") {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-amber-500/30">
                <div className="max-w-xs w-full">
                    <h1 className="text-3xl text-white font-bold mb-8 text-center" style={{ fontFamily: "var(--font-display)" }}>
                        SCORER LOGIN
                    </h1>
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="ENTER PIN"
                        maxLength={4}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-center text-2xl tracking-[1em] p-4 rounded-xl mb-4 focus:outline-none focus:border-amber-500 transition-colors"
                        style={{ fontFamily: "var(--font-mono)" }}
                    />
                    <button
                        onClick={handleAuth}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold p-4 rounded-xl tracking-widest transition-colors shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                    >
                        UNLOCK SYSTEM
                    </button>
                    <p className="text-center text-zinc-600 mt-6 text-[10px] tracking-widest">DO NOT SHARE WITH PLAYERS</p>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: MATCH SELECTION
    // ==========================================
    if (screen === "SELECT_MATCH") {
        const unplayed = fixtures.filter(f => !f.winner);
        return (
            <div className="min-h-screen bg-black p-8 pt-24">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-amber-500 tracking-widest text-sm font-bold mb-4">ACTIVE FIXTURES</h2>
                    <div className="grid gap-3">
                        {unplayed.map(f => (
                            <button
                                key={f.matchNo}
                                onClick={() => loadMatchData(f.matchNo)}
                                className="flex items-center justify-between p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-white/20 transition-all text-left"
                            >
                                <div>
                                    <span className="text-xs text-zinc-500 font-bold block mb-1 tracking-widest">MATCH {f.matchNo}</span>
                                    <span className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                                        {f.team1} <span className="text-zinc-600 mx-2">vs</span> {f.team2}
                                    </span>
                                </div>
                                <span className="text-zinc-600">&rarr;</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: TOSS & SETUP
    // ==========================================
    if (screen === "TOSS_SETUP" && selectedMatch) {
        return (
            <div className="min-h-screen bg-black p-8 flex flex-col items-center justify-center">
                <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <h2 className="text-2xl text-white font-bold mb-6 text-center" style={{ fontFamily: "var(--font-display)" }}>
                        PRE-MATCH SETUP
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs tracking-widest text-zinc-500 block mb-2 font-bold">WHO WON THE TOSS?</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[selectedMatch.team1, selectedMatch.team2].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTossWinner(t)}
                                        className={`p-4 rounded-xl border font-bold text-lg tracking-wide transition-colors ${tossWinner === t ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-black border-zinc-800 text-zinc-400'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tossWinner && (
                            <div>
                                <label className="text-xs tracking-widest text-zinc-500 block mb-2 font-bold">DECISION?</label>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button onClick={() => setTossDecision("BAT")} className={`p-4 rounded-xl border font-bold text-lg tracking-widest transition-colors ${tossDecision === "BAT" ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-black border-zinc-800 text-zinc-400'}`}>
                                        BAT
                                    </button>
                                    <button onClick={() => setTossDecision("BOWL")} className={`p-4 rounded-xl border font-bold text-lg tracking-widest transition-colors ${tossDecision === "BOWL" ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-black border-zinc-800 text-zinc-400'}`}>
                                        BOWL
                                    </button>
                                </div>
                            </div>
                        )}

                        {tossDecision && (
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <label className="text-xs tracking-widest text-zinc-500 block font-bold">INITIAL PLAYERS</label>

                                <select value={openStriker} onChange={(e) => setOpenStriker(e.target.value)} className="w-full bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 outline-none">
                                    <option value="" disabled>Select Striker...</option>
                                    {(squads[tossDecision === "BAT" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1)] || []).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>

                                <select value={openNonStriker} onChange={(e) => setOpenNonStriker(e.target.value)} className="w-full bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 outline-none">
                                    <option value="" disabled>Select Non-Striker...</option>
                                    {(squads[tossDecision === "BAT" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1)] || []).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>

                                <select value={openBowler} onChange={(e) => setOpenBowler(e.target.value)} className="w-full bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 outline-none">
                                    <option value="" disabled>Select Opening Bowler...</option>
                                    {(squads[tossDecision === "BOWL" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1)] || []).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {tossWinner && tossDecision && openStriker && openNonStriker && openBowler && (
                            <button
                                onClick={beginLiveScoring}
                                className="w-full mt-8 bg-white text-black font-bold p-5 rounded-xl tracking-widest text-lg animate-pulse"
                            >
                                START LIVE MATCH
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: LIVE SCORING ENGINE
    // ==========================================
    if (screen === "LIVE_SCORING" && liveState) {
        const currentInningsData = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;
        const battingTeamColor = teams.find(t => t.teamName === currentInningsData.teamName)?.color || "#EAB308";

        // Compute active players
        const activeStriker = currentInningsData.batsmen[currentInningsData.strikerRef || ""] || null;
        const activeNonStriker = currentInningsData.batsmen[currentInningsData.nonStrikerRef || ""] || null;
        const activeBowler = currentInningsData.bowlers[currentInningsData.currentBowlerRef || ""] || null;

        return (
            <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500/30">
                {/* Top Bar - Scorer Info */}
                <div className="h-16 border-b border-white/10 bg-zinc-950 px-6 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <span className="text-amber-500 font-bold tracking-widest text-xs">MATCH {liveState.matchId}</span>
                    </div>
                    <button onClick={() => setScreen("EDIT_OVERRIDE")} className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white px-3 py-1 rounded bg-zinc-900 border border-zinc-800 transition-colors">
                        MANUAL OVERRIDE
                    </button>
                </div>

                {/* Main iPad Grid */}
                <div className="p-6 max-w-7xl mx-auto grid grid-cols-12 gap-6 h-[calc(100vh-4rem)]">

                    {/* LEFT COL: Live Scoreboard (The "Big Board") */}
                    <div className="col-span-6 flex flex-col gap-6">
                        {/* Main Score Card */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden flex flex-col justify-center items-center text-center shadow-lg">
                            <div className="absolute top-0 w-full h-full opacity-[0.15] blur-3xl pointer-events-none transition-colors duration-1000" style={{ backgroundColor: battingTeamColor }} />

                            <h2 className="text-2xl font-bold text-white mb-2 relative z-10" style={{ fontFamily: "var(--font-heading)" }}>
                                {currentInningsData.teamName}
                            </h2>

                            <div className="flex items-baseline justify-center gap-2 relative z-10">
                                <span className="text-8xl font-bold tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
                                    {currentInningsData.runs}
                                </span>
                                <span className="text-5xl font-bold text-zinc-500" style={{ fontFamily: "var(--font-display)" }}>
                                    -{currentInningsData.wickets}
                                </span>
                            </div>

                            <div className="mt-4 text-2xl font-medium text-zinc-400 tabular-nums relative z-10" style={{ fontFamily: "var(--font-mono)" }}>
                                OVERS: {currentInningsData.overs.toFixed(1)} / {liveState.matchOvers}
                            </div>
                        </div>

                        {/* Player Statistics Block */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                            {/* Batsmen */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 border-b border-zinc-800 pb-2">BATSMEN</h3>
                                <div className={`flex justify-between items-center bg-black p-3 rounded-lg border text-sm ${activeStriker ? 'border-amber-500/40 text-white' : 'border-zinc-800 text-zinc-500'}`}>
                                    <span className="font-bold">{activeStriker ? `${activeStriker.name} *` : "Select Striker"}</span>
                                    <span className="tabular-nums">{activeStriker ? `${activeStriker.runs} (${activeStriker.balls})` : "0 (0)"}</span>
                                </div>
                                <div className={`flex justify-between items-center bg-black p-3 rounded-lg border text-sm ${activeNonStriker ? 'border-zinc-700 text-zinc-300' : 'border-zinc-800 text-zinc-500'}`}>
                                    <span className="font-medium">{activeNonStriker ? activeNonStriker.name : "Select Non-Striker"}</span>
                                    <span className="tabular-nums">{activeNonStriker ? `${activeNonStriker.runs} (${activeNonStriker.balls})` : "0 (0)"}</span>
                                </div>
                            </div>

                            {/* Bowler */}
                            <div className="space-y-3 mt-2">
                                <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 border-b border-zinc-800 pb-2">BOWLER</h3>
                                <div className={`flex justify-between items-center bg-black p-3 rounded-lg border text-sm ${activeBowler ? 'border-blue-500/40 text-blue-100' : 'border-zinc-800 text-zinc-500'}`}>
                                    <span className="font-bold">{activeBowler ? activeBowler.name : "Select Bowler"}</span>
                                    <span className="tabular-nums">{activeBowler ? `${activeBowler.wickets}-${activeBowler.runs} (${activeBowler.overs.toFixed(1)})` : "0-0 (0.0)"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: Control Center (The "Buttons") */}
                    <div className="col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col">

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold tracking-widest text-zinc-400">SCORING CONTROLS</h3>
                            <button
                                onClick={() => setIsScoringLocked(!isScoringLocked)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold tracking-widest transition-all ${isScoringLocked ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-green-500/10 text-green-500 border border-green-500/30'}`}
                            >
                                {isScoringLocked ? "🔒 LOCKED" : "🔓 UNLOCKED"}
                            </button>
                        </div>

                        {/* Disabled overlay when locked */}
                        <div className="relative flex-1">
                            {isScoringLocked && (
                                <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-xl border border-zinc-800/50">
                                    <span className="text-zinc-500 font-medium tracking-widest text-sm bg-zinc-900 px-6 py-3 rounded-full shadow-xl">
                                        UNLOCK TO SCORE
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3 h-full pb-4">
                                {/* Run Buttons */}
                                {[0, 1, 2, 3].map(run => (
                                    <button key={run} onClick={() => handleRun(run)} className="bg-zinc-800 hover:bg-zinc-700 rounded-xl text-4xl font-bold transition-colors shadow-sm">{run}</button>
                                ))}
                                <button onClick={() => handleRun(4)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-4xl font-bold transition-colors shadow-sm">4</button>
                                <button onClick={() => handleRun(6)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-4xl font-bold transition-colors shadow-sm">6</button>

                                {/* Extras & Wickets */}
                                <button onClick={() => handleExtra("WD")} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-lg font-bold tracking-widest transition-colors shadow-sm py-4">WIDE</button>
                                <button onClick={() => handleExtra("NB")} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-lg font-bold tracking-widest transition-colors shadow-sm py-4">NO BALL</button>
                                <button onClick={handleWicket} className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xl font-bold tracking-widest transition-colors shadow-lg shadow-red-500/20 border border-red-400 py-4">WICKET</button>

                                {/* Overrides Row */}
                                <button onClick={handleSwapStrike} className="col-span-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold tracking-widest transition-colors shadow-sm py-3 mt-2">
                                    SWAP STRIKE
                                </button>
                                <button onClick={handleUndo} className="col-span-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold tracking-widest transition-colors shadow-sm py-3 mt-2">
                                    UNDO LAST
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: WICKET MODAL
    // ==========================================
    if (screen === "WICKET_MODAL" && liveState) {
        const inn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;
        const currentStriker = inn.batsmen[inn.strikerRef || ""]?.name;
        const currentNonStriker = inn.batsmen[inn.nonStrikerRef || ""]?.name;

        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
                <div className="bg-zinc-900 border-2 border-red-500/50 rounded-3xl p-8 max-w-xl w-full flex flex-col items-center text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />

                    <span className="text-5xl mb-6 mt-4">🏏</span>
                    <h2 className="text-3xl font-bold text-white tracking-widest mb-2" style={{ fontFamily: "var(--font-display)" }}>
                        WICKET FALLEN
                    </h2>
                    <p className="text-zinc-400 mb-8 max-w-sm mx-auto text-sm">Please select who got out, the type of dismissal, and who the new batsman is.</p>

                    {/* WICKET CONFIGURATION FORM */}
                    <div className="w-full bg-black border border-zinc-800 rounded-xl p-6 mb-8 text-left">

                        {/* 1. Who got out? */}
                        <div className="mb-6">
                            <label className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 block">1. WHO GOT OUT?</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[currentStriker, currentNonStriker].filter(Boolean).map(player => (
                                    <button
                                        key={player}
                                        onClick={() => setWicketPlayerOut(player as string)}
                                        className={`p-3 rounded-lg border font-bold text-sm transition-colors ${wicketPlayerOut === player ? 'bg-red-500/20 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                                    >
                                        {player}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Dismissal Type */}
                        {wicketPlayerOut && (
                            <div className="mb-6 border-t border-zinc-800 pt-6">
                                <label className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 block">2. HOW?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["BOWLED", "CAUGHT", "RUNOUT", "LBW", "STUMPED", "RETIRED_HURT"] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setWicketType(type)}
                                            className={`p-2 rounded-lg border font-bold text-xs tracking-widest transition-colors ${wicketType === type ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                                        >
                                            {type.replace("_", " ")}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. New Batsman */}
                        {wicketType && (
                            <div className="border-t border-zinc-800 pt-6">
                                <label className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 block">3. NEW BATSMAN IN</label>
                                <select
                                    value={wicketNewBatsman || ""}
                                    onChange={(e) => setWicketNewBatsman(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-3 focus:outline-none focus:border-amber-500"
                                >
                                    <option value="" disabled>Select New Batsman...</option>
                                    {(squads[inn.teamName] || [])
                                        // Filter out players already out, or currently batting
                                        .filter(p => !inn.batsmen[p] || (!inn.batsmen[p].isOut && p !== inn.strikerRef && p !== inn.nonStrikerRef))
                                        .map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                </select>
                            </div>
                        )}

                    </div>

                    {wicketPlayerOut && wicketType && wicketNewBatsman && (
                        <button
                            onClick={submitWicket}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold p-4 rounded-xl tracking-widest mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
                        >
                            CONFIRM WICKET
                        </button>
                    )}

                    <button
                        onClick={() => { setIsScoringLocked(true); setScreen("LIVE_SCORING"); }}
                        className="border border-zinc-700 px-8 py-3 rounded-full text-zinc-400 font-bold tracking-widest hover:text-white transition-colors text-xs"
                    >
                        CANCEL & RETURN TO MATCH
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: EDIT OVERRIDE
    // ==========================================
    if (screen === "EDIT_OVERRIDE" && liveState) {
        // We create local state for the edit form inline here since it's only active in this view
        const inn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;

        const handleCommitOverride = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!window.confirm("WARNING: This will forcefully overwrite the live match state. Proceed?")) return;

            const formData = new FormData(e.currentTarget);
            const newState = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
            const targetInn = newState.currentInnings === 1 ? newState.innings1 : newState.innings2;

            // Update Team Score
            targetInn.runs = parseInt(formData.get("teamRuns") as string, 10) || 0;
            targetInn.wickets = parseInt(formData.get("teamWickets") as string, 10) || 0;
            targetInn.overs = parseFloat(formData.get("teamOvers") as string) || 0;

            // Update Active Striker
            if (targetInn.strikerRef && targetInn.batsmen[targetInn.strikerRef]) {
                const s = targetInn.batsmen[targetInn.strikerRef];
                s.runs = parseInt(formData.get("strikerRuns") as string, 10) || 0;
                s.balls = parseInt(formData.get("strikerBalls") as string, 10) || 0;
            }

            // Update Active Non-Striker
            if (targetInn.nonStrikerRef && targetInn.batsmen[targetInn.nonStrikerRef]) {
                const ns = targetInn.batsmen[targetInn.nonStrikerRef];
                ns.runs = parseInt(formData.get("nonStrikerRuns") as string, 10) || 0;
                ns.balls = parseInt(formData.get("nonStrikerBalls") as string, 10) || 0;
            }

            // Update Active Bowler
            if (targetInn.currentBowlerRef && targetInn.bowlers[targetInn.currentBowlerRef]) {
                const b = targetInn.bowlers[targetInn.currentBowlerRef];
                b.runs = parseInt(formData.get("bowlerRuns") as string, 10) || 0;
                b.wickets = parseInt(formData.get("bowlerWickets") as string, 10) || 0;
                b.overs = parseFloat(formData.get("bowlerOvers") as string) || 0;
            }

            // Push forceful update
            pushUpdate(newState);
            setScreen("LIVE_SCORING");
        };

        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full">
                    <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-amber-500 font-bold tracking-widest bg-amber-500/10 px-3 py-1 rounded text-xs">OVERRIDE</span>
                            <h2 className="text-xl font-bold text-white tracking-widest uppercase">Force Edit State</h2>
                        </div>
                        <button onClick={() => setScreen("LIVE_SCORING")} className="text-zinc-500 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleCommitOverride} className="space-y-6">
                        {/* TEAM SCORE EDIT */}
                        <div className="bg-black p-4 rounded-xl border border-zinc-800">
                            <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4 block">1. TEAM TOTAL (INNINGS {liveState.currentInnings})</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs tracking-widest text-zinc-400 mb-1 block">RUNS</label>
                                    <input name="teamRuns" type="number" defaultValue={inn.runs} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 font-mono text-center" />
                                </div>
                                <div>
                                    <label className="text-xs tracking-widest text-zinc-400 mb-1 block">WICKETS</label>
                                    <input name="teamWickets" type="number" defaultValue={inn.wickets} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 font-mono text-center" />
                                </div>
                                <div>
                                    <label className="text-xs tracking-widest text-zinc-400 mb-1 block">OVERS (e.g. 1.3)</label>
                                    <input name="teamOvers" type="number" step="0.1" defaultValue={inn.overs} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 font-mono text-center" />
                                </div>
                            </div>
                        </div>

                        {/* STRIKER EDIT */}
                        {inn.strikerRef && (
                            <div className="bg-black p-4 rounded-xl border border-zinc-800">
                                <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4 block">2. STRIKER: {inn.strikerRef.toUpperCase()}</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs tracking-widest text-zinc-400 mb-1 block">RUNS</label>
                                        <input name="strikerRuns" type="number" defaultValue={inn.batsmen[inn.strikerRef]?.runs || 0} className="w-full bg-zinc-900 border border-zinc-700 text-amber-500 rounded px-3 py-2 font-mono text-center" />
                                    </div>
                                    <div>
                                        <label className="text-xs tracking-widest text-zinc-400 mb-1 block">BALLS</label>
                                        <input name="strikerBalls" type="number" defaultValue={inn.batsmen[inn.strikerRef]?.balls || 0} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 font-mono text-center" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NON-STRIKER EDIT */}
                        {inn.nonStrikerRef && (
                            <div className="bg-black p-4 rounded-xl border border-zinc-800">
                                <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4 block">3. NON-STRIKER: {inn.nonStrikerRef.toUpperCase()}</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs tracking-widest text-zinc-400 mb-1 block">RUNS</label>
                                        <input name="nonStrikerRuns" type="number" defaultValue={inn.batsmen[inn.nonStrikerRef]?.runs || 0} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 rounded px-3 py-2 font-mono text-center" />
                                    </div>
                                    <div>
                                        <label className="text-xs tracking-widest text-zinc-400 mb-1 block">BALLS</label>
                                        <input name="nonStrikerBalls" type="number" defaultValue={inn.batsmen[inn.nonStrikerRef]?.balls || 0} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 font-mono text-center" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BOWLER EDIT */}
                        {inn.currentBowlerRef && (
                            <div className="bg-black p-4 rounded-xl border border-zinc-800">
                                <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4 block">4. BOWLER: {inn.currentBowlerRef.toUpperCase()}</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs tracking-widest text-zinc-400 mb-1 block">RUNS</label>
                                        <input name="bowlerRuns" type="number" defaultValue={inn.bowlers[inn.currentBowlerRef]?.runs || 0} className="w-full bg-zinc-900 border border-zinc-700 text-blue-400 rounded px-3 py-2 font-mono text-center" />
                                    </div>
                                    <div>
                                        <label className="text-xs tracking-widest text-zinc-400 mb-1 block">WICKETS</label>
                                        <input name="bowlerWickets" type="number" defaultValue={inn.bowlers[inn.currentBowlerRef]?.wickets || 0} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 font-mono text-center" />
                                    </div>
                                    <div>
                                        <label className="text-xs tracking-widest text-zinc-400 mb-1 block">OVERS (e.g. 0.3)</label>
                                        <input name="bowlerOvers" type="number" step="0.1" defaultValue={inn.bowlers[inn.currentBowlerRef]?.overs || 0} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 font-mono text-center" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-zinc-800 flex gap-4">
                            <button type="button" onClick={() => setScreen("LIVE_SCORING")} className="flex-1 border border-zinc-700 px-4 py-3 rounded-xl text-zinc-400 font-bold tracking-widest hover:text-white transition-colors text-xs">
                                CANCEL
                            </button>
                            <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-400 text-black px-4 py-3 rounded-xl font-bold tracking-widest transition-colors shadow-lg shadow-amber-500/20 text-xs">
                                OVERWRITE MATCH STATE
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return null;
}
