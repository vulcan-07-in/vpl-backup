"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Minus, UserCircle2, ArrowRightLeft, Undo2, LogOut, CheckCircle, ShieldAlert, X } from "lucide-react";
import { Fixture, Team, LiveMatchState, MatchStatus, BallEvent, BatsmanStats } from "@/lib/tournament";

type ScorerScreen = "AUTH" | "SELECT_MATCH" | "SCHEDULE_SETUP" | "TOSS_SETUP" | "LIVE_SCORING" | "EDIT_OVERRIDE" | "WICKET_MODAL";

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

    // Scheduling States
    const [scheduledTime, setScheduledTime] = useState("");

    // Refined workflow states
    const [wicketStep, setWicketStep] = useState<1 | 2>(1);
    const [overJustCompleted, setOverJustCompleted] = useState(false);
    const [showFullScoreboard, setShowFullScoreboard] = useState(false);

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

                if (data.status === "SCHEDULED") {
                    setLiveState(data);
                    setScreen("TOSS_SETUP");
                } else {
                    setLiveState(data);
                    setScreen("LIVE_SCORING");
                }
            } else {
                // Not LIVE yet, go to Scheduling Phase
                setScreen("SCHEDULE_SETUP");
            }
        } catch (e) {
            console.error(e);
            alert("KV connection failed.");
        } finally {
            setLoading(false);
        }
    };

    // Sync setup states if match is already live (prevents redundant selection)
    useEffect(() => {
        if (liveState) {
            const inn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;
            if (liveState.tossWinner) setTossWinner(liveState.tossWinner);
            if (liveState.tossDecision) setTossDecision(liveState.tossDecision);
            if (inn.strikerRef) setOpenStriker(inn.strikerRef);
            if (inn.nonStrikerRef) setOpenNonStriker(inn.nonStrikerRef);
            if (inn.currentBowlerRef) setOpenBowler(inn.currentBowlerRef);
        }
    }, [liveState]);

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

    const handleScheduleMatch = async () => {
        if (!selectedMatch || !scheduledTime) {
            alert("Please enter a valid time.");
            return;
        }

        const newState: LiveMatchState = {
            matchId: selectedMatch.matchNo,
            status: "SCHEDULED",
            scheduledTime: scheduledTime,
            currentInnings: 1,
            matchOvers: 8,
            innings1: { teamName: selectedMatch.team1, runs: 0, wickets: 0, overs: 0, batsmen: {}, bowlers: {} },
            innings2: { teamName: selectedMatch.team2, runs: 0, wickets: 0, overs: 0, batsmen: {}, bowlers: {} },
            timeline: []
        };

        setLiveState(newState);
        setScreen("TOSS_SETUP");

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

    const handleResetMatch = async () => {
        if (!selectedMatch) return;
        if (!confirm("⚠️ DANGER: This will permanently clear all scores for this match. Are you sure?")) return;

        setLoading(true);
        try {
            const newState = { ...getInitialState(selectedMatch, selectedMatch.team1, selectedMatch.team2), status: "SCHEDULED" } as LiveMatchState;
            setLiveState(newState);
            setScreen("TOSS_SETUP");

            await fetch("/api/live-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newState)
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRun = async (runs: number) => {
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

        // 6. Check Innings/Match Progression
        const isSecondInnings = state.currentInnings === 2;
        const target = isSecondInnings ? (state.innings1.runs + 1) : null;

        let shouldInningsEnd = false;
        let shouldMatchFinish = false;

        const MAX_WICKETS = 8;

        if (isSecondInnings && target !== null) {
            if (inn.runs >= target) {
                shouldMatchFinish = true;
            } else if (inn.wickets >= MAX_WICKETS || inn.overs >= state.matchOvers) {
                shouldMatchFinish = true;
            }
        } else {
            if (inn.wickets >= MAX_WICKETS || inn.overs >= state.matchOvers) {
                shouldInningsEnd = true;
            }
        }

        if (shouldMatchFinish) {
            state.status = "COMPLETED";
            // Determine Winner
            if (isSecondInnings && target !== null) {
                if (state.innings2.runs >= target) {
                    state.winner = state.innings2.teamName;
                    state.result = `${state.innings2.teamName} won by ${MAX_WICKETS - state.innings2.wickets} wickets`;
                } else if (state.innings2.runs === target - 1) {
                    state.winner = "TIE";
                    state.result = "Match Tied";
                } else {
                    state.winner = state.innings1.teamName;
                    state.result = `${state.innings1.teamName} won by ${state.innings1.runs - state.innings2.runs} runs`;
                }
            }
        } else if (shouldInningsEnd) {
            // Innings Break
            state.status = "INNINGS_BREAK";
        }

        // If over completed, prompt for new bowler (clear current bowler)
        if (overCompleted && !shouldMatchFinish && !shouldInningsEnd) {
            inn.currentBowlerRef = undefined;
            setOverJustCompleted(true);
            setIsScoringLocked(true); // Auto-lock at end of over
        }

        pushUpdate(state);
    };

    const handleWicket = () => {
        if (!liveState || isScoringLocked) return;
        setIsScoringLocked(true);
        setWicketStep(1);
        setWicketPlayerOut(null);
        setWicketType(null);
        setWicketNewBatsman(null);
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

    const handleDeclareWicket = async () => {
        if (!liveState || !wicketPlayerOut || !wicketType) {
            alert("Please select who got out and how.");
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

        // 3. Mark the out player
        inn.batsmen[wicketPlayerOut].isOut = true;
        inn.batsmen[wicketPlayerOut].dismissal = wicketType;

        // 4. Clear the reference
        if (inn.strikerRef === wicketPlayerOut) {
            inn.strikerRef = undefined;
        } else {
            inn.nonStrikerRef = undefined;
        }

        // 5. If over completed, handle bowler clearing
        if (overCompleted) {
            inn.currentBowlerRef = undefined;
            setOverJustCompleted(true);
        }

        // 6. Check Match Finish / Innings break
        const isSecondInnings = state.currentInnings === 2;
        const target = isSecondInnings ? (state.innings1.runs + 1) : null;

        let shouldInningsEnd = false;
        let shouldMatchFinish = false;

        // Squad of 8 players means 8 wickets = all out
        const MAX_WICKETS = 8;

        if (inn.wickets >= MAX_WICKETS || (overCompleted && inn.overs >= state.matchOvers)) {
            if (isSecondInnings) {
                shouldMatchFinish = true;
            } else {
                shouldInningsEnd = true;
            }
        }

        if (shouldMatchFinish) {
            state.status = "COMPLETED";
            if (isSecondInnings && target !== null) {
                if (state.innings2.runs >= target) {
                    state.winner = state.innings2.teamName;
                    state.result = `${state.innings2.teamName} won by ${MAX_WICKETS - state.innings2.wickets} wickets`;
                } else if (state.innings2.runs === target - 1) {
                    state.winner = "TIE";
                    state.result = "Match Tied";
                } else {
                    state.winner = state.innings1.teamName;
                    state.result = `${state.innings1.teamName} won by ${state.innings1.runs - state.innings2.runs} runs`;
                }
            }
            await pushUpdate(state);
            setScreen("LIVE_SCORING");
            return;
        } else if (shouldInningsEnd) {
            state.status = "INNINGS_BREAK";
            await pushUpdate(state);
            setScreen("LIVE_SCORING");
            return;
        }

        // 7. Push intermediate state (Next batsman selection)
        await pushUpdate(state);
        setWicketStep(2); // Move to next screen in modal
    };

    const submitWicket = () => {
        if (!liveState || !wicketNewBatsman) {
            alert("Please select the new batsman.");
            return;
        }

        const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
        const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;

        // 1. Add new batsman to tracking if not exists
        if (!inn.batsmen[wicketNewBatsman]) {
            inn.batsmen[wicketNewBatsman] = {
                name: wicketNewBatsman, runs: 0, balls: 0, fours: 0, sixes: 0,
                isOut: false
            };
        }

        // 2. Assign to empty slot
        if (inn.strikerRef === undefined) {
            inn.strikerRef = wicketNewBatsman;
        } else {
            inn.nonStrikerRef = wicketNewBatsman;
        }

        // 3. Record Timeline Event (Finalized)
        state.timeline.push({
            id: Date.now().toString(),
            timestamp: Date.now(),
            innings: state.currentInnings,
            over: inn.overs,
            striker: wicketPlayerOut || "Unknown",
            bowler: inn.currentBowlerRef || "Unknown",
            runs: 0,
            extras: 0,
            isWicket: true,
            wicketType: wicketType || "BOWLED",
            playerOut: wicketPlayerOut || "Unknown",
            newBatsman: wicketNewBatsman
        });

        // 4. Return to match
        pushUpdate(state);
        setScreen("LIVE_SCORING");

        // If a new bowler is also needed (end of over), keep it locked
        if (inn.currentBowlerRef) {
            setIsScoringLocked(false);
        } else {
            setOverJustCompleted(true);
            setIsScoringLocked(true);
        }
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
    // RENDER: SCHEDULE MATCH
    // ==========================================
    if (screen === "SCHEDULE_SETUP" && selectedMatch) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                    <span className="text-4xl mb-4 block">⏰</span>
                    <h2 className="text-2xl text-white font-bold mb-2 tracking-widest uppercase">
                        Schedule Match
                    </h2>
                    <p className="text-zinc-500 text-sm mb-8">
                        Set a public start time. Viewers will see this match as &quot;Scheduled&quot; until you start the toss.
                    </p>

                    <div className="space-y-4">
                        <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full bg-zinc-800 text-white text-xl p-4 rounded-xl border border-zinc-700 outline-none text-center"
                        />

                        <button
                            onClick={handleScheduleMatch}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold p-4 rounded-xl tracking-widest mt-4 shadow-lg shadow-blue-500/20 transition-colors"
                        >
                            LOCK IN SCHEDULE
                        </button>

                        <button
                            onClick={() => { setScreen("LIVE_SCORING"); }}
                            className="w-full text-zinc-500 font-bold p-4 tracking-widest text-xs hover:text-white transition-colors mt-2"
                        >
                            SKIP TO TOSS
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: TOSS & SETUP
    // ==========================================
    if (screen === "TOSS_SETUP" && selectedMatch) {
        // Robust team name matching helper because sheets data often has trailing spaces/cases
        const getSquadForTeam = (teamName: string) => {
            const cleanName = teamName.trim().toLowerCase();
            const key = Object.keys(squads).find(k => k.trim().toLowerCase() === cleanName);
            return key ? squads[key] : [];
        };

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
                                    {(getSquadForTeam(tossDecision === "BAT" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1))).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>

                                <select value={openNonStriker} onChange={(e) => setOpenNonStriker(e.target.value)} className="w-full bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 outline-none">
                                    <option value="" disabled>Select Non-Striker...</option>
                                    {(getSquadForTeam(tossDecision === "BAT" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1))).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>

                                <select value={openBowler} onChange={(e) => setOpenBowler(e.target.value)} className="w-full bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 outline-none">
                                    <option value="" disabled>Select Opening Bowler...</option>
                                    {(getSquadForTeam(tossDecision === "BOWL" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1))).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {tossWinner && tossDecision && openStriker && openNonStriker && openBowler && (
                            <button
                                onClick={liveState ? () => setScreen("LIVE_SCORING") : beginLiveScoring}
                                className="w-full mt-8 bg-amber-500 text-black font-bold p-5 rounded-xl tracking-widest text-lg shadow-lg shadow-amber-500/20"
                            >
                                {liveState ? "SAVE & RETURN TO MATCH" : "START LIVE MATCH"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (screen === "LIVE_SCORING" && liveState) {
        const currentInningsData = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;
        const fieldingInningsData = liveState.currentInnings === 1 ? liveState.innings2 : liveState.innings1;
        const battingTeamColor = teams.find(t => t.teamName === currentInningsData.teamName)?.color || "#EAB308";

        // Robust team name matching helper
        const getSquadForTeam = (teamName: string) => {
            const cleanName = teamName.trim().toLowerCase();
            const key = Object.keys(squads).find(k => k.trim().toLowerCase() === cleanName);
            return key ? squads[key] : [];
        };

        // Compute active players
        const activeStriker = currentInningsData.batsmen[currentInningsData.strikerRef || ""] || null;
        const activeNonStriker = currentInningsData.batsmen[currentInningsData.nonStrikerRef || ""] || null;
        const activeBowler = currentInningsData.bowlers[currentInningsData.currentBowlerRef || ""] || null;

        // Recent balls for the timeline (last 12)
        const recentTimeline = [...liveState.timeline].reverse().slice(0, 12);

        // Match Result & Target Logic
        const isSecondInnings = liveState.currentInnings === 2;
        const target = isSecondInnings ? (liveState.innings1.runs + 1) : null;
        const runsToWin = target !== null ? (target - currentInningsData.runs) : null;
        const ballsLeft = target !== null ?
            (liveState.matchOvers * 6 - (Math.floor(currentInningsData.overs) * 6 + Math.round((currentInningsData.overs % 1) * 10))) : null;

        return (
            <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col">
                {/* Top Bar - Scorer Info */}
                <div className="h-16 border-b border-white/10 bg-zinc-950 px-6 flex items-center justify-between sticky top-0 z-50 shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-amber-500 font-bold tracking-widest text-[10px]">MATCH {liveState.matchId}</span>
                            <span className="text-zinc-500 text-[9px] font-mono uppercase">{liveState.status}</span>
                        </div>

                        {isSecondInnings && target !== null && (
                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                                <span className="text-xs font-bold text-zinc-400">TARGET: <span className="text-white">{target}</span></span>
                                <div className="w-px h-3 bg-zinc-800" />
                                <span className="text-xs font-bold text-amber-500 animate-pulse">
                                    NEED {runsToWin} FROM {ballsLeft} BALLS
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFullScoreboard(true)}
                            className="bg-zinc-800 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold tracking-widest border border-zinc-700 hover:bg-zinc-700 transition-colors uppercase"
                        >
                            Scoreboard
                        </button>
                        <button onClick={handleResetMatch} className="text-[10px] font-bold tracking-widest text-red-400 hover:text-red-300 px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20 transition-colors uppercase">
                            Reset
                        </button>
                        <button onClick={() => setScreen("TOSS_SETUP")} className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 transition-colors uppercase">
                            Setup
                        </button>
                        <button onClick={() => setScreen("EDIT_OVERRIDE")} className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 transition-colors uppercase">
                            Fix
                        </button>
                    </div>
                </div>

                {/* Main iPad Grid */}
                <div className="p-4 max-w-7xl mx-auto grid grid-cols-12 gap-4 flex-1 min-h-0">
                    {/* LEFT COL: Live Scoreboard (The "Big Board") */}
                    <div className="col-span-6 flex flex-col gap-4 overflow-hidden">
                        {/* Main Score Card */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center items-center text-center shadow-lg min-h-[180px] shrink-0">
                            <div className="absolute top-0 w-full h-full opacity-[0.15] blur-3xl pointer-events-none" style={{ backgroundColor: battingTeamColor }} />

                            <h2 className="text-xl font-bold text-white mb-1 relative z-10 uppercase tracking-wide">
                                {currentInningsData.teamName}
                            </h2>

                            <div className="flex items-baseline justify-center gap-2 relative z-10">
                                <span className="text-7xl font-bold tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
                                    {currentInningsData.runs}
                                </span>
                                <span className="text-4xl font-bold text-zinc-500" style={{ fontFamily: "var(--font-display)" }}>
                                    -{currentInningsData.wickets}
                                </span>
                            </div>

                            <div className="mt-2 text-xl font-medium text-zinc-400 tabular-nums relative z-10 font-mono">
                                OVERS: {currentInningsData.overs.toFixed(1)} / {liveState.matchOvers}
                            </div>
                        </div>

                        {/* Recent Timeline Scoreboard */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex-1 flex flex-col min-h-0">
                            <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-3 uppercase">Recent Deliveries</h3>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                {recentTimeline.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-zinc-600 text-xs tracking-widest italic">
                                        No deliveries recorded yet
                                    </div>
                                ) : (
                                    recentTimeline.map((ball) => (
                                        <div key={ball.id} className="flex items-center justify-between bg-black/40 border border-zinc-800/50 p-3 rounded-xl text-xs">
                                            <div className="flex items-center gap-3">
                                                <span className="text-zinc-500 font-mono w-8">{(ball.over - 0.1).toFixed(1)}</span>
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold">{ball.striker}</span>
                                                    <span className="text-zinc-500 text-[9px]">{ball.bowler.split(' ')[0]}</span>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg font-bold min-w-[32px] text-center ${ball.isWicket ? 'bg-red-500 text-white' : ball.runs >= 4 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-zinc-800 text-zinc-300'}`}>
                                                {ball.isWicket ? 'W' : ball.extras > 0 ? `${ball.runs || ''}${ball.extraType}` : ball.runs}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: Control Center (The "Buttons") */}
                    <div className="col-span-6 flex flex-col gap-4 overflow-hidden">
                        {/* Player Statistics & Quick Change */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 shrink-0">
                            <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 border-b border-zinc-800 pb-2 uppercase">Active Players</h3>
                            <div className="space-y-2">
                                {/* Striker & Non-Striker & Bowler rows condensed for iPad */}
                                {[
                                    { label: 'Striker', ref: currentInningsData.strikerRef, stats: activeStriker ? `${activeStriker.runs}(${activeStriker.balls})` : '0(0)', color: 'amber', pRef: 'strikerRef' },
                                    { label: 'Non-Striker', ref: currentInningsData.nonStrikerRef, stats: activeNonStriker ? `${activeNonStriker.runs}(${activeNonStriker.balls})` : '0(0)', color: 'zinc', pRef: 'nonStrikerRef' },
                                    { label: 'Bowler', ref: currentInningsData.currentBowlerRef, stats: activeBowler ? `${activeBowler.wickets}-${activeBowler.runs}(${activeBowler.overs.toFixed(1)})` : '0-0(0.0)', color: 'blue', pRef: 'currentBowlerRef', isBowler: true }
                                ].map((p, idx) => (
                                    <div key={idx} className={`flex justify-between items-center bg-black/60 p-2 rounded-lg border text-[11px] ${p.color === 'amber' ? 'border-amber-500/30' : p.color === 'blue' ? 'border-blue-500/30' : 'border-zinc-800'}`}>
                                        <div className="flex items-center gap-2">
                                            {p.color !== 'zinc' && <div className={`w-1.5 h-1.5 rounded-full bg-${p.color}-500 ${p.color === 'amber' && 'animate-pulse'}`} />}
                                            <span className={`font-bold uppercase ${p.color === 'blue' ? 'text-blue-100' : 'text-white'}`}>{p.ref || `Select ${p.label}`}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="tabular-nums font-mono text-zinc-400">{p.stats}</span>
                                            <select
                                                value={p.ref || ""}
                                                onChange={(e) => {
                                                    const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
                                                    const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;
                                                    const name = e.target.value;
                                                    if (p.isBowler) {
                                                        if (!inn.bowlers[name]) inn.bowlers[name] = { name, runs: 0, wickets: 0, overs: 0, maidens: 0 };
                                                        inn.currentBowlerRef = name;
                                                    } else {
                                                        if (!inn.batsmen[name]) inn.batsmen[name] = { name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
                                                        inn[p.pRef as "strikerRef" | "nonStrikerRef"] = name;
                                                    }
                                                    pushUpdate(state);
                                                }}
                                                className={`bg-zinc-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-700 outline-none ${p.color === 'blue' ? 'text-blue-400' : p.color === 'amber' ? 'text-amber-500' : 'text-zinc-500'}`}
                                            >
                                                <option value="">CHANGE</option>
                                                {getSquadForTeam(p.isBowler ? fieldingInningsData.teamName : currentInningsData.teamName).map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Input Controls condensed */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex-1 flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Input</h3>
                                <button
                                    onClick={() => setIsScoringLocked(!isScoringLocked)}
                                    className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all ${isScoringLocked ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-green-500/10 text-green-500 border border-green-500/30'}`}
                                >
                                    {isScoringLocked ? "🔒 LOCKED" : "🔓 UNLOCKED"}
                                </button>
                            </div>

                            <div className="relative flex-1 min-h-0">
                                {isScoringLocked && (
                                    <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-[4px] z-20 flex flex-col items-center justify-center rounded-xl border border-zinc-800/50 p-4 text-center">
                                        {overJustCompleted ? (
                                            <>
                                                <h4 className="text-white font-bold tracking-widest mb-1 text-sm uppercase">OVER COMPLETE</h4>
                                                <select
                                                    onChange={(e) => {
                                                        const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
                                                        const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;
                                                        const bName = e.target.value;
                                                        if (!inn.bowlers[bName]) inn.bowlers[bName] = { name: bName, runs: 0, wickets: 0, overs: 0, maidens: 0 };
                                                        inn.currentBowlerRef = bName;
                                                        setOverJustCompleted(false);
                                                        setIsScoringLocked(false);
                                                        pushUpdate(state);
                                                    }}
                                                    className="w-full bg-zinc-800 text-white p-3 rounded-xl border-2 border-amber-500/50 outline-none text-center font-bold text-xs"
                                                >
                                                    <option value="">NEXT BOWLER</option>
                                                    {getSquadForTeam(fieldingInningsData.teamName).map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            </>
                                        ) : (
                                            <button onClick={() => setIsScoringLocked(false)} className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold tracking-widest border border-zinc-700 text-xs uppercase">
                                                Unlock
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2 h-full">
                                    {[0, 1, 2, 3, 4, 6].map(run => (
                                        <button key={run} onClick={() => handleRun(run)} className={`rounded-xl font-bold transition-all active:scale-95 text-2xl ${run >= 4 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'bg-zinc-800 hover:bg-zinc-700'}`}>{run}</button>
                                    ))}
                                    <button onClick={() => handleExtra("WD")} className="bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold uppercase transition-all">WD</button>
                                    <button onClick={() => handleExtra("NB")} className="bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold uppercase transition-all">NB</button>
                                    <button onClick={handleWicket} className="bg-red-500 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-red-500/20">Wicket</button>

                                    <button onClick={handleSwapStrike} className="col-span-2 bg-zinc-800 text-zinc-300 rounded-xl text-[10px] uppercase font-bold transition-all">Swap</button>
                                    <button onClick={handleUndo} className="bg-zinc-800 text-zinc-500 rounded-xl text-[10px] uppercase font-bold transition-all">Undo</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Full Scoreboard Overlay */}
                <AnimatePresence>
                    {showFullScoreboard && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md p-6 flex items-center justify-center">
                            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                    <h2 className="text-xl font-bold tracking-tight uppercase">Full Scorecard</h2>
                                    <button onClick={() => setShowFullScoreboard(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                    {/* Innings 1 / Innings 2 Tabs or Sections */}
                                    {[liveState.innings1, liveState.innings2].map((inn, innIdx) => (
                                        <div key={innIdx} className="space-y-4">
                                            <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
                                                <h3 className="text-amber-500 font-bold tracking-widest text-xs uppercase">{inn.teamName} Innings</h3>
                                                <span className="text-2xl font-bold">{inn.runs}-{inn.wickets} <span className="text-zinc-500 text-sm font-normal">({inn.overs.toFixed(1)})</span></span>
                                            </div>

                                            {/* Batsmen Table */}
                                            <div className="overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900/20">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-zinc-900 text-zinc-500 font-bold uppercase tracking-widest">
                                                            <th className="px-4 py-2">Batter</th>
                                                            <th className="px-4 py-2 text-right">R</th>
                                                            <th className="px-4 py-2 text-right">B</th>
                                                            <th className="px-4 py-2 text-right">4s</th>
                                                            <th className="px-4 py-2 text-right">6s</th>
                                                            <th className="px-4 py-2 text-right">SR</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-900">
                                                        {Object.values(inn.batsmen).map((b, bIdx) => (
                                                            <tr key={bIdx} className={b.isOut ? 'text-zinc-600 italic' : 'text-zinc-300'}>
                                                                <td className="px-4 py-3 font-medium">{b.name} {b.isOut && '(out)'} {(b.name === inn.strikerRef || b.name === inn.nonStrikerRef) && !b.isOut && '*'}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-white">{b.runs}</td>
                                                                <td className="px-4 py-3 text-right">{b.balls}</td>
                                                                <td className="px-4 py-3 text-right">{b.fours}</td>
                                                                <td className="px-4 py-3 text-right">{b.sixes}</td>
                                                                <td className="px-4 py-3 text-right text-[10px] font-mono">{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Bowlers Table */}
                                            <div className="overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900/20">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-zinc-900 text-zinc-500 font-bold uppercase tracking-widest">
                                                            <th className="px-4 py-2">Bowler</th>
                                                            <th className="px-4 py-2 text-right">O</th>
                                                            <th className="px-4 py-2 text-right">M</th>
                                                            <th className="px-4 py-2 text-right">R</th>
                                                            <th className="px-4 py-2 text-right">W</th>
                                                            <th className="px-4 py-2 text-right">Econ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-900">
                                                        {Object.values(inn.bowlers).map((bw, bwIdx) => (
                                                            <tr key={bwIdx} className="text-zinc-300">
                                                                <td className="px-4 py-3 font-medium">{bw.name}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-white">{bw.overs.toFixed(1)}</td>
                                                                <td className="px-4 py-3 text-right">{bw.maidens}</td>
                                                                <td className="px-4 py-3 text-right">{bw.runs}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-blue-400">{bw.wickets}</td>
                                                                <td className="px-4 py-3 text-right text-[10px] font-mono">{bw.overs > 0 ? (bw.runs / bw.overs).toFixed(2) : '0.00'}</td>
                                                            </tr>
                                                        ))}
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

                {/* Innings Break / Match Finished Overlays */}
                <AnimatePresence>
                    {(liveState.status === "INNINGS_BREAK" || liveState.status === "COMPLETED") && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
                            <div className="max-w-md w-full">
                                {liveState.status === "COMPLETED" ? (
                                    <>
                                        <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(245,158,11,0.4)]">
                                            <CheckCircle className="w-12 h-12 text-black" />
                                        </div>
                                        <h2 className="text-4xl font-bold text-white mb-2 uppercase tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>Match Finished</h2>
                                        <p className="text-amber-500 text-xl font-bold mb-8 uppercase tracking-widest">{liveState.result}</p>
                                        <div className="grid gap-3">
                                            <button onClick={() => setShowFullScoreboard(true)} className="w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl border border-zinc-700 hover:bg-zinc-700 transition-all uppercase tracking-widest text-xs">
                                                View Full Scorecard
                                            </button>
                                            <button onClick={() => setScreen("SELECT_MATCH")} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all uppercase tracking-widest text-xs">
                                                Return to Fixtures
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700">
                                            <LogOut className="w-10 h-10 text-amber-500 rotate-90" />
                                        </div>
                                        <h2 className="text-4xl font-bold text-white mb-2 uppercase tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>Innings Break</h2>
                                        <p className="text-zinc-500 mb-8 uppercase tracking-widest text-sm">
                                            {liveState.innings1.teamName} finished at {liveState.innings1.runs}-{liveState.innings1.wickets}<br />
                                            Target for {liveState.innings2.teamName} is <span className="text-white font-bold">{liveState.innings1.runs + 1}</span>
                                        </p>
                                        <button
                                            onClick={() => {
                                                const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
                                                state.currentInnings = 2;
                                                state.status = "LIVE";
                                                pushUpdate(state);
                                                setScreen("TOSS_SETUP"); // Use toss setup to pick opening players for 2nd innings
                                            }}
                                            className="w-full bg-amber-500 text-black font-bold py-5 rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                                        >
                                            Start 2nd Innings &rarr;
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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

                    <div className="mt-4 bg-red-500/10 text-red-500 px-4 py-1 rounded-full text-[10px] font-bold tracking-widest border border-red-500/20 mb-4">
                        WICKET STEP {wicketStep}/2
                    </div>

                    <h2 className="text-3xl font-bold text-white tracking-widest mb-2" style={{ fontFamily: "var(--font-display)" }}>
                        {wicketStep === 1 ? "DECLARE WICKET" : "NEXT BATSMAN"}
                    </h2>

                    {wicketStep === 1 ? (
                        <div className="w-full space-y-6 mt-6">
                            <div className="text-left">
                                <label className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 block">1. WHO GOT OUT?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[currentStriker, currentNonStriker].filter(Boolean).map(player => (
                                        <button
                                            key={player}
                                            onClick={() => setWicketPlayerOut(player as string)}
                                            className={`p-4 rounded-xl border font-bold text-lg transition-colors ${wicketPlayerOut === player ? 'bg-red-500/20 border-red-500 text-white' : 'bg-black border-zinc-800 text-zinc-400'}`}
                                        >
                                            {player}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="text-left">
                                <label className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 block">2. HOW?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["BOWLED", "CAUGHT", "RUNOUT", "LBW", "STUMPED", "RETIRED_HURT"] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setWicketType(type)}
                                            className={`p-3 rounded-lg border font-bold text-[10px] tracking-widest transition-colors ${wicketType === type ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-black border-zinc-800 text-zinc-500'}`}
                                        >
                                            {type.replace("_", " ")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleDeclareWicket}
                                className={`w-full p-5 rounded-2xl font-bold tracking-[0.2em] transition-all bg-white text-black shadow-xl shadow-white/10`}
                            >
                                DECLARE WICKET &rarr;
                            </button>
                        </div>
                    ) : (
                        <div className="w-full space-y-6 mt-6">
                            <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 text-left">
                                <p className="text-[10px] text-zinc-500 font-bold mb-1 tracking-widest uppercase">DISMISSAL RECORDED</p>
                                <p className="text-white font-bold">{wicketPlayerOut} ({wicketType?.replace("_", " ")})</p>
                            </div>

                            <div className="text-left">
                                <label className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 block">WHO IS THE NEW BATSMAN?</label>
                                <select
                                    value={wicketNewBatsman || ""}
                                    onChange={(e) => setWicketNewBatsman(e.target.value)}
                                    className="w-full bg-black border-2 border-zinc-800 text-white rounded-xl p-5 text-lg font-bold tracking-wide focus:border-amber-500 outline-none transition-all"
                                >
                                    <option value="" disabled>Select Player...</option>
                                    {(squads[inn.teamName] || [])
                                        .filter(p => !inn.batsmen[p] || (!inn.batsmen[p].isOut && p !== inn.strikerRef && p !== inn.nonStrikerRef))
                                        .map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                </select>
                            </div>

                            <button
                                disabled={!wicketNewBatsman}
                                onClick={submitWicket}
                                className={`w-full p-5 rounded-2xl font-bold tracking-[0.2em] transition-all ${wicketNewBatsman ? 'bg-red-500 text-white shadow-xl shadow-red-500/20 animate-pulse' : 'bg-zinc-800 text-zinc-600 opacity-50'}`}
                            >
                                COMPLETE DECLARATION
                            </button>
                        </div>
                    )}

                    <div className="mt-8 flex gap-4 w-full">
                        <button
                            onClick={() => { setIsScoringLocked(true); setScreen("LIVE_SCORING"); }}
                            className="flex-1 border border-zinc-800 py-3 rounded-xl text-zinc-500 font-bold tracking-widest hover:text-white transition-colors text-[10px]"
                        >
                            CANCEL
                        </button>
                    </div>
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
