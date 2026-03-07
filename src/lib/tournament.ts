import Papa from "papaparse";

export interface Team {
    teamName: string;
    shortName: string;
    color: string;
}

export type Stage = "Pool A" | "Pool B" | "Semi-Final 1" | "Semi-Final 2" | "Final";

export interface Fixture {
    matchNo: string;   // e.g. "M1"
    stage: Stage;
    pool: "A" | "B" | "-";
    team1: string;
    team2: string;
    winner: string;    // blank if not played yet
    sortOrder: number;
}

// Round-robin pairs for a pool of 4 teams
function roundRobin(teams: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            pairs.push([teams[i], teams[j]]);
        }
    }
    return pairs;
}

export function generateFixtures(poolA: string[], poolB: string[]): Fixture[] {
    const fixtures: Fixture[] = [];
    let matchNum = 1;

    const addMatch = (stage: Stage, pool: "A" | "B" | "-", t1: string, t2: string) => {
        fixtures.push({
            matchNo: `M${matchNum++}`,
            stage,
            pool,
            team1: t1,
            team2: t2,
            winner: "",
            sortOrder: matchNum - 1,
        });
    };

    roundRobin(poolA).forEach(([t1, t2]) => addMatch("Pool A", "A", t1, t2));
    roundRobin(poolB).forEach(([t1, t2]) => addMatch("Pool B", "B", t1, t2));
    addMatch("Semi-Final 1", "-", "1st Pool A", "2nd Pool B");
    addMatch("Semi-Final 2", "-", "1st Pool B", "2nd Pool A");
    addMatch("Final", "-", "Winner SF1", "Winner SF2");

    return fixtures;
}

// ── Points table calculation ─────────────────────────────────────────────────

export interface Standing {
    team: string;
    color: string;
    pool: "A" | "B";
    played: number;
    won: number;
    lost: number;
    points: number;
}

export function calculateStandings(
    fixtures: Fixture[],
    teams: Team[]
): { poolA: Standing[]; poolB: Standing[] } {
    const colorMap: Record<string, string> = {};
    teams.forEach((t) => { colorMap[t.teamName] = t.color; });

    const map: Record<string, Standing> = {};

    const ensureTeam = (name: string, pool: "A" | "B") => {
        if (!map[name]) {
            map[name] = {
                team: name,
                color: colorMap[name] ?? "#EAB308",
                pool,
                played: 0,
                won: 0,
                lost: 0,
                points: 0,
            };
        }
    };

    fixtures.forEach((f) => {
        if (f.pool === "-") return; // skip knockouts
        const pool = f.pool as "A" | "B";
        ensureTeam(f.team1, pool);
        ensureTeam(f.team2, pool);
        if (!f.winner) return; // not played yet
        map[f.team1].played++;
        map[f.team2].played++;
        if (f.winner === f.team1) {
            map[f.team1].won++;
            map[f.team1].points += 2;
            map[f.team2].lost++;
        } else {
            map[f.team2].won++;
            map[f.team2].points += 2;
            map[f.team1].lost++;
        }
    });

    const sort = (standings: Standing[]) =>
        standings.sort((a, b) => b.points - a.points || b.won - a.won);

    return {
        poolA: sort(Object.values(map).filter((s) => s.pool === "A")),
        poolB: sort(Object.values(map).filter((s) => s.pool === "B")),
    };
}

export function resolveKnockouts(
    fixtures: Fixture[],
    teams: Team[],
    manualOverrides: Partial<Record<"A" | "B", string>> = {}
): Fixture[] {
    const { poolA, poolB } = calculateStandings(fixtures, teams);

    const getQualifiers = (
        standings: Standing[],
        poolFixtures: Fixture[],
        pool: "A" | "B"
    ): { first: string | null; second: string | null } => {
        if (standings.length < 3) return { first: null, second: null };
        const [p1, p2, p3] = standings;
        const gamesLeft3rd = 3 - p3.played;
        const maxPts3rd = p3.points + gamesLeft3rd * 2;

        const first = p1.points > maxPts3rd ? p1.team : null;
        const tiedFor2nd = p2.points === p3.points;
        const second = (!tiedFor2nd && p2.points > maxPts3rd)
            ? p2.team
            : (tiedFor2nd && manualOverrides[pool])
                ? manualOverrides[pool]!
                : null;
        return { first, second };
    };

    const poolAFix = fixtures.filter(f => f.pool === "A");
    const poolBFix = fixtures.filter(f => f.pool === "B");
    const { first: a1, second: a2 } = getQualifiers(poolA, poolAFix, "A");
    const { first: b1, second: b2 } = getQualifiers(poolB, poolBFix, "B");

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
        const res = await fetch(SQUADS_CSV_URL, { next: { revalidate: 60 } });
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

export async function fetchSquadsData() {
    try {
        const res = await fetch(SQUADS_CSV_URL, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error("Failed to fetch squads");
        const text = await res.text();

        // Catch HTML errors before parsing
        if (text.trim().startsWith('<')) {
            console.error('fetchSquadsData returned HTML instead of CSV', text.substring(0, 100));
            return [];
        }

        interface TeamData {
            TeamName: string;
            ShortName: string;
            Color: string;
            Players: string;
        }

        return new Promise<{ teamName: string; shortName: string; color: string; players: { name: string; role: string; price: string; }[] }[]>((resolve) => {
            Papa.parse<TeamData>(text, {
                header: true,
                skipEmptyLines: true,
                complete: ({ data }) => {
                    const teams = data.map((row) => ({
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
                    console.error("PapaParse error in fetchSquadsData:", error.message);
                    resolve([]);
                }
            });
        });
    } catch (error) {
        console.error("fetchSquadsData error:", error);
        return [];
    }
}

export async function fetchFixtures(): Promise<Fixture[]> {
    try {
        const res = await fetch(FIXTURES_CSV_URL, { next: { revalidate: 60 } });
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
                            pool: (r.Pool ?? "-") as Fixture["pool"],
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
