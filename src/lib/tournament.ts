import Papa from "papaparse";

export interface Team {
    teamName: string;
    shortName: string;
    color: string;
}

export type Stage = "Group A" | "Group B" | "Semi-Final 1" | "Semi-Final 2" | "Final";

export interface Fixture {
    matchNo: string;   // e.g. "M1"
    stage: Stage;
    group: "A" | "B" | "-";
    team1: string;
    team2: string;
    winner: string;    // blank if not played yet
    sortOrder: number;
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
    winner?: string;
    result?: string;
    lastSyncedAt?: number; // Epoch timestamp of last client push
    // Rule: Squad is 8 players. 7 wickets = All Out. 
    // BUT Last Man Standing rule applies, so player 8 bats alone until Wicket 8.
}

// Round-robin pairs for a group of 4 teams
function roundRobin(teams: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            pairs.push([teams[i], teams[j]]);
        }
    }
    return pairs;
}

export function generateFixtures(groupA: string[], groupB: string[]): Fixture[] {
    const fixtures: Fixture[] = [];
    let matchNum = 1;

    const addMatch = (stage: Stage, group: "A" | "B" | "-", t1: string, t2: string) => {
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
    addMatch("Semi-Final 1", "-", "1st Group A", "2nd Group B");
    addMatch("Semi-Final 2", "-", "1st Group B", "2nd Group A");
    addMatch("Final", "-", "Winner SF1", "Winner SF2");

    return fixtures;
}

// ── Points table calculation ─────────────────────────────────────────────────

export interface Standing {
    team: string;
    color: string;
    group: "A" | "B";
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
): { groupA: Standing[]; groupB: Standing[] } {
    const colorMap: Record<string, string> = {};
    teams.forEach((t) => { colorMap[t.teamName] = t.color; });

    const map: Record<string, Standing & { runsScored: number, runsAgainst: number, oversFaced: number, oversBowled: number }> = {};

    const ensureTeam = (name: string, group: "A" | "B") => {
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

    // Helper to calculate overs for NRR (converts 2.4 to 2 + 4/6)
    const decimalOversToBalls = (overs: number) => {
        const fullOvers = Math.floor(overs);
        const balls = Math.round((overs % 1) * 10);
        return fullOvers * 6 + balls;
    };

    fixtures.forEach((f) => {
        if (f.group === "-") return; // skip knockouts
        const group = f.group as "A" | "B";
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

                // For NRR, if a team is all out (8 wickets for 8-man VPL with Last Man Standing), they are considered to have faced their full overs quota
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
    };
}

/**
 * Converts decimal overs (e.g. 1.3) to true fractional overs (e.g. 1.5)
 * for correct mathematical operations like Run Rate and Economy.
 */
export function realOvers(v: number): number {
    return Math.floor(v) + (Math.round((v % 1) * 10)) / 6;
}

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
            return {
                ...f,
                team1: a1 ?? f.team1,
                team2: b2 ?? f.team2,
            };
        }
        if (f.stage === "Semi-Final 2") {
            return {
                ...f,
                team1: b1 ?? f.team1,
                team2: a2 ?? f.team2,
            };
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

// ── Sheet URLs ────────────────────────────────────────────────────────────────

export const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID || "12cbvXQkyWZWor1EYPCUljKi6so1-CANOgyQUzwZFgro";
export const SQUADS_GID = process.env.NEXT_PUBLIC_SQUADS_GID || "667574756";

export const SQUADS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SQUADS_GID}`;

export const FIXTURES_GID = process.env.NEXT_PUBLIC_FIXTURES_GID || "1008778926";
export const FIXTURES_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${FIXTURES_GID}`;

// ── Server-Side Fetching (ISR) ───────────────────────────────────────────────

export async function fetchTeams(): Promise<Team[]> {
    try {
        const res = await fetch(`${SQUADS_CSV_URL}&t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch squads");
        const text = await res.text();

        // Log beginning of text to catch if Google Sheets returned HTML error page
        if (text.trim().startsWith('<')) {
            console.error('Google Sheets returned HTML instead of CSV', text.substring(0, 100));
            return [];
        }

        interface TeamData {
            TeamName: string;
            ShortName: string;
            Color: string;
            Players: string;
        }

        return new Promise((resolve) => {
            Papa.parse<TeamData>(text, {
                header: true,
                skipEmptyLines: true,
                complete: ({ data }) => {
                    const teams = data.map((row) => ({
                        teamName: row.TeamName || "Unknown",
                        shortName: row.ShortName || "UNK",
                        color: row.Color || "#EAB308",
                    }));
                    resolve(teams);
                },
                error: (error: Error) => {
                    console.error("PapaParse error in fetchTeams: ", error.message);
                    resolve([]); // Return empty on error
                }
            });
        });
    } catch (error) {
        console.error("fetchTeams error:", error);
        return [];
    }
}

export async function fetchSquads(): Promise<Array<{ teamName: string, shortName: string, color: string, players: { name: string, role: string, price: string }[] }>> {
    try {
        const res = await fetch(SQUADS_CSV_URL, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error("Failed to fetch squads csv");
        const text = await res.text();

        if (text.trim().startsWith('<')) return [];

        interface TeamData {
            TeamName: string;
            ShortName: string;
            Color: string;
            Players: string;
        }

        return new Promise((resolve) => {
            Papa.parse<TeamData>(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const teams = results.data.map((row) => ({
                        teamName: row.TeamName || "Unknown",
                        shortName: row.ShortName || "UNK",
                        color: row.Color || "#EAB308",
                        players: row.Players
                            ? row.Players.split(",").map((p) => {
                                const [name, role, price] = p.trim().split(":");
                                return {
                                    name: name?.trim() ?? "Unknown",
                                    role: role?.trim() ?? "-",
                                    price: price?.trim() ?? "-",
                                };
                            })
                            : [],
                    }));
                    resolve(teams);
                },
                error: (error: Error) => {
                    console.error("PapaParse squad error: ", error.message);
                    resolve([]);
                }
            });
        });
    } catch (error) {
        console.error("Error parsing squads:", error);
        return [];
    }
}

export async function fetchFixtures(): Promise<Fixture[]> {
    try {
        const res = await fetch(`${FIXTURES_CSV_URL}&t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch fixtures");
        const text = await res.text();

        if (text.trim().startsWith('<')) {
            console.error('fetchFixtures returned HTML instead of CSV', text.substring(0, 100));
            return [];
        }

        return new Promise((resolve) => {
            Papa.parse<Record<string, string>>(text, {
                header: true,
                skipEmptyLines: true,
                complete: ({ data }) => {
                    const parsed: Fixture[] = data
                        .filter(r => r.MatchNo)
                        .map(r => ({
                            matchNo: r.MatchNo,
                            stage: r.Stage as Fixture["stage"],
                            group: (r.Pool ?? r.Group ?? "-") as Fixture["group"],
                            team1: r.Team1,
                            team2: r.Team2,
                            winner: r.Winner ?? "",
                            sortOrder: parseInt(r.SortOrder ?? "0", 10),
                        }))
                        .sort((a, b) => a.sortOrder - b.sortOrder);
                    resolve(parsed);
                },
                error: (error: Error) => {
                    console.error("PapaParse error in fetchFixtures:", error.message);
                    resolve([]);
                }
            });
        });
    } catch (error) {
        console.error("fetchFixtures error:", error);
        return [];
    }
}
