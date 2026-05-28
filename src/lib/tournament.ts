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
    scheduledTime?: string;
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
    rank: number;       // 1–6 before eliminators, 1–3 after (among survivors)
    team: string;
    group: "A" | "B" | "C";
    nrr: number;
    points: number;
    played: number;
    isEliminated?: boolean;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Normalize a team name for comparison: lowercase, trimmed. */
const n = (s: string) => String(s ?? "").trim().toLowerCase();

/** True if a team-name field is a placeholder (not a real team yet). */
const isPlaceholder = (name: string) => {
    const v = n(name);
    return !v || v === "tbd" || v.startsWith("rank") || v.includes("winner") || v.includes("loser");
};

/** Get the liveState for a fixture, keyed by cleaned matchNo. */
const getLiveState = (f: Fixture, liveStates: Record<string, LiveMatchState>): LiveMatchState | null => {
    const key = String(f.matchNo).trim().replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    return liveStates[key] ?? liveStates[String(f.matchNo).trim()] ?? null;
};

/** True if a fixture is done (has a winner in DB or liveState). */
const isDone = (f: Fixture, liveStates: Record<string, LiveMatchState>) => {
    const ls = getLiveState(f, liveStates);
    return !!(f.winner || ls?.status === "COMPLETED" || ls?.status === "ABANDONED");
};

// ─── Base Seeds ───────────────────────────────────────────────────────────────

/**
 * The 6 teams that qualified from the group stage, ranked 1–6 by Pts → NRR.
 * Reads ONLY group-stage fixtures. Never touches playoff rows.
 */
export function computeBaseSeeds(
    fixtures: Fixture[],
    teams: Team[],
    liveStates: Record<string, LiveMatchState> = {}
): PlayoffRank[] {
    const { groupA, groupB, groupC } = calculateStandings(fixtures, teams, liveStates);

    const pool: Omit<PlayoffRank, "rank">[] = [
        ...groupA.slice(0, 2).map(s => ({ team: s.team, group: "A" as const, nrr: s.nrr, points: s.points, played: s.played })),
        ...groupB.slice(0, 2).map(s => ({ team: s.team, group: "B" as const, nrr: s.nrr, points: s.points, played: s.played })),
        ...groupC.slice(0, 2).map(s => ({ team: s.team, group: "C" as const, nrr: s.nrr, points: s.points, played: s.played })),
    ];

    pool.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
    return pool.map((q, i) => ({ ...q, rank: i + 1 }));
}

// ─── Live Rankings (post-eliminator) ─────────────────────────────────────────

/**
 * After eliminators are played, re-rank the 6 teams.
 *
 * IMPORTANT: this must receive the RESOLVED fixture list where Eliminator
 * team1/team2 are already filled with real team names (not "Rank X" placeholders).
 * That is why resolveS2Playoffs calls computePlayoffRankings AFTER Pass 1.
 *
 * Logic:
 *  - Start from 6 base seeds.
 *  - For each completed Eliminator, winner gets +2 pts, loser is marked eliminated.
 *  - Sort: survivors first (by pts desc → NRR desc), then eliminated teams.
 *  - Re-number ranks 1–6.
 */
/** Derive the actual winner of a completed eliminator, handling stale liveState.winner.
 * When the scorer schedules a playoff match before group stage resolves team names,
 * liveState.innings.teamName = "TBD". Later scoring uses that stale TBD as innings1/2
 * teamName, so liveState.winner = "TBD". We fix this by cross-checking liveState.winner
 * against the RESOLVED fixture team names (elim.team1 / elim.team2 from Pass 1), and
 * if they don't match, we re-derive the winner from innings scores.
 */
function resolveElimWinner(
    elim: Fixture,
    liveStates: Record<string, LiveMatchState>
): string {
    // DB winner is always authoritative when it's a real team name
    if (elim.winner && !isPlaceholder(elim.winner) && elim.winner !== "TIE" && elim.winner !== "ABANDONED") {
        return elim.winner;
    }

    const ls = getLiveState(elim, liveStates);
    if (!ls || ls.status !== "COMPLETED") return "";

    // If liveState.winner is a real name that matches one of the RESOLVED team names, use it.
    const lsWinnerNorm = n(ls.winner ?? "");
    if (lsWinnerNorm && !isPlaceholder(ls.winner ?? "") && ls.winner !== "TIE") {
        if (n(elim.team1) === lsWinnerNorm || n(elim.team2) === lsWinnerNorm) {
            return ls.winner!;
        }
    }

    // liveState.winner is stale/TBD/mismatched: re-derive from run totals.
    // Map innings team names to resolved fixture teams using substring matching.
    const normT1 = n(elim.team1);
    const normT2 = n(elim.team2);
    const inn1Name = n(ls.innings1?.teamName ?? "");

    const overlaps = (a: string, b: string) =>
        a && b && (a === b || a.includes(b) || b.includes(a));

    const inn1isT1 = overlaps(inn1Name, normT1);

    const inn1 = ls.innings1;
    const inn2 = ls.innings2;
    if (!inn1 || !inn2) return "";

    // Determine which innings won based on scores
    const maxWickets = ls.customPlayers ?? 8;
    const target = inn1.runs + 1;
    let winningInnings: 1 | 2 | null = null;
    if (inn2.runs >= target) winningInnings = 2;
    else if (inn2.overs >= ls.matchOvers || inn2.wickets >= maxWickets) winningInnings = 1;

    if (winningInnings === null) return "";

    // Map winning innings back to a resolved team name
    if (winningInnings === 1) {
        return inn1isT1 ? elim.team1 : elim.team2;
    } else {
        return inn1isT1 ? elim.team2 : elim.team1;
    }
}

export function computePlayoffRankings(
    resolvedFixtures: Fixture[],
    teams: Team[],
    liveStates: Record<string, LiveMatchState> = {}
): PlayoffRank[] {
    const baseSeeds = computeBaseSeeds(resolvedFixtures, teams, liveStates);

    // All completed eliminator fixtures with a resolvable winner.
    // IMPORTANT: resolvedFixtures has real team names in team1/team2 (from Pass 1).
    // resolveElimWinner() handles stale liveState.winner (TBD from early scheduling).
    const completedEliminators = resolvedFixtures.filter(f => {
        if (!f.stage.startsWith("Eliminator") || f.isFunMatch) return false;
        if (isPlaceholder(f.team1) || isPlaceholder(f.team2)) return false;
        const winner = resolveElimWinner(f, liveStates);
        return !!winner && winner !== "TIE" && winner !== "ABANDONED";
    });

    if (completedEliminators.length === 0) {
        return baseSeeds;
    }

    const outcomes = new Map<string, { bonusPoints: number; eliminated: boolean }>();
    for (const seed of baseSeeds) {
        outcomes.set(n(seed.team), { bonusPoints: 0, eliminated: false });
    }

    for (const elim of completedEliminators) {
        const winner  = resolveElimWinner(elim, liveStates);
        const winNorm = n(winner);
        const t1Norm  = n(elim.team1);
        const t2Norm  = n(elim.team2);

        if (outcomes.has(winNorm)) {
            outcomes.get(winNorm)!.bonusPoints += 2;
        }

        const loserNorm = winNorm === t1Norm ? t2Norm : t1Norm;
        if (outcomes.has(loserNorm)) {
            outcomes.get(loserNorm)!.eliminated = true;
        }
    }

    const updated: PlayoffRank[] = baseSeeds.map(seed => {
        const outcome = outcomes.get(n(seed.team)) ?? { bonusPoints: 0, eliminated: false };
        return {
            ...seed,
            points: seed.points + outcome.bonusPoints,
            isEliminated: outcome.eliminated,
        };
    });

    updated.sort((a, b) => {
        if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
        return b.points - a.points || b.nrr - a.nrr;
    });

    return updated.map((s, i) => ({ ...s, rank: i + 1 }));
}


// ─── S1 Knockout Resolution (back-compat) ────────────────────────────────────

export function resolveKnockouts(
    fixtures: Fixture[],
    teams: Team[],
    manualOverrides: Partial<Record<"A" | "B", string>> = {}
): Fixture[] {
    const { groupA, groupB } = calculateStandings(fixtures, teams);

    const getQualifiers = (
        standings: Standing[],
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

    const { first: a1, second: a2 } = getQualifiers(groupA, "A");
    const { first: b1, second: b2 } = getQualifiers(groupB, "B");

    return fixtures.map(f => {
        if (f.stage === "Semi-Final 1") return { ...f, team1: a1 ?? f.team1, team2: b2 ?? f.team2 };
        if (f.stage === "Semi-Final 2") return { ...f, team1: b1 ?? f.team1, team2: a2 ?? f.team2 };
        if (f.stage === "Final") {
            const sf1 = fixtures.find(x => x.stage === "Semi-Final 1");
            const sf2 = fixtures.find(x => x.stage === "Semi-Final 2");
            return { ...f, team1: sf1?.winner || f.team1, team2: sf2?.winner || f.team2 };
        }
        return f;
    });
}

// ─── S2 Full Bracket Resolution ───────────────────────────────────────────────

/**
 * Produces the complete resolved fixture list for the S2 playoff bracket.
 *
 * Pass 1 — Eliminators
 *   Always force-seeded from the base seeds (Rank 1v6, 2v5, 3v4).
 *   Ignores whatever team IDs the DB might have stored.
 *
 * Pass 2 — Live rankings
 *   Computed from the Pass-1-resolved eliminator fixtures so that
 *   winner/loser matching works on real team names.
 *
 * Pass 3 — Qualifier 1  :  Survivor Rank 1  vs  Survivor Rank 2
 * Pass 4 — Qualifier 2  :  Q1 Loser          vs  Survivor Rank 3
 * Pass 5 — Final        :  Q1 Winner          vs  Q2 Winner
 *
 * If a stage's prerequisites aren't complete yet, placeholder strings
 * like "Rank 1 (Post-Elim)" or "Q1 Winner" are used so the UI degrades
 * gracefully rather than showing corrupted data.
 */
export function resolveS2Playoffs(
    fixtures: Fixture[],
    teams: Team[],
    liveStates: Record<string, LiveMatchState> = {}
): Fixture[] {
    // ── Guard: group stage must be complete before we can seed eliminators ──
    const groupMatches = fixtures.filter(f => ["A", "B", "C"].includes(f.group) && !f.isFunMatch);
    const groupStageComplete =
        groupMatches.length > 0 &&
        groupMatches.every(f => isDone(f, liveStates));

    const baseSeeds = computeBaseSeeds(fixtures, teams, liveStates);

    const getBase = (rank: number): string =>
        groupStageComplete
            ? (baseSeeds.find(s => s.rank === rank)?.team ?? `Rank ${rank}`)
            : `Rank ${rank}`;

    // ── Pass 1: Eliminators ────────────────────────────────────────────────
    const afterPass1 = fixtures.map(f => {
        if (f.stage === "Eliminator 1") return { ...f, team1: getBase(1), team2: getBase(6) };
        if (f.stage === "Eliminator 2") return { ...f, team1: getBase(2), team2: getBase(5) };
        if (f.stage === "Eliminator 3") return { ...f, team1: getBase(3), team2: getBase(4) };
        return f;
    });

    // ── Pass 2: Live rankings (from resolved eliminators) ──────────────────
    const liveRanks    = computePlayoffRankings(afterPass1, teams, liveStates);
    const survivors    = liveRanks.filter(r => !r.isEliminated);

    // Are all 3 eliminators finished?
    const allEliminatorsComplete = afterPass1
        .filter(f => f.stage.startsWith("Eliminator") && !f.isFunMatch)
        .every(f => isDone(f, liveStates));

    const getSurvivor = (rank: number): string => {
        if (!allEliminatorsComplete) return `Rank ${rank} (Post-Elim)`;
        return survivors.find(s => s.rank === rank)?.team ?? `Rank ${rank} Winner`;
    };

    // ── Pass 3: Qualifier 1 ────────────────────────────────────────────────
    const afterPass3 = afterPass1.map(f => {
        if (f.stage !== "Qualifier 1") return f;
        return { ...f, team1: getSurvivor(1), team2: getSurvivor(2) };
    });

    // ── Pass 4: Qualifier 2 ────────────────────────────────────────────────
    const q1 = afterPass3.find(f => f.stage === "Qualifier 1") ?? null;
    const q1Winner: string = q1 ? resolveElimWinner(q1, liveStates) : "";

    // Derive Q1 Loser (only if Q1 has real team names and a recorded winner)
    const q1Loser: string = (() => {
        if (!q1 || !q1Winner) return "Q1 Loser";
        if (isPlaceholder(q1.team1) || isPlaceholder(q1.team2)) return "Q1 Loser";
        return n(q1Winner) === n(q1.team1) ? q1.team2 : q1.team1;
    })();

    const afterPass4 = afterPass3.map(f => {
        if (f.stage !== "Qualifier 2") return f;
        return { ...f, team1: q1Loser, team2: getSurvivor(3) };
    });

    // ── Pass 5: Final ──────────────────────────────────────────────────────
    const q2 = afterPass4.find(f => f.stage === "Qualifier 2") ?? null;
    const q2Winner: string = q2 ? resolveElimWinner(q2, liveStates) : "";

    const finalT1: string = q1Winner || "Q1 Winner";
    const finalT2: string = q2Winner || "Q2 Winner";

    return afterPass4.map(f => {
        if (f.stage !== "Final") return f;
        return { ...f, team1: finalT1, team2: finalT2 };
    });
}


// Data fetching has been migrated to src/lib/data.ts to prevent Prisma leaking into client bundles.
