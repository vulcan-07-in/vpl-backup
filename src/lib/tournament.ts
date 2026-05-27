export interface Team {
    id?: string;
    teamName: string;
    shortName: string;
    color: string;
    logoUrl?: string;
    paddleNumber?: number;
    purse?: number;
    groupId?: "A" | "B" | "C";
}

// S1 had only Group A / B and two semis.
// S2 adds Group C, three Eliminators, two Qualifiers, and a Final.
export type Stage =
    | "Group A"
    | "Group B"
    | "Group C"
    | "Semi-Final 1"     // kept for S1 back-compat
    | "Semi-Final 2"     // kept for S1 back-compat
    | "Eliminator 1"
    | "Eliminator 2"
    | "Eliminator 3"
    | "Qualifier 1"
    | "Qualifier 2"
    | "Final";

export interface Fixture {
    matchNo: string;   // e.g. "M1"
    stage: Stage;
    group: "A" | "B" | "C" | "-";
    team1: string;
    team2: string;
    winner: string;    // blank if not played yet
    sortOrder: number;
    isFunMatch?: boolean; // Fun matches are excluded from all standings / stats
    tossWinner?: string;
    tossDecision?: string;
}

// ==========================================
// PHASE 2: LIVE SCORING ENGINE TYPES
// ==========================================

export type MatchStatus = "SCHEDULED" | "LIVE" | "INNINGS_BREAK" | "COMPLETED" | "ABANDONED";

export interface BatsmanStats {
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissal?: string;
}

export interface BowlerStats {
    name: string;
    overs: number; // Represents completed overs (e.g., 2.4 overs = 2 overs, 4 balls)
    maidens: number;
    runs: number;
    wickets: number;
}

export interface Innings {
    teamName: string;
    runs: number;
    wickets: number;
    overs: number; // Decimal representation (2.4)
    batsmen: Record<string, BatsmanStats>; // Keyed by player name
    bowlers: Record<string, BowlerStats>;  // Keyed by player name
    strikerRef?: string;
    nonStrikerRef?: string;
    currentBowlerRef?: string;
    lrr?: number; // Live Run Rate
}

export interface BallEvent {
    id: string; // Unique ID for undo targeting
    timestamp: number;
    innings: 1 | 2;
    over: number;      // e.g., 2.4
    striker: string;
    nonStriker: string;
    bowler: string;
    runs: number;      // Runs off the bat
    extras: number;    // Extra runs
    extraType?: "WD" | "NB" | "B" | "LB" | "DB" | "SWAP" | "OVERRIDE";
    isWicket: boolean;
    wicketType?: "BOWLED" | "CAUGHT" | "RUNOUT" | "LBW" | "STUMPED" | "HIT_WICKET" | "RETIRED_HURT";
    playerOut?: string;
    newBatsman?: string;
    caughtBy?: string; // Fielder name for CAUGHT/STUMPED
    runOutBy?: string; // Fielder name for RUNOUT
    swapped?: boolean; // If strike was swapped during this ball (e.g. crossing)
    // For OVERRIDE
    overrideData?: {
        teamRuns?: number;
        teamWickets?: number;
        teamOvers?: number;
        strikerRuns?: number;
        strikerBalls?: number;
        nonStrikerRuns?: number;
        nonStrikerBalls?: number;
        bowlerRuns?: number;
        bowlerWickets?: number;
        bowlerOvers?: number;
    };
}

export interface LiveMatchState {
    matchId: string; // Typically the matchNo (e.g., "M5")
    status: MatchStatus;
    scheduledTime?: string; // Time the match is set to start, for UI tracking
    tossWinner?: string;
    tossDecision?: "BAT" | "BOWL";
    currentInnings: 1 | 2;
    innings1: Innings;
    innings2: Innings;
    timeline: BallEvent[]; // The critical event log for the "Undo" feature
    // Manual Overrides
    targetScore?: number;
    matchOvers: number; // Defaults to 8 for VPL
    customPlayers?: number; // Custom squad size (defaults to 8)
    winner?: string;
    result?: string;
    lastSyncedAt?: number; // Epoch timestamp of last client push
    // Rule: Squad is 8 players. 7 wickets = All Out.
    // BUT Last Man Standing rule applies, so player 8 bats alone until Wicket 8.
    isFunMatch?: boolean; // Fun matches excluded from all standings/stats
}

// Round-robin pairs for a group of teams
function roundRobin(teams: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            pairs.push([teams[i], teams[j]]);
        }
    }
    return pairs;
}

export function generateFixtures(groupA: string[], groupB: string[], groupC?: string[]): Fixture[] {
    const fixtures: Fixture[] = [];
    let matchNum = 1;

    const addMatch = (stage: Stage, group: "A" | "B" | "C" | "-", t1: string, t2: string) => {
        fixtures.push({
            matchNo: `M${matchNum++}`,
            stage,
            group,
            team1: t1,
            team2: t2,
            winner: "",
            sortOrder: matchNum - 1,
        });
    };

    roundRobin(groupA).forEach(([t1, t2]) => addMatch("Group A", "A", t1, t2));
    roundRobin(groupB).forEach(([t1, t2]) => addMatch("Group B", "B", t1, t2));

    if (groupC && groupC.length > 0) {
        // Season 2: 3-group IPL-style playoffs
        roundRobin(groupC).forEach(([t1, t2]) => addMatch("Group C", "C", t1, t2));
        addMatch("Eliminator 1", "-", "Rank ", "Rank ");
        addMatch("Eliminator 2", "-", "Rank ", "Rank ");
        addMatch("Eliminator 3", "-", "Rank ", "Rank ");
        addMatch("Qualifier 1", "-", "E1 Winner", "E2 Winner");
        addMatch("Qualifier 2", "-", "Q1 Loser",  "E3 Winner");
        addMatch("Final", "-", "Q1 Winner", "Q2 Winner");
    } else {
        // Season 1: 2-group semi-final format
        addMatch("Semi-Final 1", "-", "1st Group A", "2nd Group B");
        addMatch("Semi-Final 2", "-", "1st Group B", "2nd Group A");
        addMatch("Final", "-", "Winner SF1", "Winner SF2");
    }

    return fixtures;
}

// ── Points table calculation ─────────────────────────────────────────────────

export interface Standing {
    team: string;
    color: string;
    group: "A" | "B" | "C";
    played: number;
    won: number;
    lost: number;
    points: number;
    nrr: number; // Net Run Rate
}

export function calculateStandings(
    fixtures: Fixture[],
    teams: Team[],
    liveStates: Record<string, LiveMatchState> = {}
): { groupA: Standing[]; groupB: Standing[]; groupC: Standing[] } {
    const colorMap: Record<string, string> = {};
    teams.forEach((t) => { colorMap[t.teamName] = t.color; });

    const map: Record<string, Standing & { runsScored: number, runsAgainst: number, oversFaced: number, oversBowled: number }> = {};

    const ensureTeam = (name: string, group: "A" | "B" | "C") => {
        if (!map[name]) {
            map[name] = {
                team: name,
                color: colorMap[name] ?? "#EAB308",
                group,
                played: 0,
                won: 0,
                lost: 0,
                points: 0,
                nrr: 0,
                runsScored: 0,
                runsAgainst: 0,
                oversFaced: 0,
                oversBowled: 0
            };
        }
    };

    // 1. Pre-populate teams so they appear even if they haven't played any fixtures
    teams.forEach(t => {
        if (t.groupId && ["A", "B", "C"].includes(t.groupId)) {
            ensureTeam(t.teamName, t.groupId);
        }
    });

    // Helper to calculate overs for NRR (converts 2.4 to 2 + 4/6)
    const decimalOversToBalls = (overs: number) => {
        const fullOvers = Math.floor(overs);
        const balls = Math.round((overs % 1) * 10);
        return fullOvers * 6 + balls;
    };

    fixtures.forEach((f) => {
        if (f.group === "-") return; // skip knockouts
        if (f.isFunMatch) return;   // skip fun matches
        const group = f.group as "A" | "B" | "C";
        ensureTeam(f.team1, group);
        ensureTeam(f.team2, group);

        const cleanId = (id: string) => String(id).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        const normalizedMatchNo = cleanId(f.matchNo);
        const liveMatch = liveStates[normalizedMatchNo] || liveStates[String(f.matchNo).trim()] || liveStates[f.matchNo];
        const winner = f.winner || liveMatch?.winner;

        if (!winner && liveMatch?.status !== "COMPLETED") return; // not played yet

        map[f.team1].played++;
        map[f.team2].played++;

        if (winner === f.team1) {
            map[f.team1].won++;
            map[f.team1].points += 2;
            map[f.team2].lost++;
        } else if (winner === f.team2) {
            map[f.team2].won++;
            map[f.team2].points += 2;
            map[f.team1].lost++;
        } else if (winner === "TIE" || winner === "ABANDONED" || liveMatch?.status === "ABANDONED") {
            map[f.team1].points += 1;
            map[f.team2].points += 1;
        }

        // NRR Logic (Using liveState data if available)
        if (liveMatch && liveMatch.status === "COMPLETED") {
            const inn1 = liveMatch.innings1;
            const inn2 = liveMatch.innings2;

            const normalize = (s: string) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const t1Clean = normalize(f.team1);
            const t2Clean = normalize(f.team2);

            // Highly tolerant matching: if inn.teamName contains the fixture team name or vice versa
            const isMatch = (innName: string, fixName: string) => {
                const nInn = normalize(innName);
                if (!nInn || !fixName) return false;
                return nInn.includes(fixName) || fixName.includes(nInn);
            };

            // Determine which innings belongs to f.team1
            const t1Score = isMatch(inn1.teamName, t1Clean) ? inn1 : (isMatch(inn2.teamName, t1Clean) ? inn2 : null);
            const t2Score = isMatch(inn1.teamName, t2Clean) ? inn1 : (isMatch(inn2.teamName, t2Clean) ? inn2 : null);

            const matchOvers = liveMatch.matchOvers || 8;

            // Update Team 1 Stats
            if (map[f.team1] && t1Score && t2Score) {
                map[f.team1].runsScored += t1Score.runs;
                map[f.team1].runsAgainst += t2Score.runs;

                const t1BallsFaced = (t1Score.wickets >= 8) ? (matchOvers * 6) : decimalOversToBalls(t1Score.overs);
                const t1BallsBowled = (t2Score.wickets >= 8) ? (matchOvers * 6) : decimalOversToBalls(t2Score.overs);

                map[f.team1].oversFaced += t1BallsFaced / 6;
                map[f.team1].oversBowled += t1BallsBowled / 6;
            }

            // Update Team 2 Stats
            if (map[f.team2] && t1Score && t2Score) {
                map[f.team2].runsScored += t2Score.runs;
                map[f.team2].runsAgainst += t1Score.runs;

                const t2BallsFaced = (t2Score.wickets >= 8) ? (matchOvers * 6) : decimalOversToBalls(t2Score.overs);
                const t2BallsBowled = (t1Score.wickets >= 8) ? (matchOvers * 6) : decimalOversToBalls(t1Score.overs);

                map[f.team2].oversFaced += t2BallsFaced / 6;
                map[f.team2].oversBowled += t2BallsBowled / 6;
            }
        }
    });

    // Finalize NRR
    Object.values(map).forEach(s => {
        const battingRR = s.oversFaced > 0 ? (s.runsScored / s.oversFaced) : 0;
        const bowlingRR = s.oversBowled > 0 ? (s.runsAgainst / s.oversBowled) : 0;
        s.nrr = battingRR - bowlingRR;
    });

    const sort = (standings: Standing[]) =>
        standings.sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.won - a.won);

    return {
        groupA: sort(Object.values(map).filter((s) => s.group === "A")),
        groupB: sort(Object.values(map).filter((s) => s.group === "B")),
        groupC: sort(Object.values(map).filter((s) => s.group === "C")),
    };
}

/**
 * Converts decimal overs (e.g. 1.3) to true fractional overs (e.g. 1.5)
 * for correct mathematical operations like Run Rate and Economy.
 */
export function realOvers(v: number): number {
    return Math.floor(v) + (Math.round((v % 1) * 10)) / 6;
}

// ── S2 Playoff Seeding & Bracket ─────────────────────────────────────────────

export interface PlayoffRank {
    rank: number;       // 1–6
    team: string;
    group: "A" | "B" | "C";
    nrr: number;
    points: number;
}

/**
 * Computes the 6 playoff seeds for Season 2.
 * Top 2 from each of the 3 groups are collected and ranked by NRR across all groups.
 */
export function computePlayoffRankings(
    fixtures: Fixture[],
    teams: Team[],
    liveStates: Record<string, LiveMatchState> = {}
): PlayoffRank[] {
    const { groupA, groupB, groupC } = calculateStandings(fixtures, teams, liveStates);

    const qualifiers: Omit<PlayoffRank, "rank">[] = [
        ...(groupA.slice(0, 2).map(s => ({ team: s.team, group: "A" as const, nrr: s.nrr, points: s.points }))),
        ...(groupB.slice(0, 2).map(s => ({ team: s.team, group: "B" as const, nrr: s.nrr, points: s.points }))),
        ...(groupC.slice(0, 2).map(s => ({ team: s.team, group: "C" as const, nrr: s.nrr, points: s.points }))),
    ];

    // Rank by points first, then NRR
    qualifiers.sort((a, b) => b.points - a.points || b.nrr - a.nrr);

    return qualifiers.map((q, i) => ({ ...q, rank: i + 1 }));
}

/**
 * S1: resolves 2-group knockout fixture labels.
 * Kept for Season 1 back-compat.
 */
export function resolveKnockouts(
    fixtures: Fixture[],
    teams: Team[],
    manualOverrides: Partial<Record<"A" | "B", string>> = {}
): Fixture[] {
    const { groupA, groupB } = calculateStandings(fixtures, teams);

    const getQualifiers = (
        standings: Standing[],
        groupFixtures: Fixture[],
        group: "A" | "B"
    ): { first: string | null; second: string | null } => {
        if (standings.length < 3) return { first: null, second: null };
        const [p1, p2, p3] = standings;
        const gamesLeft3rd = 3 - p3.played;
        const maxPts3rd = p3.points + gamesLeft3rd * 2;

        const first = p1.points > maxPts3rd ? p1.team : null;
        const tiedFor2nd = p2.points === p3.points && p2.nrr === p3.nrr;
        const second = (!tiedFor2nd && p2.points > maxPts3rd)
            ? p2.team
            : (tiedFor2nd && manualOverrides[group])
                ? manualOverrides[group]!
                : null;
        return { first, second };
    };

    const groupAFix = fixtures.filter(f => f.group === "A");
    const groupBFix = fixtures.filter(f => f.group === "B");
    const { first: a1, second: a2 } = getQualifiers(groupA, groupAFix, "A");
    const { first: b1, second: b2 } = getQualifiers(groupB, groupBFix, "B");

    return fixtures.map(f => {
        if (f.stage === "Semi-Final 1") {
            return { ...f, team1: a1 ?? f.team1, team2: b2 ?? f.team2 };
        }
        if (f.stage === "Semi-Final 2") {
            return { ...f, team1: b1 ?? f.team1, team2: a2 ?? f.team2 };
        }
        if (f.stage === "Final") {
            const sf1 = fixtures.find(x => x.stage === "Semi-Final 1");
            const sf2 = fixtures.find(x => x.stage === "Semi-Final 2");
            return {
                ...f,
                team1: sf1?.winner || f.team1,
                team2: sf2?.winner || f.team2,
            };
        }
        return f;
    });
}

/**
 * S2: resolves playoff bracket fixture labels using 3-group IPL format.
 * Returns the full fixture list with Eliminator/Qualifier/Final labels resolved.
 */
export function resolveS2Playoffs(
    fixtures: Fixture[],
    teams: Team[],
    liveStates: Record<string, LiveMatchState> = {}
): Fixture[] {
    const seeds = computePlayoffRankings(fixtures, teams, liveStates);
    
    const groupMatches = fixtures.filter(f => ["A", "B", "C"].includes(f.group) && !f.isFunMatch);
    const isGroupStageComplete = groupMatches.length > 0 && groupMatches.every(f => {
        const cleanId = String(f.matchNo).trim().replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        const liveMatch = liveStates[cleanId] || liveStates[String(f.matchNo).trim()] || liveStates[f.matchNo];
        const status = liveMatch?.status || (f.winner ? "COMPLETED" : "SCHEDULED");
        return status === "COMPLETED" || status === "ABANDONED" || f.winner;
    });

    const getTeam = (rank: number) => {
        if (!isGroupStageComplete) return `Rank ${rank}`;
        return seeds.find(s => s.rank === rank)?.team ?? `Rank ${rank}`;
    };

    const getWinner = (stage: Stage) =>
        fixtures.find(f => f.stage === stage)?.winner ?? "";

    // Helper to calculate total NRR for a specific team (Group Stage + Eliminators)
    const calculateTotalNRR = (teamName: string): number => {
        let runsScored = 0, runsAgainst = 0;
        let oversFaced = 0, oversBowled = 0;

        const decimalOversToBalls = (overs: number) => Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
        const normalize = (s: string) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        fixtures.forEach(f => {
            if (f.isFunMatch || !f.winner) return;
            if (f.team1 !== teamName && f.team2 !== teamName) return;
            if (f.stage === "Qualifier 1" || f.stage === "Qualifier 2" || f.stage === "Final") return;

            const liveMatch = liveStates[String(f.matchNo).trim().replace(/[^A-Za-z0-9]/g, '').toLowerCase()];
            if (liveMatch && liveMatch.status === "COMPLETED") {
                const inn1 = liveMatch.innings1;
                const inn2 = liveMatch.innings2;
                const isMatch = (innName: string, fixName: string) => normalize(innName).includes(normalize(fixName)) || normalize(fixName).includes(normalize(innName));
                
                const t1Score = isMatch(inn1.teamName, teamName) ? inn1 : (isMatch(inn2.teamName, teamName) ? inn2 : null);
                const t2Score = (t1Score === inn1) ? inn2 : inn1;

                if (t1Score && t2Score) {
                    runsScored += t1Score.runs;
                    runsAgainst += t2Score.runs;
                    const matchOvers = liveMatch.matchOvers || 8;
                    const ballsFaced = (t1Score.wickets >= 8) ? (matchOvers * 6) : decimalOversToBalls(t1Score.overs);
                    const ballsBowled = (t2Score.wickets >= 8) ? (matchOvers * 6) : decimalOversToBalls(t2Score.overs);
                    oversFaced += ballsFaced / 6;
                    oversBowled += ballsBowled / 6;
                }
            }
        });
        
        const battingRR = oversFaced > 0 ? (runsScored / oversFaced) : 0;
        const bowlingRR = oversBowled > 0 ? (runsAgainst / oversBowled) : 0;
        return battingRR - bowlingRR;
    };

    const standings = calculateStandings(fixtures, teams, liveStates);
    const getTeamGroupPoints = (teamName: string) => {
        for (const grp of [standings.groupA, standings.groupB, standings.groupC]) {
            const t = grp.find(x => x.team === teamName);
            if (t) return t.points;
        }
        return 0;
    };

    // Dynamically rank the Eliminator winners based on Points, then total NRR
    const e1w = getWinner("Eliminator 1");
    const e2w = getWinner("Eliminator 2");
    const e3w = getWinner("Eliminator 3");
    
    let rankedWinners: string[] = [];
    if (e1w && e2w && e3w) {
        rankedWinners = [e1w, e2w, e3w].sort((a, b) => {
            const ptsA = getTeamGroupPoints(a);
            const ptsB = getTeamGroupPoints(b);
            if (ptsA !== ptsB) return ptsB - ptsA;
            return calculateTotalNRR(b) - calculateTotalNRR(a);
        });
    }

    const isPlaceholder = (name: string) => {
        if (!name) return true;
        const norm = name.trim().toLowerCase();
        return (
            norm === "tbd" || 
            norm === "" || 
            norm.startsWith("rank") ||
            norm.includes("winner") ||
            norm.includes("loser")
        );
    };

    return fixtures.map(f => {
        const hasManualTeam1 = !isPlaceholder(f.team1);
        const hasManualTeam2 = !isPlaceholder(f.team2);

        switch (f.stage) {
            case "Eliminator 1":
                return { 
                    ...f, 
                    team1: hasManualTeam1 ? f.team1 : getTeam(1), 
                    team2: hasManualTeam2 ? f.team2 : getTeam(6) 
                };
            case "Eliminator 2":
                return { 
                    ...f, 
                    team1: hasManualTeam1 ? f.team1 : getTeam(2), 
                    team2: hasManualTeam2 ? f.team2 : getTeam(5) 
                };
            case "Eliminator 3":
                return { 
                    ...f, 
                    team1: hasManualTeam1 ? f.team1 : getTeam(3), 
                    team2: hasManualTeam2 ? f.team2 : getTeam(4) 
                };
            case "Qualifier 1": {
                return { 
                    ...f, 
                    team1: hasManualTeam1 ? f.team1 : (rankedWinners[0] || e1w || "E1 Winner"), 
                    team2: hasManualTeam2 ? f.team2 : (rankedWinners[1] || e2w || "E2 Winner") 
                };
            }
            case "Qualifier 2": {
                const q1f = fixtures.find(x => x.stage === "Qualifier 1");
                const q1Loser = q1f?.winner
                    ? (q1f.winner === q1f.team1 ? q1f.team2 : q1f.team1)
                    : "Q1 Loser";
                return { 
                    ...f, 
                    team1: hasManualTeam1 ? f.team1 : q1Loser, 
                    team2: hasManualTeam2 ? f.team2 : (rankedWinners[2] || e3w || "E3 Winner") 
                };
            }
            case "Final": {
                const q1w = getWinner("Qualifier 1");
                const q2w = getWinner("Qualifier 2");
                return { 
                    ...f, 
                    team1: hasManualTeam1 ? f.team1 : (q1w || "Q1 Winner"), 
                    team2: hasManualTeam2 ? f.team2 : (q2w || "Q2 Winner") 
                };
            }
            default:
                return f;
        }
    });
}

// Data fetching has been migrated to src/lib/data.ts to prevent Prisma leaking into client bundles.
