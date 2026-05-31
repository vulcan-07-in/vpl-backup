import { LiveMatchState, BallEvent } from "./tournament";

export interface PlayerStats {
    name: string;
    team: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    wickets: number;
    runsConceded: number;
    ballsBowled: number;
    dotBalls: number;
    maidens: number;
    catches: number;
    stumpings: number;
    runOuts: number;
    matchesWon: number;
    mvpPoints: number;
}

const ALIASES: Record<string, string> = {
    "Raj Mangire": "Shreeraj Mangire",
    "shreya": "Shreya More",
};

function getPlayerName(name: string): string {
    if (!name) return name;
    const lowerName = name.trim().toLowerCase();
    for (const [alias, realName] of Object.entries(ALIASES)) {
        if (lowerName === alias.toLowerCase()) return realName;
    }
    return name.trim();
}

export function calculateAllPlayerStats(liveStates: Record<string, LiveMatchState>): PlayerStats[] {
    const statsMap: Record<string, PlayerStats> = {};

    Object.values(liveStates).forEach(match => {
        if (match.isFunMatch) return;
        // Track match winner for player bonuses
        const winner = match.winner;

        match.timeline.forEach(ball => {
            const striker = getPlayerName(ball.striker);
            const bowler = getPlayerName(ball.bowler);
            
            // Batsman Stats
            if (!statsMap[striker]) {
                statsMap[striker] = createEmptyStats(striker, ball.innings === 1 ? match.innings1.teamName : match.innings2.teamName);
            }
            const b = statsMap[striker];
            if (ball.extraType !== "WD" && ball.extraType !== "SWAP" && ball.extraType !== "DB") {
                b.runs += (ball.runs || 0);
                b.balls += 1; // ICC: Both legal deliveries AND no-balls count as balls faced
                if (ball.runs === 4) b.fours += 1;
                if (ball.runs === 6) b.sixes += 1;
            }

            // Bowler Stats
            if (!statsMap[bowler]) {
                statsMap[bowler] = createEmptyStats(bowler, ball.innings === 1 ? match.innings2.teamName : match.innings1.teamName);
            }
            const bw = statsMap[bowler];
            if (!ball.extraType || (ball.extraType !== "WD" && ball.extraType !== "NB" && ball.extraType !== "DB" && ball.extraType !== "SWAP")) {
                bw.ballsBowled += 1;
                if (ball.runs === 0 && (!ball.extras || ball.extras === 0)) {
                    bw.dotBalls += 1;
                }
            }
            if (ball.extraType !== "DB" && ball.extraType !== "SWAP") {
                bw.runsConceded += ((ball.runs || 0) + (ball.extras || 0));
            }
            if (ball.isWicket && ball.wicketType !== "RUNOUT" && ball.wicketType !== "RETIRED_HURT") {
                bw.wickets += 1;
            }

            // Fielding Stats
            if (ball.isWicket) {
                if (ball.caughtBy) {
                    const caughtBy = getPlayerName(ball.caughtBy);
                    if (!statsMap[caughtBy]) {
                        statsMap[caughtBy] = createEmptyStats(caughtBy, ball.innings === 1 ? match.innings2.teamName : match.innings1.teamName);
                    }
                    if (ball.wicketType === "STUMPED") {
                        statsMap[caughtBy].stumpings += 1;
                    } else {
                        statsMap[caughtBy].catches += 1;
                    }
                }
                if (ball.runOutBy) {
                    const runOutBy = getPlayerName(ball.runOutBy);
                    if (!statsMap[runOutBy]) {
                        statsMap[runOutBy] = createEmptyStats(runOutBy, ball.innings === 1 ? match.innings2.teamName : match.innings1.teamName);
                    }
                    statsMap[runOutBy].runOuts += 1;
                }
            }
        });

        // Add match win bonus to all players in the winning team
        if (winner && winner !== "TIE" && winner !== "ABANDONED") {
            // We need to know who played in this match. 
            // We can approximate by looking at the timeline or the innings data.
            const winners = new Set<string>();
            const winInnings = match.innings1.teamName === winner ? match.innings1 : match.innings2;
            const loseInnings = match.innings1.teamName === winner ? match.innings2 : match.innings1;
            
            // Winners are batsmen from winning team and bowlers from winning team (who bowled to losing team)
            Object.keys(winInnings.batsmen).forEach(name => winners.add(getPlayerName(name)));
            Object.keys(loseInnings.bowlers).forEach(name => winners.add(getPlayerName(name)));
            
            winners.forEach(name => {
                if (statsMap[name]) statsMap[name].matchesWon += 1;
            });
        }
        
        // Calculate Maidens (Simplified: if a bowler bowled 6 dots in an over in the match)
        // This is a bit complex without better over tracking, but we can do it from timeline.
        const bowlerOvers: Record<string, Record<number, number>> = {}; // bowler -> overIndex -> runs
        match.timeline.forEach(ball => {
            if (ball.extraType === "WD" || ball.extraType === "NB") return;
            const bowler = getPlayerName(ball.bowler);
            const overIdx = Math.floor(ball.over || 0);
            if (!bowlerOvers[bowler]) bowlerOvers[bowler] = {};
            if (bowlerOvers[bowler][overIdx] === undefined) bowlerOvers[bowler][overIdx] = 0;
            bowlerOvers[bowler][overIdx] += ((ball.runs || 0) + (ball.extras || 0));
        });
        
        Object.entries(bowlerOvers).forEach(([bowler, overs]) => {
            Object.values(overs).forEach(runs => {
                if (runs === 0 && statsMap[bowler]) statsMap[bowler].maidens += 1;
            });
        });
    });

    return Object.values(statsMap).map(s => ({
        ...s,
        mvpPoints: calculateMVP(s)
    }));
}

function createEmptyStats(name: string, team: string): PlayerStats {
    return {
        name, team, runs: 0, balls: 0, fours: 0, sixes: 0,
        wickets: 0, runsConceded: 0, ballsBowled: 0, dotBalls: 0,
        maidens: 0, catches: 0, stumpings: 0, runOuts: 0,
        matchesWon: 0, mvpPoints: 0
    };
}

function calculateMVP(s: PlayerStats): number {
    let pts = 0;

    // Standardized T20 Fantasy Points System
    // Batting
    pts += s.runs;
    pts += s.fours * 1;
    pts += s.sixes * 2;
    if (s.runs >= 100) pts += 16;
    else if (s.runs >= 50) pts += 8;
    else if (s.runs >= 30) pts += 4;

    // Bowling
    pts += s.wickets * 25;
    pts += s.maidens * 8;
    if (s.wickets >= 5) pts += 16;
    else if (s.wickets >= 4) pts += 8;
    else if (s.wickets >= 3) pts += 4;

    // Fielding
    pts += s.catches * 8;
    pts += s.stumpings * 12;
    pts += s.runOuts * 12;

    return Math.round(pts * 10) / 10;
}

export function calculateMVPBreakdown(s: PlayerStats) {
    const breakdown = [];

    // Batting
    if (s.runs > 0) breakdown.push({ label: 'Runs', points: s.runs });
    if (s.fours > 0) breakdown.push({ label: 'Fours Bonus', points: s.fours * 1 });
    if (s.sixes > 0) breakdown.push({ label: 'Sixes Bonus', points: s.sixes * 2 });
    if (s.runs >= 100) breakdown.push({ label: 'Century Bonus', points: 16 });
    else if (s.runs >= 50) breakdown.push({ label: 'Half Century Bonus', points: 8 });
    else if (s.runs >= 30) breakdown.push({ label: '30+ Runs Bonus', points: 4 });

    // Bowling
    if (s.wickets > 0) breakdown.push({ label: 'Wickets', points: s.wickets * 25 });
    if (s.maidens > 0) breakdown.push({ label: 'Maidens', points: s.maidens * 8 });
    if (s.wickets >= 5) breakdown.push({ label: '5-Wicket Haul', points: 16 });
    else if (s.wickets >= 4) breakdown.push({ label: '4-Wicket Haul', points: 8 });
    else if (s.wickets >= 3) breakdown.push({ label: '3-Wicket Haul', points: 4 });

    // Fielding
    if (s.catches > 0) breakdown.push({ label: 'Catches', points: s.catches * 8 });
    if (s.stumpings > 0) breakdown.push({ label: 'Stumpings', points: s.stumpings * 12 });
    if (s.runOuts > 0) breakdown.push({ label: 'Run Outs', points: s.runOuts * 12 });

    const total = breakdown.reduce((sum, item) => sum + item.points, 0);

    return { breakdown, total: Math.round(total * 10) / 10 };
}

export function getAchievements(s: PlayerStats): string[] {
    const list: string[] = [];
    if (s.runs >= 50) list.push(`${s.runs} Total Runs`);
    if (s.sixes >= 5) list.push(`${s.sixes} Huge Sixes`);
    if (s.fours >= 10) list.push(`${s.fours} Boundaries`);
    if (s.wickets >= 3) list.push(`${s.wickets} Wickets Taken`);
    if (s.maidens >= 1) list.push(`${s.maidens} Maiden Overs`);
    if (s.dotBalls >= 10) list.push(`${s.dotBalls} Dot Balls`);
    if (s.catches + s.runOuts + s.stumpings >= 3) list.push(`${s.catches + s.runOuts + s.stumpings} Fielding Dismissals`);
    if (s.matchesWon >= 2) list.push(`${s.matchesWon} Match Wins`);
    
    // Efficiency
    if (s.balls >= 10) {
        const sr = (s.runs / s.balls) * 100;
        if (sr > 200) list.push(`Explosive SR of ${sr.toFixed(1)}`);
    }
    if (s.ballsBowled >= 12) {
        const econ = (s.runsConceded / (s.ballsBowled / 6));
        if (econ < 7) list.push(`Clinical Economy of ${econ.toFixed(1)}`);
    }

    return list;
}
