"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Minus, UserCircle2, ArrowRightLeft, Undo2, LogOut, CheckCircle, ShieldAlert, X, Trophy, Users, Zap, Check, AlertCircle } from "lucide-react";
import { Fixture, Team, LiveMatchState, MatchStatus, BallEvent, BatsmanStats } from "@/lib/tournament";
import { MatchReport } from "@/components/match-report";

const ADMIN_API_KEY = "vpl_secret_2025";

type ScorerScreen = "AUTH" | "SELECT_MATCH" | "SCHEDULE_SETUP" | "TOSS_SETUP" | "LIVE_SCORING" | "EDIT_OVERRIDE" | "WICKET_MODAL";

export default function ScorerClient({ fixtures, teams, squads }: { fixtures: Fixture[], teams: Team[], squads: Record<string, string[]> }) {
    // ---- SCORER AUTH ----
    const [pin, setPin] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [hasMounted, setHasMounted] = useState(false);

    // ---- MATCH SELECT & SETUP ----
    const [activeScreen, setActiveScreen] = useState<ScorerScreen>("AUTH");
    const [selectedMatch, setSelectedMatch] = useState<Fixture | null>(null);
    const [liveState, setLiveState] = useState<LiveMatchState | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeLiveMatchId, setActiveLiveMatchId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<"SYNCED" | "PENDING" | "ERROR">("SYNCED");

    // Persistence Effect
    useEffect(() => {
        const checkAuth = async () => {
            const savedAuth = localStorage.getItem("isScorerAuthenticated");
            const savedMatchId = localStorage.getItem("selectedMatchId");
            const savedScreen = localStorage.getItem("scorerScreen");

            if (savedAuth === "true") {
                setIsAuthenticated(true);
                if (savedScreen && savedScreen !== "AUTH") {
                    setActiveScreen(savedScreen as ScorerScreen);
                } else {
                    setActiveScreen("SELECT_MATCH");
                }
            }

            if (savedMatchId) {
                const match = fixtures.find(f => f.matchNo === savedMatchId);
                if (match) {
                    setSelectedMatch(match);
                } else {
                    // Safety: mismatch between saved session and current data
                    if (savedAuth === "true") setActiveScreen("SELECT_MATCH");
                }
            } else if (savedAuth === "true" && (savedScreen === "TOSS_SETUP" || savedScreen === "LIVE_SCORING" || savedScreen === "SCHEDULE_SETUP")) {
                // Safety: no match selected but trying to enter a match screen
                setActiveScreen("SELECT_MATCH");
            }

            // Artificial delay to ensure fonts/state are ready and prevent flash
            setTimeout(() => {
                setIsInitializing(false);
                setHasMounted(true);
            }, 500);
        };

        const fetchActiveLiveMatch = async () => {
            try {
                const res = await fetch("/api/active-match");
                if (res.ok) {
                    const data = await res.json();
                    setActiveLiveMatchId(data.activeMatchId);
                }
            } catch (e) {
                console.error("Failed to fetch active live match", e);
            }
        };

        checkAuth();
        fetchActiveLiveMatch();
    }, [fixtures]);

    useEffect(() => {
        if (isAuthenticated) {
            localStorage.setItem("isScorerAuthenticated", "true");
        }
        if (selectedMatch) {
            localStorage.setItem("selectedMatchId", selectedMatch.matchNo);
        }
        if (activeScreen) {
            localStorage.setItem("scorerScreen", activeScreen);
        }
    }, [isAuthenticated, selectedMatch, activeScreen]);

    // Robust team matching helper
    const getSquadForTeam = (teamName: string) => {
        if (!teamName) return [];
        const cleanName = teamName.trim().toLowerCase();
        const key = Object.keys(squads).find(k => k.trim().toLowerCase() === cleanName);
        return key ? squads[key] : [];
    };

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
    const [wicketExtraRuns, setWicketExtraRuns] = useState(0);
    const [wicketStrikeSwapped, setWicketStrikeSwapped] = useState(false);
    const [wicketNewBatsman, setWicketNewBatsman] = useState<string | null>(null);

    // Scheduling States
    const [scheduledTime, setScheduledTime] = useState("");

    // No-Ball Mode
    const [showNBModal, setShowNBModal] = useState(false);

    // Refined workflow states
    const [wicketStep, setWicketStep] = useState<1 | 2>(1);
    const [overJustCompleted, setOverJustCompleted] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [showFullScoreboard, setShowFullScoreboard] = useState(false);
    const [showAuditLogs, setShowAuditLogs] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [editingBall, setEditingBall] = useState<BallEvent | null>(null);

    const decimalOversToBalls = (overs: number) => {
        const fullOvers = Math.floor(overs);
        const balls = Math.round((overs % 1) * 10);
        return fullOvers * 6 + balls;
    };

    const MAX_WICKETS = 8;

    // PURE STATE ENGINE: Applies a single ball event to the state
    const applyBallEvent = (state: LiveMatchState, ball: BallEvent) => {
        const inn = ball.innings === 1 ? state.innings1 : state.innings2;
        const isSecondInnings = ball.innings === 2;
        const target = isSecondInnings ? (state.innings1.runs + 1) : null;

        // 1. Reset specific bowler/batter refs if they changed in this ball
        inn.strikerRef = ball.striker;
        inn.nonStrikerRef = ball.nonStriker;
        inn.currentBowlerRef = ball.bowler;

        if (!inn.batsmen[ball.striker]) {
            inn.batsmen[ball.striker] = { name: ball.striker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
        }
        if (ball.nonStriker && !inn.batsmen[ball.nonStriker]) {
            inn.batsmen[ball.nonStriker] = { name: ball.nonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
        }
        if (!inn.bowlers[ball.bowler]) {
            inn.bowlers[ball.bowler] = { name: ball.bowler, overs: 0, runs: 0, wickets: 0, maidens: 0 };
        }

        let strikerObj = inn.batsmen[ball.striker];
        let bowlerObj = inn.bowlers[ball.bowler];

        // 2. Handle Scoring
        inn.runs += (ball.runs + ball.extras);
        bowlerObj.runs += (ball.runs + ball.extras);

        if (ball.extraType === "SWAP") {
            if (inn.nonStrikerRef) {
                const temp = inn.strikerRef;
                inn.strikerRef = inn.nonStrikerRef;
                inn.nonStrikerRef = temp;
            }
            return;
        }

        if (ball.extraType === "DB") {
            // Dead ball records in timeline but doesn't change runs/balls/overs
            return;
        }

        if (ball.extraType !== "WD" && ball.extraType !== "NB") {
            strikerObj.runs += ball.runs;
            strikerObj.balls += 1;
            if (ball.runs === 4) strikerObj.fours++;
            if (ball.runs === 6) strikerObj.sixes++;

            // Progression
            let totalBalls = Math.round((inn.overs % 1) * 10) + 1;
            let bowlerBalls = Math.round((bowlerObj.overs % 1) * 10) + 1;
            let overCompleted = false;

            if (totalBalls === 6) {
                inn.overs = Math.floor(inn.overs) + 1;
                bowlerObj.overs = Math.floor(bowlerObj.overs) + 1;
                overCompleted = true;
                // Auto strike rotation for over completion is handled later
            } else {
                inn.overs = Math.floor(inn.overs) + (totalBalls / 10);
                bowlerObj.overs = Math.floor(bowlerObj.overs) + (bowlerBalls / 10);
            }

            // Wicket
            if (ball.isWicket && ball.wicketType !== "RETIRED_HURT") {
                inn.wickets += 1;
                if (ball.wicketType !== "RUNOUT") bowlerObj.wickets += 1;

                const outPlayer = ball.playerOut || ball.striker;
                inn.batsmen[outPlayer].isOut = true;
                inn.batsmen[outPlayer].dismissal = ball.wicketType;

                if (inn.strikerRef === outPlayer) inn.strikerRef = ball.newBatsman;
                else inn.nonStrikerRef = ball.newBatsman;

                if (ball.newBatsman && !inn.batsmen[ball.newBatsman]) {
                    inn.batsmen[ball.newBatsman] = { name: ball.newBatsman, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
                }
            } else if (ball.isWicket && ball.wicketType === "RETIRED_HURT") {
                const outPlayer = ball.playerOut || ball.striker;
                inn.batsmen[outPlayer].isOut = true;
                inn.batsmen[outPlayer].dismissal = "RETIRED_HURT";
                if (inn.strikerRef === outPlayer) inn.strikerRef = ball.newBatsman;
                else inn.nonStrikerRef = ball.newBatsman;

                if (ball.newBatsman && !inn.batsmen[ball.newBatsman]) {
                    inn.batsmen[ball.newBatsman] = { name: ball.newBatsman, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
                }
            }

            // Strike Rotation
            let swapStrike = (ball.runs % 2 !== 0) || ball.swapped;
            if (overCompleted) swapStrike = !swapStrike;
            if (swapStrike && inn.nonStrikerRef) {
                const temp = inn.strikerRef;
                inn.strikerRef = inn.nonStrikerRef;
                inn.nonStrikerRef = temp;
            }
            if (overCompleted) inn.currentBowlerRef = undefined;

        } else if (ball.extraType === "WD") {
            // WIDE BALL: 1 extra basic + runs completed.
            // If total extras is 2 (WD+1), it means they ran 1.
            const runsTaken = ball.extras - 1;
            let swapStrike = (runsTaken % 2 !== 0) || ball.swapped;
            if (swapStrike && inn.nonStrikerRef) {
                const temp = inn.strikerRef;
                inn.strikerRef = inn.nonStrikerRef;
                inn.nonStrikerRef = temp;
            }
        } else if (ball.extraType === "NB") {
            // NO BALL: Runs off bat go to striker, extras go to team.
            // NB is NOT a legal delivery.
            strikerObj.runs += ball.runs;
            // Note: strikerObj.balls is NOT incremented
            if (ball.runs === 4) strikerObj.fours++;
            if (ball.runs === 6) strikerObj.sixes++;

            let swapStrike = (ball.runs % 2 !== 0) || ball.swapped;
            if (swapStrike && inn.nonStrikerRef) {
                const temp = inn.strikerRef;
                inn.strikerRef = inn.nonStrikerRef;
                inn.nonStrikerRef = temp;
            }
        }

        // 3. Status Check
        if (isSecondInnings && target !== null) {
            state.status = "LIVE"; // Ensure we are in LIVE mode if processing 2nd innings balls
            if (inn.runs >= target || inn.wickets >= MAX_WICKETS || inn.overs >= state.matchOvers) {
                state.status = "COMPLETED";
                if (inn.runs >= target) {
                    state.winner = inn.teamName;
                    state.result = `${inn.teamName} won by ${MAX_WICKETS - inn.wickets} wickets`;
                } else if (inn.runs === target - 1) {
                    state.winner = "TIE";
                    state.result = "Match Tied";
                } else {
                    state.winner = state.innings1.teamName;
                    state.result = `${state.innings1.teamName} won by ${state.innings1.runs - inn.runs} runs`;
                }
            }
        } else {
            if (inn.wickets >= MAX_WICKETS || inn.overs >= state.matchOvers) {
                state.status = "INNINGS_BREAK";
            } else {
                state.status = "LIVE";
            }
        }

        // Update LRR
        const totalBallsPlayed = decimalOversToBalls(inn.overs);
        inn.lrr = totalBallsPlayed > 0 ? (inn.runs / (totalBallsPlayed / 6)) : 0;
        
        // Ensure state.currentInnings reflects the largest innings found in timeline
        if (ball.innings > state.currentInnings) {
            state.currentInnings = ball.innings as 1 | 2;
        }
    };

    const rebuildState = (match: Fixture, timeline: BallEvent[]): LiveMatchState => {
        // Find the current innings from the timeline or default to the state's currentinnings
        let maxInnings: 1 | 2 = liveState?.currentInnings || 1;
        timeline.forEach(b => {
            if (b.innings > maxInnings) maxInnings = b.innings as 1 | 2;
        });
        
        const batFirst = liveState?.innings1.teamName || match.team1;
        const bowlFirst = liveState?.innings2.teamName || match.team2;

        let state = getInitialState(match, batFirst, bowlFirst, maxInnings);
        state.tossWinner = liveState?.tossWinner || "";
        state.tossDecision = liveState?.tossDecision || "BAT";

        // Re-apply timeline
        timeline.forEach(event => applyBallEvent(state, event));
        state.timeline = timeline;
        
        // Final status adjustment based on timeline and currentInnings
        if (state.currentInnings === 1) {
            const inn = state.innings1;
            if (inn.wickets >= MAX_WICKETS || inn.overs >= state.matchOvers) {
                state.status = "INNINGS_BREAK";
            }
        } else {
            const inn = state.innings2;
            const target = state.innings1.runs + 1;
            if (inn.runs >= target || inn.wickets >= MAX_WICKETS || inn.overs >= state.matchOvers) {
                state.status = "COMPLETED";
            } else {
                state.status = "LIVE";
            }
        }
        
        return state;
    };

    // Initial State Builder (VPL 8-Overs Mode)
    const getInitialState = (match: Fixture, bat1: string, bat2: string, currentInnings: 1 | 2 = 1): LiveMatchState => {
        const s1 = currentInnings === 1 ? openStriker : (liveState?.innings1.strikerRef || "");
        const ns1 = currentInnings === 1 ? openNonStriker : (liveState?.innings1.nonStrikerRef || "");
        const b1 = currentInnings === 1 ? openBowler : (liveState?.innings1.currentBowlerRef || "");
        
        const s2 = currentInnings === 2 ? openStriker : "";
        const ns2 = currentInnings === 2 ? openNonStriker : "";
        const b2 = currentInnings === 2 ? openBowler : "";

        return {
            matchId: match.matchNo,
            status: "LIVE",
            tossWinner,
            tossDecision: tossDecision || "BAT",
            currentInnings,
            matchOvers: 8,
            innings1: {
                teamName: bat1,
                runs: 0, wickets: 0, overs: 0,
                strikerRef: s1,
                nonStrikerRef: ns1,
                currentBowlerRef: b1,
                batsmen: s1 ? {
                    [s1]: { name: s1, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
                    ...(ns1 ? { [ns1]: { name: ns1, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false } } : {})
                } : {},
                bowlers: b1 ? {
                    [b1]: { name: b1, overs: 0, runs: 0, wickets: 0, maidens: 0 }
                } : {}
            },
            innings2: {
                teamName: bat2,
                runs: 0, wickets: 0, overs: 0,
                strikerRef: s2,
                nonStrikerRef: ns2,
                currentBowlerRef: b2,
                batsmen: s2 ? {
                    [s2]: { name: s2, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
                    ...(ns2 ? { [ns2]: { name: ns2, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false } } : {})
                } : {}, 
                bowlers: b2 ? {
                    [b2]: { name: b2, overs: 0, runs: 0, wickets: 0, maidens: 0 }
                } : {}
            },
            timeline: []
        };
    };

    const handleAuth = async () => {
        if (pin === "2025") { // Mock check for instant UI unlock
            setIsAuthenticated(true);
            setActiveScreen("SELECT_MATCH");
            localStorage.setItem("isScorerAuthenticated", "true");
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
                    setActiveScreen("TOSS_SETUP");
                } else {
                    setLiveState(data);
                    setActiveScreen("LIVE_SCORING");
                }
            } else {
                // OFFLINE FALLBACK: Try localStorage
                const localData = localStorage.getItem(`vpl_live_state_${matchId}`);
                if (localData) {
                    const parsed = JSON.parse(localData);
                    setLiveState(parsed);
                    setActiveScreen("LIVE_SCORING");
                    alert("⚠️ Network failed. Resumed from LOCAL CACHE.");
                } else {
                    // Not LIVE yet, go to Scheduling Phase
                    setActiveScreen("SCHEDULE_SETUP");
                }
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
        setActiveScreen("LIVE_SCORING");

        // Save fresh state to KV
        await fetch("/api/live-score", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-vpl-internal-key": ADMIN_API_KEY
            },
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
        setActiveScreen("TOSS_SETUP");

        await fetch("/api/live-score", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-vpl-internal-key": ADMIN_API_KEY
            },
            body: JSON.stringify(newState)
        });
    };

    // ==========================================
    // DATA ENGINE LOGIC
    // ==========================================
    const logAction = async (action: string, details: any) => {
        const matchId = selectedMatch?.matchNo || liveState?.matchId;
        if (!matchId) return;

        const logEntry = {
            id: Date.now().toString(),
            matchId,
            action,
            details,
            timestamp: Date.now(),
            scorerId: "admin_scorer"
        };

        setAuditLogs(prev => [logEntry, ...prev].slice(0, 50)); // Keep last 50 locally

        try {
            await fetch("/api/logs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify(logEntry)
            });
        } catch (e) {
            console.error("Failed to log action:", e);
        }
    };

    const notifyMatch = async (message: string, type: "INFO" | "SUCCESS" = "INFO") => {
        const mId = selectedMatch?.matchNo || liveState?.matchId;
        if (!mId) return;
        try {
            await fetch("/api/notify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify({ matchId: mId, message, type }),
            });
        } catch (e) {
            console.error("Notification failed", e);
        }
    };

    const syncMatchResultToSheet = async (finalState: LiveMatchState) => {
        if (!finalState.winner || !finalState.matchId) return;

        try {
            // 1. Get current fixtures
            const res = await fetch("/api/matches");
            if (!res.ok) return;
            const fixtures: Fixture[] = await res.json();

            // 2. Update the specific fixture
            const updatedFixtures = fixtures.map(f => {
                if (f.matchNo === finalState.matchId) {
                    return { ...f, winner: finalState.winner };
                }
                return f;
            });

            // 3. POST back to sync with Google Sheets
            await fetch("/api/matches", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify(updatedFixtures)
            });
            console.log("Match result synced to Google Sheets");
        } catch (e) {
            console.error("Failed to sync match result to sheet", e);
        }
    };

    const pushUpdate = async (newState: LiveMatchState, actionDesc?: string) => {
        setLiveState(newState); // Optimistic UI
        setSyncStatus("PENDING");

        // PERSISTENCE: Save to localStorage immediately for Auto-Resume/Offline
        const matchId = newState.matchId;
        if (matchId) {
            localStorage.setItem(`vpl_live_state_${matchId}`, JSON.stringify(newState));
        }

        try {
            const res = await fetch("/api/live-score", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify(newState)
            });

            if (!res.ok) throw new Error("Sync failed");

            setSyncStatus("SYNCED");

            // Clear any pending sync for this match
            if (matchId) {
                localStorage.removeItem(`vpl_pending_sync_${matchId}`);
            }

            // Transition Notifications
            if (liveState?.status === "SCHEDULED" && newState.status === "LIVE") {
                notifyMatch(`Match Started: ${newState.innings1.teamName} vs ${newState.innings2.teamName}`, "INFO");
            }
            if (liveState?.status !== "COMPLETED" && newState.status === "COMPLETED") {
                notifyMatch(`Match Finished! ${newState.winner} won by ${newState.result?.split('by ')[1] || 'victory'}`, "SUCCESS");
                syncMatchResultToSheet(newState);
            }

            if (actionDesc) {
                logAction("SCORE_UPDATE", { action: actionDesc, score: `${newState.currentInnings === 1 ? newState.innings1.runs : newState.innings2.runs}-${newState.currentInnings === 1 ? newState.innings1.wickets : newState.innings2.wickets}` });
            }
        } catch (e) {
            console.error("Failed to sync live state", e);
            setSyncStatus("ERROR");
            
            // Background Queue: Save for later sync
            if (matchId) {
                localStorage.setItem(`vpl_pending_sync_${matchId}`, JSON.stringify(newState));
            }
        }
    };

    // Background Sync Effect
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!navigator.onLine) return;

            // Look for pending syncs in localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith("vpl_pending_sync_")) {
                    const matchId = key.replace("vpl_pending_sync_", "");
                    const pendingData = localStorage.getItem(key);
                    if (pendingData) {
                        try {
                            const res = await fetch("/api/live-score", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "x-vpl-internal-key": ADMIN_API_KEY
                                },
                                body: pendingData
                            });
                            if (res.ok) {
                                localStorage.removeItem(key);
                                setSyncStatus("SYNCED");
                                console.log(`Background sync success for ${matchId}`);
                            }
                        } catch (e) {
                            // Retry next time
                        }
                    }
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleResetMatch = async () => {
        if (!selectedMatch) return;
        if (!confirm("⚠️ DANGER: This will permanently clear all scores for this match. Are you sure?")) return;

        setLoading(true);
        try {
            const newState = { ...getInitialState(selectedMatch, selectedMatch.team1, selectedMatch.team2), status: "SCHEDULED" } as LiveMatchState;
            setLiveState(newState);
            setActiveScreen("TOSS_SETUP");

            await fetch("/api/live-score", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify(newState)
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSetActiveMatch = async (matchId: string | null) => {
        try {
            const res = await fetch("/api/active-match", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-vpl-internal-key": ADMIN_API_KEY
                },
                body: JSON.stringify({ activeMatchId: matchId })
            });
            if (res.ok) {
                setActiveLiveMatchId(matchId);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to update active match.");
        }
    };

    const handleDeadBall = async () => {
        if (!liveState || isScoringLocked || !selectedMatch) return;
        const currentInn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;

        const ball: BallEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            innings: liveState.currentInnings,
            over: currentInn.overs,
            striker: currentInn.strikerRef || "Unknown",
            nonStriker: currentInn.nonStrikerRef || "Unknown",
            bowler: currentInn.currentBowlerRef || "Unknown",
            runs: 0,
            extras: 0,
            extraType: "DB" as any,
            isWicket: false
        };

        const newState = rebuildState(selectedMatch, [...liveState.timeline, ball]);
        pushUpdate(newState, "DEAD_BALL");
    };

    const handleExtra = (type: "WD" | "NB", runs: number = 1) => {
        if (!liveState || isScoringLocked || !selectedMatch) return;
        const currentInn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;

        if (!currentInn.strikerRef || !currentInn.currentBowlerRef) {
            alert("Please select Batsman AND Bowler first.");
            return;
        }

        // Simplify Wide: Just 1 run, no hover selection anymore
        if (type === "WD") {
            const ball: BallEvent = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                innings: liveState.currentInnings,
                over: currentInn.overs,
                striker: currentInn.strikerRef,
                nonStriker: currentInn.nonStrikerRef || "Unknown",
                bowler: currentInn.currentBowlerRef,
                runs: 0,
                extras: 1,
                extraType: "WD",
                isWicket: false
            };
            const newState = rebuildState(selectedMatch, [...liveState.timeline, ball]);
            pushUpdate(newState, "EXTRA: WIDE");
            return;
        }

        // No Ball: Show Modal
        if (type === "NB") {
            setShowNBModal(true);
            return;
        }
    };

    // Modified handleRun to handle NB runs
    const handleRun = async (runs: number, fromNB = false) => {
        if (!liveState || (isScoringLocked && !fromNB) || !selectedMatch) return;
        const currentInn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;

        if (!currentInn.strikerRef || !currentInn.currentBowlerRef) {
            alert("Please select Batsman AND Bowler first.");
            return;
        }

        const ball: BallEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            innings: liveState.currentInnings,
            over: currentInn.overs,
            striker: currentInn.strikerRef,
            nonStriker: currentInn.nonStrikerRef || "Unknown",
            bowler: currentInn.currentBowlerRef,
            runs: runs,
            extras: fromNB ? 1 : 0,
            extraType: fromNB ? "NB" : undefined,
            isWicket: false
        };

        const newState = rebuildState(selectedMatch, [...liveState.timeline, ball]);
        const desc = fromNB ? `NB + ${runs} RUNS` : `${runs} RUN(S)`;
        if (fromNB) setShowNBModal(false);
        pushUpdate(newState, desc);
    };
    const handleDeclareWicket = async (extraRuns: number = 0, swapped: boolean = false) => {
        if (!liveState || !wicketPlayerOut || !wicketType || !selectedMatch) {
            alert("Please select who got out and how.");
            return;
        }

        const currentInn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;
        if (!currentInn.strikerRef || !currentInn.currentBowlerRef) return;

        const ball: BallEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            innings: liveState.currentInnings,
            over: currentInn.overs,
            striker: currentInn.strikerRef,
            nonStriker: currentInn.nonStrikerRef || "Unknown",
            bowler: currentInn.currentBowlerRef,
            runs: extraRuns,
            extras: 0,
            isWicket: true,
            wicketType: wicketType,
            playerOut: wicketPlayerOut,
            swapped
        };

        const newState = rebuildState(selectedMatch, [...liveState.timeline, ball]);
        pushUpdate(newState, `WICKET: ${wicketType}`);

        if (newState.status === "LIVE") {
            setWicketStep(2);
        } else {
            setActiveScreen("LIVE_SCORING");
        }
    };

    const submitWicket = () => {
        if (!liveState || !wicketNewBatsman || !selectedMatch) {
            alert("Please select the new batsman.");
            return;
        }

        const newTimeline = [...liveState.timeline];
        const lastBall = newTimeline[newTimeline.length - 1];
        if (lastBall && lastBall.isWicket) {
            lastBall.newBatsman = wicketNewBatsman;
        }

        const newState = rebuildState(selectedMatch, newTimeline);
        pushUpdate(newState, `NEW BATSMAN: ${wicketNewBatsman}`);

        setWicketStep(1);
        setWicketPlayerOut(null);
        setWicketType(null);
        setWicketExtraRuns(0);
        setWicketStrikeSwapped(false);
        setWicketNewBatsman(null);
        setActiveScreen("LIVE_SCORING");
        setIsScoringLocked(false);
    };

    const handleSwapStrike = () => {
        if (!liveState || isScoringLocked || !selectedMatch) return;

        const currentInn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;
        if (!currentInn.strikerRef || !currentInn.currentBowlerRef) return;

        const ball: BallEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            innings: liveState.currentInnings,
            over: currentInn.overs,
            striker: currentInn.strikerRef,
            nonStriker: currentInn.nonStrikerRef || "Unknown",
            bowler: currentInn.currentBowlerRef,
            runs: 0,
            extras: 0,
            extraType: "SWAP",
            isWicket: false
        };

        const newState = rebuildState(selectedMatch, [...liveState.timeline, ball]);
        pushUpdate(newState, "STRIKE_SWAP");
    };

    const handleUndo = () => {
        if (!liveState || isScoringLocked || liveState.timeline.length === 0 || !selectedMatch) return;

        const newTimeline = [...liveState.timeline];
        newTimeline.pop();

        const newState = rebuildState(selectedMatch, newTimeline);
        pushUpdate(newState);
    };

    const handleDeleteBall = (ballId: string) => {
        if (!liveState || !selectedMatch) return;
        if (!confirm("Are you sure you want to delete this delivery? Match state will be recalculated.")) return;

        const newTimeline = liveState.timeline.filter(b => b.id !== ballId);
        const newState = rebuildState(selectedMatch, newTimeline);
        pushUpdate(newState, `DELETED_BALL_${ballId}`);
    };

    const handleSaveEdit = (updatedBall: BallEvent) => {
        if (!liveState || !selectedMatch) return;
        const newTimeline = liveState.timeline.map(b => b.id === updatedBall.id ? updatedBall : b);
        const newState = rebuildState(selectedMatch, newTimeline);
        pushUpdate(newState, `EDITED_BALL_${updatedBall.id}`);
        setEditingBall(null);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setActiveScreen("AUTH");
        localStorage.removeItem("isScorerAuthenticated");
        localStorage.removeItem("selectedMatchId");
        localStorage.removeItem("scorerScreen");
    };

    const handleWicket = () => {
        if (!liveState || isScoringLocked) return;
        setWicketStep(1);
        setWicketPlayerOut(null);
        setWicketType(null);
        setWicketExtraRuns(0);
        setWicketStrikeSwapped(false);
        setWicketNewBatsman(null);
        setActiveScreen("WICKET_MODAL");
    };

    // ==========================================
    // RENDER: LOADING/INITIALIZING
    // ==========================================
    if (!hasMounted || isInitializing) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <div className="ambient-bg" />
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                <p className="text-zinc-600 text-[10px] tracking-[0.4em] font-bold uppercase">INITIALIZING VPL SCORER</p>
            </div>
        );
    }

    // ==========================================
    // RENDER: AUTHENTICATION
    // ==========================================
    if (activeScreen === "AUTH") {
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
    if (activeScreen === "SELECT_MATCH") {
        const unplayed = fixtures.filter(f => !f.winner);
        return (
            <div className="min-h-screen bg-black p-8 pt-24">
                <div className="max-w-2xl mx-auto">
                    {selectedMatch && (activeScreen === "SELECT_MATCH") && (
                        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <button
                                        onClick={() => {
                                            localStorage.removeItem("selectedMatchId");
                                            setSelectedMatch(null);
                                        }}
                                        className="p-1 hover:bg-amber-500/20 rounded transition-colors"
                                    >
                                        <Undo2 className="w-3 h-3 text-amber-500" />
                                    </button>
                                    <span className="text-[10px] font-bold tracking-widest text-amber-500 block uppercase">CURRENTLY ACTIVE</span>
                                </div>
                                <span className="text-white font-bold">{selectedMatch.team1} vs {selectedMatch.team2}</span>
                            </div>
                            <button
                                onClick={() => setActiveScreen("LIVE_SCORING")}
                                className="bg-amber-500 text-black text-xs font-bold px-4 py-2 rounded-lg"
                            >
                                RESUME
                            </button>
                        </div>
                    )}

                    <h2 className="text-zinc-500 tracking-widest text-sm font-bold mb-4">AVAILABLE FIXTURES</h2>
                    <div className="grid gap-3">
                        {fixtures.map(f => (
                            <div
                                key={f.matchNo}
                                className={`flex items-center justify-between p-5 bg-zinc-900 border rounded-xl transition-all ${selectedMatch?.matchNo === f.matchNo ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800'}`}
                            >
                                <button
                                    onClick={() => loadMatchData(f.matchNo)}
                                    className="flex-1 text-left"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">MATCH {f.matchNo}</span>
                                            {f.winner && (
                                                <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">FIN</span>
                                            )}
                                        </div>
                                        <span className="text-xl font-bold text-white tracking-wide block" style={{ fontFamily: "var(--font-heading)" }}>
                                            {f.team1} <span className="text-zinc-600 mx-1">vs</span> {f.team2}
                                        </span>
                                        {f.winner && (
                                            <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mt-1 block">
                                                {f.winner === f.team1 ? f.team1 : f.team2} WON
                                            </span>
                                        )}
                                    </div>
                                </button>

                                <div className="flex flex-col items-end gap-2 ml-4">
                                    <button
                                        onClick={() => handleSetActiveMatch(activeLiveMatchId === f.matchNo ? null : f.matchNo)}
                                        className={`text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-all ${activeLiveMatchId === f.matchNo ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}
                                    >
                                        {activeLiveMatchId === f.matchNo ? 'VISIBLE TO PUBLIC' : 'SET AS LIVE'}
                                    </button>

                                    <button
                                        onClick={() => loadMatchData(f.matchNo)}
                                        className="text-[10px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 font-bold"
                                    >
                                        MANAGE &rarr;
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: SCHEDULE MATCH
    // ==========================================
    if (activeScreen === "SCHEDULE_SETUP" && selectedMatch) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                    <span className="text-4xl mb-4 block">⏰</span>
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={() => setActiveScreen("SELECT_MATCH")} className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors">
                            <Undo2 className="w-5 h-5" />
                        </button>
                        <h2 className="text-2xl text-white font-bold tracking-widest uppercase">
                            Schedule Match
                        </h2>
                        <div className="w-9" /> {/* Spacer */}
                    </div>
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
                            onClick={() => { setActiveScreen("TOSS_SETUP"); }}
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
    if (activeScreen === "TOSS_SETUP" && selectedMatch) {
        return (
            <div className="min-h-screen bg-black p-8 flex flex-col items-center justify-center">
                <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={() => setActiveScreen(liveState ? "LIVE_SCORING" : "SELECT_MATCH")} className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors">
                            <Undo2 className="w-5 h-5" />
                        </button>
                        <h2 className="text-2xl text-white font-bold text-center" style={{ fontFamily: "var(--font-display)" }}>
                            PRE-MATCH SETUP
                        </h2>
                        <div className="w-9" /> {/* Spacer */}
                    </div>

                    <div className="space-y-6">
                        {(!liveState || liveState.currentInnings === 1) ? (
                            <>
                                <div>
                                    <label className="text-xs tracking-widest text-zinc-500 block mb-2 font-bold uppercase">1. WHO WON THE TOSS?</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[selectedMatch.team1, selectedMatch.team2].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setTossWinner(t)}
                                                className={`p-4 rounded-xl border font-bold text-lg tracking-wide transition-colors ${tossWinner === t ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                                            >
                                                {t.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {tossWinner && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="text-xs tracking-widest text-zinc-500 block mb-2 font-bold uppercase">2. DECISION?</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(["BAT", "BOWL"] as const).map(dec => (
                                                <button
                                                    key={dec}
                                                    onClick={() => setTossDecision(dec)}
                                                    className={`p-4 rounded-xl border font-bold text-lg tracking-widest transition-colors ${tossDecision === dec ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                                                >
                                                    {dec} FIRST
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 mb-4">
                                <h3 className="text-amber-500 font-bold tracking-widest text-sm uppercase mb-1">2nd Innings Started</h3>
                                <p className="text-zinc-500 text-[10px] uppercase font-medium">Please select the opening pair & bowler</p>
                            </div>
                        )}

                        {(tossDecision || (liveState && liveState.currentInnings === 2)) && (
                            <div className="space-y-4 border-t border-zinc-800 pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <label className="text-xs tracking-widest text-zinc-500 block font-bold uppercase">INITIAL PLAYERS</label>

                                <div className="grid gap-3">
                                    <select value={openStriker} onChange={(e) => setOpenStriker(e.target.value)} className="w-full bg-zinc-800 text-white p-4 rounded-xl border border-zinc-700 outline-none focus:border-amber-500 transition-colors">
                                        <option value="" disabled>Select Striker...</option>
                                        {(getSquadForTeam(
                                            liveState?.currentInnings === 2 ? liveState.innings2.teamName :
                                            (tossDecision === "BAT" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1))
                                        )).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>

                                    <select value={openNonStriker} onChange={(e) => setOpenNonStriker(e.target.value)} className="w-full bg-zinc-800 text-white p-4 rounded-xl border border-zinc-700 outline-none focus:border-amber-500 transition-colors">
                                        <option value="" disabled>Select Non-Striker...</option>
                                        {(getSquadForTeam(
                                            liveState?.currentInnings === 2 ? liveState.innings2.teamName :
                                            (tossDecision === "BAT" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1))
                                        )).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>

                                    <select value={openBowler} onChange={(e) => setOpenBowler(e.target.value)} className="w-full bg-zinc-800 text-white p-4 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition-colors">
                                        <option value="" disabled>Select Opening Bowler...</option>
                                        {(getSquadForTeam(
                                            liveState?.currentInnings === 2 ? liveState.innings1.teamName :
                                            (tossDecision === "BOWL" ? tossWinner : (tossWinner === selectedMatch.team1 ? selectedMatch.team2 : selectedMatch.team1))
                                        )).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {tossWinner && tossDecision && openStriker && openNonStriker && openBowler && (
                            <button
                                onClick={() => {
                                    if (openStriker === openNonStriker) {
                                        alert("Striker and Non-Striker cannot be the same player.");
                                        return;
                                    }
                                    if (liveState) {
                                        const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
                                        const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;
                                        inn.strikerRef = openStriker;
                                        inn.nonStrikerRef = openNonStriker;
                                        inn.currentBowlerRef = openBowler;
                                        
                                        // Ensure batsmen/bowlers exist in state
                                        if (!inn.batsmen[openStriker]) inn.batsmen[openStriker] = { name: openStriker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
                                        if (!inn.batsmen[openNonStriker]) inn.batsmen[openNonStriker] = { name: openNonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
                                        if (!inn.bowlers[openBowler]) inn.bowlers[openBowler] = { name: openBowler, overs: 0, runs: 0, wickets: 0, maidens: 0 };
                                        
                                        pushUpdate(state);
                                        setActiveScreen("LIVE_SCORING");
                                    } else {
                                        beginLiveScoring();
                                    }
                                }}
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

    if (activeScreen === "LIVE_SCORING" && liveState) {
        const currentInningsData = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;
        const fieldingInningsData = liveState.currentInnings === 1 ? liveState.innings2 : liveState.innings1;
        const battingTeamColor = teams.find(t => t.teamName === currentInningsData.teamName)?.color || "#EAB308";

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
                            <span className="text-amber-500 font-bold tracking-widest text-[10px] flex items-center gap-1.5">
                                MATCH {liveState.matchId}
                                {syncStatus === "SYNCED" ? (
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" title="All changes synced" />
                                ) : syncStatus === "PENDING" ? (
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]" title="Syncing..." />
                                ) : (
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shadow-[0_0_8px_rgba(239,68,68,0.4)]" title="Offline - Saved locally" />
                                )}
                            </span>
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
                            onClick={() => setActiveScreen("SELECT_MATCH")}
                            className="flex items-center gap-2 bg-zinc-900 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest border border-zinc-800 transition-colors uppercase mr-2"
                        >
                            <Undo2 className="w-3 h-3" />
                            Back
                        </button>
                        <button onClick={() => setShowFullScoreboard(true)} className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest border border-amber-500/20 hover:bg-amber-500/20 transition-colors uppercase">
                            <Plus className="w-3 h-3" />
                            Scoreboard
                        </button>
                        <button onClick={() => setActiveScreen("EDIT_OVERRIDE")} className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 transition-colors uppercase">
                            Override
                        </button>
                        <button onClick={handleResetMatch} className="text-[10px] font-bold tracking-widest text-red-400 hover:text-red-300 px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20 transition-colors uppercase">
                            Reset
                        </button>
                        <button onClick={() => setShowHistory(true)} className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 transition-colors uppercase">
                            History
                        </button>
                        <button onClick={() => setActiveScreen("TOSS_SETUP")} className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 transition-colors uppercase">
                            Setup
                        </button>
                        <button onClick={() => setActiveScreen("SELECT_MATCH")} className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 transition-colors uppercase">
                            Matches
                        </button>
                        <button onClick={() => setShowAuditLogs(true)} className="text-[10px] font-bold tracking-widest text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 transition-colors uppercase">
                            Logs
                        </button>
                        <button onClick={handleLogout} className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main iPad Grid - Height Constrained */}
                <div className="p-4 max-w-7xl mx-auto grid grid-cols-12 gap-4 flex-1 min-h-0 w-full overflow-hidden">
                    {/* LEFT COL: Live Scoreboard (The "Big Board") */}
                    <div className="col-span-6 flex flex-col gap-4 overflow-hidden h-full min-h-0">
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

                            <div className="mt-2 flex items-center gap-4 text-zinc-400 relative z-10">
                                <span className="text-xl font-medium tabular-nums font-mono">
                                    OVERS: {currentInningsData.overs.toFixed(1)} / {liveState.matchOvers}
                                </span>
                                <div className="w-px h-3 bg-zinc-800" />
                                <span className="text-sm font-bold tracking-widest text-amber-500/80">
                                    LRR: {currentInningsData.lrr?.toFixed(2) || "0.00"}
                                </span>
                            </div>

                            {isSecondInnings && target !== null && (
                                <div className="mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl relative z-10 flex flex-col items-center">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">TARGET: {target}</span>
                                    <span className="text-lg font-bold text-amber-400 tabular-nums">
                                        NEED {runsToWin} FROM {ballsLeft} BALLS
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-medium">
                                        REQ: {((runsToWin || 0) / ((ballsLeft || 1) / 6)).toFixed(2)} RPO
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Recent Timeline Scoreboard */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                            <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-3 uppercase">Recent Deliveries</h3>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
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
                    <div className="col-span-6 flex flex-col gap-4 overflow-hidden h-full min-h-0">
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
                                                    const name = e.target.value;
                                                    if (!name) return; // Ignore "CHANGE" placeholder

                                                    const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
                                                    const inn = state.currentInnings === 1 ? state.innings1 : state.innings2;

                                                    if (!p.isBowler) {
                                                        const otherSlot = p.pRef === "strikerRef" ? "nonStrikerRef" : "strikerRef";
                                                        if (name === inn[otherSlot]) {
                                                            alert("Player is already at the other end!");
                                                            return;
                                                        }
                                                    }
                                                    
                                                    if (p.isBowler) {
                                                        if (!inn.bowlers[name]) inn.bowlers[name] = { name, runs: 0, wickets: 0, overs: 0, maidens: 0 };
                                                        inn.currentBowlerRef = name;
                                                    } else {
                                                        if (!inn.batsmen[name]) inn.batsmen[name] = { name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
                                                        if (p.pRef === "strikerRef") inn.strikerRef = name;
                                                        else inn.nonStrikerRef = name;
                                                    }
                                                    pushUpdate(state);
                                                }}
                                                className="bg-zinc-800 text-[10px] font-bold text-white border-zinc-700 rounded px-1 py-0.5 outline-none focus:border-amber-500 transition-colors"
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
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="flex justify-between items-center mb-3 shrink-0">
                                <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Input</h3>
                                <button
                                    onClick={() => setIsScoringLocked(!isScoringLocked)}
                                    className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all ${isScoringLocked ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-green-500/10 text-green-500 border border-green-500/30'}`}
                                >
                                    {isScoringLocked ? "🔒 LOCKED" : "🔓 UNLOCKED"}
                                </button>
                            </div>

                            <div className="relative flex-1 min-h-0 overflow-hidden">
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
                                    <div className="col-span-3 grid grid-cols-4 gap-2">
                                        <button 
                                            onClick={() => handleExtra("WD")} 
                                            className="w-full h-full bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-bold uppercase transition-all flex flex-col items-center justify-center py-3"
                                        >
                                            WIDE
                                        </button>
                                        <button 
                                            onClick={() => handleExtra("NB")} 
                                            className="w-full h-full bg-blue-600/20 text-blue-300 border border-blue-500/40 rounded-xl text-[10px] font-bold uppercase transition-all flex flex-col items-center justify-center py-3"
                                        >
                                            NO BALL
                                        </button>
                                        <button onClick={handleDeadBall} className="bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-xl text-xs font-bold uppercase transition-all">DB</button>
                                        <button onClick={handleWicket} className="bg-red-500 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-red-500/20">Out</button>
                                    </div>

                                    <button onClick={handleSwapStrike} className="col-span-2 bg-zinc-800 text-zinc-300 rounded-xl text-[10px] uppercase font-bold transition-all">Swap</button>
                                    <button onClick={handleUndo} className="bg-zinc-800 text-zinc-500 rounded-xl text-[10px] uppercase font-bold transition-all">Undo</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* No Ball Runs Modal */}
                <AnimatePresence>
                    {showNBModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
                            <div className="max-w-md w-full bg-zinc-900 border-2 border-blue-500/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                                <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>No Ball!</h2>
                                <p className="text-zinc-500 mb-8 uppercase tracking-widest text-sm">Select runs scored off the bat</p>
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    {[0, 1, 2, 3, 4, 6].map(run => (
                                        <button 
                                            key={run} 
                                            onClick={() => handleRun(run, true)} 
                                            className="bg-zinc-800 hover:bg-blue-500 hover:text-white transition-all py-6 rounded-2xl text-2xl font-bold border border-zinc-700 active:scale-95"
                                        >
                                            {run}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setShowNBModal(false)}
                                    className="w-full py-4 text-zinc-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Full Scoreboard Overlay */}
                <AnimatePresence>
                    {showFullScoreboard && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md p-6 flex items-center justify-center">
                            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                    <h2 className="text-xl font-bold tracking-tight uppercase">Full Scorecard</h2>
                                    <button onClick={() => setShowFullScoreboard(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                    {/* Innings 1 / Innings 2 Tabs or Sections */}
                                    {liveState && [liveState.innings1, liveState.innings2].map((inn, innIdx) => (
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
                                            <button onClick={() => setShowReport(true)} className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition-all uppercase tracking-widest text-xs">
                                                View Match Report
                                            </button>
                                            <button onClick={() => setShowFullScoreboard(true)} className="w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl border border-zinc-700 hover:bg-zinc-700 transition-all uppercase tracking-widest text-xs">
                                                View Full Scorecard
                                            </button>
                                            <button onClick={() => setActiveScreen("SELECT_MATCH")} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all uppercase tracking-widest text-xs">
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
                                                if (!liveState) return;
                                                const state = JSON.parse(JSON.stringify(liveState)) as LiveMatchState;
                                                
                                                state.currentInnings = 2;
                                                state.status = "LIVE";
                                                
                                                // Reset setup states for 2nd innings
                                                setOpenStriker("");
                                                setOpenNonStriker("");
                                                setOpenBowler("");
                                                
                                                // We don't pushUpdate here yet, we just switch screen to 2nd innings setup
                                                // which will then build the first ball or initial state for 2nd innings
                                                setLiveState(state);
                                                setActiveScreen("TOSS_SETUP"); // Still using setup but we should filter it
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

                {/* FULL BALL-BY-BALL HISTORY MODAL */}
                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex justify-end"
                        >
                            <div className="w-full max-w-md bg-zinc-900 h-full border-l border-zinc-800 flex flex-col">
                                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white tracking-widest uppercase">Match History</h2>
                                    <button onClick={() => setShowHistory(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {liveState.timeline.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                                            <ShieldAlert className="w-12 h-12 opacity-20" />
                                            <p className="text-xs tracking-widest font-bold uppercase">No events recorded yet</p>
                                        </div>
                                    ) : (
                                        [...liveState.timeline].reverse().map((ball, idx) => (
                                            <div key={ball.id} className="bg-black/40 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${ball.isWicket ? 'bg-red-500 text-white' : ball.extraType === 'WD' || ball.extraType === 'NB' ? 'bg-blue-500 text-white' : ball.runs >= 4 ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                                        {ball.isWicket ? 'W' : (ball.runs + ball.extras)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-mono text-zinc-500">OVER {ball.over.toFixed(1)}</span>
                                                            {ball.extraType && <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 rounded font-bold">{ball.extraType}</span>}
                                                        </div>
                                                        <p className="text-xs text-zinc-300 font-bold">
                                                            {ball.striker} <span className="text-zinc-500 font-normal mx-1">vs</span> {ball.bowler}
                                                        </p>
                                                        {ball.isWicket && <p className="text-[9px] text-red-400 font-bold uppercase mt-1">{ball.wicketType}: {ball.playerOut}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => setEditingBall(ball)}
                                                        className="p-2 text-zinc-700 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg"
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBall(ball.id)}
                                                        className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-6 border-t border-zinc-800">
                                    <p className="text-[9px] text-zinc-600 text-center uppercase tracking-widest">Deleting a ball will force a full state recalculation</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Match Report Modal */}
                <AnimatePresence>
                    {showReport && liveState && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowReport(false)} />
                            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                                <MatchReport state={liveState} teams={teams} />
                                <button
                                    onClick={() => setShowReport(false)}
                                    className="absolute top-4 right-4 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all focus:outline-none"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Audit Logs Modal */}
                <AnimatePresence>
                    {showAuditLogs && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[140] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                    <h2 className="text-xl font-bold tracking-tight uppercase">Audit Logs</h2>
                                    <button onClick={() => setShowAuditLogs(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono text-[10px]">
                                    {auditLogs.length === 0 ? (
                                        <div className="text-zinc-600 text-center py-20">No logs for this session</div>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <div key={log.id} className="p-2 border-b border-zinc-900 flex justify-between gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-amber-500 font-bold">{log.action}</span>
                                                    <span className="text-zinc-500">{JSON.stringify(log.details)}</span>
                                                </div>
                                                <span className="text-zinc-700 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Edit Ball Modal */}
                <AnimatePresence>
                    {editingBall && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-3xl overflow-hidden flex flex-col shadow-2xl p-6">
                                <h2 className="text-xl font-bold mb-6 text-center uppercase tracking-widest">Edit Delivery</h2>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    handleSaveEdit({
                                        ...editingBall,
                                        id: editingBall.id,
                                        timestamp: editingBall.timestamp,
                                        innings: editingBall.innings,
                                        over: editingBall.over,
                                        striker: editingBall.striker,
                                        bowler: editingBall.bowler,
                                        runs: parseInt(fd.get("runs") as string, 10),
                                        extras: parseInt(fd.get("extras") as string, 10),
                                        extraType: (fd.get("extraType") || undefined) as any
                                    });
                                }} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Runs off Bat</label>
                                        <input name="runs" type="number" defaultValue={editingBall.runs} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Extras</label>
                                        <input name="extras" type="number" defaultValue={editingBall.extras} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Extra Type</label>
                                        <select name="extraType" defaultValue={editingBall.extraType || ""} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white">
                                            <option value="">None</option>
                                            <option value="WD">Wide</option>
                                            <option value="NB">No Ball</option>
                                            <option value="DB">Dead Ball</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button type="button" onClick={() => setEditingBall(null)} className="flex-1 bg-zinc-900 border border-zinc-800 py-3 rounded-xl font-bold text-xs">CANCEL</button>
                                        <button type="submit" className="flex-1 bg-amber-500 text-black py-3 rounded-xl font-bold text-xs">SAVE CHANGES</button>
                                    </div>
                                </form>
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
    if (activeScreen === "WICKET_MODAL" && liveState) {
        const inn = liveState.currentInnings === 1 ? liveState.innings1 : liveState.innings2;
        const currentStriker = inn.batsmen[inn.strikerRef || ""]?.name;
        const currentNonStriker = inn.batsmen[inn.nonStrikerRef || ""]?.name;

        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
                <div className="bg-zinc-900 border-2 border-red-500/50 rounded-3xl p-8 max-w-xl w-full flex flex-col items-center text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden">
                    <button
                        onClick={() => { setIsScoringLocked(true); setActiveScreen("LIVE_SCORING"); }}
                        className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-30"
                    >
                        <X className="w-6 h-6" />
                    </button>
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
                                    {(["BOWLED", "CAUGHT", "RUNOUT", "LBW", "STUMPED"] as const).map(type => (
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

                            {/* New Options for Runs during Wicket (e.g. Run Out) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-left">
                                    <label className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 block">ANY RUNS?</label>
                                    <div className="flex gap-2">
                                        {[0, 1, 2].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setWicketExtraRuns(r)}
                                                className={`flex-1 p-3 rounded-lg border font-bold transition-colors ${wicketExtraRuns === r ? 'bg-white/10 border-white text-white' : 'bg-black border-zinc-800 text-zinc-500'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-left">
                                    <label className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 block">SWAP STRIKE?</label>
                                    <button
                                        onClick={() => setWicketStrikeSwapped(!wicketStrikeSwapped)}
                                        className={`w-full p-3 rounded-lg border font-bold transition-colors ${wicketStrikeSwapped ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black border-zinc-800 text-zinc-500'}`}
                                    >
                                        {wicketStrikeSwapped ? "CROSSED" : "NO"}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDeclareWicket(wicketExtraRuns, wicketStrikeSwapped)}
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
                                    {getSquadForTeam(inn.teamName)
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
                            onClick={() => { setIsScoringLocked(true); setActiveScreen("LIVE_SCORING"); }}
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
    if (activeScreen === "EDIT_OVERRIDE" && liveState) {
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
            setActiveScreen("LIVE_SCORING");
        };

        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full">
                    <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-amber-500 font-bold tracking-widest bg-amber-500/10 px-3 py-1 rounded text-xs">OVERRIDE</span>
                            <h2 className="text-xl font-bold text-white tracking-widest uppercase">Force Edit State</h2>
                        </div>
                        <button onClick={() => setActiveScreen("LIVE_SCORING")} className="text-zinc-500 hover:text-white transition-colors">
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
                            <button type="button" onClick={() => setActiveScreen("LIVE_SCORING")} className="flex-1 border border-zinc-700 px-4 py-3 rounded-xl text-zinc-400 font-bold tracking-widest hover:text-white transition-colors text-xs">
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

    // ==========================================
    // FALLBACK: STATE RECOVERY
    // ==========================================
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
            <div className="ambient-bg opacity-20" />
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative z-10 shadow-2xl">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-xl text-white font-bold mb-2 uppercase tracking-widest">System Recovery</h2>
                <p className="text-zinc-500 text-sm mb-8">
                    The scorer was in an inconsistent state (Screen: {activeScreen}). 
                    Please return to match selection to continue.
                </p>
                <div className="space-y-3">
                    <button 
                        onClick={() => {
                            setActiveScreen("SELECT_MATCH");
                            localStorage.setItem("scorerScreen", "SELECT_MATCH");
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold p-4 rounded-xl tracking-widest transition-all"
                    >
                        GO TO MATCHES
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold p-4 rounded-xl tracking-widest transition-all text-xs border border-zinc-700"
                    >
                        LOGOUT & CLEAR CACHE
                    </button>
                </div>
            </div>
            <p className="mt-8 text-zinc-800 font-mono text-[8px] uppercase tracking-[0.5em]">VPL SCORING SYSTEM RECOVERY MODULE</p>
        </div>
    );
}
